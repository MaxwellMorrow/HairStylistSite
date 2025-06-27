import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Clock, Star, Users, ArrowRight, Phone, Mail, MapPin } from 'lucide-react';
import { servicesAPI, galleryAPI } from '../services/api';
import toast from 'react-hot-toast';

const Home = () => {
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      
      // Fetch featured services (first 3 active services)
      const servicesResponse = await servicesAPI.getAll({ limit: 3 });
      setServices(servicesResponse.data.services || []);
      
      // Fetch featured gallery images (first 6 active images)
      const galleryResponse = await galleryAPI.getAll({ limit: 6 });
      setGallery(galleryResponse.data.gallery || []);
      
    } catch (error) {
      console.error('Error fetching home data:', error);
      toast.error('Failed to load home page data');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Scissors className="h-8 w-8" />,
      title: 'Professional Services',
      description: 'Expert hairstyling services tailored to your unique style and preferences.'
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: 'Flexible Scheduling',
      description: 'Book appointments at your convenience with our easy online booking system.'
    },
    {
      icon: <Star className="h-8 w-8" />,
      title: 'Quality Results',
      description: 'Consistently excellent results that exceed expectations every time.'
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Client Satisfaction',
      description: 'Dedicated to providing exceptional service and building lasting relationships.'
    }
  ];

  const ServiceCard = ({ service }) => (
    <div className="card hover:shadow-lg transition-shadow duration-300">
      {/* Service Image */}
      <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-4 overflow-hidden flex items-center justify-center relative">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
            }}
          />
        ) : (
          <span className="text-gray-400 text-lg">No Image</span>
        )}
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {service.name}
      </h3>
      <p className="text-gray-600 mb-4 line-clamp-2">
        {service.description}
      </p>
      <div className="flex justify-between items-center">
        <span className="text-primary-600 font-semibold">
          ${service.price}
        </span>
        <Link
          to="/services"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Learn More →
        </Link>
      </div>
    </div>
  );

  const GalleryItem = ({ image }) => (
    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group flex items-center justify-center relative">
      {image.imageUrl ? (
        <img
          src={image.imageUrl}
          alt={image.title || 'Gallery image'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/400x400?text=No+Image';
          }}
        />
      ) : (
        <span className="text-gray-400 text-lg">No Image</span>
      )}
      {image.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 text-white p-2 text-sm truncate">
          {image.title}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-primary-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Professional
              <span className="text-primary-600"> Hair Styling</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your look with our expert hairstyling services. 
              Book your appointment today and experience the difference professional care makes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/booking"
                className="btn-primary text-lg px-8 py-3 inline-flex items-center"
              >
                Book Appointment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/gallery"
                className="btn-outline text-lg px-8 py-3"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Why Choose Us</h2>
            <p className="section-subtitle">
              Experience the difference that professional expertise and personalized care can make
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Our Services</h2>
            <p className="section-subtitle">
              Discover our range of professional hairstyling services
            </p>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl text-gray-300 mb-4">💇‍♀️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Services Available
              </h3>
              <p className="text-gray-600 mb-4">
                Check back soon for our service offerings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {services.map((service) => (
                <ServiceCard key={service._id} service={service} />
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link
              to="/services"
              className="btn-primary text-lg px-8 py-3"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Our Work</h2>
            <p className="section-subtitle">
              See the amazing transformations we've created for our clients
            </p>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading gallery...</p>
            </div>
          ) : gallery.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl text-gray-300 mb-4">🖼️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Gallery Images
              </h3>
              <p className="text-gray-600 mb-4">
                Check back soon to see our work.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {gallery.map((image) => (
                <GalleryItem key={image._id} image={image} />
              ))}
            </div>
          )}
          
          <div className="text-center">
            <Link
              to="/gallery"
              className="btn-outline text-lg px-8 py-3"
            >
              View Full Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Look?</h2>
            <p className="text-xl opacity-90">
              Book your appointment today and experience professional hairstyling at its best
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <Phone className="h-8 w-8 mx-auto mb-4 opacity-80" />
              <h3 className="text-lg font-semibold mb-2">Call Us</h3>
              <p className="opacity-80">(555) 123-4567</p>
            </div>
            <div className="text-center">
              <Mail className="h-8 w-8 mx-auto mb-4 opacity-80" />
              <h3 className="text-lg font-semibold mb-2">Email Us</h3>
              <p className="opacity-80">info@hairstylist.com</p>
            </div>
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-4 opacity-80" />
              <h3 className="text-lg font-semibold mb-2">Visit Us</h3>
              <p className="opacity-80">123 Main Street, City, State</p>
            </div>
          </div>
          <div className="text-center">
            <Link
              to="/booking"
              className="btn-outline-light text-lg px-8 py-3"
            >
              Book Your Appointment
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 