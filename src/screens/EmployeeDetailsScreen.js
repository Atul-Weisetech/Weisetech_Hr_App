import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import hrApi from '../api/hrApi';

function formatCurrency(value) {
  const num = Number(value || 0);
  return `INR ${num.toFixed(2)}`;
}

function formatJoinDate(value) {
  if (!value) return '-';
  const raw = String(value).trim();

  if (/^\d+$/.test(raw)) {
    const num = Number(raw);
    const ms = raw.length <= 10 ? num * 1000 : num;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return raw;
}

function mapLeaveStatus(row) {
  const statusText = String(row.status_text || '').toLowerCase();
  if (statusText === 'approved') return 'Approved';
  if (statusText === 'declined') return 'Declined';

  const code = String(row.status || '0');
  if (code === '1') return 'Approved';
  if (code === '2') return 'Declined';
  return 'Pending';
}

function normalizeEmployee(e) {
  return {
    id: String(e.employee_id),
    name: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email_address,
    role: e.designation || 'Employee',
    email: e.email_address,
    status: e.is_active ? 'Active' : 'Inactive',
    salary: formatCurrency(e.salary),
    deductions: formatCurrency(e.deduction),
    joiningDate: formatJoinDate(e.joining_date),
  };
}

function parseMoney(input) {
  return Number(String(input || '').replace(/[^\d.-]/g, '')) || 0;
}

export default function EmployeeDetailsScreen() {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityRows, setActivityRows] = useState([]);
  const [rowActionsOpen, setRowActionsOpen] = useState(false);
  const [actionEmployee, setActionEmployee] = useState(null);

  const [form, setForm] = useState({
    name: '',
    role: '',
    email: '',
    salary: '',
    deductions: '',
    joiningDate: '',
    status: 'Active',
  });

  const selectedEmployee = useMemo(
    () => employees.find(e => e.id === selectedId) || null,
    [employees, selectedId],
  );

  const onChangeField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      role: '',
      email: '',
      salary: '',
      deductions: '',
      joiningDate: '',
      status: 'Active',
    });
  };

  const loadEmployees = () => {
    hrApi
      .get('/employees?includeInactive=true')
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : [];
        setEmployees(rows.map(normalizeEmployee));
      })
      .catch(error => {
        Alert.alert(
          'Could not load employees',
          error?.response?.data?.error || 'Backend connection failed.',
        );
      });
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const onAddEmployee = async () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      Alert.alert('Missing fields', 'Name and Email are required.');
      return;
    }

    const [firstName, ...rest] = trimmedName.split(' ');
    const lastName = rest.join(' ');

    const primaryPayload = {
      first_name: firstName,
      last_name: lastName || '',
      email_address: trimmedEmail,
      designation: form.role.trim() || 'Employee',
      salary: Number(form.salary || 0),
      deduction: Number(form.deductions || 0),
      joining_date: form.joiningDate.trim() || null,
    };

    try {
      await hrApi.post('/employees', primaryPayload);
      loadEmployees();
      resetForm();
      setAddOpen(false);
    } catch (error) {
      Alert.alert(
        'Could not add employee',
        error?.response?.data?.error || error?.response?.data?.message || 'Please check input and try again.',
      );
    }
  };

  const onOpenEdit = employee => {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      role: employee.role,
      email: employee.email,
      salary: String(parseMoney(employee.salary)),
      deductions: String(parseMoney(employee.deductions)),
      joiningDate: employee.joiningDate === '-' ? '' : employee.joiningDate,
      status: employee.status,
    });
    setEditOpen(true);
  };

  const onSaveEdit = () => {
    if (!editingId) return;

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const [firstName, ...rest] = trimmedName.split(' ');
    const lastName = rest.join(' ');

    hrApi
      .put(`/employees/${editingId}`, {
        first_name: firstName,
        last_name: lastName,
        email_address: trimmedEmail,
        designation: form.role.trim() || 'Employee',
        salary: Number(form.salary || 0),
        deduction: Number(form.deductions || 0),
        joining_date: form.joiningDate.trim() || null,
      })
      .then(() => {
        setEditOpen(false);
        setEditingId(null);
        resetForm();
        loadEmployees();
      })
      .catch(error => {
        Alert.alert(
          'Could not update employee',
          error?.response?.data?.error || 'Please check input and try again.',
        );
      });
  };

  const onDeactivate = employee => {
    Alert.alert(
      'Deactivate Employee',
      `Deactivate ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            hrApi
              .patch(`/employees/${employee.id}/deactivate`)
              .then(() => loadEmployees())
              .catch(error => {
                Alert.alert(
                  'Could not deactivate employee',
                  error?.response?.data?.error || 'Please try again.',
                );
              });
          },
        },
      ],
    );
  };

  const onViewPayrolls = employee => {
    hrApi
      .get(`/payrolls/employee/${employee.id}`)
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : [];
        const mapped = rows.map(r => ({
          id: String(r.id),
          line1: `${r.pay_month || '-'} | INR ${Number(r.payroll_amount || 0).toFixed(2)}`,
          line2: `${String(r.payroll_date || '').slice(0, 10)} | ${r.mode_of_payment || 'N/A'}`,
        }));
        setActivityTitle(`Payrolls - ${employee.name}`);
        setActivityRows(mapped);
        setActivityOpen(true);
      })
      .catch(error => {
        Alert.alert(
          'Could not load payrolls',
          error?.response?.data?.error || 'Please try again.',
        );
      });
  };

  const onViewLeaves = employee => {
    hrApi
      .get(`/leave-requests/employee/${employee.id}`)
      .then(({ data }) => {
        const rows = Array.isArray(data?.data) ? data.data : [];
        const mapped = rows.map(r => ({
          id: String(r.id),
          line1: `${String(r.from_date).slice(0, 10)} to ${String(r.to_date).slice(0, 10)}`,
          line2: `${mapLeaveStatus(r)} | ${r.description || 'No description'}`,
        }));
        setActivityTitle(`Leaves - ${employee.name}`);
        setActivityRows(mapped);
        setActivityOpen(true);
      })
      .catch(error => {
        Alert.alert(
          'Could not load leaves',
          error?.response?.data?.error || 'Please try again.',
        );
      });
  };

  const openRowActions = employee => {
    setActionEmployee(employee);
    setRowActionsOpen(true);
  };

  return (
    <Screen>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Employee Details</Text>
            <Text style={styles.subtitle}>Manage employee actions and details.</Text>
          </View>
          <Pressable
            onPress={() => setAddOpen(true)}
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>
      </Card>

      <Card style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              {['Name', 'Role', 'Email', 'Salary', 'Deduction', 'Joining Date', 'Actions'].map(h => (
                <Text key={h} style={[styles.th, h === 'Actions' && styles.actionsCol]}>{h}</Text>
              ))}
            </View>

            <FlatList
              data={employees}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#f8fafc' }]}
                >
                  <Text style={styles.td}>{item.name}</Text>
                  <Text style={styles.td}>{item.role}</Text>
                  <Text style={styles.td}>{item.email}</Text>
                  <Text style={styles.td}>{item.salary}</Text>
                  <Text style={styles.td}>{item.deductions}</Text>
                  <Text style={styles.td}>{item.joiningDate}</Text>
                  <View style={[styles.td, styles.actionsCol, styles.actionsRow]}>
                    <Pressable style={styles.ellipsisBtn} onPress={() => openRowActions(item)}>
                      <Text style={styles.ellipsisText}>...</Text>
                    </Pressable>
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </ScrollView>
      </Card>

      <Modal visible={!!selectedEmployee} transparent animationType="fade" onRequestClose={() => setSelectedId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedId(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Employee Details</Text>
            {selectedEmployee && (
              <View style={{ gap: 8 }}>
                {[
                  ['Name', selectedEmployee.name],
                  ['Role', selectedEmployee.role],
                  ['Email', selectedEmployee.email],
                  ['Salary', selectedEmployee.salary],
                  ['Deduction', selectedEmployee.deductions],
                  ['Joining Date', selectedEmployee.joiningDate],
                  ['Status', selectedEmployee.status],
                ].map(([k, v]) => (
                  <View key={k} style={styles.kvRow}>
                    <Text style={styles.k}>{k}</Text>
                    <Text style={styles.v}>{v}</Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable style={styles.closeBtn} onPress={() => setSelectedId(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addOpen || editOpen} transparent animationType="fade" onRequestClose={() => { setAddOpen(false); setEditOpen(false); }}>
        <Pressable style={styles.modalBackdrop} onPress={() => { setAddOpen(false); setEditOpen(false); }}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editOpen ? 'Edit Employee' : 'Add Employee'}</Text>
            <View style={{ gap: 8 }}>
              <TextInput style={styles.input} value={form.name} onChangeText={text => onChangeField('name', text)} placeholder="Employee name" />
              <TextInput style={styles.input} value={form.role} onChangeText={text => onChangeField('role', text)} placeholder="Role" />
              <TextInput style={styles.input} value={form.email} onChangeText={text => onChangeField('email', text)} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} value={form.salary} onChangeText={text => onChangeField('salary', text)} placeholder="Salary" keyboardType="numeric" />
              <TextInput style={styles.input} value={form.deductions} onChangeText={text => onChangeField('deductions', text)} placeholder="Deduction" keyboardType="numeric" />
              <TextInput style={styles.input} value={form.joiningDate} onChangeText={text => onChangeField('joiningDate', text)} placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.addActionsRow}>
              <Pressable onPress={() => { setAddOpen(false); setEditOpen(false); resetForm(); }} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={editOpen ? onSaveEdit : onAddEmployee} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>{editOpen ? 'Update' : 'Save'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={activityOpen} transparent animationType="fade" onRequestClose={() => setActivityOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActivityOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{activityTitle}</Text>
            {activityRows.length === 0 ? (
              <Text style={styles.emptyActivity}>No records found.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {activityRows.map(r => (
                  <View key={r.id} style={styles.activityRow}>
                    <Text style={styles.activityLine1}>{r.line1}</Text>
                    <Text style={styles.activityLine2}>{r.line2}</Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable style={styles.closeBtn} onPress={() => setActivityOpen(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={rowActionsOpen} transparent animationType="fade" onRequestClose={() => setRowActionsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRowActionsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Actions</Text>
            {[
              ['Edit', () => { setRowActionsOpen(false); onOpenEdit(actionEmployee); }],
              ['Deactivate', () => { setRowActionsOpen(false); onDeactivate(actionEmployee); }],
              ['View Payrolls', () => { setRowActionsOpen(false); onViewPayrolls(actionEmployee); }],
              ['View Leaves', () => { setRowActionsOpen(false); onViewLeaves(actionEmployee); }],
            ].map(([label, fn]) => (
              <Pressable key={label} style={styles.menuItem} onPress={fn}>
                <Text style={styles.menuText}>{label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 4, color: '#64748b', fontWeight: '600' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  addButton: { backgroundColor: '#16a34a', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  th: { width: 120, fontSize: 11, fontWeight: '800', color: '#0f172a' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  td: { width: 120, fontSize: 11, fontWeight: '600', color: '#334155' },
  sep: { height: 1, backgroundColor: '#f1f5f9' },
  tableScrollContent: { flexGrow: 1 },
  tableContainer: { minWidth: 1060 },
  actionsCol: { width: 330 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ellipsisBtn: { backgroundColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ellipsisText: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  menuItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  menuText: { color: '#0f172a', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', padding: 18, justifyContent: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  k: { color: '#64748b', fontWeight: '800', flex: 1 },
  v: { color: '#0f172a', fontWeight: '700', flex: 1, textAlign: 'right' },
  closeBtn: { marginTop: 14, backgroundColor: '#e11d48', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: '#ffffff' },
  addActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  secondaryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db' },
  secondaryBtnText: { color: '#374151', fontWeight: '700' },
  primaryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1d4ed8' },
  primaryBtnText: { color: '#ffffff', fontWeight: '800' },
  emptyActivity: { color: '#64748b', fontWeight: '600' },
  activityRow: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  activityLine1: { color: '#0f172a', fontWeight: '800', fontSize: 12 },
  activityLine2: { color: '#64748b', fontWeight: '600', fontSize: 11, marginTop: 4 },
});
