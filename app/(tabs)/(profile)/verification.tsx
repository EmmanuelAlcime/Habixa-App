import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { PhoneInput, isValidPhoneForSubmit } from '@/components/PhoneInput';
import { Colors, Fonts } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { api, Endpoints } from '@/lib/api/client';

const PERSONA_TEMPLATE_ID = process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID ?? '';

export default function VerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, refetch } = useProfile();

  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [code, setCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'sent' | 'verified'>('idle');

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone ?? '');
      setPhoneStep(profile.phone_verified_at ? 'verified' : 'idle');
    }
  }, [profile?.phone, profile?.phone_verified_at]);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [startingPersona, setStartingPersona] = useState(false);

  const emailVerified = !!profile?.email_verified_at;
  const phoneVerified = !!profile?.phone_verified_at;
  const idSubmitted = !!profile?.id_document_path;
  const identityVerified = !!profile?.id_verified_at;

  const handleResendEmail = async () => {
    if (!profile?.email) return;
    setResendingEmail(true);
    try {
      await api.post(
        Endpoints.auth.resendVerificationEmail(),
        { email: profile.email },
        { skipAuth: true }
      );
      Alert.alert('Sent', 'Check your email for the verification link.');
      await refetch();
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Failed to send verification email');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSendCode = async () => {
    if (!phone.trim()) return;
    setSendingCode(true);
    try {
      await api.post(Endpoints.users.verifyPhone(), { phone: phone.trim() });
      setPhoneStep('sent');
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Failed to send code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!phone.trim() || !code.trim()) return;
    setVerifyingCode(true);
    try {
      await api.post(Endpoints.users.verifyPhoneConfirm(), {
        phone: phone.trim(),
        code: code.trim(),
      });
      setPhoneStep('verified');
      await refetch();
      Alert.alert('Verified', 'Your phone number has been verified.');
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Invalid or expired code');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleVerifyWithPersona = async () => {
    if (!PERSONA_TEMPLATE_ID.trim()) {
      Alert.alert(
        'Not configured',
        'Persona identity verification is not configured. Add EXPO_PUBLIC_PERSONA_TEMPLATE_ID to your .env file.'
      );
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not available',
        'Persona identity verification is only available in the iOS or Android app.'
      );
      return;
    }
    setStartingPersona(true);
    try {
      const { Environment, Inquiry } = await import('react-native-persona');
      const env =
        process.env.EXPO_PUBLIC_PERSONA_ENVIRONMENT === 'production'
          ? Environment.PRODUCTION
          : Environment.SANDBOX;
      Inquiry.fromTemplate(PERSONA_TEMPLATE_ID)
        .environment(env)
        .onComplete(async (inquiryId, status) => {
          setStartingPersona(false);
          if (status === 'approved') {
            try {
              await api.post(Endpoints.users.verifyPersonaComplete(), {
                inquiry_id: inquiryId,
              });
              await refetch();
              Alert.alert('Verified', 'Your identity has been verified successfully.');
            } catch (e) {
              const err = e as { message?: string };
              Alert.alert('Error', err?.message ?? 'Could not complete verification.');
            }
          }
        })
        .onCanceled(() => {
          setStartingPersona(false);
        })
        .onError((error) => {
          setStartingPersona(false);
          Alert.alert('Error', error?.message ?? 'Something went wrong with identity verification.');
        })
        .build()
        .start();
    } catch (e) {
      setStartingPersona(false);
      const err = e as { message?: string };
      Alert.alert(
        'Not available',
        err?.message?.includes('requireNativeComponent')
          ? 'Persona requires a development build. Run "npx expo run:ios" or "npx expo run:android" instead of Expo Go.'
          : err?.message ?? 'Identity verification is not available in this environment.'
      );
    }
  };

  const handleUploadId = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploadingId(true);
      const formData = new FormData();
      formData.append('id_document', {
        uri: file.uri,
        type: file.mimeType ?? 'image/jpeg',
        name: file.name,
      } as unknown as Blob);
      await api.postFormData(Endpoints.users.verifyId(), formData);
      await refetch();
      Alert.alert('Submitted', 'Your ID document has been submitted for verification.');
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Failed to upload document');
    } finally {
      setUploadingId(false);
    }
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
        <Text style={[styles.title, { color: colors.text }]}>Verification</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Email */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            EMAIL
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardRow}>
              <HabixaIcon
                name={emailVerified ? 'check-circle' : 'envelope'}
                size={20}
                color={emailVerified ? Colors.sage : Colors.muted}
                solid
              />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {emailVerified ? 'Email verified' : 'Verify your email'}
              </Text>
            </View>
            {!emailVerified && (
              <Pressable
                style={[styles.cardBtn, resendingEmail && styles.cardBtnDisabled]}
                onPress={handleResendEmail}
                disabled={resendingEmail}
              >
                {resendingEmail ? (
                  <ActivityIndicator size="small" color={Colors.terracotta} />
                ) : (
                  <Text style={styles.cardBtnText}>Resend verification email</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Phone */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            PHONE
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {phoneVerified ? (
              <View style={styles.cardRow}>
                <HabixaIcon name="check-circle" size={20} color={Colors.sage} solid />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Phone verified
                </Text>
              </View>
            ) : (
              <>
                {phoneStep === 'idle' && (
                  <PhoneInput
                    value={phone}
                    onChange={(p) => setPhone(p)}
                  />
                )}
                {phoneStep === 'idle' && (
                  <Pressable
                    style={[styles.cardBtn, (sendingCode || !isValidPhoneForSubmit(phone)) && styles.cardBtnDisabled]}
                    onPress={handleSendCode}
                    disabled={sendingCode || !isValidPhoneForSubmit(phone)}
                  >
                    {sendingCode ? (
                      <ActivityIndicator size="small" color={Colors.terracotta} />
                    ) : (
                      <Text style={styles.cardBtnText}>Send code</Text>
                    )}
                  </Pressable>
                )}
                {phoneStep === 'sent' && (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor={colors.textSecondary}
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <Pressable
                      style={[
                        styles.cardBtn,
                        (verifyingCode || code.length !== 6) && styles.cardBtnDisabled,
                      ]}
                      onPress={handleVerifyCode}
                      disabled={verifyingCode || code.length !== 6}
                    >
                      {verifyingCode ? (
                        <ActivityIndicator size="small" color={Colors.terracotta} />
                      ) : (
                        <Text style={styles.cardBtnText}>Verify</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>
        </View>

        {/* Identity (Persona) */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            IDENTITY
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardRow}>
              <HabixaIcon
                name={identityVerified ? 'check-circle' : 'fingerprint'}
                size={20}
                color={identityVerified ? Colors.sage : Colors.muted}
                solid
              />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {identityVerified
                  ? 'Identity verified'
                  : 'Verify your identity with Persona'}
              </Text>
            </View>
            {!identityVerified && (
              <>
                <Text style={[styles.cardHint, { color: colors.textSecondary }]}>
                  Securely verify your identity using government-issued ID through Persona.
                </Text>
                <Pressable
                  style={[styles.cardBtn, startingPersona && styles.cardBtnDisabled]}
                  onPress={handleVerifyWithPersona}
                  disabled={startingPersona}
                >
                  {startingPersona ? (
                    <ActivityIndicator size="small" color={Colors.terracotta} />
                  ) : (
                    <Text style={styles.cardBtnText}>Verify with Persona</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* ID */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            ID DOCUMENT (ALTERNATIVE)
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardRow}>
              <HabixaIcon
                name={idSubmitted ? 'file-check' : 'id-card'}
                size={20}
                color={idSubmitted ? Colors.sage : Colors.muted}
                solid
              />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {idSubmitted ? 'ID submitted' : 'Upload ID document'}
              </Text>
            </View>
            {!idSubmitted && (
              <Pressable
                style={[styles.cardBtn, uploadingId && styles.cardBtnDisabled]}
                onPress={handleUploadId}
                disabled={uploadingId}
              >
                {uploadingId ? (
                  <ActivityIndicator size="small" color={Colors.terracotta} />
                ) : (
                  <Text style={styles.cardBtnText}>Choose file (PDF, JPG, PNG)</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  cardHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 0.5,
    marginTop: 12,
  },
  cardBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.terracotta,
    borderRadius: 10,
  },
  cardBtnDisabled: {
    opacity: 0.6,
  },
  cardBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.terracotta,
  },
});
