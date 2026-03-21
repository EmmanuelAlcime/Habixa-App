/**
 * Pay Rent modal — web fallback (Stripe PaymentSheet is native-only).
 * Full flow available in the iOS/Android app.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { formatPrice } from '@/lib/formatters';
import { t } from '@/lib/i18n';

export default function PayRentModalWeb() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { amount, currency = 'USD', landlordName } = useLocalSearchParams<{
    amount: string;
    currency: string;
    landlordName: string;
  }>();

  const amountNum = amount ? parseFloat(amount) : 0;
  const formattedAmount = formatPrice(amountNum, currency);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <HabixaIcon name="times" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('payments.payRent')}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.card }]}>
          <HabixaIcon name="mobile-alt" size={48} color={Colors.muted} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Available in the app</Text>
        <Text style={[styles.desc, { color: Colors.muted }]}>
          Rent payments are available in the Habixa iOS and Android app. Pay {formattedAmount}
          {landlordName ? ` to ${landlordName}` : ''} securely through the app.
        </Text>
        <Pressable style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>{t('common.done')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  closeBtn: { padding: 6 },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 18, textAlign: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  iconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 22, textAlign: 'center' },
  desc: { fontFamily: Fonts.body, fontSize: 15, textAlign: 'center', lineHeight: 24, maxWidth: 320 },
  doneBtn: { backgroundColor: Colors.terracotta, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30 },
  doneBtnText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.desertSand },
});
