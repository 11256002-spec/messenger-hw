const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function readDB() {
	try {
		const raw = fs.readFileSync(DATA_FILE, 'utf8');
		return JSON.parse(raw);
	} catch (e) {
		return { users: [], conversations: [] };
	}
}

function writeDB(data) {
	fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function base64url(input) {
	return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signJwt(payload) {
	const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const body = base64url(JSON.stringify(payload));
	const sig = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
	return `${header}.${body}.${sig}`;
}

function verifyJwt(token) {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const [header, body, sig] = parts;
	const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
	if (expected !== sig) return null;
	try {
		return JSON.parse(Buffer.from(body, 'base64').toString('utf8'));
	} catch (e) {
		return null;
	}
}

function hashPassword(password, salt = null) {
	salt = salt || crypto.randomBytes(16).toString('hex');
	const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
	return `${salt}$${hash}`;
}

function verifyPassword(stored, password) {
	if (!stored) return false;
	const [salt, hash] = stored.split('$');
	const candidate = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
	return candidate === hash;
}

function uuidv4() {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16));
}

function sendJSON(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(payload);
}

function parseBody(req) {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('data', chunk => { data += chunk; });
		req.on('end', () => {
			if (!data) return resolve(null);
			try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
		});
		req.on('error', reject);
	});
}

function getAuthUser(req) {
	const auth = (req.headers.authorization || '');
	const m = auth.match(/^Bearer (.+)$/);
	if (!m) return null;
	const payload = verifyJwt(m[1]);
	if (!payload || !payload.userId) return null;
	const db = readDB();
	return db.users.find(u => u.id === payload.userId) || null;
}

