/**
 * Applicants screen — landlord reviews tenant applications for a listing.
 *
 * Route: app/(tabs)/(listings)/applicants/[id].tsx
 * Replaces the existing applicants screen which only showed who messaged.
 *
 * Now shows:
 *  - Tenant name, location, verification badges
 *  - Tenant trust score
 *  - Move-in date + duration requested
 *  - Message preview
 *  - Actions: Message / Accept / Decline / Create Lease
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

interface TenantScore { score: number; review_count: number; }
interface TenantInfo {
  id: number; name: string; avatar_url?: string | null;
  city?: string | null; country?: string | null;
  age?: number | null; gender?: string | null;
  identity_verified: boolean; phone_verified: boolean;
  tenant_score: TenantScore; total_leases: number;
}
interface Application {
  id: number; status: string;
  move_in_date: string; duration: string; duration_label: string;
  message: string; created_at: string;
  conversation_id?: number | null; lease_id?: number | null;
  tenant: TenantInfo;
}

function ScoreBadge({ score, count, mutedColor }: { score: number; count: number; mutedColor: string }) {
  if (count === 0) return <Text style={[styles.noScore, { color: mutedColor }]}>No reviews yet</Text>;
  return (
    <View style={styles.scoreBadge}>
      <HabixaIcon name="star" size={10} color={Colors.gold} solid />
      <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
      <Text style={[styles.scoreCount, { color: mutedColor }]}>({count})</Text>
    </View>
  );
}

function VerifiedBadge({ label }: { label: string }) {
  return (
    <View style={styles.verifiedBadge}>
      <HabixaIcon name="check-circle" size={9} color={Colors.sage} solid />
      <Text style={styles.verifiedText}>{label}</Text>
    </View>
  );
}

function ApplicationCard({
  app, colors, onMessage, onAccept, onDecline, onCreateLease,
}: {
  app: Application;
  colors: ReturnType<typeof useTheme>['colors'];
  onMessage: (app: Application) => void;
  onAccept: (app: Application) => void;
  onDecline: (app: Application) => void;
  onCreateLease: (app: Application) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = app.tenant;
  const isPending = app.status === 'pending';
  const isAccepted = app.status === 'accepted';
  const hasLease = app.status === 'lease_created';

  const statusColor = {
    pending: Colors.gold,
    accepted: Colors.sage,
    declined: Colors.terracotta,
    lease_created: Colors.sky,
    withdrawn: colors.textSecondary,
  }[app.status] ?? colors.textSecondary;

  const initials = t.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top row */}
      <Pressable style={styles.cardTop} onPress={() => setExpanded(!expanded)}>
        <View style={[styles.avatar, { backgroundColor: Colors.terracotta + '20' }]}>
          <Text style={[styles.avatarText, { color: Colors.terracotta }]}>{initials}</Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.nameRow}>
            <Text style={[styles.tenantName, { color: colors.text }]}>{t.name}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {app.status === 'lease_created' ? 'Lease sent' : app.status}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            {t.city ? (
              <View style={styles.metaItem}>
                <HabixaIcon name="map-marker-alt" size={9} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{t.city}{t.country ? `, ${t.country}` : ''}</Text>
              </View>
            ) : null}
            {t.age != null && (
              <View style={styles.metaItem}>
                <HabixaIcon name="user" size={9} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{t.age} years old</Text>
              </View>
            )}
            {t.gender && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {t.gender === 'male' ? 'Male' : t.gender === 'female' ? 'Female' : "I'd rather not say"}
                </Text>
              </View>
            )}
            <ScoreBadge score={t.tenant_score.score} count={t.tenant_score.review_count} mutedColor={colors.textSecondary} />
          </View>
          <View style={styles.badgeRow}>
            {t.identity_verified && <VerifiedBadge label="ID verified" />}
            {t.phone_verified && <VerifiedBadge label="Phone" />}
            {t.total_leases > 0 && (
              <View style={styles.verifiedBadge}>
                <HabixaIcon name="home" size={9} color={Colors.sage} />
                <Text style={styles.verifiedText}>{t.total_leases} past lease{t.total_leases !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
        </View>
        <HabixaIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
      </Pressable>

      {/* Request summary always visible */}
      <View style={[styles.requestRow, { borderTopColor: colors.border }]}>
        <View style={styles.requestItem}>
          <HabixaIcon name="calendar-alt" size={11} color={colors.textSecondary} />
          <Text style={[styles.requestText, { color: colors.textSecondary }]}>
            Move in: {new Date(app.move_in_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.requestItem}>
          <HabixaIcon name="clock" size={11} color={colors.textSecondary} />
          <Text style={[styles.requestText, { color: colors.textSecondary }]}>{app.duration_label}</Text>
        </View>
      </View>

      {/* Expanded: full message */}
      {expanded && (
        <View style={[styles.messageWrap, { borderTopColor: colors.border }]}>
          <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>Message</Text>
          <Text style={[styles.messageText, { color: colors.text }]}>{app.message}</Text>
        </View>
      )}

      {/* Actions */}
      {!hasLease && app.status !== 'declined' && app.status !== 'withdrawn' && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <Pressable style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => onMessage(app)}>
            <HabixaIcon name="comment" size={12} color={Colors.sage} />
            <Text style={[styles.actionBtnText, { color: Colors.sage }]}>Message</Text>
          </Pressable>

          {isPending && (
            <Pressable style={[styles.actionBtn, { borderColor: Colors.terracotta + '40' }]} onPress={() => onDecline(app)}>
              <HabixaIcon name="times" size={12} color={Colors.terracotta} />
              <Text style={[styles.actionBtnText, { color: Colors.terracotta }]}>Decline</Text>
            </Pressable>
          )}

          {(isPending || isAccepted) && (
            <Pressable style={[styles.actionBtnPrimary]} onPress={() => onCreateLease(app)}>
              <HabixaIcon name="file-alt" size={12} color={Colors.desertSand} />
              <Text style={[styles.actionBtnText, { color: Colors.desertSand }]}>Create lease</Text>
            </Pressable>
          )}
        </View>
      )}

      {hasLease && (
        <Pressable
          style={[styles.viewLeaseBtn, { borderTopColor: colors.border }]}
          onPress={() => {}}
        >
          <HabixaIcon name="file-alt" size={12} color={Colors.sky} />
          <Text style={[styles.viewLeaseBtnText]}>View lease</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ApplicantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decline modal state
  const [declineModal, setDeclineModal] = useState<Application | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  // Create lease modal state
  const [leaseModal, setLeaseModal] = useState<Application | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Application[]>(`/api/listings/${id}/applications`);
      setApplications(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleMessage(app: Application) {
    try {
      const res = await api.post<{ id: number }>(Endpoints.conversations.store(), {
        listing_id: Number(id),
        participant_id: app.tenant.id,
      });
      const convId = (res as { id?: number })?.id;
      if (convId) router.push(`/(tabs)/(messages)/${convId}`);
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Could not start conversation. Please try again.');
    }
  }

  async function handleAccept(app: Application) {
    try {
      await api.post(`/api/applications/${app.id}/accept`);
      setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: 'accepted' } : a));
    } catch (e) {
      Alert.alert('Error', (e as { message?: string })?.message ?? 'Failed to accept');
    }
  }

  async function handleDeclineConfirm() {
    if (!declineModal) return;
    setDeclining(true);
    try {
      await api.post(`/api/applications/${declineModal.id}/decline`, { reason: declineReason.trim() || null });
      setApplications((prev) => prev.map((a) => a.id === declineModal.id ? { ...a, status: 'declined' } : a));
      setDeclineModal(null);
      setDeclineReason('');
    } catch (e) {
      Alert.alert('Error', (e as { message?: string })?.message ?? 'Failed to decline');
    } finally {
      setDeclining(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.midnightInk }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          Applications {applications.length > 0 ? `(${applications.length})` : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{error}</Text>
        </View>
      ) : applications.length === 0 ? (
        <View style={styles.center}>
          <HabixaIcon name="inbox" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No applications yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tenants who click "Apply Now" on your listing will appear here
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              colors={colors}
              onMessage={handleMessage}
              onAccept={handleAccept}
              onDecline={(a) => { setDeclineModal(a); setDeclineReason(''); }}
              onCreateLease={(a) => router.push({
                pathname: '/modal/create-lease',
                params: {
                  applicationId: String(a.id),
                  tenantName: a.tenant.name,
                  listingId: String(id),
                  moveInDate: a.move_in_date,
                  duration: a.duration,
                },
              })}
            />
          ))}
        </ScrollView>
      )}

      {/* Decline modal */}
      <Modal visible={!!declineModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDeclineModal(null)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Decline application</Text>
            <Pressable onPress={() => setDeclineModal(null)}>
              <Text style={{ color: Colors.terracotta, fontFamily: Fonts.heading, fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              {declineModal?.tenant.name} will be notified that their application was not successful.
              Optionally add a brief reason.
            </Text>
            <TextInput
              style={[styles.declineInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
              placeholder="Reason (optional)"
              placeholderTextColor={colors.textSecondary}
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.declineConfirmBtn, declining && { opacity: 0.6 }]}
              onPress={handleDeclineConfirm}
              disabled={declining}
            >
              {declining
                ? <ActivityIndicator color={Colors.desertSand} />
                : <Text style={styles.declineConfirmText}>Decline application</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { marginRight: 16 },
  backText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.terracotta },
  headerTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.desertSand },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 18, marginTop: 12, textAlign: 'center' },
  emptySub: { fontFamily: Fonts.body, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  list: { padding: 16, gap: 12 },

  card: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.display, fontSize: 16 },
  cardMeta: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tenantName: { fontFamily: Fonts.heading, fontSize: 15 },
  statusPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  statusPillText: { fontFamily: Fonts.heading, fontSize: 10, textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontFamily: Fonts.body, fontSize: 11 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scoreText: { fontFamily: Fonts.heading, fontSize: 11, color: Colors.gold },
  scoreCount: { fontFamily: Fonts.body, fontSize: 10 },
  noScore: { fontFamily: Fonts.body, fontSize: 11 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.sage + '15', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  verifiedText: { fontFamily: Fonts.heading, fontSize: 10, color: Colors.sage },

  requestRow: { flexDirection: 'row', gap: 16, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 0.5 },
  requestItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  requestText: { fontFamily: Fonts.body, fontSize: 12 },

  messageWrap: { padding: 14, borderTopWidth: 0.5 },
  messageLabel: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  messageText: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 20 },

  actions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 0.5 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 0.5 },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.terracotta },
  actionBtnText: { fontFamily: Fonts.heading, fontSize: 12 },

  viewLeaseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderTopWidth: 0.5 },
  viewLeaseBtnText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.sky },

  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
  modalTitle: { fontFamily: Fonts.display, fontSize: 20 },
  modalBody: { padding: 20, gap: 16 },
  modalHint: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19 },
  declineInput: { height: 100, borderWidth: 0.5, borderRadius: 12, padding: 12, fontFamily: Fonts.body, fontSize: 14 },
  declineConfirmBtn: { backgroundColor: Colors.terracotta, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  declineConfirmText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.desertSand },
});
