import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import hrApi from '../api/hrApi';
import { sharedStyles } from '../styles/theme';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onVerifyEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Enter email', 'Please enter your registered email address.');
      return;
    }
    setIsLoading(true);
    try {
      await hrApi.post('/forgot-password', { email: trimmed });
      navigation.navigate('ResetPassword', { email: trimmed });
    } catch (error) {
      const serverMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Could not verify your email. Please try again.';

      if (error?.response?.status === 404) {
        Alert.alert('Account not found', serverMessage);
      } else {
        Alert.alert('Request failed', serverMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={sharedStyles.authRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={sharedStyles.authScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={sharedStyles.authCard}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={16} color="#374151" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock" size={32} color="#1d4ed8" />
          </View>

          <Text style={sharedStyles.authTitle}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your registered email address and we'll verify your account.
          </Text>

          <View style={sharedStyles.authFieldGroup}>
            <Text style={sharedStyles.label}>Email</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[sharedStyles.primaryButton, isLoading && styles.disabledButton]}
            onPress={onVerifyEmail}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#ffffff" size="small" />
              : <Text style={sharedStyles.buttonText}>Verify Email</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
  },
  backText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  iconContainer: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.75,
  },
});
