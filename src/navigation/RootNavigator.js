import React, { useContext } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext } from '../state/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import AppDrawer from './AppDrawer';
import EmployeeStack from './EmployeeStack';

const Stack = createNativeStackNavigator();

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#CC0D49" />
    </View>
  );
}

export default function RootNavigator() {
  const { user, isRestoring } = useContext(AuthContext);

  // While AsyncStorage is being read, show a neutral splash so the
  // login screen never flashes for already-authenticated users.
  if (isRestoring) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'admin' ? (
          <Stack.Screen name="App" component={AppDrawer} />
        ) : (
          <Stack.Screen name="Employee" component={EmployeeStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
