import React, { useContext } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext } from '../state/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import AppDrawer from './AppDrawer';
import EmployeeStack from './EmployeeStack';
import { colors, sharedStyles } from '../styles/theme';

const AuthStack = createNativeStackNavigator();
const ProtectedStack = createNativeStackNavigator();

function SplashScreen() {
  return (
    <View style={sharedStyles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const linking = {
  prefixes: [
    'weisetechhrapp://',
    ...(Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
      ? [window.location.origin]
      : []),
  ],
  config: {
    screens: {
      Login: 'login',
      ResetPassword: 'reset-password',
      App: 'app',
      Employee: 'employee',
    },
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function ProtectedNavigator({ canAccessAdminArea }) {
  return (
    <ProtectedStack.Navigator screenOptions={{ headerShown: false }}>
      {canAccessAdminArea ? (
        <ProtectedStack.Screen name="App" component={AppDrawer} />
      ) : (
        <ProtectedStack.Screen name="Employee" component={EmployeeStack} />
      )}
      <ProtectedStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </ProtectedStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isRestoring } = useContext(AuthContext);
  const canAccessAdminArea = user?.role === 'admin' || user?.role === 'hr';

  // While AsyncStorage is being read, show a neutral splash so the
  // login screen never flashes for already-authenticated users.
  if (isRestoring) return <SplashScreen />;

  return (
    <NavigationContainer linking={linking}>
      {!user ? (
        <AuthNavigator />
      ) : (
        <ProtectedNavigator canAccessAdminArea={canAccessAdminArea} />
      )}
    </NavigationContainer>
  );
}
