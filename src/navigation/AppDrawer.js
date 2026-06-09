import React, { useContext } from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { TouchableOpacity, Text, View, Alert } from 'react-native';
import { AuthContext } from '../state/AuthContext';

import HRDashboardScreen from '../screens/HRDashboardScreen';
import EmployeeDetailsScreen from '../screens/EmployeeDetailsScreen';
import ManagePayrollScreen from '../screens/ManagePayrollScreen';
import ManageLeaveRequestScreen from '../screens/ManageLeaveRequestScreen';
import ManageWfhScreen from '../screens/ManageWfhScreen';
import PerformanceWarningScreen from '../screens/PerformanceWarningScreen';
import HolidayScreen from '../screens/HolidayScreen';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const { signOut } = useContext(AuthContext);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1, paddingBottom: 0 }}
    >
      <View style={{ paddingTop: 8, paddingBottom: 8 }}>
        <DrawerItemList {...props} />
      </View>

      <View
        style={{
          marginTop: 'auto',
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        }}
      >
       <TouchableOpacity
  onPress={() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ],
      { cancelable: true }
    );
  }}
  activeOpacity={0.85}
  style={{
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  <Text style={{ color: '#fff', fontWeight: '700' }}>
    Logout
  </Text>
</TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function AppDrawer() {
  const { user } = useContext(AuthContext);
  const userName = String(user?.name || '').trim();

  return (
    <Drawer.Navigator
      initialRouteName="EmployeeDetails"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerTitle: () => (
          <View>
            <Text style={{ fontWeight: '700', fontSize: 18, color: '#0f172a' }}>
              Welcome,
            </Text>
            {userName ? (
              <Text style={{ fontSize: 12, color: '#0f172a', marginTop: 1 }}>
                {userName}
              </Text>
            ) : null}
          </View>
        ),
        drawerPosition: 'right',
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: '100' },
        drawerActiveTintColor: '#e11d48',
        drawerInactiveTintColor: '#0f172a',
        drawerLabelStyle: { fontSize: 15 },
        headerRight: () => (
          <TouchableOpacity
            onPress={navigation.toggleDrawer}
            style={{
              marginLeft: 12,
              paddingVertical: 6,
              paddingHorizontal: 8,
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 22,
                lineHeight: 22,
                fontWeight: '900',
                color: '#0f172a',
              }}
            >
              ☰
            </Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen
        name="MyDashboard"
        component={HRDashboardScreen}
        options={{
          drawerLabel: 'My Dashboard',
          drawerItemStyle: user?.role === 'hr' ? undefined : { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="EmployeeDetails"
        component={EmployeeDetailsScreen}
        options={{ drawerLabel: 'Employee Details' }}
      />
      <Drawer.Screen
        name="ManagePayroll"
        component={ManagePayrollScreen}
        options={{ drawerLabel: 'Manage Payroll' }}
      />
      <Drawer.Screen
        name="ManageLeaveRequest"
        component={ManageLeaveRequestScreen}
        options={{ drawerLabel: 'Manage Leave Request' }}
      />
      <Drawer.Screen
        name="ManageWFH"
        component={ManageWfhScreen}
        options={{ drawerLabel: 'Manage Work From Home' }}
      />
      <Drawer.Screen
        name="PerformanceWarning"
        component={PerformanceWarningScreen}
        options={{ drawerLabel: 'Performance Warning' }}
      />
      <Drawer.Screen
        name="Holidays"
        component={HolidayScreen}
        options={{ drawerLabel: 'Holidays' }}
      />
    </Drawer.Navigator>
  );
}

