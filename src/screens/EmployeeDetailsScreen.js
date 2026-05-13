import React, { useContext, useEffect, useMemo, useState } from 'react';
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
import { AuthContext } from '../state/AuthContext';


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
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const { user } = useContext(AuthContext);
  const canAddHrAccount = user?.role === 'admin' || user?.userRole === 0;

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
  const [addUserType, setAddUserType] = useState('employee');

  const selectedEmployee = useMemo(
    () => employees.find(e => e.id === selectedId) || null,
    [employees, selectedId],
  );

  const onChangeField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm({ name: '', role: '', email: '', salary: '', deductions: '', joiningDate: '', status: 'Active' });
    setAddUserType('employee');
  };

  const loadEmployees = () => {
    const includeHR = canAddHrAccount ? '?includeHR=true' : '';
    hrApi
      .get(`/employees${includeHR}`)
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : [];
        setEmployees(rows.map(normalizeEmployee));
      })
      .catch(error => {
        Alert.alert('Could not load employees', error?.response?.data?.error || 'Backend connection failed.');
      });
  };

  useEffect(() => { loadEmployees(); }, [canAddHrAccount]);

  const onAddEmployee = async () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      Alert.alert('Missing fields', 'Name and Email are required.');
      return;
    }
    const [firstName, ...rest] = trimmedName.split(' ');
    const lastName = rest.join(' ');

    // Send both email + email_address so both local and hosted backends validate correctly.
    // Local backend strips `email` and `password` before INSERT (safe).
    // Hosted backend validates `email` + `password` before creating the account.
    const primaryPayload = {
      first_name: firstName,
      last_name: lastName || '',
      email_address: trimmedEmail,
      email: trimmedEmail,
      designation: form.role.trim() || 'Employee',
      salary: Number(form.salary || 0),
      deduction: Number(form.deductions || 0),
      joining_date: form.joiningDate.trim() || null,
    };

    // /add-hr uses named fields (not SET ?) and validates `email`
    const hrPayload = {
      firstname: firstName,
      lastname: lastName || '',
      email: trimmedEmail,
      salary: Number(form.salary || 0),
      deduction: Number(form.deductions || 0),
      joiningDate: form.joiningDate.trim() || null,
    };

    try {
      if (canAddHrAccount && addUserType === 'hr') {
        await hrApi.post('/add-hr', hrPayload);
      } else {
        await hrApi.post('/employees', primaryPayload);
      }
      loadEmployees();
      resetForm();
      setAddOpen(false);
    } catch (error) {
      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        (error?.message ? String(error.message) : 'Please check input and try again.');
      Alert.alert(
        'Could not add employee',
        `${backendMessage}\nAPI: ${hrApi.defaults.baseURL}`,
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
      .then(() => { setEditOpen(false); setEditingId(null); resetForm(); loadEmployees(); })
      .catch(error => {
        Alert.alert('Could not update employee', error?.response?.data?.error || 'Please check input and try again.');
      });
  };

  const onDeactivate = employee => {
    Alert.alert('Deactivate Employee', `Deactivate ${employee.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          hrApi
            .patch(`/employees/${employee.id}/deactivate`)
            .then(() => loadEmployees())
            .catch(error => {
              Alert.alert('Could not deactivate employee', error?.response?.data?.error || 'Please try again.');
            });
        },
      },
    ]);
  };

  const onViewPayrolls = employee => {
    hrApi
      .get(`/payrolls/employee/${employee.id}`)
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : [];
        setActivityTitle(`Payrolls — ${employee.name}`);
        setActivityRows(rows.map(r => ({
          id: String(r.id),
          line1: `${r.pay_month || '-'} | INR ${Number(r.payroll_amount || 0).toFixed(2)}`,
          line2: `${String(r.payroll_date || '').slice(0, 10)} | ${r.mode_of_payment || 'N/A'}`,
        })));
        setActivityOpen(true);
      })
      .catch(error => {
        Alert.alert('Could not load payrolls', error?.response?.data?.error || 'Please try again.');
      });
  };

  const onViewLeaves = employee => {
    hrApi
      .get(`/leave-requests/employee/${employee.id}`)
      .then(({ data }) => {
        const rows = Array.isArray(data?.data) ? data.data : [];
        setActivityTitle(`Leaves — ${employee.name}`);
        setActivityRows(rows.map(r => ({
          id: String(r.id),
          line1: `${String(r.from_date).slice(0, 10)} to ${String(r.to_date).slice(0, 10)}`,
          line2: `${mapLeaveStatus(r)} | ${r.description || 'No description'}`,
        })));
        setActivityOpen(true);
      })
      .catch(error => {
        Alert.alert('Could not load leaves', error?.response?.data?.error || 'Please try again.');
      });
  };

  const openRowActions = employee => { setActionEmployee(employee); setRowActionsOpen(true); };

  const renderEmployeeCard = ({ item }) => (
    <Pressable
      onPress={() => setSelectedId(item.id)}
      style={({ pressed }) => [styles.empCard, pressed && { opacity: 0.92 }]}
    >
      {/* Actions button — top right */}
      <Pressable
        style={styles.cardMenuBtn}
        onPress={e => { e.stopPropagation(); openRowActions(item); }}
        hitSlop={8}
      >
        <Text style={styles.cardMenuText}>•••</Text>
      </Pressable>

      {/* Status badge */}
      <View style={[styles.statusBadge, item.status === 'Active' ? styles.badgeActive : styles.badgeInactive]}>
        <Text style={[styles.statusBadgeText, item.status === 'Active' ? styles.badgeActiveText : styles.badgeInactiveText]}>
          {item.status}
        </Text>
      </View>

      {/* Row 1: Name + Role */}
      <View style={styles.cardRow}>
        <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText} numberOfLines={1}>{item.role}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Row 2: Email + Salary */}
      <View style={styles.cardRow}>
        <View style={styles.cardCell}>
          <Text style={styles.cellLabel}>Email</Text>
          <Text style={styles.cellValue} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={[styles.cardCell, styles.cellRight]}>
          <Text style={styles.cellLabel}>Salary</Text>
          <Text style={styles.cellValue}>{item.salary}</Text>
        </View>
      </View>

      {/* Row 3: Deduction + Joining Date */}
      <View style={[styles.cardRow, { marginTop: 8 }]}>
        <View style={styles.cardCell}>
          <Text style={styles.cellLabel}>Deduction</Text>
          <Text style={styles.cellValue}>{item.deductions}</Text>
        </View>
        <View style={[styles.cardCell, styles.cellRight]}>
          <Text style={styles.cellLabel}>Joined</Text>
          <Text style={styles.cellValue}>{item.joiningDate}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <Screen>
      {/* Header */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Employee Details</Text>
            <Text style={styles.subtitle}>{employees.length} employees</Text>
          </View>
          <Pressable
            onPress={() => setAddOpen(true)}
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>
      </Card>

      {/* Employee Cards */}
      <FlatList
        data={employees}
        keyExtractor={item => item.id}
        renderItem={renderEmployeeCard}
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No employees found.</Text>
          </View>
        }

      />

      {/* Employee Detail Modal */}
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

      {/* Add / Edit Modal */}
      <Modal
        visible={addOpen || editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { setAddOpen(false); setEditOpen(false); }}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => { setAddOpen(false); setEditOpen(false); }}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editOpen ? 'Edit Employee' : 'Add Employee'}</Text>
            {!editOpen && canAddHrAccount ? (
              <View style={styles.typeToggleRow}>
                <Pressable
                  style={[
                    styles.typeToggleButton,
                    addUserType === 'employee' && styles.typeToggleButtonActive,
                  ]}
                  onPress={() => setAddUserType('employee')}
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      addUserType === 'employee' && styles.typeToggleTextActive,
                    ]}
                  >
                    Employee
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeToggleButton,
                    addUserType === 'hr' && styles.typeToggleButtonActive,
                  ]}
                  onPress={() => setAddUserType('hr')}
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      addUserType === 'hr' && styles.typeToggleTextActive,
                    ]}
                  >
                    HR
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <View style={{ gap: 8 }}>
              <TextInput style={styles.input} value={form.name} onChangeText={t => onChangeField('name', t)} placeholder="Employee name" />
              <TextInput style={styles.input} value={form.role} onChangeText={t => onChangeField('role', t)} placeholder="Role" />
              <TextInput style={styles.input} value={form.email} onChangeText={t => onChangeField('email', t)} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} value={form.salary} onChangeText={t => onChangeField('salary', t)} placeholder="Salary" keyboardType="numeric" />
              <TextInput style={styles.input} value={form.deductions} onChangeText={t => onChangeField('deductions', t)} placeholder="Deduction" keyboardType="numeric" />
              <TextInput style={styles.input} value={form.joiningDate} onChangeText={t => onChangeField('joiningDate', t)} placeholder="YYYY-MM-DD" />
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

      {/* Activity (Payrolls / Leaves) Modal */}
      <Modal visible={activityOpen} transparent animationType="fade" onRequestClose={() => setActivityOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActivityOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{activityTitle}</Text>
            {activityRows.length === 0 ? (
              <Text style={styles.emptyActivity}>No records found.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {activityRows.map(r => (
                    <View key={r.id} style={styles.activityRow}>
                      <Text style={styles.activityLine1}>{r.line1}</Text>
                      <Text style={styles.activityLine2}>{r.line2}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            <Pressable style={styles.closeBtn} onPress={() => setActivityOpen(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Row Actions Modal */}
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
  /* Header */
  headerCard: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 2, color: '#64748b', fontWeight: '600', fontSize: 12 },
  addButton: { backgroundColor: '#16a34a', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },

  /* Card grid */
  cardList: { paddingBottom: 12 },

  /* Employee card */
  empCard: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  cardMenuBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  cardMenuText: { fontSize: 13, color: '#475569', fontWeight: '900', letterSpacing: 1 },

  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  badgeActiveText: { color: '#15803d' },
  badgeInactiveText: { color: '#b91c1c' },

  empName: { fontSize: 13, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 6 },
  rolePill: { backgroundColor: '#fce7ef', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  roleText: { fontSize: 10, fontWeight: '700', color: '#CC0D49' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardCell: { flex: 1 },
  cellRight: { alignItems: 'flex-end' },
  cellLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 1 },
  cellValue: { fontSize: 11, fontWeight: '700', color: '#334155' },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', padding: 18, justifyContent: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  k: { color: '#64748b', fontWeight: '800', flex: 1 },
  v: { color: '#0f172a', fontWeight: '700', flex: 1, textAlign: 'right' },
  closeBtn: { marginTop: 14, backgroundColor: '#e11d48', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: '#ffffff' },
  typeToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeToggleButton: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  typeToggleButtonActive: { backgroundColor: '#fce7ef', borderColor: '#CC0D49' },
  typeToggleText: { color: '#475569', fontWeight: '700' },
  typeToggleTextActive: { color: '#CC0D49', fontWeight: '800' },
  addActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  secondaryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db' },
  secondaryBtnText: { color: '#374151', fontWeight: '700' },
  primaryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#CC0D49' },
  primaryBtnText: { color: '#ffffff', fontWeight: '800' },
  menuItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  menuText: { color: '#0f172a', fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94a3b8', fontWeight: '600' },
  emptyActivity: { color: '#64748b', fontWeight: '600' },
  activityRow: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10 },
  activityLine1: { color: '#0f172a', fontWeight: '800', fontSize: 12 },
  activityLine2: { color: '#64748b', fontWeight: '600', fontSize: 11, marginTop: 4 },
});
