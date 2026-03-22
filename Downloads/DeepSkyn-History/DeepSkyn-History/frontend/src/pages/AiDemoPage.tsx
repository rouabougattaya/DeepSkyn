/**
 * AiDemoPage - Test tool for the multi-condition scoring engine.
 * Uses the same logic as SkinAnalysisPage but with test indicators.
 */
import SkinAnalysisPage from './SkinAnalysisPage';
import { Bug } from 'lucide-react';

export default function AiDemoPage() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Demo Mode Badge Overlay */}
      <div style={{
        position: 'fixed', top: 80, right: 20, zIndex: 100,
        background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: 12, padding: '8px 16px', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none'
      }}>
        <Bug size={14} style={{ color: '#a78bfa' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Scoring Engine (Demo / Test Mode)
        </span>
      </div>

      <SkinAnalysisPage />

      {/* Footer Info */}
      <div style={{
        textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.2)', fontSize: 11, background: '#0a0f1e'
      }}>
        Developer Mode: All analyses are persisted in the database with the ID 'demo-user' if not logged in.
      </div>
    </div>
  );
}
