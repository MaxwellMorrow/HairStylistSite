const { Gallery } = require('../models');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to gallery
exports.upload = async (req, res) => {
  try {
    const { title, description, category, clientName, beforeAfter, tags, order } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
      });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 10MB.' 
      });
    }

    // Process tags - convert comma-separated string to array
    let processedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        processedTags = tags;
      }
    }

    // Get the highest order number if order is not specified
    let imageOrder = order ? parseInt(order) : 0;
    if (!order) {
      const highestOrder = await Gallery.findOne().sort({ order: -1 });
      imageOrder = highestOrder ? highestOrder.order + 1 : 0;
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
      folder: 'hairstylist-gallery',
      transformation: [
        { width: 800, height: 600, crop: 'fill' },
        { quality: 'auto' }
      ]
    });

    // Create gallery entry
    const galleryItem = new Gallery({
      title: title || 'Untitled',
      description: description || '',
      category: category || 'general',
      clientName: clientName || 'Anonymous',
      beforeAfter: beforeAfter || 'after',
      tags: processedTags,
      order: imageOrder,
      imageUrl: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      imageData: {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        size: uploadResult.bytes
      }
    });

    await galleryItem.save();

    res.status(201).json({ 
      message: 'Image uploaded successfully',
      galleryItem 
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: 'Failed to upload image.', 
      details: err.message 
    });
  }
};

// Get all gallery images
exports.list = async (req, res) => {
  try {
    const { category, beforeAfter, limit = 20, page = 1, admin } = req.query;
    
    let filter = {};
    
    // If not admin, only show active images
    if (!admin) {
      filter.isActive = true;
    }
    
    if (category) filter.category = category;
    if (beforeAfter) filter.beforeAfter = beforeAfter;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const galleryItems = await Gallery.find(filter)
      .sort({ order: 1, createdAt: -1 }) // Sort by order first, then by creation date
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Gallery.countDocuments(filter);

    res.json({
      gallery: galleryItems, // Changed to match frontend expectation
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to fetch gallery images.', 
      details: err.message 
    });
  }
};

// Get gallery image by ID
exports.getById = async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);
    if (!galleryItem) {
      return res.status(404).json({ error: 'Gallery image not found.' });
    }
    res.json({ galleryItem });
  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to fetch gallery image.', 
      details: err.message 
    });
  }
};

// Update gallery image (admin only)
exports.update = async (req, res) => {
  try {
    const { title, description, category, clientName, beforeAfter, isActive, tags, order } = req.body;
    
    const galleryItem = await Gallery.findById(req.params.id);
    if (!galleryItem) {
      return res.status(404).json({ error: 'Gallery image not found.' });
    }

    // Process tags - convert comma-separated string to array
    let processedTags = galleryItem.tags; // Keep existing tags by default
    if (tags !== undefined) {
      if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        processedTags = tags;
      } else {
        processedTags = [];
      }
    }

    // Update fields
    if (title) galleryItem.title = title;
    if (description !== undefined) galleryItem.description = description;
    if (category) galleryItem.category = category;
    if (clientName) galleryItem.clientName = clientName;
    if (beforeAfter) galleryItem.beforeAfter = beforeAfter;
    galleryItem.tags = processedTags;
    
    // Convert isActive string to boolean
    if (isActive !== undefined) {
      galleryItem.isActive = isActive === 'true' || isActive === true;
    }
    
    // Handle order field
    if (order !== undefined) {
      galleryItem.order = parseInt(order) || 0;
    }

    await galleryItem.save();
    res.json({ galleryItem });

  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ 
      error: 'Failed to update gallery image.', 
      details: err.message 
    });
  }
};

// Delete gallery image (admin only)
exports.delete = async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);
    if (!galleryItem) {
      return res.status(404).json({ error: 'Gallery image not found.' });
    }

    // Delete from Cloudinary
    if (galleryItem.cloudinaryId) {
      await cloudinary.uploader.destroy(galleryItem.cloudinaryId);
    }

    // Delete from database
    await Gallery.findByIdAndDelete(req.params.id);

    res.json({ message: 'Gallery image deleted successfully.' });

  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to delete gallery image.', 
      details: err.message 
    });
  }
};

// Get gallery categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Gallery.distinct('category', { isActive: true });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to fetch categories.', 
      details: err.message 
    });
  }
}; 