import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Router } from 'expo-router';
import type { Listing } from '@/lib/types/listing';
import { Colors, Fonts } from '@/constants/theme';

const NASSAU_CENTER: [number, number] = [25.0667, -77.3333]; // Nassau, Bahamas

interface MapContentProps {
  listings: Listing[];
  router: Router;
  isWeb?: boolean;
  compact?: boolean;
}

export function MapContent({ listings, router, compact }: MapContentProps) {
  const [MapEl, setMapEl] = useState<React.ComponentType<{
    listings: Listing[];
    router: Router;
    center: [number, number];
  }> | null>(null);

  useEffect(() => {
    import('./MapContentWebLeaflet').then((m) =>
      setMapEl(() => m.WebLeafletMap)
    );
  }, []);

  const listingsWithCoords = listings.filter(
    (l) => l.latitude != null && l.longitude != null
  );
  const hasMarkers = listingsWithCoords.length > 0;

  if (!MapEl) {
    return (
      <View style={[styles.map, compact && styles.mapCompact, styles.loading]}>
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.map, compact && styles.mapCompact]}>
      <MapEl
        listings={listingsWithCoords}
        router={router}
        center={NASSAU_CENTER}
      />
      {!hasMarkers && (
        <View style={[styles.overlayHint, { pointerEvents: 'none' }]}>
          <Text style={styles.overlayText}>
            Listings with coordinates will appear here
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%' },
  mapCompact: { height: 160 },
  loading: {
    backgroundColor: Colors.sky,
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 13,
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
    color: '#F5EFE6',
  },
});
