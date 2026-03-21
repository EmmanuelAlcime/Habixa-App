import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { ShimmerPlaceholder } from '@/components/ShimmerPlaceholder';
import { Colors, Fonts } from '@/constants/theme';

import { useListings, type ListingsParams } from '@/hooks/useListings';
import { useLikes } from '@/hooks/useLikes';
import { useRentDue } from '@/hooks/useRentDue';
import { DEFAULT_CITY } from '@/lib/config';
import { useNotifications } from '@/hooks/useNotifications';
import { formatPrice } from '@/lib/formatters';
import type { Listing } from '@/lib/types/listing';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

const CHIPS = ['All', 'Apartments', 'Houses', 'Condos', 'Townhouses', 'Studios', 'Rooms', 'Land', 'For Sale'] as const;

/** Map chip index to API params for server-side filtering */
function chipToParams(chipIndex: number): ListingsParams | undefined {
  if (chipIndex === 0) return undefined; // All
  const chip = CHIPS[chipIndex];
  if (chip === 'For Sale') return { type: 'sale' };
  const propertyTypeMap: Record<string, string> = {
    Apartments: 'apartment',
    Houses: 'house',
    Condos: 'condo',
    Townhouses: 'townhouse',
    Studios: 'studio',
    Rooms: 'room',
    Land: 'land',
  };
  const property_type = propertyTypeMap[chip];
  return property_type ? { property_type } : undefined;
}

function filterByChip<T extends Listing>(items: T[], chipIndex: number): T[] {
  if (chipIndex === 0) return items; // All
  const chip = CHIPS[chipIndex];
  if (chip === 'Apartments') return items.filter((item) => item.property_type === 'apartment');
  if (chip === 'Houses') return items.filter((item) => item.property_type === 'house');
  if (chip === 'Condos') return items.filter((item) => item.property_type === 'condo');
  if (chip === 'Townhouses') return items.filter((item) => item.property_type === 'townhouse');
  if (chip === 'Studios') return items.filter((item) => item.property_type === 'studio');
  if (chip === 'Rooms') return items.filter((item) => item.property_type === 'room');
  if (chip === 'Land') return items.filter((item) => item.property_type === 'land');
  if (chip === 'For Sale') return items.filter((item) => item.badge === 'For Sale');
  return items;
}

function FeaturedShimmer() {
  return (
    <View style={styles.featuredCard}>
      <View style={styles.featuredImg}>
        <ShimmerPlaceholder width="100%" height={110} borderRadius={0} baseColor={Colors.ink2} />
      </View>
      <View style={styles.featuredBody}>
        <ShimmerPlaceholder width={60} height={14} borderRadius={4} baseColor="rgba(255,255,255,0.15)" style={{ marginBottom: 8 }} />
        <ShimmerPlaceholder width={100} height={18} borderRadius={4} baseColor="rgba(255,255,255,0.15)" style={{ marginBottom: 4 }} />
        <ShimmerPlaceholder width={140} height={12} borderRadius={4} baseColor="rgba(255,255,255,0.1)" />
      </View>
    </View>
  );
}

function PropCardShimmer({
  colors,
  cardWidth,
}: {
  colors: typeof Colors.light;
  cardWidth?: number;
}) {
  return (
    <View
      style={[
        styles.propCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        cardWidth !== undefined && { width: cardWidth },
      ]}
    >
      <ShimmerPlaceholder width="100%" height={150} borderRadius={0} />
      <View style={styles.propBody}>
        <ShimmerPlaceholder width={120} height={22} borderRadius={6} style={{ marginBottom: 8 }} />
        <ShimmerPlaceholder width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
        <ShimmerPlaceholder width={160} height={12} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={[styles.propFooter, { borderTopColor: colors.border }]}>
          <View style={styles.propLandlord}>
            <ShimmerPlaceholder width={22} height={22} borderRadius={11} />
            <ShimmerPlaceholder width={80} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
          </View>
          <ShimmerPlaceholder width={90} height={12} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

function FeaturedCard({
  item,
  colors,
}: {
  item: Listing;
  colors: typeof Colors.light;
}) {
  const router = useRouter();
  const priceStr = item.priceLabel
    ? `$${item.price.toLocaleString()}${item.priceLabel}`
    : `$${item.price.toLocaleString()}`;

  const firstPhoto = item.photos?.[0];
  return (
    <Pressable
      style={styles.featuredCard}
      onPress={() => router.push(`/(tabs)/(home)/listing/${item.id}`)}
    >
      <Animated.View
        sharedTransitionTag={`listing-${item.id}`}
        style={[styles.featuredImg, { backgroundColor: item.imgBg || Colors.ink2 }]}
      >
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <HabixaIcon name="building" size={40} color={Colors.sky} />
        )}
      </Animated.View>
      <View style={styles.featuredBody}>
        <View style={styles.featuredBadge}>
          <HabixaIcon name="bolt" size={7} color={Colors.midnightInk} solid />
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
        <Text style={styles.featuredPrice}>
          {priceStr}
          {item.priceLabel && <Text style={styles.featuredPriceUnit}>{item.priceLabel}</Text>}
        </Text>
        <Text style={styles.featuredName}>{item.title}</Text>
      </View>
    </Pressable>
  );
}

