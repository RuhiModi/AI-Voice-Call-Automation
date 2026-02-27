// src/hooks/api.js
// Single axios instance for the whole app.
// VITE_API_URL is set in Vercel → Environment Variables
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 15000,
})

// Auto-attach JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
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

// Add forgot password
export const passwordApi = {
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
}

// ── Billing ───────────────────────────────────────────────────
export const billingApi = {
  summary:  (month) => api.get('/billing/summary' + (month ? `?month=${month}` : '')),
  monthly:  ()      => api.get('/billing/monthly'),
  activity: ()      => api.get('/billing/activity'),
  invoices: ()      => api.get('/billing/invoices'),
  invoice:  (id)    => api.get(`/billing/invoices/${id}`),
}

// ── Simulator ─────────────────────────────────────────────────
export const simulateApi = {
  start:      (campaign_id, custom_script, custom_persona, language, contact_name) =>
                api.post('/simulate/start', { campaign_id, custom_script, custom_persona, language, contact_name }),
  message:    (session_id, message)  => api.post('/simulate/message', { session_id, message }),
  end:        (session_id, outcome)  => api.post('/simulate/end', { session_id, outcome }),
  extractUrl: (url)                  => api.post('/simulate/extract-url', { url }),
  extractPdf: (formData)             => api.post('/simulate/extract-pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}
