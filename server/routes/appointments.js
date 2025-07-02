const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');
const { authenticateToken } = require('../middleware/auth');

// Book appointment
router.post('/book', appointmentsController.book);

// List appointments
router.get('/', appointmentsController.list);

// Get user appointments (requires auth)
router.get('/user', authenticateToken, appointmentsController.getUserAppointments);

// Get appointment by ID
router.get('/:id', appointmentsController.getById);

// Update appointment
router.put('/:id', appointmentsController.update);

// Delete appointment
router.delete('/:id', appointmentsController.delete);

// Block slot
router.post('/block', appointmentsController.block);

// Update appointment photos
router.put('/:id/photos', authenticateToken, appointmentsController.updatePhotos);

// Delete specific photo
router.delete('/:id/photos/:photoIndex', authenticateToken, appointmentsController.deletePhoto);

// Confirm appointment (for admin email link)
router.get('/confirm/:id', appointmentsController.confirm);

module.exports = router; 