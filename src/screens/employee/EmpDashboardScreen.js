import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext } from '../../state/AppStore';

function calculateDaysInclusive(fromDate, toDate) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function getGreetingByHour() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  if (h >= 17 && h < 21) return 'Good Evening';
  return 'Good Night';
}

function formatMoney(value) {
  return `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;
}

function monthName(dateInput) {
  const date = new Date(dateInput || Date.now());
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getSimpleCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  return {
    monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    today: now.getDate(),
    cells,
  };
}

export default function EmpDashboardScreen() {
  const { user, signOut } = useContext(AuthContext);
  const { leaveRequests, wfhRequests, payrolls } = useContext(AppStoreContext);

  const myEmployeeId = String(user.employeeId || user.id);

  const {
    approvedLeaveDays,
    pendingLeaveDays,
    leaveBalance,    recentPayrolls,    thisMonthCompleted,
    leaveUsagePct,
    calendar,
  } = useMemo(() => {
    const myLeaves = leaveRequests.filter(r => String(r.employeeId) === myEmployeeId);
    const myWfh = wfhRequests.filter(r => String(r.employeeId) === myEmployeeId);
    const myPayroll = payrolls.filter(p => String(p.employeeId) === myEmployeeId);

    const approved = myLeaves
      .filter(r => r.status === 'Approved')
      .reduce((sum, r) => sum + calculateDaysInclusive(r.from, r.to), 0);

    const pending = myLeaves
      .filter(r => r.status === 'Pending')
      .reduce((sum, r) => sum + calculateDaysInclusive(r.from, r.to), 0);

    const baseLeaveAllowance = 14;
    const balance = Math.max(0, baseLeaveAllowance - approved);

    const sortedPayrolls = [...myPayroll].sort((a, b) => {
      const da = new Date(a.payrollDate || a.month || 0).getTime();
      const db = new Date(b.payrollDate || b.month || 0).getTime();
      return db - da;
    });
    const recent = sortedPayrolls.slice(0, 6);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthApprovedLeaves = myLeaves.filter(r => {
      if (r.status !== 'Approved') return false;
      const d = new Date(r.from);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthWfhApproved = myWfh.filter(r => {
      if (r.status !== 'Approved') return false;
      const d = new Date(r.from);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const leaveDaysThisMonth = monthApprovedLeaves.reduce(
      (sum, r) => sum + calculateDaysInclusive(r.from, r.to),
      0,
    );

    const completedDays = Math.max(0, now.getDate() - leaveDaysThisMonth);
    const leavePct = Math.min(100, Math.round((approved / Math.max(baseLeaveAllowance, 1)) * 100));

    return {
      approvedLeaveDays: approved,
      pendingLeaveDays: pending,
      leaveBalance: balance,      recentPayrolls: recent,      thisMonthCompleted: completedDays,
      leaveUsagePct: leavePct,
      calendar: getSimpleCalendar(),
      monthWfhApproved,
    };
  }, [leaveRequests, wfhRequests, payrolls, myEmployeeId]);

  const greeting = useMemo(getGreetingByHour, []);
  const isSmallScreen = Dimensions.get('window').width < 420;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topHeader}>
        <View>
  <Text style={styles.greeting}>
    {greeting}, {user.name}!
  </Text>

  <Text style={styles.subGreeting}>
    Hope you have a productive day ahead
  </Text>

      <TouchableOpacity
        style={styles.logoutBottomBtn}
        onPress={() =>
          Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: signOut },
          ])
        }
      >
        <Text style={styles.logoutBottomText}>Logout</Text>
      </TouchableOpacity>
</View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionMuted]}>
            <MaterialCommunityIcons name="calendar-plus" size={15} color="#be123c" />
            <Text style={[styles.actionText, { color: '#be123c' }]}>Apply Leave</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionCool]}>
            <MaterialCommunityIcons name="home-city" size={15} color="#0369a1" />
            <Text style={[styles.actionText, { color: '#0369a1' }]}>Request WFH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]}>
            <MaterialCommunityIcons name="clock-time-four" size={15} color="#ffffff" />
            <Text style={[styles.actionText, { color: '#ffffff' }]}>Open Time Tracker</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileLeft}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account-tie" size={24} color="#d40950" />
          </View>
          <View>
            <Text style={styles.profileLabel}>EMPLOYEE PROFILE</Text>
            <Text style={styles.profileName}>{user.name}</Text>
          </View>
        </View>

        <View style={styles.profileMetaWrap}>
          <View style={styles.profileMetaBlock}>
            <Text style={styles.profileMetaTitle}>DESIGNATION</Text>
            <Text style={styles.profileMetaValue}>
              <MaterialCommunityIcons name="account" size={12} color="#ffffff" /> Dev
            </Text>
          </View>
          <View style={styles.profileMetaBlock}>
            <Text style={styles.profileMetaTitle}>JOINING DATE</Text>
            <Text style={styles.profileMetaValue}>
              <MaterialCommunityIcons name="calendar" size={12} color="#ffffff" /> 13 Mar 2026
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeadRow}>
            <Text style={styles.metricTitle}>LEAVE BALANCE</Text>
            <View style={[styles.metricIconWrap, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="calendar-month" size={17} color="#16a34a" />
            </View>
          </View>
          <Text style={[styles.metricValue, { color: '#16a34a' }]}>{leaveBalance}</Text>
          <Text style={styles.metricSub}>days remaining</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(8, 100 - leaveUsagePct)}%` }]} />
          </View>
          <View style={styles.metricFootRow}>
            <Text style={styles.footLeft}>Used: {approvedLeaveDays}</Text>
            <Text style={styles.footRight}>Pending: {pendingLeaveDays}</Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeadRow}>
            <Text style={styles.metricTitle}>PAYSLIPS</Text>
            <View style={[styles.metricIconWrap, { backgroundColor: '#ede9fe' }]}>
              <MaterialCommunityIcons name="cash-multiple" size={17} color="#7c3aed" />
            </View>
          </View>
          <Text style={[styles.metricValue, { color: '#7c3aed' }]}>{recentPayrolls.length}</Text>
          <Text style={styles.metricSub}>available payslips</Text>
          <Text style={styles.metricLink}>View all</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeadRow}>
            <Text style={styles.metricTitle}>THIS MONTH</Text>
            <View style={[styles.metricIconWrap, { backgroundColor: '#cffafe' }]}>
              <MaterialCommunityIcons name="calendar-check" size={17} color="#0891b2" />
            </View>
          </View>
          <Text style={[styles.metricValue, { color: '#0891b2' }]}>{thisMonthCompleted}</Text>
          <Text style={styles.metricSub}>days completed</Text>
          <Text style={styles.metricMonth}>{monthName(Date.now())}</Text>
        </View>
      </View>

      <View style={styles.panelRow}>
        <View style={[styles.panelCard, isSmallScreen && styles.panelCardMobile]}>
          <Text style={[styles.panelTitle, isSmallScreen && styles.panelTitleMobile]}>LEAVE USAGE</Text>

          <View style={styles.donutWrap}>
            <View style={[styles.donutOuter, isSmallScreen && styles.donutOuterMobile]}>
              <View style={[styles.donutInner, isSmallScreen && styles.donutInnerMobile]}>
                <Text style={[styles.donutCenter, isSmallScreen && styles.donutCenterMobile]}>{leaveUsagePct}%</Text>
              </View>
            </View>
            <View style={[styles.leaveLegendRow, isSmallScreen && styles.leaveLegendRowMobile]}>
              <Text style={[styles.legendDotText, { color: '#22c55e' }]}>o Remaining</Text>
              <Text style={[styles.legendDotText, { color: '#ef4444' }]}>o Used</Text>
            </View>
            <View style={[styles.leaveStatRow, isSmallScreen && styles.leaveStatRowMobile]}>
              <View style={styles.leaveStatCol}>
                <Text style={[styles.leaveStatValue, { color: '#ef4444' }]}>{approvedLeaveDays}</Text>
                <Text style={styles.leaveStatLabel}>Used</Text>
              </View>
              <View style={styles.leaveStatCol}>
                <Text style={[styles.leaveStatValue, { color: '#16a34a' }]}>{leaveBalance}</Text>
                <Text style={styles.leaveStatLabel}>Remaining</Text>
              </View>
              <View style={styles.leaveStatCol}>
                <Text style={[styles.leaveStatValue, { color: '#f97316' }]}>{pendingLeaveDays}</Text>
                <Text style={styles.leaveStatLabel}>Pending</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.panelCard, isSmallScreen && styles.panelCardMobile]}>
          <Text style={[styles.panelTitle, isSmallScreen && styles.panelTitleMobile]}>CALENDAR</Text>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarArrow}>‹</Text>
            <Text style={[styles.calendarMonth, isSmallScreen && styles.calendarMonthMobile]}>{calendar.monthLabel}</Text>
            <Text style={styles.calendarArrow}>›</Text>
          </View>

          <View style={styles.weekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <Text key={day} style={[styles.weekCell, isSmallScreen && styles.weekCellMobile]}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendar.cells.map((day, idx) => {
              const isToday = day === calendar.today;
              return (
                <View key={`${day || 'x'}-${idx}`} style={styles.dayCellWrap}>
                  {day ? (
                    <View style={isToday ? styles.todayDot : undefined}>
                      <Text style={[styles.dayCellText, isSmallScreen && styles.dayCellTextMobile, isToday && styles.todayText]}>{day}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.dayCellText, isSmallScreen && styles.dayCellTextMobile]}>{' '}</Text>
                  )}
                </View>
              );
            })}
          </View>

          <View style={[styles.calendarLegend, isSmallScreen && styles.calendarLegendMobile]}>
            <Text style={styles.legendEntry}>o Today</Text>
            <Text style={[styles.legendEntry, { color: '#f87171' }]}>o Holiday</Text>
            <Text style={[styles.legendEntry, { color: '#22c55e' }]}>o Leave</Text>
            <Text style={[styles.legendEntry, { color: '#06b6d4' }]}>o WFH</Text>
          </View>
          <Text style={styles.noEvents}>No events this month</Text>
        </View>

        <View style={[styles.panelCard, isSmallScreen && styles.panelCardMobile]}>
          <Text style={[styles.panelTitle, isSmallScreen && styles.panelTitleMobile]}>TODAY'S WORKING HOURS</Text>
          <View style={styles.timerWrap}>
            <View style={[styles.timerCircle, isSmallScreen && styles.timerCircleMobile]}>
              <MaterialCommunityIcons name="clock-time-five" size={22} color="#9ca3af" />
              <Text style={[styles.timerValue, isSmallScreen && styles.timerValueMobile]}>00:00</Text>
            </View>
            <Text style={[styles.timerNote, isSmallScreen && styles.timerNoteMobile]}>No active session</Text>
            <TouchableOpacity style={[styles.startTrackBtn, isSmallScreen && styles.startTrackBtnMobile]}>
              <MaterialCommunityIcons name="clock-start" size={14} color="#ffffff" />
              <Text style={[styles.startTrackText, isSmallScreen && styles.startTrackTextMobile]}>Start Tracking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>RECENT PAYSLIPS</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.payslipRow}>
          {recentPayrolls.length === 0 ? (
            <View style={styles.emptyPayrollCard}>
              <Text style={styles.emptyPayrollText}>No payslips available</Text>
            </View>
          ) : (
            recentPayrolls.map(p => {
              const gross = Number(p.basic || 0) + Number(p.allowance || 0);
              const net = gross - Number(p.deduction || 0);
              return (
                <View key={p.id} style={styles.payslipCard}>
                  <View style={styles.payslipTop}>
                    <Text style={styles.payslipLabel}>PAYSLIP</Text>
                    <Text style={styles.payslipMonth}>{p.month || monthName(p.payrollDate)}</Text>
                  </View>

                  <View style={styles.payslipBody}>
                    <View style={styles.payRow}><Text style={styles.payKey}>Mode</Text><Text style={styles.payVal}>{p.mode || 'bank'}</Text></View>
                    <View style={styles.payRow}><Text style={styles.payKey}>Base Salary</Text><Text style={styles.payVal}>{formatMoney(p.basic)}</Text></View>
                    <View style={styles.payRow}><Text style={styles.payKey}>Other Earnings</Text><Text style={[styles.payVal, { color: '#16a34a' }]}>{formatMoney(p.allowance)}</Text></View>
                    <View style={styles.payRow}><Text style={styles.payKey}>Gross</Text><Text style={styles.payVal}>{formatMoney(gross)}</Text></View>
                    <View style={styles.payRow}><Text style={styles.payKey}>Deductions</Text><Text style={[styles.payVal, { color: '#ef4444' }]}>{formatMoney(p.deduction)}</Text></View>
                    <View style={styles.rule} />
                    <View style={styles.payRow}><Text style={styles.payNetKey}>Net Pay</Text><Text style={styles.payNetVal}>{formatMoney(net)}</Text></View>
                  </View>

                  <TouchableOpacity style={styles.downloadBtn}>
                    <MaterialCommunityIcons name="download" size={15} color="#ffffff" />
                    <Text style={styles.downloadText}>Download</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>    
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e5e7eb' },
  content: { padding: 18, paddingBottom: 28 },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  greeting: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subGreeting: { marginTop: 3, fontSize: 14, color: '#64748b' },
  headerActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionBtn: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  actionMuted: { backgroundColor: '#f5e7ec', borderColor: '#e6cad6' },
  actionCool: { backgroundColor: '#e7eff4', borderColor: '#c8d8e4' },
  actionPrimary: { backgroundColor: '#d40950', borderColor: '#d40950' },
  actionText: { fontWeight: '700', fontSize: 15 },

  profileCard: {
    backgroundColor: '#d40950',
    borderRadius: 16,
    padding: 22,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLabel: { fontSize: 12, fontWeight: '700', color: '#fbcfe8' },
  profileName: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  profileMetaWrap: { flexDirection: 'row', gap: 22, alignItems: 'center' },
  profileMetaBlock: { minWidth: 110 },
  profileMetaTitle: { fontSize: 12, color: '#fbcfe8', marginBottom: 4 },
  profileMetaValue: { fontSize:15, fontWeight: '700', color: '#ffffff' },

  metricRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  metricCard: {
    flexGrow: 1,
    flexBasis: 300,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 18,
    minHeight: 160,
  },
  metricHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricTitle: { fontSize:15, fontWeight: '700', color: '#475569' },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontSize: 35, fontWeight: '800', marginTop: 5 },
  metricSub: { fontSize: 15, color: '#94a3b8', marginTop: 2 },
  metricLink: { fontSize: 15, color: '#d40950', fontWeight: '700', marginTop: 14 },
  metricMonth: { fontSize: 18, color: '#94a3b8', marginTop: 14 },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 4, backgroundColor: '#22c55e' },
  metricFootRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footLeft: { fontSize: 15, color: '#64748b' },
  footRight: { fontSize: 15, color: '#f97316' },

  panelRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  panelCard: {
    flexGrow: 1,
    flexBasis: 300,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 18,
    minHeight: 280,
  },
  panelTitle: { fontSize: 30, color: '#475569', fontWeight: '700', marginBottom: 10 },
  panelTitleMobile: { fontSize: 15, marginBottom: 8 },
  panelCardMobile: { flexBasis: '100%', minHeight: 260, padding: 14 },

  donutWrap: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  donutOuter: {
    width: 182,
    height: 182,
    borderRadius: 91,
    borderWidth: 18,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  donutOuterMobile: { width: 150, height: 150, borderRadius: 75, borderWidth: 14 },
  donutInnerMobile: { width: 94, height: 94, borderRadius: 47 },
  donutCenterMobile: { fontSize: 22 },
  leaveLegendRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  leaveLegendRowMobile: { gap: 10, marginTop: 8 },
  legendDotText: { fontWeight: '600', fontSize: 14 },
  leaveStatRow: { marginTop: 14, flexDirection: 'row', gap: 28 },
  leaveStatRowMobile: { gap: 16, marginTop: 10 },
  leaveStatCol: { alignItems: 'center' },
  leaveStatValue: { fontSize: 26, fontWeight: '800' },
  leaveStatLabel: { fontSize: 14, color: '#475569' },

  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calendarArrow: { fontSize: 20, color: '#64748b' },
  calendarMonth: { fontSize: 30, fontWeight: '700', color: '#1e293b' },
  calendarMonthMobile: { fontSize: 20 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekCell: { width: '14%', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  weekCellMobile: { fontSize: 12 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  dayCellWrap: { width: '14%', alignItems: 'center', marginVertical: 5 },
  dayCellText: { fontSize: 18, color: '#334155', width: 32, textAlign: 'center', lineHeight: 32 },
  dayCellTextMobile: { fontSize: 15, width: 28, lineHeight: 28 },
  todayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d40950',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: { color: '#ffffff', fontWeight: '700' },
  calendarLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  calendarLegendMobile: { gap: 8, marginBottom: 8 },
  legendEntry: { fontSize: 13, color: '#d40950' },
  noEvents: { color: '#94a3b8', textAlign: 'center', marginTop: 4, fontSize: 13 },

  timerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 7,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  timerCircleMobile: { width: 112, height: 112, borderRadius: 56, borderWidth: 6, marginBottom: 10 },
  timerValue: { fontSize: 34, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  timerValueMobile: { fontSize: 28 },
  timerNote: { fontSize: 18, color: '#94a3b8', marginBottom: 12, textAlign: 'center' },
  timerNoteMobile: { fontSize: 14, marginBottom: 10 },
  startTrackBtn: {
    backgroundColor: '#d40950',
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  startTrackBtnMobile: { height: 36, paddingHorizontal: 14 },
  startTrackText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  startTrackTextMobile: { fontSize: 13 },

  recentSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 18,
  },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  recentTitle: { fontSize: 15, color: '#475569', fontWeight: '700' },
  viewAll: { fontSize: 15, color: '#d40950', fontWeight: '700' },
  payslipRow: { gap: 12, paddingVertical: 6 },
  payslipCard: {
    width: 250,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
  },
  payslipTop: { backgroundColor: '#d40950', padding: 14 },
  payslipLabel: { color: '#fbcfe8', fontSize: 12, fontWeight: '700' },
  payslipMonth: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 3 },
  payslipBody: { padding: 14 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  payKey: { fontSize: 12, color: '#94a3b8' },
  payVal: { fontSize: 12, color: '#0f172a', fontWeight: '600' },
  rule: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
  payNetKey: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  payNetVal: { fontSize: 22, color: '#d40950', fontWeight: '800' },
  downloadBtn: {
    margin: 12,
    marginTop: 0,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#d40950',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  downloadText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },

  emptyPayrollCard: {
    width: 280,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  emptyPayrollText: { color: '#64748b', fontWeight: '600' },

  logoutBottomBtn: {
    marginTop: 16,
    alignSelf: 'flex-end',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBottomText: { color: '#dc2626', fontWeight: '700' },
});


