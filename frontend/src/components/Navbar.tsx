"use client"

import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut, Settings, LayoutDashboard, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import LanguageSwitcher from "./LanguageSwitcher"
import { getUser, logout } from "@/lib/authSession"
import { simpleAuthService } from "@/services/authService-simple"

const getLoggedOutLinks = (t: any) => [
  { href: "/", label: t('nav.home') },
  { href: "/products", label: t('nav.products') },
  { href: "/pricing", label: t('nav.plans', { defaultValue: 'Plans' }) },
]

export function Navbar() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = getUser()

  const loggedOutLinks = getLoggedOutLinks(t)

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
              <img src="/logo.png" alt="DeepSkyn - AI Skin Analysis Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-bold text-gray-900 tracking-tight">DeepSkyn</span>
              <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-[0.14em]">{t('nav.skin_intelligence', { defaultValue: 'Skin Intelligence' })}</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
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
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <LanguageSwitcher />
                <Link to="/analysis">
                  <Button size="sm" className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 shadow-md">
                    {t('nav.skin_analysis')}
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button variant="outline" size="sm" className="font-semibold">{t('nav.login')}</Button>
                </Link>
                <Link to="/auth/register">
                  <Button size="sm">{t('nav.get_started')}</Button>
                </Link>
              </>
            ) : (
              <>
                <LanguageSwitcher />
                <Link
                  to="/analysis"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-sm font-semibold shadow hover:from-teal-700 hover:to-emerald-600 transition-all"
                >
                  <Sparkles className="w-4 h-4" /> {t('nav.skin_analysis')}
                </Link>
                <Link
                  to="/dashboard"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Dashboard"
                  title="Dashboard"
                >
                  <LayoutDashboard className="w-4 h-4 text-gray-700 hover:text-gray-900" />
                </Link>
                <Link
                  to="/settings"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-gray-700 hover:text-gray-900" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
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
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('nav.language', { defaultValue: 'Language' })}</p>
                  <LanguageSwitcher />
                </div>
                <div className="pt-3 grid grid-cols-1 gap-2">
                  <Link to="/analysis" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600">{t('nav.skin_analysis')}</Button>
                  </Link>
                  <Link to="/auth/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full bg-transparent">{t('nav.login')}</Button>
                  </Link>
                  <Link to="/auth/register" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">{t('nav.get_started')}</Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                {[{ href: "/dashboard", label: t('nav.dashboard'), icon: LayoutDashboard }, { href: "/settings", label: t('nav.settings', { defaultValue: 'Settings' }), icon: Settings }].map((item) => {
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
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('nav.language', { defaultValue: 'Language' })}</p>
                  <LanguageSwitcher />
                </div>
                <div className="pt-2 grid grid-cols-1 gap-2">
                  <Link to="/analysis" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600">{t('nav.skin_analysis')}</Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-gray-700"
                    aria-label={t('nav.logout')}
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4" /> {t('nav.logout')}
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
