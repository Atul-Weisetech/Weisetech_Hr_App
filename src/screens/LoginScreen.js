import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../state/AuthContext';
import { sharedStyles } from '../styles/theme';
import hrApi from '../api/hrApi';

export default function LoginScreen() {
  const { signIn, isLoading } = useContext(AuthContext);
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fpVisible, setFpVisible] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  const onLoginPress = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Missing details', 'Please enter email and password.');
      return;
    }

    const result = await signIn({ email: trimmedEmail, password: trimmedPassword });
    if (!result.ok) {
      Alert.alert('Login failed', result.message);
    }
  };

  const openForgotPassword = () => {
    setFpEmail('');
    setFpVisible(true);
  };

  const onForgotPasswordSubmit = async () => {
    const trimmed = fpEmail.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Enter email', 'Please enter your registered email address.');
      return;
    }
    setFpLoading(true);
    try {
      await hrApi.post('/auth/forgot-password', { email: trimmed });
      setFpVisible(false);
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
      setFpLoading(false);
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
        <View style={sharedStyles.authLogoContainer}>
          <Image
            source={require('../assets/weisetechLogo.png')}
            style={sharedStyles.authLogoImage}
            resizeMode="contain"
          />
        </View>
        <View style={sharedStyles.authCard}>
          <Text style={sharedStyles.authTitle}>Log In</Text>

          <View style={sharedStyles.authFieldGroup}>
            <Text style={sharedStyles.label}>Email </Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={sharedStyles.authFieldGroup}>
            <Text style={sharedStyles.label}>Password</Text>
            <View style={sharedStyles.authPasswordWrapper}>
              <TextInput
                style={[sharedStyles.input, sharedStyles.authPasswordInput]}
                placeholder="********"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
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

          <TouchableOpacity
            style={[sharedStyles.primaryButton, isLoading && styles.loginButtonDisabled]}
            activeOpacity={0.85}
            onPress={onLoginPress}
            disabled={isLoading}
          >
            <Text style={sharedStyles.buttonText}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={openForgotPassword}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotLinkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={fpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Forgot Password?</Text>
            <Text style={styles.modalSubtitle}>
              Enter your registered email address and we’ll verify the account so you can reset your password.
            </Text>

            <Text style={[sharedStyles.label, { marginTop: 16 }]}>Email</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={fpEmail}
              onChangeText={setFpEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!fpLoading}
            />

            <TouchableOpacity
              style={[sharedStyles.primaryButton, { marginTop: 16 }, fpLoading && styles.loginButtonDisabled]}
              onPress={onForgotPasswordSubmit}
              activeOpacity={0.85}
              disabled={fpLoading}
            >
              {fpLoading
                ? <ActivityIndicator color="#ffffff" size="small" />
                : <Text style={sharedStyles.buttonText}>Verify Email</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setFpVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loginButtonDisabled: {
    opacity: 0.75,
  },
  forgotLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  forgotLinkText: {
    fontSize: 14,
    color: '#e11d48',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  modalEmailBold: {
    fontWeight: '700',
    color: '#374151',
  },
  modalCancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
});
