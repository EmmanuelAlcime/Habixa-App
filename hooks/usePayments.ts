import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';

export interface Payment {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  currency?: string;
  status: string;
  created_at: string;
  payable_type?: string;
  payable_id?: number;
}

interface ApiPaymentResponse {
  data?: Payment[];
  current_page?: number;
  last_page?: number;
  total?: number;
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiPaymentResponse | Payment[]>(
        Endpoints.payments.index()
      );
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setPayments((data as Payment[]) ?? []);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { payments, loading, error, refetch };
}
