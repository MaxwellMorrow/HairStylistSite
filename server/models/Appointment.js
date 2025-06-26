const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  totalCost: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  clientNotes: {
    type: String,
    trim: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
appointmentSchema.index({ date: 1, startTime: 1 });
appointmentSchema.index({ client: 1, date: 1 });
appointmentSchema.index({ status: 1 });

// Virtual for checking if appointment is in the past
appointmentSchema.virtual('isPast').get(function() {
  const now = new Date();
  const appointmentDate = new Date(this.date);
  appointmentDate.setHours(parseInt(this.startTime.split(':')[0]));
  appointmentDate.setMinutes(parseInt(this.startTime.split(':')[1]));
  return appointmentDate < now;
});

// Virtual for checking if appointment is today
appointmentSchema.virtual('isToday').get(function() {
  const today = new Date();
  const appointmentDate = new Date(this.date);
  return today.toDateString() === appointmentDate.toDateString();
});

module.exports = mongoose.model('Appointment', appointmentSchema); 