import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { simpleAuthService } from '@/services/authService-simple';
import { Brain, Camera, BarChart3, MessageCircle, Shield, AlertTriangle } from 'lucide-react';
import AIStatusBadge from '@/components/AIStatusBadge';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = () => {
      try {
        const currentUser = simpleAuthService.getCurrentUser();
        if (!currentUser) {
          navigate('/auth/login');
          return;
        }

        setUser(currentUser);
        setAiStatus(simpleAuthService.getAIStatus());
        setLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
        navigate('/auth/login');
      }
    };

    loadUserData();
  }, [navigate]);

  const handleRefreshAI = async () => {
    try {
      setLoading(true);
      const result = await simpleAuthService.refreshAIVerification();
      setAiStatus({
        verified: result.verified,
        score: result.score,
      });
      // Reload user data
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">DeepSkyn</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefreshAI}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Refresh AI
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-600">
            Your AI-powered skin analysis dashboard
          </p>
        </div>

        {/* AI Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">AI Verification Status</h2>
            <button
              onClick={handleRefreshAI}
              className="px-3 py-1 text-sm bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors"
            >
              Refresh
            </button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <AIStatusBadge
              verified={aiStatus?.verified || false}
              score={aiStatus?.score || 0}
              compact={false}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="font-medium text-slate-900 mb-1">Authentication Method</div>
              <div className="text-slate-600 capitalize">{user?.authMethod}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="font-medium text-slate-900 mb-1">Email</div>
              <div className="text-slate-600">{user?.email}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="font-medium text-slate-900 mb-1">Member Since</div>
              <div className="text-slate-600">
                {new Date(user?.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            to="/analysis"
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <Camera className="w-8 h-8 text-teal-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Skin Analysis</h3>
            <p className="text-sm text-slate-600">Start a new AI analysis</p>
          </Link>

          <Link
            to="/routines"
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <BarChart3 className="w-8 h-8 text-teal-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">My Routines</h3>
            <p className="text-sm text-slate-600">View your skincare routines</p>
          </Link>

          <Link
            to="/ai-coach"
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <MessageCircle className="w-8 h-8 text-teal-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">AI Coach</h3>
            <p className="text-sm text-slate-600">Chat with AI assistant</p>
          </Link>

          <Link
            to="/profile"
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <Shield className="w-8 h-8 text-teal-600 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Profile</h3>
            <p className="text-sm text-slate-600">Manage your account</p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">Account created</div>
                <div className="text-sm text-slate-600">
                  {new Date(user?.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">AI Verification</div>
                <div className="text-sm text-slate-600">
                  {aiStatus?.verified ? 'Verified' : 'Pending verification'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
