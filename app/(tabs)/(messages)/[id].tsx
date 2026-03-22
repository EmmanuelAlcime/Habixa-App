import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  InteractionManager,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import MapView, { Marker } from 'react-native-maps';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useConversation } from '@/hooks/useConversation';
import { useMessages } from '@/hooks/useMessages';
import { api, Endpoints, getApiBaseUrl } from '@/lib/api/client';
import {
  subscribeToConversationChannel,
  triggerTyping,
  triggerStoppedTyping,
  type ConversationChannelRef,
} from '@/lib/pusher';
import { useAuth } from '@/context/AuthContext';
import { playMessageReceivedSound, playMessageSentSound } from '@/lib/playMessageSound';
import { useSetViewingConversation } from '@/context/MessageNotificationContext';
import type { Message, ApiMessage } from '@/lib/types/conversation';

const GOOGLE_MAPS_API_KEY =
  (typeof process !== 'undefined' &&
    (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY)) ||
  '';
const MAX_LENGTH = 2000;
const COUNTER_THRESHOLD = 1800;
const TYPING_DEBOUNCE_MS = 300;
const TYPING_STOP_MS = 3000;

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
    loadMore,
    hasMore,
    refetch,
  } = useMessages(id, user?.id ?? '');
  const [input, setInput] = useState(draft ? decodeURIComponent(draft) : '');
  const [sending, setSending] = useState(false);
  const [timestampMsgId, setTimestampMsgId] = useState<string | null>(null);
  const [otherPartyTyping, setOtherPartyTyping] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const channelRef = useRef<ConversationChannelRef | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const documentPickerInProgressRef = useRef(false);
  const setViewingConversationId = useSetViewingConversation();

  const messagesReversed = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    if (draft) {
      setInput(decodeURIComponent(draft));
    }
  }, [draft]);

  useFocusEffect(
    useCallback(() => {
      if (id) refetch();
    }, [id, refetch])
  );

  useEffect(() => {
    if (!id || !user?.id) return;
    setViewingConversationId(id);
    api.patch(Endpoints.conversations.markRead(id)).catch(() => {});
    const interval = setInterval(() => {
      api.post(Endpoints.conversations.viewing(id)).catch(() => {});
    }, 30000);
    return () => {
      setViewingConversationId(null);
      clearInterval(interval);
      api.post(Endpoints.conversations.leave(id)).catch(() => {});
    };
  }, [id, user?.id, setViewingConversationId]);

  useEffect(() => {
    if (!id || !user?.id) return;
    const sub = subscribeToConversationChannel(id, {
      onMessageSent: (data) => {
        const msg = data.message as {
          id?: number;
          sender_id?: number;
          body?: string;
          created_at?: string;
          sender?: { id: number; name: string };
          type?: string;
          attachment_url?: string;
          attachment_name?: string;
          metadata?: { lat?: number; lng?: number; address?: string };
        };
        if (msg && msg.sender_id !== Number(user?.id)) {
          playMessageReceivedSound();
          appendMessage({
            id: msg.id ?? 0,
            conversation_id: Number(id),
            sender_id: msg.sender_id ?? 0,
            body: msg.body ?? '',
            read_at: null,
            created_at: msg.created_at ?? new Date().toISOString(),
            sender: msg.sender,
            type: msg.type ?? 'text',
            attachment_url: msg.attachment_url,
            attachment_name: msg.attachment_name,
            metadata: msg.metadata,
          });
        }
      },
      onUserTyping: ({ userId, userName }) => {
        if (String(userId) !== String(user?.id)) {
          setOtherPartyTyping(true);
          if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
          otherTypingTimeoutRef.current = setTimeout(() => setOtherPartyTyping(false), TYPING_STOP_MS);
        }
      },
      onUserStoppedTyping: ({ userId }) => {
        if (String(userId) !== String(user?.id)) {
          setOtherPartyTyping(false);
          if (otherTypingTimeoutRef.current) {
            clearTimeout(otherTypingTimeoutRef.current);
            otherTypingTimeoutRef.current = null;
          }
        }
      },
    });
    if (!sub) return;
    channelRef.current = sub;
    unsubscribeRef.current = sub.unsubscribe;
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      channelRef.current = null;
    };
  }, [id, user?.id, appendMessage]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    });
    return () => showSub.remove();
  }, []);

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      if (!user?.id || !user?.name) return;
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingDebounceRef.current = setTimeout(() => {
        typingDebounceRef.current = null;
        triggerTyping(channelRef.current, user.id, user.name);
        typingStopRef.current = setTimeout(() => {
          typingStopRef.current = null;
          triggerStoppedTyping(channelRef.current, user.id);
        }, TYPING_STOP_MS);
      }, TYPING_DEBOUNCE_MS);
    },
    [user?.id, user?.name]
  );

  const sendAttachment = useCallback(
    async (
      type: 'image' | 'document' | 'location',
      fileUri?: string | null,
      fileName?: string,
      locationDataOrMime?: { lat: number; lng: number; address?: string } | string
    ) => {
      const locationData = type === 'location' ? (locationDataOrMime as { lat: number; lng: number; address?: string }) : undefined;
      const fileMimeType = type === 'document' && typeof locationDataOrMime === 'string' ? locationDataOrMime : undefined;
      if (!id || sending) return;
      const body =
        type === 'image' ? '[Image]' : type === 'document' ? '[Document]' : locationData?.address ?? '[Location]';
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: Number(id),
        sender_id: Number(user?.id),
        body,
        read_at: null,
        created_at: new Date().toISOString(),
        sender: user ? { id: Number(user.id), name: user.name } : undefined,
        type,
        attachment_url: type === 'image' && fileUri ? fileUri : undefined,
        attachment_name: type === 'document' ? fileName : undefined,
        metadata: type === 'location' ? locationData : undefined,
      };
      triggerStoppedTyping(channelRef.current, user?.id);
      appendMessage(optimisticMsg);
      setSending(true);
      try {
        const formData = new FormData();
        formData.append('type', type);
        if (type === 'image' || type === 'document') {
          if (!fileUri) throw new Error('File required');
          const ext = (fileName ?? fileUri).split('.').pop() ?? (type === 'image' ? 'jpg' : 'bin');
          const mime =
            type === 'image'
              ? `image/${ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : 'jpeg'}`
              : fileMimeType ?? 'application/octet-stream';
          // Document picker: use uri as-is (matches verification.tsx). Image picker: strip file:// on iOS for FormData.
          let uriForUpload = fileUri;
          if (type === 'image' && Platform.OS === 'ios') {
            uriForUpload = fileUri.replace(/^file:\/\//, '');
          } else if (type === 'document' && Platform.OS === 'android' && fileUri[0] === '/') {
            uriForUpload = `file://${fileUri}`.replace(/%/g, '%25');
          }
          formData.append('file', {
            uri: uriForUpload,
            name: fileName ?? `attachment.${ext}`,
            type: mime,
          } as unknown as Blob);
          if (input.trim()) formData.append('body', input.trim());
        } else if (type === 'location' && locationData) {
          formData.append('lat', String(locationData.lat));
          formData.append('lng', String(locationData.lng));
          if (locationData.address) formData.append('address', locationData.address);
        }
        const res = await api.postFormData<ApiMessage>(
          Endpoints.conversations.sendMessage(id),
          formData
        );
        const serverMsg = res as ApiMessage;
        playMessageSentSound();
        replaceMessage(tempId, {
          ...optimisticMsg,
          id: serverMsg?.id ?? optimisticMsg.id,
          created_at: serverMsg?.created_at ?? optimisticMsg.created_at,
          type: serverMsg?.type ?? type,
          attachment_url: serverMsg?.attachment_url ?? optimisticMsg.attachment_url,
          attachment_name: serverMsg?.attachment_name ?? optimisticMsg.attachment_name,
          metadata: serverMsg?.metadata ?? optimisticMsg.metadata,
        });
      } catch (e) {
        removeMessage(tempId);
        const err = e as { message?: string };
        Alert.alert('Failed to send', err?.message ?? 'Please try again');
      } finally {
        setSending(false);
      }
    },
    [id, sending, user, input, appendMessage, replaceMessage, removeMessage]
  );

  const pickPhoto = useCallback(async () => {
    setShowAttachmentSheet(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await sendAttachment('image', asset.uri, asset.fileName ?? 'photo.jpg');
    }
  }, [sendAttachment]);

  const takePhoto = useCallback(async () => {
    setShowAttachmentSheet(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await sendAttachment('image', asset.uri, asset.fileName ?? 'photo.jpg');
    }
  }, [sendAttachment]);

  const runDocumentPicker = useCallback(async () => {
    if (documentPickerInProgressRef.current) return;
    documentPickerInProgressRef.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      await sendAttachment('document', asset.uri, asset.name, asset.mimeType);
    } catch (e) {
      const err = e as { message?: string };
      const msg = err?.message ?? '';
      if (msg.includes('Different document picking')) {
        Alert.alert('Please wait', 'The document picker is still closing. Try again in a moment.');
      } else {
        Alert.alert('Document error', msg || 'Could not send document');
      }
    } finally {
      documentPickerInProgressRef.current = false;
    }
  }, [sendAttachment]);

  const pickDocument = useCallback(() => {
    setShowAttachmentSheet(false);
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => void runDocumentPicker(), Platform.OS === 'ios' ? 600 : 200);
    });
  }, [runDocumentPicker]);

  const shareLocation = useCallback(async () => {
    setShowAttachmentSheet(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow location access.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;
    let address: string | undefined;
    try {
      const [rev] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (rev) address = [rev.street, rev.city, rev.region, rev.country].filter(Boolean).join(', ');
    } catch { /* ignore */ }
    await sendAttachment('location', null, undefined, { lat: latitude, lng: longitude, address });
  }, [sendAttachment]);

  const showAttachmentOptions = useCallback(() => {
    Keyboard.dismiss();
    setShowAttachmentSheet(true);
  }, []);

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
    triggerStoppedTyping(channelRef.current, user.id);
    appendMessage(optimisticMsg);
    setSending(true);

    try {
      const res = await api.post<ApiMessage>(Endpoints.conversations.sendMessage(id), { body });
      const serverMsg = res as { id?: number; body?: string; created_at?: string; sender?: { id: number; name: string } };
      playMessageSentSound();
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

  const resolveAttachmentUrl = useCallback((url: string | null | undefined) => {
    if (!url) return null;
    const base = getApiBaseUrl().replace(/\/$/, '');
    // Replace localhost with API base so device can load images
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      return `${base}${path.startsWith('/') ? path : '/' + path}`;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = String(item.sender_id) === String(user?.id);
      const showTimestamp = timestampMsgId === String(item.id);
      const timeStr = new Date(item.created_at).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
      const imgUrl = item.type === 'image' ? resolveAttachmentUrl(item.attachment_url) : null;

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
            {imgUrl ? (
              <Pressable onPress={() => Linking.openURL(imgUrl)}>
                <Image source={{ uri: imgUrl }} style={styles.msgImage} contentFit="cover" />
              </Pressable>
            ) : item.type === 'document' && item.attachment_url ? (
              <Pressable
                onPress={() => Linking.openURL(resolveAttachmentUrl(item.attachment_url) ?? '')}
                style={[styles.docPreview, isMe && styles.docPreviewMe]}
              >
                <View style={[styles.docPreviewIconWrap, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)' }]}>
                  <HabixaIcon name="file" size={28} color={isMe ? Colors.desertSand : Colors.midnightInk} solid />
                </View>
                <View style={styles.docPreviewContent}>
                  <Text style={[styles.docPreviewName, { color: isMe ? Colors.desertSand : Colors.midnightInk }]} numberOfLines={2}>
                    {item.attachment_name ?? 'Document'}
                  </Text>
                  <Text style={[styles.docPreviewHint, { color: isMe ? 'rgba(245,239,230,0.7)' : colors.textSecondary }]}>
                    Tap to open
                  </Text>
                </View>
                <HabixaIcon name="external-link-alt" size={12} color={isMe ? 'rgba(245,239,230,0.6)' : colors.textSecondary} solid />
              </Pressable>
            ) : item.type === 'location' && item.metadata ? (
              <Pressable
                onPress={() => {
                  const { lat, lng } = item.metadata!;
                  Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
                }}
                style={styles.locationMapWrap}
              >
                <MapView
                  style={styles.locationMap}
                  initialRegion={{
                    latitude: item.metadata.lat ?? 0,
                    longitude: item.metadata.lng ?? 0,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  provider={Platform.OS === 'android' || Platform.OS === 'web' ? 'google' : undefined}
                  googleMapsApiKey={Platform.OS === 'web' ? GOOGLE_MAPS_API_KEY : undefined}
                >
                  <Marker
                    coordinate={{
                      latitude: item.metadata.lat ?? 0,
                      longitude: item.metadata.lng ?? 0,
                    }}
                    title={item.metadata?.address}
                  />
                </MapView>
                {item.metadata?.address ? (
                  <View style={styles.locationMapOverlay}>
                    <HabixaIcon name="map-marker-alt" size={12} color={Colors.desertSand} solid />
                    <Text style={styles.locationMapAddress} numberOfLines={2}>
                      {item.metadata.address}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
            {item.body && !['[Image]', '[Document]', '[Location]'].includes(item.body) ? (
              <Text style={[styles.bubbleText, { color: isMe ? Colors.desertSand : Colors.midnightInk }]}>
                {item.body}
              </Text>
            ) : null}
            {showTimestamp && (
              <Text style={[styles.bubbleTime, { color: isMe ? 'rgba(245,239,230,0.8)' : Colors.sage }]}>
                {timeStr}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [user?.id, colors.text, timestampMsgId, resolveAttachmentUrl]
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
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { backgroundColor: Colors.midnightInk }]}>
        <Pressable
          onPress={() => router.navigate('/(tabs)/(messages)')}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <HabixaIcon name="chevron-left" size={22} color={Colors.desertSand} solid />
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
        <>
        <FlatList
          ref={flatListRef}
          data={messagesReversed}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          inverted
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          style={styles.flatList}
          contentContainerStyle={[styles.flatListContent, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
        />
        {otherPartyTyping && (
          <View style={[styles.typingBar, { backgroundColor: colors.background }]}>
            <Text style={[styles.typingText, { color: colors.textSecondary }]}>
              {otherName} is typing...
            </Text>
          </View>
        )}
        </>
      )}

      <View style={[styles.inputBar, { paddingBottom: Platform.OS === 'android' ? Math.max(4, insets.bottom - 8) : insets.bottom + 8 }]}>
        <Pressable
          onPress={showAttachmentOptions}
          style={[styles.attachBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          disabled={sending}
        >
          <HabixaIcon name="paperclip" size={20} color={colors.text} solid />
        </Pressable>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={handleInputChange}
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
          disabled={(input.trim().length === 0 || sending)}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.desertSand} />
          ) : (
            <HabixaIcon name="paper-plane" size={16} color={Colors.desertSand} solid />
          )}
        </Pressable>
      </View>

      <Modal
        visible={showAttachmentSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachmentSheet(false)}
      >
        <Pressable
          style={[styles.attachmentOverlay, { paddingTop: insets.top }]}
          onPress={() => setShowAttachmentSheet(false)}
        >
          <Pressable
            style={[styles.attachmentSheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.attachmentGrid}>
              <Pressable style={styles.attachmentItem} onPress={pickPhoto}>
                <View style={[styles.attachmentCircle, { backgroundColor: '#4A90D9' }]}>
                  <HabixaIcon name="images" size={24} color="#FFF" solid />
                </View>
                <Text style={[styles.attachmentLabel, { color: colors.text }]}>Photos</Text>
              </Pressable>
              <Pressable style={styles.attachmentItem} onPress={takePhoto}>
                <View style={[styles.attachmentCircle, { backgroundColor: '#6B7280' }]}>
                  <HabixaIcon name="camera" size={24} color="#FFF" solid />
                </View>
                <Text style={[styles.attachmentLabel, { color: colors.text }]}>Camera</Text>
              </Pressable>
              <Pressable style={styles.attachmentItem} onPress={shareLocation}>
                <View style={[styles.attachmentCircle, { backgroundColor: Colors.sage }]}>
                  <HabixaIcon name="map-marker-alt" size={24} color="#FFF" solid />
                </View>
                <Text style={[styles.attachmentLabel, { color: colors.text }]}>Location</Text>
              </Pressable>
              <Pressable style={styles.attachmentItem} onPress={pickDocument}>
                <View style={[styles.attachmentCircle, { backgroundColor: '#4A90D9' }]}>
                  <HabixaIcon name="file" size={24} color="#FFF" solid />
                </View>
                <Text style={[styles.attachmentLabel, { color: colors.text }]}>Document</Text>
              </Pressable>
            </View>
            <View style={{ paddingBottom: insets.bottom + 8 }} />
          </Pressable>
        </Pressable>
      </Modal>
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
    padding: 12,
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
  typingBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    paddingBottom: 4,
  },
  typingText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
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
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  docPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginBottom: 4,
  },
  docPreviewMe: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  docPreviewIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPreviewContent: {
    flex: 1,
    minWidth: 0,
  },
  docPreviewName: {
    fontFamily: Fonts.heading,
    fontSize: 14,
  },
  docPreviewHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  locationMapWrap: {
    width: 200,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  locationMap: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  locationMapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  locationMapAddress: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.desertSand,
    flex: 1,
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
  attachmentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  attachmentSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  attachmentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attachmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  attachmentCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  attachmentLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
});
