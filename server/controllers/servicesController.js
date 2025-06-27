const Service = require('../models/Service');
const cloudinary = require('cloudinary').v2;

// List all services (for admin - includes inactive)
exports.list = async (req, res) => {
  try {
    const { category, admin, limit } = req.query;
    let filter = {};
    
    // If not admin, only show active services
    if (!admin) {
      filter.isActive = true;
    }
    
    if (category) filter.category = category;
    
    let query = Service.find(filter).sort({ order: 1, name: 1 }); // Sort by order first, then by name
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const services = await query;
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services.', details: err.message });
  }
};

// Get a single service by ID
exports.getById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service.', details: err.message });
  }
};

// Create a new service (admin only)
exports.create = async (req, res) => {
  try {
    const { name, description, category, duration, price, originalPrice, imageUrl, tags, requirements, aftercare, difficulty, order } = req.body;
    const imageFile = req.file;
    
    // Validation
    if (!name || !description || !category || !duration || !price) {
      return res.status(400).json({ 
        error: 'Name, description, category, duration, and price are required.' 
      });
    }
    
    if (duration <= 0) {
      return res.status(400).json({ error: 'Duration must be greater than 0.' });
    }
    
    if (price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0.' });
    }
    
    // Check if service name already exists
    const existing = await Service.findOne({ name, isActive: true });
    if (existing) {
      return res.status(409).json({ error: 'Service with this name already exists.' });
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
    let serviceOrder = order ? parseInt(order) : 0;
    if (!order) {
      const highestOrder = await Service.findOne().sort({ order: -1 });
      serviceOrder = highestOrder ? highestOrder.order + 1 : 0;
    }
    
    // Handle image - either from file upload or from gallery selection
    let finalImageUrl = '';
    let cloudinaryId = '';
    
    if (imageFile) {
      // Handle file upload
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imageFile.mimetype)) {
        return res.status(400).json({ 
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
        });
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (imageFile.size > maxSize) {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 10MB.' 
        });
      }

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: 'hairstylist-services',
        transformation: [
          { width: 800, height: 600, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      
      finalImageUrl = uploadResult.secure_url;
      cloudinaryId = uploadResult.public_id;
    } else if (imageUrl) {
      // Use gallery image URL
      finalImageUrl = imageUrl;
      // No cloudinaryId since it's from gallery
    }
    
    const service = new Service({
      name,
      description,
      category,
      duration,
      price,
      originalPrice,
      imageUrl: finalImageUrl,
      cloudinaryId,
      tags: processedTags,
      requirements,
      aftercare,
      difficulty,
      order: serviceOrder
    });
    
    await service.save();
    res.status(201).json({ service });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service.', details: err.message });
  }
};

// Update a service (admin only)
exports.update = async (req, res) => {
  try {
    const { name, description, category, duration, price, originalPrice, imageUrl, tags, requirements, aftercare, difficulty, isActive, order } = req.body;
    const imageFile = req.file;
    
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    
    // Validation
    if (duration && duration <= 0) {
      return res.status(400).json({ error: 'Duration must be greater than 0.' });
    }
    
    if (price && price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0.' });
    }
    
    // Check for name conflicts (if name is being changed)
    if (name && name !== service.name) {
      const existing = await Service.findOne({ name, isActive: true, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ error: 'Service with this name already exists.' });
      }
    }
    
    // Process tags - convert comma-separated string to array
    let processedTags = service.tags; // Keep existing tags by default
    if (tags !== undefined) {
      if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        processedTags = tags;
      } else {
        processedTags = [];
      }
    }
    
    // Handle image - either from file upload or from gallery selection
    if (imageFile) {
      // Handle file upload
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imageFile.mimetype)) {
        return res.status(400).json({ 
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
        });
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (imageFile.size > maxSize) {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 10MB.' 
        });
      }

      // Delete old image from Cloudinary if it exists
      if (service.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(service.cloudinaryId);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }

      // Upload new image to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: 'hairstylist-services',
        transformation: [
          { width: 800, height: 600, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      
      service.imageUrl = uploadResult.secure_url;
      service.cloudinaryId = uploadResult.public_id;
    } else if (imageUrl !== undefined) {
      // Use gallery image URL or clear image
      service.imageUrl = imageUrl || '';
      // Clear cloudinaryId since we're using a gallery image or no image
      service.cloudinaryId = '';
    }
    
    // Update fields
    if (name) service.name = name;
    if (description) service.description = description;
    if (category) service.category = category;
    if (duration) service.duration = duration;
    if (price) service.price = price;
    if (originalPrice !== undefined) service.originalPrice = originalPrice;
    service.tags = processedTags;
    if (requirements !== undefined) service.requirements = requirements;
    if (aftercare !== undefined) service.aftercare = aftercare;
    if (difficulty) service.difficulty = difficulty;
    if (isActive !== undefined) service.isActive = isActive;
    if (order !== undefined) service.order = parseInt(order) || 0;
    
    await service.save();
    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service.', details: err.message });
  }
};

// Delete a service (admin only)
exports.delete = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    
    // Delete image from Cloudinary if it exists
    if (service.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(service.cloudinaryId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }
    
    // Actually delete the service from the database
    await Service.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Service deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service.', details: err.message });
  }
};

// Get services by category
exports.getByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const services = await Service.find({ 
      category, 
      isActive: true 
    }).sort({ order: 1, name: 1 });
    
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services by category.', details: err.message });
  }
}; 