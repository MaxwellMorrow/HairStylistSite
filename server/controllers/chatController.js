const { AzureOpenAI } = require("openai");
const { Service, User } = require('../models');
const Appointment = require('../models/Appointment');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiVersion = "2024-04-01-preview"; // Use your Azure API version

const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });

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

// Simple in-memory conversation store (in production, use Redis or database)
const conversationHistory = new Map();

// Helper to extract JSON block from AI response
function extractJsonBlock(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Helper to get conversation history for a user
function getConversationHistory(userId) {
  return conversationHistory.get(userId) || [];
}

// Helper to add message to conversation history
function addToConversationHistory(userId, role, content) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  const history = conversationHistory.get(userId);
  history.push({ role, content });
  
  // Keep only last 10 messages to prevent context overflow
  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }
}

// Helper to get available time slots for the next few days
async function getAvailableTimeSlots() {
  const today = new Date();
  const availableSlots = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Get the day name
    const dayName = dayNames[date.getDay()];
    
    // Business hours: 9 AM to 6 PM
    const businessHours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    
    for (const time of businessHours) {
      // Check if this slot is available
      const conflict = await Appointment.findOne({
        date: dateStr,
        startTime: time,
        isBlocked: false,
        status: { $in: ['pending', 'confirmed'] }
      });
      
      if (!conflict) {
        availableSlots.push(`${dateStr} (${dayName}) at ${time}`);
      }
    }
  }
  
  return availableSlots.slice(0, 10); // Return first 10 available slots
}

// Helper to get user appointments
async function getUserAppointments(userId) {
  try {
    const appointments = await Appointment.find({ client: userId })
      .populate('service')
      .sort({ date: 1, startTime: 1 });
    return appointments;
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    return [];
  }
}

// Helper to format appointment for display
function formatAppointment(appointment) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(appointment.date);
  const dayName = dayNames[date.getDay()];
  
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  return {
    id: appointment._id,
    service: appointment.service?.name || 'Unknown Service',
    date: appointment.date,
    dateFormatted: `${appointment.date} (${dayName})`,
    time: formatTime(appointment.startTime),
    duration: appointment.duration,
    status: appointment.status,
    totalCost: appointment.totalCost,
    clientNotes: appointment.clientNotes || '',
    inspoPhotos: appointment.inspoPhotos || []
  };
}

// Helper to find appointment by service name and day
function findAppointmentByServiceAndDay(appointments, serviceName, dayName) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = dayNames.findIndex(day => day.toLowerCase() === dayName.toLowerCase());
  
  if (dayIndex === -1) return null;
  
  console.log('Looking for appointment with service:', serviceName, 'and day:', dayName);
  console.log('Available appointments:', appointments.map(app => ({
    service: app.service?.name,
    day: dayNames[new Date(app.date).getDay()],
    date: app.date
  })));
  
  return appointments.find(app => {
    const appDate = new Date(app.date);
    const appDayIndex = appDate.getDay();
    
    // More flexible service matching
    const appServiceName = app.service?.name?.toLowerCase() || '';
    const searchServiceName = serviceName.toLowerCase();
    
    const serviceMatch = appServiceName.includes(searchServiceName) ||
                        searchServiceName.includes(appServiceName) ||
                        appServiceName.replace(/\s+/g, '') === searchServiceName.replace(/\s+/g, '');
    
    const dayMatch = appDayIndex === dayIndex;
    
    console.log('Checking appointment:', {
      service: app.service?.name,
      day: dayNames[appDayIndex],
      serviceMatch,
      dayMatch
    });
    
    return dayMatch && serviceMatch;
  });
}

exports.chatWithAI = async (req, res) => {
  // Check if user is admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required for AI ChatBot.' });
  }

  try {
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Get conversation history
    const history = getConversationHistory(userId || req.user._id);
    
    // Get available services
    const services = await Service.find({ isActive: true });
    const serviceList = services.map(s => `${s.name} (${s.duration} min, $${s.price})`).join(', ');
    
    // Get available time slots
    const availableSlots = await getAvailableTimeSlots();
    
    // Get user's existing appointments
    const userAppointments = await getUserAppointments(userId || req.user._id);
    const formattedAppointments = userAppointments.map(formatAppointment);
    
    // Build system prompt
    const systemPrompt = `You are an AI assistant for a hair salon booking system. You can help users book appointments, check their existing appointments, and provide information about services.

Available services: ${serviceList}

Available time slots for the next 7 days: ${availableSlots.join(', ')}

User's existing appointments: ${formattedAppointments.length > 0 ? formattedAppointments.map(app => `${app.service} on ${app.dateFormatted} at ${app.time}`).join(', ') : 'None'}

IMPORTANT: When a user confirms they want to book an appointment (says "yes", "book it", "confirm", etc.), immediately respond with a JSON block like this:
{
  "action": "book_appointment",
  "service": "service name",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "notes": "any special requests"
}

Only generate JSON when the user explicitly confirms a booking. For all other interactions, respond naturally as a helpful assistant.

Current conversation history:
${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;

    // Add user message to history
    addToConversationHistory(userId || req.user._id, 'user', message);
    
    // Call Azure OpenAI
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0].message.content;
    
    // Add AI response to history
    addToConversationHistory(userId || req.user._id, 'assistant', aiResponse);
    
    // Check if response contains JSON (booking confirmation)
    const jsonBlock = extractJsonBlock(aiResponse);
    
    if (jsonBlock && jsonBlock.action === 'book_appointment') {
      // Handle booking creation
      try {
        const service = await Service.findOne({ 
          name: { $regex: new RegExp(jsonBlock.service, 'i') } 
        });
        
        if (!service) {
          return res.json({ 
            reply: `I'm sorry, I couldn't find the service "${jsonBlock.service}". Please try again with a valid service name.`,
            jsonData: null
          });
        }
        
        // Create the appointment
        const appointment = new Appointment({
          client: userId || req.user._id,
          service: service._id,
          date: jsonBlock.date,
          startTime: jsonBlock.time,
          endTime: calculateEndTime(jsonBlock.time, service.duration),
          clientNotes: jsonBlock.notes || '',
          status: 'pending',
          totalCost: service.price
        });
        
        await appointment.save();
        
        return res.json({
          reply: `Perfect! I've booked your ${service.name} appointment for ${jsonBlock.date} at ${jsonBlock.time}. You'll receive a confirmation shortly.`,
          jsonData: jsonBlock,
          appointmentId: appointment._id
        });
        
      } catch (bookingError) {
        console.error('Booking error:', bookingError);
        return res.json({
          reply: `I'm sorry, there was an error creating your booking. Please try again or contact us directly.`,
          jsonData: null
        });
      }
    }
    
    res.json({ 
      reply: aiResponse,
      jsonData: null
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message.' });
  }
};

// Helper function to calculate end time
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date(2000, 0, 1, hours, minutes);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return endDate.toTimeString().slice(0, 5);
} 