import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api, Endpoints } from '@/lib/api/client';

interface Review {
  id: number;
  author_id: number;
  subject_id: number;
  type: string;
  rating: number;
  content?: string | null;
  created_at: string;
  author?: { id: number; name: string };
}

interface ApiReviewsResponse {
  data?: Review[];
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <HabixaIcon
          key={i}
          name="star"
          size={12}
          color={Colors.gold}
          solid={i <= rating}
        />
      ))}
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiReviewsResponse | Review[]>(
        Endpoints.usersReviews(user.id)
      );
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setReviews((data as Review[]) ?? []);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <HabixaIcon name="chevron-left" size={22} color={Colors.terracotta} solid />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>My Reviews</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <HabixaIcon name="exclamation-circle" size={48} color={Colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{error}</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyWrap}>
          <HabixaIcon name="star" size={48} color={Colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No reviews yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Reviews from tenants or landlords will appear here
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {reviews.map((item) => (
            <View
              key={item.id}
              style={[
                styles.reviewCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewAuthor, { color: colors.text }]}>
                  {item.author?.name ?? 'Anonymous'}
                </Text>
                <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
              <StarDisplay rating={item.rating} />
              {item.content ? (
                <Text style={[styles.reviewContent, { color: colors.text }]}>
                  {item.content}
                </Text>
              ) : null}
            </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    marginRight: 16,
  },
  backText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 12,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  reviewDate: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  reviewContent: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
