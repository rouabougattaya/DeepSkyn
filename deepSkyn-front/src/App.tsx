import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import LoginPage from './pages/LoginPage'
import GoogleCallback from './pages/GoogleCallback'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/callback/google" element={<GoogleCallback />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analysis" element={
          <>
            <Navbar />
            <HomePage />
          </>
        } />
        <Route path="/pricing" element={
          <>
            <Navbar />
            <HomePage />
          </>
        } />
      </Routes>
    </Router>
  )
}

export default App
