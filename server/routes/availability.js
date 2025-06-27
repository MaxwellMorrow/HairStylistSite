const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

// Get all availability settings
router.get('/', availabilityController.getAvailability);

// Create new availability
router.post('/create', availabilityController.createAvailability);

// Update availability
router.put('/:id', availabilityController.updateAvailability);

// Delete availability
router.delete('/:id', availabilityController.deleteAvailability);

// Legacy routes for backward compatibility
router.post('/set', availabilityController.setAvailability);
router.delete('/deactivate/:dayOfWeek', availabilityController.deactivateAvailability);

// Get available time slots for a specific date
router.get('/slots', availabilityController.getAvailableSlots);

// Get available dates for a specific month
router.get('/dates/:year/:month', availabilityController.getAvailableDates);

// Get all blocked dates
router.get('/blocked', availabilityController.getBlockedDates);

// Create a blocked date
router.post('/blocked', availabilityController.createBlockedDate);

// Update a blocked date
router.put('/blocked/:id', availabilityController.updateBlockedDate);

// Delete a blocked date
router.delete('/blocked/:id', availabilityController.deleteBlockedDate);

// Get calendar data for admin dashboard
router.get('/calendar', availabilityController.getCalendarData);

module.exports = router; 