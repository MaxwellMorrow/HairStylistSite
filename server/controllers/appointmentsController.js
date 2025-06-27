const { Appointment, User, Service } = require('../models');
const moment = require('moment');

// Book an appointment
exports.book = async (req, res) => {
  try {
    const { clientId, serviceId, date, startTime, endTime, notes } = req.body;
    if (!clientId || !serviceId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found.' });
    const client = await User.findById(clientId);
    if (!client) return res.status(404).json({ error: 'Client not found.' });
    // Check for conflicts
    const conflict = await Appointment.findOne({
      date,
      startTime,
      isBlocked: false,
      status: { $in: ['pending', 'confirmed'] }
    });
    if (conflict) return res.status(409).json({ error: 'Time slot already booked.' });
    const duration = service.duration;
    const totalCost = service.price;
    const appointment = new Appointment({
      client: clientId,
      service: serviceId,
      date,
      startTime,
      endTime,
      duration,
      totalCost,
      notes
    });
    await appointment.save();
    res.status(201).json({ appointment });
  } catch (err) {
    res.status(500).json({ error: 'Booking failed.', details: err.message });
  }
};

// List appointments (optionally filter by client or date)
exports.list = async (req, res) => {
  try {
    const { clientId, date } = req.query;
    const filter = {};
    if (clientId) filter.client = clientId;
    if (date) filter.date = date;
    const appointments = await Appointment.find(filter).populate('client service');
    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments.', details: err.message });
  }
};

// Block a slot (admin)
exports.block = async (req, res) => {
  try {
    const { date, startTime, endTime, reason } = req.body;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const block = new Appointment({
      date,
      startTime,
      endTime,
      isBlocked: true,
      notes: reason || 'Blocked by admin',
      status: 'confirmed',
      duration: 0,
      totalCost: 0
    });
    await block.save();
    res.status(201).json({ block });
  } catch (err) {
    res.status(500).json({ error: 'Failed to block slot.', details: err.message });
  }
}; 