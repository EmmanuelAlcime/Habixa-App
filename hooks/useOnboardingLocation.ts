import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export interface OnboardingLocation {
  country: string;
  city?: string;
  region?: string;
}

export function useOnboardingLocation() {
  const [location, setLocation] = useState<OnboardingLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestAndResolve = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    setLocation(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        maxAge: 60_000,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      if (!address) {
        setLoading(false);
        return null;
      }

      const country = address.isoCountryCode ?? address.country ?? '';
      const city = address.city ?? address.subregion ?? undefined;
      const region = address.region ?? address.subregion ?? undefined;

      const result: OnboardingLocation = { country };
      if (city) result.city = city;
      if (region && region !== city) result.region = region;

      setLocation(result);
      setLoading(false);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not get location';
      setError(msg);
      setLoading(false);
      return null;
    }
  }, []);

  return { location, loading, error, permissionDenied, requestAndResolve };
}
