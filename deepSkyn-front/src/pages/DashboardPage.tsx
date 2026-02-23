import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { simpleAuthService } from '@/services/authService-simple';
import { Brain, Camera, BarChart3, Shield, History, Sparkles, RefreshCw, LogOut } from 'lucide-react';
import AIStatusBadge from '@/components/AIStatusBadge';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = simpleAuthService.getCurrentUser();
        if (!currentUser) {
          navigate('/auth/login');
          return;
        }
        setUser(currentUser);
        setAiStatus(simpleAuthService.getAIStatus());
        setLoading(false);

        // Fetch fresh data in background to update createdAt/authMethod
        const freshUser = await simpleAuthService.getProfile();
        setUser(freshUser);
      } catch (error) {
        console.error('Error loading user data:', error);
        // If it was just the background fetch failing, don't redirect
        if (!user) navigate('/auth/login');
      }
    };
    loadUserData();
  }, [navigate]);

  const handleRefreshAI = async () => {
    try {
      setLoading(true);
      const result = await simpleAuthService.refreshAIVerification();
      setAiStatus({ verified: result.verified, score: result.score });
      const updatedUser = simpleAuthService.getCurrentUser();
      setUser(updatedUser);
    } catch (error) {
      console.error('Error refreshing AI verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await simpleAuthService.logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0d9488] rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-500 font-medium animate-pulse">Analyzing your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#0d9488] flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">DeepSkyn</span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshAI}
                className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#0d9488] transition-colors"
              >
                <RefreshCw size={16} />
                Refresh AI
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Welcome back, <span className="text-[#0d9488]">{user?.name?.split(' ')[0] || user?.name}</span>! 👋
          </h1>
          <p className="text-slate-500 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • AI Health Summary
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: AI Status & User Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-slate-900">Verification Status</h2>
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-[#0d9488]" />
                </div>
              </div>

              <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <AIStatusBadge verified={aiStatus?.verified || false} score={aiStatus?.score || 0} compact={false} />
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: 'Auth Method',
                    value: (user?.authMethod === 'google' || user?.googleId) ? 'Google Account' : 'Email & Password',
                    icon: Shield
                  },
                  {
                    label: 'Member Since',
                    value: user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    icon: History
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 transition-colors">
                      <item.icon size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                      <p className="text-sm font-bold text-slate-700">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Quick Card */}
            <div className="bg-[#0d9488] p-6 rounded-3xl shadow-xl shadow-teal-500/20 text-white relative overflow-hidden group">
              <Sparkles className="absolute -right-4 -top-4 w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform" />
              <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-1">Account Email</p>
              <p className="text-lg font-bold truncate">{user?.email}</p>
            </div>
          </div>

          {/* Right Column: Actions Grid */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { to: '/analysis', icon: Camera, label: 'Skin Analysis', desc: 'Scan and analyze your skin health with AI.', color: 'text-teal-600', bg: 'bg-teal-50' },
                { to: '/routines', icon: BarChart3, label: 'My Routines', desc: 'View your personalized AM/PM skincare plan.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { to: '/security', icon: History, label: 'Account Activity', desc: 'Monitor login history and security alerts.', color: 'text-amber-600', bg: 'bg-amber-50' },
                { to: '/profile', icon: Shield, label: 'Profile Settings', desc: 'Update your personal info and preferences.', color: 'text-sky-600', bg: 'bg-sky-50' },
              ].map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-[#0d9488]/30 hover:shadow-xl hover:shadow-teal-500/5 transition-all"
                >
                  <div className={`w-12 h-12 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <action.icon size={24} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">{action.label}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{action.desc}</p>
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 text-sm">© 2026 DeepSkyn · Precision AI Skincare Infrastructure</p>
        </div>
      </main>
    </div>
  );
}