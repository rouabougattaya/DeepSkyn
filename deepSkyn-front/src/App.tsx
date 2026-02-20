import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import LoginPage from './pages/LoginPage'
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
        <Route path="/" element={<><Navbar /><Home /></>} />
        <Route path="/auth/login" element={<LoginPage />} />
      </Routes>
    </Router>
  )
}

export default App
