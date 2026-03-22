/**
 * Updated lease detail screen — adds review status banner and CTA.
 * Drop this over app/(tabs)/(profile)/leases/[id].tsx
 *
 * New features vs the original:
 *  - Shows review status banner ("Leave a review" / "Review submitted")
 *  - "Leave a review" button navigates to /modal/review with correct params
 *  - Fetches review_status from the updated API
 *  - Displays the other party's mini-profile with tap-to-view
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

interface Listing {
  id: number; title?: string; address?: string; city?: string;
  state?: string; country?: string; price?: string | number; currency?: string;
}
interface LeaseParty { id: number; name: string; email?: string; avatar?: string; country?: string; }
interface ReviewStatus {
  can_review: boolean;
  i_have_reviewed: boolean;
  they_have_reviewed: boolean;
  review_type: 'landlord' | 'tenant';
  review_subject_id: number;
  my_review?: { id: number; rating: number } | null;
}
interface Lease {
  id: number; listing_id: number; landlord_id: number; tenant_id: number;
  start_date: string; end_date: string; monthly_rent: string | number;
  currency?: string; status: string;
  tenant_confirmed_at?: string | null; created_at: string;
  listing?: Listing; landlord?: LeaseParty; tenant?: LeaseParty;
  review_status?: ReviewStatus;
}
interface LeasePayment {
  id: number; amount: string | number; currency?: string;
  status: string; created_at: string; receipt_path?: string | null;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtCurrency(amount: string | number, currency = 'USD') {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

export default function LeaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [lease, setLease] = useState<Lease | null>(null);
  const [leasePayments, setLeasePayments] = useState<LeasePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<Lease>(Endpoints.leases.show(id)),
      api.get<LeasePayment[]>(Endpoints.leases.payments(id)).catch(() => []),
    ]).then(([leaseData, payments]) => {
      if (cancelled) return;
      setLease(leaseData);
      setLeasePayments(Array.isArray(payments) ? payments : []);
    }).catch((e: { message?: string }) => {
      if (!cancelled) setError(e?.message ?? 'Failed to load lease');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  const handleConfirm = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      await api.post(Endpoints.leases.confirm(id));
      setLease((prev) => prev ? { ...prev, status: 'active', tenant_confirmed_at: new Date().toISOString() } : null);
      Alert.alert('Lease confirmed', 'You are now an active tenant. Welcome!');
    } catch (e) {
      Alert.alert('Error', (e as { message?: string })?.message ?? 'Failed to confirm lease');
    } finally {
      setConfirming(false);
    }
  };

  const isTenant = user && lease && lease.tenant_id === Number(user.id);
  const isLandlord = user && lease && lease.landlord_id === Number(user.id);
  const canConfirm = isTenant && lease?.status === 'pending';
  const canPayRent = isTenant && lease?.status === 'active';
  const rs = lease?.review_status;

  const otherParty = isLandlord ? lease?.tenant : lease?.landlord;
  const address = lease?.listing
    ? [lease.listing.address, lease.listing.city, lease.listing.country].filter(Boolean).join(', ')
    : '';
  const currency = lease?.currency ?? lease?.listing?.currency ?? 'USD';

  function openReview() {
    if (!rs || !lease) return;
    router.push({
      pathname: '/modal/review',
      params: {
        subjectId: String(rs.review_subject_id),
        subjectName: otherParty?.name ?? 'Unknown',
        leaseId: String(lease.id),
        type: rs.review_type,
        address,
      },
    });
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Header title="Lease Details" colors={colors} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
        </View>
      </View>
    );
  }
  if (error || !lease) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Header title="Lease Details" colors={colors} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={[styles.errorText, { color: colors.text }]}>{error ?? 'Lease not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <Header title="Lease Details" colors={colors} onBack={() => router.back()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

        {/* Property card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {lease.listing?.title ?? lease.listing?.address ?? `Listing #${lease.listing_id}`}
            </Text>
            <StatusBadge status={lease.status} />
          </View>
          {address ? (
            <View style={styles.addressRow}>
              <HabixaIcon name="map-marker-alt" size={12} color={Colors.terracotta} solid />
              <Text style={[styles.addressText, { color: colors.textSecondary }]}>{address}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Review banner ────────────────────────────────────────────── */}
        {rs?.can_review && (
          <Pressable
            style={[styles.reviewBanner, { borderColor: Colors.gold + '60', backgroundColor: Colors.gold + '12' }]}
            onPress={openReview}
          >
            <View style={styles.reviewBannerLeft}>
              <HabixaIcon name="star" size={20} color={Colors.gold} solid />
              <View>
                <Text style={[styles.reviewBannerTitle, { color: colors.text }]}>
                  How was {otherParty?.name}?
                </Text>
                <Text style={[styles.reviewBannerSub, { color: Colors.muted }]}>
                  Leave a {rs.review_type} review
                </Text>
              </View>
            </View>
            <HabixaIcon name="chevron-right" size={14} color={Colors.gold} />
          </Pressable>
        )}
        {rs?.i_have_reviewed && (
          <View style={[styles.reviewedBanner, { borderColor: Colors.sage + '40', backgroundColor: Colors.sage + '10' }]}>
            <HabixaIcon name="check-circle" size={16} color={Colors.sage} solid />
            <Text style={[styles.reviewedText, { color: Colors.sage }]}>
              You left a {rs.my_review?.rating}★ review for this lease
            </Text>
          </View>
        )}
        {rs?.they_have_reviewed && !rs?.i_have_reviewed && (
          <View style={[styles.reviewedBanner, { borderColor: colors.border }]}>
            <HabixaIcon name="info-circle" size={14} color={Colors.muted} />
            <Text style={[styles.reviewedText, { color: Colors.muted }]}>
              {otherParty?.name} has left you a review
            </Text>
          </View>
        )}

        {/* Terms */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lease terms</Text>
          <Row label="Start date" value={fmt(lease.start_date)} colors={colors} />
          <Row label="End date" value={fmt(lease.end_date)} colors={colors} />
          <Row label="Monthly rent" value={fmtCurrency(lease.monthly_rent, currency)} colors={colors} />
        </View>

        {/* Parties */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Parties</Text>
          <PartyRow
            label="Landlord"
            party={lease.landlord}
            colors={colors}
            onPress={() => lease.landlord && router.push(`/profile/${lease.landlord.id}`)}
          />
          <PartyRow
            label="Tenant"
            party={lease.tenant}
            colors={colors}
            onPress={() => lease.tenant && router.push(`/profile/${lease.tenant.id}`)}
          />
        </View>

        {/* Payment history */}
        {leasePayments.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment history</Text>
            {leasePayments.map((p) => (
              <View key={p.id} style={[styles.payRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.payDate, { color: colors.textSecondary }]}>{fmt(p.created_at)}</Text>
                  <Text style={[styles.payStatus, {
                    color: p.status === 'completed' ? Colors.sage : p.status === 'failed' ? Colors.terracotta : Colors.gold,
                  }]}>{p.status}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.payAmount, { color: colors.text }]}>
                    {fmtCurrency(p.amount, p.currency ?? currency)}
                  </Text>
                  {p.receipt_path && (
                    <View style={styles.receiptPill}>
                      <HabixaIcon name="file-pdf" size={10} color={Colors.sage} />
                      <Text style={[styles.receiptText, { color: Colors.sage }]}>Receipt</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {canConfirm && (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: Colors.terracotta }, confirming && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            {confirming
              ? <ActivityIndicator color={Colors.desertSand} />
              : <><HabixaIcon name="check" size={16} color={Colors.desertSand} /><Text style={styles.actionBtnText}>Confirm lease</Text></>}
          </Pressable>
        )}
        {canPayRent && (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: Colors.sage }]}
            onPress={() => router.push({
              pathname: '/modal/pay-rent',
              params: {
                leaseId: String(lease.id),
                amount: String(lease.monthly_rent),
                currency,
                landlordName: lease.landlord?.name ?? '',
                landlordCountry: lease.landlord?.country ?? lease.listing?.country ?? undefined,
              },
            })}
          >
            <HabixaIcon name="credit-card" size={16} color={Colors.desertSand} solid />
            <Text style={styles.actionBtnText}>Pay rent</Text>
          </Pressable>
        )}
        {rs?.can_review && (
          <Pressable style={[styles.actionBtn, { backgroundColor: Colors.midnightInk }]} onPress={openReview}>
            <HabixaIcon name="star" size={16} color={Colors.gold} solid />
            <Text style={styles.actionBtnText}>Leave a review</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function Header({ title, colors, onBack }: { title: string; colors: { text: string; border: string }; onBack: () => void }) {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <HabixaIcon name="chevron-left" size={22} color={Colors.terracotta} solid />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = status === 'active' ? Colors.sage : status === 'ended' ? Colors.muted : status === 'cancelled' ? Colors.terracotta : Colors.gold;
  return (
    <View style={[styles.badge, { backgroundColor: c + '20' }]}>
      <Text style={[styles.badgeText, { color: c }]}>{status}</Text>
    </View>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: { text: string; textSecondary: string } }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function PartyRow({ label, party, colors, onPress }: { label: string; party?: { id: number; name: string } | null; colors: { text: string; textSecondary: string }; onPress: () => void }) {
  return (
    <Pressable style={styles.partyRow} onPress={onPress}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.partyRight}>
        <Text style={[styles.rowValue, { color: colors.text }]}>{party?.name ?? '—'}</Text>
        <HabixaIcon name="chevron-right" size={12} color={Colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  backBtn: { marginRight: 12 },
  backText: { fontFamily: Fonts.heading, fontSize: 15 },
  headerTitle: { fontFamily: Fonts.display, fontSize: 20 },
  scroll: { padding: 16, gap: 12 },
  errorText: { fontFamily: Fonts.heading, fontSize: 16, textAlign: 'center' },
  card: { padding: 16, borderRadius: 14, borderWidth: 0.5 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 16, flex: 1, marginRight: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { fontFamily: Fonts.body, fontSize: 13, flex: 1 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: Fonts.heading, textTransform: 'capitalize' },
  reviewBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  reviewBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewBannerTitle: { fontFamily: Fonts.heading, fontSize: 14 },
  reviewBannerSub: { fontFamily: Fonts.body, fontSize: 12, marginTop: 2 },
  reviewedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 0.5,
  },
  reviewedText: { fontFamily: Fonts.body, fontSize: 13, flex: 1 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 14, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 13 },
  rowValue: { fontFamily: Fonts.heading, fontSize: 14 },
  partyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  partyRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
  payDate: { fontFamily: Fonts.body, fontSize: 13 },
  payStatus: { fontFamily: Fonts.heading, fontSize: 11, textTransform: 'capitalize', marginTop: 2 },
  payAmount: { fontFamily: Fonts.heading, fontSize: 14 },
  receiptPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  receiptText: { fontFamily: Fonts.heading, fontSize: 11 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14,
  },
  actionBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.desertSand },
});
