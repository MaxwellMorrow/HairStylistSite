const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['haircut', 'coloring', 'styling', 'treatment', 'extensions', 'updo', 'general'],
    default: 'general'
  },
  clientName: {
    type: String,
    trim: true,
    default: 'Anonymous'
  },
  beforeAfter: {
    type: String,
    enum: ['before', 'after', 'both'],
    default: 'after'
  },
  imageUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: true
  },
  imageData: {
    width: Number,
    height: Number,
    format: String,
    size: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
gallerySchema.index({ category: 1, isActive: 1 });
gallerySchema.index({ beforeAfter: 1, isActive: 1 });
gallerySchema.index({ featured: 1, isActive: 1 });
gallerySchema.index({ order: 1, createdAt: -1 });
gallerySchema.index({ createdAt: -1 });

// Text search index
gallerySchema.index({ 
  title: 'text', 
  description: 'text', 
  clientName: 'text' 
});

module.exports = mongoose.model('Gallery', gallerySchema); 