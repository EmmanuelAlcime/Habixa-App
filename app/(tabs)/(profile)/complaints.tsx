import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

interface Complaint {
  id: number;
  complainant_id: number;
  respondent_id: number;
  subject: string;
  description: string;
  status: string;
  respondent_response?: string | null;
  responded_at?: string | null;
  created_at: string;
  respondent?: { id: number; name: string };
  lease?: { id: number } | null;
  listing?: { id: number } | null;
}

interface ApiComplaintsResponse {
  data?: Complaint[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ComplaintsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Complaint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formRespondentId, setFormRespondentId] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiComplaintsResponse | Complaint[]>(
        Endpoints.complaints.index()
      );
      const data = Array.isArray(res) ? res : (res as ApiComplaintsResponse)?.data ?? [];
      setComplaints((data as Complaint[]) ?? []);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load complaints');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const fetchDetail = async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const c = await api.get<Complaint>(Endpoints.complaints.show(String(id)));
      setDetail(c);
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Failed to load complaint');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async () => {
    const respondentId = parseInt(formRespondentId, 10);
    if (!respondentId || !formSubject.trim() || !formDescription.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setFormSubmitting(true);
    try {
      await api.post(Endpoints.complaints.store(), {
        respondent_id: respondentId,
        subject: formSubject.trim(),
        description: formDescription.trim(),
      });
      setShowForm(false);
      setFormRespondentId('');
      setFormSubject('');
      setFormDescription('');
      await fetchComplaints();
      Alert.alert('Success', 'Complaint filed successfully.');
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      const msg =
        err?.errors?.respondent_id?.[0] ??
        err?.errors?.subject?.[0] ??
        err?.errors?.description?.[0] ??
        err?.message ??
        'Failed to file complaint';
      Alert.alert('Error', msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

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
        <Text style={[styles.title, { color: colors.text }]}>Complaints</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => setShowForm(true)}
        >
          <HabixaIcon name="plus" size={18} color={Colors.terracotta} solid />
          <Text style={styles.addBtnText}>File</Text>
        </Pressable>
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
      ) : complaints.length === 0 ? (
        <View style={styles.emptyWrap}>
          <HabixaIcon name="exclamation-triangle" size={48} color={Colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No complaints filed
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            File a complaint if you have an issue with a landlord or tenant
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.emptyBtnText}>File a complaint</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {complaints.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.complaintRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => fetchDetail(item.id)}
            >
              <View style={styles.complaintLeft}>
                <Text style={[styles.complaintSubject, { color: colors.text }]}>
                  {item.subject}
                </Text>
                <Text style={[styles.complaintMeta, { color: colors.textSecondary }]}>
                  Against: {item.respondent?.name ?? `User #${item.respondent_id}`} ·{' '}
                  {formatDate(item.created_at)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  item.status === 'responded'
                    ? styles.statusResponded
                    : styles.statusPending,
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              <HabixaIcon name="chevron-right" size={12} color={Colors.muted} solid />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Create form modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                File a complaint
              </Text>
              <Pressable onPress={() => setShowForm(false)}>
                <Text style={[styles.modalClose, { color: Colors.terracotta }]}>Cancel</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                Respondent user ID (required)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. 5"
                placeholderTextColor={colors.textSecondary}
                value={formRespondentId}
                onChangeText={setFormRespondentId}
                keyboardType="number-pad"
              />
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                Subject
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Brief subject"
                placeholderTextColor={colors.textSecondary}
                value={formSubject}
                onChangeText={setFormSubject}
              />
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.formTextArea,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Describe the issue..."
                placeholderTextColor={colors.textSecondary}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={4}
              />
              <Pressable
                style={[styles.formSubmit, formSubmitting && styles.formSubmitDisabled]}
                onPress={handleSubmit}
                disabled={formSubmitting}
              >
                {formSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.desertSand} />
                ) : (
                  <Text style={styles.formSubmitText}>Submit complaint</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail modal */}
      <Modal visible={!!selectedId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Complaint details
              </Text>
              <Pressable onPress={closeDetail}>
                <Text style={[styles.modalClose, { color: Colors.terracotta }]}>Close</Text>
              </Pressable>
            </View>
            {detailLoading ? (
              <View style={styles.detailLoading}>
                <ActivityIndicator size="large" color={Colors.terracotta} />
              </View>
            ) : detail ? (
              <ScrollView style={styles.modalScroll}>
                <Text style={[styles.detailSubject, { color: colors.text }]}>
                  {detail.subject}
                </Text>
                <Text style={[styles.detailMeta, { color: colors.textSecondary }]}>
                  Against: {detail.respondent?.name ?? `User #${detail.respondent_id}`} ·{' '}
                  {formatDate(detail.created_at)} · {detail.status}
                </Text>
                <Text style={[styles.detailDescription, { color: colors.text }]}>
                  {detail.description}
                </Text>
                {detail.respondent_response ? (
                  <>
                    <Text style={[styles.detailResponseLabel, { color: colors.textSecondary }]}>
                      Response
                    </Text>
                    <Text style={[styles.detailResponse, { color: colors.text }]}>
                      {detail.respondent_response}
                    </Text>
                  </>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
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
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.terracotta,
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
  emptyBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.terracotta,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.desertSand,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 12,
  },
  complaintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: 12,
  },
  complaintLeft: {
    flex: 1,
    minWidth: 0,
  },
  complaintSubject: {
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
  complaintMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: 'rgba(194,103,58,0.2)',
  },
  statusResponded: {
    backgroundColor: 'rgba(92,124,111,0.2)',
  },
  statusText: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    color: Colors.sage,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(137,180,200,0.2)',
  },
  modalTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  modalClose: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    marginBottom: 8,
  },
  formInput: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  formTextArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  formSubmit: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  formSubmitDisabled: {
    opacity: 0.6,
  },
  formSubmitText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.desertSand,
  },
  detailLoading: {
    padding: 40,
    alignItems: 'center',
  },
  detailSubject: {
    fontFamily: Fonts.display,
    fontSize: 20,
  },
  detailMeta: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 16,
  },
  detailDescription: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  detailResponseLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 1,
  },
  detailResponse: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
});
