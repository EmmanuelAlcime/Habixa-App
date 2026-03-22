/**
 * Create Lease modal — landlord sets lease terms after accepting an application.
 *
 * Route: /modal/create-lease
 * Params: applicationId, tenantName, listingId, moveInDate, duration
 *
 * The landlord can:
 *  - Confirm / adjust start & end dates (pre-filled from application)
 *  - Adjust monthly rent (pre-filled from listing)
 *  - Set deposit amount and preferred payment method
 *  - Add optional notes / house rules
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

const DEPOSIT_METHODS = [
  { value: 'stripe',        label: 'Via Habixa (Stripe)',  icon: 'credit-card', desc: 'Tenant pays online — tracked in app' },
  { value: 'cash',          label: 'Cash in person',        icon: 'money-bill',  desc: "You'll mark it paid when received" },
  { value: 'bank_transfer', label: 'Bank transfer',         icon: 'university',  desc: "You'll mark it paid when received" },
];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function durationToMonths(duration: string): number {
  return { '6_months': 6, '12_months': 12, '18_months': 18, '24_months': 24, 'flexible': 12 }[duration] ?? 12;
}

export default function CreateLeaseModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { applicationId, tenantName, listingId, moveInDate, duration } =
    useLocalSearchParams<{
      applicationId: string;
      tenantName: string;
      listingId: string;
      moveInDate: string;
      duration: string;
    }>();

  const parsedMoveIn = moveInDate ? new Date(moveInDate) : new Date();
  const defaultEnd = addMonths(parsedMoveIn, durationToMonths(duration ?? '12_months'));

  const [startDate, setStartDate] = useState(parsedMoveIn);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingListing, setLoadingListing] = useState(true);

  // Pre-fill rent + currency from the listing
  useEffect(() => {
    if (!listingId) { setLoadingListing(false); return; }
    api.get<{ price?: number; currency?: string }>(`/api/listings/${listingId}`)
      .then((data) => {
        if (data?.price) setMonthlyRent(String(data.price));
        if (data?.currency) setCurrency(data.currency);
      })
      .catch(() => {})
      .finally(() => setLoadingListing(false));
  }, [listingId]);

  const hasDeposit = parseFloat(depositAmount) > 0;
  const canSubmit = monthlyRent.trim() !== '' && parseFloat(monthlyRent) > 0
    && endDate > startDate
    && (!hasDeposit || depositMethod !== null)
    && !submitting;

  function formatDate(d: Date) {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  async function handleCreate() {
    if (!canSubmit || !applicationId) return;
    setSubmitting(true);
    try {
      const lease = await api.post(
        `/api/applications/${applicationId}/create-lease`,
        {
          start_date:             startDate.toISOString().split('T')[0],
          end_date:               endDate.toISOString().split('T')[0],
          monthly_rent:           parseFloat(monthlyRent),
          currency,
          deposit_amount:         hasDeposit ? parseFloat(depositAmount) : 0,
          deposit_payment_method: hasDeposit ? depositMethod : null,
          notes:                  notes.trim() || null,
        }
      );

      Alert.alert(
        'Lease sent!',
        `${tenantName ?? 'The tenant'} has been notified and will receive the lease to confirm.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Error', (e as { message?: string })?.message ?? 'Could not create lease. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <HabixaIcon name="arrow-left" size={16} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Lease</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tenant pill */}
        <View style={[styles.tenantPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.tenantAvatar, { backgroundColor: Colors.terracotta + '20' }]}>
            <Text style={[styles.tenantAvatarText, { color: Colors.terracotta }]}>
              {(tenantName ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.tenantLabel, { color: colors.muted }]}>Tenant</Text>
            <Text style={[styles.tenantName, { color: colors.text }]}>{tenantName ?? '—'}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Lease dates</Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Start date</Text>
              <Pressable
                style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setShowStartPicker(true)}
              >
                <HabixaIcon name="calendar" size={12} color={Colors.terracotta} />
                <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDate(startDate)}</Text>
              </Pressable>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, d) => { setShowStartPicker(Platform.OS === 'ios'); if (d) setStartDate(d); }}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>End date</Text>
              <Pressable
                style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setShowEndPicker(true)}
              >
                <HabixaIcon name="calendar" size={12} color={Colors.terracotta} />
                <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDate(endDate)}</Text>
              </Pressable>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  minimumDate={new Date(startDate.getTime() + 86400000)}
                  onChange={(_, d) => { setShowEndPicker(Platform.OS === 'ios'); if (d) setEndDate(d); }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Monthly rent */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Monthly rent</Text>
          <View style={styles.amountRow}>
            <View style={[styles.currencyTag, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.currencyText, { color: colors.text }]}>{currency}</Text>
            </View>
            <TextInput
              style={[styles.amountInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              value={monthlyRent}
              onChangeText={setMonthlyRent}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Deposit */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Security deposit</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>
            Leave blank to waive the deposit. You are responsible for complying with local deposit laws.
          </Text>
          <View style={styles.amountRow}>
            <View style={[styles.currencyTag, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.currencyText, { color: colors.text }]}>{currency}</Text>
            </View>
            <TextInput
              style={[styles.amountInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
              placeholder="0.00  (optional)"
              placeholderTextColor={colors.muted}
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {hasDeposit && (
            <View style={styles.depositMethodSection}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>How should the tenant pay the deposit?</Text>
              {DEPOSIT_METHODS.map((m) => {
                const active = depositMethod === m.value;
                return (
                  <Pressable
                    key={m.value}
                    style={[
                      styles.methodCard,
                      { borderColor: active ? Colors.terracotta : colors.border, backgroundColor: active ? Colors.terracotta + '08' : colors.card },
                    ]}
                    onPress={() => setDepositMethod(m.value)}
                  >
                    <View style={[styles.methodIconWrap, { backgroundColor: active ? Colors.terracotta + '20' : colors.background }]}>
                      <HabixaIcon name={m.icon} size={16} color={active ? Colors.terracotta : colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodLabel, { color: colors.text }]}>{m.label}</Text>
                      <Text style={[styles.methodDesc, { color: colors.muted }]}>{m.desc}</Text>
                    </View>
                    {active && <HabixaIcon name="check-circle" size={18} color={Colors.terracotta} solid />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Notes / house rules <Text style={{ color: colors.muted, fontFamily: Fonts.body }}>(optional)</Text></Text>
          <TextInput
            style={[styles.notesInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="e.g. No smoking, pets allowed with permission, bin day is Tuesday..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
        </View>

        {/* Summary */}
        {monthlyRent && parseFloat(monthlyRent) > 0 && (
          <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.muted }]}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Monthly rent</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{currency} {parseFloat(monthlyRent).toLocaleString()}/mo</Text>
            </View>
            {hasDeposit && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Deposit</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{currency} {parseFloat(depositAmount || '0').toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Duration</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatDate(startDate)} → {formatDate(endDate)}
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={!canSubmit}
        >
          {submitting
            ? <ActivityIndicator color={Colors.desertSand} />
            : <><HabixaIcon name="file-signature" size={16} color={Colors.desertSand} /><Text style={styles.createBtnText}>Send lease to {tenantName?.split(' ')[0] ?? 'tenant'}</Text></>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 0.5 },
  closeBtn: { padding: 6, width: 36 },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 18, textAlign: 'center' },
  scroll: { padding: 20, gap: 24 },

  tenantPill: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 0.5 },
  tenantAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tenantAvatarText: { fontFamily: Fonts.display, fontSize: 16 },
  tenantLabel: { fontFamily: Fonts.body, fontSize: 11 },
  tenantName: { fontFamily: Fonts.heading, fontSize: 15 },

  section: { gap: 10 },
  sectionLabel: { fontFamily: Fonts.heading, fontSize: 13 },
  sectionHint: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, marginTop: -4 },
  inputLabel: { fontFamily: Fonts.body, fontSize: 11, marginBottom: 6 },

  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 0.5, borderRadius: 10, padding: 11 },
  dateBtnText: { fontFamily: Fonts.body, fontSize: 12, flex: 1 },

  amountRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  currencyTag: { paddingVertical: 12, paddingHorizontal: 14, borderWidth: 0.5, borderRadius: 10 },
  currencyText: { fontFamily: Fonts.heading, fontSize: 13 },
  amountInput: { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontFamily: Fonts.display, fontSize: 18 },

  depositMethodSection: { gap: 8, marginTop: 4 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 0.5 },
  methodIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontFamily: Fonts.heading, fontSize: 14 },
  methodDesc: { fontFamily: Fonts.body, fontSize: 12, marginTop: 2 },

  notesInput: { height: 100, borderWidth: 0.5, borderRadius: 12, padding: 12, fontFamily: Fonts.body, fontSize: 13, lineHeight: 20 },

  summary: { borderRadius: 12, borderWidth: 0.5, padding: 14, gap: 8 },
  summaryTitle: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: Fonts.body, fontSize: 13 },
  summaryValue: { fontFamily: Fonts.heading, fontSize: 13 },

  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.terracotta, paddingVertical: 16, borderRadius: 14 },
  createBtnDisabled: { opacity: 0.45 },
  createBtnText: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.desertSand },
});
