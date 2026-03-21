import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { EmptyListingsSvg } from '@/components/EmptyListingsSvg';
import { Colors, Fonts } from '@/constants/theme';
import { useMyListings } from '@/hooks/useMyListings';
import { useProfile } from '@/hooks/useProfile';

export default function MyListingsDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { listings: mockMyListings, loading, error, refetch } = useMyListings();
  const { profile } = useProfile();

  const avgScore = profile?.landlord_score?.score != null
    ? profile.landlord_score.score.toFixed(1)
    : '—';

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const activeCount = mockMyListings.filter((l) => l.status === 'active').length;
  const pendingCount = mockMyListings.filter((l) => l.status === 'pending').length;
  const draftCount = mockMyListings.filter((l) => l.status === 'draft').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>My Listings</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/(listings)/create')}
        >
          <HabixaIcon name="plus" size={16} color={Colors.desertSand} solid />
        </Pressable>
      </View>

      <View style={styles.stats}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.text }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.text }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.text }]}>{draftCount}</Text>
          <Text style={styles.statLabel}>Drafts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: Colors.gold }]}>{avgScore}</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <HabixaIcon name="exclamation-circle" size={48} color={Colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{error}</Text>
        </View>
      ) : mockMyListings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyListingsSvg color={Colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No listings yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap the + button to create your first listing
          </Text>
          <Pressable
            style={[styles.emptyCta, { backgroundColor: Colors.terracotta }]}
            onPress={() => router.push('/(tabs)/(listings)/create')}
          >
            <HabixaIcon name="plus" size={14} color={Colors.desertSand} solid />
            <Text style={styles.emptyCtaText}>Create listing</Text>
          </Pressable>
        </View>
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mockMyListings.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.listingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/(tabs)/(listings)/listing/${item.id}`)}
          >
            <View style={[styles.listingImg, { backgroundColor: item.imgBg }]}>
              {item.featuredImage ? (
                <Image
                  source={{ uri: item.featuredImage }}
                  style={styles.listingImgPhoto}
                  contentFit="cover"
                />
              ) : (
                <HabixaIcon
                  name={item.bedrooms > 2 ? 'home' : 'building'}
                  size={36}
                  color={colors.text}
                />
              )}
              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.statusPill,
                    item.status === 'active' && styles.statusActive,
                  item.status === 'pending' && styles.statusPending,
                  item.status === 'draft' && styles.statusDraft,
                  item.status === 'paused' && styles.statusPaused,
                ]}
              >
                <HabixaIcon
                  name={item.status === 'active' ? 'check-circle' : item.status === 'draft' ? 'edit' : item.status === 'paused' ? 'eye-slash' : 'clock'}
                  size={8}
                  color={item.status === 'active' ? Colors.sage : item.status === 'draft' ? Colors.muted : item.status === 'paused' ? Colors.muted : '#9A7A1A'}
                  solid={item.status === 'active'}
                />
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'active' && styles.statusTextActive,
                    item.status === 'pending' && styles.statusTextPending,
                    item.status === 'draft' && styles.statusTextDraft,
                    item.status === 'paused' && styles.statusTextPaused,
                  ]}
                >
                  {item.status === 'active' ? 'Active' : item.status === 'draft' ? 'Draft' : item.status === 'paused' ? 'Paused' : 'Pending'}
                </Text>
              </View>
                {item.premiumActive && (
                  <View style={styles.premiumPill}>
                    <HabixaIcon name="star" size={9} color="#C99B2E" solid />
                    <Text style={styles.premiumPillText}>Premium listing</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.listingBody}>
              <Text style={[styles.listingPrice, { color: colors.text }]}>
                ${item.price.toLocaleString()}
                <Text style={[styles.listingPriceUnit, { color: colors.textSecondary }]}>{item.priceLabel}</Text>
              </Text>
              <Text style={[styles.listingName, { color: colors.textSecondary }]}>{item.title}</Text>
              <View style={styles.listingActions}>
                {item.status === 'draft' ? (
                  <>
                    <Pressable
                      style={[styles.actionBtn, styles.actionBtnPrimary]}
                      onPress={() => router.push(`/(tabs)/(listings)/create?draftId=${item.id}`)}
                    >
                      <HabixaIcon name="edit" size={10} color={Colors.desertSand} solid />
                      <Text style={[styles.actionBtnText, { color: Colors.desertSand }]}>Continue</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => router.push(`/(tabs)/(listings)/manage/${item.id}`)}
                    >
                      <HabixaIcon name="pencil-alt" size={10} color={colors.text} solid />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => router.push(`/(tabs)/(listings)/manage/${item.id}`)}
                    >
                      <HabixaIcon name="pencil-alt" size={10} color={colors.text} solid />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => router.push(`/(tabs)/(listings)/applicants/${item.id}`)}
                    >
                      <HabixaIcon name="users" size={10} color={colors.text} solid />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>
                        Applicants{item.applicantsCount != null ? ` (${item.applicantsCount})` : ''}
                      </Text>
                    </Pressable>
                    {item.hasLease && (
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push(`/(tabs)/(listings)/lease/${item.id}`)}
                      >
                        <HabixaIcon name="file-alt" size={10} color={colors.text} solid />
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>Lease</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 18,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
  },
  addBtn: {
    width: 36,
    height: 36,
    backgroundColor: Colors.terracotta,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    paddingHorizontal: 20,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: Fonts.display,
    fontSize: 22,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.sage,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyCtaText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.desertSand,
  },
  listingItem: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  listingImg: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingImgPhoto: {
    width: '100%',
    height: '100%',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  badgesRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  statusActive: {
    backgroundColor: 'rgba(92,124,111,0.15)',
    borderColor: Colors.sage,
  },
  statusPending: {
    backgroundColor: 'rgba(212,168,67,0.15)',
    borderColor: Colors.gold,
  },
  statusDraft: {
    backgroundColor: 'rgba(15, 22, 35, 0.08)',
    borderColor: Colors.muted,
  },
  statusPaused: {
    backgroundColor: 'rgba(15, 22, 35, 0.08)',
    borderColor: Colors.muted,
  },
  statusText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusTextActive: {
    color: Colors.sage,
  },
  statusTextPending: {
    color: '#9A7A1A',
  },
  statusTextDraft: {
    color: Colors.muted,
  },
  statusTextPaused: {
    color: Colors.muted,
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C99B2E',
    backgroundColor: 'rgba(201, 155, 46, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  premiumPillText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.midnightInk,
  },
  listingBody: {
    padding: 12,
    paddingTop: 10,
  },
  listingPrice: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  listingPriceUnit: {
    fontSize: 11,
    fontFamily: Fonts.body,
  },
  listingName: {
    fontSize: 12,
    marginTop: 1,
    marginBottom: 8,
  },
  listingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.terracotta,
  },
  actionBtnText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  actionBtnDanger: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(194,103,58,0.3)',
    backgroundColor: 'rgba(194,103,58,0.05)',
  },
});
