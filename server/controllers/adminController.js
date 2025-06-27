const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Service = require('../models/Service');
const Gallery = require('../models/Gallery');
const moment = require('moment');

// Block specific days (admin only)
exports.blockDay = async (req, res) => {
  try {
    const { date, reason, isRecurring, dayOfWeek } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    // Validate date format
    const blockDate = moment(date);
    if (!blockDate.isValid()) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    // Check if date is in the past
    if (blockDate.isBefore(moment(), 'day')) {
      return res.status(400).json({ error: 'Cannot block dates in the past.' });
    }

    // If recurring, block all future occurrences of that day of week
    if (isRecurring && dayOfWeek !== undefined) {
      const startDate = moment(date);
      const endDate = moment().add(6, 'months'); // Block for 6 months
      
      const dates = [];
      let currentDate = startDate.clone();
      
      while (currentDate.isBefore(endDate)) {
        if (currentDate.day() === dayOfWeek) {
          dates.push(currentDate.format('YYYY-MM-DD'));
        }
        currentDate.add(1, 'day');
      }

      // Create blocked appointments for all dates
      const blockedSlots = dates.map(dateStr => ({
        date: dateStr,
        startTime: '09:00',
        endTime: '17:00',
        isBlocked: true,
        notes: reason || `Recurring block - ${moment(dateStr).format('dddd')}`,
        status: 'confirmed',
        duration: 0,
        totalCost: 0
      }));

      await Appointment.insertMany(blockedSlots);
      
      res.status(201).json({ 
        message: `Blocked ${dates.length} recurring dates`,
        dates,
        reason: reason || `Recurring block - ${moment(date).format('dddd')}`
      });
    } else {
      // Block single day
      const block = new Appointment({
        date: date,
        startTime: '09:00',
        endTime: '17:00',
        isBlocked: true,
        notes: reason || 'Day blocked by admin',
        status: 'confirmed',
        duration: 0,
        totalCost: 0
      });

      await block.save();
      
      res.status(201).json({ 
        message: 'Day blocked successfully',
        block 
      });
    }

  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to block day.', 
      details: err.message 
    });
  }
};

// Create available time slots (admin only)
exports.createSlots = async (req, res) => {
  try {
    const { date, startTime, endTime, slotDuration = 60 } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Date, start time, and end time are required.' });
    }

    // Validate date
    const slotDate = moment(date);
    if (!slotDate.isValid()) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    if (slotDate.isBefore(moment(), 'day')) {
      return res.status(400).json({ error: 'Cannot create slots for dates in the past.' });
    }

    // Generate time slots
    const slots = [];
    let currentTime = moment(startTime, 'HH:mm');
    const endMoment = moment(endTime, 'HH:mm');

    while (currentTime.isBefore(endMoment)) {
      const slotEnd = currentTime.clone().add(slotDuration, 'minutes');
      
      if (slotEnd.isAfter(endMoment)) break;

      slots.push({
        date: date,
        startTime: currentTime.format('HH:mm'),
        endTime: slotEnd.format('HH:mm'),
        isBlocked: false,
        status: 'available',
        duration: slotDuration,
        totalCost: 0
      });

      currentTime.add(slotDuration, 'minutes');
    }

    // Check for existing slots and avoid duplicates
    const existingSlots = await Appointment.find({ 
      date, 
      isBlocked: false 
    });

    const newSlots = slots.filter(slot => 
      !existingSlots.some(existing => 
        existing.startTime === slot.startTime && existing.endTime === slot.endTime
      )
    );

    if (newSlots.length === 0) {
      return res.status(409).json({ error: 'All slots for this time period already exist.' });
    }

    await Appointment.insertMany(newSlots);

    res.status(201).json({ 
      message: `Created ${newSlots.length} time slots`,
      slots: newSlots
    });

  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to create slots.', 
      details: err.message 
    });
  }
};

// Get admin dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const thisWeek = moment().startOf('week');
    const thisMonth = moment().startOf('month');

    // Get appointment statistics
    const todayAppointments = await Appointment.countDocuments({
      date: today.format('YYYY-MM-DD'),
      isBlocked: false
    });

    const weekAppointments = await Appointment.countDocuments({
      date: { $gte: thisWeek.format('YYYY-MM-DD') },
      isBlocked: false
    });

    const monthAppointments = await Appointment.countDocuments({
      date: { $gte: thisMonth.format('YYYY-MM-DD') },
      isBlocked: false
    });

    // Get upcoming appointments
    const upcomingAppointments = await Appointment.find({
      date: { $gte: today.format('YYYY-MM-DD') },
      isBlocked: false,
      status: { $in: ['pending', 'confirmed'] }
    })
    .populate('client', 'name email')
    .populate('service', 'name price')
    .sort({ date: 1, startTime: 1 })
    .limit(10);

    // Get blocked days
    const blockedDays = await Appointment.find({
      date: { $gte: today.format('YYYY-MM-DD') },
      isBlocked: true
    })
    .sort({ date: 1 })
    .limit(10);

    // Get service statistics
    const serviceStats = await Service.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' }
      }}
    ]);

    // Get recent gallery uploads
    const recentGallery = await Gallery.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        todayAppointments,
        weekAppointments,
        monthAppointments
      },
      upcomingAppointments,
      blockedDays,
      serviceStats,
      recentGallery
    });

  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data.', 
      details: err.message 
    });
  }
};

// Get blocked days
exports.getBlockedDays = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = { isBlocked: true };
    
    if (startDate && endDate) {
      filter.date = { 
        $gte: startDate, 
        $lte: endDate 
      };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    }

    const blockedDays = await Appointment.find(filter)
      .sort({ date: 1 });

    res.json({ blockedDays });

  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to fetch blocked days.', 
      details: err.message 
    });
  }
};

// Unblock a day
exports.unblockDay = async (req, res) => {
  try {
    const { date } = req.params;
    
    const result = await Appointment.deleteMany({
      date,
      isBlocked: true
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'No blocked appointments found for this date.' });
    }

    res.json({ 
      message: `Unblocked ${result.deletedCount} blocked appointments`,
      date 
    });

  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to unblock day.', 
      details: err.message 
    });
  }
}; 