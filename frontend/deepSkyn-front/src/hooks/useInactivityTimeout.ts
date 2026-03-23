import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_MS = 60 * 60 * 1000; // 1 heure

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

/**
 * Déconnecte l'utilisateur après 1 heure d'inactivité.
 * Réinitialise le timer à chaque interaction (souris, clavier, scroll, touch)
 * ou à chaque appel API via authFetch (événement 'session-activity').
 */
export function useInactivityTimeout(onExpire: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onExpireRef.current();
    }, INACTIVITY_MS);
  }, []);

  useEffect(() => {
    const handleActivity = () => reset();

    ACTIVITY_EVENTS.forEach((ev) => {
      window.addEventListener(ev, handleActivity);
    });
    window.addEventListener('session-activity', handleActivity);

    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => {
        window.removeEventListener(ev, handleActivity);
      });
      window.removeEventListener('session-activity', handleActivity);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [reset]);
}
