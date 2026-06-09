const express = require('express');
const router = express.Router();
const auth = require('../services/authService');

router.get('/health', (req, res) => res.json({ ok: true }));

router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const body = await auth.registerUser(username, password);
    res.json(body);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const body = await auth.loginUser(username, password);
    res.json(body);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  router.get('/dev/get-token', (req, res) => {
    try {
      const token = auth.createDevToken();
      res.json(token);
    } catch (err) {
      res.status(500).json({ error: 'dev token error' });
    }
  });
}

module.exports = router;
