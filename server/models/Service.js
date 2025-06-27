const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['haircut', 'coloring', 'styling', 'treatment', 'extensions', 'other'],
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  imageUrl: {
    type: String
  },
  cloudinaryId: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  requirements: {
    type: String,
    trim: true
  },
  aftercare: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ name: 'text', description: 'text' });
serviceSchema.index({ order: 1, createdAt: -1 });
serviceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Service', serviceSchema);