/**
 * Review modal — write a review for a landlord or tenant.
 *
 * Params:
 *   subjectId   — user ID being reviewed
 *   subjectName — display name of the person
 *   leaseId     — the lease this review is for
 *   type        — 'landlord' | 'tenant'
 *   address     — listing address (shown for context)
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

const LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

const LANDLORD_PROMPTS = [
  'Responsive and communicative',
  'Well-maintained property',
  'Fair and transparent',
  'Professional',
  'Would recommend',
];

const TENANT_PROMPTS = [
  'Paid rent on time',
  'Kept property clean',
  'Respectful neighbour',
  'Communicated well',
  'Would rent to again',
];

export default function WriteReviewModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { subjectId, subjectName, leaseId, type, address } =
    useLocalSearchParams<{
      subjectId: string;
      subjectName: string;
      leaseId: string;
      type: 'landlord' | 'tenant';
      address?: string;
    }>();

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [content, setContent] = useState('');
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const prompts = type === 'tenant' ? TENANT_PROMPTS : LANDLORD_PROMPTS;
  const displayRating = hoveredStar || rating;
  const canSubmit = rating > 0 && !submitting;

  function togglePrompt(p: string) {
    setSelectedPrompts((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    // Combine selected prompts with freeform content
    const parts: string[] = [];
    if (selectedPrompts.length > 0) parts.push(selectedPrompts.join('. ') + '.');
    if (content.trim()) parts.push(content.trim());
    const finalContent = parts.join(' ') || null;

    setSubmitting(true);
    try {
      await api.post(Endpoints.reviews.store(), {
        subject_id: Number(subjectId),
        lease_id: Number(leaseId),
        type,
        rating,
        content: finalContent,
      });

      Alert.alert(
        'Review submitted',
        `Your ${type} review has been submitted. Thank you for helping build trust in the Habixa community.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <HabixaIcon name="times" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Rate {type === 'landlord' ? 'Landlord' : 'Tenant'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Subject info */}
        <View style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: Colors.terracotta + '20' }]}>
            <Text style={[styles.avatarText, { color: Colors.terracotta }]}>
              {(subjectName ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.subjectName, { color: colors.text }]}>
              {subjectName ?? 'Unknown'}
            </Text>
            {address ? (
              <View style={styles.addressRow}>
                <HabixaIcon name="map-marker-alt" size={10} color={Colors.muted} solid />
                <Text style={[styles.addressText, { color: Colors.muted }]} numberOfLines={1}>
                  {address}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Star rating */}
        <View style={styles.starSection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Overall rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                onPressIn={() => setHoveredStar(star)}
                onPressOut={() => setHoveredStar(0)}
                style={styles.starBtn}
                hitSlop={8}
              >
                <HabixaIcon
                  name="star"
                  size={38}
                  color={star <= displayRating ? Colors.gold : colors.border}
                  solid={star <= displayRating}
                />
              </Pressable>
            ))}
          </View>
          {displayRating > 0 && (
            <Text style={[styles.ratingLabel, { color: Colors.muted }]}>
              {LABELS[displayRating - 1]}
            </Text>
          )}
        </View>

        {/* Quick prompts */}
        <View style={styles.promptSection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            What stood out? (optional)
          </Text>
          <View style={styles.promptsWrap}>
            {prompts.map((p) => {
              const active = selectedPrompts.includes(p);
              return (
                <Pressable
                  key={p}
                  style={[
                    styles.promptChip,
                    { borderColor: active ? Colors.terracotta : colors.border },
                    active && styles.promptChipActive,
                  ]}
                  onPress={() => togglePrompt(p)}
                >
                  {active && (
                    <HabixaIcon name="check" size={10} color={Colors.desertSand} />
                  )}
                  <Text
                    style={[
                      styles.promptChipText,
                      { color: active ? Colors.desertSand : colors.text },
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Freeform comment */}
        <View style={styles.commentSection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Your review (optional)
          </Text>
          <TextInput
            style={[
              styles.commentInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            placeholder={
              type === 'landlord'
                ? 'What was your experience renting from this landlord?'
                : 'What was this tenant like?'
            }
            placeholderTextColor={Colors.muted}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: Colors.muted }]}>
            {content.length}/2000
          </Text>
        </View>

        {/* Trust note */}
        <View style={[styles.trustNote, { borderColor: colors.border }]}>
          <HabixaIcon name="shield-alt" size={12} color={Colors.sage} />
          <Text style={[styles.trustNoteText, { color: Colors.muted }]}>
            Reviews are tied to real leases — they can't be faked. You can delete within 24 hours.
          </Text>
        </View>

        {/* Submit */}
        <Pressable
          style={[
            styles.submitBtn,
            (!canSubmit) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.desertSand} />
          ) : (
            <>
              <HabixaIcon name="star" size={16} color={Colors.desertSand} solid />
              <Text style={styles.submitBtnText}>Submit review</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  closeBtn: { padding: 6, width: 36 },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 18,
    textAlign: 'center',
  },
  scroll: { padding: 20, gap: 24 },

  // Subject
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.display, fontSize: 18 },
  subjectName: { fontFamily: Fonts.heading, fontSize: 15 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  addressText: { fontFamily: Fonts.body, fontSize: 12, flex: 1 },

  // Stars
  starSection: { alignItems: 'center', gap: 12 },
  sectionLabel: { fontFamily: Fonts.heading, fontSize: 13, alignSelf: 'flex-start' },
  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: { padding: 4 },
  ratingLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Prompts
  promptSection: { gap: 12 },
  promptsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  promptChipActive: { backgroundColor: Colors.terracotta },
  promptChipText: { fontFamily: Fonts.heading, fontSize: 13 },

  // Comment
  commentSection: { gap: 8 },
  commentInput: {
    height: 120,
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 14,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  charCount: { fontFamily: Fonts.body, fontSize: 11, alignSelf: 'flex-end' },

  // Trust note
  trustNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  trustNoteText: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, flex: 1 },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.terracotta,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.desertSand,
  },
});
