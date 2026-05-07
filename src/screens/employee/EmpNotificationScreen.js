import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext, AppStoreActionsContext } from '../../state/AppStore';

function formatDate(dateText) {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateText) {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateDaysInclusive(fromDate, toDate) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function statusStyle(status) {
  if (status === 'Approved') return { bg: '#dcfce7', text: '#16a34a' };
  if (status === 'Rejected') return { bg: '#fee2e2', text: '#dc2626' };
  return { bg: '#fef3c7', text: '#d97706' };
}

export default function EmpNotificationScreen() {
  const { user } = useContext(AuthContext);
  const {
    notificationsByEmployee,
    leaveRequests,
    wfhRequests,
    warnings,
  } = useContext(AppStoreContext);
  const {
    refreshNotifications,
    refreshLeaveRequests,
    refreshWfhRequests,
    refreshWarnings,
  } = useContext(AppStoreActionsContext);

  const [searchText, setSearchText] = useState('');

  const employeeId = String(user.employeeId || user.id);

  const notifications = useMemo(
    () => notificationsByEmployee[employeeId] || [],
    [notificationsByEmployee, employeeId],
  );

  useEffect(() => {
    refreshNotifications(employeeId);
    refreshLeaveRequests();
    refreshWfhRequests();
    refreshWarnings();
  }, [employeeId, refreshNotifications, refreshLeaveRequests, refreshWfhRequests, refreshWarnings]);

  const warningAlerts = useMemo(() => {
    const directWarnings = warnings
      .filter(w => String(w.employeeId) === employeeId)
      .map(w => ({
        id: `warn-${w.id}`,
        title: 'Performance Warning',
        message: `You have received a new performance warning. Warning types: ${(w.warningTypes || []).join(', ') || 'General'} . Overall note: ${w.reason}`,
        createdAt: w.date,
      }));

    const notificationWarnings = notifications
      .filter(n => n.type === 'warning' || n.type === 'performance_warning')
      .map(n => ({
        id: `notif-${n.id}`,
        title: n.title || 'Performance Warning',
        message: n.message,
        createdAt: n.date,
      }));

    const merged = [...notificationWarnings, ...directWarnings];
    const unique = [];
    const seen = new Set();

    merged.forEach(item => {
      const key = `${item.title}-${item.message}-${item.createdAt}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    return unique.slice(0, 6);
  }, [warnings, notifications, employeeId]);

  const requestRows = useMemo(() => {
    const leaveRows = leaveRequests
      .filter(r => String(r.employeeId) === employeeId)
      .map(r => ({
        id: `leave-${r.id}`,
        type: 'Leave',
        status: r.status,
        from: r.from,
        to: r.to,
        days: calculateDaysInclusive(r.from, r.to),
        description: r.reason || '-',
        reviewedBy: r.reviewedBy || 'Smart One',
        reviewedAt: r.reviewedAt || r.to || r.from,
      }));

    const wfhRows = wfhRequests
      .filter(r => String(r.employeeId) === employeeId)
      .map(r => ({
        id: `wfh-${r.id}`,
        type: 'WFH',
        status: r.status,
        from: r.from,
        to: r.to,
        days: calculateDaysInclusive(r.from, r.to),
        description: r.reason || '-',
        reviewedBy: r.reviewedBy || 'Smart One',
        reviewedAt: r.reviewedAt || r.to || r.from,
      }));

    return [...leaveRows, ...wfhRows].sort(
      (a, b) => new Date(b.from || 0).getTime() - new Date(a.from || 0).getTime(),
    );
  }, [leaveRequests, wfhRequests, employeeId]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return requestRows;

    return requestRows.filter(r => {
      const bag = `${r.type} ${r.status} ${r.description} ${r.reviewedBy}`.toLowerCase();
      return bag.includes(q);
    });
  }, [requestRows, searchText]);

  const onRefresh = async () => {
    await Promise.all([
      refreshNotifications(employeeId),
      refreshLeaveRequests(),
      refreshWfhRequests(),
      refreshWarnings(),
    ]);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Notification Center</Text>
          <Text style={styles.pageSubtitle}>
            Track approval status of your leave and work from home requests
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={16} color="#334155" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>ALERTS & NOTIFICATIONS</Text>

      {warningAlerts.length === 0 ? (
        <View style={styles.emptyAlertCard}>
          <Text style={styles.emptyAlertText}>No alerts at the moment</Text>
        </View>
      ) : (
        warningAlerts.map(item => (
          <View key={item.id} style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <MaterialCommunityIcons name="alert-outline" size={20} color="#d97706" />
            </View>
            <View style={styles.alertBody}>
              <View style={styles.warningBadge}>
                <Text style={styles.warningBadgeText}>Warning</Text>
              </View>
              <Text style={styles.alertTitle}>{item.title}</Text>
              <Text style={styles.alertMessage}>{item.message}</Text>
              <Text style={styles.alertDate}>{formatDateTime(item.createdAt)}</Text>
              <Text style={styles.alertLink}>Tap to view full details -</Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.tableHeadRow}>
        <Text style={styles.sectionTitle}>LEAVE & WORK FROM HOME</Text>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by status or description..."
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <View style={styles.tableWrap}>
        {filteredRows.length === 0 ? (
          <View style={styles.emptyTableRow}>
            <Text style={styles.emptyTableText}>No matching records</Text>
          </View>
        ) : (
          filteredRows.map(row => {
            const sc = statusStyle(row.status);
            return (
              <View key={row.id} style={styles.requestCard}>
                <View style={styles.cardLine}>
                  <View style={[styles.typeChip, row.type === 'Leave' ? styles.typeLeave : styles.typeWfh]}>
                    <Text style={styles.typeChipText}>{row.type}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusChipText, { color: sc.text }]}>{row.status}</Text>
                  </View>
                </View>

                <View style={styles.cardLine}>
                  <Text style={styles.cardMetaText}>
                    {formatDate(row.from)} - {formatDate(row.to)}
                  </Text>
                  <Text style={styles.cardMetaText}>Days: {row.days}</Text>
                </View>

                <View style={styles.cardLineLast}>
                  <Text style={styles.cardDescText} numberOfLines={1}>Description: {row.description}</Text>
                  <View style={styles.cardReviewRow}>
                    <View style={styles.reviewerChip}>
                      <Text style={styles.reviewerChipText}>{row.reviewedBy}</Text>
                    </View>
                    <Text style={styles.cardReviewedAt}>{formatDateTime(row.reviewedAt)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e5e7eb' },
  content: { padding: 16, paddingBottom: 26 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  titleWrap: { flex: 1, minWidth: 240 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { marginTop: 4, fontSize: 15, color: '#64748b' },
  refreshBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshText: { fontSize: 20, fontWeight: '600', color: '#1e293b' },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 0.6,
  },

  alertCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  alertBody: { flex: 1 },
  warningBadge: {
    backgroundColor: '#fde68a',
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 24,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginBottom: 6,
  },
  warningBadgeText: { color: '#b45309', fontWeight: '700', fontSize: 14 },
  alertTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  alertMessage: { fontSize: 12, color: '#334155', lineHeight: 25 },
  alertDate: { marginTop: 4, fontSize: 15, color: '#94a3b8' },
  alertLink: { marginTop: 4, fontSize: 15, color: '#e11d48', fontWeight: '700' },
  emptyAlertCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 18,
    marginBottom: 8,
  },
  emptyAlertText: { color: '#64748b', fontWeight: '600' },

  tableHeadRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchWrap: {
    minWidth: 250,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 0, color: '#0f172a' },

  tableWrap: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    padding: 10,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  cardLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  cardLineLast: {
    gap: 8,
  },
  cardMetaText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  cardDescText: {
    fontSize: 13,
    color: '#475569',
  },
  cardReviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  cardReviewedAt: {
    fontSize: 12,
    color: '#64748b',
  },

  typeChip: {
    height: 24,
    borderRadius: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeLeave: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  typeWfh: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
  typeChipText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  statusChip: {
    borderRadius: 999,
    height: 26,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusChipText: { fontSize: 12, fontWeight: '700' },

  reviewerChip: {
    height: 26,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  reviewerChipText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  emptyTableRow: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  emptyTableText: { color: '#64748b', fontWeight: '600' },
});
