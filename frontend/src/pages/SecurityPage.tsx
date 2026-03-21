import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Shield, Sparkles } from 'lucide-react';
import ActivityTimeline from '@/components/ActivityTimeline';

export default function SecurityPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* --- NAVIGATION --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 text-slate-600 hover:text-[#0d9488] transition-colors font-medium text-sm"
                            >
                                <ChevronLeft size={18} />
                                Back to Dashboard
                            </button>
                        </div>

                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center shadow-md shadow-teal-500/10">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-slate-900">DeepSkyn</span>
                        </Link>

                        {/* Spacer pour équilibrer le logo centré si besoin */}
                        <div className="w-[140px] hidden md:block"></div>
                    </div>
                </div>
            </nav>

            {/* --- CONTENT --- */}
            <main className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header de la page */}
                    <div className="mb-10 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-[#0d9488] rounded-full text-xs font-bold mb-4 border border-teal-100">
                            <Shield className="w-3.5 h-3.5" />
                            <span>ACCOUNT SECURITY</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                            Security <span className="text-[#0d9488]">Activity</span>
                        </h1>
                        <p className="text-slate-600 max-w-xl">
                            Monitor your account's recent activity and security events to ensure your data remains protected.
                        </p>
                    </div>

                    {/* Container de la Timeline */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 md:p-8">
                            <ActivityTimeline />
                        </div>
                    </div>

                    {/* Footer d'information */}
                    <div className="mt-8 p-6 rounded-2xl bg-teal-50/50 border border-teal-100 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0d9488] shadow-sm shrink-0">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-1">Privacy is our priority</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Your security logs are encrypted and only visible to you. If you notice any suspicious activity, please change your password immediately or contact our support team.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- SIMPLE FOOTER --- */}
            <footer className="py-8 text-center border-t border-slate-200 bg-white">
                <p className="text-slate-400 text-xs">© 2024 DeepSkyn AI. Secure Infrastructure.</p>
            </footer>
        </div>
    );
}