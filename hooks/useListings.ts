/**
 * useListings — paginated listings hook.
 * Replaces the old single-fetch version.
 * Fixes: pagination, landlord score from API, currency-aware mapping.
 * Offline: shows cached content when no internet connection.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import type { Listing } from '@/lib/types/listing';
import { mapApiListing, type ApiListing } from '@/lib/types/listing';
import { useConnectivity } from '@/context/ConnectivityContext';
import { getCachedListings, setCachedListings } from '@/lib/cache/listingsCache';

export type ListingsSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

export interface ListingsParams {
  q?: string;
  type?: string;
  property_type?: string;
  city?: string;
  state?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  sort?: ListingsSort;
  page?: number;
  perPage?: number;
}

interface PaginatedMeta {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
}

interface ListingsState {
  listings: Listing[];
  featured: Listing[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  pagination: PaginatedMeta;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export interface UseListingsOptions {
  enabled?: boolean;
}

const DEFAULT_PER_PAGE = 20;

export function useListings(
  params?: ListingsParams,
  options?: UseListingsOptions
): ListingsState {
  const enabled = options?.enabled !== false;
  const { isConnected } = useConnectivity();
  const [listings, setListings] = useState<Listing[]>([]);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedMeta>({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: DEFAULT_PER_PAGE,
  });

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const loadFromCache = useCallback(async () => {
    const cached = await getCachedListings();
    if (cached) {
      setListings(cached.listings);
      setFeatured(cached.featured);
      setPagination(cached.pagination);
      setError(null);
    } else {
      setError('No cached content. Connect to the internet to load listings.');
    }
  }, []);

  const buildQueryString = useCallback((p: ListingsParams | undefined, page: number) => {
    const search = new URLSearchParams();
    if (p?.q) search.set('q', p.q);
    if (p?.type) search.set('type', p.type);
    if (p?.property_type) search.set('property_type', p.property_type);
    if (p?.city) search.set('city', p.city);
    if (p?.state) search.set('state', p.state);
    if (p?.country) search.set('country', p.country);
    if (p?.minPrice != null) search.set('min_price', String(p.minPrice));
    if (p?.maxPrice != null) search.set('max_price', String(p.maxPrice));
    if (p?.bedrooms != null) search.set('bedrooms', String(p.bedrooms));
    if (p?.sort) search.set('sort', p.sort);
    search.set('page', String(page));
    search.set('per_page', String(p?.perPage ?? DEFAULT_PER_PAGE));
    const qs = search.toString();
    return qs ? `?${qs}` : '';
  }, []);

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    if (!enabled) return;

    // Offline: load from cache and show cached content
    if (isConnected === false) {
      if (!append) {
        setLoading(true);
        setError(null);
        await loadFromCache();
      }
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }

    try {
      const qs = buildQueryString(paramsRef.current, page);
      const indexPath = Endpoints.listings.index() + qs;

      const [indexRes, featuredRes] = await Promise.all([
        api.get<{ data?: ApiListing[]; current_page?: number; last_page?: number; total?: number; per_page?: number }>(indexPath),
        page === 1 ? api.get<ApiListing[]>(Endpoints.listings.featured()).catch(() => []) : Promise.resolve([]),
      ]);

      const rawListings = Array.isArray(indexRes) ? indexRes : (indexRes?.data ?? []);
      const safeRaw = Array.isArray(rawListings) ? rawListings : [];
      const newListings = (safeRaw as ApiListing[]).map((item) => {
        try {
          return mapApiListing(item);
        } catch {
          return null;
        }
      }).filter((l): l is Listing => l != null);

      const paginationData: PaginatedMeta = {
        currentPage: (indexRes as { current_page?: number }).current_page ?? page,
        lastPage: (indexRes as { last_page?: number }).last_page ?? 1,
        total: (indexRes as { total?: number }).total ?? newListings.length,
        perPage: (indexRes as { per_page?: number }).per_page ?? DEFAULT_PER_PAGE,
      };
      setPagination(paginationData);

      const featuredData = Array.isArray(featuredRes) ? featuredRes : [];
      const newFeatured = (featuredData as ApiListing[])
        .map((item) => {
          try {
            return mapApiListing(item);
          } catch {
            return null;
          }
        })
        .filter((l): l is Listing => l != null);

      if (append) {
        setListings((prev) => [...prev, ...newListings]);
      } else {
        setListings(newListings);
        setFeatured(newFeatured);
        // Cache for offline use (page 1 only)
        await setCachedListings({
          listings: newListings,
          featured: newFeatured,
          pagination: paginationData,
        });
      }
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load listings');
      if (!append) {
        setListings([]);
        setFeatured([]);
        // Try cache when fetch fails (e.g. network error)
        await loadFromCache();
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [enabled, isConnected, buildQueryString, loadFromCache]);

  const refetch = useCallback(async () => { await fetchPage(1, false); }, [fetchPage]);
  const loadMore = useCallback(async () => {
    if (loadingMore || loading) return;
    const next = pagination.currentPage + 1;
    if (next > pagination.lastPage) return;
    await fetchPage(next, true);
  }, [loadingMore, loading, pagination.currentPage, pagination.lastPage, fetchPage]);

  useEffect(() => {
    if (!enabled) { setListings([]); setLoading(false); return; }
    fetchPage(1, false);
  }, [enabled, isConnected, params?.q, params?.type, params?.property_type, params?.city, params?.state, params?.country,
      params?.minPrice, params?.maxPrice, params?.bedrooms, params?.sort, fetchPage]);

  return { listings, featured, loading, loadingMore, error, pagination,
    hasMore: pagination.currentPage < pagination.lastPage, refetch, loadMore };
}
