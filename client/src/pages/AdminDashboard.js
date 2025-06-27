import React from 'react';
import { Link } from 'react-router-dom';
import ApiTest from '../components/ApiTest';

const AdminDashboard = () => {
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
          
          <div className="card">
            <div className="text-center py-8">
              <div className="text-4xl text-gray-300 mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Manage Appointments
              </h3>
              <p className="text-gray-600">
                View, edit, and manage client appointments
              </p>
            </div>
          </div>
          
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
              <div className="text-4xl text-gray-300 mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Manage Appointments
              </h3>
              <p className="text-gray-600">
                View and manage client bookings
              </p>
            </div>
          </div>
          
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
      </div>
    </div>
  );
};

export default AdminDashboard; 