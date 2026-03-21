import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="review" />
      <Stack.Screen name="pay-rent" />
      <Stack.Screen name="complaint" />
      <Stack.Screen name="background-check" />
    </Stack>
  );
}
