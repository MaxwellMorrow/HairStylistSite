const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');

// Book appointment
router.post('/book', appointmentsController.book);

// List appointments
router.get('/', appointmentsController.list);

// Block slot
router.post('/block', appointmentsController.block);

module.exports = router; 