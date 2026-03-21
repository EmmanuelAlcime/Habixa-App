/**
 * Updated useLandlordProfile hook — pulls richer data from the updated API.
 * Drop this over hooks/useLandlordProfile.ts
 */
import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import type { Listing } from '@/lib/types/listing';
import { mapApiListing, type ApiListing } from '@/lib/types/listing';

export interface ReviewBreakdown {
  '5_star': number; '4_star': number; '3_star': number; '2_star': number; '1_star': number;
}

export interface LandlordScore {
  score: number;
  review_count: number;
  breakdown?: ReviewBreakdown;
}

export interface LandlordReview {
  id: number;
  rating: number;
  content?: string | null;
  created_at: string;
  reviewer?: { id: number; name: string; avatar_url?: string | null };
  listing_address?: string | null;
}

export interface LandlordProfile {
  id: number;
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  identity_verified: boolean;
  phone_verified: boolean;
  landlord_score?: LandlordScore | null;
  active_listings_count: number;
  total_tenants_served: number;
  total_completed_leases: number;
  recent_reviews?: LandlordReview[];
}

interface LandlordProfileState {
  profile: LandlordProfile | null;
  listings: Listing[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLandlordProfile(idOrSlug: string | undefined): LandlordProfileState {
  const [profile, setProfile] = useState<LandlordProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!idOrSlug) { setProfile(null); setListings([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Fetch profile (now includes recent_reviews, total_tenants_served, etc.)
      const profileRes = await api.get<LandlordProfile>(
        Endpoints.landlords.show(idOrSlug), { skipAuth: true }
      );
      setProfile(profileRes);

      // Fetch their active listings separately
      const listingsRes = await api.get<{ data?: ApiListing[] }>(
        Endpoints.listings.index({ user_id: String(profileRes.id) }), { skipAuth: true }
      ).catch(() => ({ data: [] }));
      const rawListings = Array.isArray(listingsRes) ? listingsRes : (listingsRes?.data ?? []);
      setListings((rawListings as ApiListing[]).map(mapApiListing));
    } catch (e) {
      const err = e as { message?: string; status?: number };
      setError(err?.status === 404 ? 'Profile not found' : err?.message ?? 'Failed to load profile');
      setProfile(null); setListings([]);
    } finally {
      setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    if (idOrSlug) fetchAll();
    else { setProfile(null); setListings([]); setLoading(false); }
  }, [idOrSlug, fetchAll]);

  return { profile, listings, loading, error, refetch: fetchAll };
}
