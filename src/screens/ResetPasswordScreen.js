import React, { useMemo, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import hrApi from '../api/hrApi';
import { sharedStyles, colors } from '../styles/theme';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;

function normalizeParam(value) {
  return String(value || '').trim();
}

function getQueryParamsFromWeb() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return {};
  try {
    const url = new URL(window.location.href);
    return {
      token: normalizeParam(url.searchParams.get('token')),
      email: normalizeParam(url.searchParams.get('email')),
    };
  } catch {
    return {};
  }
}

export default function ResetPasswordScreen() {
  const route = useRoute();
  const navigation = useNavigation();


  const initialParams = useMemo(() => {
    const routeParams = route?.params || {};
    const webParams = getQueryParamsFromWeb();
    return {
      token: normalizeParam(routeParams.token || routeParams.inviteToken || webParams.token),
      email: normalizeParam(routeParams.email || webParams.email).toLowerCase(),
    };
  }, [route?.params]);

  const [token] = useState(initialParams.token);
  const [email] = useState(initialParams.email);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isInviteFlow = !!token;

  const onSubmit = async () => {
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirm) {
      Alert.alert('Missing password', 'Please enter and confirm your new password.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      Alert.alert('Password mismatch', 'The passwords you entered do not match.');
      return;
    }

    if (!PASSWORD_REGEX.test(trimmedPassword)) {
      Alert.alert(
        'Weak password',
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isInviteFlow ? '/set-password' : '/reset-password';
      const payload = isInviteFlow
        ? { token, newPassword: trimmedPassword }
        : { email, newPassword: trimmedPassword };

      await hrApi.post(endpoint, payload);
      setIsSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert(
        'Could not update password',
        error?.response?.data?.error || error?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onReturnToLogin = () => {
    navigation.navigate('Login');
  };

  if (isSuccess) {
    return (
      <KeyboardAvoidingView style={sharedStyles.authRoot}>
        <ScrollView
          contentContainerStyle={sharedStyles.authScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={sharedStyles.authCard}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="check-circle" size={36} color="#16a34a" />
            </View>
            <Text style={[sharedStyles.authTitle, styles.successTitle]}>Password Updated</Text>
            <Text style={styles.subtitle}>
              Your password has been reset successfully. You can now log in with your new password.
            </Text>
            <TouchableOpacity
              style={[sharedStyles.primaryButton, styles.successButton]}
              onPress={onReturnToLogin}
              activeOpacity={0.85}
            >
              <Text style={sharedStyles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color="#374151" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock" size={32} color="#1d4ed8" />
          </View>

          <Text style={sharedStyles.authTitle}>
            {isInviteFlow ? 'Set Your Password' : 'Reset Password'}
          </Text>

          {isInviteFlow ? (
            <Text style={styles.subtitle}>
              Use the invite link from HR to create a new password for your Weisetech account.
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              Set a new password for{' '}
              <Text style={styles.emailBold}>{email}</Text>
            </Text>
          )}

          <View style={sharedStyles.authFieldGroup}>
            <Text style={sharedStyles.label}>New Password</Text>
            <View style={sharedStyles.authPasswordWrapper}>
              <TextInput
                style={[sharedStyles.input, sharedStyles.authPasswordInput]}
                placeholder="Min 8 chars, upper, lower, number, special"
                placeholderTextColor="#9ca3af"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={sharedStyles.authEyeButton}
                onPress={() => setShowPassword(prev => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={sharedStyles.authFieldGroup}>
            <Text style={sharedStyles.label}>Confirm Password</Text>
            <View style={sharedStyles.authPasswordWrapper}>
              <TextInput
                style={[sharedStyles.input, sharedStyles.authPasswordInput]}
                placeholder="Re-enter new password"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={sharedStyles.authEyeButton}
                onPress={() => setShowConfirmPassword(prev => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[sharedStyles.primaryButton, isSubmitting && styles.disabledButton]}
            onPress={onSubmit}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={sharedStyles.buttonText}>
                {isInviteFlow ? 'Set Password' : 'Reset Password'}
              </Text>
            )}
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
  emailBold: {
    fontWeight: '700',
    color: '#374151',
  },
  successTitle: {
    color: '#16a34a',
  },
  successButton: {
    backgroundColor: '#16a34a',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.75,
  },
});
