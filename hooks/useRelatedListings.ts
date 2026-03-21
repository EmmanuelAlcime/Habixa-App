import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import type { Listing } from '@/lib/types/listing';
import { mapApiListing, type ApiListing } from '@/lib/types/listing';

interface RelatedResponse {
  listings: ApiListing[];
  source: 'same_user' | 'same_city';
}

interface UseRelatedListingsState {
  listings: Listing[];
  source: 'same_user' | 'same_city' | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRelatedListings(
  listingId: string | undefined,
  enabled: boolean
): UseRelatedListingsState {
  const [listings, setListings] = useState<Listing[]>([]);
  const [source, setSource] = useState<'same_user' | 'same_city' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRelated = useCallback(async () => {
    if (!listingId || !enabled) {
      setListings([]);
      setSource(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<RelatedResponse>(
        Endpoints.listings.related(listingId)
      );
      const mapped = (res.listings ?? []).map((l: ApiListing) =>
        mapApiListing(l)
      );
      setListings(mapped);
      setSource(res.source ?? null);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load related listings');
      setListings([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, [listingId, enabled]);

  useEffect(() => {
    fetchRelated();
  }, [fetchRelated]);

  return { listings, source, loading, error, refetch: fetchRelated };
}
