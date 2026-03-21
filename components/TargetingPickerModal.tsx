/**
 * Geographic targeting picker for Boost/Premium listings.
 * User-friendly flow to choose where an ad should appear.
 */
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  FlatList,
  Platform,
  SectionList,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import { countries, getCountry, getSubdivisionLabel, type CountryData } from '@/lib/countryAddressData';
import { usePlacesAutocomplete, type PlaceSuggestion } from '@/hooks/usePlacesAutocomplete';

/** Group popular countries by region for easier browsing */
const COUNTRY_GROUPS: { title: string; codes: string[] }[] = [
  { title: 'North America', codes: ['US', 'CA'] },
  { title: 'Europe', codes: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'IE', 'PT', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'GR', 'RO', 'HU'] },
  { title: 'Caribbean', codes: ['BS', 'JM', 'TT', 'BB', 'AG', 'GD', 'LC', 'VC', 'KN', 'DM', 'BZ', 'HT', 'DO', 'PR', 'CU'] },
  { title: 'Other markets', codes: ['AU', 'NG', 'ZA', 'KE', 'IN', 'BR', 'MX'] },
];

const allGroupCodes = new Set(COUNTRY_GROUPS.flatMap((g) => g.codes));
const popularCountries = countries.filter((c) => allGroupCodes.has(c.countryShortCode));
const remainingCountries = countries.filter((c) => !allGroupCodes.has(c.countryShortCode));

export interface TargetingSelection {
  countries: string[];
  regions: string[];
  cities: string[];
}

interface TargetingPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (targeting: TargetingSelection | null) => void;
  title: string;
}

