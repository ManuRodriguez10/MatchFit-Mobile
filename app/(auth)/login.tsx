import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      {/* Header */}
      <View className="mb-8">
        <Text className="text-4xl font-bold text-blue-600 mb-2">MatchFit</Text>
        <Text className="text-gray-600">Sign in to your account</Text>
      </View>

      {/* Email Input */}
      <View className="mb-4">
        <Text className="text-gray-700 font-semibold mb-2">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Password Input */}
      <View className="mb-6">
        <Text className="text-gray-700 font-semibold mb-2">Password</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          secureTextEntry
        />
      </View>

      {/* Login Button */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        className="bg-blue-600 py-3 rounded-lg mb-4 active:bg-blue-700"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-center text-lg">Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Sign Up Link */}
      <View className="flex-row justify-center">
        <Text className="text-gray-600">Don't have an account? </Text>
        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity>
            <Text className="text-blue-600 font-semibold">Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
