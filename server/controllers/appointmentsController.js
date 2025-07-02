const { Appointment, User, Service } = require('../models');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const notificationService = require('../services/notificationService');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'uploads/inspo-photos/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created upload directory:', uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination called for file:', file.originalname);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'inspo-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: function (req, file, cb) {
    console.log('Multer fileFilter called for:', file.originalname, 'mimetype:', file.mimetype);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      console.log('File rejected - not an image:', file.originalname);
      cb(new Error('Only image files are allowed'), false);
    }
  }
}).array('inspoPhotos', 5);

// Book an appointment
exports.book = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    console.log('Files uploaded successfully:', req.files ? req.files.length : 0);

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
      
      // Fetch the appointment with client and service populated
      const populatedAppointment = await Appointment.findById(appointment._id).populate('client service');
      // Send notifications
      try {
        await notificationService.notifyNewAppointment(populatedAppointment);
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
    const { status, notes, clientNotes } = req.body;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    
    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;
    if (clientNotes !== undefined) appointment.clientNotes = clientNotes;
    
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
      if (appointment.client.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
    if (appointment.client.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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

// Confirm appointment (for admin email link)
exports.confirm = async (req, res) => {
  // TODO: Add authentication or secure token validation for production use
  try {
    const { id } = req.params;
    const { token } = req.query;
    const appointment = await Appointment.findById(id).populate('client service');
    if (!appointment) {
      return res.status(404).send(renderConfirmationPage('error', 'Appointment not found.'));
    }
    if (appointment.status === 'confirmed') {
      return res.status(400).send(renderConfirmationPage('error', 'Appointment is already confirmed.'));
    }
    if (!appointment.confirmationToken || !appointment.confirmationTokenExpires) {
      return res.status(400).send(renderConfirmationPage('error', 'No confirmation token set for this appointment.'));
    }
    if (appointment.confirmationTokenExpires < new Date()) {
      return res.status(400).send(renderConfirmationPage('error', 'Confirmation token has expired.'));
    }
    if (!token) {
      return res.status(400).send(renderConfirmationPage('error', 'Confirmation token is required.'));
    }
    const isMatch = await require('bcrypt').compare(token, appointment.confirmationToken);
    if (!isMatch) {
      return res.status(400).send(renderConfirmationPage('error', 'Invalid confirmation token.'));
    }
    appointment.status = 'confirmed';
    appointment.confirmationToken = undefined;
    appointment.confirmationTokenExpires = undefined;
    await appointment.save();
    // Send confirmation email to client
    try {
      await notificationService.notifyClientAppointmentFinalConfirmation(appointment, appointment.client, appointment.service);
    } catch (notificationError) {
      console.error('Error sending client confirmation:', notificationError);
    }
    return res.send(renderConfirmationPage('success', 'Appointment confirmed and client notified.'));
  } catch (err) {
    return res.status(500).send(renderConfirmationPage('error', 'Failed to confirm appointment. Please try again later.'));
  }
};

function renderConfirmationPage(type, message) {
  const isSuccess = type === 'success';
  return `
    <html>
      <head>
        <title>Appointment ${isSuccess ? 'Confirmed' : 'Error'}</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f8f9fa; text-align: center; padding: 40px; }
          .card { background: #fff; border-radius: 8px; padding: 32px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);}
          .success { color: #4CAF50; font-size: 2em; margin-bottom: 16px; }
          .error { color: #F44336; font-size: 2em; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="${isSuccess ? 'success' : 'error'}">${isSuccess ? '✔️' : '❌'}</div>
          <h2>Appointment ${isSuccess ? 'Confirmed!' : 'Error'}</h2>
          <p>${message}</p>
        </div>
      </body>
    </html>
  `;
} 