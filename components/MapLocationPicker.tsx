import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Colors, Fonts } from '@/constants/theme';

const NASSAU_CENTER = { latitude: 25.0667, longitude: -77.3333 };
const DEFAULT_DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };

const GOOGLE_MAPS_API_KEY =
  typeof process !== 'undefined'
    ? (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '')
    : '';

export interface MapLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => void;
  height?: number;
}

export function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  height = 200,
}: MapLocationPickerProps) {
  const mapRef = useRef<MapView>(null);
  const hasCoords = latitude != null && longitude != null;
  const coordinate = hasCoords
    ? { latitude, longitude }
    : NASSAU_CENTER;

  useEffect(() => {
    if (hasCoords && mapRef.current) {
      mapRef.current.animateToRegion({
        ...coordinate,
        ...DEFAULT_DELTA,
      }, 300);
    }
  }, [latitude, longitude]);

  const handlePress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    onLocationChange(lat, lng);
  };

  const isWeb = Platform.OS === 'web';

  if (isWeb && !GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>Set location on map</Text>
        <Text style={styles.fallbackHint}>Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY for web</Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, { height }]}
      provider={Platform.OS === 'android' || isWeb ? 'google' : undefined}
      initialRegion={{ ...coordinate, ...DEFAULT_DELTA }}
      googleMapsApiKey={isWeb ? GOOGLE_MAPS_API_KEY : undefined}
      onPress={handlePress}
      mapType="standard"
    >
      <Marker
        coordinate={coordinate}
        draggable
        onDragEnd={(e) => {
          const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
          onLocationChange(lat, lng);
        }}
        title="Listing location"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fallback: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: Colors.sand2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.midnightInk,
  },
  fallbackHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
  },
});
