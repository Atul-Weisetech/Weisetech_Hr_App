import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext } from '../state/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import AppDrawer from './AppDrawer';
import EmployeeStack from './EmployeeStack';
import { colors, sharedStyles } from '../styles/theme';

const Stack = createNativeStackNavigator();

function SplashScreen() {
  return (
    <View style={sharedStyles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function RootNavigator() {
  const { user, isRestoring } = useContext(AuthContext);
  const canAccessAdminArea = user?.role === 'admin' || user?.role === 'hr';

  // While AsyncStorage is being read, show a neutral splash so the
  // login screen never flashes for already-authenticated users.
  if (isRestoring) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : canAccessAdminArea ? (
          <Stack.Screen name="App" component={AppDrawer} />
        ) : (
          <Stack.Screen name="Employee" component={EmployeeStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
