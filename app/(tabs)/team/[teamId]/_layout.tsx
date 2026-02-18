import { Stack } from 'expo-router';

export default function TeamDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="roster" />
    </Stack>
  );
}
