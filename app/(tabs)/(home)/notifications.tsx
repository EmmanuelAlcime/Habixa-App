import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/lib/types/notification';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function NotificationItem({
  item,
  colors,
  onMarkRead,
  onPress,
}: {
  item: Notification;
  colors: typeof Colors.light;
  onMarkRead: (id: string) => void;
  onPress: () => void;
}) {
  const isUnread = !item.read_at;

  return (
    <Pressable
      style={[styles.notifRow, { backgroundColor: colors.card, borderColor: colors.border }, isUnread && styles.notifRowUnread]}
      onPress={() => {
        if (isUnread) onMarkRead(item.id);
        onPress();
      }}
    >
      <View style={[styles.notifIconWrap, { backgroundColor: isUnread ? 'rgba(194,103,58,0.12)' : 'rgba(15,22,35,0.06)' }]}>
        <HabixaIcon
          name="bell"
          size={14}
          color={isUnread ? Colors.terracotta : Colors.muted}
          solid={isUnread}
        />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title || 'Notification'}
        </Text>
        <Text style={[styles.notifMessage, { color: Colors.muted }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notifTime}>{formatDate(item.created_at)}</Text>
      </View>
      {isUnread && <View style={styles.notifDot} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { notifications, loading, error, refetch, markAsRead } = useNotifications();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <HabixaIcon name="arrow-left" size={16} color={Colors.midnightInk} solid />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <HabixaIcon name="bell-slash" size={36} color={Colors.muted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
          <Text style={styles.emptySub}>You're all caught up</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              colors={colors}
              onMarkRead={markAsRead}
              onPress={() => {
                const data = item.data as { listing_id?: string; url?: string };
                if (data?.listing_id) {
                  router.push(`/(tabs)/(home)/listing/${data.listing_id}`);
                } else if (data?.url) {
                  router.push(data.url as never);
                }
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    color: Colors.midnightInk,
  },
  headerSpacer: {
    width: 36,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: Colors.terracotta,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.terracotta,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.desertSand,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(15,22,35,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.muted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 10,
  },
  notifRowUnread: {
    backgroundColor: 'rgba(194,103,58,0.06)',
    borderColor: 'rgba(194,103,58,0.2)',
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 12,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 10,
    color: Colors.muted,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.terracotta,
    marginLeft: 8,
  },
});
