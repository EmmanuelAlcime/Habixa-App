import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import type { PermissionPromptConfig } from '@/hooks/usePermissionPrompt';

interface PermissionPromptProps {
  visible: boolean;
  config: PermissionPromptConfig | null;
  onAllow: () => void;
  onNotNow: () => void;
}

export function PermissionPrompt({
  visible,
  config,
  onAllow,
  onNotNow,
}: PermissionPromptProps) {
  const { colors } = useTheme();

  if (!config) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onNotNow}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.background }]}>
            <HabixaIcon
              name={config.icon}
              size={32}
              color={Colors.terracotta}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {config.message}
          </Text>
          <Pressable
            style={[styles.allowBtn]}
            onPress={onAllow}
          >
            <Text style={styles.allowBtnText}>Allow</Text>
          </Pressable>
          <Pressable style={styles.notNowBtn} onPress={onNotNow}>
            <Text style={[styles.notNowText, { color: colors.textSecondary }]}>
              Not now
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  allowBtn: {
    width: '100%',
    backgroundColor: Colors.terracotta,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  allowBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.desertSand,
  },
  notNowBtn: {
    paddingVertical: 8,
  },
  notNowText: {
    fontFamily: Fonts.body,
    fontSize: 15,
  },
});
