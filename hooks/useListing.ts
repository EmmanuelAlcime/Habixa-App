import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import type { Listing } from '@/lib/types/listing';
import { mapApiListing, type ApiListing } from '@/lib/types/listing';

/** Optional search context so view analytics record country/state/city (renter discovery context). */
export interface ListingViewContext {
  country?: string;
  state?: string;
  city?: string;
}

interface ListingState {
  listing: Listing | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function buildListingShowPath(id: string, ctx?: ListingViewContext): string {
  const base = Endpoints.listings.show(id);
  const p = new URLSearchParams();
  if (ctx?.country?.trim()) p.set('country', ctx.country.trim().toUpperCase().slice(0, 2));
  if (ctx?.state?.trim()) p.set('state', ctx.state.trim());
  if (ctx?.city?.trim()) p.set('city', ctx.city.trim());
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export function useListing(id: string | undefined, viewContext?: ListingViewContext): ListingState {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = useMemo(
    () => (id ? buildListingShowPath(id, viewContext) : ''),
    [id, viewContext?.country, viewContext?.state, viewContext?.city]
  );

  const fetchOne = useCallback(async () => {
    if (!id || !path) {
      setListing(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiListing>(path);
      setListing(mapApiListing(res));
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load listing');
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [id, path]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return { listing, loading, error, refetch: fetchOne };
}
