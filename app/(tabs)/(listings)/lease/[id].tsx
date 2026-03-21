import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';

export default function LeaseManagerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Lease Manager</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.subtitle}>Register + track rent</Text>
        <Text style={styles.text}>Lease #{id}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    marginRight: 16,
  },
  backText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.terracotta,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.midnightInk,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.sage,
    marginBottom: 16,
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.midnightInk,
  },
});
