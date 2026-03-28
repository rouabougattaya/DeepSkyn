import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  History,
  BarChart2,
  ShoppingBag,
  CalendarCheck,
  Brain,
  CreditCard,
  Settings,
  Shield,
  User as UserIcon,
  Lock,
  MapPin,
  LogOut,
} from "lucide-react";
import { getUser, logout, authFetch } from "@/lib/authSession";
import { simpleAuthService } from "@/services/authService-simple";

const groups = [
  {
    title: "Main",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/ai-demo", label: "Skin Analysis", icon: Sparkles },
      { href: "/routines", label: "My Routines", icon: CalendarCheck },
      { href: "/products", label: "Products", icon: ShoppingBag },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/analysis/history", label: "Analysis History", icon: History },
      { href: "/analysis/compare", label: "Compare Analyses", icon: BarChart2 },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: UserIcon },
      { href: "/security", label: "Security & Activity", icon: Shield },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "Coach",
    items: [
      { href: "/ai-demo", label: "AI Skin Coach", icon: Brain },
    ],
  },
  {
    title: 'Abonnement',
    items: [
      { href: '/upgrade', label: 'Plans & Facturation', icon: CreditCard },
    ],
  },
  {
    title: "Sécurité",
    items: [
      { href: "/security-history", label: "Connexions & Activité", icon: Lock },
      { href: "/security", label: "Logs IP", icon: MapPin },
    ],
  },
];

interface SidebarProps {
  onOpenCoach?: () => void;
  isCoachOpen?: boolean;
}

export function Sidebar({ onOpenCoach, isCoachOpen = false }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const user = getUser();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      authFetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"}/subscription/status/${user.id}`)
        .then(res => {
           if (!res.ok) throw new Error('Unauthorized');
           return res.json();
        })
        .then(data => setStatus(data))
        .catch(err => console.error("Error fetching status:", err));
    }
  }, [user?.id, location.pathname]);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href);

  const handleLogout = async () => {
    await simpleAuthService.logout();
    await logout();
  };

  return (
    <aside className="border-r border-slate-200 bg-white text-slate-900 hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:top-16 lg:bottom-0 lg:z-30">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {groups.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 px-2">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isCoachItem = item.label === 'AI Skin Coach';
                const active = isCoachItem ? isCoachOpen : isActive(item.href);

                if (isCoachItem) {
                  return (
                    <button
                      key={item.href + item.label}
                      type="button"
                      onClick={onOpenCoach}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active
                        ? "bg-teal-50 text-teal-700 border border-teal-100"
                        : "text-slate-700 hover:bg-slate-100"}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active
                      ? "bg-teal-50 text-teal-700 border border-teal-100"
                      : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* 📊 USAGE INDICATOR */}
        {status && status.chat && status.analysis && (
          <div className="mx-2 mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
             <div className="flex items-center justify-between mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Usage {status.plan}</span>
                <Link to="/upgrade" className="text-teal-600 hover:underline">UPGRADE</Link>
             </div>
             <div className="space-y-3">
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-600">Messages Chat</span>
                      <span className="text-slate-900">{status.chat.used}/{status.chat.limit}</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, (status.chat.used / status.chat.limit) * 100)}%` }} 
                      />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-600">Analyses Peau</span>
                      <span className="text-slate-900">{status.analysis.used}/{status.analysis.limit}</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, (status.analysis.used / status.analysis.limit) * 100)}%` }} 
                      />
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 grid place-items-center font-semibold">
            {user?.firstName?.[0] || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{user?.firstName || user?.name || "User"}</p>
            <p className="text-xs text-slate-500 truncate">Plan : {status?.plan || "FREE"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Mobile toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-full bg-teal-600 text-white p-3 shadow-lg"
          aria-label="Toggle navigation"
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl border-r border-slate-200 p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-900">Navigation</span>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <CloseIcon />
              </button>
            </div>
            {groups.map((group) => (
              <div key={group.title} className="space-y-2 mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 px-2">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isCoachItem = item.label === 'AI Skin Coach';
                    const active = isCoachItem ? isCoachOpen : isActive(item.href);

                    if (isCoachItem) {
                      return (
                        <button
                          key={item.href + item.label}
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            onOpenCoach?.();
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active
                            ? "bg-teal-50 text-teal-700 border border-teal-100"
                            : "text-slate-700 hover:bg-slate-100"}`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.href + item.label}
                        to={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active
                          ? "bg-teal-50 text-teal-700 border border-teal-100"
                          : "text-slate-700 hover:bg-slate-100"}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
