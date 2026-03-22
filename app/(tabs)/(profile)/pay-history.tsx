import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { formatPrice } from '@/lib/formatters';
import { usePayments, type Payment } from '@/hooks/usePayments';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatType(type: string): string {
  switch (type) {
    case 'rent':
      return 'Rent';
    case 'listing_fee':
    case 'listing-fee':
    case 'listing_upgrade':
      return 'Premium listing';
    case 'background_check':
    case 'background-check':
      return 'Background check';
    default:
      return type.replace(/_/g, ' ');
  }
}

function PaymentItem({
  item,
  colors,
}: {
  item: Payment;
  colors: { card: string; border: string; text: string; textSecondary: string };
}) {
  return (
    <View
      style={[
        styles.paymentRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.paymentLeft}>
        <View style={[styles.paymentIcon, { backgroundColor: Colors.sand2 }]}>
          <HabixaIcon
            name={item.type === 'rent' ? 'home' : 'credit-card'}
            size={16}
            color={Colors.sage}
            solid
          />
        </View>
        <View>
          <Text style={[styles.paymentType, { color: colors.text }]}>
            {formatType(item.type)}
          </Text>
          <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
      <View style={styles.paymentRight}>
        <Text style={[styles.paymentAmount, { color: colors.text }]}>
          {formatPrice(parseFloat(item.amount || '0'), item.currency ?? 'USD')}
        </Text>
        <View
          style={[
            styles.statusBadge,
            item.status === 'completed'
              ? styles.statusCompleted
              : item.status === 'pending'
                ? styles.statusPending
                : styles.statusOther,
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
    </View>
  );
}

export default function PayHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { payments, loading, error } = usePayments();

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
        <Text style={[styles.title, { color: colors.text }]}>Payment History</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.terracotta} />
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <HabixaIcon name="exclamation-circle" size={48} color={Colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{error}</Text>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyWrap}>
          <HabixaIcon name="credit-card" size={48} color={Colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No payments yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Your payment history will appear here
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {payments.map((item) => (
            <PaymentItem key={item.id} item={item} colors={colors} />
          ))}
        </ScrollView>
      )}
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentType: {
    fontFamily: Fonts.heading,
    fontSize: 15,
  },
  paymentDate: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontFamily: Fonts.display,
    fontSize: 16,
  },
  statusBadge: {
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: 'rgba(92,124,111,0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(194,103,58,0.2)',
  },
  statusOther: {
    backgroundColor: 'rgba(137,180,200,0.2)',
  },
  statusText: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    color: Colors.sage,
    textTransform: 'capitalize',
  },
});
