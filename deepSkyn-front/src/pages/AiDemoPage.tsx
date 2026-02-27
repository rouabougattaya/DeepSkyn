/**
 * AiDemoPage - Outil de test pour le moteur de scoring multi-conditions.
 * Utilise la même logique que SkinAnalysisPage mais avec des indicateurs de test.
 */
import SkinAnalysisPage from './SkinAnalysisPage';
import { Bug } from 'lucide-react';

export default function AiDemoPage() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Overlay de badge Mode Démo */}
      <div style={{
        position: 'fixed', top: 80, right: 20, zIndex: 100,
        background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: 12, padding: '8px 16px', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none'
      }}>
        <Bug size={14} style={{ color: '#a78bfa' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Moteur de Scoring (Mode Démo / Test)
        </span>
      </div>

      <SkinAnalysisPage />

      {/* Footer Info */}
      <div style={{
        textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.2)', fontSize: 11, background: '#0a0f1e'
      }}>
        Mode Développeur : Toutes les analyses sont persistées en base avec l'ID 'demo-user' si non connecté.
      </div>
    </div>
  );
}
