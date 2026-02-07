import axios from 'axios';

// Fixed: Using your actual backend URL on Render
const BACKEND_URL = 'https://tsmarket0001.onrender.com';
const API = `${BACKEND_URL}/api`;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  processGoogleSession: (sessionId) => api.post('/auth/session', { session_id: sessionId }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Categories API
export const categoriesAPI = {
  getAll: (hierarchical = false) => api.get('/categories', { params: { hierarchical } }),
  getHierarchical: () => api.get('/categories', { params: { hierarchical: true } }),
  create: (data) => api.post('/categories', data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Reviews API
export const reviewsAPI = {
  getForProduct: (productId) => api.get(`/reviews/${productId}`),
  create: (data) => api.post('/reviews', data),
};

// Orders API
export const ordersAPI = {
  create: (items, deliveryAddress, phoneNumber, promoCode = null) => api.post('/orders', { 
    items, 
    delivery_address: deliveryAddress,
    phone_number: phoneNumber,
    promo_code: promoCode
  }),
  getAll: () => api.get('/orders'),
  track: (orderId) => api.get(`/orders/${orderId}/track`),
  return: (orderId) => api.post(`/orders/${orderId}/return-request`),
};

// Promo API
export const promoAPI = {
  validate: (code) => api.post('/promo/validate', null, { params: { code } }),
};

// Top-up API
export const topupAPI = {
  redeem: (code) => api.post('/topup/redeem', null, { params: { code } }),
  getHistory: () => api.get('/topup/history'),
  getSettings: () => api.get('/topup/settings'),
  createRequest: (data) => api.post('/topup/request', data),
  getRequests: () => api.get('/topup/requests'),
};

// Rewards API
export const rewardsAPI = {
  getAll: () => api.get('/rewards'),
  claim: (level) => api.post(`/rewards/claim/${level}`),
};

// Wheel API
export const wheelAPI = {
  getPrizes: () => api.get('/wheel/prizes'),
  spin: () => api.post('/wheel/spin'),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  updateRevenue: (revenue) => api.put('/admin/stats/revenue', null, { params: { revenue } }),
  resetRevenue: () => api.delete('/admin/stats/revenue'),
  getUsers: () => api.get('/admin/users'),
  toggleAdmin: (userId, isAdmin) => api.put(`/admin/users/${userId}/admin`, null, { params: { is_admin: isAdmin } }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  updateUserBalance: (userId, balance) => api.put(`/admin/users/${userId}/balance`, null, { params: { balance } }),
  updateUserXP: (userId, xp) => api.put(`/admin/users/${userId}/xp`, null, { params: { xp } }),
  getTopupCodes: () => api.get('/admin/topup-codes'),
  createTopupCode: (data) => api.post('/admin/topup-codes', data),
  deleteTopupCode: (id) => api.delete(`/admin/topup-codes/${id}`),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  updateProfile: (data) => api.put('/admin/profile', data),
  getTopupRequests: () => api.get('/admin/topup-requests'),
  approveTopupRequest: (id) => api.put(`/admin/topup-requests/${id}/approve`),
  rejectTopupRequest: (id, note) => api.put(`/admin/topup-requests/${id}/reject`, null, { params: { note } }),
  createReward: (data) => api.post('/admin/rewards', data),
  updateReward: (id, data) => api.put(`/admin/rewards/${id}`, data),
  deleteReward: (id) => api.delete(`/admin/rewards/${id}`),
  createWheelPrize: (data) => api.post('/admin/wheel-prizes', data),
  updateWheelPrize: (id, data) => api.put(`/admin/wheel-prizes/${id}`, data),
  deleteWheelPrize: (id) => api.delete(`/admin/wheel-prizes/${id}`),
  getOrders: () => api.get('/admin/orders'),
  getOrderDetails: (orderId) => api.get(`/admin/orders/${orderId}`),
  updateOrderStatus: (orderId, status, note, trackingNumber) => api.put(`/admin/orders/${orderId}/status`, { status, note, tracking_number: trackingNumber }),
  deleteOrder: (orderId) => api.delete(`/admin/orders/${orderId}`),
  approveReturn: (orderId) => api.post(`/admin/orders/${orderId}/approve-return`),
  // Promo codes
  getPromoCodes: () => api.get('/admin/promo-codes'),
  createPromoCode: (data) => api.post('/admin/promo-codes', data),
  deletePromoCode: (id) => api.delete(`/admin/promo-codes/${id}`),
  togglePromoCode: (id) => api.put(`/admin/promo-codes/${id}/toggle`),
  // Product discount
  updateProductDiscount: (productId, discountPercent) => api.put(`/admin/products/${productId}/discount`, null, { params: { discount_percent: discountPercent } }),
  // Tags
  getTags: () => api.get('/tags'),
  createTag: (data) => api.post('/admin/tags', data),
  deleteTag: (id) => api.delete(`/admin/tags/${id}`),
  updateProductTags: (productId, tags) => api.put(`/admin/products/${productId}/tags`, tags),
  // Missions
  getMissions: () => api.get('/admin/missions'),
  createMission: (data) => api.post('/admin/missions', data),
  updateMission: (id, data) => api.put(`/admin/missions/${id}`, data),
  deleteMission: (id) => api.delete(`/admin/missions/${id}`),
  toggleMission: (id) => api.put(`/admin/missions/${id}/toggle`),
  // Support
  getSupportTickets: () => api.get('/admin/support/tickets'),
  respondToTicket: (id, response, status) => api.put(`/admin/support/tickets/${id}`, null, { params: { response, status } }),
  // Bank cards
  getBankCards: () => api.get('/admin/bank-cards'),
  createBankCard: (data) => api.post('/admin/bank-cards', data),
  toggleBankCard: (id) => api.put(`/admin/bank-cards/${id}/toggle`),
  deleteBankCard: (id) => api.delete(`/admin/bank-cards/${id}`),
  // User roles
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, null, { params: { role } }),
  // Image upload
  uploadImage: (image) => api.post('/admin/upload-image', { image }),
};

// Delivery API
export const deliveryAPI = {
  getAvailableOrders: () => api.get('/delivery/orders'),
  takeOrder: (orderId) => api.post(`/delivery/orders/${orderId}/take`),
};

// Bank cards API (public)
export const bankCardsAPI = {
  getAll: () => api.get('/bank-cards'),
};

// Tags API
export const tagsAPI = {
  getAll: () => api.get('/tags'),
};

// Missions API
export const missionsAPI = {
  getAll: () => api.get('/missions'),
  claim: (id) => api.post(`/missions/${id}/claim`),
};

// Support API
export const supportAPI = {
  createTicket: (data) => api.post('/support/ticket', data),
  getUserTickets: () => api.get('/support/tickets'),
  getContacts: () => api.get('/support/contacts'),
};

// Seed API
export const seedAPI = {
  seed: () => api.post('/seed'),
};

export default api;
