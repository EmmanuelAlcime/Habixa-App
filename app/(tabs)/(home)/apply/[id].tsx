import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useListing } from '@/hooks/useListing';
import { api, Endpoints } from '@/lib/api/client';

export default function ApplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listing, loading } = useListing(id);
  const [messageLoading, setMessageLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  async function handleSendMessage() {
    if (!listing || !listing.userId) return;
    setMessageLoading(true);
    try {
      const res = await api.post<{ id: number }>(Endpoints.conversations.store(), {
        listing_id: Number(listing.id),
        participant_id: Number(listing.userId),
      });
      const conversationId = res?.id ?? (res as { data?: { id?: number } })?.data?.id;
      if (conversationId) {
        const draft = encodeURIComponent(
          `Hi, I'm interested in your listing at ${listing.address}.`
        );
        router.push(`/(tabs)/(messages)/${conversationId}?draft=${draft}`);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.warn('Failed to create conversation:', err?.message);
    } finally {
      setMessageLoading(false);
    }
  }

  async function handleApplyToRent() {
    if (!listing || !listing.userId) return;
    setApplyLoading(true);
    try {
      const res = await api.post<{ id: number }>(Endpoints.conversations.store(), {
        listing_id: Number(listing.id),
        participant_id: Number(listing.userId),
      });
      const conversationId = res?.id ?? (res as { data?: { id?: number } })?.data?.id;
      if (conversationId) {
        const draft = encodeURIComponent(
          `Hi, I would like to apply to rent your property at ${listing.address}. Please let me know the next steps.`
        );
        router.push(`/(tabs)/(messages)/${conversationId}?draft=${draft}`);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.warn('Failed to create conversation:', err?.message);
    } finally {
      setApplyLoading(false);
    }
  }

  if (loading || !listing) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Apply / Contact</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.listingTitle}>{listing.title}</Text>
        <Text style={styles.landlord}>Contact {listing.landlordName}</Text>
        <Pressable
          style={styles.btn}
          onPress={handleSendMessage}
          disabled={messageLoading || !listing.userId}
        >
          {messageLoading ? (
            <ActivityIndicator size="small" color={Colors.desertSand} />
          ) : (
            <Text style={styles.btnText}>Send Message</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={handleApplyToRent}
          disabled={applyLoading || !listing.userId}
        >
          {applyLoading ? (
            <ActivityIndicator size="small" color={Colors.terracotta} />
          ) : (
            <Text style={styles.btnSecondaryText}>Apply to Rent</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.desertSand,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.terracotta,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.midnightInk,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  listingTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.midnightInk,
  },
  landlord: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.sage,
    marginTop: 4,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.desertSand,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.terracotta,
  },
  btnSecondaryText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.terracotta,
  },
});
