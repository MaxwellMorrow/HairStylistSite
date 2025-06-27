const Availability = require('../models/Availability');
const BlockedDate = require('../models/BlockedDate');
const Appointment = require('../models/Appointment');

// Get all availability settings
exports.getAvailability = async (req, res) => {
  try {
    const availability = await Availability.find({ isActive: true }).sort({ date: 1, dayOfWeek: 1 });
    res.json({ availability });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch availability.', details: err.message });
  }
};

// Create new availability
exports.createAvailability = async (req, res) => {
  try {
    const { date, dayOfWeek, startTime, endTime, allDay, notes, isRecurring } = req.body;
    
    // Validation
    if (isRecurring && (dayOfWeek < 0 || dayOfWeek > 6)) {
      return res.status(400).json({ error: 'Invalid day of week for recurring availability.' });
    }
    
    if (!isRecurring && !date) {
      return res.status(400).json({ error: 'Date is required for non-recurring availability.' });
    }
    
    if (!allDay && (!startTime || !endTime)) {
      return res.status(400).json({ error: 'Start time and end time are required for non-all-day availability.' });
    }
    
    const availability = new Availability({
      date: isRecurring ? null : new Date(date),
      dayOfWeek: isRecurring ? dayOfWeek : null,
      isRecurring,
      startTime: allDay ? '09:00' : startTime,
      endTime: allDay ? '17:00' : endTime,
      allDay,
      slotDuration: 30, // Default 30-minute slots
      isActive: true, // Always active when created
      notes
    });
    
    await availability.save();
    res.status(201).json({ availability });
  } catch (err) {
    console.error('Error creating availability:', err);
    res.status(500).json({ error: 'Failed to create availability.', details: err.message });
  }
};

// Update availability
exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, dayOfWeek, startTime, endTime, allDay, notes, isRecurring } = req.body;
    
    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ error: 'Availability not found.' });
    }
    
    // Update fields
    if (date !== undefined) availability.date = isRecurring ? null : new Date(date);
    if (dayOfWeek !== undefined) availability.dayOfWeek = isRecurring ? dayOfWeek : null;
    if (isRecurring !== undefined) availability.isRecurring = isRecurring;
    if (startTime !== undefined) availability.startTime = allDay ? '09:00' : startTime;
    if (endTime !== undefined) availability.endTime = allDay ? '17:00' : endTime;
    if (allDay !== undefined) availability.allDay = allDay;
    if (notes !== undefined) availability.notes = notes;
    
    await availability.save();
    res.json({ availability });
  } catch (err) {
    console.error('Error updating availability:', err);
    res.status(500).json({ error: 'Failed to update availability.', details: err.message });
  }
};

// Delete availability
exports.deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ error: 'Availability not found.' });
    }
    
    await Availability.findByIdAndDelete(id);
    res.json({ message: 'Availability deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete availability.', details: err.message });
  }
};

// Legacy method for backward compatibility
exports.setAvailability = async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, slotDuration, notes } = req.body;
    
    // Validation
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'Invalid day of week.' });
    }
    
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Start time and end time are required.' });
    }
    
    // Check if availability already exists for this day
    let availability = await Availability.findOne({ dayOfWeek, isRecurring: true });
    
    if (availability) {
      // Update existing availability
      availability.startTime = startTime;
      availability.endTime = endTime;
      availability.slotDuration = slotDuration || 30;
      availability.notes = notes;
      availability.isActive = true;
    } else {
      // Create new availability
      availability = new Availability({
        dayOfWeek,
        isRecurring: true,
        startTime,
        endTime,
        slotDuration: slotDuration || 30,
        notes
      });
    }
    
    await availability.save();
    res.json({ availability });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set availability.', details: err.message });
  }
};

// Legacy method for backward compatibility
exports.deactivateAvailability = async (req, res) => {
  try {
    const { dayOfWeek } = req.params;
    
    const availability = await Availability.findOne({ dayOfWeek, isRecurring: true });
    if (!availability) {
      return res.status(404).json({ error: 'Availability not found for this day.' });
    }
    
    availability.isActive = false;
    await availability.save();
    
    res.json({ message: 'Availability deactivated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate availability.', details: err.message });
  }
};

