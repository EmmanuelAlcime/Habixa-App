import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

interface ConnectStatus {
  connected: boolean;
  charges_enabled?: boolean;
  details_submitted?: boolean;
}

export default function ConnectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get<ConnectStatus>(Endpoints.connect.status());
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [fetchStatus])
  );

  const handleSetUpPayouts = async () => {
    setOnboarding(true);
    try {
      const res = await api.post<{ url: string }>(Endpoints.connect.onboard());
      if (res?.url) {
        const opened = await Linking.openURL(res.url);
        if (!opened) {
          Alert.alert('Error', 'Could not open Stripe setup. Please try again.');
        }
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Failed to start setup';
      Alert.alert('Error', msg);
    } finally {
      setOnboarding(false);
    }
  };

  const isLandlord = user?.role === 'landlord' || user?.role === 'admin';
  if (!isLandlord) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <HabixaIcon name="chevron-left" size={20} color={Colors.desertSand} solid />
          </Pressable>
          <Text style={styles.headerTitle}>Receive Rent</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.helperText, { color: colors.text }]}>
            Only landlords can receive rent payments directly. If you list properties, update your role in Edit Profile.
          </Text>
        </View>
      </View>
    );
  }

  if (loading && !status) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  const ready = status?.connected && status?.charges_enabled;
  const pending = status?.connected && !status?.charges_enabled;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <HabixaIcon name="chevron-left" size={20} color={Colors.desertSand} solid />
        </Pressable>
        <Text style={styles.headerTitle}>Receive Rent Payments</Text>
      </View>

      <View style={styles.content}>
        {ready ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.successIcon}>
              <HabixaIcon name="check-circle" size={40} color={Colors.sage} solid />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Payouts set up</Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              When tenants pay rent, funds go to your bank account after our platform fee. No further action needed.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <HabixaIcon name="wallet" size={36} color={Colors.terracotta} solid />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {pending ? 'Complete setup' : 'Set up payouts'}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.muted }]}>
                {pending
                  ? 'You started onboarding. Complete the steps in Stripe to receive rent payments.'
                  : 'Connect your bank account to receive rent payments from tenants. Stripe handles the secure setup.'}
              </Text>
            </View>

            <Pressable
              style={[styles.btn, onboarding && styles.btnDisabled]}
              onPress={handleSetUpPayouts}
              disabled={onboarding}
            >
              {onboarding ? (
                <ActivityIndicator size="small" color={Colors.card} />
              ) : (
                <Text style={styles.btnText}>{pending ? 'Continue setup' : 'Set up payouts'}</Text>
              )}
            </Pressable>

            <Text style={[styles.footer, { color: colors.muted }]}>
              You'll be redirected to Stripe to add your banking details. Habixa takes a small platform fee on each rent payment.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.midnightInk,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.desertSand,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.card,
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
