/**
 * Pusher client for real-time messaging.
 * Subscribes to private channels with auth via API.
 */

// Use React Native–specific build; default import can resolve to browser build and fail with "pusher.js could not be found"
import Pusher from 'pusher-js/dist/react-native/pusher';
import { getAuthToken } from './api/client';

const PUSHER_KEY =
  (typeof process !== 'undefined' &&
    (process.env.EXPO_PUBLIC_PUSHER_APP_KEY || process.env.PUSHER_APP_KEY)) ||
  '';

let pusher: Pusher | null = null;

function getBaseUrl(): string {
  return (
    (typeof process !== 'undefined' &&
      (process.env.EXPO_PUBLIC_API_URL || process.env.API_URL)) ||
    'http://localhost:8000'
  ).replace(/\/$/, '');
}

function getPusher(): Pusher | null {
  if (!PUSHER_KEY) return null;
  if (pusher) return pusher;

  const token = getAuthToken();
  if (!token) return null;

  pusher = new Pusher(PUSHER_KEY, {
    cluster: process.env.EXPO_PUBLIC_PUSHER_APP_CLUSTER || 'mt1',
    authEndpoint: `${getBaseUrl()}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
    enabledTransports: ['ws', 'wss'],
  });

  return pusher;
}

export function subscribeToUserChannel(
  userId: string,
  onConversationUpdated: (data: { conversation: Record<string, unknown> }) => void
): (() => void) | null {
  const p = getPusher();
  if (!p) return null;

  const channelName = `private-user.${userId}`;
  const channel = p.subscribe(channelName);

  const handler = (data: { conversation?: Record<string, unknown> }) => {
    if (data?.conversation) {
      onConversationUpdated({ conversation: data.conversation });
    }
  };

  channel.bind('ConversationUpdated', handler);

  return () => {
    channel.unbind('ConversationUpdated', handler);
    p.unsubscribe(channelName);
  };
}

export function subscribeToConversationChannel(
  conversationId: string,
  onMessageSent: (data: { message: Record<string, unknown> }) => void
): (() => void) | null {
  const p = getPusher();
  if (!p) return null;

  const channelName = `private-conversation.${conversationId}`;
  const channel = p.subscribe(channelName);

  const handler = (data: { message?: Record<string, unknown> }) => {
    if (data?.message) {
      onMessageSent({ message: data.message });
    }
  };

  channel.bind('MessageSent', handler);

  return () => {
    channel.unbind('MessageSent', handler);
    p.unsubscribe(channelName);
  };
}

export function disconnectPusher(): void {
  if (pusher) {
    pusher.disconnect();
    pusher = null;
  }
}
