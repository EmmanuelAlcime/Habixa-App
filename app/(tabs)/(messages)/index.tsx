import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useConversations } from '@/hooks/useConversations';
import { subscribeToUserChannel } from '@/lib/pusher';
import { useAuth } from '@/context/AuthContext';
import type { Conversation } from '@/lib/types/conversation';

function ConversationItem({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[
        styles.convoItem,
        { backgroundColor: colors.card, borderColor: colors.border },
        item.unread && styles.convoItemUnread,
      ]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: item.avatarBg }]}>
        <Text style={[styles.avatarText, { color: colors.text }]}>{item.initials}</Text>
      </View>
      <View style={styles.convoBody}>
        <Text style={[styles.convoName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.convoListing, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.listingAddress ?? 'Listing unavailable'}
        </Text>
        <Text style={[styles.convoPreview, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.preview}
        </Text>
      </View>
      <View style={styles.convoMeta}>
        <Text style={[styles.convoTime, { color: Colors.terracotta }]}>{item.time}</Text>
        {item.unread && <View style={styles.unreadDot} />}
      </View>
    </Pressable>
  );
}

export default function InboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { conversations, refetch } = useConversations();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
      if (user?.id) {
        const unsub = subscribeToUserChannel(user.id, () => {
          refetch();
        });
        unsubscribeRef.current = unsub ?? null;
      }
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }, [refetch, user?.id])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.convoList,
          conversations.length === 0 && styles.convoListEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <HabixaIcon name="comments" size={56} color={Colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Start a conversation by contacting a landlord or tenant from a listing
            </Text>
          </View>
        ) : (
          conversations.map((item) => (
            <ConversationItem
              key={item.id}
              item={item}
              onPress={() => router.push(`/(tabs)/(messages)/${item.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.midnightInk,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 18,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.desertSand,
  },
  scroll: {
    flex: 1,
  },
  convoList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 100,
    gap: 6,
  },
  convoListEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  convoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 6,
  },
  convoItemUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.terracotta,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
  convoBody: {
    flex: 1,
    minWidth: 0,
  },
  convoName: {
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  convoListing: {
    fontSize: 10,
    fontFamily: Fonts.body,
    marginTop: 1,
  },
  convoPreview: {
    fontSize: 11,
    marginTop: 2,
  },
  convoMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  convoTime: {
    fontSize: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.terracotta,
  },
});
