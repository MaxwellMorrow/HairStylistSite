const express = require('express');
const router = express.Router();

// Placeholder: Upload image
router.post('/upload', (req, res) => {
  res.json({ message: 'Upload image endpoint' });
});

// Placeholder: Get gallery images
router.get('/', (req, res) => {
  res.json({ message: 'Get gallery images endpoint' });
});

module.exports = router; 