import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  text: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontFamily: UI.typography.medium,
    fontSize: 15,
  },
});
