import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { getInitials, formatMemberSince } from '@/hooks/useProfile';
import { useLandlordProfile } from '@/hooks/useLandlordProfile';
import { useLikes } from '@/hooks/useLikes';
import type { Listing } from '@/lib/types/listing';

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={styles.scoreStars}>
      {[0, 1, 2, 3, 4].map((i) => (
        <HabixaIcon
          key={i}
          name="star"
          size={11}
          color={Colors.gold}
          solid={i < full || (i === full && half)}
        />
      ))}
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ListingCard({
  item,
  colors,
  isLiked,
  onToggleLike,
}: {
  item: Listing;
  colors: { card: string; border: string; text: string; textSecondary: string };
  isLiked: boolean;
  onToggleLike: (id: string) => void;
}) {
  const router = useRouter();
  const priceStr = item.priceLabel
    ? `$${item.price.toLocaleString()}${item.priceLabel}`
    : `$${item.price.toLocaleString()}`;
  const imgSource = item.photos?.[0]?.url ? { uri: item.photos[0].url } : null;

  return (
    <Pressable
      style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/(tabs)/(home)/listing/${item.id}`)}
    >
      <View style={styles.listingImgWrap}>
        {imgSource ? (
          <ExpoImage source={imgSource} style={styles.listingImg} contentFit="cover" />
        ) : (
          <View style={[styles.listingImgPlaceholder, { backgroundColor: item.imgBg || Colors.sand2 }]}>
            <HabixaIcon name="building" size={36} color={colors.text} />
          </View>
        )}
        <View
          style={[
            styles.listingBadge,
            { backgroundColor: item.badge === 'For Sale' ? Colors.sage : Colors.terracotta },
          ]}
        >
          <Text style={styles.listingBadgeText}>{item.badge || 'For Rent'}</Text>
        </View>
        <Pressable style={styles.listingFav} onPress={() => onToggleLike(item.id)}>
          <HabixaIcon name="heart" size={12} color={isLiked ? Colors.terracotta : Colors.muted} solid={isLiked} />
        </Pressable>
      </View>
      <View style={styles.listingBody}>
        <Text style={[styles.listingPrice, { color: colors.text }]} numberOfLines={1}>
          {priceStr}
        </Text>
        <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.listingLocation}>
          <HabixaIcon name="map-marker-alt" size={9} color={Colors.terracotta} solid />
          <Text style={[styles.listingLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function LandlordProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, reviews, listings, loading, error } = useLandlordProfile(id);
  const { likedIds, toggleLike } = useLikes();

  const displayName = profile?.name ?? id?.replace(/-/g, ' ') ?? 'Landlord';
  const initials = getInitials(displayName);
  const scoreData = profile?.landlord_score;
  const scoreDisplay = scoreData ? Math.round(scoreData.score * 20) : null;
  const reviewCount = scoreData?.review_count ?? 0;

  if (loading && !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: Colors.terracotta }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Landlord Profile</Text>
        </View>
        <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: Colors.terracotta }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Landlord Profile</Text>
        </View>
        <View style={[styles.errorWrap, { backgroundColor: colors.background }]}>
          <HabixaIcon name="exclamation-circle" size={48} color={Colors.muted} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: Colors.terracotta }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Landlord Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
          <View style={styles.roleRow}>
            <HabixaIcon name="shield-alt" size={10} color={Colors.sky} solid />
            <Text style={[styles.roleText, { color: colors.textSecondary }]}>Listing property</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.scoreNum, { color: colors.text }]}>
              {scoreDisplay != null ? scoreDisplay : '—'}
              <Text style={styles.scoreNumUnit}>/100</Text>
            </Text>
            {scoreData ? <StarRating rating={scoreData.score} /> : null}
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Landlord Score</Text>
          </View>
          <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <HabixaIcon name="calendar-alt" size={18} color={Colors.sky} solid />
            <Text style={[styles.memberYears, { color: colors.text }]}>
              {formatMemberSince(profile?.created_at)}
            </Text>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Member since</Text>
          </View>
        </View>

        {profile?.bio ? (
          <View style={styles.bioSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>About</Text>
            <Text style={[styles.bioText, { color: colors.text }]}>{profile.bio}</Text>
          </View>
        ) : null}

        {listings.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Listings ({listings.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listingsScroll}>
              {listings.map((item, index) => (
                <View key={item.id} style={index < listings.length - 1 ? styles.listingCardWrap : undefined}>
                  <ListingCard
                    item={item}
                    colors={colors}
                    isLiked={likedIds.has(item.id)}
                    onToggleLike={toggleLike}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Reviews ({reviewCount})
          </Text>
          {reviews.length === 0 ? (
            <View style={[styles.emptyReviews, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <HabixaIcon name="star" size={32} color={Colors.muted} />
              <Text style={[styles.emptyReviewsText, { color: colors.textSecondary }]}>
                No reviews yet
              </Text>
            </View>
          ) : (
            reviews.slice(0, 5).map((item) => (
              <View
                key={item.id}
                style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewAuthor, { color: colors.text }]}>
                    {item.author?.name ?? 'Anonymous'}
                  </Text>
                  <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <HabixaIcon
                      key={i}
                      name="star"
                      size={12}
                      color={Colors.gold}
                      solid={i <= item.rating}
                    />
                  ))}
                </View>
                {item.content ? (
                  <Text style={[styles.reviewContent, { color: colors.text }]}>{item.content}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    marginRight: 16,
  },
  backText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.sage,
    opacity: 0.6,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarText: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.midnightInk,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: 22,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  roleText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  scoreCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  scoreNum: {
    fontFamily: Fonts.display,
    fontSize: 24,
  },
  scoreNumUnit: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  scoreStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  scoreLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    marginTop: 4,
  },
  memberYears: {
    fontFamily: Fonts.heading,
    fontSize: 14,
  },
  bioSection: {
    marginBottom: 24,
  },
  bioText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  listingsScroll: {
    paddingRight: 24,
    gap: 12,
  },
  listingCardWrap: {
    marginRight: 12,
  },
  listingCard: {
    width: 260,
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  listingImgWrap: {
    height: 120,
    position: 'relative',
  },
  listingImg: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.ink2,
  },
  listingImgPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  listingBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
    color: Colors.midnightInk,
  },
  listingFav: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingBody: {
    padding: 10,
  },
  listingPrice: {
    fontFamily: Fonts.display,
    fontSize: 16,
    marginBottom: 2,
  },
  listingTitle: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    marginBottom: 4,
  },
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingLocationText: {
    fontSize: 11,
    flex: 1,
  },
  emptyReviews: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  emptyReviewsText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  reviewDate: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  reviewContent: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
