// Import all models to ensure they are registered
require('./User');
require('./Appointment');
require('./Service');
require('./Gallery');
require('./Availability');
require('./BlockedDate');

// Export models
module.exports = {
  User: require('./User'),
  Appointment: require('./Appointment'),
  Service: require('./Service'),
  Gallery: require('./Gallery'),
  Availability: require('./Availability'),
  BlockedDate: require('./BlockedDate')
}; 