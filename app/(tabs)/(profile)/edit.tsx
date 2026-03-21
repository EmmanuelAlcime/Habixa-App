import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { PhoneInput, isValidPhoneForSubmit } from '@/components/PhoneInput';
import { PermissionPrompt } from '@/components/PermissionPrompt';
import { Colors, Fonts } from '@/constants/theme';
import { useProfile, getInitials } from '@/hooks/useProfile';
import { usePermissionPrompt } from '@/hooks/usePermissionPrompt';
import { api, Endpoints } from '@/lib/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_USER_KEY = '@habixa_user';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, loading: profileLoading, refetch } = useProfile();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone OTP verification
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const mediaPermission = usePermissionPrompt('media_library');

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setBio(profile.bio ?? '');
      setPhone(profile.phone ?? '');
      setAvatarUri(profile.avatar_url ?? null);
    }
  }, [profile]);

  const handleSendOtp = async () => {
    if (!isValidPhoneForSubmit(phone)) {
      setOtpError('Please enter a valid phone number');
      return;
    }
    setOtpError(null);
    setOtpSending(true);
    try {
      await api.post(Endpoints.users.verifyPhone(), { phone });
      setOtpSent(true);
      setOtpCode('');
    } catch (e) {
      const err = e as { message?: string };
      setOtpError(err?.message ?? 'Failed to send verification code');
    } finally {
      setOtpSending(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter the 6-digit code');
      return;
    }
    setOtpError(null);
    setOtpVerifying(true);
    try {
      await api.post(Endpoints.users.verifyPhoneConfirm(), { phone, code: otpCode });
      await refetch();
      setOtpSent(false);
      setOtpCode('');
      setOtpError(null);
    } catch (e) {
      const err = e as { message?: string };
      setOtpError(err?.message ?? 'Invalid or expired code');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handlePhoneChange = (newPhone: string) => {
    setPhone(newPhone);
    if (otpSent) {
      setOtpSent(false);
      setOtpCode('');
      setOtpError(null);
    }
  };

  const pickImage = async () => {
    const asked = await mediaPermission.hasAskedBefore();
    if (!asked) {
      const proceed = await mediaPermission.showPrompt({
        title: 'Photo access',
        message: 'Allow Habixa to access your photos so you can choose a profile picture.',
        icon: 'image',
      });
      await mediaPermission.markAsAsked();
      if (!proceed) return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 512, height: 512 } }],
          {
            compress: 0.85,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        setAvatarUri(manipulated.uri);
      } catch (e) {
        const err = e as { message?: string };
        Alert.alert('Error', err?.message ?? 'Failed to process image');
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (avatarUri && !avatarUri.startsWith('http')) {
        const formData = new FormData();
        formData.append('avatar', {
          uri: avatarUri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        } as unknown as Blob);
        await api.postFormData(Endpoints.users.avatar(), formData);
      }

      await api.put(Endpoints.users.me(), {
        name: name.trim(),
        bio: bio.trim() || null,
        // Phone is only updated via OTP verification flow
      });

      const me = await api.get<{ id: number; name: string; email: string; role?: string }>(
        Endpoints.users.me()
      );
      await AsyncStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify({
          id: String(me.id),
          name: me.name,
          email: me.email,
          role: me.role,
        })
      );

      await refetch();
      router.back();
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      setError(
        err?.errors?.name?.[0] ??
          err?.errors?.email?.[0] ??
          err?.message ??
          'Failed to save profile'
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading && !profile) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  return (
    <>
      <PermissionPrompt
        visible={mediaPermission.visible}
        config={mediaPermission.config}
        onAllow={mediaPermission.handleAllow}
        onNotNow={mediaPermission.handleNotNow}
      />
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: Colors.terracotta }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.avatarWrap} onPress={pickImage}>
          <View style={[styles.avatar, { backgroundColor: Colors.terracotta }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {getInitials((name || profile?.name) ?? '')}
              </Text>
            )}
          </View>
          <View style={styles.avatarOverlay}>
            <HabixaIcon name="camera" size={18} color={Colors.card} solid />
          </View>
        </Pressable>
        <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
          Tap to change photo
        </Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
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
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Bio</Text>
        <TextInput
          style={[
            styles.input,
            styles.bioInput,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Tell us about yourself"
          placeholderTextColor={colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
        <PhoneInput
          value={phone}
          onChange={(p) => handlePhoneChange(p)}
        />
        {profile?.phone_verified_at ? (
          <View style={styles.verifiedRow}>
            <HabixaIcon name="check-circle" size={14} color="#22c55e" solid />
            <Text style={[styles.verifiedText, { color: colors.textSecondary }]}>
              Verified
            </Text>
          </View>
        ) : null}
        {!profile?.phone_verified_at || phone !== profile?.phone ? (
          <View style={styles.otpSection}>
            <Pressable
              style={[
                styles.verifyBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                (otpSending || !isValidPhoneForSubmit(phone)) && styles.verifyBtnDisabled,
              ]}
              onPress={handleSendOtp}
              disabled={otpSending || !isValidPhoneForSubmit(phone)}
            >
              {otpSending ? (
                <ActivityIndicator size="small" color={Colors.terracotta} />
              ) : (
                <Text style={[styles.verifyBtnText, { color: Colors.terracotta }]}>
                  {otpSent ? 'Resend code' : 'Verify phone'}
                </Text>
              )}
            </Pressable>
            {otpSent ? (
              <View style={styles.otpRow}>
                <TextInput
                  style={[
                    styles.otpInput,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={colors.textSecondary}
                  value={otpCode}
                  onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  style={[
                    styles.confirmBtn,
                    otpVerifying && styles.confirmBtnDisabled,
                  ]}
                  onPress={handleConfirmOtp}
                  disabled={otpVerifying || otpCode.length !== 6}
                >
                  {otpVerifying ? (
                    <ActivityIndicator size="small" color={Colors.desertSand} />
                  ) : (
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
            {otpError ? (
              <Text style={[styles.otpError, { color: Colors.terracotta }]}>
                {otpError}
              </Text>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.desertSand} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(137,180,200,0.3)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.card,
  },
  avatarOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 12,
    fontFamily: Fonts.body,
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -12,
    marginBottom: 12,
  },
  verifiedText: {
    fontSize: 13,
    fontFamily: Fonts.body,
  },
  otpSection: {
    marginTop: -8,
    marginBottom: 16,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  otpInput: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 0.5,
  },
  confirmBtn: {
    backgroundColor: Colors.terracotta,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.desertSand,
  },
  otpError: {
    fontSize: 13,
    fontFamily: Fonts.body,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: Colors.terracotta,
    fontFamily: Fonts.body,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.desertSand,
  },
});
