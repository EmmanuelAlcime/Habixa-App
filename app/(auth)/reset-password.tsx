import { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

import { useTheme } from '@/context/ThemeContext';
import { HabixaLogo } from '@/components/HabixaLogo';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const { colors, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = (params.token ?? '') as string;
    const e = (params.email ?? '') as string;
    if (t) setToken(t);
    if (e) setEmail(decodeURIComponent(e));
  }, [params.token, params.email]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
      const parsed = Linking.parse(event.url);
      const q = parsed.queryParams ?? {};
      if (q.token) setToken(String(q.token));
      if (q.email) setEmail(decodeURIComponent(String(q.email)));
    });
    return () => sub.remove();
  }, []);

  const handleSubmit = async () => {
    if (!token.trim() || !email.trim()) {
      setError('Reset link is invalid or expired. Request a new one.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(
        Endpoints.auth.resetPassword(),
        {
          token: token.trim(),
          email: email.trim(),
          password,
          password_confirmation: passwordConfirmation,
        },
        { skipAuth: true }
      );
      setSuccess(true);
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      setError(
        err?.errors?.password?.[0] ??
          err?.errors?.email?.[0] ??
          err?.message ??
          'Unable to reset password. The link may have expired.'
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
            Password reset
          </Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            Your password has been updated. You can now sign in with your new
            password.
          </Text>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.backBtnText}>Sign In</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  const hasValidParams = token.trim() && email.trim();

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
          Set new password
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
          {!hasValidParams ? (
            <>
              <Text style={[styles.instructions, { color: colors.textSecondary }]}>
                Open the password reset link from your email to set a new
                password. If the link expired, request a new one.
              </Text>
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Request New Link</Text>
                </Pressable>
              </Link>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
                <View style={[styles.emailDisplay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.emailText, { color: colors.textSecondary }]}>{email}</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
                <View style={styles.inputWrap}>
                  <View style={styles.inputIcon}>
                    <HabixaIcon name="lock" size={13} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputWithToggle,
                      {
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setError(null);
                    }}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    editable={!loading}
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword((p) => !p)}
                    hitSlop={8}
                  >
                    <HabixaIcon
                      name={showPassword ? 'eye-slash' : 'eye'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
                <View style={styles.inputWrap}>
                  <View style={styles.inputIcon}>
                    <HabixaIcon name="lock" size={13} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputWithToggle,
                      {
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textSecondary}
                    value={passwordConfirmation}
                    onChangeText={(t) => {
                      setPasswordConfirmation(t);
                      setError(null);
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    editable={!loading}
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setShowConfirmPassword((p) => !p)}
                    hitSlop={8}
                  >
                    <HabixaIcon
                      name={showConfirmPassword ? 'eye-slash' : 'eye'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </Pressable>
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
                  {loading ? 'Resetting…' : 'Reset Password'}
                </Text>
              </Pressable>
            </>
          )}
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
  inputWithToggle: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 4,
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
  emailDisplay: {
    borderWidth: 0.5,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  emailText: {
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
