const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

// Get current user (requires authentication)
router.get('/me', authenticateToken, authController.getCurrentUser);

// Placeholder: Google OAuth
router.get('/google', (req, res) => {
  res.json({ message: 'Google OAuth endpoint' });
});

// Placeholder: Facebook OAuth
router.get('/facebook', (req, res) => {
  res.json({ message: 'Facebook OAuth endpoint' });
});

// Placeholder: Admin login
router.post('/admin', (req, res) => {
  res.json({ message: 'Admin login endpoint' });
});

module.exports = router; 