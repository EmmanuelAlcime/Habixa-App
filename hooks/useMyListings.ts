import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import type { MyListing } from '@/lib/types/my-listing';
import { mapApiMyListing, type ApiMyListing } from '@/lib/types/my-listing';
import { useAuth } from '@/context/AuthContext';

interface MyListingsState {
  listings: MyListing[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyListings(): MyListingsState {
  const { user } = useAuth();
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data?: ApiMyListing[] }>(Endpoints.listings.mine());
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setListings((data as ApiMyListing[]).map(mapApiMyListing));
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load your listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { listings, loading, error, refetch: fetchAll };
}
