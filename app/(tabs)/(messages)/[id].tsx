import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useConversation } from '@/hooks/useConversation';
import { useMessages } from '@/hooks/useMessages';
import { api, Endpoints } from '@/lib/api/client';
import { subscribeToConversationChannel } from '@/lib/pusher';
import { useAuth } from '@/context/AuthContext';
import type { Message, ApiMessage } from '@/lib/types/conversation';

const MAX_LENGTH = 2000;
const COUNTER_THRESHOLD = 1800;

export default function ConversationScreen() {
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { conversation, loading: convLoading } = useConversation(id);
  const {
    messages,
    loading: msgLoading,
    appendMessage,
    replaceMessage,
    removeMessage,
  } = useMessages(id, user?.id ?? '');
  const [input, setInput] = useState(draft ? decodeURIComponent(draft) : '');
  const [sending, setSending] = useState(false);
  const [timestampMsgId, setTimestampMsgId] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (draft) {
      setInput(decodeURIComponent(draft));
    }
  }, [draft]);

  useEffect(() => {
    if (!id || !user?.id) return;
    api.patch(Endpoints.conversations.markRead(id)).catch(() => {});
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToConversationChannel(id, (data) => {
      const msg = data.message as {
        id?: number;
        sender_id?: number;
        body?: string;
        created_at?: string;
        sender?: { id: number; name: string };
      };
      if (msg && msg.sender_id !== Number(user?.id)) {
        appendMessage({
          id: msg.id ?? 0,
          conversation_id: Number(id),
          sender_id: msg.sender_id ?? 0,
          body: msg.body ?? '',
          read_at: null,
          created_at: msg.created_at ?? new Date().toISOString(),
          sender: msg.sender,
        });
      }
    });
    unsubscribeRef.current = unsub ?? null;
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [id, user?.id, appendMessage]);

  const handleSend = useCallback(async () => {
    const body = input.trim();
    if (!body || !id || sending) return;
    if (body.length > MAX_LENGTH) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: Number(id),
      sender_id: Number(user?.id),
      body,
      read_at: null,
      created_at: new Date().toISOString(),
      sender: user ? { id: Number(user.id), name: user.name } : undefined,
    };

    setInput('');
    appendMessage(optimisticMsg);
    setSending(true);

    try {
      const res = await api.post<ApiMessage>(Endpoints.conversations.sendMessage(id), { body });
      const serverMsg = res as { id?: number; body?: string; created_at?: string; sender?: { id: number; name: string } };
      replaceMessage(tempId, {
        ...optimisticMsg,
        id: serverMsg?.id ?? optimisticMsg.id,
        created_at: serverMsg?.created_at ?? optimisticMsg.created_at,
      });
    } catch (e) {
      setInput(body);
      removeMessage(tempId);
      const err = e as { message?: string };
      Alert.alert('Failed to send', err?.message ?? 'Please try again');
    } finally {
      setSending(false);
    }
  }, [input, id, sending, user, appendMessage, replaceMessage, removeMessage]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = String(item.sender_id) === String(user?.id);
      const showTimestamp = timestampMsgId === String(item.id);
      const timeStr = new Date(item.created_at).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

      return (
        <Pressable
          onLongPress={() => setTimestampMsgId(showTimestamp ? null : String(item.id))}
          style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}
        >
          {!isMe && (
            <View style={[styles.msgAvatar, { backgroundColor: 'rgba(194,103,58,0.15)' }]}>
              <Text style={[styles.msgAvatarText, { color: colors.text }]}>
                {item.sender?.name?.slice(0, 2).toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              isMe ? { backgroundColor: Colors.terracotta } : { backgroundColor: Colors.desertSand },
            ]}
          >
            <Text style={[styles.bubbleText, { color: isMe ? Colors.desertSand : Colors.midnightInk }]}>
              {item.body}
            </Text>
            {showTimestamp && (
              <Text style={[styles.bubbleTime, { color: isMe ? 'rgba(245,239,230,0.8)' : Colors.sage }]}>
                {timeStr}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [user?.id, colors.text, timestampMsgId]
  );

  if (convLoading || !conversation) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  const otherName = conversation.otherParty?.name ?? 'Unknown';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.header, { backgroundColor: Colors.midnightInk }]}>
        <Pressable
          onPress={() => router.navigate('/(tabs)/(messages)')}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {conversation.listingAddress}
          </Text>
        </View>
      </View>

      {msgLoading ? (
        <View style={[styles.center, styles.msgArea]}>
          <ActivityIndicator color={Colors.terracotta} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          style={styles.flatList}
          contentContainerStyle={[styles.flatListContent, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Type a message..."
          placeholderTextColor={Colors.muted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={MAX_LENGTH}
          editable={!sending}
        />
        {input.length > COUNTER_THRESHOLD && (
          <Text style={styles.counter}>
            {input.length}/{MAX_LENGTH}
          </Text>
        )}
        <Pressable
          style={[styles.sendBtn, input.trim().length === 0 && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={input.trim().length === 0 || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.desertSand} />
          ) : (
            <HabixaIcon name="paper-plane" size={16} color={Colors.desertSand} solid />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    marginRight: 12,
  },
  backText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.terracotta,
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    color: Colors.desertSand,
  },
  headerSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.desertSand,
    marginTop: 2,
  },
  msgArea: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  msgAvatarText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  bubbleTime: {
    fontFamily: Fonts.body,
    fontSize: 10,
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  counter: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.sage,
    alignSelf: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
