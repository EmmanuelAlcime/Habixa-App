import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { Colors, Fonts } from '@/constants/theme';

export default function ConnectReturnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/(tabs)/(profile)/connect');
    }, 500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={Colors.terracotta} />
      <Text style={[styles.text, { color: colors.text }]}>Returning to Habixa…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 12,
  },
});