function CountryPickerModal({
  visible,
  onClose,
  selectedCodes,
  onToggle,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  selectedCodes: string[];
  onToggle: (code: string) => void;
  colors: { text: string; textSecondary: string; background: string; card: string; border: string };
}) {
  const [search, setSearch] = useState('');

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.countryName.toLowerCase().includes(q) ||
        c.countryShortCode.toLowerCase().includes(q)
    );
  }, [search]);

  const sections = useMemo(() => {
    if (search.trim()) return [];
    const groupSections = COUNTRY_GROUPS.map((group) => ({
      title: group.title,
      data: group.codes
        .map((code) => getCountry(code))
        .filter((c): c is CountryData => !!c),
    }));
    return [
      ...groupSections,
      { title: 'All other countries', data: remainingCountries },
    ];
  }, []);

  const handleSelect = (code: string) => {
    onToggle(code);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={countryPickerStyles.overlay}>
        <View style={[countryPickerStyles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[countryPickerStyles.header, { borderBottomColor: colors.border }]}>
            <View style={countryPickerStyles.headerRow}>
              <Text style={[countryPickerStyles.title, { color: colors.text }]}>
                Select countries
              </Text>
              <Pressable onPress={onClose} hitSlop={12} style={countryPickerStyles.doneBtn}>
                <Text style={[countryPickerStyles.doneText, { color: Colors.sage }]}>Done</Text>
              </Pressable>
            </View>
            <Text style={[countryPickerStyles.subtitle, { color: colors.textSecondary }]}>
              Tap to add or remove. Your ad will only appear in selected countries.
            </Text>
            <TextInput
              style={[
                countryPickerStyles.search,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Search countries..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Selected chips */}
          {selectedCodes.length > 0 && (
            <View style={[countryPickerStyles.selectedChips, { borderBottomColor: colors.border }]}>
              {selectedCodes.map((code) => {
                const c = getCountry(code);
                return (
                  <Pressable
                    key={code}
                    style={[countryPickerStyles.chip, { backgroundColor: Colors.sage }]}
                    onPress={() => handleSelect(code)}
                  >
                    <Text style={countryPickerStyles.chipText} numberOfLines={1}>
                      {c?.countryName ?? code}
                    </Text>
                    <HabixaIcon name="times" size={12} color={Colors.midnightInk} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* List */}
          {search.trim() ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.countryShortCode}
              renderItem={({ item }) => {
                const sel = selectedCodes.includes(item.countryShortCode);
                return (
                  <Pressable
                    style={[
                      countryPickerStyles.row,
                      { borderBottomColor: colors.border },
                      sel && { backgroundColor: 'rgba(92,124,111,0.1)' },
                    ]}
                    onPress={() => handleSelect(item.countryShortCode)}
                  >
                    <Text style={[countryPickerStyles.rowText, { color: colors.text }]}>
                      {item.countryName}
                    </Text>
                    {sel ? (
                      <HabixaIcon name="check-circle" size={20} color={Colors.sage} solid />
                    ) : (
                      <View style={[countryPickerStyles.checkCircle, { borderColor: colors.border }]} />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={countryPickerStyles.empty}>
                  <Text style={[countryPickerStyles.emptyText, { color: colors.textSecondary }]}>
                    No countries match "{search}"
                  </Text>
                </View>
              }
            />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.countryShortCode}
              renderSectionHeader={({ section }) => (
                <View style={[countryPickerStyles.sectionHeader, { backgroundColor: colors.card }]}>
                  <Text style={[countryPickerStyles.sectionTitle, { color: colors.textSecondary }]}>
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const sel = selectedCodes.includes(item.countryShortCode);
                return (
                  <Pressable
                    style={[
                      countryPickerStyles.row,
                      { borderBottomColor: colors.border },
                      sel && { backgroundColor: 'rgba(92,124,111,0.1)' },
                    ]}
                    onPress={() => handleSelect(item.countryShortCode)}
                  >
                    <Text style={[countryPickerStyles.rowText, { color: colors.text }]}>
                      {item.countryName}
                    </Text>
                    {sel ? (
                      <HabixaIcon name="check-circle" size={20} color={Colors.sage} solid />
                    ) : (
                      <View style={[countryPickerStyles.checkCircle, { borderColor: colors.border }]} />
                    )}
                  </Pressable>
                );
              }}
              stickySectionHeadersEnabled={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const countryPickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: { padding: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: Fonts.display, fontSize: 20 },
  doneBtn: { padding: 4 },
  doneText: { fontFamily: Fonts.heading, fontSize: 16 },
  subtitle: { fontFamily: Fonts.body, fontSize: 13, marginBottom: 12 },
  search: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 0.5,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  chipText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.midnightInk },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 16 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  rowText: { fontFamily: Fonts.body, fontSize: 16, flex: 1 },
  checkCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: Fonts.body, fontSize: 15 },
});

interface RegionOption {
  value: string;
  label: string;
  countryCode: string;
  countryName: string;
  regionName: string;
}

function RegionPickerModal({
  visible,
  onClose,
  regionOptions,
  selectedValues,
  onToggle,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  regionOptions: RegionOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  colors: { text: string; textSecondary: string; background: string; card: string; border: string };
}) {
  const [search, setSearch] = useState('');

  const sections = useMemo(() => {
    const byCountry = new Map<string, RegionOption[]>();
    for (const opt of regionOptions) {
      const list = byCountry.get(opt.countryCode) ?? [];
      list.push(opt);
      byCountry.set(opt.countryCode, list);
    }
    return Array.from(byCountry.entries()).map(([code, opts]) => {
      const country = getCountry(code);
      const label = getSubdivisionLabel(code);
      return {
        title: `${country?.countryName ?? code} — ${label}s`,
        data: opts,
      };
    });
  }, [regionOptions]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return regionOptions.filter(
      (r) =>
        r.regionName.toLowerCase().includes(q) ||
        r.countryName.toLowerCase().includes(q) ||
        r.value.toLowerCase().includes(q)
    );
  }, [regionOptions, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={regionPickerStyles.overlay}>
        <View style={[regionPickerStyles.sheet, { backgroundColor: colors.background }]}>
          <View style={[regionPickerStyles.header, { borderBottomColor: colors.border }]}>
            <View style={regionPickerStyles.headerRow}>
              <Text style={[regionPickerStyles.title, { color: colors.text }]}>
                Select states & regions
              </Text>
              <Pressable onPress={onClose} hitSlop={12} style={regionPickerStyles.doneBtn}>
                <Text style={[regionPickerStyles.doneText, { color: Colors.sage }]}>Done</Text>
              </Pressable>
            </View>
            <Text style={[regionPickerStyles.subtitle, { color: colors.textSecondary }]}>
              Tap to add or remove. Your ad will only appear in selected areas.
            </Text>
            <TextInput
              style={[
                regionPickerStyles.search,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Search (e.g. Florida, New Providence)..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="words"
            />
          </View>

          {selectedValues.length > 0 && (
            <View style={[regionPickerStyles.selectedChips, { borderBottomColor: colors.border }]}>
              {selectedValues.map((value) => {
                const opt = regionOptions.find((r) => r.value === value);
                return (
                  <Pressable
                    key={value}
                    style={[regionPickerStyles.chip, { backgroundColor: Colors.sage }]}
                    onPress={() => onToggle(value)}
                  >
                    <Text style={regionPickerStyles.chipText} numberOfLines={1}>
                      {opt?.label ?? value}
                    </Text>
                    <HabixaIcon name="times" size={12} color={Colors.midnightInk} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {search.trim() ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const sel = selectedValues.includes(item.value);
                return (
                  <Pressable
                    style={[
                      regionPickerStyles.row,
                      { borderBottomColor: colors.border },
                      sel && { backgroundColor: 'rgba(92,124,111,0.1)' },
                    ]}
                    onPress={() => onToggle(item.value)}
                  >
                    <View style={regionPickerStyles.rowContent}>
                      <Text style={[regionPickerStyles.rowText, { color: colors.text }]}>
                        {item.regionName}
                      </Text>
                      <Text style={[regionPickerStyles.rowSub, { color: colors.textSecondary }]}>
                        {item.countryName}
                      </Text>
                    </View>
                    {sel ? (
                      <HabixaIcon name="check-circle" size={20} color={Colors.sage} solid />
                    ) : (
                      <View style={[regionPickerStyles.checkCircle, { borderColor: colors.border }]} />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={regionPickerStyles.empty}>
                  <Text style={[regionPickerStyles.emptyText, { color: colors.textSecondary }]}>
                    No results for "{search}"
                  </Text>
                </View>
              }
            />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.value}
              renderSectionHeader={({ section }) => (
                <View style={[regionPickerStyles.sectionHeader, { backgroundColor: colors.card }]}>
                  <Text style={[regionPickerStyles.sectionTitle, { color: colors.textSecondary }]}>
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const sel = selectedValues.includes(item.value);
                return (
                  <Pressable
                    style={[
                      regionPickerStyles.row,
                      { borderBottomColor: colors.border },
                      sel && { backgroundColor: 'rgba(92,124,111,0.1)' },
                    ]}
                    onPress={() => onToggle(item.value)}
                  >
                    <Text style={[regionPickerStyles.rowText, { color: colors.text }]}>
                      {item.regionName}
                    </Text>
                    {sel ? (
                      <HabixaIcon name="check-circle" size={20} color={Colors.sage} solid />
                    ) : (
                      <View style={[regionPickerStyles.checkCircle, { borderColor: colors.border }]} />
                    )}
                  </Pressable>
                );
              }}
              stickySectionHeadersEnabled={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const regionPickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  header: { padding: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: Fonts.display, fontSize: 20 },
  doneBtn: { padding: 4 },
  doneText: { fontFamily: Fonts.heading, fontSize: 16 },
  subtitle: { fontFamily: Fonts.body, fontSize: 13, marginBottom: 12 },
  search: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 0.5,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  chipText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.midnightInk },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 16 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  rowContent: { flex: 1 },
  rowText: { fontFamily: Fonts.body, fontSize: 16 },
  rowSub: { fontFamily: Fonts.body, fontSize: 12, marginTop: 2 },
  checkCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: Fonts.body, fontSize: 15 },
});

function CityPickerModal({
  visible,
  onClose,
  selectedCities,
  onAdd,
  onRemove,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  selectedCities: string[];
  onAdd: (city: string) => void;
  onRemove: (city: string) => void;
  colors: { text: string; textSecondary: string; background: string; card: string; border: string };
}) {
  const [search, setSearch] = useState('');
  const [manualInput, setManualInput] = useState('');
  const { suggestions, loading } = usePlacesAutocomplete(search, { minLength: 2, debounceMs: 250 });

  const handleSelectSuggestion = (s: PlaceSuggestion) => {
    const cityName = s.mainText?.trim() || s.description?.split(',')[0]?.trim() || s.description;
    if (cityName && !selectedCities.includes(cityName)) {
      onAdd(cityName);
      setSearch('');
    }
  };

  const handleAddManual = () => {
    const name = manualInput.trim();
    if (name && !selectedCities.includes(name)) {
      onAdd(name);
      setManualInput('');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={cityPickerStyles.overlay}>
        <View style={[cityPickerStyles.sheet, { backgroundColor: colors.background }]}>
          <View style={[cityPickerStyles.header, { borderBottomColor: colors.border }]}>
            <View style={cityPickerStyles.headerRow}>
              <Text style={[cityPickerStyles.title, { color: colors.text }]}>
                Select cities
              </Text>
              <Pressable onPress={onClose} hitSlop={12} style={cityPickerStyles.doneBtn}>
                <Text style={[cityPickerStyles.doneText, { color: Colors.sage }]}>Done</Text>
              </Pressable>
            </View>
            <Text style={[cityPickerStyles.subtitle, { color: colors.textSecondary }]}>
              Search for cities or type one to add. Your ad will only appear in selected cities.
            </Text>
            <TextInput
              style={[
                cityPickerStyles.search,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Search for a city (e.g. Nassau, Miami)..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="words"
            />
          </View>

          {selectedCities.length > 0 && (
            <View style={[cityPickerStyles.selectedChips, { borderBottomColor: colors.border }]}>
              {selectedCities.map((city) => (
                <Pressable
                  key={city}
                  style={[cityPickerStyles.chip, { backgroundColor: Colors.sage }]}
                  onPress={() => onRemove(city)}
                >
                  <Text style={cityPickerStyles.chipText} numberOfLines={1}>
                    {city}
                  </Text>
                  <HabixaIcon name="times" size={12} color={Colors.midnightInk} />
                </Pressable>
              ))}
            </View>
          )}

          {search.trim().length >= 2 && (
            <View style={[cityPickerStyles.suggestions, { borderBottomColor: colors.border }]}>
              {loading ? (
                <View style={cityPickerStyles.loadingRow}>
                  <Text style={[cityPickerStyles.loadingText, { color: colors.textSecondary }]}>
                    Searching...
                  </Text>
                </View>
              ) : suggestions.length > 0 ? (
                suggestions.slice(0, 8).map((s) => {
                  const cityName = s.mainText?.trim() || s.description?.split(',')[0]?.trim() || s.description;
                  const alreadyAdded = selectedCities.includes(cityName);
                  return (
                    <Pressable
                      key={s.placeId ?? s.description}
                      style={[
                        cityPickerStyles.suggestionRow,
                        { borderBottomColor: colors.border },
                        alreadyAdded && { opacity: 0.6 },
                      ]}
                      onPress={() => !alreadyAdded && handleSelectSuggestion(s)}
                      disabled={alreadyAdded}
                    >
                      <View style={cityPickerStyles.suggestionContent}>
                        <Text style={[cityPickerStyles.suggestionMain, { color: colors.text }]} numberOfLines={1}>
                          {s.mainText || s.description}
                        </Text>
                        {s.secondaryText ? (
                          <Text style={[cityPickerStyles.suggestionSub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {s.secondaryText}
                          </Text>
                        ) : null}
                      </View>
                      {alreadyAdded ? (
                        <HabixaIcon name="check" size={14} color={Colors.sage} solid />
                      ) : (
                        <HabixaIcon name="plus" size={14} color={colors.textSecondary} />
                      )}
                    </Pressable>
                  );
                })
              ) : (
                <View style={cityPickerStyles.loadingRow}>
                  <Text style={[cityPickerStyles.loadingText, { color: colors.textSecondary }]}>
                    No results. Try a different search or add manually below.
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={[cityPickerStyles.manualSection, { borderTopColor: colors.border }]}>
            <Text style={[cityPickerStyles.manualLabel, { color: colors.textSecondary }]}>
              Or add a city by name
            </Text>
            <View style={cityPickerStyles.manualRow}>
              <TextInput
                style={[
                  cityPickerStyles.manualInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g. Freeport, West Palm Beach"
                placeholderTextColor={colors.textSecondary}
                value={manualInput}
                onChangeText={setManualInput}
                onSubmitEditing={handleAddManual}
                returnKeyType="done"
              />
              <Pressable
                style={[cityPickerStyles.addBtn, { backgroundColor: Colors.sage }]}
                onPress={handleAddManual}
              >
                <Text style={cityPickerStyles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cityPickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  header: { padding: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: Fonts.display, fontSize: 20 },
  doneBtn: { padding: 4 },
  doneText: { fontFamily: Fonts.heading, fontSize: 16 },
  subtitle: { fontFamily: Fonts.body, fontSize: 13, marginBottom: 12 },
  search: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 0.5,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  chipText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.midnightInk },
  suggestions: { maxHeight: 220 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  suggestionContent: { flex: 1, marginRight: 12 },
  suggestionMain: { fontFamily: Fonts.body, fontSize: 16 },
  suggestionSub: { fontFamily: Fonts.body, fontSize: 12, marginTop: 2 },
  loadingRow: { padding: 16 },
  loadingText: { fontFamily: Fonts.body, fontSize: 14 },
  manualSection: { padding: 16, borderTopWidth: 0.5 },
  manualLabel: { fontFamily: Fonts.body, fontSize: 12, marginBottom: 8 },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: Fonts.body,
    fontSize: 15,
    borderWidth: 0.5,
  },
  addBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.midnightInk },
});

export function TargetingPickerModal({
  visible,
  onClose,
  onConfirm,
  title,
}: TargetingPickerModalProps) {
  const { colors } = useTheme();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  const regionOptions = useMemo((): RegionOption[] => {
    const opts: RegionOption[] = [];
    for (const code of selectedCountries) {
      const c = getCountry(code);
      if (c?.regions?.length) {
        for (const r of c.regions) {
          opts.push({
            value: `${code}-${r.shortCode}`,
            label: `${c.countryName} – ${r.name}`,
            countryCode: code,
            countryName: c.countryName,
            regionName: r.name,
          });
        }
      }
    }
    return opts;
  }, [selectedCountries]);

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleRegion = (value: string) => {
    setSelectedRegions((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    );
  };

  const handleSkip = () => {
    onConfirm(null);
    setSelectedCountries([]);
    setSelectedRegions([]);
    setSelectedCities([]);
    onClose();
  };

  const handleConfirm = () => {
    const hasTargeting =
      selectedCountries.length > 0 || selectedRegions.length > 0 || selectedCities.length > 0;
    onConfirm(
      hasTargeting
        ? {
            countries: selectedCountries,
            regions: selectedRegions,
            cities: selectedCities,
          }
        : null
    );
    setSelectedCountries([]);
    setSelectedRegions([]);
    setSelectedCities([]);
    onClose();
  };

  const addCity = (city: string) => {
    const name = city.trim();
    if (name && !selectedCities.includes(name)) {
      setSelectedCities((prev) => [...prev, name]);
    }
  };

  const removeCity = (city: string) => {
    setSelectedCities((prev) => prev.filter((c) => c !== city));
  };

  const regionSummary =
    selectedRegions.length === 0
      ? 'All regions'
      : selectedRegions.length === 1
        ? regionOptions.find((r) => r.value === selectedRegions[0])?.label ?? '1 region'
        : `${selectedRegions.length} regions selected`;

  const citySummary =
    selectedCities.length === 0
      ? 'All cities'
      : selectedCities.length === 1
        ? selectedCities[0]
        : `${selectedCities.length} cities selected`;

  const countrySummary =
    selectedCountries.length === 0
      ? 'All countries'
      : selectedCountries.length === 1
        ? getCountry(selectedCountries[0])?.countryName ?? selectedCountries[0]
        : `${selectedCountries.length} countries selected`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <HabixaIcon name="times" size={18} color={colors.text} />
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <View style={styles.closeBtn} />
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.question, { color: colors.text }]}>
              Where should your ad appear?
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Choose specific countries or show everywhere. You can always change this later.
            </Text>

            {/* Country selector - main CTA */}
            <Pressable
              style={[styles.countryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setCountryPickerOpen(true)}
            >
              <View style={styles.countryCardLeft}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(92,124,111,0.15)' }]}>
                  <HabixaIcon name="globe" size={22} color={Colors.sage} />
                </View>
                <View>
                  <Text style={[styles.countryCardTitle, { color: colors.text }]}>
                    {countrySummary}
                  </Text>
                  <Text style={[styles.countryCardSub, { color: colors.textSecondary }]}>
                    Tap to choose countries
                  </Text>
                </View>
              </View>
              <HabixaIcon name="chevron-right" size={16} color={colors.textSecondary} />
            </Pressable>

            {/* Selected countries as removable chips */}
            {selectedCountries.length > 0 && (
              <View style={styles.selectedSection}>
                <Text style={[styles.selectedLabel, { color: colors.textSecondary }]}>
                  Selected
                </Text>
                <View style={styles.chipRow}>
                  {selectedCountries.map((code) => {
                    const c = getCountry(code);
                    return (
                      <Pressable
                        key={code}
                        style={[styles.chip, { borderColor: Colors.sage, backgroundColor: 'rgba(92,124,111,0.08)' }]}
                        onPress={() => toggleCountry(code)}
                      >
                        <Text style={[styles.chipText, { color: Colors.sage }]}>
                          {c?.countryName ?? code}
                        </Text>
                        <HabixaIcon name="times" size={10} color={Colors.sage} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Optional: States/Regions - same card pattern as countries */}
            {selectedCountries.length > 0 && regionOptions.length > 0 && (
              <View style={styles.optionalSection}>
                <Text style={[styles.optionalLabel, { color: colors.textSecondary }]}>
                  Optional: Limit to specific states or regions
                </Text>
                <Pressable
                  style={[styles.countryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setRegionPickerOpen(true)}
                >
                  <View style={styles.countryCardLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: 'rgba(92,124,111,0.15)' }]}>
                      <HabixaIcon name="map-marker-alt" size={20} color={Colors.sage} />
                    </View>
                    <View>
                      <Text style={[styles.countryCardTitle, { color: colors.text }]}>
                        {regionSummary}
                      </Text>
                      <Text style={[styles.countryCardSub, { color: colors.textSecondary }]}>
                        Tap to choose states, provinces or islands
                      </Text>
                    </View>
                  </View>
                  <HabixaIcon name="chevron-right" size={16} color={colors.textSecondary} />
                </Pressable>
                {selectedRegions.length > 0 && (
                  <View style={[styles.chipRow, { marginTop: 10 }]}>
                    {selectedRegions.map((value) => {
                      const opt = regionOptions.find((r) => r.value === value);
                      return (
                        <Pressable
                          key={value}
                          style={[styles.chip, { borderColor: Colors.sage, backgroundColor: 'rgba(92,124,111,0.08)' }]}
                          onPress={() => toggleRegion(value)}
                        >
                          <Text style={[styles.chipText, { color: Colors.sage }]} numberOfLines={1}>
                            {opt?.regionName ?? value}
                          </Text>
                          <HabixaIcon name="times" size={10} color={Colors.sage} />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <RegionPickerModal
                  visible={regionPickerOpen}
                  onClose={() => setRegionPickerOpen(false)}
                  regionOptions={regionOptions}
                  selectedValues={selectedRegions}
                  onToggle={toggleRegion}
                  colors={colors}
                />
              </View>
            )}

            {/* Optional: Cities - same card pattern */}
            <View style={styles.optionalSection}>
              <Text style={[styles.optionalLabel, { color: colors.textSecondary }]}>
                Optional: Limit to specific cities
              </Text>
              <Pressable
                style={[styles.countryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setCityPickerOpen(true)}
              >
                <View style={styles.countryCardLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: 'rgba(92,124,111,0.15)' }]}>
                    <HabixaIcon name="city" size={20} color={Colors.sage} />
                  </View>
                  <View>
                    <Text style={[styles.countryCardTitle, { color: colors.text }]}>
                      {citySummary}
                    </Text>
                    <Text style={[styles.countryCardSub, { color: colors.textSecondary }]}>
                      Tap to search and choose cities
                    </Text>
                  </View>
                </View>
                <HabixaIcon name="chevron-right" size={16} color={colors.textSecondary} />
              </Pressable>
              {selectedCities.length > 0 && (
                <View style={[styles.chipRow, { marginTop: 10 }]}>
                  {selectedCities.map((city) => (
                    <Pressable
                      key={city}
                      style={[styles.chip, { borderColor: Colors.sage, backgroundColor: 'rgba(92,124,111,0.08)' }]}
                      onPress={() => removeCity(city)}
                    >
                      <Text style={[styles.chipText, { color: Colors.sage }]} numberOfLines={1}>
                        {city}
                      </Text>
                      <HabixaIcon name="times" size={10} color={Colors.sage} />
                    </Pressable>
                  ))}
                </View>
              )}
              <CityPickerModal
                visible={cityPickerOpen}
                onClose={() => setCityPickerOpen(false)}
                selectedCities={selectedCities}
                onAdd={addCity}
                onRemove={removeCity}
                colors={colors}
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]}
                onPress={handleSkip}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>
                  Show everywhere
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, { backgroundColor: Colors.sage }]}
                onPress={handleConfirm}
              >
                <Text style={styles.btnPrimaryText}>Continue</Text>
              </Pressable>
            </View>
          </ScrollView>

          <CountryPickerModal
            visible={countryPickerOpen}
            onClose={() => setCountryPickerOpen(false)}
            selectedCodes={selectedCountries}
            onToggle={toggleCountry}
            colors={colors}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 18 },
  scroll: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  question: { fontFamily: Fonts.display, fontSize: 20, marginBottom: 6 },
  hint: { fontFamily: Fonts.body, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  countryCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  countryCardTitle: { fontFamily: Fonts.heading, fontSize: 16 },
  countryCardSub: { fontFamily: Fonts.body, fontSize: 13, marginTop: 2 },
  selectedSection: { marginBottom: 16 },
  selectedLabel: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontFamily: Fonts.body, fontSize: 13 },
  optionalSection: { marginBottom: 20 },
  optionalLabel: { fontFamily: Fonts.body, fontSize: 12, marginBottom: 8 },
  input: {
    borderWidth: 0.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  actions: { gap: 10, marginTop: 8 },
  btn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnSecondary: { borderWidth: 0.5 },
  btnSecondaryText: { fontFamily: Fonts.heading, fontSize: 15 },
  btnPrimary: {},
  btnPrimaryText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.midnightInk },
});
