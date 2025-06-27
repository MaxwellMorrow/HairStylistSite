const express = require('express');
const router = express.Router();
const multer = require('multer');
const servicesController = require('../controllers/servicesController');

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// List all services (public)
router.get('/', servicesController.list);

// Get services by category (public) - MUST come before /:id
router.get('/category/:category', servicesController.getByCategory);

// Get service by ID (public)
router.get('/:id', servicesController.getById);

// Create service (admin only)
router.post('/', upload.single('image'), servicesController.create);

// Update service (admin only)
router.put('/:id', upload.single('image'), servicesController.update);

// Delete/Deactivate service (admin only)
router.delete('/:id', servicesController.delete);

module.exports = router; 