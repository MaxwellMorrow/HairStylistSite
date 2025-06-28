import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ApiTest from '../components/ApiTest';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsAPI, servicesAPI } from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchNotificationStatus();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        appointmentsAPI.getAll(),
        servicesAPI.getServices()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationStatus = async () => {
    try {
      const response = await fetch('/api/admin/notification-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const status = await response.json();
        setNotificationStatus(status);
      }
    } catch (error) {
      console.error('Error fetching notification status:', error);
    }
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="section-title">Admin Dashboard</h1>
          <p className="section-subtitle">
            Manage appointments, services, and gallery content
          </p>
        </div>
        
        {/* API Test Section */}
        <div className="mb-12">
          <ApiTest />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Placeholder admin cards */}
          <div className="card">
            <div className="text-center py-8">
              <div className="text-4xl text-gray-300 mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Dashboard Stats
              </h3>
              <p className="text-gray-600">
                View appointment statistics and business metrics
              </p>
            </div>
          </div>
          
          <Link to="/admin/appointments" className="card hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <div className="text-center py-8">
              <div className="text-4xl text-gray-300 mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Manage Appointments
              </h3>
              <p className="text-gray-600">
                View, edit, and manage client appointments
              </p>
            </div>
          </Link>
          
          <Link to="/admin/services" className="card hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <div className="text-center py-8">
              <div className="text-4xl text-gray-300 mb-4">✂️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Manage Services
              </h3>
              <p className="text-gray-600">
                Add, edit, and manage service offerings
              </p>
            </div>
          </Link>
          
          <Link to="/admin/gallery" className="card hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <div className="text-center py-8">
              <div className="text-4xl text-gray-300 mb-4">🖼️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Manage Gallery
              </h3>
              <p className="text-gray-600">
                Upload and manage client photos
              </p>
            </div>
          </Link>
          
          <Link to="/admin/availability" className="card hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <div className="text-center py-8">
              <div className="text-4xl text-gray-300 mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Manage Availability
              </h3>
              <p className="text-gray-600">
                Set working hours and block unavailable dates
              </p>
            </div>
          </Link>
          
          <div className="card">
            <div className="text-center py-8">
              <div className="text-4xl text-gray-300 mb-4">⚙️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Settings
              </h3>
              <p className="text-gray-600">
                Configure business hours and preferences
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <p className="text-gray-600">
            Full admin functionality will be implemented with real data and controls.
          </p>
        </div>

        {/* Notification Management */}
        <div className="mt-12">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Notification System Status</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Configured for appointment confirmations and reminders</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-600">Optional - requires Twilio configuration</p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  Optional
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Automated Reminders</h4>
                  <p className="text-sm text-gray-600">24h and 2h before appointments</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Setup Instructions</h5>
                <p className="text-sm text-blue-800 mb-2">
                  To enable SMS notifications, add these environment variables:
                </p>
                <code className="text-xs bg-blue-100 p-2 rounded block">
                  TWILIO_ACCOUNT_SID=your_account_sid<br/>
                  TWILIO_AUTH_TOKEN=your_auth_token<br/>
                  TWILIO_PHONE_NUMBER=your_twilio_phone_number
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 