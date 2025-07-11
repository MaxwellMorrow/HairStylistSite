import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://mariahshairsite-dedugvcfbrafh7eu.westus2-01.azurewebsites.net/api' : 'http://localhost:5000/api'),
  withCredentials: true,
});

// Log the configured base URL for debugging
console.log('[API CONFIG] Base URL:', api.defaults.baseURL);
console.log('[API CONFIG] NODE_ENV:', process.env.NODE_ENV);
console.log('[API CONFIG] REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

// Request interceptor to add auth headers if needed
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging for production
    console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      data: config.data,
      params: config.params,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('[API REQUEST ERROR]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error(`[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.log('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
};

// Services API
export const servicesAPI = {
  getAll: (params) => api.get('/services', { params }),
  getServices: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  getByCategory: (category) => api.get(`/services/category/${category}`),
  create: (serviceData) => {
    // Check if serviceData is FormData (for file uploads)
    if (serviceData instanceof FormData) {
      return api.post('/services', serviceData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.post('/services', serviceData);
  },
  update: (id, serviceData) => {
    // Check if serviceData is FormData (for file uploads)
    if (serviceData instanceof FormData) {
      return api.put(`/services/${id}`, serviceData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.put(`/services/${id}`, serviceData);
  },
  delete: (id) => api.delete(`/services/${id}`),
};

// Appointments API
export const appointmentsAPI = {
  createAppointment: (formData) => api.post('/appointments/book', formData),
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  update: (id, appointmentData) => api.put(`/appointments/${id}`, appointmentData),
  delete: (id) => api.delete(`/appointments/${id}`),
  getUserAppointments: () => api.get('/appointments/user'),
  block: (blockData) => api.post('/appointments/block', blockData),
  updatePhotos: (id, formData) => api.put(`/appointments/${id}/photos`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deletePhoto: (id, photoIndex) => api.delete(`/appointments/${id}/photos/${photoIndex}`),
};

// Gallery API
export const galleryAPI = {
  getAll: (params) => api.get('/gallery', { params }),
  getById: (id) => api.get(`/gallery/${id}`),
  getCategories: () => api.get('/gallery/categories/list'),
  upload: (formData) => api.post('/gallery/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: (id, galleryData) => api.put(`/gallery/${id}`, galleryData),
  delete: (id) => api.delete(`/gallery/${id}`),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  blockDay: (blockData) => api.post('/admin/block-day', blockData),
  createSlots: (slotData) => api.post('/admin/create-slots', slotData),
  getBlockedDays: (params) => api.get('/admin/blocked-days', { params }),
  unblockDay: (date) => api.delete(`/admin/unblock-day/${date}`),
};

// Availability API
export const availabilityAPI = {
  getAvailability: () => api.get('/availability'),
  createAvailability: (availabilityData) => api.post('/availability/create', availabilityData),
  updateAvailability: (id, availabilityData) => api.put(`/availability/${id}`, availabilityData),
  deleteAvailability: (id) => api.delete(`/availability/${id}`),
  setAvailability: (availabilityData) => api.post('/availability/set', availabilityData),
  deactivateAvailability: (dayOfWeek) => api.delete(`/availability/deactivate/${dayOfWeek}`),
  getAvailableSlots: (params) => api.get('/availability/slots', { params }),
  getAvailableDates: (params) => api.get(`/availability/dates/${params.year}/${params.month}`),
  getBlockedDates: () => api.get('/availability/blocked'),
  createBlockedDate: (blockData) => api.post('/availability/blocked', blockData),
  updateBlockedDate: (id, blockData) => api.put(`/availability/blocked/${id}`, blockData),
  deleteBlockedDate: (id) => api.delete(`/availability/blocked/${id}`),
  getCalendarData: (params) => api.get('/availability/calendar', { params }),
};

export default api; 