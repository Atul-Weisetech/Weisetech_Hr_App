import React, { useContext, useEffect, useMemo, useState } from 'react';
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
  Image,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import hrApi from '../api/hrApi';
import { AuthContext } from '../state/AuthContext';
import { sharedStyles, colors } from '../styles/theme';

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
  const { signOut } = useContext(AuthContext);

  const initialParams = useMemo(() => {
    const routeParams = route?.params || {};
    const webParams = getQueryParamsFromWeb();

    return {
      token: normalizeParam(routeParams.token || routeParams.inviteToken || webParams.token),
      email: normalizeParam(routeParams.email || webParams.email).toLowerCase(),
    };
  }, [route?.params]);

  const [token, setToken] = useState(initialParams.token);
  const [email, setEmail] = useState(initialParams.email);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setToken(initialParams.token);
    setEmail(initialParams.email);
  }, [initialParams]);

  const isInviteFlow = !!token;
  const heading = isInviteFlow ? 'Set Your Password' : 'Reset Password';
  const subheading = isInviteFlow
    ? 'Use the invite link from HR to create a new password for your Weisetech account.'
    : 'Verify your email and choose a new password to regain access.';

  const submitLabel = isInviteFlow ? 'Set Password' : 'Reset Password';

  const onSubmit = async () => {
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (isInviteFlow && !token) {
      Alert.alert('Missing token', 'The invite link is missing its token.');
      return;
    }

    if (!isInviteFlow && !trimmedEmail) {
      Alert.alert('Email required', 'Enter the registered email address.');
      return;
    }

    if (!trimmedPassword || !trimmedConfirm) {
      Alert.alert('Missing password', 'Please enter and confirm your new password.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      Alert.alert('Password mismatch', 'The passwords you entered do not match.');
      return;
    }

    if (trimmedPassword.length < 8) {
      Alert.alert('Weak password', 'Please choose a password that is at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isInviteFlow ? '/auth/set-password' : '/auth/reset-password';
      const payload = isInviteFlow
        ? { token, newPassword: trimmedPassword }
        : { email: trimmedEmail, newPassword: trimmedPassword };

      await hrApi.post(endpoint, payload);
      setIsSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password updated',
        isInviteFlow
          ? 'Your password was set successfully. You can now log in with the new password.'
          : 'Your password was reset successfully. You can now log in with the new password.',
      );
    } catch (error) {
      Alert.alert(
        'Could not update password',
        error?.response?.data?.error || error?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onReturnToLogin = async () => {
    await signOut();
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
        <View style={sharedStyles.authLogoContainer}>
          <Image
            source={require('../assets/weisetechLogo.png')}
            style={sharedStyles.authLogoImage}
            resizeMode="contain"
          />
        </View>

        <View style={sharedStyles.authCard}>
          <Text style={sharedStyles.authTitle}>{heading}</Text>
          <Text style={styles.subtitle}>{subheading}</Text>

          {isSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Password updated</Text>
              <Text style={styles.successText}>
                Your account password has been changed. Use the button below to go back to the login screen.
              </Text>
              <TouchableOpacity
                style={[sharedStyles.primaryButton, styles.returnButton]}
                onPress={onReturnToLogin}
                activeOpacity={0.85}
              >
                <Text style={sharedStyles.buttonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isInviteFlow ? (
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
                editable={!isSubmitting}
              />
            </View>
          ) : (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Invite link detected</Text>
              <Text style={styles.tokenText} numberOfLines={2}>
                This reset flow was opened from the invite email sent by HR.
              </Text>
            </View>
          )}

          <View style={sharedStyles.authFieldGroup}>
            <Text style={sharedStyles.label}>New Password</Text>
            <View style={sharedStyles.authPasswordWrapper}>
              <TextInput
                style={[sharedStyles.input, sharedStyles.authPasswordInput]}
                placeholder="Create a strong password"
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
                <Text style={sharedStyles.authEyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={sharedStyles.authFieldGroup}>
            <Text style={sharedStyles.label}>Confirm Password</Text>
            <View style={sharedStyles.authPasswordWrapper}>
              <TextInput
                style={[sharedStyles.input, sharedStyles.authPasswordInput]}
                placeholder="Re-enter your password"
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
                <Text style={sharedStyles.authEyeText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
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
              <Text style={sharedStyles.buttonText}>{submitLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 18,
  },
  tokenBox: {
    marginBottom: 18,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    fontWeight: '600',
  },
  successBox: {
    marginBottom: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    padding: 14,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 6,
  },
  successText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#166534',
    marginBottom: 12,
    fontWeight: '600',
  },
  returnButton: {
    backgroundColor: '#16a34a',
  },
  disabledButton: {
    opacity: 0.75,
  },
});
