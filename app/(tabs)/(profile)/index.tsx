import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import {
  useProfile,
  getRoleLabel,
  getInitials,
  formatMemberSince,
} from '@/hooks/useProfile';

const ACCOUNT_MENU = [
  { id: 'edit', icon: 'user', label: 'Edit Profile', route: '/(tabs)/(profile)/edit' },
  { id: 'verification', icon: 'id-badge', label: 'Verification', route: '/(tabs)/(profile)/verification' },
  { id: 'payments', icon: 'credit-card', label: 'Payment History', route: '/(tabs)/(profile)/pay-history' },
  { id: 'connect', icon: 'wallet', label: 'Receive Rent Payments', route: '/(tabs)/(profile)/connect', landlordOnly: true },
] as const;

const ACTIVITY_MENU = [
  { id: 'reviews', icon: 'star', label: 'My Reviews', route: '/(tabs)/(profile)/reviews' },
  { id: 'leases', icon: 'file-alt', label: 'My Leases', route: '/(tabs)/(profile)/leases' },
  { id: 'complaints', icon: 'exclamation-triangle', label: 'Complaints', route: '/(tabs)/(profile)/complaints' },
  { id: 'settings', icon: 'cog', label: 'Settings', route: '/(tabs)/(profile)/settings' },
] as const;

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={styles.scoreStars}>
      {[0, 1, 2, 3, 4].map((i) => (
        <HabixaIcon
          key={i}
          name="star"
          size={11}
          color={Colors.gold}
          solid={i < full || (i === full && half)}
        />
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { profile, loading, error, refetch } = useProfile();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const displayName = profile?.name ?? user?.name ?? '—';
  const roleLabel = getRoleLabel(profile?.role ?? user?.role);
  const initials = getInitials(displayName);
  const isVerified =
    !!profile?.email_verified_at ||
    !!profile?.phone_verified_at ||
    !!profile?.id_verified_at;
  const scoreData =
    profile?.role === 'tenant'
      ? profile?.tenant_score
      : profile?.landlord_score;
  const scoreLabel =
    profile?.role === 'tenant' ? 'Tenant Score' : 'Landlord Score';
  const reviewCount = scoreData?.review_count ?? 0;

  if (loading && !profile) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
        <View style={styles.roleRow}>
          <HabixaIcon name="shield-alt" size={10} color={Colors.sky} solid />
          <Text style={styles.roleText}>
            {roleLabel}
            {isVerified ? ' · Verified' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.scoreNum, { color: colors.text }]}>
            {scoreData ? Math.round(scoreData.score * 20) : '—'}
            <Text style={styles.scoreNumUnit}>/100</Text>
          </Text>
          {scoreData ? <StarRating rating={scoreData.score} /> : null}
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>
        </View>
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <HabixaIcon name="calendar-alt" size={18} color={Colors.sky} solid />
          <Text style={[styles.memberYears, { color: colors.text }]}>
            {formatMemberSince(profile?.created_at)}
          </Text>
          <Text style={styles.scoreLabel}>Member since</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.menuList}>
            {ACCOUNT_MENU.filter((item) => {
              const isLandlord = profile?.role === 'landlord' || profile?.role === 'admin';
              return !('landlordOnly' in item && item.landlordOnly) || isLandlord;
            }).map((item) => (
              <Pressable
                key={item.id}
                style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.menuLeft]}>
                  <View style={[styles.menuIconWrap, { backgroundColor: Colors.sand2 }]}>
                    <HabixaIcon name={item.icon as any} size={13} color={Colors.sage} solid />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>{item.label}</Text>
                </View>
                {item.id === 'verification' && isVerified ? (
                  <View style={styles.menuRight}>
                    <View style={styles.verifiedBadge}>
                      <HabixaIcon name="check-circle" size={11} color={Colors.sage} solid />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                    <HabixaIcon name="chevron-right" size={12} color={Colors.muted} solid />
                  </View>
                ) : (
                  <HabixaIcon name="chevron-right" size={12} color={Colors.muted} solid />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Activity</Text>
          <View style={styles.menuList}>
            {ACTIVITY_MENU.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconWrap, { backgroundColor: Colors.sand2 }]}>
                    <HabixaIcon name={item.icon as any} size={13} color={Colors.sage} solid />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>{item.label}</Text>
                </View>
                <View style={styles.menuRight}>
                  {item.id === 'reviews' && reviewCount > 0 && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{reviewCount}</Text>
                    </View>
                  )}
                  <HabixaIcon name="chevron-right" size={12} color={Colors.muted} solid />
                </View>
              </Pressable>
            ))}
            <Pressable
              style={[styles.menuItem, styles.menuItemSignOut, { borderColor: 'rgba(194,103,58,0.2)' }]}
              onPress={async () => {
                await logout();
                router.replace('/(auth)/login');
              }}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, styles.menuIconTerra]}>
                  <HabixaIcon name="sign-out-alt" size={13} color={Colors.terracotta} solid />
                </View>
                <Text style={[styles.menuText, { color: Colors.terracotta }]}>Sign Out</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
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
    backgroundColor: Colors.midnightInk,
    paddingTop: 44,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(137,180,200,0.3)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.card,
  },
  profileName: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.desertSand,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
  },
  roleText: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: Colors.sky,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scoreCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  scoreNum: {
    fontFamily: Fonts.display,
    fontSize: 28,
  },
  scoreNumUnit: {
    fontSize: 14,
    color: Colors.terracotta,
    fontFamily: Fonts.body,
  },
  scoreStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
    letterSpacing: 2,
  },
  scoreLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.sage,
    marginTop: 2,
  },
  memberYears: {
    fontFamily: Fonts.display,
    fontSize: 14,
    marginTop: 4,
  },
  errorWrap: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.terracotta,
    fontFamily: Fonts.body,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.sage,
    marginBottom: 8,
  },
  menuList: {
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    marginBottom: 2,
  },
  menuItemSignOut: {
    borderWidth: 0.5,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconTerra: {
    backgroundColor: 'rgba(194,103,58,0.1)',
  },
  menuText: {
    fontSize: 13,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    color: Colors.sage,
    fontFamily: Fonts.heading,
  },
  menuBadge: {
    backgroundColor: Colors.terracotta,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  menuBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.heading,
    color: Colors.card,
  },
});
