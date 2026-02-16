import { View, ActivityIndicator, Text } from 'react-native';

export default function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-gray-600">Loading...</Text>
    </View>
  );
}
