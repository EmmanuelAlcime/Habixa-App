/**
 * Analytics route — redirects to Manage (analytics is now inline there).
 * Preserves ?upgrade=success for payment flow.
 */
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function AnalyticsRedirectScreen() {
  const { id, upgrade } = useLocalSearchParams<{ id: string; upgrade?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    const params = upgrade ? { upgrade } : undefined;
    router.replace({
      pathname: '/(tabs)/(listings)/manage/[id]',
      params: { id, ...params },
    });
  }, [id, upgrade, router]);

  return null;
}
