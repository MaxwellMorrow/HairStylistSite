import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { servicesAPI, availabilityAPI, appointmentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import BookingStepper from '../components/BookingStepper';

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
  const [inspoPhotos, setInspoPhotos] = useState([]);

  const {
    register,
    handleSubmit
  } = useForm();

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    );
    
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only images under 5MB are allowed.');
    }
    
    if (inspoPhotos.length + validFiles.length > 5) {
      toast.error('Maximum 5 inspiration photos allowed');
      return;
    }
    
    const newPhotos = validFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file)
    }));
    
    setInspoPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (id) => {
    setInspoPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    fetchAvailableDates(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
  }, [currentMonth]);

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getServices();
      setServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    }
  };

  const fetchAvailableSlots = useCallback(async () => {
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
  }, [selectedDate, selectedService]);

  useEffect(() => {
    if (selectedDate && selectedService) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedService, fetchAvailableSlots]);

  const fetchAvailableDates = async (year, month) => {
    try {
      console.log('=== Frontend fetchAvailableDates ===');
      console.log('Requesting dates for year:', year, 'month:', month);
      
      const response = await availabilityAPI.getAvailableDates({ year, month });
      console.log('Received available dates:', response.data);
      
      setAvailableDates(response.data || []);
    } catch (error) {
      console.error('Error fetching available dates:', error);
      setAvailableDates([]);
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

    if (!user) {
      toast.error('Please log in to book an appointment');
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

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('clientId', user._id);
      formData.append('serviceId', selectedService._id);
      formData.append('date', selectedDate.toISOString().split('T')[0]);
      formData.append('startTime', selectedTime);
      formData.append('endTime', endTime.toTimeString().slice(0, 5));
      formData.append('clientNotes', data.clientNotes || '');
      
      // Append inspiration photos
      inspoPhotos.forEach((photo, index) => {
        formData.append('inspoPhotos', photo.file);
      });

      // Debug: Log FormData contents
      console.log('Submitting appointment with FormData:');
      
      for (let pair of formData.entries()) {
        if (pair[0] === 'inspoPhotos') {
          console.log(pair[0], pair[1]?.name, pair[1]);
        } else {
          console.log(pair[0], pair[1]);
        }
      }

      await appointmentsAPI.createAppointment(formData);
      
      toast.success('Appointment booked successfully!');
      
      
      // Reset form
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setCurrentStep(1);
      setInspoPhotos([]);
      
      // Redirect to user appointments page
      window.location.href = '/appointments';
      
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
    const firstDay = new Date(year, month, 1); // local
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendar = [];
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7 + day);

        console.log(
          `[Calendar Cell] Local: ${date.toString()}, UTC: ${date.toISOString()}, Local YYYY-MM-DD: ${getLocalDateString(date)}, UTC YYYY-MM-DD: ${getUTCDateString(date)}`
        );
        
        const isCurrentMonth = date.getMonth() === month;
        const isToday = date.toDateString() === new Date().toDateString();
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
        
        // FIX: Convert backend dates to local for comparison
        const isAvailable = availableDates.some(d => {
          if (!d.available) return false;
          
          // Convert backend date string to local date for comparison
          const backendDate = new Date(d.date + 'T00:00:00');
          const localBackendDate = new Date(backendDate.getTime() + (backendDate.getTimezoneOffset() * 60000));
          const localBackendDateString = localBackendDate.toISOString().split('T')[0];
          
          // Convert calendar date to local date string
          const calendarDateString = date.toISOString().split('T')[0];
          
          return localBackendDateString === calendarDateString;
        });
        
        weekDays.push({
          date,
          isCurrentMonth,
          isToday,
          isSelected,
          isAvailable
        });
      }
      calendar.push(weekDays);
    }
    return calendar;
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const getLocalDateString = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const getUTCDateString = (date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

  // Prepare props for BookingStepper
  const stepperProps = {
    currentStep,
    onStepChange: setCurrentStep,
    onBack: handleBack,
    services,
    selectedService,
    onServiceSelect: handleServiceSelect,
    selectedDate,
    onDateSelect: handleDateSelect,
    selectedTime,
    onTimeSelect: handleTimeSelect,
    availableSlots,
    loading,
    currentMonth,
    onMonthChange: setCurrentMonth,
    availableDates,
    onNextMonth: nextMonth,
    onPrevMonth: prevMonth,
    renderCalendar,
    formatTime,
    formatDate,
    inspoPhotos,
    onPhotoUpload: handleFileUpload,
    onPhotoRemove: removePhoto,
    user,
    register,
    onSubmit: handleSubmit(onSubmit),
    isSubmitting: loading
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

        {/* Booking Stepper Component */}
        <BookingStepper {...stepperProps} />
      </div>
    </div>
  );
};

export default Booking; 