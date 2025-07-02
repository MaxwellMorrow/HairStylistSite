const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// POST /api/chat - Admin only (temporarily disabled)
router.post('/', auth, (req, res) => {
  res.json({ reply: "Chat functionality is temporarily disabled while we fix the timezone issue." });
});

module.exports = router; 