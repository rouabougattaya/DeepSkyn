import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { AppLayout } from './components/AppLayout'
import { AdminLayout } from './components/admin/AdminLayout'
import LoginPage from './pages/LoginPage'
import LoginFacePage from "./pages/LoginFacePage"
import LoginFingerprintPage from "./pages/LoginFingerprintPage"
import RegisterPage from './pages/RegisterPage'
import RegisterFingerprintPage from "./pages/RegisterFingerprintPage"
import GoogleCallback from './pages/GoogleCallback'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import SecurityPage from './pages/SecurityPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { TwoFactorPage } from './pages/TwoFactorPage'
import { TwoFactorSetupPage } from './pages/TwoFactorSettingsPage'
import { SettingsPage } from './pages/SettingsPage'
import ProfilePage from "./pages/ProfilePage"
import ActivityHistoryPage from './pages/ActivityHistoryPage'
import AnalysisPage from './pages/AnalysisPage'
import ComparisonPage from './pages/ComparisonPage'
import SkinHistoryPage from './pages/SkinHistoryPage'
import SkinAnalysisDetailPage from './pages/SkinAnalysisDetailPage'
import AiDemoPage from './pages/AiDemoPage'
import { SessionsPage } from './pages/SessionsPage'
import RoutinesPage from './pages/RoutinesPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import './App.css'

function Home() {
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
        <Route path="/auth/register-fingerprint" element={<RegisterFingerprintPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/auth/callback/google" element={<GoogleCallback />} />
        <Route path="/auth/2fa" element={<TwoFactorPage />} />
        <Route path="/auth/login-face" element={<LoginFacePage />} />
        <Route path="/auth/login-empreinte" element={<LoginFingerprintPage />} />

        {/* Protected Routes inside AppLayout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/2fa" element={<TwoFactorSetupPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/security-history" element={<ActivityHistoryPage />} />
          <Route path="/home" element={<Home />} />

          {/* 👇 AJOUT : Ta nouvelle route pour les sessions */}
          <Route path="/sessions" element={<SessionsPage />} />

          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/analysis/history" element={<SkinHistoryPage />} />
          <Route path="/analysis/details/:id" element={<SkinAnalysisDetailPage />} />
          <Route path="/analysis/compare" element={<ComparisonPage />} />
          <Route path="/routines" element={<RoutinesPage />} />
          <Route path="/ai-demo" element={<AiDemoPage />} />
          <Route path="/pricing" element={<HomePage />} />
        </Route>

        {/* Admin Routes - Protected with role check */}
        <Route
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminDashboardPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
          path="/admin"
        />

        <Route
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminUsersPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
          path="/admin/users"
        />

        <Route
          element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminSettingsPage />
              </AdminLayout>
            </ProtectedAdminRoute>
          }
          path="/admin/settings"
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App