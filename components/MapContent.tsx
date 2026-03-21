import { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { Router } from 'expo-router';
import type { Listing } from '@/lib/types/listing';
import { Colors, Fonts } from '@/constants/theme';

const NASSAU_CENTER = { latitude: 25.0667, longitude: -77.3333 }; // Nassau, Bahamas
const DEFAULT_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };

const GOOGLE_MAPS_API_KEY =
  typeof process !== 'undefined'
    ? (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '')
    : '';

interface MapContentProps {
  listings: Listing[];
  router: Router;
  isWeb?: boolean;
  /** When true, map is embedded with fixed height (e.g. search page preview) */
  compact?: boolean;
}

export function MapContent({ listings, router, compact }: MapContentProps) {
  const listingsWithCoords = (listings ?? []).filter(
    (l) => l.latitude != null && l.longitude != null
  );
  const hasMarkers = listingsWithCoords.length > 0;
  const mapRef = useRef<MapView>(null);
  const [webLoadFailed, setWebLoadFailed] = useState(false);

  useEffect(() => {
    if (!hasMarkers || !mapRef.current || listingsWithCoords.length === 0) return;
    try {
      const coords = listingsWithCoords.map((l) => ({
        latitude: l.latitude!,
        longitude: l.longitude!,
      }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    } catch {
      // fitToCoordinates can throw if map unmounts or coords invalid
    }
  }, [hasMarkers, listingsWithCoords.length, (listings ?? []).map((l) => l?.id).filter(Boolean).join(',')]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const t = setTimeout(() => setWebLoadFailed(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const isWeb = Platform.OS === 'web';
  const mapStyle = compact ? [styles.map, styles.mapCompact] : styles.map;

  if (isWeb && !GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.map, mapStyle, styles.loadingFallback]}>
        <Text style={styles.loadingText}>Map requires EXPO_PUBLIC_GOOGLE_MAPS_API_KEY</Text>
        <Text style={styles.loadHint}>Add it to your .env file</Text>
      </View>
    );
  }

  const loadingFallback = isWeb ? (
    <View style={[styles.map, mapStyle, styles.loadingFallback]}>
      <Text style={styles.loadingText}>Loading map…</Text>
      {webLoadFailed && (
        <Text style={styles.loadHint}>
          If the map doesn't load, enable Maps JavaScript API and add HTTP referrer restrictions for your domain in Google Cloud Console.
        </Text>
      )}
    </View>
  ) : undefined;

  // Avoid MapView crash when transitioning from markers to none (e.g. filter returns 0 results)
  if (!hasMarkers) {
    return (
      <View style={[styles.map, mapStyle, styles.loadingFallback]}>
        <Text style={styles.loadingText}>
          Listings with coordinates will appear here
        </Text>
      </View>
    );
  }

  return (
    <>
      <MapView
        ref={mapRef}
        style={mapStyle}
        provider={Platform.OS === 'android' || isWeb ? 'google' : undefined}
        initialRegion={{ ...NASSAU_CENTER, ...DEFAULT_DELTA }}
        googleMapsApiKey={isWeb ? GOOGLE_MAPS_API_KEY : undefined}
        loadingFallback={loadingFallback}
      >
        {listingsWithCoords.map((item) => (
          <Marker
            key={item.id}
            coordinate={{
              latitude: item.latitude!,
              longitude: item.longitude!,
            }}
            title={item.title}
            description={item.address}
            onCalloutPress={() =>
              router.push(`/(tabs)/(home)/listing/${item.id}`)
            }
          />
        ))}
      </MapView>
    </>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%' },
  loadingFallback: {
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
  loadHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  mapCompact: {
    height: 160,
    borderRadius: 14,
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
