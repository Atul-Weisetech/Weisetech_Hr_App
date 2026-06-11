import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, View, TouchableOpacity, Text } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import EmpDashboardScreen from './employee/EmpDashboardScreen';
import EmpPayrollScreen from './employee/EmpPayrollScreen';
import EmpNotificationScreen from './employee/EmpNotificationScreen';
import EmpLeaveScreen from './employee/EmpLeaveScreen';
import EmpWfhScreen from './employee/EmpWfhScreen';
import { sharedStyles, colors } from '../styles/theme';

const TABS = [
  { key: 'dashboard',    label: 'Home',         icon: 'home-outline',           component: EmpDashboardScreen },
  { key: 'payroll',      label: 'Payroll',       icon: 'cash-multiple',          component: EmpPayrollScreen },
  { key: 'notification', label: 'Notification',  icon: 'bell-outline',           component: EmpNotificationScreen },
  { key: 'leave',        label: 'Leave',         icon: 'calendar-month-outline', component: EmpLeaveScreen },
  { key: 'wfh',          label: 'WFH',           icon: 'home-city-outline',      component: EmpWfhScreen },
];

export default function HRDashboardScreen() {
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ],
        { cancelable: true },
      );
      return true;
    });
    return () => sub.remove();
  }, [activeTab]);

  const ActiveScreen = TABS.find(t => t.key === activeTab)?.component;

  return (
    <View style={sharedStyles.bottomTabContainer}>
      <View style={sharedStyles.bottomTabScreenContainer}>
        {ActiveScreen && <ActiveScreen onNavigateTab={setActiveTab} />}
      </View>

      <View style={sharedStyles.bottomTabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={sharedStyles.bottomTabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              {isActive && <View style={sharedStyles.bottomTabIndicator} />}
              <MaterialCommunityIcons
                name={tab.icon}
                size={20}
                color={isActive ? colors.primary : '#9ca3af'}
                style={sharedStyles.bottomTabIcon}
              />
              <Text style={[sharedStyles.bottomTabLabel, isActive && sharedStyles.bottomTabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
