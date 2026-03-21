import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@habixa_permission_prompt_';

export type PermissionType = 'notifications' | 'media_library' | 'camera' | 'location';

export interface PermissionPromptConfig {
  title: string;
  message: string;
  icon: 'bell' | 'image' | 'camera' | 'map-marker-alt';
}

export function usePermissionPrompt(type: PermissionType) {
  const storageKey = `${PREFIX}${type}`;
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<PermissionPromptConfig | null>(null);
  const [resolver, setResolver] = useState<((granted: boolean) => void) | null>(null);

  const hasAskedBefore = useCallback(async (): Promise<boolean> => {
    try {
      const val = await AsyncStorage.getItem(storageKey);
      return val === 'true';
    } catch {
      return false;
    }
  }, [storageKey]);

  const markAsAsked = useCallback(async () => {
    try {
      await AsyncStorage.setItem(storageKey, 'true');
    } catch {
      // ignore
    }
  }, [storageKey]);

  const showPrompt = useCallback(
    (promptConfig: PermissionPromptConfig): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfig(promptConfig);
        setResolver(() => resolve);
        setVisible(true);
      });
    },
    []
  );

  const handleAllow = useCallback(() => {
    setVisible(false);
    const r = resolver;
    setResolver(null);
    setConfig(null);
    r?.(true);
  }, [resolver]);

  const handleNotNow = useCallback(async () => {
    setVisible(false);
    const r = resolver;
    setResolver(null);
    setConfig(null);
    await markAsAsked();
    r?.(false);
  }, [resolver, markAsAsked]);

  return {
    visible,
    config,
    showPrompt,
    handleAllow,
    handleNotNow,
    hasAskedBefore,
    markAsAsked,
  };
}
