import React, { useContext, useState } from 'react';
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
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext } from '../../state/AppStore';

const STATUS_STYLE = {
  Approved: { bg: '#dcfce7', text: '#16a34a' },
  Rejected: { bg: '#fee2e2', text: '#dc2626' },
  Pending:  { bg: '#fef9c3', text: '#92400e' },
};

export default function EmpWfhScreen() {
  const { user } = useContext(AuthContext);
  const { wfhRequests, addWfhRequest } = useContext(AppStoreContext);

  const myWfh = wfhRequests.filter(r => r.employeeId === user.id);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ from: '', to: '', reason: '' });

  const handleSubmit = () => {
    if (!form.from.trim() || !form.to.trim()) {
      return Alert.alert('Missing fields', 'Please enter From and To dates.');
    }
    addWfhRequest({
      employeeId:   user.id,
      employeeName: user.name,
      from:         form.from.trim(),
      to:           form.to.trim(),
      reason:       form.reason.trim(),
    });
    setForm({ from: '', to: '', reason: '' });
    setModalVisible(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Work From Home</Text>
          <TouchableOpacity style={styles.applyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.applyBtnText}>+ Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          {['Approved', 'Pending', 'Rejected'].map(s => (
            <View key={s} style={[styles.summaryCard, { borderTopColor: STATUS_STYLE[s].text }]}>
              <Text style={[styles.summaryCount, { color: STATUS_STYLE[s].text }]}>
                {myWfh.filter(r => r.status === s).length}
              </Text>
              <Text style={styles.summaryLabel}>{s}</Text>
            </View>
          ))}
        </View>

        {/* List */}
        {myWfh.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏡</Text>
            <Text style={styles.emptyTitle}>No WFH requests yet</Text>
            <Text style={styles.emptySubtitle}>Tap "+ Apply" to submit one.</Text>
          </View>
        ) : (
          myWfh.map(r => {
            const col = STATUS_STYLE[r.status] || STATUS_STYLE.Pending;
            return (
              <View key={r.id} style={styles.wfhCard}>
                <View style={styles.cardTop}>
                  <View style={styles.wfhIconCircle}>
                    <Text style={styles.wfhIcon}>🏡</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: col.bg }]}>
                    <Text style={[styles.statusText, { color: col.text }]}>{r.status}</Text>
                  </View>
                </View>
                <Text style={styles.dateRange}>
                  {r.from}  →  {r.to}
                </Text>
                {r.reason ? <Text style={styles.reason}>{r.reason}</Text> : null}
                <Text style={styles.wfhId}>{r.id}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Apply Modal */}
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
  root:    { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 20, paddingBottom: 32 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  applyBtn:     { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
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

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon:     { fontSize: 44, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
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
  },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  wfhIconCircle:{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  wfhIcon:      { fontSize: 22 },
  statusBadge:  { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText:   { fontWeight: '700', fontSize: 13 },
  dateRange:    { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 },
  reason:       { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  wfhId:        { fontSize: 11, color: '#9ca3af' },

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
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
