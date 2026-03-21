import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { format, parseISO, isValid } from 'date-fns';

interface AvailableDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  colors: { text: string; textSecondary: string; card: string; border: string };
}

export function AvailableDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  colors,
}: AvailableDatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const date = value && isValid(parseISO(value)) ? parseISO(value) : new Date();
  const displayText = value && isValid(parseISO(value))
    ? format(parseISO(value), 'MMM d, yyyy')
    : placeholder;

  // Web: use native HTML date input (browser shows date picker)
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={format(new Date(), 'yyyy-MM-dd')}
        style={{
          width: '100%',
          height: 48,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: colors.border,
          backgroundColor: colors.card,
          color: colors.text,
          fontSize: 16,
          fontFamily: 'inherit',
        }}
      />
    );
  }

  // iOS / Android: use native DateTimePicker (not available on web)
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  const handleChange = (_: unknown, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  return (
    <View>
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.triggerText, { color: value ? colors.text : colors.textSecondary }]}>
          {displayText}
        </Text>
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>▼</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  triggerText: {
    fontSize: 16,
  },
  chevron: {
    fontSize: 10,
  },
});
