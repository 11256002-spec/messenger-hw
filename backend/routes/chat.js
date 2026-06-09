const express = require('express');
const router = express.Router();
const auth = require('../services/authService');
const chat = require('../services/chatService');

router.get('/health', (req, res) => res.json({ ok: true }));

router.get('/me', auth.authMiddleware, (req, res) => {
  const user = auth.getUserSafeById(req.userId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json(user);
});

router.post('/me/avatar', auth.authMiddleware, (req, res) => {
  const { avatarUri } = req.body || {};
  if (!avatarUri) return res.status(400).json({ error: 'avatarUri required' });
  const db = require('../services/db').readDB();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  user.avatarUri = avatarUri;
  require('../services/db').writeDB(db);
  res.json({ ok: true, avatarUri });
});

router.get('/users', auth.authMiddleware, (req, res) => {
  try {
    res.json(chat.listUsers());
  } catch (err) {
    res.status(500).json({ error: 'failed to list users' });
  }
});

router.post('/friends/request', auth.authMiddleware, (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    const result = chat.sendFriendRequest(req.userId, username);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/friends/accept', auth.authMiddleware, (req, res) => {
  const { fromUserId } = req.body || {};
  if (!fromUserId) return res.status(400).json({ error: 'fromUserId required' });
  try {
    const result = chat.acceptFriendRequest(req.userId, fromUserId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/friends/reject', auth.authMiddleware, (req, res) => {
  const { fromUserId } = req.body || {};
  if (!fromUserId) return res.status(400).json({ error: 'fromUserId required' });
  try {
    const result = chat.rejectFriendRequest(req.userId, fromUserId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/conversations', auth.authMiddleware, (req, res) => {
  try {
    const convs = chat.getConversationsForUser(req.userId);
    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: 'failed to list conversations' });
  }
});

router.post('/messages', auth.authMiddleware, (req, res) => {
  const { conversationId, text } = req.body || {};
  if (!conversationId || !text) return res.status(400).json({ error: 'conversationId and text required' });
  try {
    const message = chat.sendMessage(req.userId, conversationId, text);
    res.json(message);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
