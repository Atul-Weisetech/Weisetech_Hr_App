import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext } from '../../state/AppStore';

function calculateDaysInclusive(fromDate, toDate) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function getGreetingByHour() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  if (h >= 17 && h < 21) return 'Good Evening';
  return 'Good Night';
}

export default function EmpDashboardScreen() {
  const { user, signOut } = useContext(AuthContext);
  const { leaveRequests, wfhRequests, payrolls } = useContext(AppStoreContext);
  const myEmployeeId = String(user.employeeId || user.id);
  const myLeaves = leaveRequests.filter(r => String(r.employeeId) === myEmployeeId);
  const myWfh = wfhRequests.filter(r => String(r.employeeId) === myEmployeeId);
  const myPayroll = payrolls.filter(p => String(p.employeeId) === myEmployeeId);
  const sortedPayrolls = [...myPayroll].sort((a, b) => {
    const da = new Date(a.payrollDate || a.month || 0).getTime();
    const db = new Date(b.payrollDate || b.month || 0).getTime();
    return db - da;
  });
  const latestPayroll = sortedPayrolls[0];

  const approvedLeaves = myLeaves
    .filter(r => r.status === 'Approved')
    .reduce((sum, r) => sum + calculateDaysInclusive(r.from, r.to), 0);

  const pendingLeaves = myLeaves
    .filter(r => r.status === 'Pending')
    .reduce((sum, r) => sum + calculateDaysInclusive(r.from, r.to), 0);

  const pendingWfh = myWfh.filter(r => r.status === 'Pending').length;

  const recentActivity = [...myLeaves, ...myWfh]
    .sort((a, b) => {
      const da = new Date(a.from || 0).getTime();
      const db = new Date(b.from || 0).getTime();
      return db - da;
    })
    .slice(0, 4);

  const netSalary = latestPayroll
    ? latestPayroll.basic + latestPayroll.allowance - latestPayroll.deduction
    : null;
  const greeting = getGreetingByHour();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.userName}>{user.name}</Text>
          
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() =>
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: signOut },
              ])
            }
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.salaryCard}>
        <Text style={styles.salaryLabel}>Latest Net Salary</Text>
        <Text style={[user.salaryAmount,{color:'white'}]}>
          {netSalary != null ? `INR ${netSalary.toLocaleString('en-IN')}` : '-'}
        </Text>
        {latestPayroll && <Text style={styles.salaryMonth}>{latestPayroll.month}</Text>}
      </View>

      <Text style={styles.sectionTitle}>Quick Overview</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#16a34a' }]}>
          <Text style={styles.statNumber}>{approvedLeaves}</Text>
          <Text style={styles.statLabel}>Leave Days{'\n'}Approved</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.statNumber}>{pendingLeaves}</Text>
          <Text style={styles.statLabel}>Leave Days{'\n'}Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#e11d48' }]}>
          <Text style={styles.statNumber}>{pendingWfh}</Text>
          <Text style={styles.statLabel}>WFH{'\n'}Pending</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recentActivity.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      ) : (
        recentActivity.map((item, i) => {
          const isLeave = !!item.type;
          const statusColor =
            item.status === 'Approved'
              ? { bg: '#dcfce7', text: '#16a34a' }
              : item.status === 'Rejected'
                ? { bg: '#fee2e2', text: '#dc2626' }
                : { bg: '#fef9c3', text: '#92400e' };
          return (
            <View key={i} style={styles.activityCard}>
              <View style={styles.activityLeft}>
                <View>
                  <Text style={styles.activityTitle}>
                    {isLeave ? `${item.type} Leave` : 'WFH Request'}
                  </Text>
                  <Text style={styles.activityDate}>
                    {item.from}  to  {item.to}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                <Text style={[styles.statusText, { color: statusColor.text }]}>{item.status}</Text>
              </View>
            </View>
          );
        })
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  headerRight: { alignItems: 'flex-end' },
  greeting: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  empId: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginTop: 3 },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  salaryCard: {
    backgroundColor: '#e11d48',
    borderRadius: 22,
    padding: 24,
    marginBottom: 26,
    shadowColor: '#e11d48',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  salaryLabel: { fontSize: 13, color: '#fecdd3', fontWeight: '600', marginBottom: 8 },
  salaryAmount: { fontSize: 38, fontWeight: '900', color: '#ffffff' },
  salaryMonth: { fontSize: 13, color: '#fda4af', marginTop: 5 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 4 },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  activityDate: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#9ca3af', fontWeight: '600' },
});
