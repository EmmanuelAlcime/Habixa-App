import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, setAuthToken, Endpoints } from '@/lib/api/client';
import { storage } from '@/lib/storage';
import { registerPushToken } from '@/lib/notifications';
import { disconnectPusher } from '@/lib/pusher';
import { useAppStore } from '@/store/useAppStore';

const AUTH_USER_KEY = '@habixa_user';
const AUTH_TOKEN_KEY = '@habixa_token';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (idToken: string, fullName?: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  register: (name: string, email: string, password: string, accountType: 'tenant' | 'list_land' | 'list_house' | 'both', phone: string, location?: { city: string; region?: string; postalCode?: string; country: string }, demographics?: { dateOfBirth: string; gender: 'male' | 'female' | 'prefer_not_to_say' }) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function toUser(raw: { id: number; name: string; email: string; role?: string }): User {
  return { id: String(raw.id), name: raw.name, email: raw.email, role: raw.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const { loadProfile, clearProfile } = useAppStore();

  useEffect(() => { loadAuth(); }, []);

  useEffect(() => {
    if (user) { registerPushToken().catch(() => {}); }
  }, [user?.id]);

  // Re-sync token on hot reload
  useEffect(() => {
    if (!user) return;
    storage.getItem(AUTH_TOKEN_KEY).then((t) => { if (t) setAuthToken(t); });
  }, [user?.id]);

  async function loadAuth() {
    try {
      const [storedToken, storedUser, storedOnboarding] = await Promise.all([
        storage.getItem(AUTH_TOKEN_KEY),
        storage.getItem(AUTH_USER_KEY),
        storage.getItem('@habixa_onboarding'),
      ]);
      if (storedOnboarding === 'true') setHasSeenOnboarding(true);

      if (storedToken) {
        setAuthToken(storedToken);
        try {
          const me = await api.get<{ id: number; name: string; email: string; role?: string }>(Endpoints.users.me());
          const u = toUser(me);
          setUser(u);
          await storage.setItem(AUTH_USER_KEY, JSON.stringify(u));
          // Load full profile into global store (single call — all screens read from store)
          await loadProfile();
        } catch (e: unknown) {
          const err = e as { status?: number };
          if (err?.status === 401) {
            setAuthToken(null); setUser(null);
            await storage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
          } else {
            if (storedUser) setUser(JSON.parse(storedUser));
          }
        }
      }
    } catch (e) {
      console.warn('Auth load error:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function afterLogin(res: { user: { id: number; name: string; email: string; role?: string }; token: string }) {
    if (!res?.token || !res?.user) throw new Error('Invalid login response');
    setAuthToken(res.token);
    const u = toUser(res.user);
    setUser(u);
    await Promise.all([
      storage.setItem(AUTH_TOKEN_KEY, res.token),
      storage.setItem(AUTH_USER_KEY, JSON.stringify(u)),
    ]);
    // Single profile load — all screens subscribe to store
    await loadProfile().catch(() => {});
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ user: { id: number; name: string; email: string; role?: string }; token: string }>(
      Endpoints.auth.login(), { email, password }, { skipAuth: true }
    );
    await afterLogin(res);
  }

  async function loginWithGoogle(idToken: string) {
    const res = await api.post<{ user: { id: number; name: string; email: string; role?: string }; token: string }>(
      Endpoints.auth.google(), { id_token: idToken }, { skipAuth: true }
    );
    await afterLogin(res);
  }

  async function loginWithApple(idToken: string, fullName?: string) {
    const res = await api.post<{ user: { id: number; name: string; email: string; role?: string }; token: string }>(
      Endpoints.auth.apple(), { id_token: idToken, full_name: fullName }, { skipAuth: true }
    );
    await afterLogin(res);
  }

  async function loginWithFacebook(accessToken: string) {
    const res = await api.post<{ user: { id: number; name: string; email: string; role?: string }; token: string }>(
      Endpoints.auth.facebook(), { access_token: accessToken }, { skipAuth: true }
    );
    await afterLogin(res);
  }

  async function register(name: string, email: string, password: string, accountType: 'tenant' | 'list_land' | 'list_house' | 'both', phone: string, location?: { city: string; region?: string; postalCode?: string; country: string }, demographics?: { dateOfBirth: string; gender: 'male' | 'female' | 'prefer_not_to_say' }) {
    const role = accountType === 'tenant' ? 'tenant' : 'landlord';
    const payload: Record<string, unknown> = {
      name,
      email,
      password,
      password_confirmation: password,
      role,
      phone: phone.trim(),
      ...(location && { city: location.city, region: location.region ?? null, postal_code: location.postalCode ?? null, country: location.country }),
    };
    if (demographics) {
      payload.date_of_birth = demographics.dateOfBirth;
      payload.gender = demographics.gender;
    }
    const res = await api.post<{ user: { id: number; name: string; email: string; role?: string }; token: string }>(
      Endpoints.auth.register(),
      payload,
      { skipAuth: true }
    );
    await afterLogin(res);
  }

  async function logout() {
    try {
      await api.post(Endpoints.authProtected.logout(), undefined, { skipUnauthCallback: true });
    } catch {}
    disconnectPusher();
    setAuthToken(null);
    setUser(null);
    clearProfile();
    await storage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  }

  async function completeOnboarding() {
    setHasSeenOnboarding(true);
    await storage.setItem('@habixa_onboarding', 'true');
  }

  async function resetOnboarding() {
    setHasSeenOnboarding(false);
    await storage.removeItem('@habixa_onboarding');
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, hasSeenOnboarding, login, loginWithGoogle, loginWithApple, loginWithFacebook, register, logout, completeOnboarding, resetOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
