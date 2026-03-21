import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useListings } from '@/hooks/useListings';
import type { Listing } from '@/lib/types/listing';

function ListingCard({ item }: { item: Listing }) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(tabs)/(home)/listing/${item.id}`)}
    >
      <View style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.price}>${item.price}/mo</Text>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.address}>{item.address}</Text>
      </View>
    </Pressable>
  );
}

export default function SearchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listings } = useListings();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Results List</Text>
      </View>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard item={item} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.desertSand,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    marginRight: 16,
  },
  backText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.terracotta,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.midnightInk,
  },
  list: {
    padding: 24,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: 'rgba(15, 22, 35, 0.08)',
  },
  cardImage: {
    width: 100,
    height: 100,
    backgroundColor: Colors.sky,
    opacity: 0.4,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  price: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.terracotta,
  },
  cardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.midnightInk,
    marginTop: 4,
  },
  address: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.sage,
    marginTop: 2,
  },
});
