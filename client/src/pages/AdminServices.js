import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { servicesAPI, galleryAPI } from '../services/api';

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [reorderList, setReorderList] = useState([]);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    getValues
  } = useForm();

  // Fetch services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getAll({ admin: true });
      setServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  // Fetch gallery images for modal
  const fetchGalleryImages = async () => {
    try {
      setGalleryLoading(true);
      const res = await galleryAPI.getAll({ isActive: true, limit: 100 });
      setGalleryImages(res.data.gallery || []);
    } catch (err) {
      toast.error('Failed to load gallery images');
    } finally {
      setGalleryLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setFormLoading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add all form fields to FormData
      Object.keys(data).forEach(key => {
        if (key === 'image' && data[key] instanceof File) {
          formData.append('image', data[key]);
        } else if (data[key] !== undefined && data[key] !== '') {
          formData.append(key, data[key]);
        }
      });
      
      // Handle gallery image URL - if we have a selected gallery image, add it as imageUrl
      if (selectedGalleryImage) {
        formData.set('imageUrl', selectedGalleryImage);
      }
      
      // Convert isActive string to boolean
      formData.set('isActive', data.isActive === 'true' || data.isActive === true);
      
      if (editingService) {
        // Update existing service
        await servicesAPI.update(editingService._id, formData);
        toast.success('Service updated successfully!');
      } else {
        // Create new service
        await servicesAPI.create(formData);
        toast.success('Service created successfully!');
      }
      
      // Reset form and refresh services
      reset();
      setEditingService(null);
      setSelectedGalleryImage(null);
      setShowForm(false);
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save service';
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setValue('name', service.name);
    setValue('description', service.description);
    setValue('category', service.category);
    setValue('duration', service.duration);
    setValue('price', service.price);
    setValue('originalPrice', service.originalPrice || '');
    setValue('imageUrl', service.imageUrl || '');
    setValue('tags', service.tags?.join(', ') || '');
    setValue('requirements', service.requirements || '');
    setValue('aftercare', service.aftercare || '');
    setValue('difficulty', service.difficulty || 'medium');
    setValue('isActive', service.isActive.toString());
    setValue('order', service.order || '');
    
    // Set selected gallery image if service has an imageUrl
    if (service.imageUrl) {
      setSelectedGalleryImage(service.imageUrl);
    } else {
      setSelectedGalleryImage(null);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to permanently delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      await servicesAPI.delete(serviceId);
      toast.success('Service deleted successfully!');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  const handleDeactivate = async (service) => {
    const action = service.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this service?`)) {
      return;
    }

    try {
      await servicesAPI.update(service._id, { isActive: !service.isActive });
      toast.success(`Service ${action}d successfully!`);
      fetchServices();
    } catch (error) {
      console.error(`Error ${action}ing service:`, error);
      toast.error(`Failed to ${action} service`);
    }
  };

  const handleCancel = () => {
    reset();
    setEditingService(null);
    setSelectedGalleryImage(null);
    setShowForm(false);
  };

  const handleReorder = () => {
    setReorderList([...services]);
    setShowReorder(true);
  };

  const saveReorder = async () => {
    try {
      setLoading(true);
      
      // Update each service with its new order
      const updatePromises = reorderList.map((service, index) => 
        servicesAPI.update(service._id, { order: index })
      );
      
      await Promise.all(updatePromises);
      
      toast.success('Services order updated successfully!');
      setShowReorder(false);
      fetchServices(); // Refresh the services
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update services order');
    } finally {
      setLoading(false);
    }
  };

  const moveItem = (fromIndex, toIndex) => {
    const newList = [...reorderList];
    const [movedItem] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, movedItem);
    setReorderList(newList);
  };

  const ServiceForm = () => (
    <div className="card mb-8">
      <div className="card-header">
        <h3 className="text-lg font-semibold">
          {editingService ? 'Edit Service' : 'Add New Service'}
        </h3>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="form-label">Service Name *</label>
            <input
              type="text"
              {...register('name', { required: 'Service name is required' })}
              className="form-input"
              placeholder="e.g., Women's Haircut"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category *</label>
            <select
              {...register('category', { required: 'Category is required' })}
              className="form-input"
            >
              <option value="">Select Category</option>
              <option value="haircut">Haircut</option>
              <option value="coloring">Coloring</option>
              <option value="styling">Styling</option>
              <option value="treatment">Treatment</option>
              <option value="extensions">Extensions</option>
              <option value="other">Other</option>
            </select>
            {errors.category && (
              <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="form-label">Duration (minutes) *</label>
            <input
              type="number"
              {...register('duration', { 
                required: 'Duration is required',
                min: { value: 1, message: 'Duration must be at least 1 minute' }
              })}
              className="form-input"
              placeholder="60"
            />
            {errors.duration && (
              <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="form-label">Price ($) *</label>
            <input
              type="number"
              step="0.01"
              {...register('price', { 
                required: 'Price is required',
                min: { value: 0, message: 'Price must be positive' }
              })}
              className="form-input"
              placeholder="75.00"
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
            )}
          </div>

          {/* Original Price */}
          <div>
            <label className="form-label">Original Price ($)</label>
            <input
              type="number"
              step="0.01"
              {...register('originalPrice')}
              className="form-input"
              placeholder="90.00"
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave empty if no discount. Used to show "was $X, now $Y".
            </p>
          </div>

          {/* Order */}
          <div>
            <label className="form-label">Display Order</label>
            <input
              type="number"
              {...register('order')}
              className="form-input"
              placeholder="0"
              min="0"
            />
            <p className="text-sm text-gray-500 mt-1">
              Lower numbers appear first. Leave empty for auto-assignment.
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="form-label">Description *</label>
          <textarea
            {...register('description', { required: 'Description is required' })}
            className="form-input"
            rows="3"
            placeholder="Describe the service in detail..."
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Image Upload & Gallery Picker */}
        <div>
          <label className="form-label">Service Image</label>
          <div className="flex items-center gap-4 mb-2">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setGalleryModalOpen(true);
                fetchGalleryImages();
              }}
            >
              Choose from Gallery
            </button>
            <span className="text-gray-400 text-sm">or</span>
            <input
              type="file"
              accept="image/*"
              {...register('image')}
              className="form-input w-auto"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setValue('image', file);
                  setSelectedGalleryImage(null); // Clear gallery selection if uploading
                }
              }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Choose an image from the gallery or upload a new one (JPEG, PNG, WebP, max 10MB)
          </p>
          {/* Preview */}
          <div className="mt-2">
            {(selectedGalleryImage || (editingService && editingService.imageUrl && !getValues('image'))) && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Selected image:</p>
                <img
                  src={selectedGalleryImage || getValues('imageUrl') || (editingService && editingService.imageUrl)}
                  alt="Service preview"
                  className="w-32 h-24 object-cover rounded border"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/128x96?text=No+Image';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="form-label">Difficulty Level</label>
          <select
            {...register('difficulty')}
            className="form-input"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="form-label">Tags</label>
          <input
            type="text"
            {...register('tags')}
            className="form-input"
            placeholder="Enter tags separated by commas"
          />
          <p className="text-sm text-gray-500 mt-1">
            Separate tags with commas (e.g., "short hair, bob, layers")
          </p>
        </div>

        {/* Requirements */}
        <div>
          <label className="form-label">Requirements</label>
          <textarea
            {...register('requirements')}
            className="form-input"
            rows="2"
            placeholder="Any special requirements or preparation needed..."
          />
        </div>

        {/* Aftercare */}
        <div>
          <label className="form-label">Aftercare Instructions</label>
          <textarea
            {...register('aftercare')}
            className="form-input"
            rows="2"
            placeholder="Post-service care instructions..."
          />
        </div>

        {/* Active Status */}
        <div>
          <label className="form-label">Service Status</label>
          <select
            {...register('isActive')}
            className="form-input"
            defaultValue="true"
          >
            <option value="true">Active - Available for booking</option>
            <option value="false">Inactive - Not available for booking</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Active services will appear to clients for booking
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary"
            disabled={formLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={formLoading}
          >
            {formLoading ? 'Saving...' : (editingService ? 'Update Service' : 'Create Service')}
          </button>
        </div>

        {/* Gallery Picker Modal */}
        {galleryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Choose Gallery Image</h2>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => setGalleryModalOpen(false)}
                >
                  ×
                </button>
              </div>
              {galleryLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading images...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryImages.map((img) => (
                    <div
                      key={img._id}
                      className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${selectedGalleryImage === img.imageUrl ? 'border-primary-600' : 'border-transparent'}`}
                      onClick={() => {
                        setSelectedGalleryImage(img.imageUrl);
                        setValue('image', ''); // Clear file upload
                        setValue('imageUrl', img.imageUrl);
                        setGalleryModalOpen(false);
                      }}
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 text-xs text-gray-700 truncate">{img.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );

  const ServiceCard = ({ service }) => (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
          <p className="text-sm text-gray-500 capitalize">{service.category}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            Order: {service.order || 0}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            service.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {service.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>

      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-4 text-sm text-gray-500">
          <span>⏱️ {service.duration} min</span>
          <span>💰 ${service.price}</span>
        </div>
      </div>

      {service.tags && service.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {service.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <button
          onClick={() => handleEdit(service)}
          className="btn-secondary btn-sm"
        >
          Edit
        </button>
        <button
          onClick={() => handleDeactivate(service)}
          className={`btn-sm ${
            service.isActive 
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          } font-medium py-1 px-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2`}
        >
          {service.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={() => handleDelete(service._id)}
          className="btn-danger btn-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );

  const ReorderModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Reorder Services</h2>
            <button
              onClick={() => setShowReorder(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600">
              Use the arrow buttons to reorder services. 
              Services will be displayed in this order on the public services page.
            </p>
          </div>
          
          <div className="space-y-2 mb-6">
            {reorderList.map((service, index) => (
              <div
                key={service._id}
                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => moveItem(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, Math.min(reorderList.length - 1, index + 1))}
                    disabled={index === reorderList.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    ↓
                  </button>
                </div>
                
                <span className="text-sm font-medium text-gray-500 w-8">
                  {index + 1}
                </span>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{service.name}</h4>
                  <p className="text-sm text-gray-500 capitalize">{service.category}</p>
                </div>
                
                <div className="text-sm text-gray-500">
                  ${service.price} • {service.duration}min
                </div>
                
                <span className={`px-2 py-1 text-xs rounded-full ${
                  service.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {service.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowReorder(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={saveReorder}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Services Management</h1>
            <p className="text-gray-600 mt-2">Add, edit, and manage your service offerings</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleReorder}
              className="btn-secondary"
            >
              Reorder Services
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Add Service
            </button>
          </div>
        </div>

        {/* Service Form */}
        {showForm && <ServiceForm />}

        {/* Services List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl text-gray-300 mb-4">✂️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Services Found
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first service offering.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Add Your First Service
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        )}

        {/* Reorder Modal */}
        {showReorder && <ReorderModal />}
      </div>
    </div>
  );
};

export default AdminServices; 