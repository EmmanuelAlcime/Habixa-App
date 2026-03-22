export interface Conversation {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  preview: string;
  time: string;
  unread: boolean;
  listingAddress: string;
}

export interface ApiConversation {
  id: number;
  landlord_id: number;
  tenant_id: number;
  listing_id?: number;
  listing_address?: string;
  last_message_body?: string;
  last_message_at?: string;
  unread_count_landlord?: number;
  unread_count_tenant?: number;
  other_party?: { id: number; name: string; initials: string };
  /** Legacy format */
  initiator_id?: number;
  participant_id?: number;
  initiator?: { id: number; name: string };
  participant?: { id: number; name: string };
  messages?: { body: string }[];
}

export interface Message {
  id: number | string;
  conversation_id: number;
  sender_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
  sender?: { id: number; name: string };
  type?: 'text' | 'image' | 'document' | 'location';
  attachment_url?: string | null;
  attachment_name?: string | null;
  metadata?: { lat?: number; lng?: number; address?: string } | null;
}

export interface ApiMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
  sender?: { id: number; name: string };
  type?: 'text' | 'image' | 'document' | 'location';
  attachment_url?: string | null;
  attachment_name?: string | null;
  metadata?: { lat?: number; lng?: number; address?: string } | null;
}

export function mapApiConversation(api: ApiConversation, currentUserId: string): Conversation {
  const other = api.other_party ?? (String(api.initiator_id) === currentUserId ? api.participant : api.initiator);
  const name = other?.name ?? 'Unknown';
  const parts = name.trim().split(/\s+/);
  const initials =
    api.other_party?.initials ??
    (parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase());

  const preview = api.last_message_body
    ? api.last_message_body.length > 40
      ? api.last_message_body.slice(0, 37) + '…'
      : api.last_message_body
    : api.messages?.[api.messages.length - 1]?.body
      ? (api.messages[api.messages.length - 1].body.length > 40
          ? api.messages[api.messages.length - 1].body.slice(0, 37) + '…'
          : api.messages[api.messages.length - 1].body)
      : 'Tap to view';

  const lastAt = api.last_message_at ? new Date(api.last_message_at) : null;
  let time = '';
  if (lastAt) {
    const now = new Date();
    const diffMs = now.getTime() - lastAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) time = 'Just now';
    else if (diffMins < 60) time = `${diffMins}m ago`;
    else if (diffMins < 1440) time = `${Math.floor(diffMins / 60)}h ago`;
    else if (diffMins < 2880) time = 'Yesterday';
    else time = lastAt.toLocaleDateString(undefined, { weekday: 'short' });
  } else time = '—';

  const unread =
    String(api.landlord_id) === currentUserId
      ? (api.unread_count_landlord ?? 0) > 0
      : (api.unread_count_tenant ?? 0) > 0;

  return {
    id: String(api.id),
    name,
    initials,
    avatarBg: 'rgba(194,103,58,0.15)',
    preview,
    time,
    unread,
    listingAddress: api.listing_address ?? 'Listing unavailable',
  };
}
