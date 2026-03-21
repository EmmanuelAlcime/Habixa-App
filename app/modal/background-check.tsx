/**
 * Background Check / Identity Verification modal — FREE Persona KYC flow.
 * Identity verification is free on Habixa to maximize verified users and platform credibility.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isRunningInExpoGo } from 'expo';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

const PERSONA_TEMPLATE_ID = process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID ?? '';

type Step = 'info' | 'identity' | 'processing' | 'success' | 'error';

const FEATURES = [
  { icon: 'id-card', text: 'Government ID verification via Persona' },
  { icon: 'shield-alt', text: 'Verified badge on your profile' },
  { icon: 'heart', text: 'Build trust with landlords — free on Habixa' },
];

export default function BackgroundCheckModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { tenantId } = useLocalSearchParams<{ tenantId?: string }>();
  const [step, setStep] = useState<Step>('info');
  const [errorMsg, setErrorMsg] = useState('');

  function startPersona() {
    if (!PERSONA_TEMPLATE_ID.trim()) {
      if (__DEV__) {
        setStep('processing');
        setTimeout(() => setStep('success'), 2000);
        return;
      }
      setErrorMsg('Identity verification is not configured.');
      setStep('error');
      return;
    }

    if (isRunningInExpoGo()) {
      if (__DEV__) {
        setStep('processing');
        setTimeout(() => setStep('success'), 2000);
        return;
      }
      setErrorMsg('Identity verification requires a development build. Use "npx expo run:ios" or EAS Build.');
      setStep('error');
      return;
    }

    setStep('identity');
    try {
      const { Environment, Inquiry } = require('react-native-persona');
      const env =
        process.env.EXPO_PUBLIC_PERSONA_ENVIRONMENT === 'production'
          ? Environment.PRODUCTION
          : Environment.SANDBOX;
      Inquiry.fromTemplate(PERSONA_TEMPLATE_ID)
        .environment(env)
        .onComplete(async (inquiryId: string, status: string) => {
          if (status === 'approved') {
            setStep('processing');
            try {
              await api.post(Endpoints.users.verifyPersonaComplete(), {
                inquiry_id: inquiryId,
              });
              setStep('success');
            } catch (e) {
              const err = e as { message?: string };
              setErrorMsg(err?.message ?? 'Could not complete verification.');
              setStep('error');
            }
          } else {
            setErrorMsg('Identity verification could not be completed.');
            setStep('error');
          }
        })
        .onCanceled(() => {
          router.back();
        })
        .onError((error: { message?: string }) => {
          setErrorMsg(error?.message ?? 'Something went wrong with identity verification.');
          setStep('error');
        })
        .build()
        .start();
    } catch (e) {
      setErrorMsg('Identity verification is not available. Use a development build.');
      setStep('error');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <HabixaIcon name="times" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Verify Identity</Text>
        <View style={{ width: 30 }} />
      </View>

      {step === 'info' && (
        <View style={styles.content}>
          <View style={[styles.freeBadge, { backgroundColor: 'rgba(92,124,111,0.15)', borderColor: Colors.sage }]}>
            <HabixaIcon name="check-circle" size={20} color={Colors.sage} solid />
            <Text style={[styles.freeBadgeText, { color: Colors.sage }]}>Free on Habixa</Text>
          </View>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>What you get</Text>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <HabixaIcon name={f.icon} size={13} color={Colors.sage} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
            </View>
          ))}
          <Text style={[styles.disclaimer, { color: Colors.muted }]}>
            More verified users build trust for everyone. Identity verification is free to encourage adoption.
          </Text>
          <Pressable style={styles.startBtn} onPress={startPersona}>
            <Text style={styles.startBtnText}>Verify with Persona</Text>
          </Pressable>
        </View>
      )}

      {(step === 'identity' || step === 'processing') && (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
          <Text style={[styles.statusText, { color: Colors.muted }]}>
            {step === 'identity' ? 'Starting verification…' : 'Completing verification…'}
          </Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.centred}>
          <View style={styles.successIcon}>
            <HabixaIcon name="check-circle" size={36} color={Colors.sage} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Identity verified</Text>
          <Text style={[styles.successDesc, { color: Colors.muted }]}>
            Your identity has been verified. You'll have a verified badge on your profile.
          </Text>
          <Pressable style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      )}

      {step === 'error' && (
        <View style={styles.centred}>
          <HabixaIcon name="exclamation-triangle" size={36} color={Colors.terracotta} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Something went wrong</Text>
          <Text style={[styles.errorDesc, { color: Colors.muted }]}>{errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={() => setStep('info')}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  closeBtn: { padding: 6 },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 18, textAlign: 'center' },
  content: { padding: 20, gap: 16 },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  freeBadgeText: { fontFamily: Fonts.heading, fontSize: 15 },
  featuresTitle: { fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(92,124,111,0.1)', alignItems: 'center', justifyContent: 'center' },
  featureText: { fontFamily: Fonts.body, fontSize: 14, flex: 1 },
  disclaimer: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18 },
  startBtn: { backgroundColor: Colors.terracotta, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  startBtnText: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.desertSand },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  statusText: { fontFamily: Fonts.body, fontSize: 14 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(92,124,111,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.sage },
  successTitle: { fontFamily: Fonts.display, fontSize: 22, textAlign: 'center' },
  successDesc: { fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  doneBtn: { backgroundColor: Colors.terracotta, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30 },
  doneBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.desertSand },
  errorTitle: { fontFamily: Fonts.display, fontSize: 22, textAlign: 'center' },
  errorDesc: { fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  retryBtn: { borderWidth: 1, borderColor: Colors.terracotta, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30 },
  retryBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.terracotta },
});
