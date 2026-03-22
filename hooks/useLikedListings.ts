/**
 * useLikedListings — fetch full listing objects for the current user's liked properties.
 */
import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import type { Listing } from '@/lib/types/listing';
import { mapApiListing, type ApiListing } from '@/lib/types/listing';
import { useAuth } from '@/context/AuthContext';

interface UseLikedListingsState {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLikedListings(enabled = true): UseLikedListingsState {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchLiked = useCallback(async () => {
    if (!user || !enabled) {
      setListings([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiListing[] | { id: number }[]>(
        Endpoints.listings.liked()
      );
      const raw = Array.isArray(res) ? res : [];
      const mapped = (raw as ApiListing[])
        .map((item) => {
          try {
            return mapApiListing(item);
          } catch {
            return null;
          }
        })
        .filter((l): l is Listing => l != null);
      setListings(mapped);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      if (err?.status === 401) {
        setListings([]);
        setError(null);
      } else {
        setError(err?.message ?? 'Failed to load liked properties');
        setListings([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, enabled]);

  useEffect(() => {
    fetchLiked();
  }, [fetchLiked]);

  return { listings, loading, error, refetch: fetchLiked };
}
