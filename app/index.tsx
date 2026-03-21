import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import { useAuth } from '@/context/AuthContext';
import { HabixaLogo } from '@/components/HabixaLogo';
import { Colors, Fonts } from '@/constants/theme';

export default function SplashScreen() {
  const { user, hasSeenOnboarding, isLoading } = useAuth();
  const router = useRouter();
  const authRef = useRef({ user, hasSeenOnboarding });
  authRef.current = { user, hasSeenOnboarding };

  const logoScale = useRef(new Animated.Value(0.78)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(24)).current;
  const hasNavigated = useRef(false);
  const animationDone = useRef(false);
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const tryNavigate = useRef(() => {
    if (hasNavigated.current) return;
    if (!animationDone.current || isLoadingRef.current) return;
    hasNavigated.current = true;
    const { user: u, hasSeenOnboarding: seen } = authRef.current;
    if (!seen) {
      router.replace('/(auth)/onboarding');
    } else if (!u) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(tabs)/(home)');
    }
  });

  useEffect(() => {
    // Request location permission early so onboarding can show nearby ratings
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const runAnimation = () => {
      Animated.sequence([
        // Logo pops in
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        // Wordmark + tagline fade up
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(textY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }),
        ]),
      ]).start(() => {
        animationDone.current = true;
        // Short hold, then try navigate (auth must be loaded - fixes session persistence on refresh)
        setTimeout(() => tryNavigate.current(), 800);
      });
    };

    runAnimation();
  }, []);

  // When auth finishes loading, try to navigate (in case animation already completed)
  useEffect(() => {
    if (!isLoading) {
      tryNavigate.current();
    }
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <HabixaLogo width={90} height={96} variant="dark" />
      </Animated.View>

      <Animated.View
        style={[
          styles.textWrap,
          {
            opacity: textOpacity,
            transform: [{ translateY: textY }],
          },
        ]}
      >
        <Text style={styles.wordmark}>
          Habi<Text style={styles.accent}>xa</Text>
        </Text>
        <Text style={styles.tagline}>WORKS BOTH WAYS</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.midnightInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: 20,
  },
  textWrap: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: 42,
    color: Colors.desertSand,
    letterSpacing: -1,
    textAlign: 'center',
  },
  accent: {
    color: Colors.terracotta,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 3.5,
    color: Colors.sky,
    textAlign: 'center',
    marginTop: 8,
  },
});