function PropCard({
  item,
  colors,
  isLiked,
  onToggleLike,
  cardWidth,
}: {
  item: Listing;
  colors: typeof Colors.light;
  isLiked: boolean;
  onToggleLike: (id: string) => void;
  cardWidth?: number;
}) {
  const router = useRouter();
  const priceStr = item.priceLabel
    ? `$${item.price.toLocaleString()} ${item.priceLabel}`
    : `$${item.price.toLocaleString()}`;

  const firstPhoto = item.photos?.[0];
  return (
    <Pressable
      style={[
        styles.propCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        cardWidth !== undefined && { width: cardWidth },
      ]}
      onPress={() => router.push(`/(tabs)/(home)/listing/${item.id}`)}
    >
      <View style={styles.propImgWrap}>
        <Animated.View
          sharedTransitionTag={`listing-${item.id}`}
          style={[styles.propImgPlaceholder, { backgroundColor: item.imgBg || Colors.sand2 }]}
        >
          {firstPhoto ? (
            <Image source={{ uri: firstPhoto.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <HabixaIcon name="building" size={52} color={colors.text} />
          )}
        </Animated.View>
        <View style={[styles.propBadge, { backgroundColor: item.badge === 'For Sale' ? Colors.sage : Colors.terracotta }]}>
          <Text style={styles.propBadgeText}>{item.badge || 'For Rent'}</Text>
        </View>
        <Pressable
          style={styles.propFav}
          onPress={() => onToggleLike(item.id)}
        >
          <HabixaIcon
            name="heart"
            size={14}
            color={isLiked ? Colors.terracotta : Colors.muted}
            solid={isLiked}
          />
        </Pressable>
      </View>
      <View style={styles.propBody}>
        <Text style={[styles.propPrice, { color: colors.text }]}>
          {priceStr}
          {item.priceLabel && <Text style={[styles.propPriceUnit, { color: colors.textSecondary }]}> {item.priceLabel}</Text>}
        </Text>
        <Text style={[styles.propName, { color: colors.text }]}>{item.title}</Text>
        <View style={styles.propLocation}>
          <HabixaIcon name="map-marker-alt" size={10} color={Colors.terracotta} solid />
          <Text style={[styles.propLocationText, { color: colors.textSecondary }]}>{item.address}</Text>
        </View>
        <View style={[styles.propFooter, { borderTopColor: colors.border }]}>
          <View style={styles.propLandlord}>
            <View style={[styles.avatarXs, { backgroundColor: 'rgba(194,103,58,0.15)' }]}>
              <Text style={[styles.avatarXsText, { color: Colors.terracotta }]}>{item.landlordInitials}</Text>
            </View>
            <Text style={[styles.propLandlordName, { color: colors.textSecondary }]}>{item.landlordName}</Text>
          </View>
          <View style={styles.propScore}>
            <HabixaIcon name="star" size={10} color={Colors.gold} solid />
            <Text style={[styles.propScoreText, { color: colors.text }]}>
              {item.landlordScore} · {item.reviewsCount} reviews
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const DESKTOP_BREAKPOINT = 768;

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [activeChip, setActiveChip] = React.useState(0);
  const listingsParams = React.useMemo(() => chipToParams(activeChip), [activeChip]);
  const { listings, featured, loading, error, refetch } = useListings(listingsParams);
  const { likedIds, toggleLike } = useLikes();
  const { unreadCount, refetch: refetchNotifications } = useNotifications();
  const { leases: rentDueLeases, refetch: refetchRentDue } = useRentDue(!!user);

  const isDesktop = screenWidth >= DESKTOP_BREAKPOINT;
  const horizontalPadding = 40;
  const gridGap = 14;
  const columnsPerRow = 4;
  const cardWidth = isDesktop
    ? (screenWidth - horizontalPadding - gridGap * (columnsPerRow - 1)) / columnsPerRow
    : undefined;

  useFocusEffect(
    React.useCallback(() => {
      refetchNotifications();
      if (user) refetchRentDue();
    }, [refetchNotifications, refetchRentDue, user])
  );
  const greeting = getGreeting();
  const userName = user?.name ?? 'there';
  const displayFeatured = featured.length > 0 ? featured : listings.slice(0, 3).map((l) => ({ ...l, featured: true }));
  // Listings come pre-filtered from API; featured uses separate endpoint so filter client-side
  const filteredListings = listings;
  const filteredFeatured = useMemo(
    () => filterByChip(displayFeatured, activeChip),
    [displayFeatured, activeChip]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.homeHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.greetingName}>{userName}</Text>
          </View>
          <Pressable style={styles.notifBtn} onPress={() => router.push('/(tabs)/(home)/notifications')}>
            <HabixaIcon name="bell" size={16} color={Colors.desertSand} />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </Pressable>
        </View>
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/(search)')}
        >
          <HabixaIcon name="search" size={13} color="rgba(245,239,230,0.4)" />
          <Text style={styles.searchBarText}>Search properties in {DEFAULT_CITY}…</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.homeScroll}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {rentDueLeases.length > 0 && (
          <View style={styles.rentDueSection}>
            <Text style={[styles.rentDueSectionTitle, { color: colors.text }]}>Rent due</Text>
            {rentDueLeases.slice(0, 2).map((lease) => (
              <Pressable
                key={lease.id}
                style={[styles.rentDueCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({
                  pathname: '/modal/pay-rent',
                  params: {
                    leaseId: String(lease.id),
                    amount: String(lease.monthly_rent),
                    currency: lease.currency,
                    landlordName: lease.landlord_name ?? '',
                    landlordCountry: lease.landlord_country ?? undefined,
                    paymentMonth: lease.payment_month,
                  },
                })}
              >
                <View style={styles.rentDueCardLeft}>
                  <HabixaIcon name="credit-card" size={20} color={Colors.terracotta} solid />
                  <View>
                    <Text style={[styles.rentDueTitle, { color: colors.text }]} numberOfLines={1}>
                      {lease.listing_title}
                    </Text>
                    <Text style={[styles.rentDueSub, { color: Colors.muted }]}>
                      {lease.days_until_due === 0
                        ? 'Due today'
                        : `Due in ${lease.days_until_due} day${lease.days_until_due === 1 ? '' : 's'}`}
                      {' · '}{formatPrice(lease.monthly_rent, lease.currency)}
                    </Text>
                  </View>
                </View>
                <HabixaIcon name="chevron-right" size={14} color={Colors.terracotta} solid />
              </Pressable>
            ))}
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chips}
          contentContainerStyle={styles.chipsContent}
        >
          {CHIPS.map((chip, i) => (
            <Pressable
              key={chip}
              style={[
                styles.chip,
                { backgroundColor: colors.card, borderColor: colors.border },
                activeChip === i && styles.chipActive,
              ]}
              onPress={() => setActiveChip(i)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.text },
                  activeChip === i && styles.chipTextActive,
                ]}
              >
                {chip}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured</Text>
          <Pressable style={styles.sectionSeeAllBtn}>
            <Text style={styles.sectionSeeAll}>See all </Text>
            <HabixaIcon name="chevron-right" size={9} color={Colors.terracotta} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.featuredScroll}
          contentContainerStyle={styles.featuredScrollContent}
        >
          {loading ? (
            <>
              <FeaturedShimmer />
              <FeaturedShimmer />
              <FeaturedShimmer />
            </>
          ) : (
            filteredFeatured.map((item) => (
              <FeaturedCard key={item.id} item={item} colors={colors} />
            ))
          )}
        </ScrollView>

        <View style={[styles.sectionHead, { marginTop: 14 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Nearby listings</Text>
          <Pressable style={styles.sectionSeeAllBtn} onPress={() => router.push('/(tabs)/(search)/map')}>
            <HabixaIcon name="map" size={10} color={Colors.terracotta} style={{ marginRight: 4 }} />
            <Text style={styles.sectionSeeAll}>Map</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>
              {error === 'Failed to fetch'
                ? "Couldn't connect. Check that the server is running and try again."
                : error}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryBtn,
                { backgroundColor: Colors.terracotta, opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={() => refetch()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.listingsContainer,
              isDesktop && styles.listingsGrid,
            ]}
          >
            {loading ? (
              <>
                <PropCardShimmer colors={colors} cardWidth={cardWidth} />
                <PropCardShimmer colors={colors} cardWidth={cardWidth} />
                <PropCardShimmer colors={colors} cardWidth={cardWidth} />
                {isDesktop && (
                  <>
                    <PropCardShimmer colors={colors} cardWidth={cardWidth} />
                    <PropCardShimmer colors={colors} cardWidth={cardWidth} />
                    <PropCardShimmer colors={colors} cardWidth={cardWidth} />
                    <PropCardShimmer colors={colors} cardWidth={cardWidth} />
                    <PropCardShimmer colors={colors} cardWidth={cardWidth} />
                  </>
                )}
              </>
            ) : (
              filteredListings.map((item) => (
                <PropCard
                  key={item.id}
                  item={item}
                  colors={colors}
                  isLiked={likedIds.has(item.id)}
                  onToggleLike={(id) => toggleLike(id)}
                  cardWidth={cardWidth}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  homeHeader: {
    backgroundColor: Colors.midnightInk,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  greeting: {
    fontSize: 11,
    color: Colors.sky,
    letterSpacing: 1,
  },
  greetingName: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.desertSand,
    marginTop: 1,
  },
  notifBtn: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    backgroundColor: Colors.terracotta,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.midnightInk,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  searchBarText: {
    fontSize: 13,
    color: 'rgba(245,239,230,0.5)',
  },
  homeScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingBottom: 100,
  },
  chips: {
    marginTop: 20,
  },
  chipsContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  chipActive: {
    backgroundColor: Colors.midnightInk,
    borderColor: Colors.midnightInk,
  },
  chipText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  chipTextActive: {
    color: Colors.desertSand,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  sectionSeeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionSeeAll: {
    fontSize: 11,
    color: Colors.terracotta,
  },
  featuredScroll: {},
  featuredScrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  featuredCard: {
    width: 200,
    backgroundColor: Colors.ink2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  featuredImg: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBody: {
    padding: 10,
    paddingBottom: 12,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.gold,
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 4,
  },
  featuredBadgeText: {
    fontSize: 8,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.midnightInk,
  },
  featuredPrice: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.desertSand,
  },
  featuredPriceUnit: {
    fontSize: 10,
    color: 'rgba(245,239,230,0.5)',
    fontFamily: Fonts.body,
  },
  featuredName: {
    fontSize: 11,
    color: 'rgba(245,239,230,0.6)',
    marginTop: 2,
  },
  propCard: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  propImgWrap: {
    position: 'relative',
  },
  propImgPlaceholder: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  propBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  propFav: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propBody: {
    padding: 12,
    paddingBottom: 14,
  },
  propPrice: {
    fontFamily: Fonts.display,
    fontSize: 20,
  },
  propPriceUnit: {
    fontSize: 13,
    color: Colors.muted,
    fontFamily: Fonts.body,
  },
  propName: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    marginVertical: 2,
  },
  propLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  propLocationText: {
    fontSize: 11,
  },
  propFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  propLandlord: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarXs: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarXsText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
  },
  propLandlordName: {
    fontSize: 11,
  },
  propScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  propScoreText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  errorWrap: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: Colors.terracotta,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.desertSand,
  },
  listingsContainer: {
    paddingHorizontal: 20,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  rentDueSection: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  rentDueSectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    marginBottom: 10,
  },
  rentDueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    marginBottom: 10,
  },
  rentDueCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rentDueTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    flex: 1,
  },
  rentDueSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
