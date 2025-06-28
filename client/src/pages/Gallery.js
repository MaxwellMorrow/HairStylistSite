import React, { useState, useEffect } from 'react';
import { galleryAPI } from '../services/api';
import toast from 'react-hot-toast';

const Gallery = () => {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedCategory) {
          params.category = selectedCategory;
        }
        const response = await galleryAPI.getAll(params);
        setGallery(response.data.gallery || []);
      } catch (error) {
        console.error('Error fetching gallery:', error);
        toast.error('Failed to load gallery images');
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
    fetchCategories();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await galleryAPI.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const ImageModal = ({ image, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{image.title}</h2>
              <p className="text-gray-600 capitalize">{image.category}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="mb-4">
            <img
              src={image.imageUrl}
              alt={image.title}
              className="w-full h-auto rounded-lg"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Found';
              }}
            />
          </div>
          
          {image.description && (
            <p className="text-gray-700 mb-4">{image.description}</p>
          )}
          
          {image.tags && image.tags.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {image.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            <p>Client: {image.clientName}</p>
            <p>Type: {image.beforeAfter}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const GalleryItem = ({ image }) => (
    <div 
      className="group relative aspect-square bg-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => handleImageClick(image)}
    >
      <img
        src={image.imageUrl}
        alt={image.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        onError={(e) => {
          e.target.src = 'https://via.placeholder.com/400x400?text=Image+Not+Found';
        }}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-end">
        <div className="p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="font-semibold text-lg">{image.title}</h3>
          <p className="text-sm capitalize">{image.category}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="section-title">Our Gallery</h1>
          <p className="section-subtitle">
            See the amazing transformations we've created for our clients
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
              All
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
        
        {/* Gallery Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading gallery...</p>
          </div>
        ) : gallery.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl text-gray-300 mb-4">🖼️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Images Found
            </h3>
            <p className="text-gray-600">
              {selectedCategory 
                ? `No images found in the "${selectedCategory}" category.`
                : 'No gallery images available yet.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gallery.map((image) => (
              <GalleryItem key={image._id} image={image} />
            ))}
          </div>
        )}
        
        {/* Image Count */}
        {gallery.length > 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-600">
              Showing {gallery.length} image{gallery.length !== 1 ? 's' : ''}
              {selectedCategory && ` in ${selectedCategory}`}
            </p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal image={selectedImage} onClose={closeModal} />
      )}
    </div>
  );
};

export default Gallery; 