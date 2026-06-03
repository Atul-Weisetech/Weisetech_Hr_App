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
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext, AppStoreActionsContext } from '../../state/AppStore';

const LEAVE_TYPES = ['Sick', 'Casual', 'Annual', 'Emergency'];
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
  const start = parseDateInputValue(fromDate);
  const end = parseDateInputValue(toDate);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}
function normalizeDateString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toDateInputValue(value);
  return String(value).slice(0, 10);
}
function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function parseDateInputValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const normalized = normalizeDateString(value);
  if (!normalized || normalized.length < 10) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDate(dateString) {
  return normalizeDateString(dateString) || '-';
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

export default function EmpLeaveScreen() {
  const { user } = useContext(AuthContext);
  const { leaveRequests } = useContext(AppStoreContext);
  const { addLeaveRequest, updateLeaveStatus } = useContext(AppStoreActionsContext);
  const myEmployeeId = String(user.employeeId || user.id);

  const myLeaves = useMemo(
    () => leaveRequests.filter(r => String(r.employeeId) === myEmployeeId),
    [leaveRequests, myEmployeeId],
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeDateField, setActiveDateField] = useState(null);
  const [form, setForm] = useState({ type: 'Sick', from: '', to: '', reason: '' });

  const filteredLeaves = useMemo(() => {
    if (activeFilter === 'all') return myLeaves;
    return myLeaves.filter(r => (r.rawStatus || '').toLowerCase() === activeFilter);
  }, [myLeaves, activeFilter]);

  const handleSubmit = async () => {
    if (!form.from.trim() || !form.to.trim()) {
      return Alert.alert('Missing fields', 'Please enter From and To dates.');
    }
    try {
      await addLeaveRequest({
        employeeId: user.employeeId || user.id,
        employeeName: user.name,
        type: form.type,
        from: form.from.trim(),
        to: form.to.trim(),
        reason: form.reason.trim(),
      });
      setForm({ type: 'Sick', from: '', to: '', reason: '' });
      setActiveDateField(null);
      setModalVisible(false);
    } catch (error) {
      Alert.alert(
        'Could not submit leave request',
        error?.response?.data?.error || 'Please try again.',
      );
    }
  };

  const openDatePicker = field => {
    const currentValue = parseDateInputValue(form[field]) || new Date();
    const minimumDate = field === 'to' ? parseDateInputValue(form.from) || undefined : undefined;

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentValue,
        mode: 'date',
        display: 'calendar',
        minimumDate,
        onChange: (event, selectedDate) => {
          if (event?.type === 'dismissed' || !selectedDate) return;
          const nextValue = toDateInputValue(selectedDate);
          setForm(prev => {
            if (field === 'from') {
              const nextToDate = parseDateInputValue(prev.to);
              const shouldSyncTo = !nextToDate || nextToDate < selectedDate;
              return { ...prev, from: nextValue, to: shouldSyncTo ? nextValue : prev.to };
            }
            return { ...prev, to: nextValue };
          });
        },
      });
      return;
    }

    setActiveDateField(field);
  };

  const handleInlineDateChange = (field, selectedDate) => {
    if (!selectedDate) return;
    const nextValue = toDateInputValue(selectedDate);
    setForm(prev => {
      if (field === 'from') {
        const nextToDate = parseDateInputValue(prev.to);
        const shouldSyncTo = !nextToDate || nextToDate < selectedDate;
        return { ...prev, from: nextValue, to: shouldSyncTo ? nextValue : prev.to };
      }
      return { ...prev, to: nextValue };
    });
  };

  const handleCancelRequest = async leaveId => {
    try {
      await updateLeaveStatus(leaveId, 'Pending');
      Alert.alert('Sent', 'Cancel request submitted for review.');
    } catch (error) {
      Alert.alert('Could not request cancel', error?.response?.data?.error || 'Please try again.');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Leave Requests</Text>
          <TouchableOpacity style={styles.applyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.applyBtnText}>+ Apply</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          {['Approved', 'Pending', 'Declined'].map(s => (
            <View key={s} style={[styles.summaryCard, { borderTopColor: STATUS_STYLE[s].text }]}>
              <Text style={[styles.summaryCount, { color: STATUS_STYLE[s].text }]}>
                {
                  myLeaves.filter(
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

        {filteredLeaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={44}
              color="#9ca3af"
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No leave requests found</Text>
            <Text style={styles.emptySubtitle}>Try another filter or tap "+ Apply".</Text>
          </View>
        ) : (
          filteredLeaves.map(r => {
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
              <View key={r.id} style={styles.leaveCard}>
                <View style={styles.leaveLine}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{r.type}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: col.bg }]}>
                    <Text style={[styles.statusText, { color: col.text }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.leaveLine}>
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
                            'Do you want to request cancellation of this leave?',
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
            <Text style={styles.modalTitle}>Apply for Leave</Text>

            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.typeRow}>
              {LEAVE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typePill, form.type === t && styles.typePillActive]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                >
                  <Text style={[styles.typePillText, form.type === t && styles.typePillTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>From Date</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('from')}>
              <Text style={[styles.dateInputText, !form.from && styles.datePlaceholder]}>
                {form.from || 'Select from date'}
              </Text>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#6b7280" />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>To Date</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('to')}>
              <Text style={[styles.dateInputText, !form.to && styles.datePlaceholder]}>
                {form.to || 'Select to date'}
              </Text>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#6b7280" />
            </TouchableOpacity>

            {Platform.OS !== 'android' && activeDateField && (
              <View style={styles.inlinePickerWrap}>
                <DateTimePicker
                  value={parseDateInputValue(form[activeDateField]) || new Date()}
                  mode="date"
                  display="calendar"
                  minimumDate={
                    activeDateField === 'to' ? parseDateInputValue(form.from) || undefined : undefined
                  }
                  onChange={(event, selectedDate) => {
                    if (event?.type === 'dismissed') {
                      setActiveDateField(null);
                      return;
                    }
                    handleInlineDateChange(activeDateField, selectedDate);
                  }}
                />
                <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setActiveDateField(null)}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.fieldLabel}>Reason (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.reason}
              onChangeText={v => setForm(f => ({ ...f, reason: v }))}
              placeholder="Brief reason..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setActiveDateField(null);
                  setModalVisible(false);
                }}
              >
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

  leaveCard: {
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
  leaveLine: {
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
  dateInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateInputText: { fontSize: 15, color: '#111827', flex: 1 },
  datePlaceholder: { color: '#9ca3af' },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  typePillActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  typePillText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  typePillTextActive: { color: '#ffffff' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  inlinePickerWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  pickerDoneBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#e11d48',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  pickerDoneText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
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
