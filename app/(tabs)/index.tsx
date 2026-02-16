import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      console.error('Sign out error:', error);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="text-3xl font-bold text-blue-600 mb-4">
        Welcome to MatchFit
      </Text>

      {profile && (
        <View className="items-center mb-8">
          <Text className="text-xl text-gray-800 mb-2">
            Hello, {profile.full_name}!
          </Text>
          <Text className="text-sm text-gray-600 capitalize">
            Role: {profile.role}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {user?.email}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSignOut}
        className="bg-red-500 px-6 py-3 rounded-lg active:bg-red-600"
      >
        <Text className="text-white font-semibold text-base">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
