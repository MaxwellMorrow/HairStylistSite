const express = require('express');
const router = express.Router();

// Placeholder: Block day
router.post('/block-day', (req, res) => {
  res.json({ message: 'Block day endpoint' });
});

// Placeholder: Create slot
router.post('/create-slot', (req, res) => {
  res.json({ message: 'Create slot endpoint' });
});

module.exports = router; 