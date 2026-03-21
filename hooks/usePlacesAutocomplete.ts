import { useState, useEffect, useCallback, useRef } from 'react';
import { api, Endpoints } from '@/lib/api/client';

export interface PlaceSuggestion {
  placeId: string | null;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface UsePlacesAutocompleteOptions {
  /** Debounce delay in ms. Default 300. */
  debounceMs?: number;
  /** Minimum input length to fetch. Default 2. */
  minLength?: number;
}

export function usePlacesAutocomplete(
  input: string,
  options: UsePlacesAutocompleteOptions = {}
): {
  suggestions: PlaceSuggestion[];
  loading: boolean;
  error: string | null;
} {
  const { debounceMs = 300, minLength = 2 } = options;
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (value: string) => {
    if (value.length < minLength) {
      setSuggestions([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ suggestions: PlaceSuggestion[] }>(
        Endpoints.places.autocomplete(value),
        { skipAuth: true }
      );
      setSuggestions(res?.suggestions ?? []);
    } catch (e) {
      setSuggestions([]);
      const err = e as { message?: string };
      const msg = (err?.message ?? '').toLowerCase();
      const isNetworkError =
        msg.includes('failed') || msg.includes('refused') || msg.includes('network') || msg.includes('fetch');
      setError(
        isNetworkError
          ? 'Cannot reach server. Ensure the API is running (see .env EXPO_PUBLIC_API_URL).'
          : (err as { message?: string })?.message || 'Suggestions unavailable.'
      );
    } finally {
      setLoading(false);
    }
  }, [minLength]);

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(trimmed);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [input, debounceMs, minLength, fetchSuggestions]);

  return { suggestions, loading, error };
}
