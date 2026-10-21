import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tc_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tc_token')
      localStorage.removeItem('tc_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data)
}

// ─── Trains ───────────────────────────────────────────
export const trainApi = {
  search: (params) => api.get('/trains/search', { params }),
  getById: (id) => api.get(`/trains/${id}`),
  getAlternatives: (id) => api.get(`/trains/${id}/alternatives`),
  getAll: () => api.get('/trains')               // admin only
}

// ─── Bookings ─────────────────────────────────────────
export const bookingApi = {
  create: (data) => api.post('/bookings', data),
  getAll: () => api.get('/bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
  rebook: (data) => api.post('/bookings/rebook', data)
}

// ─── Hotels ───────────────────────────────────────────
export const hotelApi = {
  search: (city) => api.get('/hotels/search', { params: { city } }),
  reserve: (data) => api.post('/hotels', data),
  getAll: () => api.get('/hotels'),
  getByBooking: (bookingId) => api.get(`/hotels/booking/${bookingId}`),
  cancel: (id) => api.delete(`/hotels/${id}`)
}

// ─── Cabs ─────────────────────────────────────────────
export const cabApi = {
  search: (city) => api.get('/cabs/search', { params: { city } }),
  reserve: (data) => api.post('/cabs', data),
  getAll: () => api.get('/cabs'),
  getByBooking: (bookingId) => api.get(`/cabs/booking/${bookingId}`),
  cancel: (id) => api.delete(`/cabs/${id}`),
  advanceRideStatus: (id) => api.patch(`/cabs/${id}/ride-status`)
}

// ─── Seat Alerts ──────────────────────────────────────
export const alertApi = {
  create: (data) => api.post('/seat-alerts', data),
  getAll: () => api.get('/seat-alerts'),
  cancel: (id) => api.delete(`/seat-alerts/${id}`)
}

// ─── Notifications ────────────────────────────────────
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
  markRead: (id) => api.patch(`/notifications/${id}/read`)
}

// ─── Admin ────────────────────────────────────────────
export const adminApi = {
  addTrain: (data) => api.post('/admin/trains', data),
  updateTrain: (id, data) => api.put(`/admin/trains/${id}`, data),
  deleteTrain: (id) => api.delete(`/admin/trains/${id}`),
  simulateDisruption: (data) => api.post('/admin/disruptions', data),
  resetDisruption: (trainId) => api.post(`/admin/disruptions/${trainId}/reset`),
  getStats: () => api.get('/admin/stats'),
  getAllBookings: () => api.get('/admin/bookings')
}

export default api
