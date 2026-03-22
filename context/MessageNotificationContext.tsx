'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Pressable, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';
import { subscribeToUserChannel } from '@/lib/pusher';
import { playMessageReceivedSound } from '@/lib/playMessageSound';

export type InAppMessageToast = {
  conversationId: number;
  senderName: string;
  body: string;
};

type MessageNotificationContextType = {
  viewingConversationId: string | null;
  setViewingConversationId: (id: string | null) => void;
  toast: InAppMessageToast | null;
  dismissToast: () => void;
  addConversationUpdateListener: (cb: () => void) => () => void;
};

const MessageNotificationContext = createContext<MessageNotificationContextType | null>(null);

export function MessageNotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const [viewingConversationId, setViewingConversationId] = useState<string | null>(null);
  const [toast, setToast] = useState<InAppMessageToast | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const refetchListenersRef = useRef<Set<() => void>>(new Set());

  const dismissToast = useCallback(() => setToast(null), []);

  const addConversationUpdateListener = useCallback((cb: () => void) => {
    refetchListenersRef.current.add(cb);
    return () => {
      refetchListenersRef.current.delete(cb);
    };
  }, []);

  const openConversation = useCallback(
    (conversationId: number) => {
      dismissToast();
      router.push(`/(tabs)/(messages)/${conversationId}`);
    },
    [dismissToast, router]
  );

  const viewingRef = useRef(viewingConversationId);
  viewingRef.current = viewingConversationId;

  useEffect(() => {
    if (!user?.id) return;

    const pingForeground = () => api.post(Endpoints.notifications.foreground()).catch(() => {});

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        pingForeground();
      }
    });

    if (AppState.currentState === 'active') pingForeground();
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') pingForeground();
    }, 30000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const unsub = subscribeToUserChannel(user.id, (data) => {
      const conv = data.conversation as {
        id?: number;
        last_message_body?: string;
        other_party?: { name?: string };
      };
      if (!conv?.id) return;

      refetchListenersRef.current.forEach((cb) => {
        try {
          cb();
        } catch {
          /* ignore */
        }
      });

      const convIdStr = String(conv.id);
      const viewing = viewingRef.current;
      if (viewing === convIdStr) return;

      const senderName = conv.other_party?.name ?? 'Someone';
      const body = conv.last_message_body ?? 'New message';

      playMessageReceivedSound();
      setToast({
        conversationId: conv.id,
        senderName,
        body: body.length > 60 ? body.slice(0, 57) + '...' : body,
      });
    });

    unsubscribeRef.current = unsub ?? null;
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.id]);

  return (
    <MessageNotificationContext.Provider
      value={{
        viewingConversationId,
        setViewingConversationId,
        toast,
        dismissToast,
        addConversationUpdateListener,
      }}
    >
      {children}
      {toast && (
        <InAppMessageToastBanner
          toast={toast}
          onPress={() => openConversation(toast.conversationId)}
          onDismiss={dismissToast}
        />
      )}
    </MessageNotificationContext.Provider>
  );
}

function InAppMessageToastBanner({
  toast,
  onPress,
  onDismiss,
}: {
  toast: InAppMessageToast;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <Pressable
      style={[bannerStyles.banner, { top: insets.top + 8 }]}
      onPress={() => {
        setVisible(false);
        onDismiss();
        onPress();
      }}
    >
      <View style={bannerStyles.content}>
        <HabixaIcon name="comment-dots" size={20} color="#fff" solid />
        <View style={bannerStyles.textWrap}>
          <Text style={bannerStyles.sender}>{toast.senderName}</Text>
          <Text style={bannerStyles.body} numberOfLines={1}>{toast.body}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const bannerStyles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: Colors.sage,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  sender: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: '#fff',
  },
  body: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});

export function useMessageNotification() {
  const ctx = useContext(MessageNotificationContext);
  if (!ctx) throw new Error('useMessageNotification must be used within MessageNotificationProvider');
  return ctx;
}

export function useSetViewingConversation() {
  const ctx = useContext(MessageNotificationContext);
  return ctx?.setViewingConversationId ?? (() => {});
}
