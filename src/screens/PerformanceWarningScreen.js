import React, { useContext, useMemo, useState } from 'react';
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
import { employees } from '../data/mockData';
import { AppStoreContext } from '../state/AppStore';

export default function PerformanceWarningScreen() {
  const { warnings, addWarning } = useContext(AppStoreContext);

  const [employeeId, setEmployeeId] = useState(employees[0]?.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('2026-02-23');
  const [severity, setSeverity] = useState('Medium'); // Low | Medium | High

  const selectedEmployee = useMemo(
    () => employees.find(e => e.id === employeeId) || employees[0],
    [employeeId],
  );

  const onIssue = () => {
    const id = `WARN-${Date.now()}`;
    addWarning({
      id,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      reason: reason.trim() || 'Performance issue',
      date,
      severity,
    });
    setReason('');
  };

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.title}>Performance Warning</Text>
        <Text style={styles.subtitle}>Issue a warning and track history.</Text>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.sectionTitle}>Issue Warning</Text>

        <Text style={styles.label}>Employee</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.selector, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.selectorText}>
            {selectedEmployee.name} ({selectedEmployee.id})
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          style={styles.input}
          placeholder="Enter warning reason..."
          placeholderTextColor="#9ca3af"
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
          <View style={styles.col}>
            <Text style={styles.label}>Severity</Text>
            <View style={styles.pillsRow}>
              {['Low', 'Medium', 'High'].map(s => (
                <Pressable
                  key={s}
                  onPress={() => setSeverity(s)}
                  style={({ pressed }) => [
                    styles.pill,
                    severity === s && styles.pillActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      severity === s && styles.pillTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <PrimaryButton title="Issue Warning" onPress={onIssue} />
        </View>
      </Card>

      <Card style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>Previous Warnings</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              {['Employee', 'Reason', 'Date', 'Severity'].map(h => (
                <Text key={h} style={styles.th}>
                  {h}
                </Text>
              ))}
            </View>
            <FlatList
              data={warnings}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.td}>{item.employeeName}</Text>
                  <Text style={styles.td} numberOfLines={1}>
                    {item.reason}
                  </Text>
                  <Text style={styles.td}>{item.date}</Text>
                  <SeverityPill severity={item.severity} />
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </ScrollView>
      </Card>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Employee</Text>
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
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function SeverityPill({ severity }) {
  const isHigh = severity === 'High';
  const isLow = severity === 'Low';

  return (
    <View
      style={[
        styles.sevPill,
        isHigh && styles.sevHigh,
        isLow && styles.sevLow,
      ]}
    >
      <Text
        style={[
          styles.sevText,
          isHigh && styles.sevTextHigh,
          isLow && styles.sevTextLow,
        ]}
      >
        {severity}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, color: '#64748b', fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
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
  chevron: { color: '#64748b', fontSize: 16, fontWeight: '900' },
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
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  pillsRow: { flexDirection: 'row', gap: 8 },
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
  tableHeader: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  th: { flex: 1, fontWeight: '900', color: '#0f172a', fontSize: 12 },
  row: { flexDirection: 'row', paddingVertical: 12, alignItems: 'center' },
  td: { flex: 1, color: '#334155', fontWeight: '700', fontSize: 12 },
  sep: { height: 1, backgroundColor: '#f1f5f9' },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableContainer: {
    minWidth: 720,
  },
  sevPill: {
    flex: 1,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevText: { fontSize: 11, fontWeight: '900', color: '#c2410c' },
  sevHigh: { backgroundColor: '#fee2e2' },
  sevTextHigh: { color: '#b91c1c' },
  sevLow: { backgroundColor: '#dcfce7' },
  sevTextLow: { color: '#15803d' },
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

