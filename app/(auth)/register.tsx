import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  startReadSMS,
  stopReadSMS,
  requestReadSMSPermission,
} from '@maniac-tech/react-native-expo-read-sms';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaLogo } from '@/components/HabixaLogo';
import { HabixaIcon } from '@/components/HabixaIcon';
import { PhoneInput, isValidPhoneForSubmit } from '@/components/PhoneInput';
import { LocationForm, type LocationValue } from '@/components/LocationForm';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';
import { getRegionName } from '@/lib/countryAddressData';
import { parsePhoneNumber } from 'libphonenumber-js';

/** Map raw API/backend errors to user-friendly messages */
function toFriendlyError(raw: string | undefined): string {
  if (!raw) return 'Something went wrong. Please try again.';
  const lower = raw.toLowerCase();
  if (lower.includes('mailgun') || lower.includes('sandbox') || lower.includes('domain') && lower.includes('not allowed') || lower.includes('code 403')) {
    return 'We couldn\'t send the verification email right now. Please try again in a few minutes.';
  }
  if (lower.includes('already registered') || lower.includes('email has already been taken') || lower.includes('already been taken')) {
    return 'This email is already registered. Try signing in instead.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection') || lower.includes('failed to fetch')) {
    return 'Connection failed. Check your internet and try again.';
  }
  if (lower.includes('password') && (lower.includes('validation') || lower.includes('required'))) {
    return 'Please check your password and try again.';
  }
  if (lower.includes('phone') && (lower.includes('validation') || lower.includes('invalid'))) {
    return 'Please check your phone number and try again.';
  }
  // Keep short, known validation messages; otherwise use generic
  if (raw.length > 80) return 'Something went wrong. Please try again.';
  return raw;
}

function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  try {
    const p = parsePhoneNumber(phone);
    return p ? p.formatInternational() : phone;
  } catch {
    return phone;
  }
}

const STEPS = 6;

