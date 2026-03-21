import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="pay-history" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="complaints" />
      <Stack.Screen name="leases" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="two-factor-auth" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="connect/return" />
      <Stack.Screen name="connect/refresh" />
    </Stack>
  );
}
