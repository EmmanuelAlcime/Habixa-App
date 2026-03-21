import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import type { Notification, NotificationListResponse } from '@/lib/types/notification';

function mapNotification(raw: { id: string; type: string; data: Record<string, unknown>; read_at: string | null; created_at: string; updated_at: string }): Notification {
  const data = raw.data || {};
  return {
    ...raw,
    message: (data.message as string) ?? (data.body as string) ?? 'New notification',
    title: (data.title as string) ?? (data.subject as string),
  };
}

interface UseNotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export function useNotifications(): UseNotificationsState {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<NotificationListResponse | Notification[]>(Endpoints.notifications.index());
      const items = Array.isArray(res) ? res : (res as NotificationListResponse).data ?? [];
      const mapped = (items as { id: string; type: string; data: Record<string, unknown>; read_at: string | null; created_at: string; updated_at: string }[]).map(mapNotification);
      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read_at).length);
    } catch (e) {
      const err = e as { message?: string; status?: number };
      // 401 = unauthenticated; treat as empty, don't show error
      if (err?.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
        setError(null);
      } else {
        setError(err?.message ?? 'Failed to load notifications');
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await api.patch(Endpoints.notifications.markRead(id), {});
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Refetch on failure
        await fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  return { notifications, unreadCount, loading, error, refetch: fetchNotifications, markAsRead };
}
