import React, { useContext, useState } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../state/AuthContext';
import { sharedStyles } from '../styles/theme';

export default function LoginScreen() {
  const { signIn, isLoading } = useContext(AuthContext);
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotLinkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
});
