import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useLikes } from '@/hooks/useLikes';
import { useRelatedListings } from '@/hooks/useRelatedListings';
import { useTheme } from '@/context/ThemeContext';
import type { Listing } from '@/lib/types/listing';

const RELATED_CARD_WIDTH = 260;

function RelatedCard({
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
    ? `$${item.price.toLocaleString()}${item.priceLabel}`
    : `$${item.price.toLocaleString()}`;

  const imgSource =
    item.photos?.[0]?.url
      ? { uri: item.photos[0].url }
      : null;

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => router.push(`/(tabs)/(home)/listing/${item.id}`)}
    >
      <View style={styles.imgWrap}>
        {imgSource ? (
          <Image
            source={imgSource}
            style={styles.img}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.imgPlaceholder, { backgroundColor: item.imgBg || Colors.sand2 }]}
          >
            <HabixaIcon name="building" size={36} color={colors.text} />
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: item.badge === 'For Sale' ? Colors.sage : Colors.terracotta }]}>
          <Text style={styles.badgeText}>{item.badge || 'For Rent'}</Text>
        </View>
        <Pressable
          style={styles.fav}
          onPress={() => onToggleLike(item.id)}
        >
          <HabixaIcon
            name="heart"
            size={12}
            color={isLiked ? Colors.terracotta : Colors.muted}
            solid={isLiked}
          />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={[styles.price, { color: colors.text }]} numberOfLines={1}>
          {priceStr}
        </Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.location}>
          <HabixaIcon name="map-marker-alt" size={9} color={Colors.terracotta} solid />
          <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

interface RelatedListingsSectionProps {
  listingId: string | undefined;
  /** Whether the parent listing is loaded and we should fetch related */
  enabled?: boolean;
}

export function RelatedListingsSection({
  listingId,
  enabled = true,
}: RelatedListingsSectionProps) {
  const { colors } = useTheme();
  const { listings, source, loading } = useRelatedListings(listingId, enabled);
  const { likedIds, toggleLike } = useLikes();

  if (loading || listings.length === 0) return null;

  const sectionTitle =
    source === 'same_user'
      ? 'More from this landlord'
      : 'Similar listings nearby';

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {sectionTitle}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {listings.map((item, index) => (
          <View key={item.id} style={index < listings.length - 1 ? styles.cardWrap : undefined}>
            <RelatedCard
            key={item.id}
            item={item}
            colors={colors}
            isLiked={likedIds.has(item.id)}
            onToggleLike={(id) => toggleLike(id)}
          />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingRight: 24,
  },
  cardWrap: {
    marginRight: 12,
  },
  card: {
    width: RELATED_CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  imgWrap: {
    height: 120,
    position: 'relative',
  },
  img: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.ink2,
  },
  imgPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
    color: Colors.midnightInk,
  },
  fav: {
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
  body: {
    padding: 10,
  },
  price: {
    fontFamily: Fonts.display,
    fontSize: 16,
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    marginBottom: 4,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
});
