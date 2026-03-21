/**
 * usePaymentFlow — IAP first, Stripe fallback.
 * On iOS/Android: tries in-app purchase first; falls back to Stripe when IAP unavailable.
 * On web: Stripe only.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api, Endpoints } from '@/lib/api/client';
import {
  shouldUseIAP,
  IAP_PRODUCT_IDS,
  type PaymentProduct,
} from '@/lib/paymentGateway';

type StripeFallbackFn = () => Promise<boolean>;

/** IAP unavailable in Expo Go (no native NitroModules). Use dev build for IAP. */
function isIAPUnavailable(): boolean {
  if (Platform.OS === 'web') return true;
  if (Constants.appOwnership === 'expo') return true;
  return false;
}

/**
 * Attempt IAP purchase, then verify with backend. Returns true on success.
 * Falls back to Stripe by returning false (caller runs Stripe flow).
 */
export async function tryIAPThenStripe(
  productId: PaymentProduct,
  options: { listingId?: string },
  stripeFallback: StripeFallbackFn
): Promise<boolean> {
  if (!shouldUseIAP() || Platform.OS === 'web' || isIAPUnavailable()) {
    return stripeFallback();
  }

  try {
    const rnIap = await import('react-native-iap');
    const sku = IAP_PRODUCT_IDS[productId];

    const connected = await rnIap.initConnection();
    if (!connected) {
      return stripeFallback();
    }

    const purchase = await new Promise<{ transactionReceipt?: string; purchaseToken?: string } | null>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove();
          resolve(null);
        }, 120000);

        const sub = rnIap.purchaseUpdatedListener((p: { productId?: string; transactionReceipt?: string; purchaseToken?: string }) => {
          if (p?.productId === sku) {
            clearTimeout(timeout);
            sub.remove();
            resolve(p);
          }
        });

        const isSub = productId.startsWith('subscription_');
        const req =
          Platform.OS === 'ios'
            ? { request: { apple: { sku } }, type: isSub ? 'subs' as const : 'in-app' as const }
            : { request: { google: { skus: [sku] } }, type: isSub ? 'subs' as const : 'in-app' as const };
        rnIap.requestPurchase(req).catch((err: Error) => {
          clearTimeout(timeout);
          sub.remove();
          reject(err);
        });
      }
    );

    if (!purchase) {
      return stripeFallback();
    }

    const platform = Platform.OS === 'ios' ? 'apple' : 'google';
    const p = purchase as { transactionReceipt?: string; purchaseToken?: string; receipt?: string };
    const receipt =
      platform === 'apple'
        ? (p.transactionReceipt ?? p.purchaseToken ?? p.receipt)
        : p.purchaseToken;

    if (!receipt) {
      return stripeFallback();
    }

    const res = await api.post<{
      granted?: boolean;
      premium?: boolean;
      boosted?: boolean;
    }>(Endpoints.payments.iapVerify(), {
      platform,
      product_id: sku,
      receipt,
      listing_id: options.listingId ?? undefined,
    });

    const iapOk = Boolean(res?.granted || res?.premium === true || res?.boosted === true);
    if (iapOk) {
      const isConsumable = productId === 'boost' || productId === 'premium_listing';
      const pForFinish = purchase as { id?: string; transactionId?: string; purchaseToken?: string };
      if (pForFinish.id || pForFinish.transactionId || pForFinish.purchaseToken) {
        await rnIap.finishTransaction({ purchase: pForFinish, isConsumable }).catch(() => {});
      }
      return true;
    }

    return stripeFallback();
  } catch (e) {
    const msg = (e as Error)?.message ?? '';
    if (
      msg.includes('canceled') ||
      msg.includes('user_canceled') ||
      msg.includes('User canceled') ||
      msg.includes('E_USER_CANCELLED')
    ) {
      return false;
    }
    return stripeFallback();
  }
}
