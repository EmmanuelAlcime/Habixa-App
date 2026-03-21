/**
 * Listings cache for offline support.
 * Persists last successful fetch so users see cached content when offline.
 */
import { storage } from '@/lib/storage';
import type { Listing } from '@/lib/types/listing';

const CACHE_KEY = '@habixa_cache_listings';

interface PaginatedMeta {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
}

export interface ListingsCacheData {
  listings: Listing[];
  featured: Listing[];
  pagination: PaginatedMeta;
  cachedAt: number;
}

export async function getCachedListings(): Promise<ListingsCacheData | null> {
  try {
    const raw = await storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ListingsCacheData;
    if (!data?.listings || !Array.isArray(data.listings)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setCachedListings(data: Omit<ListingsCacheData, 'cachedAt'>): Promise<void> {
  try {
    const toStore: ListingsCacheData = {
      ...data,
      cachedAt: Date.now(),
    };
    await storage.setItem(CACHE_KEY, JSON.stringify(toStore));
  } catch {
    // Ignore cache write errors
  }
}
