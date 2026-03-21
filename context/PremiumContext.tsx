/**
 * PremiumContext
 * Central source of truth for subscription tier, listing limits, and boost purchases.
 *
 * Tier limits:
 *   free:  1 active listing, no boost
 *   basic: 5 active listings, boost available ($15/listing/7 days)
 *   pro:   unlimited listings, 2 free boosts/month, then $15
 */
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { api, Endpoints } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { useAppStore, type SubscriptionTier } from '@/store/useAppStore';
import { t } from '@/lib/i18n';
import { tryIAPThenStripe } from '@/hooks/usePaymentFlow';
import { getIAPProductForTier } from '@/lib/paymentGateway';

// ── Tier rules ────────────────────────────────────────────────────────────────
export const TIER_LIMITS: Record<SubscriptionTier, {
  maxListings: number;       // -1 = unlimited
  canBoost: boolean;
  freeBoostsPerMonth: number;
  monthlyPriceUSD: number;
  boostPriceUSD: number;
  label: string;
}> = {
  free: {
    maxListings: 1,
    canBoost: false,
    freeBoostsPerMonth: 0,
    monthlyPriceUSD: 0,
    boostPriceUSD: 0,
    label: 'Free',
  },
  basic: {
    maxListings: 5,
    canBoost: true,
    freeBoostsPerMonth: 0,
    monthlyPriceUSD: 20,
    boostPriceUSD: 15,
    label: 'Basic',
  },
  pro: {
    maxListings: -1,
    canBoost: true,
    freeBoostsPerMonth: 2,
    monthlyPriceUSD: 79,
    boostPriceUSD: 15,
    label: 'Pro',
  },
};

// ── Context interface ─────────────────────────────────────────────────────────
interface PremiumContextType {
  tier: SubscriptionTier;
  limits: typeof TIER_LIMITS[SubscriptionTier];

  /** True if user can create another listing at their current tier */
  canCreateListing: boolean;

  /** True if user can boost listings at their current tier */
  canBoostListing: boolean;

  /** Number of currently active listings */
  activeListingCount: number;

  /** How many boosts user has used this month (pro tier) */
  boostsUsedThisMonth: number;

  /** Initiate a Stripe subscription for the given tier */
  subscribe: (tier: SubscriptionTier) => Promise<void>;

  /** Boost a specific listing — opens Stripe PaymentSheet if paid tier, or free boost if pro */
  boostListing: (listingId: string, targeting?: { countries?: string[]; regions?: string[]; cities?: string[] } | null) => Promise<boolean>;

  /** Upgrade a listing to Premium ($19, 30 days) — opens Stripe PaymentSheet */
  upgradeListingToPremium: (listingId: string, targeting?: { countries?: string[]; regions?: string[]; cities?: string[] } | null) => Promise<boolean>;

  /** Show the upgrade modal if the user is on a lower tier */
  promptUpgrade: (reason?: string) => void;

  /** Refresh subscription status from API */
  refresh: () => Promise<void>;

  loading: boolean;
}

