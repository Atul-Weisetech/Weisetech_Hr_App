import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreActionsContext, AppStoreContext } from '../../state/AppStore';
import hrApi from '../../api/hrApi';

let persistedTrackerDraft = {
  activityType: 'Working',
  startTime: '',
  endTime: '',
  activity: '',
  description: '',
};

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

function getLeaveColor(usagePct) {
  if (usagePct >= 75) return '#ef4444';
  if (usagePct >= 50) return '#f97316';
  return '#22c55e';
}

function buildLeaveRingSegments({ usedDays, pendingDays, remainingDays }, segmentCount = 72) {
  const safeUsed = Math.max(0, usedDays || 0);
  const safePending = Math.max(0, pendingDays || 0);
  const safeRemaining = Math.max(0, remainingDays || 0);
  const totalDays = Math.max(1, safeUsed + safePending + safeRemaining);

  const usedSegments = Math.round((safeUsed / totalDays) * segmentCount);
  const pendingSegments = Math.round((safePending / totalDays) * segmentCount);
  const remainingSegments = Math.max(0, segmentCount - usedSegments - pendingSegments);

  return [
    ...Array.from({ length: usedSegments }, () => ({ color: '#ef4444' })),
    ...Array.from({ length: pendingSegments }, () => ({ color: '#f97316' })),
    ...Array.from({ length: remainingSegments }, () => ({ color: '#22c55e' })),
  ];
}

