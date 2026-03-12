import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext } from '../state/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import AppDrawer from './AppDrawer';
import EmployeeStack from './EmployeeStack';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user } = useContext(AuthContext);

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
