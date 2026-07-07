import api from './api';
import { makeApiRequest } from '../utils/apiUtils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const userService = {
  getUsers: (params) => makeApiRequest(() => api.get('/api/users', { params })),
  getUser: (id) => makeApiRequest(() => api.get(`/api/users/${id}`)),
  updateUser: (id, data) => makeApiRequest(() => api.put(`/api/users/${id}`, data)),
  deleteUser: (id) => makeApiRequest(() => api.delete(`/api/users/${id}`)),
  approveDriver: (id) => makeApiRequest(() => api.put(`/api/users/${id}/approve`)),
  rejectDriver: (id, reason) => makeApiRequest(() => api.put(`/api/users/${id}/reject`, { reason })),
  getPendingDrivers: () => makeApiRequest(() => api.get('/api/users/pending-drivers')),
  getUserStats: () => makeApiRequest(() => api.get('/api/users/stats')),
  createUser: (data) => makeApiRequest(() => api.post('/api/users', data, data instanceof FormData ? {
    headers: { 'Content-Type': 'multipart/form-data' }
  } : {})),
  getDriverLicense: (id) => makeApiRequest(() => api.get(`/api/users/${id}/license`, { responseType: 'blob' })),
  getDriverLicenseUrl: (id) => `${API_BASE}/api/users/${id}/license`,
  markFeeDefaulters: () => makeApiRequest(() => api.put('/api/users/action/mark-defaulters')),
  reviewFeeReceipt: (id, data) => makeApiRequest(() => api.put(`/api/users/${id}/review-fee-receipt`, data)),
  getFeeReceiptUrl: (id) => `${API_BASE}/api/users/${id}/fee-receipt`,
};