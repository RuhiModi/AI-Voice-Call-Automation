// src/hooks/api.js
// Single axios instance for the whole app.
// VITE_API_URL is set in Vercel → Environment Variables
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,  // 30s — Render free tier can be slow to wake up
})

// Auto-attach JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-retry on timeout + friendly errors
api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config

    // Auto-logout on 401
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // Retry once on timeout or 5xx errors
    const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout')
    const isServer  = err.response?.status >= 500
    if ((isTimeout || isServer) && !config._retried) {
      config._retried = true
      await new Promise(r => setTimeout(r, 2000))  // Wait 2s then retry
      return api(config)
    }

    // Friendly error message
    if (isTimeout) {
      err.userMessage = 'Server is taking too long. Please try again.'
    } else if (isServer) {
      err.userMessage = err.response?.data?.error || 'Server error. Please try again.'
    } else {
      err.userMessage = err.response?.data?.error || 'Something went wrong.'
    }

    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  signup: (email, password, company_name) =>
    api.post('/auth/signup', { email, password, company_name }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

// ── Campaigns ─────────────────────────────────────────────────
export const campaignApi = {
  list:   ()         => api.get('/campaigns'),
  get:    (id)       => api.get(`/campaigns/${id}`),
  create: (data)     => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  launch: (id)       => api.post(`/campaigns/${id}/launch`),
  pause:  (id)       => api.post(`/campaigns/${id}/pause`),
  calls:  (id, limit=50) => api.get(`/campaigns/${id}/calls?limit=${limit}`),

  uploadContacts: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/campaigns/${id}/contacts`, form)
  },
  extractFromPDF: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/campaigns/${id}/script/pdf`, form)
  },
  extractFromURL: (id, url) =>
    api.post(`/campaigns/${id}/script/url`, { url }),
}

// ── Password ──────────────────────────────────────────────────
export const passwordApi = {
  forgot: (email) =>
    api.post('/auth/forgot-password', { email }),
  reset: (token, password) =>
    api.post('/auth/reset-password', { token, password }),
  change: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
}
