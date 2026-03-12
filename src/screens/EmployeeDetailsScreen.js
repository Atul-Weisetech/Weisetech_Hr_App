import React, { useMemo, useState } from 'react';
import {
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
import { employees as employeeSeed } from '../data/mockData';

export default function EmployeeDetailsScreen() {
  const [employees, setEmployees] = useState(employeeSeed);
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
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

  const onAddEmployee = () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    if (!trimmedName || !trimmedEmail) {
      return;
    }
    const nextIndex = employees.length + 1;
    const id = `EMP-${String(nextIndex).padStart(3, '0')}`;
    const newEmployee = {
      id,
      name: trimmedName,
      department: '',
      role: form.role.trim() || 'Employee',
      email: trimmedEmail,
      status: form.status,
      salary: form.salary.trim() || '₹0.00',
      deductions: form.deductions.trim() || '₹0.00',
      joiningDate: form.joiningDate.trim() || '—',
    };
    setEmployees(prev => [...prev, newEmployee]);
    setForm({
      name: '',
      role: '',
      email: '',
      salary: '',
      deductions: '',
      joiningDate: '',
      status: 'Active',
    });
    setAddOpen(false);
  };

  return (
    <Screen>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Employee Details</Text>
            <Text style={styles.subtitle}>
              Tap a row to view details or add a new employee.
            </Text>
          </View>
          <Pressable
            onPress={() => setAddOpen(true)}
            style={({ pressed }) => [
              styles.addButton,
              pressed && { opacity: 0.85 },
            ]}
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
              {[
                'Serial No',
                'Name',
                'Role',
                'Email',
                'Salary',
                'Deduction',
                'Joining Date',
                'Actions',
              ].map(h => (
                <Text
                  key={h}
                  style={[
                    styles.th,
                    h === 'Serial No' && styles.colId,
                    h === 'Name' && styles.colName,
                    h === 'Role' && styles.colRole,
                    h === 'Email' && styles.colEmail,
                    h === 'Salary' && styles.colMoney,
                    h === 'Deduction' && styles.colMoney,
                    h === 'Joining Date' && styles.colJoining,
                    h === 'Actions' && styles.colStatus,
                  ]}
                  numberOfLines={1}
                >
                  {h}
                </Text>
              ))}
            </View>

            <FlatList
              data={employees}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { backgroundColor: '#f8fafc' },
                  ]}
                >
                  <Text style={[styles.td, styles.colId]} numberOfLines={1}>
                    {item.id}
                  </Text>
                  <Text style={[styles.td, styles.colName]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.td, styles.colRole]} numberOfLines={1}>
                    {item.role}
                  </Text>
                  <Text
                    style={[styles.td, styles.colEmail]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.email}
                  </Text>
                  <Text style={[styles.td, styles.colMoney]} numberOfLines={1}>
                    {item.salary}
                  </Text>
                  <Text style={[styles.td, styles.colMoney]} numberOfLines={1}>
                    {item.deductions}
                  </Text>
                  <Text style={[styles.td, styles.colJoining]} numberOfLines={1}>
                    {item.joiningDate}
                  </Text>
                  <View style={[styles.colStatus, styles.actionsCell]}>
                    {['Edit', 'Deactivate', 'View Payroll', 'View Leaves'].map(label => (
                      <Pressable
                        key={label}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          pressed && styles.actionBtnPressed,
                        ]}
                      >
                        <Text style={styles.actionText} numberOfLines={1}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </ScrollView>
      </Card>

      <Modal
        visible={!!selectedEmployee}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedId(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedId(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Employee Details</Text>
            {selectedEmployee && (
              <View style={{ gap: 8 }}>
                {[
                  ['Employee ID', selectedEmployee.id],
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
            <Pressable
              style={styles.closeBtn}
              onPress={() => setSelectedId(null)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add employee modal */}
      <Modal
        visible={addOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAddOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Employee</Text>
            <View style={{ gap: 8 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={text => onChangeField('name', text)}
                  placeholder="Employee name"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role</Text>
                <TextInput
                  style={styles.input}
                  value={form.role}
                  onChangeText={text => onChangeField('role', text)}
                  placeholder="Employee"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={text => onChangeField('email', text)}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.rowInline}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Salary</Text>
                  <TextInput
                    style={styles.input}
                    value={form.salary}
                    onChangeText={text => onChangeField('salary', text)}
                    placeholder="₹40,000.00"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Deduction</Text>
                  <TextInput
                    style={styles.input}
                    value={form.deductions}
                    onChangeText={text => onChangeField('deductions', text)}
                    placeholder="₹1,000.00"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Joining Date</Text>
                <TextInput
                  style={styles.input}
                  value={form.joiningDate}
                  onChangeText={text => onChangeField('joiningDate', text)}
                  placeholder="01 January 2026"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
            <View style={styles.addActionsRow}>
              <Pressable
                onPress={() => setAddOpen(false)}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onAddEmployee}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    color: '#64748b',
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  th: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  td: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
    paddingHorizontal: 2,
  },
  colId: {
    width: 54,
  },
  colName: {
    flex: 1.2,
  },
  colRole: {
    flex: 1,
  },
  colEmail: {
    flex: 1.2,
  },
  colMoney: {
    width: 68,
  },
  colJoining: {
    width: 90,
  },
  colStatus: {
    width: 210,
  },
  sep: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableContainer: {
    minWidth: 680,
  },
  actionsCell: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  k: {
    color: '#64748b',
    fontWeight: '800',
    flex: 1,
  },
  v: {
    color: '#0f172a',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  closeBtn: {
    marginTop: 14,
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#16a34a',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  inputGroup: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  rowInline: {
    flexDirection: 'row',
    gap: 8,
  },
  addActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryBtnText: {
    color: '#374151',
    fontWeight: '700',
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  actionBtn: {
    backgroundColor: '#be123c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionBtnPressed: {
    opacity: 0.9,
  },
  actionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
});

