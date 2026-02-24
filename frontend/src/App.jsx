import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import CreateCampaign from './pages/CreateCampaign'
import CampaignDetail from './pages/CampaignDetail'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token') || localStorage.getItem('demo_mode')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            borderRadius: '12px',
            background: '#0A1628',
            color: '#fff',
            fontSize: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#FF6B2B', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/"      element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="campaigns"     element={<Campaigns />} />
          <Route path="campaigns/new" element={<CreateCampaign />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="settings"      element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

