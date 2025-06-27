const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  // For specific dates (null if recurring)
  date: {
    type: Date,
    required: function() { return !this.isRecurring; }
  },
  // For recurring weekly patterns (null if specific date)
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    required: function() { return this.isRecurring; }
  },
  // Whether this is a recurring weekly pattern
  isRecurring: {
    type: Boolean,
    default: false
  },
  // Start time in 24-hour format (e.g., "09:00")
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // End time in 24-hour format (e.g., "17:00")
  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // Whether the entire day is available
  allDay: {
    type: Boolean,
    default: false
  },
  // Slot duration in minutes (default 30)
  slotDuration: {
    type: Number,
    default: 30,
    min: 15,
    max: 120
  },
  // Whether this availability is active
  isActive: {
    type: Boolean,
    default: true
  },
  // Notes for this availability
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
availabilitySchema.index({ date: 1, isActive: 1 });
availabilitySchema.index({ dayOfWeek: 1, isRecurring: 1, isActive: 1 });
availabilitySchema.index({ startTime: 1, endTime: 1 });

// Virtual for day name
availabilitySchema.virtual('dayName').get(function() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return this.dayOfWeek !== undefined ? days[this.dayOfWeek] : null;
});

// Method to get time slots for this availability
availabilitySchema.methods.getTimeSlots = function() {
  const slots = [];
  const slotDuration = this.slotDuration || 30; // Use the actual slot duration
  
  if (this.allDay) {
    // For all-day availability, create slots from 9 AM to 5 PM
    const start = new Date(`2000-01-01T09:00:00`);
    const end = new Date(`2000-01-01T17:00:00`);
    
    let current = new Date(start);
    while (current < end) {
      const timeString = current.toTimeString().slice(0, 5);
      slots.push(timeString);
      current.setMinutes(current.getMinutes() + slotDuration);
    }
  } else {
    // For specific time ranges
    const start = new Date(`2000-01-01T${this.startTime}:00`);
    const end = new Date(`2000-01-01T${this.endTime}:00`);
    
    let current = new Date(start);
    while (current < end) {
      const timeString = current.toTimeString().slice(0, 5);
      slots.push(timeString);
      current.setMinutes(current.getMinutes() + slotDuration);
    }
  }
  
  return slots;
};

// Method to check if this availability applies to a specific date
availabilitySchema.methods.appliesToDate = function(checkDate) {
  if (!this.isActive) return false;
  
  if (this.isRecurring) {
    // Check if it's the same day of week
    return checkDate.getDay() === this.dayOfWeek;
  } else {
    // Check if it's the same specific date
    const availabilityDate = new Date(this.date);
    const checkDateOnly = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    const availabilityDateOnly = new Date(availabilityDate.getFullYear(), availabilityDate.getMonth(), availabilityDate.getDate());
    
    return checkDateOnly.getTime() === availabilityDateOnly.getTime();
  }
};

module.exports = mongoose.model('Availability', availabilitySchema); 