import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Trash2, Check, X, Upload, Plus } from 'lucide-react';

const UserAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [newPhotos, setNewPhotos] = useState([]);

  useEffect(() => {
    if (user) {
      fetchUserAppointments();
    }
  }, [user]);

  const fetchUserAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.getUserAppointments();
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      await appointmentsAPI.update(appointmentId, { status: 'cancelled' });
      toast.success('Appointment cancelled successfully');
      fetchUserAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleAddPhotos = (appointment) => {
    setEditingAppointment(appointment);
    setNewPhotos([]);
    setShowPhotoModal(true);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    );
    
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only images under 5MB are allowed.');
    }
    
    const currentPhotoCount = (editingAppointment?.inspoPhotos?.length || 0) + newPhotos.length;
    if (currentPhotoCount + validFiles.length > 5) {
      toast.error('Maximum 5 inspiration photos allowed');
      return;
    }
    
    const newPhotoObjects = validFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file)
    }));
    
    setNewPhotos(prev => [...prev, ...newPhotoObjects]);
  };

  const removeNewPhoto = (id) => {
    setNewPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const handleSavePhotos = async () => {
    if (!editingAppointment) return;

    try {
      const formData = new FormData();
      newPhotos.forEach((photo, index) => {
        formData.append('inspoPhotos', photo.file);
      });

      await appointmentsAPI.updatePhotos(editingAppointment._id, formData);
      toast.success('Photos updated successfully');
      setShowPhotoModal(false);
      setEditingAppointment(null);
      setNewPhotos([]);
      fetchUserAppointments();
    } catch (error) {
      console.error('Error updating photos:', error);
      toast.error('Failed to update photos');
    }
  };

  const handleDeletePhoto = async (appointmentId, photoIndex) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      await appointmentsAPI.deletePhoto(appointmentId, photoIndex);
      toast.success('Photo deleted successfully');
      fetchUserAppointments();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <Check className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
            <p className="text-gray-600">You need to be logged in to view your appointments.</p>
            <a href="/login" className="btn-primary mt-4">
              Log In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="section-title">My Appointments</h1>
          <p className="section-subtitle">
            View and manage your upcoming appointments
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-600 mb-6">You haven't booked any appointments yet.</p>
            <a href="/booking" className="btn-primary">
              Book Your First Appointment
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {appointments.map((appointment) => (
              <div key={appointment._id} className="card">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {appointment.service?.name}
                      </h3>
                      <p className="text-gray-600">
                        {formatDate(appointment.date)} at {formatTime(appointment.startTime)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusIcon(appointment.status)}
                        <span className="ml-1">{appointment.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{appointment.duration} minutes</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="font-semibold">Total:</span>
                        <span className="text-lg font-bold text-primary-600">${appointment.totalCost}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {appointment.clientNotes && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-1">Your Notes:</h4>
                      <p className="text-sm text-blue-800">{appointment.clientNotes}</p>
                    </div>
                  )}

                  {/* Inspiration Photos */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-gray-900">Inspiration Photos:</h4>
                      <button
                        onClick={() => handleAddPhotos(appointment)}
                        className="btn-secondary btn-sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {appointment.inspoPhotos && appointment.inspoPhotos.length > 0 ? 'Edit' : 'Add'} Photos
                      </button>
                    </div>
                    
                    {appointment.inspoPhotos && appointment.inspoPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {appointment.inspoPhotos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Inspiration ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => handleDeletePhoto(appointment._id, index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No inspiration photos added yet</p>
                      </div>
                    )}
                  </div>

                  {/* Admin Notes */}
                  {appointment.notes && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                      <h4 className="font-semibold text-yellow-900 mb-1">Stylist Notes:</h4>
                      <p className="text-sm text-yellow-800">{appointment.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    {appointment.status === 'pending' || appointment.status === 'confirmed' ? (
                      <button
                        onClick={() => handleCancelAppointment(appointment._id)}
                        className="btn-danger btn-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancel Appointment
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {appointment.status === 'cancelled' ? 'Appointment cancelled' : 'No actions available'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Management Modal */}
      {showPhotoModal && editingAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Manage Inspiration Photos</h2>
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setEditingAppointment(null);
                  setNewPhotos([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {editingAppointment.service?.name} - {formatDate(editingAppointment.date)}
              </h3>
              <p className="text-sm text-gray-600">
                Current photos: {editingAppointment.inspoPhotos?.length || 0} / 5
              </p>
            </div>

            {/* Current Photos */}
            {editingAppointment.inspoPhotos && editingAppointment.inspoPhotos.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Current Photos:</h4>
                <div className="grid grid-cols-3 gap-3">
                  {editingAppointment.inspoPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Current ${index + 1}`}
                        className="w-full h-20 object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Photos */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Add New Photos:</h4>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="new-inspo-photos"
                disabled={(editingAppointment.inspoPhotos?.length || 0) + newPhotos.length >= 5}
              />
              <label
                htmlFor="new-inspo-photos"
                className={`
                  inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium cursor-pointer
                  ${(editingAppointment.inspoPhotos?.length || 0) + newPhotos.length >= 5 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Photos
              </label>
              {(editingAppointment.inspoPhotos?.length || 0) + newPhotos.length >= 5 && (
                <span className="ml-2 text-sm text-gray-500">Maximum photos reached</span>
              )}
            </div>

            {/* New Photos Preview */}
            {newPhotos.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">New Photos (Click to remove):</h4>
                <div className="grid grid-cols-3 gap-3">
                  {newPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.preview}
                        alt="New"
                        className="w-full h-20 object-cover rounded"
                      />
                      <button
                        onClick={() => removeNewPhoto(photo.id)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setEditingAppointment(null);
                  setNewPhotos([]);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhotos}
                disabled={newPhotos.length === 0}
                className={`btn-primary ${newPhotos.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Save Photos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAppointments; 