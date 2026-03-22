import { useState, useEffect, useCallback } from 'react';
import { api, Endpoints } from '@/lib/api/client';
import type { Message, ApiMessage } from '@/lib/types/conversation';

function toMessage(raw: ApiMessage): Message {
  return {
    id: raw.id,
    conversation_id: raw.conversation_id,
    sender_id: raw.sender_id,
    body: raw.body,
    read_at: raw.read_at,
    created_at: raw.created_at,
    sender: raw.sender,
    type: raw.type ?? 'text',
    attachment_url: raw.attachment_url,
    attachment_name: raw.attachment_name,
    metadata: raw.metadata,
  };
}

interface MessagesState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  appendMessage: (msg: Message) => void;
  replaceMessage: (tempId: string, msg: Message) => void;
  removeMessage: (id: string) => void;
  refetch: () => Promise<void>;
}

export function useMessages(
  conversationId: string | undefined,
  currentUserId: string
): MessagesState {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!conversationId) return;
      if (pageNum === 1) setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ data?: ApiMessage[]; current_page?: number; last_page?: number }>(
          `${Endpoints.conversations.messages(conversationId)}?page=${pageNum}`
        );
        const data = (res as { data?: ApiMessage[] })?.data ?? [];
        const list = (Array.isArray(data) ? data : []).map(toMessage);
        setMessages((prev) => (append ? [...prev, ...list] : list));
        const lastPage = (res as { last_page?: number })?.last_page ?? 1;
        setHasMore(pageNum < lastPage);
        setPage(pageNum);
      } catch (e) {
        const err = e as { message?: string };
        setError(err?.message ?? 'Failed to load messages');
        if (!append) setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchPage(page + 1, true);
  }, [hasMore, loading, page, fetchPage]);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => String(m.id) === String(msg.id))) return prev;
      return [msg, ...prev];
    });
  }, []);

  const replaceMessage = useCallback((tempId: string, msg: Message) => {
    setMessages((prev) =>
      prev.map((m) => (String(m.id) === tempId ? msg : m))
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => String(m.id) !== id));
  }, []);

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage]);

  return { messages, loading, error, hasMore, loadMore, appendMessage, replaceMessage, removeMessage, refetch };
}
