import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/apiClient';
import { getUser } from '../lib/authSession';
import { Crown, Zap, ShieldCheck } from 'lucide-react';

interface SubscriptionData {
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  imagesUsed: number;
  messagesUsed: number;
}

export default function SubscriptionCard() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSub() {
      const user = getUser();
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiGet<SubscriptionData>(`/subscription/${user.id}`);
        setSubscription(data);
      } catch (err) {
        console.error('Failed to fetch subscription', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSub();
  }, []);

  const getPlanBgColor = (plan: string) => {
    if (plan === 'PRO') return 'bg-teal-500';
    if (plan === 'PREMIUM') return 'bg-purple-500';
    return 'bg-slate-500';
  };

  const getPlanTextColor = (plan: string) => {
    if (plan === 'PRO') return 'text-teal-600';
    if (plan === 'PREMIUM') return 'text-purple-600';
    return 'text-slate-600';
  };

  const getPlanFeatureText = (plan: string) => {
    if (plan === 'FREE') return 'Basic limits applied';
    if (plan === 'PRO') return 'Expanded access';
    return 'Unlimited capabilities';
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-white border border-slate-200 rounded-2xl p-6 h-32"></div>
    );
  }

  const plan = subscription?.plan || 'FREE';
  const status = subscription?.status || 'ACTIVE';

  const planStyles = {
    FREE: 'bg-slate-100 text-slate-700 border-slate-200',
    PRO: 'bg-teal-50 text-teal-700 border-teal-200',
    PREMIUM: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const PlanIcon = {
    FREE: ShieldCheck,
    PRO: Zap,
    PREMIUM: Crown,
  }[plan];

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 overflow-hidden relative group">
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full -mr-10 -mt-10 ${getPlanBgColor(plan)}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Plan</h3>
          <div className="flex items-center gap-2">
            <PlanIcon size={24} className={getPlanTextColor(plan)} />
            <span className="text-2xl font-black text-slate-900">{plan}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {status}
        </div>
      </div>

      <div className="space-y-3 mt-6 relative z-10">
        <div className={`p-4 rounded-xl border flex items-center justify-between ${planStyles[plan]}`}>
          <div>
            <div className="text-xs font-semibold opacity-70 mb-1">Plan Features</div>
            <div className="text-sm font-bold">
              {getPlanFeatureText(plan)}
            </div>
          </div>
          <button
            onClick={() => navigate('/upgrade')}
            className="text-xs font-bold bg-white text-slate-900 border px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            Améliorer
          </button>
        </div>
      </div>
    </div>
  );
}
