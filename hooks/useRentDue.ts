import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';

export interface RentDueLease {
  id: number;
  listing_title: string;
  address?: string;
  monthly_rent: number;
  currency: string;
  landlord_name?: string;
  landlord_country?: string;
  next_due_date: string;
  days_until_due: number;
  payment_month: string;
}

export function useRentDue(enabled = true) {
  const [leases, setLeases] = useState<RentDueLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: RentDueLease[] }>(Endpoints.leases.rentDue());
      setLeases(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load');
      setLeases([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { leases, loading, error, refetch };
}
