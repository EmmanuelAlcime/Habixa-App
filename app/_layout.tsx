import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import 'react-native-reanimated';

import { View } from 'react-native';
import { setApiBaseUrl } from '@/lib/api/client';
import { AuthProvider } from '@/context/AuthContext';
import { ApiAuthHandler } from '@/components/ApiAuthHandler';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { PremiumProvider } from '@/context/PremiumContext';
import { ConnectivityProvider } from '@/context/ConnectivityContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NotificationResponseHandler } from '@/components/NotificationResponseHandler';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ConnectionRestoredToast } from '@/components/ConnectionRestoredToast';
import { MessageNotificationProvider } from '@/context/MessageNotificationContext';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

function ApiInit() {
  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
    setApiBaseUrl(url);
  }, []);
  return null;
}

function ThemedStatusBar() {
  const { colorScheme } = useTheme();
  // Dark mode: white icons. Light mode: dark icons.
  const barStyle = colorScheme === 'dark' ? 'light' : 'dark';
  return <StatusBar style={barStyle} />;
}

export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular, PlayfairDisplay_700Bold,
    DMSans_300Light, DMSans_400Regular, DMSans_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <ErrorBoundary>
          <ThemeProvider>
            <ConnectivityProvider>
              <ApiInit />
              <AuthProvider>
              <ApiAuthHandler />
              <PremiumProvider>
                <MessageNotificationProvider>
                <NotificationResponseHandler />
                <View style={{ flex: 1 }}>
                  <OfflineBanner />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="profile/[id]" options={{ presentation: 'card' }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                  </Stack>
                  <ConnectionRestoredToast />
                </View>
                <ThemedStatusBar />
                </MessageNotificationProvider>
              </PremiumProvider>
            </AuthProvider>
          </ConnectivityProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