type AccountType = 'tenant' | 'list_land' | 'list_house' | 'both';
type Gender = 'male' | 'female' | 'prefer_not_to_say';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('US');
  const [location, setLocation] = useState<LocationValue>({
    city: '',
    region: '',
    postalCode: '',
    country: '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);
  const [code, setCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const otpInputRef = useRef<TextInput>(null);

  // Android: when OTP step is shown, request SMS permission and listen for incoming OTP
  useEffect(() => {
    if (Platform.OS !== 'android' || !needsPhoneVerification) return;
    const initSmsListener = async () => {
      const granted = await requestReadSMSPermission();
      if (!granted) return;
      if (phoneStep !== 'sent') return;
      startReadSMS((status: string, sms: string, _error: unknown) => {
        if (status === 'success' && sms) {
          const match = String(sms).match(/\b(\d{6})\b/);
          if (match?.[1]) setCode(match[1]);
        }
      });
    };
    initSmsListener();
    return () => stopReadSMS();
  }, [needsPhoneVerification, phoneStep]);

  // Auto-verify when OTP reaches 6 digits (SMS autofill or manual entry)
  useEffect(() => {
    const digits = code.replace(/\D/g, '').slice(0, 6);
    if (digits.length === 6 && phoneStep === 'sent' && !verifyingCode && phone.trim()) {
      const t = setTimeout(() => handleVerifyCode(digits), 150);
      return () => clearTimeout(t);
    }
  }, [code, phoneStep, verifyingCode, phone]);

  const canNextStep1 =
    name.trim().length >= 2 && email.trim().includes('@') && isValidPhoneForSubmit(phone);
  const canNextStep2 =
    location.city.trim().length >= 2 && location.country.length === 2;
  const canNextStep3 = dateOfBirth !== null && gender !== null;
  const canNextStep4 =
    password.length >= 6 && password === confirmPassword;
  const canNextStep5 = accountType !== null;

  const handleNext = () => {
    if (step < STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleRegister = async () => {
    if (!accountType || !isValidPhoneForSubmit(phone) || !dateOfBirth || !gender) return;
    setLoading(true);
    setError(null);
    try {
      await register(
        name.trim(),
        email.trim(),
        password,
        accountType,
        phone.trim(),
        {
          city: location.city.trim(),
          region: location.region.trim() || undefined,
          postalCode: location.postalCode.trim() || undefined,
          country: location.country,
        },
        {
          dateOfBirth: format(dateOfBirth, 'yyyy-MM-dd'),
          gender,
        }
      );
      setNeedsPhoneVerification(true);
      setPhoneStep('idle');
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      const raw =
        err?.errors?.email?.[0] ??
        err?.errors?.password?.[0] ??
        err?.errors?.phone?.[0] ??
        err?.errors?.date_of_birth?.[0] ??
        err?.errors?.gender?.[0] ??
        err?.message ??
        'Registration failed. Please try again.';
      setError(toFriendlyError(raw));
    } finally {
      setLoading(false);
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

  const handleVerifyCode = async (codeOverride?: string) => {
    const codeToUse = (codeOverride ?? code).trim();
    if (!phone.trim() || !codeToUse) return;
    setVerifyingCode(true);
    try {
      await api.post(Endpoints.users.verifyPhoneConfirm(), {
        phone: phone.trim(),
        code: codeToUse,
      });
      setPhoneStep('verified');
      router.replace('/(tabs)/(home)');
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('Error', err?.message ?? 'Invalid or expired code');
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <HabixaLogo width={48} height={50} variant={isDark ? 'dark' : 'light'} />
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            The rental platform that works both ways
          </Text>

          {/* Phone verification step (after account created) */}
          {needsPhoneVerification ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.stepContent}
            >
              <Text style={[styles.title, { color: colors.text }]}>Verify your phone</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                We sent a code to {formatPhoneForDisplay(phone)}. Enter it below to complete signup.
              </Text>

              {phoneStep === 'idle' ? (
                <Pressable
                  style={[styles.nextBtn, sendingCode && styles.nextBtnDisabled]}
                  onPress={handleSendCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? (
                    <ActivityIndicator size="small" color={Colors.desertSand} />
                  ) : (
                    <Text style={styles.nextBtnText}>Send verification code</Text>
                  )}
                </Pressable>
              ) : phoneStep === 'sent' ? (
                <>
                  <TextInput
                    ref={otpInputRef}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={colors.textSecondary}
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    autoComplete="sms-otp"
                    textContentType="oneTimeCode"
                  />
                  <Pressable
                    style={[styles.nextBtn, (verifyingCode || !code.trim()) && styles.nextBtnDisabled]}
                    onPress={() => handleVerifyCode()}
                    disabled={verifyingCode || !code.trim()}
                  >
                    {verifyingCode ? (
                      <ActivityIndicator size="small" color={Colors.desertSand} />
                    ) : (
                      <Text style={styles.nextBtnText}>Verify & continue</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.backBtn}
                    onPress={handleSendCode}
                    disabled={sendingCode}
                  >
                    <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>
                      Resend code
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </Animated.View>
          ) : (
            <>
          {/* Progress */}
          <View style={styles.progress}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  { backgroundColor: isDark ? 'rgba(137, 180, 200, 0.3)' : Colors.muted },
                  i + 1 <= step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
            Step {step} of {STEPS}
          </Text>

          {/* Step 1: Basic info */}
          {step === 1 && (
            <Animated.View
              key="step1"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.stepContent}
            >
              <Text style={[styles.title, { color: colors.text }]}>Tell us about you</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your name, email and phone</Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Full name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
              />
              <TextInput
                ref={emailInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (canNextStep1) {
                    Keyboard.dismiss();
                    handleNext();
                  }
                }}
              />
              <PhoneInput
                value={phone}
                onChange={(p, cc) => {
                  setPhone(p);
                  setPhoneCountry(cc);
                }}
                defaultCountry={phoneCountry}
              />
            </Animated.View>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.stepContent}
            >
              <Text style={[styles.title, { color: colors.text }]}>Where are you located?</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                We use this to improve your search results
              </Text>
              <LocationForm value={location} onChange={setLocation} />
            </Animated.View>
          )}

          {/* Step 3: Age & Gender */}
          {step === 3 && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.stepContent}
            >
              <Text style={[styles.title, { color: colors.text }]}>A bit more about you</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                This helps landlords see applicant details when reviewing applications
              </Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Date of birth</Text>
              <Pressable
                style={[
                  styles.input,
                  styles.datePickerInput,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.inputText, { color: dateOfBirth ? colors.text : colors.textSecondary }]}>
                  {dateOfBirth ? format(dateOfBirth, 'MMMM d, yyyy') : 'Select your date of birth'}
                </Text>
                <HabixaIcon name="calendar-alt" size={18} color={colors.textSecondary} />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setDateOfBirth(selectedDate);
                  }}
                />
              )}

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Gender</Text>
              <Pressable
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.card,
                    borderColor: gender === 'male' ? Colors.terracotta : colors.border,
                  },
                  gender === 'male' && styles.optionActive,
                ]}
                onPress={() => setGender('male')}
              >
                <Text style={[
                  styles.optionText,
                  { color: colors.text },
                  gender === 'male' && styles.optionTextActive,
                ]}>
                  Male
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.card,
                    borderColor: gender === 'female' ? Colors.terracotta : colors.border,
                  },
                  gender === 'female' && styles.optionActive,
                ]}
                onPress={() => setGender('female')}
              >
                <Text style={[
                  styles.optionText,
                  { color: colors.text },
                  gender === 'female' && styles.optionTextActive,
                ]}>
                  Female
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.card,
                    borderColor: gender === 'prefer_not_to_say' ? Colors.terracotta : colors.border,
                  },
                  gender === 'prefer_not_to_say' && styles.optionActive,
                ]}
                onPress={() => setGender('prefer_not_to_say')}
              >
                <Text style={[
                  styles.optionText,
                  { color: colors.text },
                  gender === 'prefer_not_to_say' && styles.optionTextActive,
                ]}>
                  I&apos;d rather not say
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Step 4: Password */}
          {step === 4 && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.stepContent}
            >
              <Text style={[styles.title, { color: colors.text }]}>Create a password</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>At least 6 characters</Text>

              <View style={styles.passwordInputWrap}>
                <TextInput
                  ref={passwordInputRef}
                  style={[
                    styles.input,
                    styles.inputWithToggle,
                    { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
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
              <View style={styles.passwordInputWrap}>
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={[
                    styles.input,
                    styles.inputWithToggle,
                    { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password"
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (canNextStep4) {
                    Keyboard.dismiss();
                    handleNext();
                  }
                }}
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
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.error}>Passwords don&apos;t match</Text>
              )}
            </Animated.View>
          )}

          {/* Step 5: Account type */}
          {step === 5 && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.stepContent}
            >
              <Text style={[styles.title, { color: colors.text }]}>How will you use Habixa?</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>You can change this later</Text>

              <Pressable
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.card,
                    borderColor: accountType === 'tenant' ? Colors.terracotta : colors.border,
                  },
                  accountType === 'tenant' && styles.optionActive,
                ]}
                onPress={() => setAccountType('tenant')}
              >
                <Text style={[
                  styles.optionText,
                  { color: colors.text },
                  accountType === 'tenant' && styles.optionTextActive,
                ]}>
                  Looking to Rent
                </Text>
                <Text style={[
                  styles.optionSubtext,
                  { color: colors.textSecondary },
                  accountType === 'tenant' && styles.optionSubtextActive,
                ]}>
                  Find and apply for rentals
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.card,
                    borderColor: accountType === 'list_land' ? Colors.terracotta : colors.border,
                  },
                  accountType === 'list_land' && styles.optionActive,
                ]}
                onPress={() => setAccountType('list_land')}
              >
                <Text style={[
                  styles.optionText,
                  { color: colors.text },
                  accountType === 'list_land' && styles.optionTextActive,
                ]}>
                  Looking to List Land
                </Text>
                <Text style={[
                  styles.optionSubtext,
                  { color: colors.textSecondary },
                  accountType === 'list_land' && styles.optionSubtextActive,
                ]}>
                  Lease or sale property
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.card,
                    borderColor: accountType === 'list_house' ? Colors.terracotta : colors.border,
                  },
                  accountType === 'list_house' && styles.optionActive,
                ]}
                onPress={() => setAccountType('list_house')}
              >
                <Text style={[
                  styles.optionText,
                  { color: colors.text },
                  accountType === 'list_house' && styles.optionTextActive,
                ]}>
                  Looking to List House
                </Text>
                <Text style={[
                  styles.optionSubtext,
                  { color: colors.textSecondary },
                  accountType === 'list_house' && styles.optionSubtextActive,
                ]}>
                  List apartment or house
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.card,
                    borderColor: accountType === 'both' ? Colors.terracotta : colors.border,
                  },
                  accountType === 'both' && styles.optionActive,
                ]}
                onPress={() => setAccountType('both')}
              >
                <Text style={[
                  styles.optionText,
                  { color: colors.text },
                  accountType === 'both' && styles.optionTextActive,
                ]}>
                  All of the Above
                </Text>
                <Text style={[
                  styles.optionSubtext,
                  { color: colors.textSecondary },
                  accountType === 'both' && styles.optionSubtextActive,
                ]}>
                  Rent, list land, and list apartments or houses
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.stepContent}
            >
              <Text style={[styles.title, { color: colors.text }]}>Review & create</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Check your details</Text>

              <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Name</Text>
                  <Text style={[styles.reviewValue, { color: colors.text }]}>{name}</Text>
                </View>
                <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[styles.reviewValue, { color: colors.text }]}>{email}</Text>
                </View>
                <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Phone</Text>
                  <Text style={[styles.reviewValue, { color: colors.text }]}>{phone}</Text>
                </View>
                <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Location</Text>
                  <Text style={[styles.reviewValue, { color: colors.text }]}>
                    {[location.city, location.region ? (getRegionName(location.country, location.region) ?? location.region) : null, location.postalCode].filter(Boolean).join(', ')} {location.country}
                  </Text>
                </View>
                <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Date of birth</Text>
                  <Text style={[styles.reviewValue, { color: colors.text }]}>
                    {dateOfBirth ? format(dateOfBirth, 'MMMM d, yyyy') : '—'}
                  </Text>
                </View>
                <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Gender</Text>
                  <Text style={[styles.reviewValue, { color: colors.text }]}>
                    {gender === 'male' && 'Male'}
                    {gender === 'female' && 'Female'}
                    {gender === 'prefer_not_to_say' && "I'd rather not say"}
                    {!gender && '—'}
                  </Text>
                </View>
                <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Account type</Text>
                  <Text style={[styles.reviewValue, { color: colors.text }]}>
                    {accountType === 'tenant' && 'Looking to Rent'}
                    {accountType === 'list_land' && 'Looking to List Land (lease or sale property)'}
                    {accountType === 'list_house' && 'Looking to List House (list apartment or house)'}
                    {accountType === 'both' && 'All of the Above'}
                  </Text>
                </View>
              </View>
              {error ? (
                <View style={[styles.errorAlert, { backgroundColor: 'rgba(194,103,58,0.12)', borderColor: 'rgba(194,103,58,0.35)' }]}>
                  <HabixaIcon name="exclamation-circle" size={18} color={Colors.terracotta} />
                  <Text style={[styles.errorAlertText, { color: colors.text }]}>{error}</Text>
                </View>
              ) : null}
            </Animated.View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {step > 1 && (
              <Pressable style={styles.backBtn} onPress={handleBack}>
                <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>← Back</Text>
              </Pressable>
            )}
            {step < STEPS ? (
              <Pressable
                style={[
                  styles.nextBtn,
                  (step === 1 && !canNextStep1) ||
                  (step === 2 && !canNextStep2) ||
                  (step === 3 && !canNextStep3) ||
                  (step === 4 && !canNextStep4) ||
                  (step === 5 && !canNextStep5)
                    ? styles.nextBtnDisabled
                    : null,
                ]}
                onPress={handleNext}
                disabled={
                  (step === 1 && !canNextStep1) ||
                  (step === 2 && !canNextStep2) ||
                  (step === 3 && !canNextStep3) ||
                  (step === 4 && !canNextStep4) ||
                  (step === 5 && !canNextStep5)
                }
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.nextBtnText}>
                  {loading ? 'Creating…' : 'Create account'}
                </Text>
              </Pressable>
            )}
          </View>

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.link}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                Already have an account? <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </Pressable>
          </Link>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.midnightInk,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    marginTop: 60,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.sky,
    marginTop: 12,
    marginBottom: 23,
    textAlign: 'center',
    lineHeight: 20,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(137, 180, 200, 0.3)',
  },
  progressDotActive: {
    backgroundColor: Colors.terracotta,
    width: 24,
  },
  stepLabel: {
    fontFamily: Fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.sky,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  stepContent: {
    width: '100%',
    marginBottom: 32,
  },
  label: {
    fontFamily: Fonts.label,
    fontSize: 12,
    marginBottom: 6,
  },
  inputText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    flex: 1,
  },
  datePickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.desertSand,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.sky,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.desertSand,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(137, 180, 200, 0.2)',
  },
  passwordInputWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  inputWithToggle: {
    marginBottom: 0,
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 4,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.terracotta,
    marginTop: 4,
  },
  option: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(137, 180, 200, 0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionActive: {
    borderColor: Colors.terracotta,
    backgroundColor: 'rgba(194, 103, 58, 0.15)',
  },
  optionText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.desertSand,
  },
  optionTextActive: {
    color: Colors.terracotta,
  },
  optionSubtext: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.sky,
    marginTop: 4,
  },
  optionSubtextActive: {
    color: 'rgba(245, 239, 230, 0.9)',
  },
  reviewCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(137, 180, 200, 0.15)',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(137, 180, 200, 0.15)',
  },
  reviewLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.sky,
  },
  reviewValue: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.desertSand,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorAlertText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 12,
    paddingRight: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
  },
  nextBtn: {
    width: '100%',
    backgroundColor: Colors.terracotta,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.desertSand,
  },
  link: {
    marginTop: 8,
  },
  linkText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.sky,
  },
  linkBold: {
    fontFamily: Fonts.heading,
    color: Colors.terracotta,
  },
});
