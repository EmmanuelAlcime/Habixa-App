/**
 * ConnectionRestoredToast
 * Shown when internet connection is restored. Auto-dismisses after a few seconds.
 * Hidden on web (offline detection is disabled there).
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnectivity } from '@/context/ConnectivityContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors } from '@/constants/theme';

const DISPLAY_DURATION_MS = 3500;

export function ConnectionRestoredToast() {
  const insets = useSafeAreaInsets();
  const { connectionRestored, clearConnectionRestored } = useConnectivity();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!connectionRestored) return;

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => clearConnectionRestored());
    }, DISPLAY_DURATION_MS);

    return () => clearTimeout(timer);
  }, [connectionRestored, clearConnectionRestored, translateY, opacity]);

  if (Platform.OS === 'web' || !connectionRestored) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { top: insets.top + 8, transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.iconWrap}>
        <HabixaIcon name="check-circle" size={18} color="#fff" solid />
      </View>
      <Text style={styles.text}>Internet connection restored</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sage,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    gap: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#fff',
    flex: 1,
  },
});
