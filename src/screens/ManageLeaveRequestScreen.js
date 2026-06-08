import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { AppStoreContext, AppStoreActionsContext } from '../state/AppStore';
import { AuthContext } from '../state/AuthContext';
import { colors, sharedStyles } from '../styles/theme';

const FILTER_TABS = [
  { label: 'All',             value: 'all' },
  { label: 'Pending',         value: 'requested' },
  { label: 'Approved',        value: 'approved' },
  { label: 'Declined',        value: 'declined' },
  { label: 'Cancel Req.',     value: 'cancel_requested' },
  { label: 'Canceled',        value: 'canceled' },
];

const STATUS_STYLE = {
  Approved:  { bg: '#dcfce7', text: '#15803d' },
  Rejected:  { bg: '#fee2e2', text: '#b91c1c' },
  Pending:   { bg: '#fef9c3', text: '#92400e' },
};

function calcDays(from, to) {
  const s = new Date(from);
  const e = new Date(to);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '-';
  const days = Math.max(1, Math.floor((e - s) / 86400000) + 1);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function formatDate(d) {
  if (!d) return '-';
  return String(d).slice(0, 10);
}

const LeaveCard = React.memo(({ item, onApprove, onReject }) => {
  const sc = STATUS_STYLE[item.status] ?? STATUS_STYLE.Pending;
  const canAct = item.rawStatus === 'requested' || item.rawStatus === 'cancel_requested';

  return (
    <View style={styles.card}>
      {/* Status badge + top-right placeholder */}
      <View style={styles.cardTopRow}>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusBadgeText, { color: sc.text }]}>{item.status}</Text>
        </View>
        <View style={[styles.rawBadge]}>
          <Text style={styles.rawBadgeText}>{item.rawStatus.replace('_', ' ')}</Text>
        </View>
      </View>

      {/* Row 1: Employee name + Date range */}
      <View style={styles.row}>
        <Text style={styles.empName} numberOfLines={1}>{item.employeeName}</Text>
        <Text style={styles.dateRange} numberOfLines={1}>
          {formatDate(item.from)} → {formatDate(item.to)}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Row 2: Days + Description */}
      <View style={styles.row}>
        <View style={styles.daysWrap}>
          <Text style={styles.cellLabel}>Duration</Text>
          <Text style={styles.daysText}>{calcDays(item.from, item.to)}</Text>
        </View>
        <View style={styles.descWrap}>
          <Text style={styles.cellLabel}>Description</Text>
          <Text style={styles.descText} numberOfLines={2}>
            {item.reason || 'No description'}
          </Text>
        </View>
      </View>

      {/* Action buttons — only for actionable statuses */}
      {canAct && (
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => onApprove(item.id)}
            style={({ pressed }) => [styles.actionBtn, styles.approveBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.actionBtnText}>✓ Approve</Text>
          </Pressable>
          <Pressable
            onPress={() => onReject(item.id)}
            style={({ pressed }) => [styles.actionBtn, styles.rejectBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.actionBtnText}>✕ Reject</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

export default function ManageLeaveRequestScreen() {
  const { user } = useContext(AuthContext);
  const { leaveRequests, hrEmployeeIds } = useContext(AppStoreContext);
  const { updateLeaveStatus } = useContext(AppStoreActionsContext);

  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  // HR users cannot see leave requests submitted by other HR users
  const visibleRequests = useMemo(() => {
    if (user?.role === 'hr') {
      return leaveRequests.filter(r => !hrEmployeeIds.has(r.employeeId));
    }
    return leaveRequests;
  }, [leaveRequests, hrEmployeeIds, user?.role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleRequests.filter(r => {
      if (activeFilter !== 'all' && r.rawStatus !== activeFilter) return false;
      if (q && !(r.employeeName || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [visibleRequests, activeFilter, search]);

  const onApprove = useCallback(id => updateLeaveStatus(id, 'Approved'), [updateLeaveStatus]);
  const onReject  = useCallback(id => updateLeaveStatus(id, 'Rejected'), [updateLeaveStatus]);

  const renderItem = useCallback(
    ({ item }) => <LeaveCard item={item} onApprove={onApprove} onReject={onReject} />,
    [onApprove, onReject],
  );

  // Count per filter tab
  const counts = useMemo(() => {
    const c = { all: visibleRequests.length };
    FILTER_TABS.slice(1).forEach(t => {
      c[t.value] = visibleRequests.filter(r => r.rawStatus === t.value).length;
    });
    return c;
  }, [visibleRequests]);

  return (
    <Screen>
      {/* Header */}
      <Card style={sharedStyles.listHeaderCard}>
        <Text style={sharedStyles.pageTitle}>Manage Leave Requests</Text>
        <Text style={sharedStyles.pageSubtitle}>{filtered.length} of {visibleRequests.length} requests</Text>

        {/* Search */}
        <TextInput
          style={sharedStyles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by employee name..."
          placeholderTextColor="#94a3b8"
        />
      </Card>

      {/* Filter tabs */}
      <View style={sharedStyles.tabsWrap}>
        <FlatList
          data={FILTER_TABS}
          keyExtractor={t => t.value}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={sharedStyles.tabsContent}
          renderItem={({ item: tab }) => {
            const active = activeFilter === tab.value;
            return (
              <Pressable
                onPress={() => setActiveFilter(tab.value)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                  {counts[tab.value] > 0 ? ` (${counts[tab.value]})` : ''}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={sharedStyles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={sharedStyles.emptyWrap}>
            <Text style={sharedStyles.emptyText}>No leave requests found.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* Filter tabs */
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tabTextActive: { color: '#fff' },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  rawBadge: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  rawBadgeText: { fontSize: 10, fontWeight: '600', color: '#64748b', textTransform: 'capitalize' },

  /* Row 1 */
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  empName: { fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  dateRange: { fontSize: 12, fontWeight: '700', color: colors.primary },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },

  /* Row 2 */
  daysWrap: { flex: 0.4 },
  descWrap: { flex: 0.6, alignItems: 'flex-end' },
  cellLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 2 },
  daysText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  descText: { fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'right' },

  /* Actions */
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  approveBtn: { backgroundColor: '#16a34a' },
  rejectBtn: { backgroundColor: '#ef4444' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
