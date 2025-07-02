const mongoose = require('mongoose');
const Availability = require('./models/Availability');
require('dotenv').config();

async function createWeeklyAvailability() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if weekly availability already exists
    const existingWeekly = await Availability.find({ isRecurring: true });
    if (existingWeekly.length > 0) {
      console.log('Weekly availability already exists:');
      existingWeekly.forEach(avail => {
        console.log(`- ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][avail.dayOfWeek]}: ${avail.startTime} - ${avail.endTime}`);
      });
      return;
    }

    // Create weekly availability for weekdays (Monday-Friday)
    const weeklyAvailability = [
      {
        dayOfWeek: 1, // Monday
        isRecurring: true,
        startTime: '09:00',
        endTime: '17:00',
        allDay: false,
        slotDuration: 30,
        isActive: true,
        notes: 'Monday availability'
      },
      {
        dayOfWeek: 2, // Tuesday
        isRecurring: true,
        startTime: '09:00',
        endTime: '17:00',
        allDay: false,
        slotDuration: 30,
        isActive: true,
        notes: 'Tuesday availability'
      },
      {
        dayOfWeek: 3, // Wednesday
        isRecurring: true,
        startTime: '09:00',
        endTime: '17:00',
        allDay: false,
        slotDuration: 30,
        isActive: true,
        notes: 'Wednesday availability'
      },
      {
        dayOfWeek: 4, // Thursday
        isRecurring: true,
        startTime: '09:00',
        endTime: '17:00',
        allDay: false,
        slotDuration: 30,
        isActive: true,
        notes: 'Thursday availability'
      },
      {
        dayOfWeek: 5, // Friday
        isRecurring: true,
        startTime: '09:00',
        endTime: '17:00',
        allDay: false,
        slotDuration: 30,
        isActive: true,
        notes: 'Friday availability'
      }
    ];

    console.log('Creating weekly availability...');
    for (const avail of weeklyAvailability) {
      const newAvail = new Availability(avail);
      await newAvail.save();
      console.log(`✓ Created availability for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][avail.dayOfWeek]}`);
    }

    console.log('\nWeekly availability created successfully!');
    console.log('Now the booking system should show available dates for weekdays.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createWeeklyAvailability(); 