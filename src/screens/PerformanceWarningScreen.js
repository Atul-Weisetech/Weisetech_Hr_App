import React, { useContext, useEffect, useMemo, useState } from 'react';
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
import PrimaryButton from '../components/PrimaryButton';
import { AppStoreContext, AppStoreActionsContext } from '../state/AppStore';

const DEFAULT_WARNING_TYPES = ['Low', 'Medium', 'High'];

export default function PerformanceWarningScreen() {
  const { warnings, employees } = useContext(AppStoreContext);
  const { addWarning } = useContext(AppStoreActionsContext);

  const [showWarningForm, setShowWarningForm] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('2026-02-23');
  const [severity, setSeverity] = useState('Medium');
  const [warningTypes, setWarningTypes] = useState(DEFAULT_WARNING_TYPES);
  const [newWarningType, setNewWarningType] = useState('');

  const selectedEmployee = useMemo(() => {
    if (!employees.length) return null;
    return employees.find(e => e.id === employeeId) || employees[0];
  }, [employeeId, employees]);

  useEffect(() => {
    if (!employeeId && employees.length) {
      setEmployeeId(employees[0].id);
    }
  }, [employeeId, employees]);

  useEffect(() => {
    if (severity && !reason.trim()) {
      setReason(`${severity} warning`);
    }
  }, [severity, reason]);

  const addWarningType = () => {
    const nextType = newWarningType.trim();
    if (!nextType) return;

    const alreadyExists = warningTypes.some(
      type => type.toLowerCase() === nextType.toLowerCase(),
    );
    if (alreadyExists) {
      setNewWarningType('');
      return;
    }

    setWarningTypes(prev => [...prev, nextType]);
    setSeverity(nextType);
    setReason(`${nextType} warning`);
    setNewWarningType('');
  };

  const onIssue = async () => {
    if (!selectedEmployee) return;

    await addWarning({
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      reason: reason.trim() || `${severity} warning`,
      date,
      severity,
    });

    setReason('');
    setSeverity('Medium');
    setShowWarningForm(false);
  };

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.title}>Performance Warning</Text>
        <Text style={styles.subtitle}>Issue a warning and track history.</Text>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Issue Warning</Text>
          <Pressable
            onPress={() => setShowWarningForm(true)}
            style={({ pressed }) => [styles.topActionBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.topActionBtnText}>Create Warning</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Open the pop-out form to add a new warning without hiding the previous list.
        </Text>
      </Card>

      <Card style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>Previous Warnings</Text>
        <FlatList
          data={warnings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.warningListContent}
          renderItem={({ item }) => {
            const warningType =
              item.warningTypes?.[0]?.warning_type ||
              item.warningTypes?.[0] ||
              item.severity ||
              'Warning';

            return (
              <View style={styles.warningCard}>
                <View style={styles.warningCardTopRow}>
                  <Text style={styles.warningLineOne}>
                    {item.employeeName} â€¢ {warningType}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.warningAction,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.warningActionText}>Action</Text>
                  </Pressable>
                </View>

                <Text style={styles.warningLineTwo}>
                  {item.reason} â€¢ {item.createdBy || 'HR Admin'}
                </Text>

                <Text style={styles.warningDate}>Created at: {item.date || '-'}</Text>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No warnings found.</Text>}
        />
      </Card>

      <Modal
        visible={showWarningForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWarningForm(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowWarningForm(false)}>
          <Pressable style={styles.formModalCard} onPress={() => {}}>
            <View style={styles.formModalHeader}>
              <Text style={styles.formModalTitle}>Issue Warning</Text>
              <Pressable
                onPress={() => setShowWarningForm(false)}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.formModalScroll}
              contentContainerStyle={styles.formModalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Manage Warning Type</Text>
              <View style={styles.addTypeRow}>
                <TextInput
                  value={newWarningType}
                  onChangeText={setNewWarningType}
                  style={[styles.input, styles.typeInput]}
                  placeholder="Add warning type"
                  placeholderTextColor="#9ca3af"
                />
                <Pressable
                  onPress={addWarningType}
                  style={({ pressed }) => [styles.addTypeBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.addTypeBtnText}>Add Type</Text>
                </Pressable>
              </View>

              <View style={styles.pillsRowWrap}>
                {warningTypes.map(type => (
                  <Pressable
                    key={type}
                    onPress={() => {
                      setSeverity(type);
                      setReason(`${type} warning`);
                    }}
                    style={({ pressed }) => [
                      styles.pill,
                      severity === type && styles.pillActive,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        severity === type && styles.pillTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Employee</Text>
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [styles.selector, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.selectorText}>
                  {selectedEmployee
                    ? `${selectedEmployee.name} (${selectedEmployee.id})`
                    : 'Select employee'}
                </Text>
                <Text style={styles.chevron}>?</Text>
              </Pressable>

              <Text style={styles.label}>Reason</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                style={styles.input}
                placeholder="Enter warning reason..."
                placeholderTextColor="#9ca3af"
                multiline
              />

              <View style={styles.grid}>
                <View style={styles.col}>
                  <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={date}
                    onChangeText={setDate}
                    style={styles.input}
                    placeholder="2026-02-23"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <PrimaryButton title="Issue Warning" onPress={onIssue} />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Employee</Text>
            <ScrollView
              style={styles.pickerListScroll}
              contentContainerStyle={styles.pickerListContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {employees.map(e => (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    setEmployeeId(e.id);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    pressed && { backgroundColor: '#f1f5f9' },
                  ]}
                >
                  <Text style={styles.modalRowTitle}>{e.name}</Text>
                  <Text style={styles.modalRowSub}>{e.id}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, color: '#64748b', fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  topActionBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  topActionBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: '#334155',
    fontWeight: '800',
    fontSize: 12,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: { color: '#0f172a', fontWeight: '800' },
  chevron: { color: '#64748b', fontSize: 14, fontWeight: '900' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontWeight: '700',
    color: '#0f172a',
  },
  addTypeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  typeInput: { flex: 1 },
  addTypeBtn: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addTypeBtnText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 12,
  },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  pillsRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  pillActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  pillText: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  pillTextActive: { color: '#fff' },
  warningListContent: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  warningCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
  },
  warningCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningLineOne: {
    flex: 1,
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 13,
  },
  warningLineTwo: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  warningDate: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 11,
  },
  warningAction: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  warningActionText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 11,
  },
  emptyText: {
    marginTop: 10,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    maxHeight: '75%',
  },
  pickerListScroll: {
    maxHeight: 420,
  },
  pickerListContent: {
    paddingBottom: 8,
  },
  formModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    maxHeight: '88%',
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  formModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  formModalScroll: {
    maxHeight: '100%',
  },
  formModalBody: {
    padding: 14,
  },
  closeBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  modalTitle: {
    padding: 14,
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalRow: { paddingHorizontal: 14, paddingVertical: 12 },
  modalRowTitle: { color: '#0f172a', fontWeight: '900' },
  modalRowSub: { marginTop: 2, color: '#64748b', fontWeight: '800', fontSize: 12 },
});
