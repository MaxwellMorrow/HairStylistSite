import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { galleryAPI } from '../services/api';

const AdminGallery = () => {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingImage, setEditingImage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [reorderList, setReorderList] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { }
  } = useForm();

  // Fetch gallery on component mount
  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const response = await galleryAPI.getAll({ admin: true });
      setGallery(response.data.gallery || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
      toast.error('Failed to fetch gallery');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setFormLoading(true);
      
      // Convert isActive string to boolean
      const imageData = {
        ...data,
        isActive: data.isActive === 'true' || data.isActive === true
      };
      
      if (editingImage) {
        // Update existing image
        await galleryAPI.update(editingImage._id, imageData);
        toast.success('Gallery image updated successfully!');
      } else {
        // Create new image (this would typically be done via file upload)
        toast.error('Please use the upload feature to add new images');
        return;
      }
      
      // Reset form and refresh gallery
      reset();
      setEditingImage(null);
      setShowForm(false);
      fetchGallery();
    } catch (error) {
      console.error('Error saving gallery image:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save gallery image';
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      
      // Add optional fields if form is open
      const form = document.querySelector('form');
      if (form) {
        const formDataObj = new FormData(form);
        if (formDataObj.get('title')) formData.append('title', formDataObj.get('title'));
        if (formDataObj.get('description')) formData.append('description', formDataObj.get('description'));
        if (formDataObj.get('category')) formData.append('category', formDataObj.get('category'));
        if (formDataObj.get('tags')) formData.append('tags', formDataObj.get('tags'));
      }

      await galleryAPI.upload(formData);
      toast.success('Image uploaded successfully!');
      fetchGallery();
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error.response?.data?.error || 'Failed to upload image';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (image) => {
    setEditingImage(image);
    setValue('title', image.title || '');
    setValue('description', image.description || '');
    setValue('category', image.category || '');
    setValue('tags', image.tags?.join(', ') || '');
    setValue('isActive', image.isActive.toString());
    setValue('order', image.order || '');
    setShowForm(true);
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Are you sure you want to permanently delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      await galleryAPI.delete(imageId);
      toast.success('Image deleted successfully!');
      fetchGallery();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleDeactivate = async (image) => {
    const action = image.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this image?`)) {
      return;
    }

    try {
      await galleryAPI.update(image._id, { isActive: !image.isActive });
      toast.success(`Image ${action}d successfully!`);
      fetchGallery();
    } catch (error) {
      console.error(`Error ${action}ing image:`, error);
      toast.error(`Failed to ${action} image`);
    }
  };

  const handleCancel = () => {
    reset();
    setEditingImage(null);
    setShowForm(false);
  };

  const handleReorder = () => {
    setReorderList([...gallery]);
    setShowReorder(true);
  };

  const saveReorder = async () => {
    try {
      setLoading(true);
      
      // Update each image with its new order
      const updatePromises = reorderList.map((image, index) => 
        galleryAPI.update(image._id, { order: index })
      );
      
      await Promise.all(updatePromises);
      
      toast.success('Gallery order updated successfully!');
      setShowReorder(false);
      fetchGallery(); // Refresh the gallery
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update gallery order');
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

  const ImageForm = () => (
    <div className="card mb-8">
      <div className="card-header">
        <h3 className="text-lg font-semibold">
          {editingImage ? 'Edit Image Details' : 'Upload New Image'}
        </h3>
      </div>
      
      {!editingImage && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Upload New Image</h4>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploading && (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Uploading...
              </div>
            )}
          </div>
          <p className="text-sm text-blue-700 mt-2">
            Supported formats: JPG, PNG, GIF. Max size: 5MB
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div>
            <label className="form-label">Image Title</label>
            <input
              type="text"
              {...register('title')}
              className="form-input"
              placeholder="e.g., Beautiful Bob Cut"
            />
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category</label>
            <select
              {...register('category')}
              className="form-input"
            >
              <option value="">Select Category</option>
              <option value="haircut">Haircut</option>
              <option value="coloring">Coloring</option>
              <option value="styling">Styling</option>
              <option value="treatment">Treatment</option>
              <option value="extensions">Extensions</option>
              <option value="updo">Updo</option>
              <option value="general">General</option>
            </select>
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
          <label className="form-label">Description</label>
          <textarea
            {...register('description')}
            className="form-input"
            rows="3"
            placeholder="Describe the hairstyle, techniques used, or client story..."
          />
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
            Separate tags with commas (e.g., "bob, short hair, layers")
          </p>
        </div>

        {/* Active Status */}
        <div>
          <label className="form-label">Image Status</label>
          <select
            {...register('isActive')}
            className="form-input"
            defaultValue="true"
          >
            <option value="true">Active - Visible to clients</option>
            <option value="false">Inactive - Hidden from clients</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Active images will appear in the public gallery
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
            {formLoading ? 'Saving...' : (editingImage ? 'Update Image' : 'Save Details')}
          </button>
        </div>
      </form>
    </div>
  );

  const ImageCard = ({ image }) => (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{image.title || 'Untitled'}</h3>
          <p className="text-sm text-gray-500 capitalize">{image.category || 'Uncategorized'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            Order: {image.order || 0}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            image.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {image.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Image Preview */}
      <div className="mb-4">
        <img
          src={image.imageUrl}
          alt={image.title || 'Gallery image'}
          className="w-full h-48 object-cover rounded-lg"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
          }}
        />
      </div>

      {image.description && (
        <p className="text-gray-600 mb-4 line-clamp-2">{image.description}</p>
      )}

      {image.tags && image.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {image.tags.map((tag, index) => (
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
          onClick={() => handleEdit(image)}
          className="btn-secondary btn-sm"
        >
          Edit
        </button>
        <button
          onClick={() => handleDeactivate(image)}
          className={`btn-sm ${
            image.isActive 
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          } font-medium py-1 px-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2`}
        >
          {image.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={() => handleDelete(image._id)}
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
            <h2 className="text-2xl font-bold text-gray-900">Reorder Gallery Images</h2>
            <button
              onClick={() => setShowReorder(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600">
              Drag and drop images to reorder them, or use the arrow buttons. 
              Images will be displayed in this order on the public gallery.
            </p>
          </div>
          
          <div className="space-y-2 mb-6">
            {reorderList.map((image, index) => (
              <div
                key={image._id}
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
                
                <img
                  src={image.imageUrl}
                  alt={image.title}
                  className="w-12 h-12 object-cover rounded"
                />
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{image.title || 'Untitled'}</h4>
                  <p className="text-sm text-gray-500 capitalize">{image.category}</p>
                </div>
                
                <span className={`px-2 py-1 text-xs rounded-full ${
                  image.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {image.isActive ? 'Active' : 'Inactive'}
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
            <h1 className="text-3xl font-bold text-gray-900">Gallery Management</h1>
            <p className="text-gray-600 mt-2">Upload and manage gallery images</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleReorder}
              className="btn-secondary"
            >
              Reorder Images
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Upload Image
            </button>
          </div>
        </div>

        {/* Image Form */}
        {showForm && <ImageForm />}

        {/* Gallery List */}
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
            <p className="text-gray-600 mb-4">
              Get started by uploading your first gallery image.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Upload Your First Image
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map((image) => (
              <ImageCard key={image._id} image={image} />
            ))}
          </div>
        )}

        {/* Reorder Modal */}
        {showReorder && <ReorderModal />}
      </div>
    </div>
  );
};

export default AdminGallery; 