function formatMoney(value) {
  return `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;
}

function monthName(dateInput) {
  const date = new Date(dateInput || Date.now());
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getSimpleCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  return {
    monthLabel: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    today: isCurrentMonth ? now.getDate() : -1,
    cells,
  };
}

export default function EmpDashboardScreen({ onNavigateTab }) {
  const { user, signOut } = useContext(AuthContext);
  const { leaveRequests, wfhRequests, payrolls, timeEntries, holidays } = useContext(AppStoreContext);
  const { startAttendanceSession, endAttendanceSession, refreshTimeEntries } = useContext(AppStoreActionsContext);
  const [trackerVisible, setTrackerVisible] = useState(false);
  const [trackerForm, setTrackerForm] = useState(persistedTrackerDraft);
  const [isTrackingStarted, setIsTrackingStarted] = useState(false);

  const todayObj = new Date();
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());

  const onPrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else { setCalMonth(m => m - 1); }
  };
  const onNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else { setCalMonth(m => m + 1); }
  };
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const trackingStartRef = useRef(null); // exact Date when tracking started
  const intervalRef = useRef(null);      // setInterval id

  // Clean up interval on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const myEmployeeId = String(user.employeeId || user.id);
  useEffect(() => {
    persistedTrackerDraft = trackerForm;
  }, [trackerForm]);

  useEffect(() => {
    refreshTimeEntries(myEmployeeId);
  }, [refreshTimeEntries, myEmployeeId]);

  useEffect(() => {
    let mounted = true;
    const syncStatus = async () => {
      try {
        const { data } = await hrApi.get(`/attendance/status/${myEmployeeId}`);
        if (!mounted || !data?.success || !data?.running || !data?.clock_in_time) return;

        const clockIn = new Date(Number(data.clock_in_time) * 1000);
        const startText = `${String(clockIn.getHours()).padStart(2, '0')}:${String(clockIn.getMinutes()).padStart(2, '0')}`;
        trackingStartRef.current = clockIn;
        setIsTrackingStarted(true);
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - clockIn.getTime()) / 1000)));
        setTrackerForm(prev => ({ ...prev, startTime: prev.startTime || startText }));

        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          if (!trackingStartRef.current) return;
          setElapsedSeconds(Math.floor((Date.now() - trackingStartRef.current.getTime()) / 1000));
        }, 1000);
      } catch (e) {
        // no-op
      }
    };
    syncStatus();
    return () => { mounted = false; };
  }, [myEmployeeId]);

  const {
    approvedLeaveDays,
    pendingLeaveDays,
    leaveBalance,    recentPayrolls,    thisMonthCompleted,
    leaveUsagePct,
    calendar,
  } = useMemo(() => {
    const myLeaves = leaveRequests.filter(r => String(r.employeeId) === myEmployeeId);
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
      calendar: getSimpleCalendar(calYear, calMonth),
    };
  }, [leaveRequests, payrolls, myEmployeeId, calYear, calMonth]);

  const { holidayDays, leaveDays, wfhDays } = useMemo(() => {
    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-`;
    const toKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const holidaySet = new Set(
      holidays
        .map(h => String(h.date || '').slice(0, 10))
        .filter(day => day.startsWith(monthPrefix)),
    );

    const leaveSet = new Set();
    leaveRequests
      .filter(r => String(r.employeeId) === myEmployeeId && r.status === 'Approved')
      .forEach(r => {
        let d = new Date(r.from);
        const end = new Date(r.to);
        if (Number.isNaN(d.getTime()) || Number.isNaN(end.getTime())) return;
        while (d <= end) {
          if (d.getMonth() === calMonth && d.getFullYear() === calYear) leaveSet.add(toKey(d));
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        }
      });

    const wfhSet = new Set();
    wfhRequests
      .filter(r => String(r.employeeId) === myEmployeeId && r.status === 'Approved')
      .forEach(r => {
        let d = new Date(r.from);
        const end = new Date(r.to);
        if (Number.isNaN(d.getTime()) || Number.isNaN(end.getTime())) return;
        while (d <= end) {
          if (d.getMonth() === calMonth && d.getFullYear() === calYear) wfhSet.add(toKey(d));
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        }
      });

    return { holidayDays: holidaySet, leaveDays: leaveSet, wfhDays: wfhSet };
  }, [holidays, leaveRequests, wfhRequests, myEmployeeId, calYear, calMonth]);

  const greeting = useMemo(getGreetingByHour, []);
  const isSmallScreen = Dimensions.get('window').width < 420;
  const donutSize = isSmallScreen ? 150 : 182;
  const donutThickness = isSmallScreen ? 14 : 18;
  const donutInnerSize = isSmallScreen ? 94 : 116;
  const leaveRingSegments = useMemo(
    () => buildLeaveRingSegments({
      usedDays: approvedLeaveDays,
      pendingDays: pendingLeaveDays,
      remainingDays: leaveBalance,
    }),
    [approvedLeaveDays, pendingLeaveDays, leaveBalance],
  );
  const todayDate = new Date().toISOString().slice(0, 10);
  const myTodayEntries = timeEntries.filter(
    entry => String(entry.employeeId) === myEmployeeId && entry.date === todayDate,
  );
  const todayWorkedMinutes = myTodayEntries.reduce(
    (sum, entry) => sum + Number(entry.durationMinutes || 0),
    0,
  );
  const todayTotalHoursText = `${String(Math.floor(todayWorkedMinutes / 60)).padStart(2, '0')}:${String(todayWorkedMinutes % 60).padStart(2, '0')}`;
  const sessionHoursText = isTrackingStarted
    ? `${String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`
    : '00:00';

  const saveTrackerEntry = async () => {
    const now = new Date();
    const nowText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (!isTrackingStarted) {
      try {
        await startAttendanceSession(myEmployeeId);
        trackingStartRef.current = new Date();
        intervalRef.current = setInterval(() => {
          if (!trackingStartRef.current) return;
          setElapsedSeconds(Math.floor((Date.now() - trackingStartRef.current.getTime()) / 1000));
        }, 1000);
        setTrackerForm(prev => ({ ...prev, startTime: nowText, endTime: '' }));
        setIsTrackingStarted(true);
        Alert.alert('Tracking Started', `Timer running from ${nowText}`);
      } catch (e) {
        Alert.alert('Could not start', e?.message || 'Please try again.');
      }
      return;
    }

    try {
      const result = await endAttendanceSession(myEmployeeId);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      trackingStartRef.current = null;
      setElapsedSeconds(0);
      setIsTrackingStarted(false);
      setTrackerForm(prev => ({ ...prev, endTime: nowText }));
      setTrackerVisible(false);
      Alert.alert('Saved', `Done for today. Working hours: ${result?.working_hours ?? 0}`);
    } catch (e) {
      Alert.alert('Could not end', e?.message || 'Please try again.');
    }
  };

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
    Hope you have a productive day ahead ✨
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
          <TouchableOpacity style={[styles.actionBtn, styles.actionMuted]} onPress={() => onNavigateTab?.('leave')}>
            <MaterialCommunityIcons name="calendar-plus" size={15} color="#be123c" />
            <Text style={[styles.actionText, { color: '#be123c' }]}>Apply Leave</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionCool]} onPress={() => onNavigateTab?.('wfh')}>
            <MaterialCommunityIcons name="home-city" size={15} color="#0369a1" />
            <Text style={[styles.actionText, { color: '#0369a1' }]}>Request WFH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={() => setTrackerVisible(true)}>
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
            <View style={[styles.progressFill, { width: `${Math.max(8, 100 - leaveUsagePct)}%`, backgroundColor: getLeaveColor(leaveUsagePct) }]} />
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
          <TouchableOpacity onPress={() => onNavigateTab?.('payroll')}>
            <Text style={styles.metricLink}>View all</Text>
          </TouchableOpacity>
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
            <View style={[styles.donutOuter, { width: donutSize, height: donutSize }]}>
              <View style={[styles.donutRing, { width: donutSize, height: donutSize }]}>
                {leaveRingSegments.map((segment, index) => {
                  const segmentAngle = 360 / leaveRingSegments.length;
                  const radius = (donutSize / 2) - (donutThickness / 2) - 1;
                  const arcLength = Math.max(donutThickness + 2, ((2 * Math.PI * radius) / leaveRingSegments.length) * 1.2);
                  const angle = -90 + (index + 0.5) * segmentAngle;
                  const theta = (angle * Math.PI) / 180;
                  const center = donutSize / 2;
                  const x = center + radius * Math.cos(theta);
                  const y = center + radius * Math.sin(theta);

                  return (
                    <View
                      key={`${segment.color}-${index}`}
                      style={[
                        styles.donutSegment,
                        {
                          width: arcLength,
                          height: donutThickness,
                          borderRadius: donutThickness / 2,
                          backgroundColor: segment.color,
                          left: x - arcLength / 2,
                          top: y - donutThickness / 2,
                          transform: [{ rotate: `${angle + 90}deg` }],
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <View style={[styles.donutInner, { width: donutInnerSize, height: donutInnerSize, borderRadius: donutInnerSize / 2 }]}>
                <Text style={[styles.donutCenter, isSmallScreen && styles.donutCenterMobile]}>{leaveUsagePct}%</Text>
              </View>
            </View>
            <View style={[styles.leaveLegendRow, isSmallScreen && styles.leaveLegendRowMobile]}>
              <Text style={[styles.legendDotText, { color: '#22c55e' }]}>o Remaining</Text>
              <Text style={[styles.legendDotText, { color: '#ef4444' }]}>o Used</Text>
              <Text style={[styles.legendDotText, { color: '#f97316' }]}>o Pending</Text>
            </View>
            <View style={[styles.leaveStatRow, isSmallScreen && styles.leaveStatRowMobile]}>
              <View style={styles.leaveStatCol}>
                <Text style={[styles.leaveStatValue, { color: '#ef4444' }]}>{approvedLeaveDays}</Text>
                <Text style={styles.leaveStatLabel}>Used</Text>
              </View>
              <View style={styles.leaveStatCol}>
                <Text style={[styles.leaveStatValue, { color: '#22c55e' }]}>{leaveBalance}</Text>
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
            <TouchableOpacity onPress={onPrevMonth} hitSlop={12}>
              <Text style={styles.calendarArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.calendarMonth, isSmallScreen && styles.calendarMonthMobile]}>{calendar.monthLabel}</Text>
            <TouchableOpacity onPress={onNextMonth} hitSlop={12}>
              <Text style={styles.calendarArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <Text key={day} style={[styles.weekCell, isSmallScreen && styles.weekCellMobile]}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendar.cells.map((day, idx) => {
              const isToday = day === calendar.today;
              const key = day
                ? `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                : '';
              const isHoliday = day ? holidayDays.has(key) : false;
              const isLeave = day ? leaveDays.has(key) : false;
              const isWfh = day ? wfhDays.has(key) : false;
              const dotColor = isHoliday ? '#f87171' : isLeave ? '#22c55e' : isWfh ? '#06b6d4' : null;
              return (
                <View key={`${day || 'x'}-${idx}`} style={styles.dayCellWrap}>
                  {day ? (
                    <>
                      <View style={isToday ? styles.todayDot : undefined}>
                        <Text style={[styles.dayCellText, isSmallScreen && styles.dayCellTextMobile, isToday && styles.todayText]}>{day}</Text>
                      </View>
                      {dotColor ? <View style={[styles.dayEventDot, { backgroundColor: dotColor }]} /> : null}
                    </>
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
          <Text style={styles.noEvents}>
            Holidays: {holidayDays.size} | Leave: {leaveDays.size} | WFH: {wfhDays.size}
          </Text>
        </View>

        <View style={[styles.panelCard, isSmallScreen && styles.panelCardMobile]}>
          <Text style={[styles.panelTitle, isSmallScreen && styles.panelTitleMobile]}>TODAY'S WORKING HOURS</Text>
          <View style={styles.timerWrap}>
            <View
              style={[
                styles.timerCircle,
                isSmallScreen && styles.timerCircleMobile,
                isTrackingStarted && styles.timerCircleRunning,
              ]}
            >
              <MaterialCommunityIcons
                name="clock-time-five"
                size={isSmallScreen ? 18 : 22}
                color="#9ca3af"
                style={styles.timerIcon}
              />
              <Text
                style={[styles.timerValue, isSmallScreen && styles.timerValueMobile]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {sessionHoursText}
              </Text>
            </View>
            <Text style={[styles.timerNote, isSmallScreen && styles.timerNoteMobile]}>
              {isTrackingStarted ? 'Tracking in progress' : `Today total: ${todayTotalHoursText}`}
            </Text>
            <TouchableOpacity
              style={[styles.startTrackBtn, isSmallScreen && styles.startTrackBtnMobile]}
              onPress={() => setTrackerVisible(true)}
            >
                <Text style={[styles.startTrackText, isSmallScreen && styles.startTrackTextMobile]}>Start Tracking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>RECENT PAYSLIPS</Text>
          <TouchableOpacity onPress={() => onNavigateTab?.('payroll')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
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

      <Modal visible={trackerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Time Tracker</Text>
            <Text style={styles.modalSub}>Date: {todayDate}</Text>

            <Text style={styles.modalLabel}>Activity Type</Text>
            <View style={styles.typeRow}>
              {['Working', 'Meeting', 'Project', 'Break'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, trackerForm.activityType === type && styles.typeChipActive]}
                  onPress={() => setTrackerForm(prev => ({ ...prev, activityType: type }))}
                >
                  <Text style={[styles.typeChipText, trackerForm.activityType === type && styles.typeChipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Start Time (HH:MM)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="09:30"
              placeholderTextColor="#94a3b8"
              value={trackerForm.startTime}
              onChangeText={value => setTrackerForm(prev => ({ ...prev, startTime: value }))}
              editable={!isTrackingStarted}
            />

            <Text style={styles.modalLabel}>End Time (HH:MM)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="18:15"
              placeholderTextColor="#94a3b8"
              value={trackerForm.endTime}
              onChangeText={value => setTrackerForm(prev => ({ ...prev, endTime: value }))}
            />

            <Text style={styles.modalLabel}>Activity (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="What are you working on?"
              placeholderTextColor="#94a3b8"
              value={trackerForm.activity}
              onChangeText={value => setTrackerForm(prev => ({ ...prev, activity: value }))}
            />

            <Text style={styles.modalLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputArea]}
              placeholder="Add details..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={trackerForm.description}
              onChangeText={value => setTrackerForm(prev => ({ ...prev, description: value }))}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setTrackerVisible(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveTrackerEntry}>
                <Text style={styles.modalSaveText}>
                  {isTrackingStarted ? 'Done for Today' : 'Start Tracking'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutRing: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  donutSegment: {
    position: 'absolute',
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
  donutOuterMobile: { width: 150, height: 150, borderRadius: 75 },
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
  dayEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
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
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  timerCircleMobile: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 5,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  timerCircleRunning: { borderColor: '#16a34a' },
  timerIcon: { marginBottom: 2 },
  timerValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timerValueMobile: { fontSize: 20, lineHeight: 24, marginTop: 0 },
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 26,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalSub: { marginTop: 4, color: '#64748b', fontSize: 13 },
  modalLabel: { marginTop: 12, marginBottom: 6, color: '#374151', fontWeight: '700', fontSize: 13 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
  },
  modalInputArea: { height: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  typeChipActive: { backgroundColor: '#d40950', borderColor: '#d40950' },
  typeChipText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  typeChipTextActive: { color: '#ffffff' },
  modalActions: { marginTop: 16, flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
  },
  modalCancelText: { color: '#475569', fontWeight: '700' },
  modalSave: {
    flex: 1,
    backgroundColor: '#d40950',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
  },
  modalSaveText: { color: '#ffffff', fontWeight: '700' },

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
