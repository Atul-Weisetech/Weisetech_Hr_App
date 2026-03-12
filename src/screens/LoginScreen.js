import React, { useContext, useState } from 'react';
import {
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
import { AuthContext } from '../state/AuthContext';

export default function LoginScreen() {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mock users — replace with real API call when backend is ready
  const MOCK_USERS = [
    { id: 'ADMIN-001', name: 'HR Admin', email: 'admin@company.com', role: 'admin' },
    { id: 'EMP-001', name: 'Rajvi Gajjar', email: 'rajvi@company.com', role: 'employee' },
    { id: 'EMP-002', name: 'Atul Sengar', email: 'atul@gmail.com', role: 'employee' },
    { id: 'EMP-003', name: 'Om Gajjar', email: 'omgajjar41@gmail.com', role: 'employee' },
  ];

  const onLoginPress = () => {
    const found = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (found) {
      signIn(found);
    } else if (email.trim()) {
      // fallback: treat unknown email as admin if contains 'admin', else employee
      signIn({
        id: 'EMP-000',
        name: email.split('@')[0],
        email: email.trim(),
        role: email.toLowerCase().includes('admin') ? 'admin' : 'employee',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
       <View style={styles.logoContainer}>
        <Image
       source={require('../assets/weisetechLogo.png')} 
       style={styles.logoImage}
       resizeMode="contain"
       />
        </View>
        <View style={styles.card}>
          <Text style={styles.signInTitle}>Sign In</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(prev => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={onLoginPress}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
 logoContainer: {
  alignItems: 'center',
  marginBottom: 28,
},

logoImage: {
  width: 200,
  height: 110,
},
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  signInTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1d4ed8',
    textAlign: 'center',
    marginBottom: 22,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 20,
  },
  loginButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e11d48',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});

