import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { authFetch } from '@/lib/authSession';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('Session ID manquant');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await authFetch(`/payments/session/${sessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStatus('success');
            setMessage(`Félicitations ! Vous êtes maintenant passé au plan ${data.plan}.`);
          } else {
            setStatus('error');
            setMessage('Le paiement n\'a pas pu être vérifié.');
          }
        } else {
          setStatus('error');
          setMessage('Erreur lors de la vérification du paiement.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Erreur de connexion au serveur.');
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, border: '4px solid #e2e8f0', borderTop: '4px solid #0d9488', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p style={{ color: '#64748b', fontSize: 16 }}>Vérification du paiement...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
      <div style={{
        background: 'white',
        borderRadius: 20,
        padding: '40px',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}>
        {status === 'success' ? (
          <>
            <CheckCircle size={80} style={{ color: '#10b981', marginBottom: '20px' }} />
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Paiement réussi !
            </h1>
            <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
              {message}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'linear-gradient(135deg, #0d9488, #10b981)',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 auto',
                transition: 'all 0.3s'
              }}
            >
              Voir mon dashboard
              <ArrowRight size={20} />
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: 80, height: 80,
              background: '#fee2e2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <span style={{ fontSize: 40, color: '#ef4444' }}>×</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Erreur de paiement
            </h1>
            <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/upgrade')}
                style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Réessayer
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  background: '#0d9488',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
