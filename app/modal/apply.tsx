/**
 * Apply modal — tenant submits a rental application.
 *
 * Route: /modal/apply
 * Params: listingId, listingAddress, listingPrice, currency, landlordName
 *
 * Opens from the "Apply Now" button on the listing detail page.
 * Replaces the current apply/[id].tsx which only creates a conversation.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';
import { formatPrice } from '@/lib/formatters';
import { t } from '@/lib/i18n';

const DURATIONS = [
  { value: '6_months',  label: '6 months' },
  { value: '12_months', label: '1 year' },
  { value: '18_months', label: '18 months' },
  { value: '24_months', label: '2 years' },
  { value: 'flexible',  label: 'Flexible' },
];

const MESSAGE_TEMPLATES: { label: string; text: string }[] = [
  { label: 'Working professional', text: "Hi, I'm a working professional looking for a long-term rental. I have a stable income and excellent references." },
  { label: 'Quiet tenant', text: "Hello! I'm a quiet, responsible tenant seeking a peaceful place to call home. I work from home occasionally." },
  { label: 'Relocating for work', text: "Hi there, I'm relocating for work and looking for a place to move into soon. I'm organized and respectful of property." },
  { label: 'Student / Postgrad', text: "Hello! I'm a student/postgrad with a part-time job. I'm looking for a clean, quiet space for the semester." },
  { label: 'No pets, non-smoker', text: "Hi, I'm interested in this property. I'm a non-smoker, no pets, and I take pride in keeping my space tidy." },
];

export default function ApplyModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { listingId, listingAddress, listingPrice, currency, landlordName } =
    useLocalSearchParams<{
      listingId: string;
      listingAddress: string;
      listingPrice: string;
      currency: string;
      landlordName: string;
    }>();

  // Default move-in: 2 weeks from today
  const defaultMoveIn = new Date();
  defaultMoveIn.setDate(defaultMoveIn.getDate() + 14);

  const [moveInDate, setMoveInDate] = useState(defaultMoveIn);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [duration, setDuration] = useState('12_months');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const price = listingPrice ? parseFloat(listingPrice) : 0;
  const canSubmit = message.trim().length >= 20 && !submitting;

  function formatDate(d: Date) {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  async function handleSubmit() {
    if (!canSubmit || !listingId) return;
    setSubmitting(true);
    try {
      await api.post(`/api/listings/${listingId}/apply`, {
        move_in_date: moveInDate.toISOString().split('T')[0],
        duration,
        message: message.trim(),
      });

      Alert.alert(
        'Application sent!',
        `Your application has been sent to ${landlordName ?? 'the landlord'}. You'll be notified when they respond.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (e) {
      const err = e as { message?: string; status?: number };
      if (err?.status === 409) {
        Alert.alert('Already applied', 'You have already submitted an application for this listing.');
      } else {
        Alert.alert('Error', err?.message ?? 'Could not submit application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <HabixaIcon name="times" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Apply to Rent</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Listing summary */}
        <View style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.listingCardLeft}>
            <View style={[styles.listingIcon, { backgroundColor: Colors.terracotta + '18' }]}>
              <HabixaIcon name="home" size={18} color={Colors.terracotta} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listingAddress, { color: colors.text }]} numberOfLines={2}>
                {listingAddress ?? 'Property'}
              </Text>
              {price > 0 && (
                <Text style={[styles.listingPrice, { color: Colors.terracotta }]}>
                  {formatPrice(price, currency ?? 'USD')}
                  <Text style={{ color: colors.muted, fontFamily: Fonts.body, fontSize: 12 }}>/month</Text>
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Move-in date */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Intended move-in date</Text>
          <Pressable
            style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowDatePicker(true)}
          >
            <HabixaIcon name="calendar-alt" size={14} color={Colors.terracotta} />
            <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDate(moveInDate)}</Text>
            <HabixaIcon name="chevron-down" size={12} color={colors.muted} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={moveInDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setMoveInDate(date);
              }}
            />
          )}
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>How long do you plan to stay?</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => {
              const active = duration === d.value;
              return (
                <Pressable
                  key={d.value}
                  style={[
                    styles.durationChip,
                    { borderColor: active ? Colors.terracotta : colors.border },
                    active && { backgroundColor: Colors.terracotta },
                  ]}
                  onPress={() => setDuration(d.value)}
                >
                  <Text style={[styles.durationChipText, { color: active ? Colors.desertSand : colors.text }]}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Message to landlord</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>
            Introduce yourself. Tell them a little about you, why you're interested, and when you'd like to move in.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.templateScroll}
            contentContainerStyle={styles.templateRow}
          >
            {MESSAGE_TEMPLATES.map((tpl, i) => (
              <Pressable
                key={i}
                style={[styles.templateChip, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setMessage((prev) => (prev ? `${prev}\n\n${tpl.text}` : tpl.text))}
              >
                <Text style={[styles.templateChipText, { color: colors.textSecondary }]}>
                  {tpl.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            style={[styles.messageInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Hi, I'm interested in renting your property. I'm a..."
            placeholderTextColor={colors.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <View style={styles.charCountRow}>
            {message.trim().length < 20 && message.length > 0 && (
              <Text style={[styles.charHint, { color: Colors.terracotta }]}>
                Minimum 20 characters
              </Text>
            )}
            <Text style={[styles.charCount, { color: colors.muted }]}>
              {message.length}/1000
            </Text>
          </View>
        </View>

        {/* Note */}
        <View style={[styles.note, { borderColor: colors.border }]}>
          <HabixaIcon name="info-circle" size={12} color={colors.muted} />
          <Text style={[styles.noteText, { color: colors.muted }]}>
            The landlord will review your profile including your trust score and rental history before responding.
          </Text>
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting
            ? <ActivityIndicator color={Colors.desertSand} />
            : <><HabixaIcon name="paper-plane" size={16} color={Colors.desertSand} /><Text style={styles.submitBtnText}>Send application</Text></>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 0.5,
  },
  closeBtn: { padding: 6, width: 36 },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 18, textAlign: 'center' },
  scroll: { padding: 20, gap: 24 },

  listingCard: {
    borderRadius: 14, borderWidth: 0.5, padding: 14,
  },
  listingCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listingIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  listingAddress: { fontFamily: Fonts.heading, fontSize: 14, marginBottom: 4 },
  listingPrice: { fontFamily: Fonts.display, fontSize: 18 },

  section: { gap: 10 },
  sectionLabel: { fontFamily: Fonts.heading, fontSize: 13 },
  sectionHint: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, marginTop: -4 },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0.5, borderRadius: 12, padding: 14,
  },
  dateBtnText: { flex: 1, fontFamily: Fonts.heading, fontSize: 14 },

  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: {
    paddingVertical: 9, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 0.5,
  },
  durationChipText: { fontFamily: Fonts.heading, fontSize: 13 },

  templateScroll: { marginBottom: 8, marginHorizontal: -4 },
  templateRow: { gap: 8, paddingHorizontal: 4 },
  templateChip: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 0.5,
  },
  templateChipText: { fontFamily: Fonts.heading, fontSize: 12 },
  messageInput: {
    height: 140, borderWidth: 0.5, borderRadius: 12,
    padding: 14, fontFamily: Fonts.body, fontSize: 14, lineHeight: 22,
  },
  charCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charHint: { fontFamily: Fonts.body, fontSize: 11 },
  charCount: { fontFamily: Fonts.body, fontSize: 11 },

  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 0.5,
  },
  noteText: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, flex: 1 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.terracotta, paddingVertical: 16, borderRadius: 14,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.desertSand },
});
