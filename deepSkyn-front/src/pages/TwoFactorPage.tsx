import { TwoFactorVerify } from '../components/TwoFactorVerify';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getTwoFASession, clearTwoFASession } from '@/lib/twoFASession';

export function TwoFactorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Essayer d'abord location.state (navigation directe)
    let loginState = location.state?.loginData;
    
    // Si pas de state, essayer sessionStorage (après refresh de page)
    if (!loginState) {
      const sessionData = getTwoFASession();
      if (sessionData) {
        loginState = {
          requiresTwoFa: true,
          user: sessionData,
        };
        console.log('2FA session restored from sessionStorage:', sessionData);
      }
    }
    
    console.log('TwoFactorPage - loginState from location:', loginState);
    
    if (!loginState || !loginState.requiresTwoFa) {
      console.error('No valid 2FA login state, redirecting to login');
      clearTwoFASession();
      navigate('/login', { replace: true });
      return;
    }

    console.log('Setting user:', loginState.user);
    setUser(loginState.user);
  }, [location, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-300">Chargement...</div>
      </div>
    );
  }

  return <TwoFactorVerify user={user} />;
}
