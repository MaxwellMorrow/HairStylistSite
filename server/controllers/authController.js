const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const user = new User({ name, email, password });
    await user.save();
    req.session.userId = user._id;
    res.status(201).json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    req.session.userId = user._id;
    res.json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.', details: err.message });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user info.', details: err.message });
  }
}; 