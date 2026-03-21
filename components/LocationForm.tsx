import { useState, useMemo } from 'react';
import type { RefObject } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Platform,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Fonts } from '@/constants/theme';
import {
  countries,
  getCountry,
  getSubdivisionLabel,
  type CountryData,
  type Region,
} from '@/lib/countryAddressData';

export interface LocationValue {
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

interface LocationFormProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  style?: object;
  /** Optional ref for the City TextInput (e.g. for keyboard Next from address field). */
  cityInputRef?: RefObject<TextInput | null>;
}

export function LocationForm({ value, onChange, style, cityInputRef }: LocationFormProps) {
  const { colors } = useTheme();
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const countryData = value.country ? getCountry(value.country) : null;
  const regionLabel = value.country ? getSubdivisionLabel(value.country) : 'Region';
  const showRegion = countryData?.subdivisionType != null;
  const showPostalCode = countryData?.hasPostalCode ?? true;

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter(
      (c) =>
        c.countryName.toLowerCase().includes(q) ||
        c.countryShortCode.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const regionOptions = countryData?.regions ?? [];

  const handleCountrySelect = (c: CountryData) => {
    onChange({
      ...value,
      country: c.countryShortCode,
      region: '',
    });
    setCountryModalOpen(false);
  };

  const handleRegionSelect = (r: Region) => {
    onChange({ ...value, region: r.shortCode });
    setRegionModalOpen(false);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Country */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Country</Text>
      <Pressable
        style={[
          styles.select,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => setCountryModalOpen(true)}
      >
        <Text
          style={[
            styles.selectText,
            { color: value.country ? colors.text : colors.textSecondary },
          ]}
        >
          {value.country
            ? countries.find((c) => c.countryShortCode === value.country)?.countryName ??
              value.country
            : 'Select country'}
        </Text>
        <HabixaIcon name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>

      {/* City */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>City</Text>
      <TextInput
        ref={cityInputRef}
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
        ]}
        placeholder="City"
        placeholderTextColor={colors.textSecondary}
        value={value.city}
        onChangeText={(city) => onChange({ ...value, city })}
        autoCapitalize="words"
        returnKeyType="next"
      />

      {/* Region (State/Province/Island) - conditional */}
      {showRegion && (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {regionLabel}
          </Text>
          {regionOptions.length > 0 ? (
            <Pressable
              style={[
                styles.select,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setRegionModalOpen(true)}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: value.region ? colors.text : colors.textSecondary },
                ]}
              >
                {value.region
                  ? (regionOptions.find((r) => r.shortCode === value.region)?.name ?? value.region)
                  : `Select ${regionLabel.toLowerCase()}`}
              </Text>
              <HabixaIcon name="chevron-down" size={14} color={colors.textSecondary} />
            </Pressable>
          ) : (
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              placeholder={regionLabel}
              placeholderTextColor={colors.textSecondary}
              value={value.region}
              onChangeText={(region) => onChange({ ...value, region })}
              autoCapitalize="words"
            />
          )}
        </>
      )}

      {/* Postal code - conditional */}
      {showPostalCode && (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Zip / Postal code
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Zip or postal code"
            placeholderTextColor={colors.textSecondary}
            value={value.postalCode}
            onChangeText={(postalCode) => onChange({ ...value, postalCode })}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </>
      )}

      {/* Country picker modal */}
      <Modal
        visible={countryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCountryModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCountryModalOpen(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select country
              </Text>
              <TextInput
                style={[
                  styles.searchInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="Search..."
                placeholderTextColor={colors.textSecondary}
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.countryShortCode}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.optionRow,
                    { borderBottomColor: colors.border },
                    item.countryShortCode === value.country && { backgroundColor: 'rgba(194, 103, 58, 0.15)' },
                  ]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {item.countryName}
                  </Text>
                  <Text style={[styles.optionCode, { color: colors.textSecondary }]}>
                    {item.countryShortCode}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Region picker modal */}
      <Modal
        visible={regionModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRegionModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRegionModalOpen(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>
              Select {regionLabel.toLowerCase()}
            </Text>
            <FlatList
              data={regionOptions}
              keyExtractor={(item) => item.shortCode}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.optionRow,
                    { borderBottomColor: colors.border },
                    item.shortCode === value.region && { backgroundColor: 'rgba(194, 103, 58, 0.15)' },
                  ]}
                  onPress={() => handleRegionSelect(item)}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontFamily: Fonts.label,
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 1,
  },
  select: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  optionText: {
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  optionCode: {
    fontFamily: Fonts.label,
    fontSize: 12,
  },
});
