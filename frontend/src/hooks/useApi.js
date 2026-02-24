import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({ baseURL: API_URL })

// Auto-attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-handle errors
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth hooks
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (email, password, company_name) => api.post('/auth/signup', { email, password, company_name }),
  me: () => api.get('/auth/me'),
}

// Campaign hooks
export const campaignApi = {
  list: () => api.get('/campaigns'),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  launch: (id) => api.post(`/campaigns/${id}/launch`),
  pause: (id) => api.post(`/campaigns/${id}/pause`),
  stats: (id) => api.get(`/campaigns/${id}/stats`),
  calls: (id) => api.get(`/campaigns/${id}/calls`),
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
  extractFromURL: (id, url) => api.post(`/campaigns/${id}/script/url`, { url }),
}
