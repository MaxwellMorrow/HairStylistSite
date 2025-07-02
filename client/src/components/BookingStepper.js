import React from 'react';
import { Calendar, Clock, Check, ChevronLeft, ChevronRight, Phone, Mail, Upload, X } from 'lucide-react';

const BookingStepper = ({
  currentStep,
  onStepChange,
  onBack,
  services,
  selectedService,
  onServiceSelect,
  selectedDate,
  onDateSelect,
  selectedTime,
  onTimeSelect,
  availableSlots,
  loading,
  currentMonth,
  onMonthChange,
  availableDates,
  onNextMonth,
  onPrevMonth,
  renderCalendar,
  formatTime,
  formatDate,
  inspoPhotos,
  onPhotoUpload,
  onPhotoRemove,
  user,
  register,
  onSubmit,
  isSubmitting
}) => {


  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Choose Service';
      case 2: return 'Select Date';
      case 3: return 'Pick Time';
      case 4: return 'Confirm Booking';
      default: return 'Book Appointment';
    }
  };

  const ServiceSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Service</h2>
        <p className="text-gray-600">Select the service you'd like to book</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div
            key={service._id}
            onClick={() => onServiceSelect(service)}
            className="card cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-transparent hover:border-primary-200"
          >
            {service.imageUrl && (
              <div className="aspect-w-16 aspect-h-9 mb-4">
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h3>
              <p className="text-gray-600 text-sm mb-3">{service.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-primary-600">${service.price}</span>
                <span className="text-sm text-gray-500">{service.duration} min</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const DateSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Date</h2>
        <p className="text-gray-600">Choose a date for your appointment</p>
      </div>
      
      <div className="card max-w-md mx-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={onPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar().map((week, weekIndex) => (
              <React.Fragment key={weekIndex}>
                {week.map((day, dayIndex) => {
                  const dayClasses = [
                    'p-2 text-center cursor-pointer border border-gray-200 min-h-[40px] flex items-center justify-center',
                    !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : '',
                    day.isAvailable && day.isCurrentMonth ? 'bg-green-100 hover:bg-green-200' : '',
                    !day.isAvailable && day.isCurrentMonth && !day.isToday && !day.isSelected ? 'bg-white' : '',
                    day.isToday ? 'bg-blue-100 font-bold' : '',
                    day.isSelected ? 'bg-blue-500 text-white' : '',
                    !day.isCurrentMonth ? 'cursor-not-allowed' : 'hover:bg-gray-100'
                  ].filter(Boolean).join(' ');
                  
                  return (
                    <div
                      key={dayIndex}
                      className={dayClasses}
                      onClick={() => {
                        if (day.isCurrentMonth && day.isAvailable) {
                          onDateSelect(day.date);
                        }
                      }}
                    >
                      {day.date.getDate()}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Calendar Legend */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
              <span>Selected</span>
            </div>
          </div>
        </div>
      </div>
      
      {selectedDate && (
        <div className="text-center">
          <p className="text-gray-600">Selected: <span className="font-semibold">{formatDate(selectedDate)}</span></p>
        </div>
      )}
    </div>
  );

  const TimeSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Time</h2>
        <p className="text-gray-600">Choose an available time slot for your {selectedService?.duration}-minute appointment</p>
        {selectedService && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg inline-block">
            <p className="text-sm text-blue-700">
              <strong>{selectedService.name}</strong> - {selectedService.duration} minutes
            </p>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading available times...</p>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No available time slots for this date</p>
          <p className="text-sm text-gray-400 mt-2">
            This could be due to existing appointments or insufficient time for a {selectedService?.duration}-minute service
          </p>
          <button
            onClick={() => onStepChange(2)}
            className="btn-primary mt-4"
          >
            Choose Different Date
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {availableSlots.map((time) => (
            <button
              key={time}
              onClick={() => onTimeSelect(time)}
              className={`
                p-3 text-sm rounded-lg border transition-colors duration-200
                ${selectedTime === time
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300 hover:bg-primary-50'
                }
              `}
            >
              {formatTime(time)}
            </button>
          ))}
        </div>
      )}
      
      {selectedTime && (
        <div className="text-center">
          <p className="text-gray-600">Selected: <span className="font-semibold">{formatTime(selectedTime)}</span></p>
        </div>
      )}
    </div>
  );

  const BookingConfirmation = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Your Booking</h2>
        <p className="text-gray-600">Review your appointment details</p>
      </div>
      
      <div className="card max-w-2xl mx-auto">
        <div className="p-6 space-y-6">
          {/* Service Details */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            {selectedService.imageUrl && (
              <img
                src={selectedService.imageUrl}
                alt={selectedService.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{selectedService.name}</h3>
              <p className="text-sm text-gray-600">{selectedService.description}</p>
              <p className="text-sm text-gray-500">{selectedService.duration} minutes</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-600">${selectedService.price}</p>
            </div>
          </div>
          
          {/* Appointment Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-gray-900">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="text-gray-900">{formatTime(selectedTime)}</span>
            </div>
          </div>
          
          {/* Client Notes */}
          <div>
            <label className="form-label">Additional Notes (Optional)</label>
            <textarea
              {...register('clientNotes')}
              className="form-input"
              rows="3"
              placeholder="Any special requests or notes for your appointment..."
            />
          </div>
          
          {/* Inspiration Photos */}
          <div>
            <label className="form-label">Inspiration Photos (Optional)</label>
            <p className="text-sm text-gray-600 mb-3">
              Upload photos to help your stylist understand your vision. Max 5 photos, 5MB each.
            </p>
            
            {/* File Upload */}
            <div className="mb-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={onPhotoUpload}
                className="hidden"
                id="inspo-photos"
                disabled={inspoPhotos.length >= 5}
              />
              <label
                htmlFor="inspo-photos"
                className={`
                  inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium
                  ${inspoPhotos.length >= 5 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  }
                `}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Photos
              </label>
              {inspoPhotos.length >= 5 && (
                <span className="ml-2 text-sm text-gray-500">Maximum photos reached</span>
              )}
            </div>
            
            {/* Photo Preview Grid */}
            {inspoPhotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {inspoPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.preview}
                      alt="Inspiration"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => onPhotoRemove(photo.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Contact Info */}
          {user ? (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Contact Information</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2">Login Required</h4>
              <p className="text-sm text-yellow-800 mb-3">
                You need to be logged in to book an appointment. Please log in or create an account to continue.
              </p>
              <div className="flex space-x-3">
                <a href="/login" className="btn-primary btn-sm">
                  Log In
                </a>
                <a href="/register" className="btn-secondary btn-sm">
                  Create Account
                </a>
              </div>
            </div>
          )}
          
          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-primary-600">${selectedService.price}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ServiceSelection />;
      case 2:
        return <DateSelection />;
      case 3:
        return <TimeSelection />;
      case 4:
        return <BookingConfirmation />;
      default:
        return <ServiceSelection />;
    }
  };

  return (
    <>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                ${step <= currentStep 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {step < currentStep ? <Check className="h-4 w-4" /> : step}
              </div>
              {step < 4 && (
                <div className={`
                  w-16 h-1 mx-2
                  ${step < currentStep ? 'bg-primary-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center mt-4 text-sm text-gray-600">{getStepTitle()}</p>
      </div>

      {/* Main Content */}
      <div className="card">
        {currentStep > 1 && (
          <div className="mb-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        )}

        {renderStep()}

        {/* Action Buttons */}
        {currentStep === 4 && (
          <div className="mt-8 text-center">
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !user}
              className={`btn-lg ${user ? 'btn-primary' : 'btn-secondary cursor-not-allowed'}`}
            >
              {isSubmitting ? 'Booking...' : user ? 'Confirm Booking' : 'Please Log In to Book'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default BookingStepper; 