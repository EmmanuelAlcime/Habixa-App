import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import type { Conversation } from '@/lib/types/conversation';
import { mapApiConversation, type ApiConversation } from '@/lib/types/conversation';
import { useAuth } from '@/context/AuthContext';

interface ConversationsState {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useConversations(): ConversationsState {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data?: ApiConversation[] }>(Endpoints.conversations.index());
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setConversations(
        (data as ApiConversation[]).map((c) => mapApiConversation(c, user.id))
      );
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { conversations, loading, error, refetch: fetchAll };
}
