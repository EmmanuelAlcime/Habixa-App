import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import type { ThemePreference } from '@/context/ThemeContext';
import { Colors, Fonts } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { HabixaIcon } from '@/components/HabixaIcon';
import { api, Endpoints } from '@/lib/api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, preference, setPreference } = useTheme();
  const { profile, refetch } = useProfile();

  const twoFactorEnabled = !!profile?.two_factor_enabled;

  const handleTwoFactorToggle = async (value: boolean) => {
    if (value) {
      router.push('/(tabs)/(profile)/two-factor-auth');
    } else {
      Alert.alert(
        'Disable 2FA?',
        'Your account will be less secure. You can re-enable 2FA anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.post(Endpoints.users.twoFaDisable());
                await refetch();
              } catch (e) {
                const err = e as { message?: string };
                Alert.alert('Error', err?.message ?? 'Failed to disable 2FA');
              }
            },
          },
        ]
      );
    }
  };

  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

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
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Security
          </Text>
          <Pressable
            style={[
              styles.twoFactorRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/(tabs)/(profile)/two-factor-auth')}
          >
            <View style={styles.twoFactorLeft}>
              <View style={[styles.twoFactorIconWrap, { backgroundColor: Colors.sand2 }]}>
                <HabixaIcon name="shield-alt" size={16} color={Colors.sage} solid />
              </View>
              <View>
                <Text style={[styles.twoFactorTitle, { color: colors.text }]}>
                  Two-Factor Authentication
                </Text>
                <Text style={[styles.twoFactorSubtitle, { color: colors.textSecondary }]}>
                  {twoFactorEnabled
                    ? `Enabled via ${profile?.two_factor_type === 'sms' ? 'SMS' : 'Email'}`
                    : 'Add an extra layer of security'}
                </Text>
              </View>
            </View>
            <View style={styles.twoFactorRight}>
              <Switch
                value={twoFactorEnabled}
                onValueChange={(val) => handleTwoFactorToggle(val)}
                trackColor={{
                  false: colors.border,
                  true: Colors.terracotta,
                }}
                thumbColor={Colors.desertSand}
              />
              <HabixaIcon name="chevron-right" size={12} color={Colors.muted} solid />
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Appearance
          </Text>
        <View
          style={[
            styles.toggleRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.toggleOption,
                preference === opt.value && {
                  backgroundColor: Colors.terracotta,
                },
              ]}
              onPress={() => setPreference(opt.value)}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  { color: colors.text },
                  preference === opt.value && styles.toggleLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          System follows your device settings.
        </Text>
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
  section: {
    padding: 24,
  },
  sectionLabel: {
    fontFamily: Fonts.label,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 0.5,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleLabel: {
    fontFamily: Fonts.heading,
    fontSize: 14,
  },
  toggleLabelActive: {
    color: Colors.desertSand,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  twoFactorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 12,
  },
  twoFactorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  twoFactorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoFactorTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
  twoFactorSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  twoFactorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
