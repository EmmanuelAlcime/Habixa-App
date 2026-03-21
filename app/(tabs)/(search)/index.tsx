import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { MapContent } from '@/components/MapContent';
import { Colors, Fonts } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useListings, type ListingsSort } from '@/hooks/useListings';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { useProfile } from '@/hooks/useProfile';
import { DEFAULT_CITY, DEFAULT_LOCATION } from '@/lib/config';

const FILTERS = [
  { id: 'apartments', label: 'Apartments', property_type: 'apartment' as const },
  { id: 'houses', label: 'Houses', property_type: 'house' as const },
  { id: 'condos', label: 'Condos', property_type: 'condo' as const },
  { id: 'land', label: 'Land', property_type: 'land' as const },
  { id: 'bedrooms', label: '2+ beds' },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const [query, setQuery] = useState('');
  const [activePropertyType, setActivePropertyType] = useState<string | null>(null);
  const [activeBedrooms, setActiveBedrooms] = useState<number | null>(null);
  const [sort, setSort] = useState<ListingsSort>('relevance');
  const [inputFocused, setInputFocused] = useState(false);

  const userCity = profile?.city ?? DEFAULT_CITY;
  const userRegion = profile?.region ?? undefined;
  const userCountry = profile?.country ?? undefined;

  const debouncedQuery = useDebouncedValue(query.trim(), 400);

  const { suggestions, loading: placesLoading } = usePlacesAutocomplete(query, {
    debounceMs: 300,
    minLength: 2,
  });
  const showSuggestions = inputFocused && suggestions.length > 0 && query.trim().length >= 2;

  // Always show results: use filters, query, or default city (server-side filtering)
  const hasSearched = !!(debouncedQuery || activePropertyType || activeBedrooms || userCity);
  const searchParams = useMemo(() => ({
    q: debouncedQuery || undefined,
    property_type: activePropertyType ?? undefined,
    bedrooms: activeBedrooms ?? undefined,
    sort,
    city: userCity,
    state: userRegion,
    country: userCountry,
  }), [debouncedQuery, activePropertyType, activeBedrooms, sort, userCity, userRegion, userCountry]);

  const { listings, loading, refetch } = useListings(searchParams, {
    enabled: hasSearched,
  });

  const handleSearch = () => {
    Keyboard.dismiss();
    setInputFocused(false);
    refetch();
  };

  const handleSelectSuggestion = (description: string) => {
    setQuery(description);
    setInputFocused(false);
    Keyboard.dismiss();
    // Refetch will be triggered by hasSearched + query change
  };

  const toggleFilter = (id: string, propertyType?: string) => {
    if (propertyType) {
      setActivePropertyType((p) => (p === propertyType ? null : propertyType));
    } else if (id === 'bedrooms') {
      setActiveBedrooms((b) => (b === 2 ? null : 2));
    }
  };

  const SORT_LABELS: Record<ListingsSort, string> = {
    relevance: 'Relevance',
    newest: 'Newest',
    price_asc: 'Price: Low to High',
    price_desc: 'Price: High to Low',
  };

  const showSortOptions = () => {
    Alert.alert('Sort by', undefined, [
      { text: 'Relevance', onPress: () => setSort('relevance') },
      { text: 'Newest', onPress: () => setSort('newest') },
      { text: 'Price: Low to High', onPress: () => setSort('price_asc') },
      { text: 'Price: High to Low', onPress: () => setSort('price_desc') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.searchTop}>
        <Text style={styles.searchTitle}>Find a home</Text>
        <View style={styles.searchInputWrap}>
          <HabixaIcon name="search" size={13} color="rgba(245,239,230,0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder={userCity ? `Search in ${userCity}…` : 'Neighbourhood, street, area…'}
            placeholderTextColor="rgba(245,239,230,0.4)"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable onPress={handleSearch} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>
        {showSuggestions && (
          <View style={[styles.suggestionsBox, { backgroundColor: 'rgba(30,35,40,0.98)', borderColor: 'rgba(255,255,255,0.15)' }]}>
            {placesLoading ? (
              <View style={styles.suggestionItem}>
                <ActivityIndicator size="small" color={Colors.terracotta} />
                <Text style={[styles.suggestionText, { color: Colors.muted }]}>Searching…</Text>
              </View>
            ) : (
              <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.placeId ?? i}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && { backgroundColor: 'rgba(255,255,255,0.08)' },
                  ]}
                  onPress={() => handleSelectSuggestion(s.description)}
                >
                  <HabixaIcon name="map-marker-alt" size={12} color={Colors.terracotta} />
                  <View style={styles.suggestionTextWrap}>
                    <Text style={[styles.suggestionMain, { color: Colors.desertSand }]} numberOfLines={1}>
                      {s.mainText}
                    </Text>
                    {s.secondaryText ? (
                      <Text style={[styles.suggestionSecondary, { color: Colors.sky }]} numberOfLines={1}>
                        {s.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        {FILTERS.map((f) => {
          const isOn = 'property_type' in f && f.property_type
            ? activePropertyType === f.property_type
            : f.id === 'bedrooms' && activeBedrooms === 2;
          return (
            <Pressable
              key={f.id}
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                isOn && styles.filterChipOn,
              ]}
              onPress={() => { const _pl=(_f:typeof FILTERS[0])=>{const _log={sessionId:'9915f8',location:'SearchScreen:filterChip:onPress',message:'Filter chip pressed',data:{filterId:_f.id,propertyType:'property_type' in _f?_f.property_type:undefined},timestamp:Date.now(),hypothesisId:'E'};console.warn('[DEBUG-9915f8]',JSON.stringify(_log));};_pl(f);toggleFilter(f.id,'property_type' in f?f.property_type:undefined);}}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.text },
                  isOn && styles.filterChipTextOn,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.mapContainer}>
        <MapContent
          listings={listings ?? []}
          router={router}
          compact
        />
        <Pressable
          style={styles.mapExpandOverlay}
          onPress={() => {
            const params: Record<string, string> = {};
            if (query.trim()) params.q = query.trim();
            if (activePropertyType) params.property_type = activePropertyType;
            if (activeBedrooms != null) params.bedrooms = String(activeBedrooms);
            if (sort) params.sort = sort;
            if (userCity) params.city = userCity;
            if (userRegion) params.state = userRegion;
            if (userCountry) params.country = userCountry;
            router.push({ pathname: '/(tabs)/(search)/map', params });
          }}
        >
          <Text style={styles.mapPlaceholderText}>Map view · {DEFAULT_LOCATION}</Text>
        </Pressable>
      </View>

      <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.resultsCount}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.terracotta} />
          ) : (
            <HabixaIcon name="th-large" size={11} color={Colors.sage} solid />
          )}
          <Text style={[styles.resultsCountText, { color: colors.text }]}>
            {hasSearched ? `${listings.length} results` : 'Enter a search or use filters'}
          </Text>
        </View>
        <Pressable style={styles.sortBtn} onPress={showSortOptions}>
          <HabixaIcon name="sort-amount-up" size={11} color={Colors.terracotta} solid />
          <Text style={styles.sortBtnText}>{SORT_LABELS[sort]}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.resultList}
        contentContainerStyle={[
          styles.resultListContent,
          listings.length === 0 && !loading && styles.resultListEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!hasSearched ? (
          <View style={styles.emptyResults}>
            <HabixaIcon name="search" size={40} color={Colors.muted} />
            <Text style={[styles.emptyResultsText, { color: colors.textSecondary }]}>
              Search for a neighbourhood, street, or area to find homes. Use the filters to narrow results.
            </Text>
          </View>
        ) : !loading && listings.length === 0 ? (
          <View style={styles.emptyResults}>
            <HabixaIcon name="search" size={40} color={Colors.muted} />
            <Text style={[styles.emptyResultsText, { color: colors.textSecondary }]}>
              No listings match your search. Try different keywords or filters.
            </Text>
          </View>
        ) : (
        (listings ?? []).map((item) => {
          if (!item?.id) return null;
          return (
            <Pressable
              key={item.id}
              style={[styles.resultRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/(home)/listing/[id]',
                  params: {
                    id: String(item.id),
                    country: userCountry ?? '',
                    state: userRegion ?? '',
                    city: userCity ?? '',
                  },
                })
              }
            >
              <View style={[styles.resultThumb, { backgroundColor: item.imgBg || Colors.sand2 }]}>
                {item.photos?.[0]?.url ? (
                  <Image source={{ uri: item.photos[0].url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <HabixaIcon name="building" size={28} color={colors.text} />
                )}
              </View>
              <View style={styles.resultInfo}>
                <Text style={[styles.resultPrice, { color: colors.text }]}>
                  ${Number(item.price ?? 0).toLocaleString()}
                  {item.badge === 'For Sale' ? null : (
                    <Text style={styles.resultPriceUnit}>/mo</Text>
                  )}
                </Text>
                <Text
                  style={[styles.resultName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.title ?? ''}
                </Text>
                <View style={styles.resultLoc}>
                  <HabixaIcon name="map-marker-alt" size={10} color={Colors.terracotta} solid />
                  <Text style={[styles.resultLocText, { color: colors.textSecondary }]}>
                    {item.address ?? ''} · {item.bedrooms ?? 0} bed · {item.bathrooms ?? 0} bath
                  </Text>
                </View>
                <View style={styles.resultScore}>
                  <HabixaIcon name="star" size={9} color={Colors.gold} solid />
                  <Text style={[styles.resultScoreText, { color: colors.text }]}>
                    {item.landlordScore ?? 0} landlord · {item.landlordName ?? 'Unknown'}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchTop: {
    backgroundColor: Colors.midnightInk,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 18,
  },
  searchTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.desertSand,
    marginBottom: 14,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.desertSand,
    padding: 0,
  },
  searchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  searchBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.terracotta,
  },
  suggestionsBox: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 216,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  suggestionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  suggestionMain: {
    fontFamily: Fonts.heading,
    fontSize: 14,
  },
  suggestionSecondary: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 1,
  },
  suggestionText: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  filterRow: {
    marginTop: 20,
    maxHeight: 40,
  },
  filterRowContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  filterChipOn: {
    backgroundColor: Colors.midnightInk,
    borderColor: Colors.midnightInk,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  filterChipTextOn: {
    color: Colors.desertSand,
  },
  mapContainer: {
    marginHorizontal: 20,
    marginBottom: 14,
    height: 160,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(92,124,111,0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  mapExpandOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.sage,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  resultsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resultsCountText: {
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortBtnText: {
    fontSize: 11,
    color: Colors.terracotta,
  },
  resultList: {
    flex: 1,
  },
  resultListContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 10,
  },
  resultListEmpty: {
    flexGrow: 1,
  },
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyResultsText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  resultThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
  },
  resultPrice: {
    fontFamily: Fonts.display,
    fontSize: 16,
  },
  resultPriceUnit: {
    fontSize: 10,
    color: Colors.muted,
    fontFamily: Fonts.body,
  },
  resultName: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    marginVertical: 1,
  },
  resultLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  resultLocText: {
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  resultScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  resultScoreText: {
    fontSize: 10,
  },
});
