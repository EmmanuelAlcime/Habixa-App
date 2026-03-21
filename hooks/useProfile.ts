import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role?: string;
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  email_verified_at?: string | null;
  phone_verified_at?: string | null;
  id_verified_at?: string | null;
  id_document_path?: string | null;
  created_at?: string;
  landlord_score?: { score: number; review_count: number } | null;
  tenant_score?: { score: number; review_count: number } | null;
  two_factor_enabled?: boolean;
  two_factor_type?: 'sms' | 'email' | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{
        id: number;
        name: string;
        email: string;
        role?: string;
        bio?: string | null;
        phone?: string | null;
        avatar?: string | null;
        avatar_url?: string | null;
        email_verified_at?: string | null;
        phone_verified_at?: string | null;
        id_verified_at?: string | null;
        id_document_path?: string | null;
        city?: string | null;
        region?: string | null;
        postal_code?: string | null;
        country?: string | null;
        created_at?: string;
        landlord_score?: { score: number; review_count: number } | null;
        tenant_score?: { score: number; review_count: number } | null;
        two_factor_enabled?: boolean;
        two_factor_type?: 'sms' | 'email' | null;
      }>(Endpoints.users.me());
      setProfile({
        id: String(data.id),
        name: data.name,
        email: data.email,
        role: data.role,
        bio: data.bio,
        phone: data.phone,
        city: data.city,
        region: data.region,
        postal_code: data.postal_code,
        country: data.country,
        avatar: data.avatar,
        avatar_url: data.avatar_url,
        email_verified_at: data.email_verified_at,
        phone_verified_at: data.phone_verified_at,
        id_verified_at: data.id_verified_at,
        id_document_path: data.id_document_path,
        created_at: data.created_at,
        landlord_score: data.landlord_score ?? null,
        tenant_score: data.tenant_score ?? null,
        two_factor_enabled: data.two_factor_enabled ?? false,
        two_factor_type: data.two_factor_type ?? null,
      });
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, error, refetch };
}

export function getRoleLabel(role?: string): string {
  switch (role) {
    case 'tenant':
      return 'Looking to rent';
    case 'landlord':
      return 'Listing property';
    default:
      return 'Member';
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '??';
}

export function formatMemberSince(createdAt?: string | null): string {
  if (!createdAt) return '—';
  const date = new Date(createdAt);
  const now = new Date();
  const years = Math.floor((now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (years >= 1) return `${years} year${years > 1 ? 's' : ''}`;
  const months = Math.floor((now.getTime() - date.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
  if (months >= 1) return `${months} month${months > 1 ? 's' : ''}`;
  return 'New member';
}
