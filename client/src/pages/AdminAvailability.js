import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { availabilityAPI } from '../services/api';
import { Calendar, Clock, X, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Settings, Save } from 'lucide-react';

const AdminAvailability = () => {
  const [availability, setAvailability] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [viewMode, setViewMode] = useState('availability'); // 'availability' or 'blocked'

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm();

  const watchIsRecurring = watch('isRecurring', false);
  const watchAllDay = watch('allDay', true);
  const watchAvailabilityType = watch('availabilityType', 'specific');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [availabilityRes, blockedRes] = await Promise.all([
        availabilityAPI.getAvailability(),
        availabilityAPI.getBlockedDates()
      ]);
      setAvailability(availabilityRes.data.availability || []);
      setBlockedDates(blockedRes.data.blockedDates || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    // Only allow clicking on current month dates
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    if (!isCurrentMonth) {
      return;
    }

    if (viewMode === 'availability') {
      // Check if this specific date already has availability set
      const dateString = date.toISOString().split('T')[0];
      const existingAvailability = availability.find(avail => 
        avail.date && new Date(avail.date).toISOString().split('T')[0] === dateString
      );
      
      if (existingAvailability) {
        // Edit existing availability
        setEditingAvailability(existingAvailability);
        setValue('date', existingAvailability.date ? new Date(existingAvailability.date).toISOString().split('T')[0] : '');
        setValue('availabilityType', existingAvailability.isRecurring ? 'recurring' : 'specific');
        setValue('recurringDayOfWeek', existingAvailability.dayOfWeek ? existingAvailability.dayOfWeek.toString() : '');
        setValue('startTime', existingAvailability.startTime || '09:00');
        setValue('endTime', existingAvailability.endTime || '17:00');
        setValue('allDay', existingAvailability.allDay);
        setValue('notes', existingAvailability.notes || '');
      } else {
        // Create new availability for this specific date
        setEditingAvailability(null);
        setValue('date', dateString);
        setValue('availabilityType', 'specific');
        setValue('startTime', '09:00');
        setValue('endTime', '17:00');
        setValue('allDay', false);
        setValue('notes', '');
      }
      setShowAvailabilityModal(true);
    } else {
      // Toggle blocked date
      const dateString = date.toISOString().split('T')[0];
      const existingBlock = blockedDates.find(block => 
        !block.isRecurring && new Date(block.date).toISOString().split('T')[0] === dateString
      );
      
      if (existingBlock) {
        handleDeleteBlock(existingBlock._id);
      } else {
        handleCreateBlockedDate(date);
      }
    }
  };

  const onSubmitAvailability = async (data) => {
    try {
      const availabilityData = {
        date: data.availabilityType === 'specific' ? data.date : null,
        dayOfWeek: data.availabilityType === 'recurring' ? parseInt(data.recurringDayOfWeek) : null,
        startTime: data.startTime,
        endTime: data.endTime,
        allDay: data.allDay === true || data.allDay === 'true',
        slotDuration: 30, // Default 30-minute slots
        notes: data.notes,
        isRecurring: data.availabilityType === 'recurring'
      };

      if (editingAvailability) {
        await availabilityAPI.updateAvailability(editingAvailability._id, availabilityData);
        toast.success('Availability updated successfully!');
      } else {
        await availabilityAPI.createAvailability(availabilityData);
        toast.success('Availability set successfully!');
      }
      
      reset();
      setEditingAvailability(null);
      setShowAvailabilityModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability');
    }
  };

  const handleDeleteAvailability = async (id) => {
    if (!window.confirm('Are you sure you want to delete this availability?')) {
      return;
    }

    try {
      await availabilityAPI.deleteAvailability(id);
      toast.success('Availability deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast.error('Failed to delete availability');
    }
  };

  const handleCreateBlockedDate = (date) => {
    setEditingBlock({
      date: date.toISOString().split('T')[0],
      allDay: true,
      reason: 'Unavailable',
      isRecurring: false
    });
    setShowBlockForm(true);
  };

  const handleDeleteBlock = async (id) => {
    try {
      await availabilityAPI.deleteBlockedDate(id);
      toast.success('Date unblocked successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting blocked date:', error);
      toast.error('Failed to unblock date');
    }
  };

  const onSubmitBlock = async (data) => {
    try {
      const blockData = {
        ...data,
        date: data.isRecurring ? null : data.date,
        allDay: data.allDay === 'true' || data.allDay === true,
        isRecurring: data.isRecurring === 'true' || data.isRecurring === true
      };

      if (editingBlock._id) {
        await availabilityAPI.updateBlockedDate(editingBlock._id, blockData);
        toast.success('Blocked date updated successfully!');
      } else {
        await availabilityAPI.createBlockedDate(blockData);
        toast.success('Date blocked successfully!');
      }
      reset();
      setEditingBlock(null);
      setShowBlockForm(false);
      fetchData();
    } catch (error) {
      console.error('Error saving blocked date:', error);
      toast.error('Failed to save blocked date');
    }
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    
    // Generate 6 weeks of days (42 days total)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Check if this date has availability set
      const dateString = date.toISOString().split('T')[0];
      const hasAvailability = availability.some(avail => 
        avail.date && new Date(avail.date).toISOString().split('T')[0] === dateString
      );
      
      // Check if this date is blocked
      const isBlocked = blockedDates.some(block => 
        !block.isRecurring && new Date(block.date).toISOString().split('T')[0] === dateString
      );
      
      // Check if this date has recurring availability
      const hasRecurringAvailability = availability.some(avail => 
        avail.isRecurring && avail.dayOfWeek === date.getDay()
      );
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        isPast,
        hasAvailability,
        isBlocked,
        hasRecurringAvailability
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

  const AvailabilityModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {editingAvailability ? 'Edit Availability' : 'Set Availability'}
          </h3>
          <button
            onClick={() => {
              setShowAvailabilityModal(false);
              setEditingAvailability(null);
              reset();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmitAvailability)} className="space-y-4">
          {/* Availability Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Availability Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="specific"
                  {...register('availabilityType')}
                  className="mr-2"
                />
                Specific Date
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="recurring"
                  {...register('availabilityType')}
                  className="mr-2"
                />
                Recurring Weekly
              </label>
            </div>
          </div>

          {/* Date Selection for Specific */}
          {watchAvailabilityType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                {...register('date', { required: watchAvailabilityType === 'specific' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>
          )}

          {/* Day of Week Selection for Recurring */}
          {watchAvailabilityType === 'recurring' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of Week
              </label>
              <select
                {...register('recurringDayOfWeek', { required: watchAvailabilityType === 'recurring' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a day</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
              {errors.recurringDayOfWeek && (
                <p className="text-red-500 text-sm mt-1">{errors.recurringDayOfWeek.message}</p>
              )}
            </div>
          )}

          {/* All Day Toggle */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('allDay')}
                className="mr-2"
              />
              All Day (9:00 AM - 5:00 PM)
            </label>
          </div>

          {/* Time Range - Only show if not all day */}
          {!watchAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  {...register('startTime', { required: !watchAllDay })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.startTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  {...register('endTime', { required: !watchAllDay })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.endTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAvailabilityModal(false);
                setEditingAvailability(null);
                reset();
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Save size={16} className="mr-2" />
              {editingAvailability ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const BlockForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {editingBlock?._id ? 'Edit Blocked Date' : 'Block Date'}
          </h2>
          <button
            onClick={() => {
              setShowBlockForm(false);
              setEditingBlock(null);
              reset();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmitBlock)} className="space-y-4">
          <div>
            <label className="form-label">Type</label>
            <select
              {...register('isRecurring')}
              className="form-input"
            >
              <option value="false">Specific Date</option>
              <option value="true">Recurring (Weekly)</option>
            </select>
          </div>

          {!watchIsRecurring && (
            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                {...register('date', { required: !watchIsRecurring ? 'Date is required' : false })}
                className="form-input"
                defaultValue={editingBlock?.date}
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>
          )}

          {watchIsRecurring && (
            <div>
              <label className="form-label">Day of Week</label>
              <select
                {...register('recurringDayOfWeek', { required: watchIsRecurring ? 'Day is required' : false })}
                className="form-input"
              >
                <option value="">Select Day</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
              {errors.recurringDayOfWeek && (
                <p className="text-red-500 text-sm mt-1">{errors.recurringDayOfWeek.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="form-label">Duration</label>
            <select
              {...register('allDay')}
              className="form-input"
            >
              <option value="true">All Day</option>
              <option value="false">Specific Time</option>
            </select>
          </div>

          {!watchAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  {...register('startTime', { required: !watchAllDay ? 'Start time is required' : false })}
                  className="form-input"
                />
                {errors.startTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  {...register('endTime', { required: !watchAllDay ? 'End time is required' : false })}
                  className="form-input"
                />
                {errors.endTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Reason</label>
            <input
              type="text"
              {...register('reason', { required: 'Reason is required' })}
              className="form-input"
              placeholder="e.g., Vacation, Holiday, Personal"
              defaultValue={editingBlock?.reason}
            />
            {errors.reason && (
              <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowBlockForm(false);
                setEditingBlock(null);
                reset();
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingBlock?._id ? 'Update' : 'Block'} Date
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
            <h1 className="text-3xl font-bold text-gray-900">Interactive Calendar</h1>
            <p className="text-gray-600 mt-2">Click days to set availability or block dates</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBlockForm(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Block
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6">
          <div className="flex bg-gray-200 rounded-lg p-1 max-w-md mx-auto">
            <button
              onClick={() => setViewMode('availability')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'availability'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Set Availability
            </button>
            <button
              onClick={() => setViewMode('blocked')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'blocked'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Block Dates
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading calendar data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Interactive Calendar */}
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
                      <div
                        key={index}
                        onClick={() => handleDateClick(day.date)}
                        className={`
                          p-2 text-center cursor-pointer border border-gray-200 min-h-[60px] flex flex-col justify-center
                          ${day.isCurrentMonth 
                            ? 'bg-white hover:bg-gray-50' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }
                          ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                          ${day.isPast && day.isCurrentMonth ? 'text-gray-400' : ''}
                          ${day.hasAvailability ? 'bg-green-100 border-green-300' : ''}
                          ${day.hasRecurringAvailability ? 'bg-blue-100 border-blue-300' : ''}
                          ${day.isBlocked ? 'bg-red-100 border-red-300' : ''}
                          ${viewMode === 'availability' && day.isCurrentMonth && !day.isPast ? 'hover:bg-blue-50' : ''}
                          ${viewMode === 'blocked' && day.isCurrentMonth && !day.isPast ? 'hover:bg-red-50' : ''}
                        `}
                      >
                        <div className="text-sm font-medium">
                          {day.date.getDate()}
                        </div>
                        {day.hasAvailability && (
                          <div className="text-xs text-green-600 mt-1">Available</div>
                        )}
                        {day.hasRecurringAvailability && !day.hasAvailability && (
                          <div className="text-xs text-blue-600 mt-1">Recurring</div>
                        )}
                        {day.isBlocked && (
                          <div className="text-xs text-red-600 mt-1">Blocked</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                      <span>Blocked</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
                      <span>Not Set</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Panel */}
            <div className="lg:col-span-1">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-xl font-semibold">
                    {viewMode === 'availability' ? 'Availability Settings' : 'Blocked Dates'}
                  </h2>
                  <p className="text-gray-600">
                    {viewMode === 'availability' 
                      ? 'Dates with custom availability' 
                      : 'Dates when you\'re unavailable'
                    }
                  </p>
                </div>
                
                <div className="space-y-4">
                  {viewMode === 'availability' ? (
                    availability.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No availability set</p>
                        <p className="text-sm text-gray-400 mt-2">Click on days in the calendar to set availability</p>
                      </div>
                    ) : (
                      availability.map((avail) => (
                        <div key={avail._id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <h3 className="font-semibold text-green-900">
                              {avail.isRecurring 
                                ? `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][avail.dayOfWeek]}`
                                : formatDate(new Date(avail.date))
                              }
                            </h3>
                            <p className="text-sm text-green-700">
                              {avail.allDay ? 'All Day' : `${avail.startTime} - ${avail.endTime}`}
                            </p>
                            {avail.notes && (
                              <p className="text-xs text-green-600 mt-1">{avail.notes}</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingAvailability(avail);
                                setValue('date', avail.date ? new Date(avail.date).toISOString().split('T')[0] : '');
                                setValue('availabilityType', avail.isRecurring ? 'recurring' : 'specific');
                                setValue('recurringDayOfWeek', avail.dayOfWeek || '');
                                setValue('startTime', avail.startTime || '09:00');
                                setValue('endTime', avail.endTime || '17:00');
                                setValue('allDay', avail.allDay ? 'true' : 'false');
                                setValue('notes', avail.notes || '');
                                setShowAvailabilityModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAvailability(avail._id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    blockedDates.length === 0 ? (
                      <div className="text-center py-8">
                        <X className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No blocked dates</p>
                        <p className="text-sm text-gray-400 mt-2">Click on days in the calendar to block them</p>
                      </div>
                    ) : (
                      blockedDates.map((block) => (
                        <div key={block._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <h3 className="font-semibold text-red-900">{block.reason}</h3>
                            <p className="text-sm text-red-700">
                              {block.isRecurring 
                                ? `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][block.recurringDayOfWeek]}`
                                : new Date(block.date).toLocaleDateString()
                              }
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteBlock(block._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showAvailabilityModal && <AvailabilityModal />}
        {showBlockForm && <BlockForm />}
      </div>
    </div>
  );
};

export default AdminAvailability; 