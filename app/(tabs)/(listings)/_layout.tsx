import { Stack } from 'expo-router';

export default function ListingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="manage/[id]" />
      <Stack.Screen name="analytics/[id]" />
      <Stack.Screen name="listing/[id]" />
      <Stack.Screen name="lease/[id]" />
      <Stack.Screen name="applicants/[id]" />
    </Stack>
  );
}
