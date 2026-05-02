import { useEffect, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { AppLayout } from './components/AppLayout'
import { AdminLayout } from './components/admin/AdminLayout'
import { Activity } from 'lucide-react'
import './App.css'

// Lazy loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'))
const LoginFacePage = lazy(() => import("./pages/LoginFacePage"))
const LoginFingerprintPage = lazy(() => import("./pages/LoginFingerprintPage"))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const RegisterFingerprintPage = lazy(() => import("./pages/RegisterFingerprintPage"))
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'))
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const TwoFactorPage = lazy(() => import('./pages/TwoFactorPage').then(m => ({ default: m.TwoFactorPage })))
const TwoFactorSetupPage = lazy(() => import('./pages/TwoFactorSettingsPage').then(m => ({ default: m.TwoFactorSetupPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const ActivityHistoryPage = lazy(() => import('./pages/ActivityHistoryPage'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'))
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'))
const SkinHistoryPage = lazy(() => import('./pages/SkinHistoryPage'))
const SkinAnalysisDetailPage = lazy(() => import('./pages/SkinAnalysisDetailPage'))
const AiDemoPage = lazy(() => import('./pages/AiDemoPage'))
const SessionsPage = lazy(() => import('./pages/SessionsPage').then(m => ({ default: m.SessionsPage })))
const RoutinesPage = lazy(() => import('./pages/RoutinesPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'))
const SkinDigitalTwinPage = lazy(() => import('./pages/SkinDigitalTwinPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const UpgradePage = lazy(() => import('./pages/UpgradePage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'))
const SkinRecommendationsPage = lazy(() => import('./pages/SkinRecommendationsPage'))

// Loading component
const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-slate-50">
    <Activity size={40} className="text-teal-600 animate-spin" />
  </div>
);


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
  const { i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/pricing" element={<PricingPage />} />

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
              <Route path="/analysis/recommendations" element={<SkinRecommendationsPage />} />
              <Route path="/analysis/digital-twin/:analysisId" element={<SkinDigitalTwinPage />} />
              <Route path="/routines" element={<RoutinesPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/ai-demo" element={<AiDemoPage />} />

              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />
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
        </Suspense>
      </Router>
    </ThemeProvider>
  )
}

export default App