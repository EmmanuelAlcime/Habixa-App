import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { HabixaLogo } from '@/components/HabixaLogo';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { useOnboardingLocation } from '@/hooks/useOnboardingLocation';
import { api, Endpoints } from '@/lib/api/client';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from '@/lib/constants/propertyTypes';

interface RatingCard {
  label: string;
  icon: string;
  score: string;
  scoreAccent: string;
  name: string;
  stars: number;
}

function MiniCard({
  label,
  icon,
  score,
  scoreAccent,
  name,
  stars,
}: {
  label: string;
  icon: string;
  score: string;
  scoreAccent: string;
  name: string;
  stars: number;
}) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniCardLabelRow}>
        <HabixaIcon name={icon as any} size={9} color={Colors.sky} />
        <Text style={styles.miniCardLabel}>{label}</Text>
      </View>
      <Text style={styles.miniCardScore}>
        {score}<Text style={styles.miniCardScoreAccent}>{scoreAccent}</Text>
      </Text>
      <Text style={styles.miniCardName}>{name}</Text>
      <View style={styles.miniCardStars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <HabixaIcon
            key={i}
            name="star"
            size={10}
            color={Colors.gold}
            solid={i < stars}
            style={{ marginRight: 1 }}
          />
        ))}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const router = useRouter();
  const { requestAndResolve, loading: locationLoading } = useOnboardingLocation();
  const [ratings, setRatings] = useState<RatingCard[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const loc = await requestAndResolve();
      if (cancelled) return;

      try {
        const url = Endpoints.onboarding.ratings(
          loc ? { country: loc.country, city: loc.city, region: loc.region } : undefined
        );
        const data = await api.get<RatingCard[]>(url, { skipAuth: true });
        if (!cancelled) setRatings(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setRatings([]);
      } finally {
        if (!cancelled) setRatingsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [requestAndResolve]);

  const loading = locationLoading || ratingsLoading;

  const handleGetStarted = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  const handleHaveAccount = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgOverlay} />
      <View style={styles.content}>
        <View style={styles.hero}>
          <HabixaLogo width={72} height={76} variant="dark" />
          <View style={styles.wordmarkWrap}>
            <Text style={styles.wordmark}>
              Habi<Text style={styles.wordmarkAccent}>xa</Text>
            </Text>
            <Text style={styles.tag}>Works both ways</Text>
          </View>
          <View style={styles.illustration}>
            {loading ? (
              <View style={styles.ratingsLoading}>
                <ActivityIndicator size="small" color={Colors.sky} />
                <Text style={styles.ratingsLoadingText}>
                  Loading ratings near you…
                </Text>
              </View>
            ) : ratings.length > 0 ? (
              <View style={styles.ratingsGrid}>
                {ratings.slice(0, 4).map((r, i) => (
                  <MiniCard
                    key={i}
                    label={r.label}
                    icon={r.icon}
                    score={r.score}
                    scoreAccent={r.scoreAccent}
                    name={r.name}
                    stars={r.stars}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.ratingsPlaceholder}>
                <HabixaIcon name="star" size={24} color={Colors.sky} />
                <Text style={styles.ratingsPlaceholderText}>
                  Ratings from your area will appear here
                </Text>
              </View>
            )}
          </View>
          <View style={styles.propertyTypesSection}>
            <Text style={styles.propertyTypesLabel}>Apartments · Condos · Houses · Land & more</Text>
            <View style={styles.propertyTypesRow}>
              {PROPERTY_TYPES.map((pt) => (
                <View key={pt} style={styles.propertyTypeChip}>
                  <HabixaIcon
                    name={pt === 'land' ? 'leaf' : pt === 'house' ? 'home' : 'building'}
                    size={12}
                    color={Colors.sky}
                  />
                  <Text style={styles.propertyTypeChipText}>{PROPERTY_TYPE_LABELS[pt]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.btnPrimary} onPress={handleGetStarted}>
            <HabixaIcon name="arrow-right" size={14} color={Colors.desertSand} />
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={handleHaveAccount}>
            <Text style={styles.btnGhostText}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.midnightInk,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
  },
  wordmarkWrap: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: 44,
    color: Colors.desertSand,
    letterSpacing: -1,
  },
  wordmarkAccent: {
    color: Colors.terracotta,
  },
  tag: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.sky,
    marginTop: 3,
  },
  illustration: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    maxWidth: 252,
  },
  ratingsLoading: {
    alignItems: 'center',
    gap: 12,
  },
  ratingsLoadingText: {
    fontSize: 12,
    color: Colors.sky,
  },
  ratingsPlaceholder: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  ratingsPlaceholderText: {
    fontSize: 11,
    color: 'rgba(245,239,230,0.5)',
    textAlign: 'center',
  },
  propertyTypesSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  propertyTypesLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.sky,
    marginBottom: 10,
  },
  propertyTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    maxWidth: 280,
  },
  propertyTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(137,180,200,0.25)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  propertyTypeChipText: {
    fontSize: 10,
    color: 'rgba(245,239,230,0.85)',
    fontFamily: Fonts.body,
  },
  miniCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(137,180,200,0.2)',
    borderRadius: 12,
    padding: 12,
    width: 116,
  },
  miniCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  miniCardLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.sky,
  },
  miniCardScore: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.desertSand,
  },
  miniCardScoreAccent: {
    color: Colors.gold,
  },
  miniCardName: {
    fontSize: 10,
    color: 'rgba(245,239,230,0.6)',
    marginTop: 4,
  },
  miniCardStars: {
    flexDirection: 'row',
    marginTop: 3,
    gap: 1,
  },
  actions: {
    gap: 10,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.terracotta,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  btnPrimaryText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.desertSand,
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(245,239,230,0.2)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.desertSand,
  },
});
