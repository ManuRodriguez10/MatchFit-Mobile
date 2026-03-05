import { Stack } from 'expo-router';

export default function TeamLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[teamId]" options={{ headerShown: false }} />
      <Stack.Screen
        name="create-event"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="event-detail" options={{ headerShown: false }} />
      <Stack.Screen name="edit-event" options={{ headerShown: false }} />
      <Stack.Screen name="select-game" options={{ headerShown: false }} />
      <Stack.Screen name="invite-players" options={{ headerShown: false }} />
      <Stack.Screen name="lineup-builder" options={{ headerShown: false }} />
      <Stack.Screen name="delete-team" options={{ headerShown: false }} />
      <Stack.Screen name="import-roster" options={{ headerShown: false }} />
      <Stack.Screen
        name="create"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="join"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="team-setup"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
