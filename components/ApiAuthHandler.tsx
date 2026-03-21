import { useEffect, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { setOnUnauthenticated } from '@/lib/api/client';

/** Auth routes where 401 should NOT trigger logout/redirect (avoids logout loop) */
function isAuthScreen(pathname: string): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  return (
    p.includes('(auth)') ||
    p.endsWith('/login') ||
    p.endsWith('/register') ||
    p.endsWith('/onboarding') ||
    p.includes('forgot-password') ||
    p.includes('reset-password')
  );
}

/**
 * Registers a global handler: when the API returns 401 on any authenticated
 * request, log the user out and redirect to login — but only when on protected
 * screens. Skips logout on auth screens (login, register, etc.) to avoid loops.
 */
export function ApiAuthHandler() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    setOnUnauthenticated(() => {
      if (isAuthScreen(pathnameRef.current)) return;
      logout();
      router.replace('/(auth)/login');
    });
    return () => setOnUnauthenticated(null);
  }, [logout]);

  return null;
}
