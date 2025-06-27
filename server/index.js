const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check endpoint (available before database connection)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hairstylist', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Wait a moment to ensure connection is fully established
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Import models after database connection is established
  require('./models');
  
  // Wait a moment to ensure models are registered
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Import routes after models are registered
  const authRoutes = require('./routes/auth');
  const appointmentRoutes = require('./routes/appointments');
  const galleryRoutes = require('./routes/gallery');
  const adminRoutes = require('./routes/admin');
  const serviceRoutes = require('./routes/services');
  const availabilityRoutes = require('./routes/availability');
  
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/availability', availabilityRoutes);
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
      error: 'Something went wrong!',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  });
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
  
  // Initialize notification service
  require('./services/notificationService');
  
  // Serve React app in production
  if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React app build directory
    app.use(express.static(path.join(__dirname, 'public')));
    
    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})
.catch(err => console.error('MongoDB connection error:', err)); 