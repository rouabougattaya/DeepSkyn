/**
 * AnalysisDetail — renders a past analysis by ID from the legacy DB.
 * For the new multi-condition AI engine, see SkinAnalysisPage.tsx
 */
import React, { useState, useEffect } from 'react';
import { analysisService } from '../../services/analysisService';
import type { SkinAnalysis } from '../../types/analysis';
import { Activity } from 'lucide-react';

interface AnalysisDetailProps {
  analysisId: string;
}

export const AnalysisDetail: React.FC<AnalysisDetailProps> = ({ analysisId }) => {
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await analysisService.getAnalysisById(analysisId);
        setAnalysis(data);
      } catch {
        setError('Analyse non trouvée ou backend non connecté.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [analysisId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading analysis...</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: 200, gap: 12
      }}>
        <Activity size={32} style={{ color: '#d1d5db' }} />
        <div style={{ color: '#ef4444', fontSize: 14 }}>{error || 'Analyse non trouvée'}</div>
      </div>
    );
  }

  const score = analysis.skinScore || 0;
  const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
          Analyse #{analysisId.slice(0, 8)}
        </h1>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {new Date(analysis.createdAt).toLocaleString('fr-FR')}
        </span>
      </div>

      <div style={{
        background: '#f9fafb', border: '1px solid #e5e7eb',
        borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20
      }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor }}>{score}</div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>/ 100</div>
        <div style={{ fontSize: 13, color: scoreColor, fontWeight: 600, marginTop: 4 }}>
          {score >= 70 ? 'Excellent' : score >= 50 ? 'Moyen' : 'À améliorer'}
        </div>
      </div>

      {analysis.metrics && analysis.metrics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {analysis.metrics.map((metric: any) => (
            <div key={metric.id} style={{
              background: 'white', border: '1px solid #e5e7eb',
              borderRadius: 10, padding: 14, textAlign: 'center'
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                {metric.metricType}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                {metric.score?.toFixed(1)}
              </div>
              <div style={{ fontSize: 10, color: '#d1d5db' }}>{metric.severityLevel}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