// Get available time slots for a specific date
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date, serviceId } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }
    
    const requestedDate = new Date(date);
    
    // Get all availability settings that apply to this date
    const allAvailability = await Availability.find({ isActive: true });
    const applicableAvailability = allAvailability.filter(avail => avail.appliesToDate(requestedDate));
    
    if (applicableAvailability.length === 0) {
      return res.json({ slots: [] }); // No availability for this day
    }
    
    // Get service duration if serviceId is provided
    let serviceDuration = 30; // Default 30 minutes
    if (serviceId) {
      const Service = require('../models/Service');
      const service = await Service.findById(serviceId);
      if (service && service.duration) {
        serviceDuration = service.duration;
      }
    }
    
    // Get all time slots from applicable availability
    let allSlots = [];
    applicableAvailability.forEach(avail => {
      allSlots = allSlots.concat(avail.getTimeSlots());
    });
    
    // Remove duplicates and sort
    allSlots = [...new Set(allSlots)].sort();
    
    // Get blocked dates for this day
    const blockedDates = await BlockedDate.find({ isActive: true });
    const isBlocked = blockedDates.some(block => block.isBlocked(requestedDate));
    
    if (isBlocked) {
      return res.json({ slots: [] }); // Day is blocked
    }
    
    // Get existing appointments for this date
    const existingAppointments = await Appointment.find({
      date: {
        $gte: new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate()),
        $lt: new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate() + 1)
      },
      status: { $nin: ['cancelled', 'no-show'] }
    }).populate('service', 'duration');
    
    // Filter out slots that would conflict with existing appointments
    const conflictingSlots = [];
    existingAppointments.forEach(appointment => {
      const appointmentStart = new Date(`2000-01-01T${appointment.startTime}:00`);
      const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.service?.duration || 30) * 60000);
      
      allSlots.forEach(slot => {
        const slotStart = new Date(`2000-01-01T${slot}:00`);
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
        
        // Check if there's any overlap
        if (slotStart < appointmentEnd && slotEnd > appointmentStart) {
          conflictingSlots.push(slot);
        }
      });
    });
    
    // Filter out conflicting slots
    const availableSlots = allSlots.filter(slot => !conflictingSlots.includes(slot));
    
    // Filter out slots that would run outside availability windows
    const slotsOutsideAvailability = [];
    availableSlots.forEach(slot => {
      const slotStart = new Date(`2000-01-01T${slot}:00`);
      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
      
      // Check if this slot fits within any availability window
      const fitsInAvailability = applicableAvailability.some(avail => {
        const availStart = new Date(`2000-01-01T${avail.startTime}:00`);
        const availEnd = new Date(`2000-01-01T${avail.endTime}:00`);
        
        return slotStart >= availStart && slotEnd <= availEnd;
      });
      
      if (!fitsInAvailability) {
        slotsOutsideAvailability.push(slot);
      }
    });
    
    // Filter out slots outside availability
    const finalSlots = availableSlots.filter(slot => !slotsOutsideAvailability.includes(slot));
    
    // Filter out slots that are in the past (if today)
    const now = new Date();
    const isToday = now.toDateString() === requestedDate.toDateString();
    
    if (isToday) {
      const currentTime = now.toTimeString().slice(0, 5);
      const futureSlots = finalSlots.filter(slot => slot > currentTime);
      return res.json({ slots: futureSlots });
    }
    
    res.json({ slots: finalSlots });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get available slots.', details: err.message });
  }
};

