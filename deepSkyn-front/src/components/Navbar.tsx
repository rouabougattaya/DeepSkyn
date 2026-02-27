"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Menu, X, Sparkles, LogOut, Settings, User as UserIcon, LayoutDashboard } from "lucide-react"
import { getUser, logout } from "@/lib/authSession"
import { simpleAuthService } from "@/services/authService-simple"

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
  const navigate = useNavigate()
  const user = getUser()

  const handleLogout = async () => {
    // Nettoyer les deux systèmes d'authentification
    await simpleAuthService.logout()
    await logout()
    navigate("/auth/login", { replace: true })
    setIsOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#0d9488] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">DeepSkyn</span>
          </Link>

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
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link to="/auth/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#0d9488] text-[#0d9488] hover:bg-[#0d9488] hover:text-white transition-all font-semibold"
                  >
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
                {/* Admin Dashboard Icon */}
                <Link
                  to="/dashboard"
                  className="p-2 rounded-lg hover:bg-teal-50 text-[#0d9488] transition-all"
                  title="Tableau de Bord"
                >
                  <LayoutDashboard className="w-5 h-5" />
                </Link>

                {/* Username with Profile Link */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Profil"
                >
                  <UserIcon className="w-4 h-4" />
                  {user.firstName} {user.lastName}
                </Link>

                {/* Settings Icon */}
                <Link
                  to="/settings"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Paramètres"
                >
                  <Settings className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </Button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg">
          <div className="px-4 py-4 space-y-2">
            {user && (
              <p className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
                {user.firstName} {user.lastName}
              </p>
            )}
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
            <div className="pt-4 flex flex-col gap-2">
              {!user ? (
                <>
                  <Link to="/auth/login" className="w-full" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full bg-transparent">Sign In</Button>
                  </Link>
                  <Link to="/auth/register" className="w-full" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </>
              ) : (
                <>
                  {/* Admin Dashboard */}
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#0d9488] hover:bg-teal-50 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Tableau de Bord
                  </Link>

                  {/* Profile */}
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <UserIcon className="w-4 h-4" />
                    Mon Profil
                  </Link>

                  {/* Settings */}
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Paramètres
                  </Link>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
