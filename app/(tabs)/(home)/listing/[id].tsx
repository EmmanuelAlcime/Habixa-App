import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { ImageGallery } from '@/components/ImageGallery';
import { MapContent } from '@/components/MapContent';
import { RelatedListingsSection } from '@/components/RelatedListingsSection';
import { Colors, Fonts } from '@/constants/theme';
import { useListing } from '@/hooks/useListing';
import { useLikes } from '@/hooks/useLikes';
import { api, Endpoints } from '@/lib/api/client';
import { getPropertyTypeLabel, isLandType } from '@/lib/constants/propertyTypes';
import { getAmenityById } from '@/lib/constants/amenities';
import { format, parseISO, isValid } from 'date-fns';

export default function ListingDetailScreen() {
  const { id, country, state, city } = useLocalSearchParams<{
    id: string;
    country?: string;
    state?: string;
    city?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const viewContext = useMemo(
    () => ({
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
    }),
    [country, state, city]
  );
  const { listing, loading, error, refetch } = useListing(id, viewContext);
  const { likedIds, toggleLike } = useLikes();
  const isLiked = id ? likedIds.has(id) : false;
  const [messageLoading, setMessageLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isOwner = listing && user && listing.userId === user.id;

  async function handleUnpublish() {
    if (!listing) return;
    Alert.alert(
      'Unpublish listing',
      `Unpublish "${listing.title}"? It will no longer appear in search results. You can publish again anytime from Edit.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpublish',
          onPress: async () => {
            setActionLoading('unpublish');
            try {
              await api.patch(Endpoints.listings.update(listing.id), { status: 'paused' });
              await refetch();
            } catch (e) {
              const err = e as { message?: string };
              Alert.alert('Error', err?.message ?? 'Failed to unpublish listing');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }

  async function handlePublish() {
    if (!listing) return;
    setActionLoading('publish');
    try {
      await api.patch(Endpoints.listings.update(listing.id), { status: 'active' });
      await refetch();
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Failed to publish listing');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!listing) return;
    Alert.alert(
      'Delete listing',
      `Are you sure you want to delete "${listing.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('delete');
            try {
              await api.delete(Endpoints.listings.destroy(listing.id));
              router.back();
            } catch (e) {
              const err = e as { message?: string };
              Alert.alert('Error', err?.message ?? 'Failed to delete listing');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }

  async function handleMessage() {
    if (!listing || !listing.userId) return;
    setMessageLoading(true);
    try {
      const res = await api.post<{ id: number }>(Endpoints.conversations.store(), {
        listing_id: Number(listing.id),
        participant_id: Number(listing.userId),
      });
      const conversationId = res?.id ?? (res as { data?: { id?: number } })?.data?.id;
      if (conversationId) {
        const draft = encodeURIComponent(
          `Hi, I'm interested in your listing at ${listing.address}.`
        );
        router.push(`/(tabs)/(messages)/${conversationId}?draft=${draft}`);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.warn('Failed to create conversation:', err?.message);
    } finally {
      setMessageLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Loading…</Text>
      </View>
    );
  }
  if (error || !listing) {
    return (
      <View style={styles.container}>
        <Text>{error ?? 'Listing not found'}</Text>
      </View>
    );
  }

  const priceStr = listing.priceLabel
    ? `$${listing.price.toLocaleString()} ${listing.priceLabel}`
    : `$${listing.price.toLocaleString()}`;

  const propertyTypeLabel = getPropertyTypeLabel(listing.property_type);
  const isLand = isLandType(listing.property_type);

  const hasCoords =
    listing.latitude != null &&
    listing.longitude != null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <Animated.View
        sharedTransitionTag={`listing-${id}`}
        style={[styles.headerImg, { backgroundColor: listing.imgBg || '#C8DCC8' }]}
      >
        <ImageGallery
          photos={listing.photos ?? []}
          fallbackColor={listing.imgBg || '#C8DCC8'}
          height={220}
        />
        <Pressable style={styles.detailBack} onPress={() => router.back()}>
          <HabixaIcon name="arrow-left" size={14} color={Colors.midnightInk} solid />
        </Pressable>
        <Pressable style={styles.detailFav} onPress={() => id && toggleLike(id)}>
          <HabixaIcon
            name="heart"
            size={14}
            color={isLiked ? Colors.terracotta : Colors.midnightInk}
            solid={isLiked}
          />
        </Pressable>
        <Pressable style={styles.detailShare}>
          <HabixaIcon name="share-alt" size={14} color={Colors.midnightInk} solid />
        </Pressable>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailBody}>
          <Text style={[styles.detailPrice, { color: colors.text }]}>
            {priceStr}
            {listing.priceLabel && (
              <Text style={styles.detailPriceUnit}> {listing.priceLabel}</Text>
            )}
          </Text>
          <Text style={[styles.detailTitle, { color: colors.text }]}>{listing.title}</Text>
          <Text style={[styles.detailPropertyType, { color: colors.textSecondary }]}>
            {propertyTypeLabel} · {listing.badge ?? 'For Rent'}
          </Text>
          <View style={styles.detailLoc}>
            <HabixaIcon name="map-marker-alt" size={11} color={Colors.terracotta} solid />
            <Text style={[styles.detailLocText, { color: Colors.muted }]}>
              {listing.address}
              {listing.address.includes('NP') ? '' : ', New Providence'}
            </Text>
          </View>

          <View style={styles.detailStats}>
            {!isLand && (
              <>
                <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <HabixaIcon name="bed" size={11} color={Colors.sage} solid />
                  <Text style={[styles.statPillText, { color: colors.text }]}>
                    {listing.bedrooms} Beds
                  </Text>
                </View>
                <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <HabixaIcon name="bath" size={11} color={Colors.sage} solid />
                  <Text style={[styles.statPillText, { color: colors.text }]}>
                    {listing.bathrooms} Bath
                  </Text>
                </View>
              </>
            )}
            {listing.sqft && (
              <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <HabixaIcon name="ruler" size={11} color={Colors.sage} solid />
                <Text style={[styles.statPillText, { color: colors.text }]}>
                  {listing.sqft} sqft{isLand ? ' lot' : ''}
                </Text>
              </View>
            )}
          </View>

          {isOwner ? (
            <View style={[styles.ctaRow, { marginTop: 8, marginBottom: 20, flexWrap: 'wrap', gap: 10 }]}>
              <Pressable
                style={[styles.ctaMsg, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/(tabs)/(listings)/manage/${listing.id}`)}
              >
                <HabixaIcon name="pencil-alt" size={13} color={Colors.sage} solid />
                <Text style={[styles.ctaMsgText, { color: colors.text }]}>Edit</Text>
              </Pressable>
              {listing.status === 'active' ? (
                <Pressable
                  style={[styles.ctaMsg, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleUnpublish}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'unpublish' ? (
                    <ActivityIndicator size="small" color={Colors.terracotta} />
                  ) : (
                    <HabixaIcon name="eye-slash" size={13} color={Colors.terracotta} solid />
                  )}
                  <Text style={[styles.ctaMsgText, { color: Colors.terracotta }]}>Unpublish</Text>
                </Pressable>
              ) : listing.status === 'paused' ? (
                <Pressable
                  style={[styles.ctaMsg, { backgroundColor: Colors.terracotta }]}
                  onPress={handlePublish}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'publish' ? (
                    <ActivityIndicator size="small" color={Colors.desertSand} />
                  ) : (
                    <HabixaIcon name="eye" size={13} color={Colors.desertSand} solid />
                  )}
                  <Text style={[styles.ctaMsgText, { color: Colors.desertSand }]}>Publish</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.ctaMsg, { borderColor: 'rgba(194,103,58,0.4)', backgroundColor: 'rgba(194,103,58,0.08)' }]}
                onPress={handleDelete}
                disabled={!!actionLoading}
              >
                {actionLoading === 'delete' ? (
                  <ActivityIndicator size="small" color={Colors.terracotta} />
                ) : (
                  <HabixaIcon name="trash" size={13} color={Colors.terracotta} solid />
                )}
                <Text style={[styles.ctaMsgText, { color: Colors.terracotta }]}>Delete</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.ctaRow, { marginTop: 8, marginBottom: 20 }]}>
              <Pressable
                style={[styles.ctaMsg, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleMessage}
                disabled={messageLoading || !listing.userId}
              >
                {messageLoading ? (
                  <ActivityIndicator size="small" color={Colors.sage} />
                ) : (
                  <HabixaIcon name="comment" size={13} color={Colors.sage} />
                )}
                <Text style={[styles.ctaMsgText, { color: colors.text }]}>Message</Text>
              </Pressable>
              <Pressable
                style={styles.ctaApply}
                onPress={() => router.push({
                  pathname: '/modal/apply',
                  params: {
                    listingId: listing.id,
                    listingAddress: listing.address,
                    listingPrice: String(listing.price),
                    currency: listing.currency ?? 'USD',
                    landlordName: listing.landlordName,
                  },
                })}
              >
                <HabixaIcon name="paper-plane" size={13} color={Colors.desertSand} solid />
                <Text style={styles.ctaApplyText}>Apply Now</Text>
              </Pressable>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            About this property
          </Text>
          {listing.description && listing.description.trim() ? (
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              {listing.description}
            </Text>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <HabixaIcon name="info-circle" size={18} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No information available for this property yet
              </Text>
            </View>
          )}

          {listing.amenities && listing.amenities.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Amenities</Text>
              <View style={styles.amenities}>
                {listing.amenities.map((id) => {
                  const a = getAmenityById(id);
                  if (!a) return null;
                  return (
                    <View
                      key={a.id}
                      style={[styles.amenity, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <HabixaIcon name={a.icon} size={11} color={Colors.sage} solid />
                      <Text style={[styles.amenityText, { color: colors.text }]}>{a.label}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.sectionDivider} />

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Listed by</Text>
          <Pressable
            style={[styles.landlordCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() =>
              router.push(
                listing.userId
                  ? `/profile/${listing.userId}`
                  : `/profile/${(listing.landlordFullName || listing.landlordName).replace(/\s/g, '-').toLowerCase()}`
              )
            }
          >
            <View style={[styles.avatarMd, { backgroundColor: 'rgba(194,103,58,0.15)' }]}>
              <Text style={[styles.avatarMdText, { color: Colors.terracotta }]}>
                {listing.landlordInitials}
              </Text>
            </View>
            <View style={styles.landlordInfo}>
              <Text style={[styles.landlordName, { color: colors.text }]}>
                {listing.landlordFullName || listing.landlordName}
              </Text>
              <View style={styles.landlordScoreRow}>
                <View style={styles.scoreBadge}>
                  <HabixaIcon name="star" size={9} color={Colors.gold} solid />
                  <Text style={styles.scoreBadgeText}>{listing.landlordScore}</Text>
                </View>
                <Text style={[styles.landlordReviews, { color: colors.textSecondary }]}>
                  {listing.reviewsCount} reviews · 3 yrs on Habixa
                </Text>
              </View>
            </View>
            <Text style={styles.landlordView}>View </Text>
            <HabixaIcon name="chevron-right" size={10} color={Colors.terracotta} />
          </Pressable>

          <View style={styles.sectionDivider} />

          {hasCoords && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Location
              </Text>
              <View style={styles.mapWrap}>
                <MapContent
                  listings={[listing]}
                  router={router}
                  compact
                />
              </View>
              <View style={styles.sectionDivider} />
            </>
          )}

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Lease terms</Text>
          <View style={styles.leaseTerms}>
            <View>
              <View style={styles.leaseTermRow}>
                <HabixaIcon name="calendar" size={11} color={Colors.sage} />
                <Text style={[styles.leaseTermValue, { color: colors.text }]}>12 months</Text>
              </View>
              <Text style={[styles.leaseTermLabel, { color: Colors.muted }]}>Min. lease</Text>
            </View>
            <View>
              <View style={styles.leaseTermRow}>
                <HabixaIcon name="dollar-sign" size={11} color={Colors.sage} solid />
                <Text style={[styles.leaseTermValue, { color: colors.text }]}>
                  ${listing.price.toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.leaseTermLabel, { color: Colors.muted }]}>Security dep.</Text>
            </View>
            <View>
              <View style={styles.leaseTermRow}>
                <HabixaIcon name="check-circle" size={11} color={Colors.sage} />
                <Text style={[styles.leaseTermValue, { color: colors.text }]}>
                  {listing.availableDate
                    ? (() => {
                        const d = parseISO(listing.availableDate);
                        return isValid(d) ? format(d, 'MMM d') : listing.availableDate;
                      })()
                    : 'Not specified'}
                </Text>
              </View>
              <Text style={[styles.leaseTermLabel, { color: Colors.muted }]}>Available</Text>
            </View>
          </View>
        </View>

        <RelatedListingsSection listingId={id} enabled={!!listing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerImg: {
    height: 220,
    position: 'relative',
  },
  mapWrap: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  detailBack: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailFav: {
    position: 'absolute',
    top: 48,
    right: 58,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailShare: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {},
  detailBody: {
    padding: 20,
  },
  detailPrice: {
    fontFamily: Fonts.display,
    fontSize: 28,
  },
  detailPriceUnit: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: Fonts.body,
  },
  detailTitle: {
    fontSize: 15,
    fontFamily: Fonts.heading,
    marginVertical: 4,
  },
  detailPropertyType: {
    fontSize: 12,
    fontFamily: Fonts.body,
    marginBottom: 4,
  },
  detailLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  detailLocText: {
    fontSize: 12,
  },
  detailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  statPillText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 12,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    flex: 1,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  amenityText: {
    fontSize: 11,
  },
  sectionDivider: {
    height: 0.5,
    backgroundColor: 'rgba(15, 22, 35, 0.1)',
    marginVertical: 16,
  },
  landlordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  avatarMd: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMdText: {
    fontSize: 15,
    fontFamily: Fonts.heading,
  },
  landlordInfo: {
    flex: 1,
  },
  landlordName: {
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  landlordScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.midnightInk,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    color: Colors.gold,
  },
  landlordReviews: {
    fontSize: 11,
  },
  landlordView: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    color: Colors.terracotta,
  },
  leaseTerms: {
    flexDirection: 'row',
    gap: 16,
  },
  leaseTermRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaseTermValue: {
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  leaseTermLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaMsg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  ctaMsgText: {
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  ctaApply: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.terracotta,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaApplyText: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.desertSand,
  },
});
