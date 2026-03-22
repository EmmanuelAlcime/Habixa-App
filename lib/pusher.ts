/**
 * Pusher client for real-time messaging.
 * Subscribes to private channels with auth via API.
 */

// Use React Native–specific build; default import can resolve to browser build and fail with "pusher.js could not be found"
import Pusher from 'pusher-js/dist/react-native/pusher';
import { getAuthToken, getApiBaseUrl } from './api/client';

const PUSHER_KEY =
  (typeof process !== 'undefined' &&
    (process.env.EXPO_PUBLIC_PUSHER_APP_KEY || process.env.PUSHER_APP_KEY)) ||
  '';

let pusher: Pusher | null = null;

function getPusher(): Pusher | null {
  if (!PUSHER_KEY) return null;
  if (pusher) return pusher;
  const token = getAuthToken();
  if (!token) return null;
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  pusher = new Pusher(PUSHER_KEY, {
    cluster: process.env.EXPO_PUBLIC_PUSHER_APP_CLUSTER || 'mt1',
    authEndpoint: `${baseUrl}/api/broadcasting/auth`,
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

/** Channel returned from subscribeToConversationChannel; supports trigger for client events (typing). */
export interface ConversationChannelRef {
  unsubscribe: () => void;
  channel: { trigger: (eventName: string, data?: object) => boolean };
}

export interface ConversationSubscriptionOptions {
  onMessageSent: (data: { message: Record<string, unknown> }) => void;
  onUserTyping?: (data: { userId: string; userName: string }) => void;
  onUserStoppedTyping?: (data: { userId: string }) => void;
}

export function subscribeToConversationChannel(
  conversationId: string,
  onMessageSent: (data: { message: Record<string, unknown> }) => void
): ConversationChannelRef | null;
export function subscribeToConversationChannel(
  conversationId: string,
  options: ConversationSubscriptionOptions
): ConversationChannelRef | null;
export function subscribeToConversationChannel(
  conversationId: string,
  onMessageSentOrOptions: ((data: { message: Record<string, unknown> }) => void) | ConversationSubscriptionOptions
): ConversationChannelRef | null {
  const p = getPusher();
  if (!p) return null;
  const options: ConversationSubscriptionOptions =
    typeof onMessageSentOrOptions === 'function'
      ? { onMessageSent: onMessageSentOrOptions }
      : onMessageSentOrOptions;

  const channelName = `private-conversation.${conversationId}`;
  const channel = p.subscribe(channelName);

  if (__DEV__) {
    channel.bind('pusher:subscription_succeeded', () => {
      console.debug('[Pusher] subscribed to', channelName);
    });
    channel.bind('pusher:subscription_error', (err: { status?: number }) => {
      console.warn('[Pusher] subscription error for', channelName, err);
    });
  }

  const msgHandler = (data: { message?: Record<string, unknown> }) => {
    if (data?.message) {
      options.onMessageSent({ message: data.message });
    }
  };

  channel.bind('MessageSent', msgHandler);

  if (options.onUserTyping) {
    channel.bind('client-UserTyping', (data: { userId?: string; userName?: string }) => {
      if (data?.userId) {
        options.onUserTyping!({ userId: data.userId, userName: data.userName ?? 'Someone' });
      }
    });
  }
  if (options.onUserStoppedTyping) {
    channel.bind('client-UserStoppedTyping', (data: { userId?: string }) => {
      if (data?.userId) {
        options.onUserStoppedTyping!({ userId: data.userId });
      }
    });
  }

  const unsubscribe = () => {
    channel.unbind('MessageSent', msgHandler);
    channel.unbind('client-UserTyping');
    channel.unbind('client-UserStoppedTyping');
    if (__DEV__) {
      channel.unbind('pusher:subscription_succeeded');
      channel.unbind('pusher:subscription_error');
    }
    p.unsubscribe(channelName);
  };

  return { unsubscribe, channel };
}

/** Trigger typing indicator (client event). Channel must be subscribed. Requires "Client Events" in Pusher dashboard. */
export function triggerTyping(
  channelRef: { channel: { trigger: (eventName: string, data?: object) => boolean } } | null,
  userId: string,
  userName: string
): void {
  if (!channelRef?.channel) return;
  channelRef.channel.trigger('client-UserTyping', { userId, userName });
}

/** Trigger stopped typing (client event). */
export function triggerStoppedTyping(
  channelRef: { channel: { trigger: (eventName: string, data?: object) => boolean } } | null,
  userId: string
): void {
  if (!channelRef?.channel) return;
  channelRef.channel.trigger('client-UserStoppedTyping', { userId });
}

export function disconnectPusher(): void {
  if (pusher) {
    pusher.disconnect();
    pusher = null;
  }
}
