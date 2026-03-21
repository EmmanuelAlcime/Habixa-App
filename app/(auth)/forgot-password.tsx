import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/context/ThemeContext';
import { HabixaLogo } from '@/components/HabixaLogo';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post(
        Endpoints.auth.forgotPassword(),
        { email: email.trim() },
        { skipAuth: true }
      );
      setSuccess(true);
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      setError(
        err?.errors?.email?.[0] ??
          err?.message ??
          'Unable to send reset link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScrollView
          contentContainerStyle={[
            styles.successContent,
            {
              paddingTop: insets.top + 80,
              paddingBottom: insets.bottom + 48,
              paddingHorizontal: 24,
            },
          ]}
        >
          <View
            style={[
              styles.successIcon,
              { backgroundColor: isDark ? 'rgba(92, 124, 111, 0.2)' : Colors.muted },
            ]}
          >
            <HabixaIcon name="check" size={40} color={Colors.terracotta} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Check your email
          </Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            If an account exists for {email.trim()}, you'll receive a link to
            reset your password. The link expires in 60 minutes.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.backBtn}>
              <Text style={styles.backBtnText}>Back to Sign In</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? Colors.midnightInk : colors.card,
            paddingTop: insets.top + 44,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <HabixaLogo width={32} height={34} variant={isDark ? 'dark' : 'light'} />
          <Text style={[styles.wordmark, { color: isDark ? Colors.desertSand : colors.text }]}>
            Habi<Text style={styles.wordmarkAccent}>xa</Text>
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: isDark ? Colors.sky : colors.textSecondary }]}>
          Reset your password
        </Text>
      </View>

      <ScrollView
        style={[styles.formBody, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.formContent,
          {
            paddingTop: 24,
            paddingBottom: insets.bottom + 48,
            flexGrow: 1,
            justifyContent: 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCenter}>
          <Text style={[styles.instructions, { color: colors.textSecondary }]}>
            Enter your email and we'll send you a link to reset your password.
          </Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <HabixaIcon name="envelope" size={13} color={colors.textSecondary} />
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>
          </View>
          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.btnPrimaryText}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </Text>
          </Pressable>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>
                Back to Sign In
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.desertSand,
  },
  wordmarkAccent: {
    color: Colors.terracotta,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.sky,
    letterSpacing: 1,
  },
  formBody: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 24,
  },
  formCenter: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  instructions: {
    fontSize: 14,
    fontFamily: Fonts.body,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 13,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 10,
    paddingVertical: 13,
    paddingLeft: 38,
    paddingRight: 14,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  errorWrap: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.terracotta,
  },
  btnPrimary: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnPrimaryText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.desertSand,
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 13,
  },
  successContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  backBtn: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.desertSand,
  },
});
