import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useListings, type ListingsSort } from '@/hooks/useListings';
import { MapContent } from '@/components/MapContent';

export default function MapViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    q?: string;
    type?: string;
    property_type?: string;
    bedrooms?: string;
    sort?: ListingsSort;
    city?: string;
    state?: string;
    country?: string;
  }>();
  const searchParams = {
    q: params.q || undefined,
    type: params.type || undefined,
    property_type: params.property_type || undefined,
    bedrooms: params.bedrooms ? Number(params.bedrooms) : undefined,
    sort: params.sort || undefined,
    city: params.city || undefined,
    state: params.state || undefined,
    country: params.country || undefined,
  };
  const { listings } = useListings(searchParams, { enabled: true });
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Map View</Text>
      </View>
      <MapContent listings={listings} router={router} />
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
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.midnightInk,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.sky,
    opacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 24,
    borderRadius: 12,
  },
  placeholderText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.midnightInk,
  },
  overlayHint: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  overlayText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.desertSand,
  },
});
