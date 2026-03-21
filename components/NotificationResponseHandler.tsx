import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  isExpoGoAndroid,
  setupNotificationResponseListener,
  setNotificationTapHandler,
} from '@/lib/notifications';

/**
 * Listens for push notification taps and navigates to the appropriate screen.
 * Must be mounted inside the router context (e.g. as child of Stack).
 * No-op in Expo Go on Android (push not supported in SDK 53+).
 */
export function NotificationResponseHandler() {
  const router = useRouter();

  useEffect(() => {
    if (isExpoGoAndroid()) return;

    setNotificationTapHandler((data) => {
      if (data.conversation_id) {
        router.push(`/(tabs)/(messages)/${data.conversation_id}`);
      } else if (data.type === 'rent_reminder' && data.lease_id) {
        router.push({
          pathname: '/modal/pay-rent',
          params: {
            leaseId: String(data.lease_id),
            ...(data.amount != null && { amount: String(data.amount) }),
            currency: data.currency ?? 'USD',
            landlordName: data.landlordName ?? '',
            landlordCountry: data.landlordCountry ?? '',
          },
        });
      } else if (data.url) {
        router.push(data.url as `/${string}`);
      } else if (data.listing_id) {
        router.push(`/(tabs)/(home)/listing/${data.listing_id}`);
      }
    });

    const cleanup = setupNotificationResponseListener();
    return () => {
      setNotificationTapHandler(null);
      cleanup();
    };
  }, [router]);

  return null;
}
