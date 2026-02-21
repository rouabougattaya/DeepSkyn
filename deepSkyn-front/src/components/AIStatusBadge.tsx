import { Brain, Shield, AlertTriangle } from 'lucide-react';

interface AIStatusBadgeProps {
  verified: boolean;
  score: number;
  message?: string;
  compact?: boolean;
}

export default function AIStatusBadge({ 
  verified, 
  score, 
  message, 
  compact = false 
}: AIStatusBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100';
    if (score >= 0.6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getIcon = () => {
    if (verified) {
      return <Shield className="w-4 h-4 text-green-600" />;
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className={`text-sm font-medium ${getScoreColor(score)}`}>
          {Math.round(score * 100)}%
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full ${getScoreBgColor(score)}`}>
      <Brain className="w-4 h-4 text-slate-600" />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-600">AI Verification</span>
        <div className="flex items-center gap-1">
          {getIcon()}
          <span className={`text-sm font-bold ${getScoreColor(score)}`}>
            {verified ? 'Verified' : 'Unverified'}
          </span>
          <span className={`text-xs ${getScoreColor(score)}`}>
            ({Math.round(score * 100)}%)
          </span>
        </div>
        {message && (
          <span className="text-xs text-slate-500 mt-1">{message}</span>
        )}
      </div>
    </div>
  );
}
