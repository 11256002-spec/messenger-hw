const { readDB, writeDB } = require('./db');
const { v4: uuidv4 } = require('uuid');

function listUsers() {
  const db = readDB();
  return db.users.map(u => ({ ...u, password: undefined }));
}

function getConversationsForUser(userId) {
  const db = readDB();
  return db.conversations.filter(c => c.participantIds.includes(userId));
}

function sendFriendRequest(fromUserId, username) {
  const db = readDB();
  const fromUser = db.users.find(u => u.id === fromUserId);
  const target = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!target) {
    const err = new Error('target not found');
    err.status = 404;
    throw err;
  }
  if (target.id === fromUser.id) {
    const err = new Error('cannot friend yourself');
    err.status = 400;
    throw err;
  }
  if (fromUser.friendIds.includes(target.id)) {
    const err = new Error('already friends');
    err.status = 400;
    throw err;
  }

  if (!fromUser.outgoingFriendRequestIds.includes(target.id)) fromUser.outgoingFriendRequestIds.push(target.id);
  if (!target.incomingFriendRequestIds.includes(fromUser.id)) target.incomingFriendRequestIds.push(fromUser.id);

  writeDB(db);
  return { ok: true };
}

function acceptFriendRequest(meId, fromUserId) {
  const db = readDB();
  const me = db.users.find(u => u.id === meId);
  const other = db.users.find(u => u.id === fromUserId);
  if (!other) {
    const err = new Error('user not found');
    err.status = 404;
    throw err;
  }
  if (!me.incomingFriendRequestIds.includes(other.id)) {
    const err = new Error('no incoming request');
    err.status = 400;
    throw err;
  }

  me.incomingFriendRequestIds = me.incomingFriendRequestIds.filter(id => id !== other.id);
  other.outgoingFriendRequestIds = other.outgoingFriendRequestIds.filter(id => id !== me.id);

  if (!me.friendIds.includes(other.id)) me.friendIds.push(other.id);
  if (!other.friendIds.includes(me.id)) other.friendIds.push(me.id);

  const exists = db.conversations.find(c => c.participantIds.includes(me.id) && c.participantIds.includes(other.id));
  if (!exists) {
    db.conversations.push({ id: uuidv4(), participantIds: [me.id, other.id], messages: [] });
  }

  writeDB(db);
  return { ok: true };
}

function rejectFriendRequest(meId, fromUserId) {
  const db = readDB();
  const me = db.users.find(u => u.id === meId);
  const other = db.users.find(u => u.id === fromUserId);
  if (!other) {
    const err = new Error('user not found');
    err.status = 404;
    throw err;
  }
  if (!me.incomingFriendRequestIds.includes(other.id)) {
    const err = new Error('no incoming request');
    err.status = 400;
    throw err;
  }

  me.incomingFriendRequestIds = me.incomingFriendRequestIds.filter(id => id !== other.id);
  other.outgoingFriendRequestIds = other.outgoingFriendRequestIds.filter(id => id !== me.id);

  writeDB(db);
  return { ok: true };
}

function sendMessage(senderId, conversationId, text) {
  const db = readDB();
  const conv = db.conversations.find(c => c.id === conversationId);
  if (!conv) {
    const err = new Error('conversation not found');
    err.status = 404;
    throw err;
  }
  if (!conv.participantIds.includes(senderId)) {
    const err = new Error('not a participant');
    err.status = 403;
    throw err;
  }

  const message = { id: uuidv4(), senderId, text: text.trim(), createdAt: new Date().toISOString() };
  conv.messages.push(message);
  writeDB(db);
  return message;
}

module.exports = {
  listUsers,
  getConversationsForUser,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  sendMessage,
};
