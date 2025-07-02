const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Availability = require('./models/Availability');

async function testAvailability() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all availability settings
    const availability = await Availability.find({});
    console.log('\n=== Current Availability Settings ===');
    console.log(JSON.stringify(availability, null, 2));

    if (availability.length === 0) {
      console.log('\nNo availability settings found. Creating some test data...');
      
      // Create some test availability
      const testAvailability = [
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

      for (const avail of testAvailability) {
        const newAvail = new Availability(avail);
        await newAvail.save();
        console.log(`Created availability for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][avail.dayOfWeek]}`);
      }
    }

    // Test the appliesToDate method
    console.log('\n=== Testing appliesToDate Method ===');
    const testDate = new Date();
    console.log(`Testing date: ${testDate.toISOString().split('T')[0]} (day ${testDate.getDay()})`);
    
    for (const avail of availability) {
      const applies = avail.appliesToDate(testDate);
      console.log(`${avail.isRecurring ? 'Recurring' : 'Specific'} availability: ${applies ? 'YES' : 'NO'}`);
    }

    // Test for next 7 days
    console.log('\n=== Testing Next 7 Days ===');
    for (let i = 0; i < 7; i++) {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + i);
      const applicable = availability.filter(avail => avail.appliesToDate(testDate));
      console.log(`${testDate.toISOString().split('T')[0]} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][testDate.getDay()]}): ${applicable.length} availability settings`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testAvailability(); 