import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext, AppStoreActionsContext } from '../../state/AppStore';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'requested', label: 'Pending' },
  { key: 'declined', label: 'Declined' },
  { key: 'cancel_requested', label: 'Cancel Requested' },
  { key: 'canceled', label: 'Canceled' },
];

const STATUS_STYLE = {
  Approved: { bg: '#dcfce7', text: '#16a34a' },
  Declined: { bg: '#fee2e2', text: '#dc2626' },
  Rejected: { bg: '#fee2e2', text: '#dc2626' },
  Pending: { bg: '#fef9c3', text: '#92400e' },
  Canceled: { bg: '#e5e7eb', text: '#475569' },
  'Cancel Requested': { bg: '#ffedd5', text: '#c2410c' },
};

function calculateDaysInclusive(fromDate, toDate) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}
 function formatDate(dataString){
  return new Date(dataString).toISOString().split('T')[0];
 }
 

function formatStatusFromRaw(rawStatus, fallbackStatus) {
  if (rawStatus === 'approved') return 'Approved';
  if (rawStatus === 'declined') return 'Declined';
  if (rawStatus === 'cancel_requested') return 'Cancel Requested';
  if (rawStatus === 'canceled') return 'Canceled';
  if (rawStatus === 'requested') return 'Pending';
  if (fallbackStatus === 'Rejected') return 'Declined';
  return fallbackStatus || 'Pending';
}

export default function EmpWfhScreen() {
  const { user } = useContext(AuthContext);
  const { wfhRequests } = useContext(AppStoreContext);
  const { addWfhRequest, updateWfhStatus } = useContext(AppStoreActionsContext);
  const myEmployeeId = String(user.employeeId || user.id);

  const myWfh = useMemo(
    () => wfhRequests.filter(r => String(r.employeeId) === myEmployeeId),
    [wfhRequests, myEmployeeId],
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [form, setForm] = useState({ from: '', to: '', reason: '' });

  const filteredWfh = useMemo(() => {
    if (activeFilter === 'all') return myWfh;
    return myWfh.filter(r => (r.rawStatus || '').toLowerCase() === activeFilter);
  }, [myWfh, activeFilter]);

  const handleSubmit = async () => {
    if (!form.from.trim() || !form.to.trim()) {
      return Alert.alert('Missing fields', 'Please enter From and To dates.');
    }
    try {
      await addWfhRequest({
        employeeId: user.employeeId || user.id,
        employeeName: user.name,
        from: form.from.trim(),
        to: form.to.trim(),
        reason: form.reason.trim(),
      });
      setForm({ from: '', to: '', reason: '' });
      setModalVisible(false);
    } catch (error) {
      Alert.alert(
        'Could not submit WFH request',
        error?.response?.data?.error || 'Please try again.',
      );
    }
  };

  const handleCancelRequest = async requestId => {
    try {
      await updateWfhStatus(requestId, 'Pending');
      Alert.alert('Sent', 'Cancel request submitted for review.');
    } catch (error) {
      Alert.alert('Could not request cancel', error?.response?.data?.error || 'Please try again.');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Work From Home</Text>
          <TouchableOpacity style={styles.applyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.applyBtnText}>+ Apply</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          {['Approved', 'Pending', 'Declined'].map(s => (
            <View key={s} style={[styles.summaryCard, { borderTopColor: STATUS_STYLE[s].text }]}>
              <Text style={[styles.summaryCount, { color: STATUS_STYLE[s].text }]}>
                {
                  myWfh.filter(
                    r => formatStatusFromRaw(r.rawStatus, r.status).toLowerCase() === s.toLowerCase(),
                  ).length
                }
              </Text>
              <Text style={styles.summaryLabel}>{s}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterPill, activeFilter === item.key && styles.filterPillActive]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === item.key && styles.filterPillTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredWfh.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="home-city-outline"
              size={44}
              color="#9ca3af"
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No WFH requests found</Text>
            <Text style={styles.emptySubtitle}>Try another filter or tap "+ Apply".</Text>
          </View>
        ) : (
          filteredWfh.map(r => {
            const statusLabel = formatStatusFromRaw(r.rawStatus, r.status);
            const col = STATUS_STYLE[statusLabel] || STATUS_STYLE.Pending;
            const canRequestCancel = (r.rawStatus || '').toLowerCase() === 'approved';

            const actionText =
              (r.rawStatus || '').toLowerCase() === 'cancel_requested'
                ? 'Cancel In Review'
                : (r.rawStatus || '').toLowerCase() === 'canceled'
                  ? 'Canceled'
                  : (r.rawStatus || '').toLowerCase() === 'declined'
                    ? 'No Action'
                    : (r.rawStatus || '').toLowerCase() === 'requested'
                      ? 'Waiting Approval'
                      : 'Request Cancel';

            return (
              <View key={r.id} style={styles.wfhCard}>
                <View style={styles.wfhLine}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>WFH</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: col.bg }]}>
                    <Text style={[styles.statusText, { color: col.text }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.wfhLine}>
                  <Text style={styles.dateRange}>
  {formatDate(r.from)} - {formatDate(r.to)}
</Text>
                  <Text style={styles.daysText}>Days: {calculateDaysInclusive(r.from, r.to)}</Text>
                </View>

                <View style={styles.lastLine}>
                  <Text style={styles.reason} numberOfLines={1}>
                    Description: {r.reason || '-'}
                  </Text>
                  <View style={styles.lastLineBottom}>
                    <Text style={styles.reviewedByText}>Reviewed By: {r.reviewedBy || 'Smart One'}</Text>
                    {canRequestCancel ? (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() =>
                          Alert.alert(
                            'Request Cancel',
                            'Do you want to request cancellation of this WFH?',
                            [
                              { text: 'No', style: 'cancel' },
                              { text: 'Yes', onPress: () => handleCancelRequest(r.id) },
                            ],
                          )
                        }
                      >
                        <Text style={styles.actionBtnText}>Request Cancel</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.actionText}>Action: {actionText}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply for WFH</Text>

            <Text style={styles.fieldLabel}>From Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.from}
              onChangeText={v => setForm(f => ({ ...f, from: v }))}
              placeholder="2026-03-01"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>To Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.to}
              onChangeText={v => setForm(f => ({ ...f, to: v }))}
              placeholder="2026-03-03"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.reason}
              onChangeText={v => setForm(f => ({ ...f, reason: v }))}
              placeholder="Brief reason for WFH..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20, paddingBottom: 32 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  applyBtn: { backgroundColor: '#e11d48', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCount: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 3 },

  filterRow: { gap: 8, marginBottom: 14, paddingRight: 10 },
  filterPill: {
    height: 34,
    borderRadius: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
  },
  filterPillActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  filterPillText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  filterPillTextActive: { color: '#ffffff' },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af' },

  wfhCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  wfhLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  typeBadge: { backgroundColor: '#fff1f2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  typeText: { color: '#e11d48', fontWeight: '700', fontSize: 13 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontWeight: '700', fontSize: 13 },
  dateRange: { fontSize: 13, fontWeight: '700', color: '#374151' },
  daysText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  lastLine: { gap: 8 },
  reason: { fontSize: 13, color: '#6b7280' },
  lastLineBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  reviewedByText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  actionText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  actionBtn: {
    backgroundColor: '#e11d48',
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 7, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: { height: 80, textAlignVertical: 'top' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#6b7280', fontWeight: '700', fontSize: 15 },
  submitBtn: {
    flex: 1,
    backgroundColor: '#e11d48',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
