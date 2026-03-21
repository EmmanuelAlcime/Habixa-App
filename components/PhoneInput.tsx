import { useState, useEffect } from 'react';
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
import { parsePhoneNumber, type CountryCode } from 'libphonenumber-js';
import { getCountryCallingCode } from 'libphonenumber-js/max';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Fonts } from '@/constants/theme';

// Common countries for the picker (ISO 3166-1 alpha-2)
const COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: 'US', name: 'United States' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'HT', name: 'Haiti' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'BB', name: 'Barbados' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'GD', name: 'Grenada' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'DM', name: 'Dominica' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'CU', name: 'Cuba' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'IN', name: 'India' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
].sort((a, b) => a.name.localeCompare(b.name));

interface PhoneInputProps {
  value: string;
  onChange: (phone: string, countryCode: string) => void;
  defaultCountry?: string;
  style?: object;
}

/**
 * Phone input with country picker. Value/onChange use E.164 format.
 */
export function PhoneInput({
  value,
  onChange,
  defaultCountry = 'US',
  style,
}: PhoneInputProps) {
  const { colors } = useTheme();
  const [country, setCountry] = useState<CountryCode>(() => {
    if (value?.startsWith('+')) {
      try {
        const p = parsePhoneNumber(value);
        return (p?.country ?? defaultCountry) as CountryCode;
      } catch {
        return (defaultCountry as CountryCode) || 'US';
      }
    }
    return (defaultCountry as CountryCode) || 'US';
  });
  const [nationalNumber, setNationalNumber] = useState(() => {
    if (!value || !value.startsWith('+')) return '';
    try {
      const p = parsePhoneNumber(value);
      return p ? p.nationalNumber : value.replace(/\D/g, '');
    } catch {
      return value.replace(/\D/g, '');
    }
  });
  const [modalOpen, setModalOpen] = useState(false);

  // Sync from parent when value changes (e.g. profile load, form reset)
  useEffect(() => {
    if (!value || !value.startsWith('+')) {
      setNationalNumber('');
      return;
    }
    try {
      const p = parsePhoneNumber(value);
      if (p) {
        setNationalNumber(p.nationalNumber);
        setCountry((p.country ?? defaultCountry) as CountryCode);
      }
    } catch {
      // Don't overwrite on parse failure - could corrupt (e.g. include country code)
    }
  }, [value, defaultCountry]);

  const callingCode = getCountryCallingCode(country);

  // Display raw digits only - formatted display (parens, spaces) causes cursor/backspace
  // bugs with controlled TextInput on React Native
  const displayValue = nationalNumber.replace(/\D/g, '');

  const handleTextChange = (digits: string) => {
    setNationalNumber(digits);
    if (digits.length > 0) {
      try {
        const full = `+${callingCode}${digits}`;
        const parsed = parsePhoneNumber(full);
        if (parsed) {
          onChange(parsed.format('E.164'), parsed.country ?? country);
        } else {
          onChange(full, country);
        }
      } catch {
        onChange(`+${callingCode}${digits}`, country);
      }
    } else {
      onChange('', country);
    }
  };

  const handleCountrySelect = (c: CountryCode) => {
    setCountry(c);
    setModalOpen(false);
    const digits = nationalNumber.replace(/\D/g, '');
    if (digits.length > 0) {
      try {
        const newCode = getCountryCallingCode(c);
        const full = `+${newCode}${digits}`;
        const parsed = parsePhoneNumber(full);
        if (parsed) {
          onChange(parsed.format('E.164'), c);
        } else {
          onChange(full, c);
        }
      } catch {
        onChange(`+${getCountryCallingCode(c)}${digits}`, c);
      }
    }
  };

  const currentCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={styles.countryBtn}
          onPress={() => setModalOpen(true)}
        >
          <Text style={[styles.flag, { color: colors.text }]}>{currentCountry.code}</Text>
          <Text style={[styles.code, { color: colors.textSecondary }]}>+{callingCode}</Text>
          <HabixaIcon name="chevron-down" size={12} color={colors.textSecondary} />
        </Pressable>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Phone number"
          placeholderTextColor={colors.textSecondary}
          value={displayValue}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, '');
            handleTextChange(digits);
          }}
          keyboardType="phone-pad"
        />
      </View>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select country</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.optionRow,
                    { borderBottomColor: colors.border },
                    item.code === country && { backgroundColor: 'rgba(194, 103, 58, 0.15)' },
                  ]}
                  onPress={() => handleCountrySelect(item.code)}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.optionCode, { color: colors.textSecondary }]}>
                    +{getCountryCallingCode(item.code)}
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

export function isValidPhoneForSubmit(phone: string): boolean {
  if (!phone || !phone.startsWith('+')) return false;
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed?.isValid() ?? false;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  wrapper: { minHeight: 52 },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  flag: { fontFamily: Fonts.label, fontSize: 12 },
  code: { fontFamily: Fonts.body, fontSize: 14 },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
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
  modalTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  optionText: { fontFamily: Fonts.body, fontSize: 16 },
  optionCode: { fontFamily: Fonts.label, fontSize: 12 },
});
