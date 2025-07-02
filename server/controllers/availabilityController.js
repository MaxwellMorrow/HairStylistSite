const Availability = require('../models/Availability');
const BlockedDate = require('../models/BlockedDate');
const Appointment = require('../models/Appointment');

// Helper function to parse date string to Date object
function parseDateString(dateString) {
  if (!dateString) return null;
  
  // Parse the date string and create date in UTC to avoid timezone conversion
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  console.log('Date parsing:', {
    original: dateString,
    year,
    month,
    day,
    parsed: date.toISOString(),
    parsedLocal: date.toString()
  });
  
  return date;
}

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
      date: isRecurring ? null : parseDateString(date),
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
    if (date !== undefined) availability.date = isRecurring ? null : parseDateString(date);
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
    
    // Parse date string to Date object
    const [year, month, day] = date.split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day, 12, 0, 0, 0); // Set to noon to avoid timezone edge cases
    
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
      const slots = avail.getTimeSlots();
      allSlots = allSlots.concat(slots);
    });
    
    // Remove duplicates and sort
    allSlots = [...new Set(allSlots)].sort();
    
    // Get blocked dates for this day
    const blockedDates = await BlockedDate.find({ isActive: true });
    const isBlocked = blockedDates.some(block => block.isBlocked(requestedDate, null));
    
    if (isBlocked) {
      return res.json({ slots: [] }); // Day is blocked
    }
    
    // Get existing appointments for this date
    // Use UTC for start and end of day to match how dates are stored in DB
    const startOfDayUTC = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate()));
    const endOfDayUTC = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate() + 1));
    
    const existingAppointments = await Appointment.find({
      date: {
        $gte: startOfDayUTC,
        $lt: endOfDayUTC
      },
      status: { $nin: ['cancelled', 'no-show'] }
    }).populate('service', 'duration');
    
    console.log('--- Existing Appointments for', date, '---');
    existingAppointments.forEach((appointment, idx) => {
      console.log(`  [${idx}] Appointment:`, {
        id: appointment._id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        serviceDuration: appointment.service?.duration,
        status: appointment.status,
        date: appointment.date
      });
    });
    
    // Filter out slots that would conflict with existing appointments
    const conflictingSlots = [];
    allSlots.forEach(slot => {
      const slotStart = new Date(`2000-01-01T${slot}:00`);
      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
      
      existingAppointments.forEach((appointment, idx) => {
        const appointmentStart = new Date(`2000-01-01T${appointment.startTime}:00`);
        const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.service?.duration || 30) * 60000);
        
        // Debug log for overlap check
        console.log(`  [Slot: ${slot}]`, {
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          appointmentStart: appointmentStart.toISOString(),
          appointmentEnd: appointmentEnd.toISOString(),
          overlap: slotStart < appointmentEnd && slotEnd > appointmentStart
        });
        
        // Check if there's any overlap
        if (slotStart < appointmentEnd && slotEnd > appointmentStart) {
          conflictingSlots.push(slot);
        }
      });
    });
    
    // Remove duplicate conflicting slots
    const uniqueConflictingSlots = [...new Set(conflictingSlots)];
    
    // Filter out conflicting slots
    const availableSlots = allSlots.filter(slot => !uniqueConflictingSlots.includes(slot));
    
    // Filter out slots that would run outside availability windows
    const slotsOutsideAvailability = [];
    availableSlots.forEach(slot => {
      const slotStart = new Date(`2000-01-01T${slot}:00`);
      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
      
      // Check if this slot fits within any availability window
      const fitsInAvailability = applicableAvailability.some(avail => {
        if (avail.allDay) {
          // For all-day availability, check that the slot ends by 17:00
          const availEnd = new Date(`2000-01-01T17:00:00`);
          return slotStart >= new Date(`2000-01-01T09:00:00`) && slotEnd <= availEnd;
        } else {
          // For specific time ranges
          const availStart = new Date(`2000-01-01T${avail.startTime}:00`);
          const availEnd = new Date(`2000-01-01T${avail.endTime}:00`);
          
          return slotStart >= availStart && slotEnd <= availEnd;
        }
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
    
    console.log('=== getAvailableDates called ===');
    console.log('Requested year:', year, 'month:', month);
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required.' });
    }
    
    // Create dates at noon to avoid timezone edge cases
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1, 12, 0, 0, 0);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 12, 0, 0, 0);
    
    console.log('Date range - startDate:', startDate.toISOString(), 'endDate:', endDate.toISOString());
    
    // Get all availability settings
    const allAvailability = await Availability.find({ isActive: true });
    console.log('Found', allAvailability.length, 'availability settings');
    
    // Log each availability setting
    allAvailability.forEach((avail, index) => {
      console.log(`Availability ${index + 1}:`, {
        id: avail._id,
        date: avail.date ? avail.date.toISOString() : 'null',
        dateAsLocal: avail.date ? new Date(avail.date).toString() : 'null',
        dayOfWeek: avail.dayOfWeek,
        isRecurring: avail.isRecurring,
        startTime: avail.startTime,
        endTime: avail.endTime,
        allDay: avail.allDay,
        isActive: avail.isActive
      });
    });
    
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
      // Create date at noon to avoid timezone edge cases
      const checkDate = new Date(parseInt(year), parseInt(month) - 1, day, 12, 0, 0, 0);
      
      console.log(`Checking day ${day}: ${checkDate.toISOString()} (${checkDate.toDateString()})`);
      
      // Skip past dates
      const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const checkDateOnly = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      
      if (checkDateOnly < currentDateOnly) {
        console.log(`  Skipping past date: ${checkDateOnly.toDateString()}`);
        continue;
      }
      
      // Check if date has availability (either recurring or specific)
      const applicableAvailability = allAvailability.filter(avail => avail.appliesToDate(checkDate));
      
      console.log(`  Applicable availability for ${checkDate.toDateString()}: ${applicableAvailability.length} settings`);
      
      if (applicableAvailability.length === 0) {
        console.log(`  No availability for ${checkDate.toDateString()}, skipping`);
        continue; // No availability for this day
      }
      
      // Check if date is blocked
      const isBlocked = blockedDates.some(block => block.isBlocked(checkDate, null));
      
      if (isBlocked) {
        console.log(`  Date ${checkDate.toDateString()} is blocked, skipping`);
        continue; // Day is blocked
      }
      
      // Check if there are any available slots (considering existing appointments)
      const dayAppointments = existingAppointments.filter(apt => 
        apt.date.toDateString() === checkDate.toDateString()
      );
      
      // Calculate total available slots for this day
      let totalSlots = 0;
      applicableAvailability.forEach(avail => {
        const slots = avail.getTimeSlots();
        totalSlots += slots.length;
      });
      
      // If there are no appointments or there's still availability, add the date
      if (dayAppointments.length === 0) {
        // Format date as YYYY-MM-DD
        const dateString = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        console.log(`  Adding available date: ${dateString} (${totalSlots} slots)`);
        availableDates.push({
          date: dateString,
          available: true,
          slotCount: totalSlots
        });
      } else {
        // Check if there are still available slots after existing appointments
        // For now, we'll assume each appointment takes up one slot
        // In a more sophisticated system, you'd calculate based on service duration
        if (dayAppointments.length < totalSlots) {
          // Format date as YYYY-MM-DD
          const dateString = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          console.log(`  Adding available date: ${dateString} (${totalSlots - dayAppointments.length} slots remaining)`);
          availableDates.push({
            date: dateString,
            available: true,
            slotCount: totalSlots - dayAppointments.length
          });
        }
      }
    }
    
    console.log('=== Final available dates ===');
    console.log('Available dates:', availableDates);
    console.log('=== End getAvailableDates ===');
    
    res.json(availableDates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get available dates.', details: err.message });
  }
}; 