import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import LoginPage from "./pages/LoginPage"
import GoogleCallback from "./pages/GoogleCallback"
import HomePage from "./pages/HomePage"
import DashboardPage from "./pages/DashboardPage"
import { SessionsPage } from "./pages/SessionsPage"

function App() {
  return (
    <Router>
      <Navbar /> {/* 🔥 Navbar global ici */}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/callback/google" element={<GoogleCallback />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  )
}

export default App