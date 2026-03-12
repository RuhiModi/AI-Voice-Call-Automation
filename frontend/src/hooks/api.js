// src/hooks/api.js
// Single axios instance for the whole app.
// VITE_API_URL is set in Vercel → Environment Variables
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
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

    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout')
    const isServer  = err.response?.status >= 500
    if ((isTimeout || isServer) && !config._retried) {
      config._retried = true
      await new Promise(r => setTimeout(r, 2000))
      return api(config)
    }

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
  delete: (id)       => api.delete(`/campaigns/${id}`),
  getStats:    (id)              => api.get(`/campaigns/${id}/stats`),
  getContacts: (id, page=1, limit=50) => api.get(`/campaigns/${id}/contacts`, { params: { page, limit } }),

  uploadContacts: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/campaigns/${id}/contacts`, form)
  },

  // Used AFTER campaign is created (has an ID)
  extractFromPDF: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/campaigns/${id}/script/pdf`, form, { timeout: 60000 })
  },
  extractFromURL: (id, url) =>
    api.post(`/campaigns/${id}/script/url`, { url }),

  // Used DURING campaign creation (no ID yet) — standalone extract endpoints
  // Generate full AI conversation script from text/PDF content (called after campaign created)
  generateScript: (id, text, language, campaignType) =>
    api.post(`/campaigns/${id}/script/text`, { text, language, campaign_type: campaignType }, { timeout: 60000 }),

  extractUrl: (url) =>
    api.post('/simulate/extract-url', { url }),
  extractPdf: (file) => {
    const form = new FormData()
    form.append('pdf', file)
    return api.post('/simulate/extract-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },
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

// ── Billing ───────────────────────────────────────────────────
export const billingApi = {
  summary:         (month) => api.get('/billing/summary', { params: { month } }),
  monthly:         ()      => api.get('/billing/monthly'),
  activity:        ()      => api.get('/billing/activity'),
  invoices:        ()      => api.get('/billing/invoices'),
  invoice:         (id)    => api.get(`/billing/invoices/${id}`),
  generateInvoice: (month) => api.post('/billing/invoices/generate', { month }),
  downloadInvoice: (id)    => `${api.defaults.baseURL}/billing/invoices/${id}/download?token=${localStorage.getItem('token')}`,
  usageSummary:    ()      => api.get('/billing/usage-summary'),
  plans:           ()      => api.get('/billing/plans'),
  upgrade:         (plan)  => api.post('/billing/upgrade', { plan }),
}

// ── Settings ──────────────────────────────────────────────────
export const settingsApi = {
  get:              ()            => api.get('/settings'),
  update:           (data)        => api.put('/settings', data),
  testVobiz:        ()            => api.post('/settings/test-vobiz'),
  testWebhook:      (url, secret) => api.post('/settings/test-webhook', { webhook_url: url, webhook_secret: secret }),
  regenerateApiKey: ()            => api.post('/settings/regenerate-api-key'),
}

// ── User ──────────────────────────────────────────────────────
export const userApi = {
  getProfile:    ()     => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
}

// ── Contacts ──────────────────────────────────────────────────
export const contactApi = {
  list:   (campaignId, params) => api.get(`/campaigns/${campaignId}/contacts`, { params }),
  upload: (campaignId, form)   => api.post(`/campaigns/${campaignId}/contacts`, form),
  delete: (campaignId, id)     => api.delete(`/campaigns/${campaignId}/contacts/${id}`),
}

// ── Call Logs ─────────────────────────────────────────────────
export const callApi = {
  list:   (campaignId, params) => api.get(`/campaigns/${campaignId}/calls`, { params }),
  get:    (campaignId, id)     => api.get(`/campaigns/${campaignId}/calls/${id}`),
  export: (campaignId)         => api.get(`/campaigns/${campaignId}/calls/export`),
}

// ── Simulate / Simulator ──────────────────────────────────────
export const simulateApi = {
  start: (campaignId, script, personaName, language, contactName) =>
    api.post('/simulate/start', {
      campaign_id:    campaignId,
      custom_script:  script,
      custom_persona: personaName,
      language,
      contact_name:   contactName,
    }),
  message: (sessionId, text) =>
    api.post(`/simulate/${sessionId}/message`, {
      session_id: sessionId,
      message:    text,
    }),
  end: (sessionId, reason) =>
    api.post(`/simulate/${sessionId}/end`, { session_id: sessionId, outcome: reason }),
  getCampaigns: () => api.get('/campaigns'),
}

// ── Analytics ─────────────────────────────────────────────────
export const analyticsApi = {
  overview:  (params) => api.get('/analytics/overview', { params }),
  campaigns: (params) => api.get('/analytics/campaigns', { params }),
}

// ── Sheets / Integrations ─────────────────────────────────────
export const sheetsApi = {
  connect:    (data) => api.post('/integrations/sheets/connect', data),
  disconnect: ()     => api.post('/integrations/sheets/disconnect'),
  status:     ()     => api.get('/integrations/sheets/status'),
}

// ── Team ──────────────────────────────────────────────────────
export const teamApi = {
  list:       ()            => api.get('/team'),
  invite:     (email, role) => api.post('/team/invite', { email, role }),
  updateRole: (id, role)    => api.put(`/team/${id}/role`, { role }),
  resend:     (id)          => api.post(`/team/${id}/resend`),
  remove:     (id)          => api.delete(`/team/${id}`),
  accept:     (token)       => api.post('/team/accept', { token }),
}

// ── Notifications ─────────────────────────────────────────────
export const notificationApi = {
  list:        ()   => api.get('/notifications'),
  markRead:    (id) => api.put(`/notifications/${id}/read`),
  markAllRead: ()   => api.put('/notifications/read-all'),
}

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
}

// ── DNC ───────────────────────────────────────────────────────
export const dncApi = {
  list:   (params) => api.get('/dnc', { params }),
  add:    (phones) => api.post('/dnc', { phones }),
  remove: (phone)  => api.delete(`/dnc/${encodeURIComponent(phone)}`),
  check:  (phone)  => api.get(`/dnc/check/${encodeURIComponent(phone)}`),
  import: (file)   => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/dnc/import', form)
  },
}
