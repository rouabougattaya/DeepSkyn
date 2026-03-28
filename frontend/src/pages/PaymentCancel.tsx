import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();

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
        <div style={{
          width: 80, height: 80,
          background: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <X size={40} style={{ color: '#ef4444' }} />
        </div>
        
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          Paiement annulé
        </h1>
        
        <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
          Vous avez annulé le processus de paiement. Aucun montant n'a été débité de votre compte.
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
            Réessayer le paiement
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
            Retour au dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
