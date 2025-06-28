import React, { useState, useEffect } from 'react';
import { servicesAPI } from '../services/api';
import toast from 'react-hot-toast';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [selectedCategory, fetchServices]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      const response = await servicesAPI.getAll(params);
      setServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await servicesAPI.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleBookNow = (service) => {
    // Navigate to booking page with service pre-selected
    // You can implement this based on your routing setup
    toast.success(`Redirecting to book ${service.name}...`);
    // For now, just show a success message
  };

  const ServiceCard = ({ service }) => (
    <div className="card group hover:shadow-lg transition-all duration-300">
      {/* Service Image */}
      <div className="h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x300?text=Service+Image';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
      </div>

      {/* Service Content */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
            {service.name}
          </h3>
          <span className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full capitalize">
            {service.category}
          </span>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-3">
          {service.description || 'No description available.'}
        </p>

        {/* Service Details */}
        <div className="space-y-2 mb-4">
          {service.duration && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {service.duration} minutes
            </div>
          )}
          
          {service.difficulty && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {service.difficulty} difficulty
            </div>
          )}
        </div>

        {/* Price and Booking */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-2xl font-bold text-primary-600">
              ${service.price}
            </span>
            {service.originalPrice && service.originalPrice > service.price && (
              <span className="text-sm text-gray-500 line-through ml-2">
                ${service.originalPrice}
              </span>
            )}
          </div>
          <button 
            onClick={() => handleBookNow(service)}
            className="btn-primary"
            disabled={!service.isActive}
          >
            {service.isActive ? 'Book Now' : 'Unavailable'}
          </button>
        </div>

        {/* Status Badge */}
        {!service.isActive && (
          <div className="mt-2">
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="section-title">Our Services</h1>
          <p className="section-subtitle">
            Discover our range of professional hairstyling services
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full transition-colors duration-200 ${
                selectedCategory === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Services
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full transition-colors duration-200 capitalize ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Services Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl text-gray-300 mb-4">💇‍♀️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Services Found
            </h3>
            <p className="text-gray-600">
              {selectedCategory 
                ? `No services found in the "${selectedCategory}" category.`
                : 'No services available at the moment.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        )}
        
        {/* Service Count */}
        {services.length > 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-600">
              Showing {services.length} service{services.length !== 1 ? 's' : ''}
              {selectedCategory && ` in ${selectedCategory}`}
            </p>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Look?
            </h2>
            <p className="text-gray-600 mb-6">
              Book an appointment today and let our expert stylists create the perfect look for you.
            </p>
            <button 
              onClick={() => window.location.href = '/booking'}
              className="btn-primary text-lg px-8 py-3"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services; 