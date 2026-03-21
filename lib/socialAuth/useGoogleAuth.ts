/**
 * Google OAuth via expo-auth-session.
 * Requires EXPO_PUBLIC_GOOGLE_CLIENT_ID (or platform-specific: ios, android, web) in .env.
 * For native redirects, use a Development Build (Expo Go cannot customize scheme).
 */

import { Platform } from 'react-native';
import { useAuthRequest } from 'expo-auth-session/providers/google';

// Hook requires a clientId (expo-auth-session throws otherwise). Use placeholder when not configured.
const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  'placeholder-no-google-client-id';

export function useGoogleAuth() {
  const clientId = Platform.select({
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? GOOGLE_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? GOOGLE_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? GOOGLE_CLIENT_ID,
  });

  const [request, response, promptAsync] = useAuthRequest({
    ...(clientId && {
      ...(Platform.OS === 'web'
        ? { webClientId: clientId }
        : Platform.OS === 'ios'
          ? { iosClientId: clientId }
          : { androidClientId: clientId }),
    }),
    redirectUriOptions: { scheme: 'habixa', path: 'auth/google' },
  });

  const idToken =
    response?.type === 'success'
      ? response.authentication?.idToken ??
        (response.params as Record<string, string>)?.['id_token']
      : null;

  return {
    promptAsync,
    response,
    idToken,
    isReady: !!request,
    hasClientId: !!clientId && !clientId.startsWith('placeholder'),
  };
}
