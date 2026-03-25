"use client"

import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut, Settings, User as UserIcon, LayoutDashboard, Sparkles } from "lucide-react"
import { getUser, logout } from "@/lib/authSession"
import { simpleAuthService } from "@/services/authService-simple"

const loggedOutLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/pricing", label: "Plans" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = getUser()

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href)

  const handleLogout = async () => {
    // Nettoyer les deux systèmes d'authentification
    await simpleAuthService.logout()
    await logout()
    navigate("/auth/login", { replace: true })
    setIsOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 overflow-hidden rounded-xl bg-transparent flex items-center justify-center">
              <img src="/logo.png" alt="DeepSkyn Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-bold text-gray-900 tracking-tight">DeepSkyn</span>
              <span className="text-[11px] font-semibold text-teal-600 uppercase tracking-[0.14em]">Skin Intelligence</span>
            </div>
          </Link>

          {!user && (
            <div className="hidden md:flex items-center gap-1">
              {loggedOutLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${isActive(link.href)
                    ? "text-teal-700 bg-teal-50 border border-teal-100"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link to="/ai-demo">
                  <Button size="sm" className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 shadow-md">
                    Start Analysis
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button variant="outline" size="sm" className="font-semibold">Sign In</Button>
                </Link>
                <Link to="/auth/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/ai-demo"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-sm font-semibold shadow hover:from-teal-700 hover:to-emerald-600 transition-all"
                >
                  <Sparkles className="w-4 h-4" /> Launch Analysis
                </Link>
           
                 
               
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Profile"
                >
                  <UserIcon className="w-4 h-4" />
                  {user.firstName} {user.lastName}
                </Link>
                <Link
                  to="/settings"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Settings"
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
                  Sign Out
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
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg shadow-lg">
          <div className="px-4 py-4 space-y-2">
            {user && (
              <p className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
                {user.firstName} {user.lastName}
              </p>
            )}

            {!user ? (
              <>
                {loggedOutLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`block px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${isActive(link.href)
                      ? "text-teal-700 bg-teal-50 border border-teal-100"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-3 grid grid-cols-1 gap-2">
                  <Link to="/ai-demo" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600">Start Analysis</Button>
                  </Link>
                  <Link to="/auth/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full bg-transparent">Sign In</Button>
                  </Link>
                  <Link to="/auth/register" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                {[{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, { href: "/profile", label: "Profile", icon: UserIcon }, { href: "/settings", label: "Settings", icon: Settings }].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${isActive(item.href)
                        ? "text-teal-700 bg-teal-50 border border-teal-100"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="pt-2 grid grid-cols-1 gap-2">
                  <Link to="/ai-demo" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600">Launch Analysis</Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
