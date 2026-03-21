/**
 * Manage Listing screen — status, premium, boost, analytics, edit, delete.
 * Single hub; analytics charts inline when Premium active.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Alert, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { usePremium } from '@/context/PremiumContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { TargetingPickerModal, type TargetingSelection } from '@/components/TargetingPickerModal';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';
import { formatPrice } from '@/lib/formatters';
import { t } from '@/lib/i18n';
import type { MyListing } from '@/lib/types/my-listing';
import { mapApiMyListing, type ApiMyListing } from '@/lib/types/my-listing';

interface ListingStats {
  views: number;
  enquiries: number;
  daysListed: number;
  is_boosted: boolean;
  boost_expires_at: string | null;
  is_premium?: boolean;
  premium_expires_at?: string | null;
  premium_active?: boolean;
  view_events_total?: number;
  views_since_boost?: number;
}

interface ViewsOverTimePoint { date: string; views: number; }
interface GeoItem { country?: string; region?: string; city?: string; views: number; }
interface ReferrerItem { referrer: string; views: number; }

const MAX_UPGRADE_RETRIES = 5;
const UPGRADE_RETRY_DELAY_MS = 2000;

export default function ManageListingScreen() {
  const { id, upgrade } = useLocalSearchParams<{ id: string; upgrade?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { boostListing, canBoostListing, upgradeListingToPremium, tier } = usePremium();

  const [listing, setListing] = useState<MyListing | null>(null);
  const [stats, setStats] = useState<ListingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [awaitingUpgrade, setAwaitingUpgrade] = useState(false);
  const [targetingModal, setTargetingModal] = useState<'premium' | 'boost' | null>(null);
  const [viewsOverTime, setViewsOverTime] = useState<ViewsOverTimePoint[]>([]);
  const [viewsPeriodTotal, setViewsPeriodTotal] = useState(0);
  const [viewsDays, setViewsDays] = useState<7 | 30>(7);
  const [geo, setGeo] = useState<{ by_country: GeoItem[]; by_region: GeoItem[]; by_city: GeoItem[] } | null>(null);
  const [referrers, setReferrers] = useState<{ by_referrer: ReferrerItem[]; direct: number } | null>(null);

  const loadData = useCallback(async (silent = false): Promise<ListingStats | null> => {
    if (!id) return null;
    if (!silent) setLoading(true);
    try {
      const [listingRes, statsRes] = await Promise.all([
        api.get<ApiMyListing>(Endpoints.listings.show(id)),
        api.get<ListingStats>(`/api/listings/${id}/stats`).catch(() => null),
      ]);
      const mappedListing = mapApiMyListing(listingRes);
      setListing(mappedListing);
      setStats(statsRes);
      return statsRes ?? null;
    } catch (e) {
      const err = e as { message?: string };
      if (!silent) Alert.alert('Error', err?.message ?? 'Could not load listing.');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  const pollUntilUpgradeApplied = useCallback(async (check: (s: ListingStats | null) => boolean) => {
    for (let i = 0; i < MAX_UPGRADE_RETRIES; i++) {
      const s = await loadData(i === 0 ? false : true);
      if (check(s)) return true;
      await new Promise((r) => setTimeout(r, UPGRADE_RETRY_DELAY_MS));
    }
    return false;
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const isPremiumSuccess = upgrade === 'success';
      const isBoostSuccess = upgrade === 'boost';
      if (isPremiumSuccess || isBoostSuccess) {
        setAwaitingUpgrade(true);
        const check = isPremiumSuccess
          ? (s: ListingStats | null) => (s?.premium_active ?? false)
          : (s: ListingStats | null) => (s?.is_boosted ?? false);
        pollUntilUpgradeApplied(check).then((ok) => {
          setAwaitingUpgrade(false);
          if (ok) {
            if (isPremiumSuccess) {
              Alert.alert('Premium activated!', 'Your listing will appear higher in search results for 30 days.');
            } else {
              Alert.alert('Listing boosted!', 'Your listing will appear at the top of search results for 7 days.');
            }
          }
        });
      } else {
        loadData();
      }
    }, [id, upgrade, loadData, pollUntilUpgradeApplied])
  );

  const loadViewsOverTime = useCallback(async (days: 7 | 30) => {
    if (!id) return;
    try {
      const res = await api.get<{ data: ViewsOverTimePoint[]; period_total?: number }>(
        `/api/listings/${id}/analytics/views-over-time?days=${days}`
      );
      setViewsOverTime(res.data ?? []);
      setViewsPeriodTotal(
        typeof res.period_total === 'number'
          ? res.period_total
          : (res.data ?? []).reduce((sum, p) => sum + (p.views ?? 0), 0)
      );
    } catch {
      setViewsOverTime([]);
      setViewsPeriodTotal(0);
    }
  }, [id]);

  const loadAnalyticsBreakdowns = useCallback(async (days: 7 | 30) => {
    if (!id) return;
    try {
      const [geoRes, refRes] = await Promise.all([
        api.get<{ by_country: GeoItem[]; by_region: GeoItem[]; by_city: GeoItem[] }>(
          `/api/listings/${id}/analytics/geographic?days=${days}`
        ).catch(() => null),
        api.get<{ by_referrer: ReferrerItem[]; direct: number }>(
          `/api/listings/${id}/analytics/referrers?days=${days}`
        ).catch(() => null),
      ]);
      setGeo(geoRes ?? null);
      setReferrers(refRes ?? null);
    } catch {
      setGeo(null);
      setReferrers(null);
    }
  }, [id]);

  const hasPremiumAccess = (stats?.premium_active ?? listing?.premiumActive) === true;

  useEffect(() => {
    if (!id || loading || !hasPremiumAccess) {
      setViewsOverTime([]);
      setViewsPeriodTotal(0);
      setGeo(null);
      setReferrers(null);
      return;
    }
    void loadViewsOverTime(viewsDays);
    void loadAnalyticsBreakdowns(viewsDays);
  }, [id, loading, hasPremiumAccess, viewsDays, loadViewsOverTime, loadAnalyticsBreakdowns]);

  const handleStatusToggle = async () => {
    if (!listing || !id) return;
    const newStatus = listing.status === 'active' ? 'paused' : 'active';
    setActionLoading('status');
    try {
      await api.patch(Endpoints.listings.update(id), { status: newStatus });
      setListing((l) => l ? { ...l, status: newStatus as typeof l.status } : l);
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Could not update status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgradeToPremium = () => {
    if (!id) return;
    setTargetingModal('premium');
  };

  const handleBoost = () => {
    if (!id) return;
    if (!canBoostListing) {
      router.push({ pathname: '/modal/upgrade', params: { reason: 'boost' } });
      return;
    }
    setTargetingModal('boost');
  };

  const handleTargetingConfirm = async (targeting: TargetingSelection | null) => {
    if (!id) return;
    const intent = targetingModal;
    setTargetingModal(null);
    if (!intent) return;

    setActionLoading(intent === 'premium' ? 'premium' : 'boost');
    const payload = targeting
      ? { countries: targeting.countries, regions: targeting.regions, cities: targeting.cities }
      : undefined;
    if (intent === 'premium') {
      const success = await upgradeListingToPremium(id, payload ?? undefined);
      if (success) {
        if (Platform.OS === 'web') {
          await loadData();
        } else {
          setAwaitingUpgrade(true);
          pollUntilUpgradeApplied((s) => (s?.premium_active ?? false)).then((ok) => {
            setAwaitingUpgrade(false);
            if (ok) {
              Alert.alert('Premium activated!', 'Your listing will appear higher in search results for 30 days.');
            }
          });
        }
      }
    } else {
      const success = await boostListing(id, payload ?? undefined);
      if (success) {
        router.push(`/(tabs)/(listings)/manage/${id}?upgrade=boost`);
      }
    }
    setActionLoading(null);
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete listing',
      'This will permanently remove the listing. This cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            setActionLoading('delete');
            try {
              await api.delete(Endpoints.listings.destroy(id));
              router.replace('/(tabs)/(listings)');
            } catch (e) {
              const err = e as { message?: string };
              Alert.alert('Error', err?.message ?? 'Could not delete listing.');
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Listing not found.</Text>
      </View>
    );
  }

  const isActive = listing.status === 'active';
  const isBoosted = stats?.is_boosted ?? false;
  const isPremiumActive = stats?.premium_active ?? listing.premiumActive ?? false;
  const premiumExpiresAt = stats?.premium_expires_at;
  const showPremiumProcessing = awaitingUpgrade && upgrade === 'success';
  const showBoostProcessing = awaitingUpgrade && upgrade === 'boost';
  const currency = 'USD'; // TODO: pull from listing when available

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <HabixaIcon name="arrow-left" size={16} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {/* Status + price */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.listingMeta}>
            <Text style={[styles.listingPrice, { color: colors.text }]}>
              {formatPrice(listing.price, currency)}
              <Text style={[styles.listingPriceUnit, { color: colors.textSecondary }]}>{listing.priceLabel}</Text>
            </Text>
            <View style={styles.metaPills}>
              <View style={[
                styles.statusPill,
                isActive ? styles.statusActive : [styles.statusPaused, { borderColor: colors.border }],
              ]}>
                <Text style={[styles.statusText, { color: isActive ? Colors.sage : colors.textSecondary }]}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </Text>
              </View>
              {isPremiumActive && (
                <View style={styles.premiumBadgeSmall}>
                  <HabixaIcon name="star" size={9} color={Colors.gold} solid />
                  <Text style={styles.premiumBadgeSmallText}>Premium</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.listingAddress, { color: colors.textSecondary }]}>{listing.address}</Text>
          <Text style={[styles.listingDetails, { color: colors.textSecondary }]}>
            {listing.bedrooms} bed · {listing.bathrooms} bath
          </Text>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.text }]}>{stats.views}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Views</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.text }]}>{stats.enquiries}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Enquiries</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.text }]}>{stats.daysListed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Days listed</Text>
            </View>
          </View>
        )}

        {/* Active toggle */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>Listing active</Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                {isActive ? 'Visible to renters in search results' : 'Hidden from search results'}
              </Text>
            </View>
            {actionLoading === 'status' ? (
              <ActivityIndicator color={Colors.terracotta} />
            ) : (
              <Switch
                value={isActive}
                onValueChange={handleStatusToggle}
                trackColor={{ true: Colors.sage, false: Colors.muted }}
                thumbColor={Colors.desertSand}
              />
            )}
          </View>
        </View>

        {/* Premium card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: isPremiumActive ? Colors.sage : colors.border }]}>
          <View style={styles.boostHeader}>
            <View style={styles.boostTitleRow}>
              <HabixaIcon name="star" size={14} color={Colors.gold} solid />
              <Text style={[styles.boostTitle, { color: colors.text }]}>
                {isPremiumActive ? 'Premium' : 'Upgrade to Premium'}
              </Text>
            </View>
            {isPremiumActive && (
              <View style={[styles.boostActivePill, { backgroundColor: 'rgba(92,124,111,0.15)', borderColor: Colors.sage }]}>
                <Text style={[styles.boostActivePillText, { color: Colors.sage }]}>Active</Text>
              </View>
            )}
          </View>
          <Text style={[styles.boostDesc, { color: colors.textSecondary }]}>
            {isPremiumActive
              ? premiumExpiresAt
                ? `Expires: ${new Date(premiumExpiresAt).toLocaleDateString()}`
                : 'Premium listing active'
              : 'Get higher visibility in search for 30 days. $19 one-time.'}
          </Text>
          {!isPremiumActive && (
            showPremiumProcessing ? (
              <View style={[styles.boostBtn, { backgroundColor: Colors.muted }]}>
                <ActivityIndicator size="small" color={Colors.midnightInk} />
                <Text style={[styles.boostBtnText, { marginLeft: 8 }]}>Processing…</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.boostBtn, { backgroundColor: Colors.sage }]}
                onPress={handleUpgradeToPremium}
                disabled={actionLoading === 'premium'}
              >
                {actionLoading === 'premium' ? (
                  <ActivityIndicator size="small" color={Colors.midnightInk} />
                ) : (
                  <Text style={styles.boostBtnText}>Upgrade for $19</Text>
                )}
              </Pressable>
            )
          )}
        </View>

        {/* Boost card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: isBoosted ? Colors.gold : colors.border }]}>
          <View style={styles.boostHeader}>
            <View style={styles.boostTitleRow}>
              <HabixaIcon name="bolt" size={14} color={Colors.gold} solid />
              <Text style={[styles.boostTitle, { color: colors.text }]}>
                {isBoosted ? 'Boosted' : t('premium.boostListing')}
              </Text>
            </View>
            {isBoosted && stats?.boost_expires_at && (
              <View style={styles.boostActivePill}>
                <Text style={styles.boostActivePillText}>Active</Text>
              </View>
            )}
          </View>
          <Text style={[styles.boostDesc, { color: colors.textSecondary }]}>
            {isBoosted
              ? `Boost expires: ${stats?.boost_expires_at ? new Date(stats.boost_expires_at).toLocaleDateString() : '—'}`
              : t('premium.boostDesc')}
          </Text>
          {!isBoosted && (
            showBoostProcessing ? (
              <View style={[styles.boostBtn, { backgroundColor: Colors.muted }]}>
                <ActivityIndicator size="small" color={Colors.midnightInk} />
                <Text style={[styles.boostBtnText, { marginLeft: 8 }]}>Processing…</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.boostBtn, !canBoostListing && styles.boostBtnLocked]}
                onPress={handleBoost}
                disabled={actionLoading === 'boost'}
              >
                {actionLoading === 'boost' ? (
                  <ActivityIndicator size="small" color={Colors.midnightInk} />
                ) : (
                  <>
                    {!canBoostListing && <HabixaIcon name="lock" size={12} color={Colors.midnightInk} />}
                    <Text style={styles.boostBtnText}>
                      {canBoostListing
                        ? tier === 'pro' ? 'Use free boost' : `${t('premium.boostCta')} $15`
                        : 'Upgrade to boost'}
                    </Text>
                  </>
                )}
              </Pressable>
            )
          )}
        </View>

        {/* Analytics (Premium only) */}
        {isPremiumActive && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>View insights</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.chartToggle}>
                <Pressable
                  style={[styles.chartTab, viewsDays === 7 && styles.chartTabActive]}
                  onPress={() => { setViewsDays(7); loadViewsOverTime(7); loadAnalyticsBreakdowns(7); }}
                >
                  <Text style={[styles.chartTabText, { color: viewsDays === 7 ? Colors.midnightInk : colors.textSecondary }]}>7 days</Text>
                </Pressable>
                <Pressable
                  style={[styles.chartTab, viewsDays === 30 && styles.chartTabActive]}
                  onPress={() => { setViewsDays(30); loadViewsOverTime(30); loadAnalyticsBreakdowns(30); }}
                >
                  <Text style={[styles.chartTabText, { color: viewsDays === 30 ? Colors.midnightInk : colors.textSecondary }]}>30 days</Text>
                </Pressable>
              </View>
              <Text style={[styles.chartPeriodSummary, { color: colors.textSecondary }]}>
                {viewsPeriodTotal} views in the last {viewsDays} days
              </Text>
              <View style={styles.chartBars}>
                {viewsOverTime.map((p) => {
                  const max = Math.max(1, ...viewsOverTime.map((x) => x.views));
                  const h = max > 0 ? Math.max(4, (p.views / max) * 60) : 4;
                  const label = new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <View key={p.date} style={styles.chartBarWrap}>
                      <View style={[styles.chartBar, { height: h, backgroundColor: Colors.sage }]} />
                      <Text style={[styles.chartBarLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
                      <Text style={[styles.chartBarValue, { color: colors.text }]}>{p.views}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            {geo && (geo.by_country.length > 0 || geo.by_city.length > 0) && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Views by location</Text>
                {geo.by_country.slice(0, 5).map((r, i) => (
                  <View key={i} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: colors.text }]}>{r.country}</Text>
                    <Text style={[styles.breakdownValue, { color: colors.textSecondary }]}>{r.views}</Text>
                  </View>
                ))}
              </View>
            )}
            {referrers && (referrers.by_referrer.length > 0 || referrers.direct > 0) && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Traffic sources</Text>
                {referrers.direct > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: colors.text }]}>Direct</Text>
                    <Text style={[styles.breakdownValue, { color: colors.textSecondary }]}>{referrers.direct}</Text>
                  </View>
                )}
                {referrers.by_referrer.slice(0, 5).map((r, i) => (
                  <View key={i} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: colors.text }]} numberOfLines={1}>
                      {r.referrer.replace(/^https?:\/\//, '').split('/')[0]}
                    </Text>
                    <Text style={[styles.breakdownValue, { color: colors.textSecondary }]}>{r.views}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Actions */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Actions</Text>
          <Pressable
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/(tabs)/(listings)/create?editId=${id}`)}
          >
            <HabixaIcon name="edit" size={14} color={Colors.terracotta} />
            <Text style={[styles.actionText, { color: colors.text }]}>{t('common.edit')} listing</Text>
            <HabixaIcon name="chevron-right" size={12} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/(tabs)/(listings)/applicants/${id}`)}
          >
            <HabixaIcon name="users" size={14} color={Colors.sage} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              View applicants{listing.applicantsCount != null ? ` (${listing.applicantsCount})` : ''}
            </Text>
            <HabixaIcon name="chevron-right" size={12} color={colors.textSecondary} />
          </Pressable>
          {listing.hasLease && (
            <Pressable
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/(tabs)/(listings)/lease/${id}`)}
            >
              <HabixaIcon name="file-alt" size={14} color={Colors.sky} />
              <Text style={[styles.actionText, { color: colors.text }]}>View lease</Text>
              <HabixaIcon name="chevron-right" size={12} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Danger zone */}
        <View style={[styles.card, styles.dangerCard, { borderColor: 'rgba(194,103,58,0.3)' }]}>
          <Text style={[styles.sectionLabel, { color: Colors.terracotta }]}>Danger zone</Text>
          <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={actionLoading === 'delete'}>
            {actionLoading === 'delete' ? (
              <ActivityIndicator size="small" color={Colors.terracotta} />
            ) : (
              <>
                <HabixaIcon name="trash" size={14} color={Colors.terracotta} />
                <Text style={styles.deleteBtnText}>{t('common.delete')} listing permanently</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <TargetingPickerModal
        visible={targetingModal !== null}
        onClose={() => setTargetingModal(null)}
        onConfirm={handleTargetingConfirm}
        title={targetingModal === 'premium' ? 'Target Premium ad' : 'Target Boost'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: Fonts.body, fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { padding: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 16, textAlign: 'center' },
  headerRight: { width: 36 },
  scroll: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 0.5, padding: 16 },
  listingMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metaPills: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '55%' },
  premiumBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.gold, backgroundColor: 'rgba(184, 137, 42, 0.12)' },
  premiumBadgeSmallText: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 0.5, color: Colors.gold },
  listingPrice: { fontFamily: Fonts.display, fontSize: 20 },
  listingPriceUnit: { fontSize: 12, fontFamily: Fonts.body },
  listingAddress: { fontFamily: Fonts.body, fontSize: 13, marginBottom: 2 },
  listingDetails: { fontFamily: Fonts.body, fontSize: 12 },
  statusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 0.5 },
  statusActive: { backgroundColor: 'rgba(92,124,111,0.12)', borderColor: Colors.sage },
  statusPaused: { backgroundColor: 'rgba(15,22,35,0.06)', borderColor: Colors.muted },
  statusText: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 0.5, padding: 12, alignItems: 'center' },
  statNum: { fontFamily: Fonts.display, fontSize: 22 },
  statLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  statSub: { fontFamily: Fonts.body, fontSize: 10, marginTop: 4, textAlign: 'center' },
  chartToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chartTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  chartTabActive: { backgroundColor: Colors.sage },
  chartTabText: { fontFamily: Fonts.heading, fontSize: 13 },
  chartPeriodSummary: { fontFamily: Fonts.body, fontSize: 12, marginBottom: 8 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, minHeight: 80 },
  chartBarWrap: { flex: 1, alignItems: 'center', minWidth: 24 },
  chartBar: { width: '80%', borderRadius: 4 },
  chartBarLabel: { fontFamily: Fonts.body, fontSize: 9, marginTop: 4 },
  chartBarValue: { fontFamily: Fonts.display, fontSize: 10, marginTop: 2 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  breakdownLabel: { fontFamily: Fonts.body, fontSize: 13, flex: 1 },
  breakdownValue: { fontFamily: Fonts.display, fontSize: 13 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  toggleTitle: { fontFamily: Fonts.heading, fontSize: 14, marginBottom: 2 },
  toggleDesc: { fontFamily: Fonts.body, fontSize: 12 },
  boostHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  boostTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boostTitle: { fontFamily: Fonts.heading, fontSize: 14 },
  boostActivePill: { backgroundColor: 'rgba(212,168,67,0.15)', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 0.5, borderColor: Colors.gold },
  boostActivePillText: { fontFamily: Fonts.heading, fontSize: 10, color: Colors.gold, letterSpacing: 0.5 },
  boostDesc: { fontFamily: Fonts.body, fontSize: 13, marginBottom: 12 },
  boostBtn: { backgroundColor: Colors.gold, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  boostBtnLocked: { backgroundColor: Colors.sand2 },
  boostBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.midnightInk },
  sectionLabel: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 0.5 },
  actionText: { flex: 1, fontFamily: Fonts.heading, fontSize: 14 },
  dangerCard: { backgroundColor: 'rgba(194,103,58,0.04)' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  deleteBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.terracotta },
});
