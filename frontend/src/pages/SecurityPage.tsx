import { Shield } from 'lucide-react';
import ActivityTimeline from '@/components/ActivityTimeline';

export default function SecurityPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <main className="px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                {/* Page Header */}
                <div className="flex flex-col gap-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-[#0d9488] rounded-full text-xs font-bold border border-teal-100 w-fit">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Account Security</span>
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Security Activity</h1>
                        <p className="text-slate-600 max-w-3xl mt-2">Monitor your account's recent activity and security events to ensure your data remains protected.</p>
                    </div>
                </div>

                {/* Timeline Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8">
                        <ActivityTimeline />
                    </div>
                </div>

                {/* Info Banner */}
                <div className="p-6 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0d9488] shadow-sm shrink-0">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 mb-1">Privacy is our priority</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Your security logs are encrypted and visible only to you. If you notice any suspicious activity, change your password immediately or contact support.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}