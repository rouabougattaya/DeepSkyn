import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GoogleCallback from './pages/GoogleCallback'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import SecurityPage from './pages/SecurityPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { TwoFactorPage } from './pages/TwoFactorPage'
import { TwoFactorSetupPage } from './pages/TwoFactorSettingsPage'
import { SettingsPage } from './pages/SettingsPage'
import './App.css'

function HomePlaceholder() {
  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to DeepSkyn
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your AI-powered skin analysis companion
          </p>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/auth/callback/google" element={<GoogleCallback />} />
        <Route path="/auth/2fa" element={<TwoFactorPage />} />

        {/* Protected Routes inside AppLayout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/2fa" element={<TwoFactorSetupPage />} />
          <Route path="/home" element={<HomePlaceholder />} />

          <Route path="/analysis" element={<HomePage />} />
          <Route path="/pricing" element={<HomePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
