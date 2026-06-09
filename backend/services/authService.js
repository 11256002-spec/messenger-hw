const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET);
}

async function registerUser(username, password) {
  const db = readDB();
  const exists = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    const err = new Error('username taken');
    err.status = 409;
    throw err;
  }

  const hashed = bcrypt.hashSync(password, 8);
  const user = {
    id: uuidv4(),
    username: username.trim(),
    password: hashed,
    avatarUri: `https://i.pravatar.cc/150?u=${encodeURIComponent(username.trim().toLowerCase())}`,
    friendIds: [],
    incomingFriendRequestIds: [],
    outgoingFriendRequestIds: [],
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  writeDB(db);

  return { token: generateToken(user.id), user: { ...user, password: undefined } };
}

async function loginUser(username, password) {
  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    const err = new Error('invalid credentials');
    err.status = 401;
    throw err;
  }

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) {
    const err = new Error('invalid credentials');
    err.status = 401;
    throw err;
  }

  return { token: generateToken(user.id), user: { ...user, password: undefined } };
}

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

function getUserSafeById(userId) {
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return null;
  return { ...user, password: undefined };
}

function createDevToken() {
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
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    writeDB(db);
  }

  return { token: generateToken(user.id) };
}

module.exports = {
  registerUser,
  loginUser,
  authMiddleware,
  getUserSafeById,
  createDevToken,
};
