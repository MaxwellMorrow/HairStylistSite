const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

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

// Test notification endpoint
router.post('/test-notification', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, email, phone } = req.body;
    
    if (type === 'email' && email) {
      const result = await notificationService.sendEmail(
        email,
        'Test Notification',
        '<h2>Test Email</h2><p>This is a test email from your hairstylist booking system.</p>'
      );
      res.json({ success: result, message: 'Test email sent' });
    } else if (type === 'sms' && phone) {
      const result = await notificationService.sendSMS(
        phone,
        'Test SMS from your hairstylist booking system'
      );
      res.json({ success: result, message: 'Test SMS sent' });
    } else {
      res.status(400).json({ error: 'Invalid notification type or missing contact info' });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Get notification system status
router.get('/notification-status', authenticateToken, async (req, res) => {
  try {
    const status = {
      emailConfigured: !!(process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASS),
      smsConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
      adminEmail: process.env.ADMIN_EMAIL || null,
      adminPhone: process.env.ADMIN_PHONE || null,
      reminderJobsActive: true, // Always true since we're using node-cron
      emailService: process.env.EMAIL_SERVICE || null,
      smsService: process.env.TWILIO_ACCOUNT_SID ? 'Twilio' : null
    };
    
    res.json({ status });
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({ error: 'Failed to get notification status' });
  }
});

module.exports = router; 