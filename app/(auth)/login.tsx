import { useState, useEffect, useRef } from 'react';
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
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaLogo } from '@/components/HabixaLogo';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useGoogleAuth, useFacebookAuth } from '@/lib/socialAuth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    promptAsync: promptGoogle,
    idToken: googleIdToken,
    isReady: googleReady,
    hasClientId: hasGoogleClientId,
  } = useGoogleAuth();

  const {
    promptAsync: promptFacebook,
    accessToken: fbAccessToken,
    isReady: fbReady,
    hasClientId: hasFbClientId,
  } = useFacebookAuth();

  const googleProcessed = useRef<string | null>(null);
  const fbProcessed = useRef<string | null>(null);

  useEffect(() => {
    if (!googleIdToken || googleProcessed.current === googleIdToken) return;
    googleProcessed.current = googleIdToken;
    setSocialLoading('google');
    setError(null);
    loginWithGoogle(googleIdToken)
      .then(() => router.replace('/(tabs)/(home)'))
      .catch((e) => {
        googleProcessed.current = null;
        const err = e as { message?: string; errors?: Record<string, string[]> };
        setError(err?.errors?.email?.[0] ?? err?.message ?? 'Google sign-in failed');
      })
      .finally(() => setSocialLoading(null));
  }, [googleIdToken, loginWithGoogle, router]);

  useEffect(() => {
    if (!fbAccessToken || fbProcessed.current === fbAccessToken) return;
    fbProcessed.current = fbAccessToken;
    setSocialLoading('facebook');
    setError(null);
    loginWithFacebook(fbAccessToken)
      .then(() => router.replace('/(tabs)/(home)'))
      .catch((e) => {
        fbProcessed.current = null;
        const err = e as { message?: string; errors?: Record<string, string[]> };
        setError(err?.errors?.email?.[0] ?? err?.message ?? 'Facebook sign-in failed');
      })
      .finally(() => setSocialLoading(null));
  }, [fbAccessToken, loginWithFacebook, router]);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/(home)');
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      setError(
        err?.errors?.email?.[0] ?? err?.message ?? 'Sign in failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
            backgroundColor: colors.background,
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
          Sign in to your account
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
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
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
                placeholder="Your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
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
          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable style={styles.forgot}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </Link>

          <Pressable
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.btnPrimaryText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            style={[
              styles.socialBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: socialLoading || !hasGoogleClientId ? 0.7 : 1,
              },
            ]}
            onPress={() => hasGoogleClientId && googleReady && promptGoogle()}
            disabled={!!socialLoading || !hasGoogleClientId || !googleReady}
          >
            <HabixaIcon name="google" size={16} color="#DB4437" />
            <Text style={[styles.socialBtnText, { color: colors.text }]}>
              {socialLoading === 'google' ? 'Signing in…' : 'Sign in with Google'}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.socialBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: socialLoading || !hasFbClientId ? 0.7 : 1,
              },
            ]}
            onPress={() => hasFbClientId && fbReady && promptFacebook()}
            disabled={!!socialLoading || !hasFbClientId || !fbReady}
          >
            <HabixaIcon name="facebook" size={16} color="#1877F2" />
            <Text style={[styles.socialBtnText, { color: colors.text }]}>
              {socialLoading === 'facebook' ? 'Signing in…' : 'Sign in with Facebook'}
            </Text>
          </Pressable>

          <Link href="/(auth)/register" asChild>
            <Pressable style={styles.signupLink}>
              <Text style={[styles.signupLinkText, { color: colors.textSecondary }]}>
                Don't have an account? <Text style={styles.signupLinkBold}>Sign up</Text>
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
  errorWrap: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.terracotta,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 12,
    color: Colors.terracotta,
  },
  btnPrimary: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnPrimaryText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.desertSand,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
  },
  dividerText: {
    fontSize: 11,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 10,
  },
  socialBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  signupLink: {
    marginTop: 8,
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: 12,
  },
  signupLinkBold: {
    fontFamily: Fonts.heading,
    color: Colors.terracotta,
  },
});
