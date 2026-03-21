import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';

interface LikesState {
  likedIds: Set<string>;
  loading: boolean;
  toggleLike: (listingId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useLikes(): LikesState {
  const { user } = useAuth();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchLiked = useCallback(async () => {
    if (!user) {
      setLikedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ id: number }[]>(Endpoints.listings.liked());
      const list = Array.isArray(res) ? res : [];
      setLikedIds(new Set(list.map((l: { id: number }) => String(l.id))));
    } catch (e) {
      const err = e as { status?: number };
      // 401 = unauthenticated; treat as empty likes
      if (err?.status === 401) {
        setLikedIds(new Set());
      } else {
        setLikedIds(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLiked();
  }, [fetchLiked]);

  const toggleLike = useCallback(
    async (listingId: string): Promise<boolean> => {
      if (!user) return false;
      const isLiked = likedIds.has(listingId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      try {
        if (isLiked) {
          await api.delete(Endpoints.listings.unlike(listingId));
          return false;
        } else {
          await api.post(Endpoints.listings.like(listingId));
          return true;
        }
      } catch {
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (isLiked) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
        return isLiked;
      }
    },
    [user?.id, likedIds]
  );

  return { likedIds, loading, toggleLike, refetch: fetchLiked };
}
