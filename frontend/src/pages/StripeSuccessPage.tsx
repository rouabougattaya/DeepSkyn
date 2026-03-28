import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

const StripeSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // In a real app, we would verify the session ID here
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8">
        <CheckCircle size={48} />
      </div>
      <h1 className="text-4xl font-black text-slate-900 mb-4 text-center">Payment Successful! 🎉</h1>
      <p className="text-slate-500 text-lg mb-10 text-center max-w-md">
        Thank you for your purchase. Your account has been upgraded and you now have access to all your new features.
      </p>
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-500 transition-all shadow-lg hover:shadow-teal-100"
      >
        Go to my Dashboard <ArrowRight size={18} />
      </button>
      <p className="mt-8 text-slate-400 text-sm">Redirecting in 5 seconds...</p>
    </div>
  );
};

export default StripeSuccessPage;
