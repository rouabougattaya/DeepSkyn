import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';

interface SkinAgeInsightCardProps {
  insight: any;
  loading: boolean;
  onRefresh: () => void;
}

export const SkinAgeInsightCard: React.FC<SkinAgeInsightCardProps> = ({ insight, loading, onRefresh }) => {
  if (loading) {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        textAlign: 'center'
      }}>
        <RefreshCw size={20} className="animate-spin" style={{ color: '#0d9488' }} />
      </div>
    );
  }

  if (!insight) {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        textAlign: 'center'
      }}>
        <p style={{ color: '#64748b' }}>No skin age data available</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Skin Age Analysis</h3>
        <button onClick={onRefresh} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={16} style={{ color: '#64748b' }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Your Age</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{insight.realAge}</div>
        </div>
        <div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Skin Age</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: insight.status === 'younger' ? '#10b981' : insight.status === 'older' ? '#ef4444' : '#64748b' }}>
            {insight.skinAge}
          </div>
        </div>
      </div>
      <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12 }}>
        <p style={{ fontSize: 14, color: '#0f172a', marginBottom: 8 }}>Analysis</p>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{insight.advice}</p>
      </div>
    </div>
  );
};
