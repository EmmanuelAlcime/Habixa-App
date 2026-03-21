/**
 * Global Zustand store.
 * Replaces the pattern of calling useProfile() in every screen.
 * Single source of truth for: auth'd user profile, subscription tier, search filters.
 */
import { create } from 'zustand';
import { api, Endpoints } from '@/lib/api/client';
import type { Profile } from '@/hooks/useProfile';

export type SubscriptionTier = 'free' | 'basic' | 'pro';

export interface SearchFilters {
  q: string;
  type: string | null;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
  country: string | null;
  city: string | null;
}

interface AppState {
  // ── Profile ──────────────────────────────────────────────────────────────
  profile: Profile | null;
  profileLoading: boolean;
  profileError: string | null;
  loadProfile: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  clearProfile: () => void;

  // ── Subscription ─────────────────────────────────────────────────────────
  subscriptionTier: SubscriptionTier;
  activeListingCount: number;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  setActiveListingCount: (count: number) => void;

  // ── Search filters ────────────────────────────────────────────────────────
  searchFilters: SearchFilters;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  resetSearchFilters: () => void;

  // ── Unread counts ─────────────────────────────────────────────────────────
  unreadMessages: number;
  unreadNotifications: number;
  setUnreadMessages: (count: number) => void;
  setUnreadNotifications: (count: number) => void;
}

const defaultSearchFilters: SearchFilters = {
  q: '',
  type: null,
  bedrooms: null,
  minPrice: null,
  maxPrice: null,
  sort: 'relevance',
  country: null,
  city: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  // ── Profile ──────────────────────────────────────────────────────────────
  profile: null,
  profileLoading: false,
  profileError: null,

  loadProfile: async () => {
    if (get().profileLoading) return;
    set({ profileLoading: true, profileError: null });
    try {
      const data = await api.get<{
        id: number;
        name: string;
        email: string;
        role?: string;
        bio?: string | null;
        phone?: string | null;
        city?: string | null;
        region?: string | null;
        country?: string | null;
        avatar_url?: string | null;
        email_verified_at?: string | null;
        phone_verified_at?: string | null;
        id_verified_at?: string | null;
        created_at?: string;
        landlord_score?: { score: number; review_count: number } | null;
        tenant_score?: { score: number; review_count: number } | null;
        subscription_tier?: SubscriptionTier;
        two_factor_enabled?: boolean;
        two_factor_type?: 'sms' | 'email' | null;
      }>(Endpoints.users.me());

      const profile: Profile = {
        id: String(data.id),
        name: data.name,
        email: data.email,
        role: data.role,
        bio: data.bio,
        phone: data.phone,
        city: data.city,
        region: data.region,
        country: data.country,
        avatar_url: data.avatar_url,
        email_verified_at: data.email_verified_at,
        phone_verified_at: data.phone_verified_at,
        id_verified_at: data.id_verified_at,
        created_at: data.created_at,
        landlord_score: data.landlord_score ?? null,
        tenant_score: data.tenant_score ?? null,
        two_factor_enabled: data.two_factor_enabled ?? false,
        two_factor_type: data.two_factor_type ?? null,
      };

      set({
        profile,
        subscriptionTier: data.subscription_tier ?? 'free',
        // Pre-fill search location from profile
        searchFilters: {
          ...get().searchFilters,
          country: data.country ?? get().searchFilters.country,
          city: data.city ?? get().searchFilters.city,
        },
      });
    } catch (e) {
      const err = e as { message?: string };
      set({ profileError: err?.message ?? 'Failed to load profile' });
    } finally {
      set({ profileLoading: false });
    }
  },

  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null, subscriptionTier: 'free', activeListingCount: 0 }),

  // ── Subscription ─────────────────────────────────────────────────────────
  subscriptionTier: 'free',
  activeListingCount: 0,
  setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),
  setActiveListingCount: (count) => set({ activeListingCount: count }),

  // ── Search filters ────────────────────────────────────────────────────────
  searchFilters: defaultSearchFilters,
  setSearchFilters: (partial) =>
    set((s) => ({ searchFilters: { ...s.searchFilters, ...partial } })),
  resetSearchFilters: () => set({ searchFilters: defaultSearchFilters }),

  // ── Unread counts ─────────────────────────────────────────────────────────
  unreadMessages: 0,
  unreadNotifications: 0,
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
}));

// ── Selector helpers ──────────────────────────────────────────────────────────
// Use these to avoid subscribing to the whole store in components.
export const useProfile2 = () => useAppStore((s) => s.profile);
export const useSubscriptionTier = () => useAppStore((s) => s.subscriptionTier);
export const useSearchFilters = () => useAppStore((s) => s.searchFilters);
