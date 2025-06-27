const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const galleryController = require('../controllers/galleryController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all gallery images (public)
router.get('/', galleryController.list);

// Get gallery categories (public)
router.get('/categories/list', galleryController.getCategories);

// Get gallery image by ID (public)
router.get('/:id', galleryController.getById);

// Upload image (admin only)
router.post('/upload', upload.single('image'), galleryController.upload);

// Update gallery image (admin only)
router.put('/:id', galleryController.update);

// Delete gallery image (admin only)
router.delete('/:id', galleryController.delete);

module.exports = router; 