// frontend/src/components/Navbar.tsx
"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Menu, X, Sparkles, LogOut, Smartphone } from "lucide-react"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/analysis", label: "Skin Analysis" },
  { href: "/routines", label: "Routines" },
  { href: "/chat", label: "AI Coach" },
  { href: "/products", label: "Shop" },
  { href: "/pricing", label: "Pricing" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Vérifier l'authentification
  const checkAuth = () => {
    const token = localStorage.getItem('token')
    const hasToken = !!token
    console.log('🔍 Navbar - Token présent:', hasToken ? 'OUI' : 'NON')
    setIsAuthenticated(hasToken)
  }

  // Vérifier au chargement et à chaque changement
  useEffect(() => {
    checkAuth()
    
    // Écouter les changements de localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === null) {
        console.log('🔄 Changement détecté dans localStorage')
        checkAuth()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Vérifier toutes les secondes (pour les changements dans la même fenêtre)
    const interval = setInterval(checkAuth, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [location.pathname]) // ← Se déclenche à chaque changement de page

  const handleLogout = () => {
    console.log('🚪 Déconnexion...')
    localStorage.removeItem('token')
    localStorage.removeItem('auth_user')
    setIsAuthenticated(false)
    setIsOpen(false)
    
    // Forcer un événement storage pour les autres onglets
    window.dispatchEvent(new Event('storage'))
    
    // Rediriger vers la page d'accueil
    navigate('/')
    
    // Recharger la page pour forcer la mise à jour
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">DeepSkyn</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
              >
                {link.label}
              </Link>
            ))}
            
            {/* BOUTON SESSIONS */}
            {isAuthenticated && (
              <Link
                to="/sessions"
                className="ml-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors rounded-lg hover:bg-blue-50 border border-blue-200 flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Mes Sessions
              </Link>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link to="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-600">
                  👋 Bonjour!
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* BOUTON SESSIONS MOBILE */}
            {isAuthenticated && (
              <Link
                to="/sessions"
                className="block px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                onClick={() => setIsOpen(false)}
              >
                <Smartphone className="w-4 h-4 inline mr-2" />
                Mes Sessions
              </Link>
            )}
            
            <div className="pt-4 flex flex-col gap-2">
              {!isAuthenticated ? (
                <>
                  <Link to="/auth/login" className="w-full">
                    <Button variant="outline" className="w-full bg-transparent">Sign In</Button>
                  </Link>
                  <Link to="/auth/register" className="w-full">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}