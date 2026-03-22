import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
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
  isDark,
}: {
  label: string;
  icon: string;
  score: string;
  scoreAccent: string;
  name: string;
  stars: number;
  isDark: boolean;
}) {
  const cardStyles = createMiniCardStyles(isDark);
  return (
    <View style={cardStyles.miniCard}>
      <View style={styles.miniCardLabelRow}>
        <HabixaIcon name={icon as any} size={9} color={isDark ? Colors.sky : Colors.sage} />
        <Text style={cardStyles.miniCardLabel}>{label}</Text>
      </View>
      <Text style={cardStyles.miniCardScore}>
        {score}<Text style={styles.miniCardScoreAccent}>{scoreAccent}</Text>
      </Text>
      <Text style={cardStyles.miniCardName}>{name}</Text>
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
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
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

  const screenStyles = createScreenStyles(isDark);

  return (
    <View style={screenStyles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.bgOverlay} />
      <View style={[styles.content, { paddingBottom: Math.max(36, insets.bottom + 24) }]}>
        <View style={styles.hero}>
          <HabixaLogo width={72} height={76} variant={isDark ? 'dark' : 'light'} />
          <View style={styles.wordmarkWrap}>
            <Text style={screenStyles.wordmark}>
              Habi<Text style={styles.wordmarkAccent}>xa</Text>
            </Text>
            <Text style={screenStyles.tag}>Works both ways</Text>
          </View>
          <View style={styles.illustration}>
            {loading ? (
              <View style={styles.ratingsLoading}>
                <ActivityIndicator size="small" color={isDark ? Colors.sky : Colors.sage} />
                <Text style={screenStyles.ratingsLoadingText}>
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
                    isDark={isDark}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.ratingsPlaceholder}>
                <HabixaIcon name="star" size={24} color={isDark ? Colors.sky : Colors.sage} />
                <Text style={screenStyles.ratingsPlaceholderText}>
                  Ratings from your area will appear here
                </Text>
              </View>
            )}
          </View>
          <View style={styles.propertyTypesSection}>
            <Text style={screenStyles.propertyTypesLabel}>Apartments · Condos · Houses · Land & more</Text>
            <View style={styles.propertyTypesRow}>
              {PROPERTY_TYPES.map((pt) => (
                <View key={pt} style={screenStyles.propertyTypeChip}>
                  <HabixaIcon
                    name={pt === 'land' ? 'leaf' : pt === 'house' ? 'home' : 'building'}
                    size={12}
                    color={isDark ? Colors.sky : Colors.sage}
                  />
                  <Text style={screenStyles.propertyTypeChipText}>{PROPERTY_TYPE_LABELS[pt]}</Text>
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
          <Pressable style={[styles.btnGhost, screenStyles.btnGhost]} onPress={handleHaveAccount}>
            <Text style={[styles.btnGhostText, screenStyles.btnGhostText]}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createScreenStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? Colors.midnightInk : Colors.desertSand,
    },
    wordmark: {
      fontFamily: Fonts.display,
      fontSize: 44,
      color: isDark ? Colors.desertSand : Colors.midnightInk,
      letterSpacing: -1,
    },
    tag: {
      fontSize: 10,
      letterSpacing: 3,
      textTransform: 'uppercase' as const,
      color: isDark ? Colors.sky : Colors.sage,
      marginTop: 3,
    },
    ratingsLoadingText: {
      fontSize: 12,
      color: isDark ? Colors.sky : Colors.sage,
    },
    ratingsPlaceholderText: {
      fontSize: 11,
      color: isDark ? 'rgba(245,239,230,0.5)' : 'rgba(15,22,35,0.5)',
      textAlign: 'center' as const,
    },
    propertyTypesLabel: {
      fontSize: 9,
      letterSpacing: 2,
      textTransform: 'uppercase' as const,
      color: isDark ? Colors.sky : Colors.sage,
      marginBottom: 10,
    },
    propertyTypeChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,22,35,0.06)',
      borderWidth: 0.5,
      borderColor: isDark ? 'rgba(137,180,200,0.25)' : 'rgba(92,124,111,0.35)',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    propertyTypeChipText: {
      fontSize: 10,
      color: isDark ? 'rgba(245,239,230,0.85)' : 'rgba(15,22,35,0.85)',
      fontFamily: Fonts.body,
    },
    btnGhost: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,22,35,0.07)',
      borderWidth: 0.5,
      borderColor: isDark ? 'rgba(245,239,230,0.2)' : 'rgba(15,22,35,0.15)',
    },
    btnGhostText: {
      fontFamily: Fonts.body,
      fontSize: 14,
      color: isDark ? Colors.desertSand : Colors.midnightInk,
    },
  });
}

function createMiniCardStyles(isDark: boolean) {
  return StyleSheet.create({
    miniCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
      borderWidth: 0.5,
      borderColor: isDark ? 'rgba(137,180,200,0.2)' : 'rgba(92,124,111,0.25)',
      borderRadius: 12,
      padding: 12,
      width: 116,
    },
    miniCardLabel: {
      fontSize: 9,
      letterSpacing: 2,
      textTransform: 'uppercase' as const,
      color: isDark ? Colors.sky : Colors.sage,
    },
    miniCardScore: {
      fontFamily: Fonts.display,
      fontSize: 26,
      color: isDark ? Colors.desertSand : Colors.midnightInk,
    },
    miniCardName: {
      fontSize: 10,
      color: isDark ? 'rgba(245,239,230,0.6)' : 'rgba(15,22,35,0.6)',
      marginTop: 4,
    },
  });
}

const styles = StyleSheet.create({
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
  wordmarkAccent: {
    color: Colors.terracotta,
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
  ratingsPlaceholder: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  propertyTypesSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  propertyTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    maxWidth: 280,
  },
  miniCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  miniCardScoreAccent: {
    color: Colors.gold,
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
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
});
