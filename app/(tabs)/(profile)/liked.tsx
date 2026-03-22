import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useLikedListings } from '@/hooks/useLikedListings';
import { useLikes } from '@/hooks/useLikes';
import type { Listing } from '@/lib/types/listing';

function PropCard({
  item,
  colors,
  isLiked,
  onToggleLike,
}: {
  item: Listing;
  colors: typeof Colors.light;
  isLiked: boolean;
  onToggleLike: (id: string) => void;
}) {
  const router = useRouter();
  const priceStr = item.priceLabel
    ? `$${item.price.toLocaleString()} ${item.priceLabel}`
    : `$${item.price.toLocaleString()}`;

  const firstPhoto = item.photos?.[0];
  return (
    <Pressable
      style={[styles.propCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/(tabs)/(home)/listing/${item.id}`)}
    >
      <View style={styles.propImgWrap}>
        <View
          style={[styles.propImgPlaceholder, { backgroundColor: item.imgBg || Colors.sand2 }]}
        >
          {firstPhoto ? (
            <Image
              source={{ uri: firstPhoto.url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <HabixaIcon name="building" size={52} color={colors.text} />
          )}
        </View>
        <View
          style={[
            styles.propBadge,
            { backgroundColor: item.badge === 'For Sale' ? Colors.sage : Colors.terracotta },
          ]}
        >
          <Text style={styles.propBadgeText}>{item.badge || 'For Rent'}</Text>
        </View>
        <Pressable style={styles.propFav} onPress={() => onToggleLike(item.id)}>
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
          {item.priceLabel && (
            <Text style={[styles.propPriceUnit, { color: colors.textSecondary }]}>
              {' '}
              {item.priceLabel}
            </Text>
          )}
        </Text>
        <Text style={[styles.propName, { color: colors.text }]}>{item.title}</Text>
        <View style={styles.propLocation}>
          <HabixaIcon name="map-marker-alt" size={10} color={Colors.terracotta} solid />
          <Text style={[styles.propLocationText, { color: colors.textSecondary }]}>
            {item.address}
          </Text>
        </View>
        <View style={[styles.propFooter, { borderTopColor: colors.border }]}>
          <View style={styles.propLandlord}>
            <View style={[styles.avatarXs, { backgroundColor: 'rgba(194,103,58,0.15)' }]}>
              <Text style={[styles.avatarXsText, { color: Colors.terracotta }]}>
                {item.landlordInitials}
              </Text>
            </View>
            <Text style={[styles.propLandlordName, { color: colors.textSecondary }]}>
              {item.landlordName}
            </Text>
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

export default function LikedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { listings, loading, error, refetch } = useLikedListings();
  const { likedIds, toggleLike, refetch: refetchLikes } = useLikes();

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchLikes();
    }, [refetch, refetchLikes])
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: Colors.terracotta }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Liked Properties</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {loading ? 'Loading…' : `${listings.length} ${listings.length === 1 ? 'property' : 'properties'} saved`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
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
      ) : listings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <HabixaIcon name="heart" size={40} color={Colors.muted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No liked properties yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            When you like a property, it will appear here. Start exploring to find
            your next home.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyBtn,
              { backgroundColor: Colors.terracotta, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => router.replace('/(tabs)/(home)')}
          >
            <Text style={styles.emptyBtnText}>Browse Properties</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {listings.map((item) => (
            <PropCard
              key={item.id}
              item={item}
              colors={colors}
              isLiked={likedIds.has(item.id)}
              onToggleLike={async (id) => {
                const nowLiked = await toggleLike(id);
                if (!nowLiked) refetch();
              }}
            />
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.desertSand,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
});
