import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { appointmentsAPI, availabilityAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, User, Phone, Mail, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [calendarData, setCalendarData] = useState({ appointments: [], blockedDates: [], availability: [] });
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm();

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await availabilityAPI.getCalendarData({
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear()
      });
      setCalendarData(response.data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  const fetchAppointmentsForDate = useCallback(async () => {
    if (!selectedDate) return;

    try {
      const response = await appointmentsAPI.getAll({
        date: selectedDate.toISOString().split('T')[0]
      });
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    if (selectedDate) {
      fetchAppointmentsForDate();
    }
  }, [selectedDate, fetchAppointmentsForDate]);

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setValue('status', appointment.status);
    setValue('notes', appointment.notes || '');
    setShowEditModal(true);
  };

  const openPhotoViewer = (photos, startIndex = 0) => {
    setViewingPhotos(photos);
    setCurrentPhotoIndex(startIndex);
    setShowPhotoViewer(true);
  };

  const nextPhoto = useCallback(() => {
    setCurrentPhotoIndex(prev => 
      prev === viewingPhotos.length - 1 ? 0 : prev + 1
    );
  }, [viewingPhotos.length]);

  const prevPhoto = useCallback(() => {
    setCurrentPhotoIndex(prev => 
      prev === 0 ? viewingPhotos.length - 1 : prev - 1
    );
  }, [viewingPhotos.length]);

  const closePhotoViewer = () => {
    setShowPhotoViewer(false);
    setViewingPhotos([]);
    setCurrentPhotoIndex(0);
  };

  // Keyboard navigation for photo viewer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showPhotoViewer) return;
      
      switch (e.key) {
        case 'Escape':
          closePhotoViewer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevPhoto();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextPhoto();
          break;
        default:
          break;
      }
    };

    if (showPhotoViewer) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showPhotoViewer, nextPhoto, prevPhoto]);

  const onSubmitEdit = async (data) => {
    try {
      await appointmentsAPI.update(selectedAppointment._id, data);
      toast.success('Appointment updated successfully!');
      setShowEditModal(false);
      setSelectedAppointment(null);
      fetchCalendarData();
      if (selectedDate) {
        fetchAppointmentsForDate();
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await appointmentsAPI.delete(id);
      toast.success('Appointment deleted successfully!');
      fetchCalendarData();
      if (selectedDate) {
        fetchAppointmentsForDate();
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    }
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      
      // Get appointments for this date
      const dateString = date.toISOString().split('T')[0];
      const dayAppointments = calendarData.appointments.filter(apt => 
        new Date(apt.date).toISOString().split('T')[0] === dateString
      );
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        isSelected,
        appointments: dayAppointments
      });
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
    // Handle the date string properly to avoid timezone issues
    // If date is a string like "2025-07-01T00:00:00.000+00:00", extract just the date part
    let dateToFormat = date;
    
    if (typeof date === 'string' && date.includes('T')) {
      // Extract just the date part (YYYY-MM-DD) before the 'T'
      const datePart = date.split('T')[0];
      // Create a new date object using the date part only (no timezone conversion)
      dateToFormat = new Date(datePart + 'T00:00:00');
    }
    
    return dateToFormat.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const EditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Appointment</h2>
          <button
            onClick={() => {
              setShowEditModal(false);
              setSelectedAppointment(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {selectedAppointment && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900">{selectedAppointment.service?.name}</h3>
            <p className="text-sm text-gray-600">
              {formatDate(new Date(selectedAppointment.date))} at {formatTime(selectedAppointment.startTime)}
            </p>
            <p className="text-sm text-gray-600">
              Client: {selectedAppointment.client?.name} ({selectedAppointment.client?.email})
            </p>
            
            {/* Inspiration Photos in Edit Modal */}
            {selectedAppointment.inspoPhotos && selectedAppointment.inspoPhotos.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    Inspiration Photos ({selectedAppointment.inspoPhotos.length})
                  </h4>
                  <button
                    onClick={() => openPhotoViewer(selectedAppointment.inspoPhotos)}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    View All
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedAppointment.inspoPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Inspiration ${index + 1}`}
                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openPhotoViewer(selectedAppointment.inspoPhotos, index)}
                        title="Click to view full size"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded flex items-center justify-center">
                        <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100">
                          View Full
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Click photos to view full size</p>
              </div>
            )}
            
            {/* Client Notes in Edit Modal */}
            {selectedAppointment.clientNotes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1 text-sm">Client Notes:</h4>
                <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                  {selectedAppointment.clientNotes}
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <div>
            <label className="form-label">Status</label>
            <select
              {...register('status', { required: 'Status is required' })}
              className="form-input"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
            {errors.status && (
              <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea
              {...register('notes')}
              className="form-input"
              rows="3"
              placeholder="Add any notes about this appointment..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedAppointment(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
            <p className="text-gray-600 mt-2">View and manage all client bookings</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading appointments...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <div className="card">
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
                    {getCalendarDays().map((day, index) => (
                      <button
                        key={index}
                        onClick={() => day.isCurrentMonth && setSelectedDate(day.date)}
                        className={`
                          p-2 text-sm rounded-lg transition-colors duration-200 min-h-[80px] flex flex-col
                          ${day.isSelected 
                            ? 'bg-primary-600 text-white' 
                            : day.isToday 
                              ? 'bg-primary-100 text-primary-700' 
                              : !day.isCurrentMonth
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'hover:bg-gray-100 text-gray-700'
                          }
                        `}
                      >
                        <span className="text-xs">{day.date.getDate()}</span>
                        {day.appointments.length > 0 && (
                          <div className="mt-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full mx-auto"></div>
                            <span className="text-xs block mt-1">{day.appointments.length}</span>
                            {/* Show indicator for appointments with photos */}
                            {day.appointments.some(apt => apt.inspoPhotos && apt.inspoPhotos.length > 0) && (
                              <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1" title="Has inspiration photos"></div>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Calendar Legend */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Appointments</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      <span>Has Photos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointments List */}
            <div className="lg:col-span-1">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-xl font-semibold">
                    {selectedDate ? formatDate(selectedDate) : 'All Appointments'}
                  </h2>
                  <p className="text-gray-600">
                    {selectedDate ? `${appointments.length} appointments` : 'Select a date to view appointments'}
                  </p>
                </div>
                
                <div className="space-y-4">
                  {selectedDate && appointments.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No appointments on this date</p>
                    </div>
                  ) : selectedDate ? (
                    appointments.map((appointment) => (
                      <div key={appointment._id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{appointment.service?.name}</h3>
                            <p className="text-sm text-gray-600">
                              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{appointment.client?.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>{appointment.client?.email}</span>
                          </div>
                          {appointment.client?.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4" />
                              <span>{appointment.client.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        {appointment.clientNotes && (
                          <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
                            <strong>Client Notes:</strong> {appointment.clientNotes}
                          </div>
                        )}
                        
                        {/* Inspiration Photos */}
                        {appointment.inspoPhotos && appointment.inspoPhotos.length > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Inspiration Photos ({appointment.inspoPhotos.length}):</h4>
                              <button
                                onClick={() => openPhotoViewer(appointment.inspoPhotos)}
                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                              >
                                View All
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {appointment.inspoPhotos.map((photo, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={photo}
                                    alt={`Inspiration ${index + 1}`}
                                    className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => openPhotoViewer(appointment.inspoPhotos, index)}
                                    title="Click to view full size"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {appointment.notes && (
                          <div className="mb-3 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                            <strong>Admin Notes:</strong> {appointment.notes}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-primary-600">${appointment.totalCost}</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditAppointment(appointment)}
                              className="btn-secondary btn-sm"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAppointment(appointment._id)}
                              className="btn-danger btn-sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Select a date to view appointments</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && <EditModal />}

        {/* Photo Viewer Modal */}
        {showPhotoViewer && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={closePhotoViewer}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X className="h-8 w-8" />
              </button>

              {/* Photo counter */}
              <div className="absolute top-4 left-4 text-white z-10">
                {currentPhotoIndex + 1} / {viewingPhotos.length}
              </div>

              {/* Main photo */}
              <img
                src={viewingPhotos[currentPhotoIndex]}
                alt="Inspiration"
                className="max-w-full max-h-full object-contain"
              />

              {/* Navigation buttons */}
              {viewingPhotos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Thumbnail strip */}
              {viewingPhotos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {viewingPhotos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                        index === currentPhotoIndex ? 'border-white' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAppointments; 