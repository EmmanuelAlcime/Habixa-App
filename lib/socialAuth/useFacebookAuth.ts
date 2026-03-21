/**
 * Facebook OAuth via expo-auth-session.
 * Requires EXPO_PUBLIC_FACEBOOK_APP_ID in .env.
 * For native redirects, use a Development Build (Expo Go cannot customize scheme).
 */

import { Platform } from 'react-native';
import { useAuthRequest } from 'expo-auth-session/providers/facebook';

// Hook requires a clientId. Use placeholder when not configured.
const FACEBOOK_APP_ID =
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'placeholder-no-facebook-app-id';

export function useFacebookAuth() {
  const clientId = FACEBOOK_APP_ID;

  const [request, response, promptAsync] = useAuthRequest({
    ...(clientId && {
      ...(Platform.OS === 'web'
        ? { webClientId: clientId }
        : Platform.OS === 'ios'
          ? { iosClientId: clientId }
          : { androidClientId: clientId }),
    }),
    redirectUriOptions: { scheme: 'habixa', path: 'auth/facebook' },
  });

  const accessToken =
    response?.type === 'success'
      ? (response.params as Record<string, string>)?.['access_token']
      : null;

  return {
    promptAsync,
    response,
    accessToken,
    isReady: !!request,
    hasClientId: !!clientId && !clientId.startsWith('placeholder'),
  };
}
