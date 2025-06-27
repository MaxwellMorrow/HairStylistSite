const { Appointment, User, Service } = require('../models');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const notificationService = require('../services/notificationService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/inspo-photos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'inspo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
}).array('inspoPhotos', 5);

// Book an appointment
exports.book = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { clientId, serviceId, date, startTime, endTime, notes, clientNotes } = req.body;
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
      
      // Process uploaded files
      const inspoPhotoUrls = req.files ? req.files.map(file => `/uploads/inspo-photos/${file.filename}`) : [];
      
      const appointment = new Appointment({
        client: clientId,
        service: serviceId,
        date,
        startTime,
        endTime,
        duration,
        totalCost,
        notes: notes || '',
        clientNotes: clientNotes || '',
        inspoPhotos: inspoPhotoUrls
      });
      
      await appointment.save();
      
      // Send notifications
      try {
        await notificationService.notifyNewAppointment(appointment);
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the booking if notifications fail
      }
      
      res.status(201).json({ appointment });
    } catch (err) {
      res.status(500).json({ error: 'Booking failed.', details: err.message });
    }
  });
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

// Get appointments for current user
exports.getUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const appointments = await Appointment.find({ client: userId })
      .populate('service')
      .sort({ date: 1, startTime: 1 });
    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user appointments.', details: err.message });
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

// Get appointment by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id).populate('client service');
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointment.', details: err.message });
  }
};

// Update appointment
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    
    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;
    
    await appointment.save();
    
    // Send cancellation notifications if appointment was cancelled
    if (status === 'cancelled') {
      try {
        await notificationService.notifyAppointmentCancellation(appointment, 'admin');
      } catch (notificationError) {
        console.error('Error sending cancellation notifications:', notificationError);
      }
    }
    
    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appointment.', details: err.message });
  }
};

// Delete appointment
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    
    await Appointment.findByIdAndDelete(id);
    res.json({ message: 'Appointment deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete appointment.', details: err.message });
  }
};

// Update appointment photos
exports.updatePhotos = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { id } = req.params;
      const appointment = await Appointment.findById(id);
      
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found.' });
      }

      // Check if user owns this appointment or is admin
      if (appointment.client.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to modify this appointment.' });
      }

      // Process uploaded files
      const newPhotoUrls = req.files ? req.files.map(file => `/uploads/inspo-photos/${file.filename}`) : [];
      
      // Add new photos to existing ones (up to 5 total)
      const currentPhotos = appointment.inspoPhotos || [];
      const updatedPhotos = [...currentPhotos, ...newPhotoUrls].slice(0, 5);
      
      appointment.inspoPhotos = updatedPhotos;
      await appointment.save();
      
      res.json({ appointment });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update photos.', details: err.message });
    }
  });
};

// Delete specific photo
exports.deletePhoto = async (req, res) => {
  try {
    const { id, photoIndex } = req.params;
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Check if user owns this appointment or is admin
    if (appointment.client.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to modify this appointment.' });
    }

    const photoIndexNum = parseInt(photoIndex);
    if (photoIndexNum < 0 || photoIndexNum >= appointment.inspoPhotos.length) {
      return res.status(400).json({ error: 'Invalid photo index.' });
    }

    // Remove the photo at the specified index
    appointment.inspoPhotos.splice(photoIndexNum, 1);
    await appointment.save();
    
    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete photo.', details: err.message });
  }
}; 