// Get all blocked dates
exports.getBlockedDates = async (req, res) => {
  try {
    const blockedDates = await BlockedDate.find({ isActive: true }).sort({ date: 1 });
    res.json({ blockedDates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blocked dates.', details: err.message });
  }
};

// Create a blocked date
exports.createBlockedDate = async (req, res) => {
  try {
    const { date, allDay, startTime, endTime, reason, isRecurring, recurringDayOfWeek } = req.body;
    
    // Validation
    if (!date && !isRecurring) {
      return res.status(400).json({ error: 'Date is required for non-recurring blocks.' });
    }
    
    if (isRecurring && (recurringDayOfWeek < 0 || recurringDayOfWeek > 6)) {
      return res.status(400).json({ error: 'Invalid recurring day of week.' });
    }
    
    if (!allDay && (!startTime || !endTime)) {
      return res.status(400).json({ error: 'Start time and end time are required for non-all-day blocks.' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required.' });
    }
    
    const blockedDate = new BlockedDate({
      date: isRecurring ? null : new Date(date),
      allDay,
      startTime,
      endTime,
      reason,
      isRecurring,
      recurringDayOfWeek
    });
    
    await blockedDate.save();
    res.status(201).json({ blockedDate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create blocked date.', details: err.message });
  }
};

// Update a blocked date
exports.updateBlockedDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, allDay, startTime, endTime, reason, isRecurring, recurringDayOfWeek, isActive } = req.body;
    
    const blockedDate = await BlockedDate.findById(id);
    if (!blockedDate) {
      return res.status(404).json({ error: 'Blocked date not found.' });
    }
    
    // Update fields
    if (date !== undefined) blockedDate.date = new Date(date);
    if (allDay !== undefined) blockedDate.allDay = allDay;
    if (startTime !== undefined) blockedDate.startTime = startTime;
    if (endTime !== undefined) blockedDate.endTime = endTime;
    if (reason !== undefined) blockedDate.reason = reason;
    if (isRecurring !== undefined) blockedDate.isRecurring = isRecurring;
    if (recurringDayOfWeek !== undefined) blockedDate.recurringDayOfWeek = recurringDayOfWeek;
    if (isActive !== undefined) blockedDate.isActive = isActive;
    
    await blockedDate.save();
    res.json({ blockedDate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update blocked date.', details: err.message });
  }
};

// Delete a blocked date
exports.deleteBlockedDate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blockedDate = await BlockedDate.findById(id);
    if (!blockedDate) {
      return res.status(404).json({ error: 'Blocked date not found.' });
    }
    
    await BlockedDate.findByIdAndDelete(id);
    res.json({ message: 'Blocked date deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete blocked date.', details: err.message });
  }
};

// Get calendar data for admin dashboard
exports.getCalendarData = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get all appointments for this month
    const appointments = await Appointment.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('client', 'name email').populate('service', 'name price');
    
    // Get all blocked dates
    const blockedDates = await BlockedDate.find({ isActive: true });
    
    // Get availability
    const availability = await Availability.find({ isActive: true });
    
    res.json({
      appointments,
      blockedDates,
      availability
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get calendar data.', details: err.message });
  }
};

// Get available dates for a specific month
exports.getAvailableDates = async (req, res) => {
  try {
    const { year, month } = req.params;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required.' });
    }
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    // Get all availability settings
    const allAvailability = await Availability.find({ isActive: true });
    
    // Get all blocked dates
    const blockedDates = await BlockedDate.find({ isActive: true });
    
    // Get existing appointments for this month
    const existingAppointments = await Appointment.find({
      date: { $gte: startDate, $lte: endDate },
      status: { $nin: ['cancelled', 'no-show'] }
    });
    
    const availableDates = [];
    const currentDate = new Date();
    
    // Check each day in the month
    for (let day = 1; day <= endDate.getDate(); day++) {
      const checkDate = new Date(parseInt(year), parseInt(month) - 1, day);
      
      // Skip past dates
      if (checkDate < new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())) {
        continue;
      }
      
      // Check if date has availability
      const applicableAvailability = allAvailability.filter(avail => avail.appliesToDate(checkDate));
      
      if (applicableAvailability.length === 0) {
        continue; // No availability for this day
      }
      
      // Check if date is blocked
      const isBlocked = blockedDates.some(block => block.isBlocked(checkDate));
      
      if (isBlocked) {
        continue; // Day is blocked
      }
      
      // Check if there are any available slots (considering existing appointments)
      const dayAppointments = existingAppointments.filter(apt => 
        apt.date.toDateString() === checkDate.toDateString()
      );
      
      // If there are no appointments or there's still availability, add the date
      if (dayAppointments.length === 0) {
        availableDates.push(checkDate.toISOString().split('T')[0]);
      } else {
        // Check if there are still available slots after existing appointments
        // This is a simplified check - in practice, you might want to do a full slot calculation
        const totalSlots = applicableAvailability.reduce((total, avail) => {
          const slots = avail.getTimeSlots();
          return total + slots.length;
        }, 0);
        
        if (dayAppointments.length < totalSlots) {
          availableDates.push(checkDate.toISOString().split('T')[0]);
        }
      }
    }
    
    res.json(availableDates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get available dates.', details: err.message });
  }
}; 