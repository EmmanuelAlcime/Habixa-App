import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';

interface Listing {
  id: number;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  price?: string | number;
}

interface Lease {
  id: number;
  listing_id: number;
  landlord_id: number;
  tenant_id: number;
  start_date: string;
  end_date: string;
  monthly_rent: string | number;
  status: string;
  tenant_confirmed_at?: string | null;
  listing?: Listing;
  landlord?: { id: number; name: string };
  tenant?: { id: number; name: string };
}

interface ApiLeasesResponse {
  data?: Lease[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return Colors.sage;
    case 'pending':
      return Colors.gold;
    case 'ended':
      return Colors.muted;
    case 'cancelled':
      return Colors.terracotta;
    default:
      return Colors.muted;
  }
}

export default function MyLeasesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiLeasesResponse | { data: Lease[] }>(
        Endpoints.leases.index()
      );
      const data = (res as ApiLeasesResponse)?.data ?? (res as { data?: Lease[] })?.data ?? [];
      setLeases(Array.isArray(data) ? data : []);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load leases');
      setLeases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  const getListingTitle = (lease: Lease): string => {
    return lease.listing?.title ?? lease.listing?.address ?? `Listing #${lease.listing_id}`;
  };

  const getRoleLabel = (lease: Lease): string => {
    if (!user?.id) return '';
    if (lease.landlord_id === user.id) return 'Landlord';
    if (lease.tenant_id === user.id) return 'Tenant';
    return '';
  };

  const getOtherParty = (lease: Lease): string => {
    if (!user?.id) return '';
    if (lease.landlord_id === user.id) return lease.tenant?.name ?? `Tenant #${lease.tenant_id}`;
    return lease.landlord?.name ?? `Landlord #${lease.landlord_id}`;
  };

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
        <Text style={[styles.title, { color: colors.text }]}>My Leases</Text>
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
      ) : leases.length === 0 ? (
        <View style={styles.emptyWrap}>
          <HabixaIcon name="file-alt" size={48} color={Colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No leases yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Leases you create as a landlord or sign as a tenant will appear here
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {leases.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.leaseCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push(`/(tabs)/(profile)/leases/${item.id}`)}
            >
              <View style={styles.leaseHeader}>
                <Text style={[styles.leaseTitle, { color: colors.text }]}>
                  {getListingTitle(item)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(item.status)}20` },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: getStatusColor(item.status) }]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
              <View style={styles.leaseMeta}>
                <Text style={[styles.leaseMetaText, { color: colors.textSecondary }]}>
                  {getRoleLabel(item)} · {getOtherParty(item)}
                </Text>
              </View>
              <View style={styles.leaseDetails}>
                <View style={styles.leaseRow}>
                  <HabixaIcon name="calendar-alt" size={12} color={Colors.sage} solid />
                  <Text style={[styles.leaseDetailText, { color: colors.text }]}>
                    {formatDate(item.start_date)} – {formatDate(item.end_date)}
                  </Text>
                </View>
                <View style={styles.leaseRow}>
                  <HabixaIcon name="dollar-sign" size={12} color={Colors.sage} solid />
                  <Text style={[styles.leaseDetailText, { color: colors.text }]}>
                    {formatCurrency(item.monthly_rent)}/mo
                  </Text>
                </View>
              </View>
              <View style={styles.leaseFooter}>
                <Text style={[styles.viewDetailText, { color: Colors.terracotta }]}>
                  View details
                </Text>
                <HabixaIcon name="chevron-right" size={12} color={Colors.terracotta} solid />
              </View>
            </Pressable>
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
  leaseCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  leaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leaseTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    textTransform: 'capitalize',
  },
  leaseMeta: {
    marginTop: 8,
  },
  leaseMetaText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  leaseDetails: {
    marginTop: 12,
    gap: 6,
  },
  leaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaseDetailText: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  leaseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(137,180,200,0.2)',
  },
  viewDetailText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
  },
});