const server = http.createServer(async (req, res) => {
	// Basic CORS support for web frontend
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

	// Quick respond to preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		return res.end();
	}

	const url = new URL(req.url, `http://localhost:${PORT}`);
	const db = readDB();

	// Health
	if (req.method === 'GET' && url.pathname === '/') {
		return sendJSON(res, 200, { ok: true });
	}

	// Dev token
	if (req.method === 'GET' && url.pathname === '/api/dev/get-token') {
		const first = db.users[0];
		if (!first) return sendJSON(res, 400, { error: 'no users' });
		const token = signJwt({ userId: first.id });
		return sendJSON(res, 200, { token });
	}

	// Register
	if (req.method === 'POST' && url.pathname === '/api/register') {
		try {
			const body = await parseBody(req);
			const username = (body.username || body.email || '').trim().toLowerCase();
			const password = (body.password || '').trim();
			if (!username || !password) return sendJSON(res, 400, { error: 'invalid input' });
			if (db.users.find(u => u.username === username)) return sendJSON(res, 400, { error: 'user exists' });
			const id = uuidv4();
			const user = {
				id,
				username,
				password: hashPassword(password),
				avatarUri: `https://i.pravatar.cc/150?u=${encodeURIComponent(username)}`,
				friendIds: [],
				incomingFriendRequestIds: [],
				outgoingFriendRequestIds: [],
				createdAt: new Date().toISOString(),
			};
			db.users.push(user);
			writeDB(db);
			const token = signJwt({ userId: id });
			return sendJSON(res, 200, { token, user: { ...user, password: undefined } });
		} catch (e) {
			return sendJSON(res, 500, { error: e.message });
		}
	}

	// Login
	if (req.method === 'POST' && url.pathname === '/api/login') {
		try {
			const body = await parseBody(req);
			const username = (body.username || body.email || '').trim().toLowerCase();
			const password = (body.password || '').trim();
			const user = db.users.find(u => u.username === username);
			if (!user || !verifyPassword(user.password, password)) return sendJSON(res, 401, { error: 'invalid credentials' });
			const token = signJwt({ userId: user.id });
			return sendJSON(res, 200, { token });
		} catch (e) {
			return sendJSON(res, 500, { error: e.message });
		}
	}

	// Authenticated routes
	const me = getAuthUser(req);
	if (!me && url.pathname.startsWith('/api/')) {
		// allow /api/users as public read
		if (!(req.method === 'GET' && url.pathname === '/api/users')) {
			return sendJSON(res, 401, { error: 'unauthorized' });
		}
	}

	// Get current user
	if (req.method === 'GET' && url.pathname === '/api/me') {
		return sendJSON(res, 200, { id: me.id, username: me.username, avatarUri: me.avatarUri, friendIds: me.friendIds, incomingFriendRequestIds: me.incomingFriendRequestIds, outgoingFriendRequestIds: me.outgoingFriendRequestIds, createdAt: me.createdAt });
	}

	// Update avatar
	if (req.method === 'POST' && url.pathname === '/api/me/avatar') {
		try {
			const body = await parseBody(req);
			me.avatarUri = body.avatarUri || me.avatarUri;
			writeDB(db);
			return sendJSON(res, 200, { ok: true });
		} catch (e) {
			return sendJSON(res, 500, { error: e.message });
		}
	}

	// List users (include friend/request arrays but never expose password)
	if (req.method === 'GET' && url.pathname === '/api/users') {
		const users = db.users.map(u => ({
			id: u.id,
			username: u.username,
			avatarUri: u.avatarUri,
			friendIds: u.friendIds || [],
			incomingFriendRequestIds: u.incomingFriendRequestIds || [],
			outgoingFriendRequestIds: u.outgoingFriendRequestIds || [],
			createdAt: u.createdAt,
		}));
		return sendJSON(res, 200, users);
	}

	// Friend request
	if (req.method === 'POST' && url.pathname === '/api/friends/request') {
		try {
			const body = await parseBody(req);
			const target = db.users.find(u => u.username === (body.username || '').trim().toLowerCase());
			if (!target) return sendJSON(res, 400, { error: 'user not found' });
			if (target.id === me.id) return sendJSON(res, 400, { error: 'cannot add self' });
			if (me.friendIds.includes(target.id)) return sendJSON(res, 400, { error: 'already friends' });
			if (!target.incomingFriendRequestIds.includes(me.id)) target.incomingFriendRequestIds.push(me.id);
			if (!me.outgoingFriendRequestIds.includes(target.id)) me.outgoingFriendRequestIds.push(target.id);
			writeDB(db);
			return sendJSON(res, 200, { ok: true });
		} catch (e) {
			return sendJSON(res, 500, { error: e.message });
		}
	}

	// Accept friend
	if (req.method === 'POST' && url.pathname === '/api/friends/accept') {
		try {
			const body = await parseBody(req);
			const fromId = body.fromUserId;
			const fromUser = db.users.find(u => u.id === fromId);
			if (!fromUser) return sendJSON(res, 400, { error: 'user not found' });
			// remove requests
			me.incomingFriendRequestIds = me.incomingFriendRequestIds.filter(id => id !== fromId);
			fromUser.outgoingFriendRequestIds = fromUser.outgoingFriendRequestIds.filter(id => id !== me.id);
			// add friends
			if (!me.friendIds.includes(fromId)) me.friendIds.push(fromId);
			if (!fromUser.friendIds.includes(me.id)) fromUser.friendIds.push(me.id);
			// ensure conversation exists
			let conv = db.conversations.find(c => c.participantIds.includes(me.id) && c.participantIds.includes(fromId));
			if (!conv) {
				conv = { id: uuidv4(), participantIds: [me.id, fromId], messages: [] };
				db.conversations.push(conv);
			}
			writeDB(db);
			return sendJSON(res, 200, { ok: true });
		} catch (e) {
			return sendJSON(res, 500, { error: e.message });
		}
	}

	// Reject friend
	if (req.method === 'POST' && url.pathname === '/api/friends/reject') {
		try {
			const body = await parseBody(req);
			const fromId = body.fromUserId;
			const fromUser = db.users.find(u => u.id === fromId);
			if (!fromUser) return sendJSON(res, 400, { error: 'user not found' });
			me.incomingFriendRequestIds = me.incomingFriendRequestIds.filter(id => id !== fromId);
			fromUser.outgoingFriendRequestIds = fromUser.outgoingFriendRequestIds.filter(id => id !== me.id);
			writeDB(db);
			return sendJSON(res, 200, { ok: true });
		} catch (e) {
			return sendJSON(res, 500, { error: e.message });
		}
	}

	// Conversations
	if (req.method === 'GET' && url.pathname === '/api/conversations') {
		return sendJSON(res, 200, db.conversations);
	}

	// Post message
	if (req.method === 'POST' && url.pathname === '/api/messages') {
		try {
			const body = await parseBody(req);
			const conv = db.conversations.find(c => c.id === body.conversationId);
			if (!conv) return sendJSON(res, 400, { error: 'conversation not found' });
			const msg = { id: uuidv4(), senderId: me.id, text: (body.text || '').toString(), createdAt: new Date().toISOString() };
			conv.messages.push(msg);
			writeDB(db);
			return sendJSON(res, 200, { ok: true, message: msg });
		} catch (e) {
			return sendJSON(res, 500, { error: e.message });
		}
	}

	// fallback
	sendJSON(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

module.exports = server;
