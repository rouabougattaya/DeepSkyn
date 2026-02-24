import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import LoginFacePage from "./pages/LoginFacePage"
import LoginFingerprintPage from "./pages/LoginFingerprintPage"
import RegisterPage from './pages/RegisterPage'
import { TwoFactorPage } from './pages/TwoFactorPage'
import { TwoFactorSetupPage } from './pages/TwoFactorSettingsPage'
import { SettingsPage } from './pages/SettingsPage'
import ProfilePage from "./pages/ProfilePage"
import './App.css'
import RegisterFingerprintPage from "@/pages/RegisterFingerprintPage"
function base64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = window.atob(base64Safe);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}
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
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/2fa" element={<TwoFactorPage />} />
<Route path="/auth/login-empreinte" element={<LoginFingerprintPage />} />        <Route path="/auth/register-fingerprint" element={<RegisterFingerprintPage />} />
        <Route path="/auth/login-face" element={<LoginFacePage />} />
        <Route path="/settings/2fa" element={<ProtectedRoute><TwoFactorSetupPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
<Route path="/profile" element={<ProfilePage />} />
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
