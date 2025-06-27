const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin dashboard
router.get('/dashboard', adminController.getDashboard);

// Block day (single or recurring)
router.post('/block-day', adminController.blockDay);

// Create time slots
router.post('/create-slots', adminController.createSlots);

// Get blocked days
router.get('/blocked-days', adminController.getBlockedDays);

// Unblock a day
router.delete('/unblock-day/:date', adminController.unblockDay);

module.exports = router; 