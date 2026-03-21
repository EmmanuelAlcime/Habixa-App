import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';

export default function FileComplaintModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        <Text style={styles.title}>File Complaint</Text>
        <Text style={styles.subtitle}>Report + evidence</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>Complaint form coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.desertSand,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.terracotta,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.midnightInk,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.sage,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  placeholder: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.sage,
  },
});
