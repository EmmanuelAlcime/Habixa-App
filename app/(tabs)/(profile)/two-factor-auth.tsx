import { useState } from 'react';
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

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { api, Endpoints } from '@/lib/api/client';

type TwoFactorType = 'sms' | 'email';

export default function TwoFactorAuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, refetch } = useProfile();

  const [selectedType, setSelectedType] = useState<TwoFactorType | null>(
    (profile?.two_factor_type as TwoFactorType) ?? null
  );
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'choose' | 'verify' | 'enabled'>(
    profile?.two_factor_enabled ? 'enabled' : 'choose'
  );
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const twoFactorEnabled = !!profile?.two_factor_enabled;
  const currentType = profile?.two_factor_type as TwoFactorType | undefined;
  const phoneVerified = !!profile?.phone_verified_at;
  const hasEmail = !!profile?.email;

  const handleSelectType = (type: TwoFactorType) => {
    if (type === 'sms' && !phoneVerified) {
      Alert.alert(
        'Phone required',
        'Please verify your phone number first in the Verification section before using SMS 2FA.'
      );
      return;
    }
    setSelectedType(type);
  };

  const handleSendCode = async () => {
    if (!selectedType) return;
    setSendingCode(true);
    try {
      await api.post(Endpoints.users.twoFaSendCode(), { type: selectedType });
      setStep('verify');
      setCode('');
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      const msg = err?.errors?.type?.[0] ?? err?.message ?? 'Failed to send code';
      Alert.alert('Error', msg);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!selectedType || !code.trim() || code.length !== 6) return;
    setVerifying(true);
    try {
      await api.post(Endpoints.users.twoFaConfirm(), {
        type: selectedType,
        code: code.trim(),
      });
      await refetch();
      setStep('enabled');
      Alert.alert('Enabled', 'Two-factor authentication is now enabled.');
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      const msg = err?.errors?.code?.[0] ?? err?.message ?? 'Invalid or expired code';
      Alert.alert('Error', msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = () => {
    Alert.alert(
      'Disable 2FA?',
      'Your account will be less secure. You can re-enable 2FA anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setDisabling(true);
            try {
              await api.post(Endpoints.users.twoFaDisable());
              await refetch();
              setStep('choose');
              setSelectedType(null);
              router.back();
            } catch (e) {
              const err = e as { message?: string };
              Alert.alert('Error', err?.message ?? 'Failed to disable 2FA');
            } finally {
              setDisabling(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeType = () => {
    setStep('choose');
    setSelectedType(null);
    setCode('');
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: Colors.terracotta }]}>
            ← Back
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          Two-Factor Authentication
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {twoFactorEnabled && step === 'enabled' ? (
          <View style={styles.section}>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardRow}>
                <HabixaIcon name="check-circle" size={24} color={Colors.sage} solid />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  2FA is enabled
                </Text>
              </View>
              <Text style={[styles.cardHint, { color: colors.textSecondary }]}>
                You'll receive a verification code via{' '}
                {currentType === 'sms' ? 'SMS' : 'email'} when signing in.
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.cardBtn, styles.cardBtnSecondary]}
                  onPress={handleChangeType}
                >
                  <Text style={[styles.cardBtnText, { color: Colors.terracotta }]}>
                    Change to {currentType === 'sms' ? 'Email' : 'SMS'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.cardBtn, styles.cardBtnDanger, disabling && styles.cardBtnDisabled]}
                  onPress={handleDisable}
                  disabled={disabling}
                >
                  {disabling ? (
                    <ActivityIndicator size="small" color={Colors.terracotta} />
                  ) : (
                    <Text style={[styles.cardBtnText, { color: Colors.terracotta }]}>
                      Disable 2FA
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        ) : step === 'verify' && selectedType ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Enter verification code
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardHint, { color: colors.textSecondary }]}>
                We sent a 6-digit code to your{' '}
                {selectedType === 'sms' ? 'phone' : 'email'}. Enter it below.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.cardBtn, styles.cardBtnSecondary]}
                  onPress={() => {
                    setStep('choose');
                    setSelectedType(null);
                  }}
                >
                  <Text style={[styles.cardBtnText, { color: Colors.terracotta }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.cardBtn,
                    (verifying || code.length !== 6) && styles.cardBtnDisabled,
                  ]}
                  onPress={handleVerifyCode}
                  disabled={verifying || code.length !== 6}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color={Colors.terracotta} />
                  ) : (
                    <Text style={styles.cardBtnText}>Verify</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Choose verification method
            </Text>
            <Text style={[styles.cardHint, { color: colors.textSecondary, marginBottom: 16 }]}>
              You'll receive a code when signing in to verify it's you.
            </Text>

            <Pressable
              style={[
                styles.typeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: selectedType === 'sms' ? Colors.terracotta : colors.border,
                  borderWidth: selectedType === 'sms' ? 2 : 0.5,
                },
              ]}
              onPress={() => handleSelectType('sms')}
            >
              <View style={[styles.typeIconWrap, { backgroundColor: Colors.sand2 }]}>
                <HabixaIcon name="mobile-alt" size={22} color={Colors.sage} solid />
              </View>
              <View style={styles.typeContent}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>SMS</Text>
                <Text style={[styles.typeSubtitle, { color: colors.textSecondary }]}>
                  {phoneVerified
                    ? `Receive codes at ${profile?.phone ?? 'your phone'}`
                    : 'Verify your phone in Verification first'}
                </Text>
              </View>
              {selectedType === 'sms' && (
                <HabixaIcon name="check-circle" size={20} color={Colors.sage} solid />
              )}
            </Pressable>

            <Pressable
              style={[
                styles.typeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: selectedType === 'email' ? Colors.terracotta : colors.border,
                  borderWidth: selectedType === 'email' ? 2 : 0.5,
                },
              ]}
              onPress={() => handleSelectType('email')}
            >
              <View style={[styles.typeIconWrap, { backgroundColor: Colors.sand2 }]}>
                <HabixaIcon name="envelope" size={22} color={Colors.sage} solid />
              </View>
              <View style={styles.typeContent}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>Email</Text>
                <Text style={[styles.typeSubtitle, { color: colors.textSecondary }]}>
                  {hasEmail
                    ? `Receive codes at ${profile?.email ?? 'your email'}`
                    : 'Receive codes at your account email'}
                </Text>
              </View>
              {selectedType === 'email' && (
                <HabixaIcon name="check-circle" size={20} color={Colors.sage} solid />
              )}
            </Pressable>

            {selectedType && (
              <Pressable
                style={[
                  styles.cardBtn,
                  styles.cardBtnPrimary,
                  sendingCode && styles.cardBtnDisabled,
                ]}
                onPress={handleSendCode}
                disabled={sendingCode || (selectedType === 'sms' && !phoneVerified)}
              >
                {sendingCode ? (
                  <ActivityIndicator size="small" color={Colors.desertSand} />
                ) : (
                  <Text style={[styles.cardBtnText, { color: Colors.desertSand }]}>
                    Send verification code
                  </Text>
                )}
              </Pressable>
            )}
          </View>
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
    padding: 20,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  cardHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 0.5,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.terracotta,
    borderRadius: 10,
  },
  cardBtnPrimary: {
    backgroundColor: Colors.terracotta,
    marginTop: 16,
  },
  cardBtnSecondary: {
    backgroundColor: 'transparent',
  },
  cardBtnDanger: {
    borderColor: Colors.terracotta,
    backgroundColor: 'transparent',
  },
  cardBtnDisabled: {
    opacity: 0.6,
  },
  cardBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.terracotta,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  typeSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
