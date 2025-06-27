const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Availability = require('./models/Availability');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function createTestAvailability() {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    // Create availability for the next few days of the current month
    const availabilities = [];
    
    for (let day = currentDate.getDate(); day <= Math.min(currentDate.getDate() + 7, new Date(currentYear, currentMonth + 1, 0).getDate()); day++) {
      const availability = new Availability({
        date: new Date(currentYear, currentMonth, day),
        isRecurring: false,
        startTime: '09:00',
        endTime: '17:00',
        allDay: false,
        slotDuration: 30,
        isActive: true,
        notes: `Test availability for ${day}/${currentMonth + 1}/${currentYear}`
      });
      
      availabilities.push(availability);
    }
    
    // Save all availabilities
    await Availability.insertMany(availabilities);
    
    console.log(`Created ${availabilities.length} test availabilities`);
    console.log('Test availabilities created successfully!');
    
    // List the created availabilities
    const created = await Availability.find({ notes: { $regex: /Test availability/ } }).sort({ date: 1 });
    console.log('\nCreated availabilities:');
    created.forEach(avail => {
      console.log(`- ${avail.date.toDateString()}: ${avail.startTime} - ${avail.endTime}`);
    });
    
  } catch (error) {
    console.error('Error creating test availability:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestAvailability(); 