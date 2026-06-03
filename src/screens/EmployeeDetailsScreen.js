import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
    firstName: '',
    lastName: '',
    email: '',
    designation: '',
    dateOfBirth: '',
    city: '',
    state: '',
    postalCode: '',
    addressLine1: '',
    addressLine2: '',
    salary: '',
    deduction: '',
    joiningDate: '',
    confirmationStatus: 'Pending',
    probationStatus: 'No',
  });
  const [addUserType, setAddUserType] = useState('employee');

  const selectedEmployee = useMemo(
    () => employees.find(e => e.id === selectedId) || null,
    [employees, selectedId],
  );

  const onChangeField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm({
      firstName: '', lastName: '', email: '', designation: '', dateOfBirth: '',
      city: '', state: '', postalCode: '', addressLine1: '', addressLine2: '',
      salary: '', deduction: '', joiningDate: '', confirmationStatus: 'Pending', probationStatus: 'No',
    });
    setAddUserType('employee');
  };

  const loadEmployees = useCallback(() => {
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
  }, [canAddHrAccount]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const onAddEmployee = async () => {
    const firstName = form.firstName.trim();
    const lastName  = form.lastName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!firstName || !trimmedEmail) {
      Alert.alert('Missing fields', 'First name and Email are required.');
      return;
    }

    const primaryPayload = {
      first_name: firstName,
      last_name: lastName,
      email_address: trimmedEmail,
      email: trimmedEmail,
      designation: form.designation.trim() || 'Employee',
      date_of_birth: form.dateOfBirth.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postal_code: form.postalCode.trim() || null,
      address_line1: form.addressLine1.trim() || null,
      address_line2: form.addressLine2.trim() || null,
      salary: Number(form.salary || 0),
      deduction: Number(form.deduction || 0),
      joining_date: form.joiningDate.trim() || null,
      confirmation_status: form.confirmationStatus,
      probation_status: form.probationStatus,
    };

    const hrPayload = {
      firstname: firstName,
      lastname: lastName,
      email: trimmedEmail,
      salary: Number(form.salary || 0),
      deduction: Number(form.deduction || 0),
      joiningDate: form.joiningDate.trim() || null,
      dateOfBirth: form.dateOfBirth.trim() || null,
      address: [form.addressLine1, form.city, form.state, form.postalCode].filter(Boolean).join(', ') || null,
      confirmationStatus: form.confirmationStatus,
      probationStatus: form.probationStatus,
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
    const nameParts = (employee.name || '').trim().split(' ');
    setForm({
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: employee.email || '',
      designation: employee.role || '',
      dateOfBirth: '', city: '', state: '', postalCode: '',
      addressLine1: '', addressLine2: '',
      salary: String(parseMoney(employee.salary)),
      deduction: String(parseMoney(employee.deductions)),
      joiningDate: employee.joiningDate === '-' ? '' : employee.joiningDate,
      confirmationStatus: 'Pending',
      probationStatus: 'No',
    });
    setEditOpen(true);
  };

  const onSaveEdit = () => {
    if (!editingId) return;
    const trimmedEmail = form.email.trim().toLowerCase();
    hrApi
      .put(`/employees/${editingId}`, {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email_address: trimmedEmail,
        designation: form.designation.trim() || 'Employee',
        salary: Number(form.salary || 0),
        deduction: Number(form.deduction || 0),
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
      <View style={[styles.cardRow, styles.cardRowSpaced]}>
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
          <View style={styles.headerContent}>
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
              <View style={styles.detailList}>
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
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{editOpen ? 'Edit Employee' : 'Add Employee'}</Text>
              <Text style={styles.modalSubtitle}>
                {editOpen
                  ? 'Update the employee profile and payroll details below.'
                  : 'Fill in the employee identity, contact, and salary information.'}
              </Text>

              {!editOpen && canAddHrAccount ? (
                <View style={styles.typeBlock}>
                  <Text style={styles.sectionLabel}>Account Type</Text>
                  <Text style={styles.sectionHint}>Choose whether you are creating an employee account or an HR account.</Text>
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
                </View>
              ) : null}

              {/* ── Basic Information ───────────────────────────── */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Basic Information</Text>

                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, styles.fieldHalf]}>
                    <Text style={styles.fieldLabel}>First Name <Text style={styles.required}>*</Text></Text>
                    <TextInput style={styles.input} value={form.firstName} onChangeText={t => onChangeField('firstName', t)}
                      placeholder="e.g. Pratham" placeholderTextColor="#9ca3af" />
                  </View>
                  <View style={[styles.fieldGroup, styles.fieldHalf]}>
                    <Text style={styles.fieldLabel}>Last Name <Text style={styles.required}>*</Text></Text>
                    <TextInput style={styles.input} value={form.lastName} onChangeText={t => onChangeField('lastName', t)}
                      placeholder="e.g. Barot" placeholderTextColor="#9ca3af" />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email Address <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.input} value={form.email} onChangeText={t => onChangeField('email', t)}
                    placeholder="e.g. pratham@company.com" placeholderTextColor="#9ca3af"
                    autoCapitalize="none" keyboardType="email-address" />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Date of Birth <Text style={styles.optional}>(optional)</Text></Text>
                  <TextInput style={styles.input} value={form.dateOfBirth} onChangeText={t => onChangeField('dateOfBirth', t)}
                    placeholder="YYYY-MM-DD" placeholderTextColor="#9ca3af" />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Designation <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.input} value={form.designation} onChangeText={t => onChangeField('designation', t)}
                    placeholder="e.g. Software Engineer" placeholderTextColor="#9ca3af" />
                </View>
              </View>

              {/* ── Address ─────────────────────────────────────── */}
              {!editOpen && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>Address</Text>

                  <View style={styles.fieldRow}>
                    <View style={[styles.fieldGroup, styles.fieldHalf]}>
                      <Text style={styles.fieldLabel}>City</Text>
                      <TextInput style={styles.input} value={form.city} onChangeText={t => onChangeField('city', t)}
                        placeholder="e.g. Mumbai" placeholderTextColor="#9ca3af" />
                    </View>
                    <View style={[styles.fieldGroup, styles.fieldHalf]}>
                      <Text style={styles.fieldLabel}>State</Text>
                      <TextInput style={styles.input} value={form.state} onChangeText={t => onChangeField('state', t)}
                        placeholder="e.g. Maharashtra" placeholderTextColor="#9ca3af" />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Postal Code</Text>
                    <TextInput style={styles.input} value={form.postalCode} onChangeText={t => onChangeField('postalCode', t)}
                      placeholder="e.g. 400001" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Address Line 1</Text>
                    <TextInput style={styles.input} value={form.addressLine1} onChangeText={t => onChangeField('addressLine1', t)}
                      placeholder="e.g. 123 Main Street" placeholderTextColor="#9ca3af" />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Address Line 2 <Text style={styles.optional}>(optional)</Text></Text>
                    <TextInput style={styles.input} value={form.addressLine2} onChangeText={t => onChangeField('addressLine2', t)}
                      placeholder="e.g. Apt 4B, Near City Mall" placeholderTextColor="#9ca3af" />
                  </View>
                </View>
              )}

              {/* ── Employment Details ───────────────────────────── */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Employment Details</Text>

                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, styles.fieldHalf]}>
                    <Text style={styles.fieldLabel}>Salary (₹) <Text style={styles.required}>*</Text></Text>
                    <TextInput style={styles.input} value={form.salary} onChangeText={t => onChangeField('salary', t)}
                      placeholder="e.g. 50000" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                  </View>
                  <View style={[styles.fieldGroup, styles.fieldHalf]}>
                    <Text style={styles.fieldLabel}>Deduction (₹) <Text style={styles.required}>*</Text></Text>
                    <TextInput style={styles.input} value={form.deduction} onChangeText={t => onChangeField('deduction', t)}
                      placeholder="e.g. 2000" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Joining Date <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.input} value={form.joiningDate} onChangeText={t => onChangeField('joiningDate', t)}
                    placeholder="YYYY-MM-DD" placeholderTextColor="#9ca3af" />
                </View>

                {!editOpen && (
                  <View style={styles.fieldRow}>
                    <View style={[styles.fieldGroup, styles.fieldHalf]}>
                      <Text style={styles.fieldLabel}>Confirmation Status</Text>
                      <View style={styles.toggleRow}>
                        {['Pending', 'Confirmed'].map(s => (
                          <Pressable key={s} onPress={() => onChangeField('confirmationStatus', s)}
                            style={[styles.toggleBtn, form.confirmationStatus === s && styles.toggleBtnActive]}>
                            <Text style={[styles.toggleBtnText, form.confirmationStatus === s && styles.toggleBtnTextActive]}>{s}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <View style={[styles.fieldGroup, styles.fieldHalf]}>
                      <Text style={styles.fieldLabel}>Probation Status</Text>
                      <View style={styles.toggleRow}>
                        {['No', 'Yes'].map(s => (
                          <Pressable key={s} onPress={() => onChangeField('probationStatus', s)}
                            style={[styles.toggleBtn, form.probationStatus === s && styles.toggleBtnActive]}>
                            <Text style={[styles.toggleBtnText, form.probationStatus === s && styles.toggleBtnTextActive]}>{s}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.addActionsRow}>
                <Pressable onPress={() => { setAddOpen(false); setEditOpen(false); resetForm(); }} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={editOpen ? onSaveEdit : onAddEmployee} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>{editOpen ? 'Update' : 'Save'}</Text>
                </Pressable>
              </View>
            </ScrollView>
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
              <ScrollView style={styles.activityScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.activityList}>
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
  headerContent: { flex: 1 },
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
  cardRowSpaced: { marginTop: 8 },
  cardCell: { flex: 1 },
  cellRight: { alignItems: 'flex-end' },
  cellLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 1 },
  cellValue: { fontSize: 11, fontWeight: '700', color: '#334155' },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', padding: 18, justifyContent: 'center' },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: '86%',
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  modalSubtitle: { color: '#64748b', fontWeight: '600', fontSize: 12, marginBottom: 14, lineHeight: 18 },
  formScroll: { flexGrow: 0 },
  detailList: { gap: 8 },
  activityScroll: { maxHeight: 320 },
  activityList: { gap: 8 },
  formSection: {
    paddingTop: 4,
    marginBottom: 14,
  },
  typeBlock: {
    marginBottom: 14,
  },
  sectionLabel: { color: '#0f172a', fontWeight: '900', fontSize: 13, marginBottom: 3 },
  sectionHint: { color: '#64748b', fontWeight: '600', fontSize: 11, marginBottom: 10, lineHeight: 16 },
  fieldGroup: { marginBottom: 10 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1 },
  fieldLabel: { color: '#334155', fontWeight: '800', fontSize: 12, marginBottom: 6 },
  required: { color: '#CC0D49', fontWeight: '900' },
  optional: { color: '#94a3b8', fontWeight: '600', fontSize: 11 },
  toggleRow: { flexDirection: 'row', gap: 6 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  toggleBtnActive: { backgroundColor: '#fce7ef', borderColor: '#CC0D49' },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  toggleBtnTextActive: { color: '#CC0D49', fontWeight: '800' },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  k: { color: '#64748b', fontWeight: '800', flex: 1 },
  v: { color: '#0f172a', fontWeight: '700', flex: 1, textAlign: 'right' },
  closeBtn: { marginTop: 14, backgroundColor: '#e11d48', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '900' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
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
