import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';

const StripeCancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-8">
        <XCircle size={48} />
      </div>
      <h1 className="text-4xl font-black text-slate-900 mb-4 text-center">Payment Cancelled</h1>
      <p className="text-slate-500 text-lg mb-10 text-center max-w-md">
        Your payment was not completed and you haven't been charged. If you have any questions, please contact our support.
      </p>
      <button 
        onClick={() => navigate('/upgrade')}
        className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all shadow-lg"
      >
        <ArrowLeft size={18} /> Back to Pricing
      </button>
    </div>
  );
};

export default StripeCancelPage;
