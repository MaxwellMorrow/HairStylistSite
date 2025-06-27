const mongoose = require('mongoose');

const blockedDateSchema = new mongoose.Schema({
  // Date that is blocked (YYYY-MM-DD format)
  date: {
    type: Date,
    required: true
  },
  // Whether the entire day is blocked
  allDay: {
    type: Boolean,
    default: true
  },
  // Start time if not all day (24-hour format)
  startTime: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // End time if not all day (24-hour format)
  endTime: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // Reason for blocking
  reason: {
    type: String,
    required: true,
    trim: true
  },
  // Whether this is a recurring block (e.g., every Sunday)
  isRecurring: {
    type: Boolean,
    default: false
  },
  // Day of week for recurring blocks (0 = Sunday, 1 = Monday, etc.)
  recurringDayOfWeek: {
    type: Number,
    min: 0,
    max: 6
  },
  // Whether this blocked date is active
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
blockedDateSchema.index({ date: 1, isActive: 1 });
blockedDateSchema.index({ isRecurring: 1, recurringDayOfWeek: 1, isActive: 1 });

// Virtual for checking if a specific date/time is blocked
blockedDateSchema.methods.isBlocked = function(checkDate, checkTime = null) {
  if (!this.isActive) return false;
  
  if (this.isRecurring) {
    // Check if it's the same day of week
    const checkDayOfWeek = checkDate.getDay();
    if (checkDayOfWeek !== this.recurringDayOfWeek) return false;
    
    if (this.allDay) return true;
    
    // Check time range for non-all-day recurring blocks
    if (checkTime && this.startTime && this.endTime) {
      return checkTime >= this.startTime && checkTime < this.endTime;
    }
  } else {
    // Check specific date
    const blockDate = new Date(this.date);
    const checkDateOnly = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    const blockDateOnly = new Date(blockDate.getFullYear(), blockDate.getMonth(), blockDate.getDate());
    
    if (checkDateOnly.getTime() !== blockDateOnly.getTime()) return false;
    
    if (this.allDay) return true;
    
    // Check time range for non-all-day blocks
    if (checkTime && this.startTime && this.endTime) {
      return checkTime >= this.startTime && checkTime < this.endTime;
    }
  }
  
  return false;
};

module.exports = mongoose.model('BlockedDate', blockedDateSchema); 