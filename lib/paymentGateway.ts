/**
 * Payment Gateway
 * IAP (Apple/Google) first on native mobile, Stripe as fallback.
 *
 * - iOS/Android: Try IAP first. Fall back to Stripe when IAP unavailable (web, simulator, etc.)
 * - Web: Stripe only (no IAP)
 * - Rent: Always Stripe (physical goods exempt from IAP rules)
 */

import { Platform } from 'react-native';

/** True when we should attempt IAP (native iOS/Android, not web) */
export function shouldUseIAP(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** True when Stripe is the only/first option (web or IAP unavailable) */
export function shouldUseStripeFallback(): boolean {
  return Platform.OS === 'web';
}

export type PaymentProduct =
  | 'subscription_basic'
  | 'subscription_pro'
  | 'boost'
  | 'premium_listing';

/** Product IDs for App Store Connect and Google Play Console */
export const IAP_PRODUCT_IDS: Record<PaymentProduct, string> = {
  subscription_basic: process.env.EXPO_PUBLIC_IAP_PRODUCT_BASIC ?? 'com.habixa.subscription.basic',
  subscription_pro: process.env.EXPO_PUBLIC_IAP_PRODUCT_PRO ?? 'com.habixa.subscription.pro',
  boost: process.env.EXPO_PUBLIC_IAP_PRODUCT_BOOST ?? 'com.habixa.boost',
  premium_listing: process.env.EXPO_PUBLIC_IAP_PRODUCT_PREMIUM ?? 'com.habixa.premium_listing',
};

/** Map payment product to API payload */
export function getIAPProductForTier(tier: 'basic' | 'pro'): PaymentProduct {
  return tier === 'pro' ? 'subscription_pro' : 'subscription_basic';
}
