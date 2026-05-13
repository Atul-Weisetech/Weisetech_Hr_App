import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import EmpDashboardScreen from '../screens/employee/EmpDashboardScreen';
import EmpPayrollScreen from '../screens/employee/EmpPayrollScreen';
import EmpNotificationScreen from '../screens/employee/EmpNotificationScreen';
import EmpLeaveScreen from '../screens/employee/EmpLeaveScreen';
import EmpWfhScreen from '../screens/employee/EmpWfhScreen';

const TABS = [
  { key: 'dashboard', label: 'Home', icon: 'home-outline', component: EmpDashboardScreen },
  { key: 'payroll', label: 'Payroll', icon: 'cash-multiple', component: EmpPayrollScreen },
  { key: 'notification', label: 'Notification', icon: 'bell-outline', component: EmpNotificationScreen },
  { key: 'leave', label: 'Leave', icon: 'calendar-month-outline', component: EmpLeaveScreen },
  { key: 'wfh', label: 'WFH', icon: 'home-city-outline', component: EmpWfhScreen },
];

export default function EmployeeStack() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const ActiveScreen = TABS.find(t => t.key === activeTab)?.component;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenContainer}>
        {ActiveScreen && <ActiveScreen onNavigateTab={setActiveTab} />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.tabIndicator} />}
              <MaterialCommunityIcons
                name={tab.icon}
                size={20}
                color={isActive ? '#e11d48' : '#9ca3af'}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#e11d48',
    borderRadius: 2,
  },
  tabIcon: {
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#e11d48',
  },
});
