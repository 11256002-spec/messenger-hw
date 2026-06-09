const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], conversations: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const db = readDB();
  const exists = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) return res.status(409).json({ error: 'username taken' });

  const hashed = bcrypt.hashSync(password, 8);
  const user = {
    id: uuidv4(),
    username: username.trim(),
    password: hashed,
    avatarUri: `https://i.pravatar.cc/150?u=${encodeURIComponent(username.trim().toLowerCase())}`,
    friendIds: [],
    incomingFriendRequestIds: [],
    outgoingFriendRequestIds: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeDB(db);

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token, user: { ...user, password: undefined } });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token, user: { ...user, password: undefined } });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid token' });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Get current user
app.get('/api/me', authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const safe = { ...user, password: undefined };
  res.json(safe);
});

// Update avatar
app.post('/api/me/avatar', authMiddleware, (req, res) => {
  const { avatarUri } = req.body || {};
  if (!avatarUri) return res.status(400).json({ error: 'avatarUri required' });
  const db = readDB();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  user.avatarUri = avatarUri;
  writeDB(db);
  res.json({ ok: true, avatarUri });
});

// Development helper: create/find dev user and return token
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/dev/get-token', (req, res) => {
    const db = readDB();
    const devName = 'devtest';
    let user = db.users.find(u => u.username === devName);
    if (!user) {
      const hashed = bcrypt.hashSync('password', 8);
      user = {
        id: uuidv4(),
        username: devName,
        password: hashed,
        avatarUri: `https://i.pravatar.cc/150?u=${encodeURIComponent(devName)}`,
        friendIds: [],
        incomingFriendRequestIds: [],
        outgoingFriendRequestIds: [],
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      writeDB(db);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token });
  });
}

// List users
app.get('/api/users', authMiddleware, (req, res) => {
  const db = readDB();
  const safeUsers = db.users.map(u => ({ ...u, password: undefined }));
  res.json(safeUsers);
});

// Send friend request by username
app.post('/api/friends/request', authMiddleware, (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });

  const db = readDB();
  const fromUser = db.users.find(u => u.id === req.userId);
  const target = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'target not found' });
  if (target.id === fromUser.id) return res.status(400).json({ error: 'cannot friend yourself' });
  if (fromUser.friendIds.includes(target.id)) return res.status(400).json({ error: 'already friends' });

  if (!fromUser.outgoingFriendRequestIds.includes(target.id)) fromUser.outgoingFriendRequestIds.push(target.id);
  if (!target.incomingFriendRequestIds.includes(fromUser.id)) target.incomingFriendRequestIds.push(fromUser.id);

  writeDB(db);
  res.json({ ok: true });
});

// Accept friend request
app.post('/api/friends/accept', authMiddleware, (req, res) => {
  const { fromUserId } = req.body || {};
  if (!fromUserId) return res.status(400).json({ error: 'fromUserId required' });
  const db = readDB();
  const me = db.users.find(u => u.id === req.userId);
  const other = db.users.find(u => u.id === fromUserId);
  if (!other) return res.status(404).json({ error: 'user not found' });
  if (!me.incomingFriendRequestIds.includes(other.id)) return res.status(400).json({ error: 'no incoming request' });

  me.incomingFriendRequestIds = me.incomingFriendRequestIds.filter(id => id !== other.id);
  other.outgoingFriendRequestIds = other.outgoingFriendRequestIds.filter(id => id !== me.id);

  if (!me.friendIds.includes(other.id)) me.friendIds.push(other.id);
  if (!other.friendIds.includes(me.id)) other.friendIds.push(me.id);

  // create conversation
  const exists = db.conversations.find(c => c.participantIds.includes(me.id) && c.participantIds.includes(other.id));
  if (!exists) {
    db.conversations.push({ id: uuidv4(), participantIds: [me.id, other.id], messages: [] });
  }

  writeDB(db);
  res.json({ ok: true });
});

// Reject friend request
app.post('/api/friends/reject', authMiddleware, (req, res) => {
  const { fromUserId } = req.body || {};
  if (!fromUserId) return res.status(400).json({ error: 'fromUserId required' });
  const db = readDB();
  const me = db.users.find(u => u.id === req.userId);
  const other = db.users.find(u => u.id === fromUserId);
  if (!other) return res.status(404).json({ error: 'user not found' });
  if (!me.incomingFriendRequestIds.includes(other.id)) return res.status(400).json({ error: 'no incoming request' });

  me.incomingFriendRequestIds = me.incomingFriendRequestIds.filter(id => id !== other.id);
  other.outgoingFriendRequestIds = other.outgoingFriendRequestIds.filter(id => id !== me.id);

  writeDB(db);
  res.json({ ok: true });
});

// List conversations for current user
app.get('/api/conversations', authMiddleware, (req, res) => {
  const db = readDB();
  const convs = db.conversations.filter(c => c.participantIds.includes(req.userId));
  res.json(convs);
});

// Send message
app.post('/api/messages', authMiddleware, (req, res) => {
  const { conversationId, text } = req.body || {};
  if (!conversationId || !text) return res.status(400).json({ error: 'conversationId and text required' });
  const db = readDB();
  const conv = db.conversations.find(c => c.id === conversationId);
  if (!conv) return res.status(404).json({ error: 'conversation not found' });
  if (!conv.participantIds.includes(req.userId)) return res.status(403).json({ error: 'not a participant' });

  const message = { id: uuidv4(), senderId: req.userId, text: text.trim(), createdAt: new Date().toISOString() };
  conv.messages.push(message);
  writeDB(db);
  res.json(message);
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
