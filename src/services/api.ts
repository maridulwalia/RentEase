import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("auth-storage");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const token = parsed.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error("Failed to parse auth-storage:", err);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token or clear auth and redirect
      try {
        // For now, we'll clear auth and redirect to login
        // In a production app, you'd implement token refresh here
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      } catch (refreshError) {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    
    // Handle 400 Bad Request errors with better logging
    if (error.response?.status === 400) {
      console.error('400 Bad Request Error:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data,
        requestData: error.config?.data
      });
      
      // Log validation errors for debugging
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (formData: FormData) => api.post('/auth/register', formData),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (formData: FormData) => api.put('/auth/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/auth/change-password', data),
  addToWallet: (data: { amount: number }) => api.post('/auth/add-to-wallet', data),
};

export const itemsAPI = {
  getItems: (params?: any) => api.get('/items', { params }),
  getItemById: (id: string) => api.get(`/items/${id}`),
  createItem: (formData: FormData) => api.post('/items', formData , {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateItem: (id: string, formData: FormData) => api.put(`/items/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteItem: (id: string) => api.delete(`/items/${id}`),
  getUserItems: () => api.get('/items/user/my-items'),
  getCategories: () => api.get('/items/categories'),
  extendRental: (data: { bookingId: string; newEndDate: string }) => api.post('/items/extend-rental', data),
};

// Bookings API
export const bookingsAPI = {
  createBooking: (data: any) => api.post('/bookings', data),
  getUserBookings: (params?: any) => api.get('/bookings', { params }),
  getBookingById: (id: string) => api.get(`/bookings/${id}`),
  updateBookingStatus: (id: string, data: any) => api.put(`/bookings/${id}/status`, data),
  addBookingMessage: (id: string, data: { message: string }) => 
    api.post(`/bookings/${id}/messages`, data),
};

// Reviews API
export const reviewsAPI = {
  createReview: (data: any) => api.post('/reviews', data),
  getItemReviews: (itemId: string, params?: any) => 
    api.get(`/reviews/item/${itemId}`, { params }),
  getUserReviews: (userId: string, params?: any) => 
    api.get(`/reviews/user/${userId}`, { params }),
  getMyReviews: (params?: any) => api.get('/reviews/my-reviews', { params }),
  reportReview: (id: string, data: { reason: string }) => 
    api.post(`/reviews/${id}/report`, data),
};

// Complaints API
export const complaintsAPI = {
  createComplaint: (formData: FormData) => api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getUserComplaints: (params?: any) => api.get('/complaints', { params }),
  getComplaintById: (id: string) => api.get(`/complaints/${id}`),
  addComplaintMessage: (id: string, data: { message: string }) => 
    api.post(`/complaints/${id}/messages`, data),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getAllUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserDetails: (id: string) => api.get(`/admin/users/${id}`),
  toggleUserSuspension: (id: string, data: { reason?: string }) => 
    api.put(`/admin/users/${id}/suspend`, data),
  toggleUserVerification: (id: string, data: { reason?: string }) => 
    api.put(`/admin/users/${id}/verify`, data),
  getAllComplaints: (params?: any) => api.get('/admin/complaints', { params }),
  updateComplaint: (id: string, data: any) => api.put(`/admin/complaints/${id}`, data),
  getReportedReviews: (params?: any) => api.get('/admin/reviews/reported', { params }),
  getAllReviews: (params?: any) => api.get('/admin/reviews', { params }),
  toggleReviewVisibility: (id: string) => api.put(`/admin/reviews/${id}/toggle-visibility`),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  getMaintenanceStatus: () => api.get('/admin/maintenance-status'),
};

export default api;
