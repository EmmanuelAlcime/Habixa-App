/**
 * Upgrade modal — shows subscription plans and handles Stripe checkout.
 */
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { usePremium, TIER_LIMITS } from '@/context/PremiumContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { formatPrice } from '@/lib/formatters';
import { t } from '@/lib/i18n';
import type { SubscriptionTier } from '@/store/useAppStore';

const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  free: ['Browse all listings', '1 active listing', 'Basic profile', 'In-app messaging'],
  basic: ['Everything in Free', '5 active listings', 'Boost listings ($15 each)', 'Priority search placement', 'Listing analytics'],
  pro: ['Everything in Basic', 'Unlimited listings', '2 free boosts per month', 'Advanced analytics dashboard', 'Priority support'],
};

export default function UpgradeModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { tier, subscribe, loading } = usePremium();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const plans: SubscriptionTier[] = ['free', 'basic', 'pro'];

  const reasonText: Record<string, string> = {
    boost: 'Upgrade to Basic or Pro to boost your listings to the top of search results.',
    listing_limit: 'You\'ve reached your listing limit. Upgrade to add more.',
    analytics: 'Upgrade to Pro for detailed listing analytics.',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <HabixaIcon name="times" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('premium.upgradeTitle')}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {reason && reasonText[reason] && (
          <View style={[styles.reasonBanner, { backgroundColor: 'rgba(194,103,58,0.08)', borderColor: 'rgba(194,103,58,0.2)' }]}>
            <HabixaIcon name="info-circle" size={14} color={Colors.terracotta} />
            <Text style={[styles.reasonText, { color: Colors.terracotta }]}>{reasonText[reason]}</Text>
          </View>
        )}

        {plans.map((planId) => {
          const limits = TIER_LIMITS[planId];
          const isCurrent = tier === planId;
          const isPopular = planId === 'basic';

          return (
            <View
              key={planId}
              style={[
                styles.planCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                isCurrent && styles.planCardCurrent,
                isPopular && !isCurrent && styles.planCardPopular,
              ]}
            >
              {isPopular && !isCurrent && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>{t('premium.currentPlan')}</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>
                  {t(`premium.${planId}` as Parameters<typeof t>[0])}
                </Text>
                <View style={styles.planPrice}>
                  {limits.monthlyPriceUSD === 0 ? (
                    <Text style={[styles.planPriceFree, { color: colors.text }]}>Free</Text>
                  ) : (
                    <>
                      <Text style={[styles.planPriceNum, { color: Colors.terracotta }]}>
                        {formatPrice(limits.monthlyPriceUSD, 'USD')}
                      </Text>
                      <Text style={[styles.planPricePer, { color: Colors.muted }]}>{t('premium.perMonth')}</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.featuresList}>
                {PLAN_FEATURES[planId].map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <HabixaIcon name="check" size={11} color={Colors.sage} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              {!isCurrent && planId !== 'free' && (
                <Pressable
                  style={[styles.chooseBtn, isPopular && styles.chooseBtnPopular]}
                  onPress={() => subscribe(planId)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={isPopular ? Colors.desertSand : Colors.terracotta} />
                  ) : (
                    <Text style={[styles.chooseBtnText, isPopular && styles.chooseBtnTextPopular]}>
                      {t('premium.choosePlan')}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}

        <Text style={[styles.footer, { color: Colors.muted }]}>
          Cancel anytime. No long-term commitment. Secure payments via Stripe.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  closeBtn: { padding: 6 },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 20, textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  reasonBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 0.5 },
  reasonText: { flex: 1, fontFamily: Fonts.body, fontSize: 13, lineHeight: 18 },
  planCard: { borderRadius: 16, borderWidth: 0.5, padding: 18, position: 'relative' },
  planCardCurrent: { borderColor: Colors.sage, backgroundColor: 'rgba(92,124,111,0.04)' },
  planCardPopular: { borderColor: Colors.terracotta, borderWidth: 1.5 },
  popularBadge: { position: 'absolute', top: -1, right: 16, backgroundColor: Colors.terracotta, paddingVertical: 3, paddingHorizontal: 10, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  popularBadgeText: { fontFamily: Fonts.heading, fontSize: 10, color: Colors.desertSand, letterSpacing: 0.5 },
  currentBadge: { position: 'absolute', top: -1, right: 16, backgroundColor: Colors.sage, paddingVertical: 3, paddingHorizontal: 10, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  currentBadgeText: { fontFamily: Fonts.heading, fontSize: 10, color: Colors.desertSand, letterSpacing: 0.5 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  planName: { fontFamily: Fonts.display, fontSize: 20 },
  planPrice: { alignItems: 'flex-end' },
  planPriceFree: { fontFamily: Fonts.display, fontSize: 20 },
  planPriceNum: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 26 },
  planPricePer: { fontFamily: Fonts.body, fontSize: 11 },
  featuresList: { gap: 8, marginBottom: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: Fonts.body, fontSize: 13, flex: 1 },
  chooseBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.terracotta },
  chooseBtnPopular: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  chooseBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.terracotta },
  chooseBtnTextPopular: { color: Colors.desertSand },
  footer: { fontFamily: Fonts.body, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
