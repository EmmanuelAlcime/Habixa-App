import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';

export interface ConversationDetail {
  id: string;
  listingAddress: string;
  otherParty: { id: number; name: string; initials: string } | null;
}

interface ConversationState {
  conversation: ConversationDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useConversation(conversationId: string | undefined): ConversationState {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!conversationId) {
      setConversation(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        id: number;
        listing_address?: string;
        other_party?: { id: number; name: string; initials: string };
      }>(Endpoints.conversations.show(conversationId));
      setConversation({
        id: String(res?.id ?? conversationId),
        listingAddress: res?.listing_address ?? 'Listing unavailable',
        otherParty: res?.other_party ?? null,
      });
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load conversation');
      setConversation(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return { conversation, loading, error, refetch: fetchOne };
}