const PremiumContext = createContext<PremiumContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function PremiumProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { subscriptionTier, setSubscriptionTier, activeListingCount, setActiveListingCount } =
    useAppStore();
  const [boostsUsedThisMonth, setBoostsUsedThisMonth] = useState(0);
  const [loading, setLoading] = useState(false);

  const tier = subscriptionTier;
  const limits = TIER_LIMITS[tier];

  const canCreateListing =
    limits.maxListings === -1 || activeListingCount < limits.maxListings;

  const canBoostListing = limits.canBoost;

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{
        subscription_tier?: SubscriptionTier;
        active_listing_count?: number;
        boosts_used_this_month?: number;
      }>(Endpoints.users.me());
      if (res.subscription_tier) setSubscriptionTier(res.subscription_tier);
      if (res.active_listing_count != null) setActiveListingCount(res.active_listing_count);
      if (res.boosts_used_this_month != null) setBoostsUsedThisMonth(res.boosts_used_this_month);
    } catch {
      // Non-fatal — keep existing values
    }
  }, [setSubscriptionTier, setActiveListingCount]);

  useEffect(() => {
    if (user) refresh();
  }, [user?.id, refresh]);

  const subscribe = useCallback(async (newTier: SubscriptionTier) => {
    setLoading(true);
    try {
      const success = await tryIAPThenStripe(
        getIAPProductForTier(newTier),
        {},
        async () => {
          const res = await api.post<{ checkout_url?: string }>('/api/subscriptions', {
            tier: newTier,
          });
          if (res.checkout_url) {
            const { openBrowserAsync } = await import('expo-web-browser');
            await openBrowserAsync(res.checkout_url);
            await refresh();
            return true;
          }
          return false;
        }
      );
      if (success) await refresh();
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Subscription error', err?.message ?? 'Could not start subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const boostListing = useCallback(async (
    listingId: string,
    targeting?: { countries?: string[]; regions?: string[]; cities?: string[] } | null
  ): Promise<boolean> => {
    if (!canBoostListing) {
      promptUpgrade('boost');
      return false;
    }

    // Pro users with free boosts remaining — no payment needed
    const hasFreeBoost =
      tier === 'pro' && boostsUsedThisMonth < limits.freeBoostsPerMonth;

    if (hasFreeBoost) {
      try {
        await api.post(Endpoints.listings.promote(listingId), {
          free_boost: true,
          ...(targeting && { targeting }),
        });
        setBoostsUsedThisMonth((n) => n + 1);
        return true;
      } catch (e) {
        const err = e as { message?: string };
        Alert.alert('Error', err?.message ?? 'Could not boost listing.');
        return false;
      }
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Available in the app',
        'Listing boosts are available in the Habixa iOS and Android app.'
      );
      return false;
    }

    try {
      setLoading(true);
      const success = await tryIAPThenStripe(
        'boost',
        { listingId },
        async () => {
          const res = await api.post<{ client_secret: string }>(
            Endpoints.listings.promote(listingId),
            { paid_boost: true, ...(targeting && { targeting }) }
          );
          if (!res.client_secret) throw new Error('No payment intent returned');
          const { initPaymentSheet, presentPaymentSheet } = await import(
            '@stripe/stripe-react-native'
          );
          const { error: initError } = await initPaymentSheet({
            paymentIntentClientSecret: res.client_secret,
            merchantDisplayName: 'Habixa',
            style: 'automatic',
          });
          if (initError) throw new Error(initError.message);
          const { error: presentError } = await presentPaymentSheet();
          if (presentError) {
            if (presentError.code !== 'Canceled') {
              Alert.alert('Payment failed', presentError.message);
            }
            return false;
          }
          return true;
        }
      );
      return success;
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Payment failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [canBoostListing, tier, boostsUsedThisMonth, limits.freeBoostsPerMonth]);

  const upgradeListingToPremium = useCallback(async (
    listingId: string,
    targeting?: { countries?: string[]; regions?: string[]; cities?: string[] } | null
  ): Promise<boolean> => {
    if (Platform.OS === 'web') {
      try {
        setLoading(true);
        const res = await api.post<{ checkout_url?: string }>(
          Endpoints.payments.listingFee(),
          { listing_id: listingId, platform: 'web', ...(targeting && { targeting }) }
        );
        if (res.checkout_url) {
          const { openBrowserAsync } = await import('expo-web-browser');
          await openBrowserAsync(res.checkout_url);
          return true;
        }
        return false;
      } catch (e) {
        const err = e as { message?: string };
        Alert.alert('Error', err?.message ?? 'Could not start payment.');
        return false;
      } finally {
        setLoading(false);
      }
    }

    try {
      setLoading(true);
      const success = await tryIAPThenStripe(
        'premium_listing',
        { listingId },
        async () => {
          const res = await api.post<{ client_secret: string }>(
            Endpoints.payments.listingFee(),
            { listing_id: listingId, ...(targeting && { targeting }) }
          );
          if (!res.client_secret) throw new Error('No payment intent returned');
          const { initPaymentSheet, presentPaymentSheet } = await import(
            '@stripe/stripe-react-native'
          );
          const { error: initError } = await initPaymentSheet({
            paymentIntentClientSecret: res.client_secret,
            merchantDisplayName: 'Habixa',
            style: 'automatic',
          });
          if (initError) throw new Error(initError.message);
          const { error: presentError } = await presentPaymentSheet();
          if (presentError) {
            if (presentError.code !== 'Canceled') {
              Alert.alert('Payment failed', presentError.message);
            }
            return false;
          }
          // Sync Premium when Stripe webhooks are not configured (local/dev) or are delayed
          const piMatch = res.client_secret?.match(/^(pi_[^_]+)/);
          if (piMatch?.[1]) {
            try {
              await api.post(Endpoints.payments.listingFeeConfirm(), {
                payment_intent_id: piMatch[1],
              });
            } catch {
              /* Webhook may have applied already */
            }
          }
          return true;
        }
      );
      return success;
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Payment failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const promptUpgrade = useCallback((reason?: string) => {
    router.push({ pathname: '/modal/upgrade', params: { reason: reason ?? '' } });
  }, [router]);

  return (
    <PremiumContext.Provider
      value={{
        tier,
        limits,
        canCreateListing,
        canBoostListing,
        activeListingCount,
        boostsUsedThisMonth,
        subscribe,
        boostListing,
        upgradeListingToPremium,
        promptUpgrade,
        refresh,
        loading,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
