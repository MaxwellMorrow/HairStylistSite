import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { servicesAPI, availabilityAPI, appointmentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Check, ChevronLeft, ChevronRight, MapPin, Phone, Mail } from 'lucide-react';

const Booking = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const watchClientNotes = watch('clientNotes', '');

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    fetchAvailableDates(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
  }, [currentMonth]);

  useEffect(() => {
    if (selectedDate && selectedService) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedService]);

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getServices();
      setServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !selectedService) return;

    try {
      setLoading(true);
      const response = await availabilityAPI.getAvailableSlots({
        date: selectedDate.toISOString().split('T')[0],
        serviceId: selectedService._id
      });
      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDates = async (year, month) => {
    try {
      const response = await availabilityAPI.getAvailableDates({ year, month });
      setAvailableDates(response.data);
    } catch (error) {
      console.error('Error fetching available dates:', error);
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setSelectedTime(null);
    setCurrentStep(2);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setCurrentStep(3);
    // Fetch available slots for this date and service
    if (selectedService) {
      fetchAvailableSlots();
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setCurrentStep(4);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data) => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error('Please complete all booking details');
      return;
    }

    try {
      setLoading(true);
      
      // Calculate end time based on service duration
      const startTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration);

      const appointmentData = {
        service: selectedService._id,
        date: selectedDate.toISOString().split('T')[0],
        startTime: selectedTime,
        endTime: endTime.toTimeString().slice(0, 5),
        duration: selectedService.duration,
        totalCost: selectedService.price,
        clientNotes: data.clientNotes || '',
        notes: ''
      };

      await appointmentsAPI.createAppointment(appointmentData);
      
      toast.success('Appointment booked successfully!');
      
      // Reset form
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setCurrentStep(1);
      
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date();
    const todayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    // Debug: Log available dates
    console.log('Available dates:', availableDates);
    console.log('Current month:', year, month + 1);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === currentDate.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isPast = date < todayStart;
      const isAvailable = availableDates.some(d => new Date(d).toDateString() === date.toDateString());
      
      // Debug: Log specific date info
      if (isCurrentMonth && !isPast) {
        console.log(`Date ${date.toDateString()}: isAvailable=${isAvailable}`);
      }
      
      const dayClasses = [
        'p-2 text-center cursor-pointer border border-gray-200 min-h-[40px] flex items-center justify-center',
        isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400',
        isToday ? 'bg-blue-100 font-bold' : '',
        isSelected ? 'bg-blue-500 text-white' : '',
        isPast ? 'text-gray-400 cursor-not-allowed' : '',
        isAvailable && isCurrentMonth && !isPast ? 'bg-green-100 hover:bg-green-200' : '',
        !isCurrentMonth || isPast ? 'cursor-not-allowed' : 'hover:bg-gray-100'
      ].filter(Boolean).join(' ');
      
      days.push(
        <div
          key={i}
          className={dayClasses}
          onClick={() => {
            if (isCurrentMonth && !isPast && isAvailable) {
              setSelectedDate(date);
              setSelectedTime(null);
              setCurrentStep(3);
              // Fetch available slots for this date and service
              if (selectedService) {
                fetchAvailableSlots();
              }
            }
          }}
        >
          {date.getDate()}
        </div>
      );
    }
    
    return days;
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
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
            onClick={() => handleServiceSelect(service)}
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
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={nextMonth}
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
            {renderCalendar()}
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
            onClick={() => setCurrentStep(2)}
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
              onClick={() => handleTimeSelect(time)}
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
          
          {/* Contact Info */}
          {user && (
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

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Choose Service';
      case 2: return 'Select Date';
      case 3: return 'Pick Time';
      case 4: return 'Confirm Booking';
      default: return 'Book Appointment';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="section-title">Book Your Appointment</h1>
          <p className="section-subtitle">
            Schedule your hairstyling session with our professional team
          </p>
        </div>

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
                onClick={handleBack}
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
                onClick={handleSubmit(onSubmit)}
                disabled={loading}
                className="btn-primary btn-lg"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking; 