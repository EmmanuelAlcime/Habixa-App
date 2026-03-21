/**
 * Deposit modal — tenant pays (or views) the security deposit.
 *
 * Route: /modal/deposit
 * Params: leaseId, depositAmount, currency, depositMethod, landlordName, address
 *
 * Opens automatically on the lease detail screen when:
 *   - lease.status === 'active' (just confirmed)
 *   - lease.deposit_amount > 0
 *   - lease.deposit_status === 'unpaid'
 *   - lease.deposit_payment_method === 'stripe'
 *
 * For cash/bank_transfer leases, the landlord marks it paid from their side.
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api } from '@/lib/api/client';
import { formatPrice } from '@/lib/formatters';

type Step = 'info' | 'processing' | 'success' | 'error';

export default function DepositModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { leaseId, depositAmount, currency, depositMethod, landlordName, address } =
    useLocalSearchParams<{
      leaseId: string;
      depositAmount: string;
      currency: string;
      depositMethod: string;
      landlordName: string;
      address: string;
    }>();

  const [step, setStep] = useState<Step>('info');
  const [errorMsg, setErrorMsg] = useState('');

  const amount = parseFloat(depositAmount ?? '0');
  const formatted = formatPrice(amount, currency ?? 'USD');
  const isStripe = depositMethod === 'stripe';

  async function handlePayOnline() {
    setStep('processing');
    try {
      const res = await api.post<{ client_secret: string; publishable_key?: string }>(
        `/api/leases/${leaseId}/pay-deposit`
      );
      if (!res?.client_secret) throw new Error('Could not start payment.');

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: res.client_secret,
        merchantDisplayName: 'Habixa',
        style: 'automatic',
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') { setStep('info'); return; }
        throw new Error(presentError.message);
      }

      setStep('success');
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message ?? 'Payment failed. Please try again.');
      setStep('error');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <HabixaIcon name="times" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Security Deposit</Text>
        <View style={{ width: 36 }} />
      </View>

      {step === 'info' && (
        <View style={styles.content}>
          {/* Amount card */}
          <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.amountLabel, { color: Colors.muted }]}>Deposit amount</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>{formatted}</Text>
            {landlordName ? (
              <Text style={[styles.amountTo, { color: Colors.muted }]}>to {landlordName}</Text>
            ) : null}
            {address ? (
              <View style={styles.addressRow}>
                <HabixaIcon name="map-marker-alt" size={10} color={Colors.muted} solid />
                <Text style={[styles.addressText, { color: Colors.muted }]} numberOfLines={1}>{address}</Text>
              </View>
            ) : null}
          </View>

          {isStripe ? (
            <>
              <View style={[styles.infoBox, { borderColor: colors.border }]}>
                <HabixaIcon name="shield-alt" size={14} color={Colors.sage} />
                <Text style={[styles.infoText, { color: Colors.muted }]}>
                  Your deposit is securely processed through Stripe. You'll receive a receipt once paid.
                </Text>
              </View>
              <Pressable style={styles.payBtn} onPress={handlePayOnline}>
                <HabixaIcon name="lock" size={14} color={Colors.desertSand} />
                <Text style={styles.payBtnText}>Pay deposit securely</Text>
              </Pressable>
            </>
          ) : (
            <View style={[styles.offlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <HabixaIcon
                name={depositMethod === 'bank_transfer' ? 'university' : 'money-bill'}
                size={24}
                color={Colors.sage}
              />
              <Text style={[styles.offlineTitle, { color: colors.text }]}>
                {depositMethod === 'bank_transfer' ? 'Bank transfer' : 'Cash payment'}
              </Text>
              <Text style={[styles.offlineDesc, { color: Colors.muted }]}>
                Your landlord has chosen to collect the deposit{' '}
                {depositMethod === 'bank_transfer' ? 'via bank transfer' : 'in cash'}.
                Once you've paid, your landlord will mark it as received in the app.
              </Text>
              <Pressable style={styles.doneBtn} onPress={() => router.back()}>
                <Text style={styles.doneBtnText}>Understood</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {step === 'processing' && (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
          <Text style={[styles.processingText, { color: Colors.muted }]}>Processing payment…</Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.centred}>
          <View style={styles.successIcon}>
            <HabixaIcon name="check" size={32} color={Colors.sage} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Deposit paid!</Text>
          <Text style={[styles.successDesc, { color: Colors.muted }]}>
            {formatted} has been sent. Your landlord has been notified and a receipt will be emailed to you.
          </Text>
          <Pressable style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      )}

      {step === 'error' && (
        <View style={styles.centred}>
          <HabixaIcon name="exclamation-triangle" size={36} color={Colors.terracotta} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Payment failed</Text>
          <Text style={[styles.errorDesc, { color: Colors.muted }]}>{errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={() => setStep('info')}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 0.5 },
  closeBtn: { padding: 6, width: 36 },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 18, textAlign: 'center' },
  content: { padding: 20, gap: 16 },
  amountCard: { borderRadius: 16, borderWidth: 0.5, padding: 20, alignItems: 'center', gap: 6 },
  amountLabel: { fontFamily: Fonts.body, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  amountValue: { fontFamily: Fonts.display, fontSize: 38 },
  amountTo: { fontFamily: Fonts.body, fontSize: 13 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressText: { fontFamily: Fonts.body, fontSize: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, borderWidth: 0.5 },
  infoText: { flex: 1, fontFamily: Fonts.body, fontSize: 12, lineHeight: 18 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.terracotta, paddingVertical: 16, borderRadius: 14 },
  payBtnText: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.desertSand },
  offlineCard: { borderRadius: 14, borderWidth: 0.5, padding: 20, alignItems: 'center', gap: 12 },
  offlineTitle: { fontFamily: Fonts.heading, fontSize: 16 },
  offlineDesc: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  processingText: { fontFamily: Fonts.body, fontSize: 14 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.sage + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.sage },
  successTitle: { fontFamily: Fonts.display, fontSize: 24, textAlign: 'center' },
  successDesc: { fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  doneBtn: { backgroundColor: Colors.terracotta, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30 },
  doneBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.desertSand },
  errorTitle: { fontFamily: Fonts.display, fontSize: 22, textAlign: 'center' },
  errorDesc: { fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  retryBtn: { borderWidth: 1, borderColor: Colors.terracotta, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30 },
  retryBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.terracotta },
});
