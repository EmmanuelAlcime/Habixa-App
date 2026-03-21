/**
 * Pay Rent modal — full Stripe PaymentSheet integration.
 * Called with params: leaseId, amount, currency, landlordName
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';
import { formatPrice } from '@/lib/formatters';
import { t } from '@/lib/i18n';

type Step = 'confirm' | 'processing' | 'success' | 'error';

export default function PayRentModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { leaseId, amount, currency = 'USD', landlordName, landlordCountry, paymentMonth } = useLocalSearchParams<{
    leaseId: string;
    amount: string;
    currency: string;
    landlordName: string;
    landlordCountry?: string;
    paymentMonth?: string;
  }>();

  const [step, setStep] = useState<Step>('confirm');
  const [errorMessage, setErrorMessage] = useState('');
  const [amountInput, setAmountInput] = useState(() => (amount ? String(amount) : ''));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (paymentMonth && /^\d{4}-\d{2}$/.test(paymentMonth)) return paymentMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const amountNum = Math.max(0, parseFloat(amountInput) || 0);
  const formattedAmount = formatPrice(amountNum, currency);
  const platformFee = formatPrice(amountNum * 0.025, currency); // 2.5% platform fee

  const merchantCountry = (landlordCountry && landlordCountry.length === 2)
    ? landlordCountry.toUpperCase()
    : 'BS';

  const monthOptions = (() => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    return [
      { value: current, label: new Date(now.getFullYear(), now.getMonth()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
      { value: last, label: new Date(prev.getFullYear(), prev.getMonth()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
    ];
  })();

  async function handlePay() {
    if (!leaseId || !amountNum) {
      Alert.alert('Error', 'Missing payment details.');
      return;
    }

    setStep('processing');

    try {
      // 1. Create PaymentIntent on the server
      const res = await api.post<{ client_secret: string; ephemeral_key?: string; customer_id?: string }>(
        Endpoints.payments.rent(),
        { lease_id: leaseId, amount: amountNum, currency, month: selectedMonth }
      );

      if (!res?.client_secret) throw new Error('No payment intent returned from server.');

      // 2. Initialise PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: res.client_secret,
        customerEphemeralKeySecret: res.ephemeral_key,
        customerId: res.customer_id,
        merchantDisplayName: 'Habixa',
        style: 'automatic',
        applePay: { merchantCountryCode: merchantCountry },
        googlePay: { merchantCountryCode: merchantCountry, testEnv: __DEV__ },
        defaultBillingDetails: { name: '' },
      });

      if (initError) throw new Error(initError.message);

      // 3. Present PaymentSheet to user
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          setStep('confirm'); // User cancelled — go back to confirm
          return;
        }
        throw new Error(presentError.message);
      }

      // 4. Success
      setStep('success');
    } catch (e) {
      const err = e as { message?: string };
      setErrorMessage(err?.message ?? 'Payment failed. Please try again.');
      setStep('error');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <HabixaIcon name="times" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('payments.payRent')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {step === 'confirm' && (
          <KeyboardAvoidingView
            style={styles.content}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={80}
          >
            <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.amountLabel, { color: Colors.muted }]}>{t('payments.amount')}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={amountInput}
                onChangeText={(t) => setAmountInput(t.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={Colors.muted}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              {landlordName && (
                <Text style={[styles.amountTo, { color: Colors.muted }]}>to {landlordName}</Text>
              )}
            </View>

            <View style={[styles.monthSelector, { borderColor: colors.border }]}>
              <Text style={[styles.monthLabel, { color: Colors.muted }]}>Payment for</Text>
              <View style={styles.monthOptions}>
                {monthOptions.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.monthPill,
                      selectedMonth === opt.value && { backgroundColor: Colors.terracotta },
                      selectedMonth === opt.value && styles.monthPillSelected,
                    ]}
                    onPress={() => setSelectedMonth(opt.value)}
                  >
                    <Text style={[
                      styles.monthPillText,
                      { color: selectedMonth === opt.value ? Colors.desertSand : colors.text },
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.text }]}>Rent</Text>
                <Text style={[styles.breakdownValue, { color: colors.text }]}>{formattedAmount}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: Colors.muted }]}>Platform fee (2.5%)</Text>
                <Text style={[styles.breakdownValue, { color: Colors.muted }]}>{platformFee}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal, { borderTopColor: colors.border }]}>
                <Text style={[styles.breakdownTotalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.breakdownTotalValue, { color: Colors.terracotta }]}>
                  {formatPrice(amountNum * 1.025, currency)}
                </Text>
              </View>
            </View>

            <View style={styles.secureRow}>
              <HabixaIcon name="lock" size={11} color={Colors.sage} />
              <Text style={[styles.secureText, { color: Colors.muted }]}>
                Secured by Stripe. Your card details are never stored on our servers.
              </Text>
            </View>

            <Pressable
              style={[styles.payBtn, amountNum <= 0 && { opacity: 0.6 }]}
              onPress={handlePay}
              disabled={amountNum <= 0}
            >
              <HabixaIcon name="credit-card" size={16} color={Colors.desertSand} />
              <Text style={styles.payBtnText}>{t('payments.payNow')}</Text>
            </Pressable>
          </KeyboardAvoidingView>
        )}

        {step === 'processing' && (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color={Colors.terracotta} />
            <Text style={[styles.processingText, { color: Colors.muted }]}>{t('payments.processing')}</Text>
          </View>
        )}

        {step === 'success' && (
          <View style={styles.centred}>
            <View style={styles.successIcon}>
              <HabixaIcon name="check" size={32} color={Colors.sage} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>{t('payments.success')}</Text>
            <Text style={[styles.successDesc, { color: Colors.muted }]}>
              {formattedAmount} sent successfully. A receipt has been emailed to you.
            </Text>
            <Pressable style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>{t('common.done')}</Text>
            </Pressable>
          </View>
        )}

        {step === 'error' && (
          <View style={styles.centred}>
            <View style={styles.errorIcon}>
              <HabixaIcon name="exclamation-triangle" size={28} color={Colors.terracotta} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>{t('payments.failed')}</Text>
            <Text style={[styles.errorDesc, { color: Colors.muted }]}>{errorMessage}</Text>
            <Pressable style={styles.retryBtn} onPress={() => setStep('confirm')}>
              <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  closeBtn: { padding: 6 },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 18, textAlign: 'center' },
  headerSpacer: { width: 30 },
  content: { padding: 20, gap: 14 },
  monthSelector: { borderRadius: 14, borderWidth: 0.5, padding: 14 },
  monthLabel: { fontFamily: Fonts.body, fontSize: 12, marginBottom: 8 },
  monthOptions: { flexDirection: 'row', gap: 10 },
  monthPill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 0.5, borderColor: 'transparent' },
  monthPillSelected: { borderColor: 'transparent' },
  monthPillText: { fontFamily: Fonts.heading, fontSize: 14 },
  amountCard: { borderRadius: 16, borderWidth: 0.5, padding: 20, alignItems: 'center' },
  amountLabel: { fontFamily: Fonts.body, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  amountInput: { fontFamily: Fonts.display, fontSize: 36, textAlign: 'center', padding: 4, minWidth: 100 },
  amountValue: { fontFamily: Fonts.display, fontSize: 40 },
  amountTo: { fontFamily: Fonts.body, fontSize: 14, marginTop: 4 },
  breakdownCard: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
  breakdownLabel: { fontFamily: Fonts.body, fontSize: 14 },
  breakdownValue: { fontFamily: Fonts.heading, fontSize: 14 },
  breakdownTotal: { borderTopWidth: 0.5 },
  breakdownTotalLabel: { fontFamily: Fonts.heading, fontSize: 15 },
  breakdownTotalValue: { fontFamily: Fonts.display, fontSize: 16 },
  secureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  secureText: { flex: 1, fontFamily: Fonts.body, fontSize: 12, lineHeight: 18 },
  payBtn: { backgroundColor: Colors.terracotta, paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  payBtnText: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.desertSand },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  processingText: { fontFamily: Fonts.body, fontSize: 15, marginTop: 8 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(92,124,111,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.sage },
  successTitle: { fontFamily: Fonts.display, fontSize: 24, textAlign: 'center' },
  successDesc: { fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  doneBtn: { backgroundColor: Colors.terracotta, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30, marginTop: 8 },
  doneBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.desertSand },
  errorIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(194,103,58,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.terracotta },
  errorTitle: { fontFamily: Fonts.display, fontSize: 22, textAlign: 'center' },
  errorDesc: { fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  retryBtn: { borderWidth: 1, borderColor: Colors.terracotta, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30, marginTop: 8 },
  retryBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.terracotta },
});
