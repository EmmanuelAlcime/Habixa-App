/**
 * OfflineBanner
 * Shown when user has no internet connection. Indicates cached content is being displayed.
 * Hidden on web — NetInfo/navigator.onLine is unreliable on mobile browsers (false positives).
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useConnectivity } from '@/context/ConnectivityContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors } from '@/constants/theme';

export function OfflineBanner() {
  const { isConnected } = useConnectivity();
  const { colors } = useTheme();

  if (Platform.OS === 'web') return null;
  if (isConnected !== false) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <HabixaIcon name="wifi" size={14} color={Colors.terracotta} />
      <Text style={[styles.title, { color: colors.text }]}>Not connected to internet</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Showing cached content. Some features may be limited until you're back online.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
  subtitle: {
    width: '100%',
    fontSize: 11,
    marginTop: 2,
    paddingLeft: 22,
  },
});
