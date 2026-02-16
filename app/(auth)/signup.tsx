import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('athlete');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, fullName, role);
    } catch (error) {
      Alert.alert('Sign Up Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 pt-8 pb-12">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-4xl font-bold text-blue-600 mb-2">MatchFit</Text>
          <Text className="text-gray-600">Create your account</Text>
        </View>

        {/* Full Name Input */}
        <View className="mb-4">
          <Text className="text-gray-700 font-semibold mb-2">Full Name</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />
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
        <View className="mb-4">
          <Text className="text-gray-700 font-semibold mb-2">Password</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
          />
        </View>

        {/* Role Selection */}
        <View className="mb-6">
          <Text className="text-gray-700 font-semibold mb-3">Role</Text>
          <View className="flex-row gap-3">
            {(['athlete', 'coach'] as UserRole[]).map((roleOption) => (
              <TouchableOpacity
                key={roleOption}
                onPress={() => setRole(roleOption)}
                disabled={loading}
                className={`flex-1 py-3 rounded-lg border-2 ${
                  role === roleOption
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <Text
                  className={`text-center font-semibold capitalize ${
                    role === roleOption ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {roleOption}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          className="bg-blue-600 py-3 rounded-lg mb-4 active:bg-blue-700"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View className="flex-row justify-center">
          <Text className="text-gray-600">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-semibold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
