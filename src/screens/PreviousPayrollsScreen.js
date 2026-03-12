import React, { useContext, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { employees } from '../data/mockData';
import { AppStoreContext } from '../state/AppStore';

function net(p) {
  return (p.basic || 0) + (p.allowance || 0) - (p.deduction || 0);
}

function money(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function PreviousPayrollsScreen() {
  const { payrolls } = useContext(AppStoreContext);
  const [employeeId, setEmployeeId] = useState('ALL');
  const [month, setMonth] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState(null);

  const months = useMemo(() => {
    const set = new Set(payrolls.map(p => p.month));
    return ['ALL', ...Array.from(set).sort().reverse()];
  }, [payrolls]);

  const filtered = useMemo(() => {
    return payrolls.filter(p => {
      if (employeeId !== 'ALL' && p.employeeId !== employeeId) return false;
      if (month !== 'ALL' && p.month !== month) return false;
      return true;
    });
  }, [payrolls, employeeId, month]);

  const selected = useMemo(
    () => payrolls.find(p => p.id === selectedPayrollId) || null,
    [payrolls, selectedPayrollId],
  );

  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.title}>Previous Payrolls</Text>
        <Text style={styles.subtitle}>
          Filter by employee and month. Tap row to view breakdown.
        </Text>
      </Card>

      <Card style={styles.filters}>
        <FilterPill
          label={
            employeeId === 'ALL'
              ? 'Employee: All'
              : `Employee: ${employees.find(e => e.id === employeeId)?.name || employeeId}`
          }
          onPress={() => setOpen(true)}
        />
        <FilterPill
          label={month === 'ALL' ? 'Month: All' : `Month: ${month}`}
          onPress={() => {
            const idx = months.indexOf(month);
            const next = months[(idx + 1) % months.length];
            setMonth(next);
          }}
        />
        <Text style={styles.countText}>{filtered.length} record(s)</Text>
      </Card>

      <Card style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              {['Employee', 'Month', 'Net', ''].map(h => (
                <Text key={h} style={styles.th}>
                  {h}
                </Text>
              ))}
            </View>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedPayrollId(item.id)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { backgroundColor: '#f8fafc' },
                  ]}
                >
                  <Text style={styles.td}>{item.employeeName}</Text>
                  <Text style={styles.td}>{item.month}</Text>
                  <Text style={styles.td}>{money(net(item))}</Text>
                  <Text style={[styles.td, styles.view]}>{'View >'}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </ScrollView>
      </Card>

      {/* Employee filter picker */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Filter by Employee</Text>
            {['ALL', ...employees.map(e => e.id)].map(id => (
              <Pressable
                key={id}
                onPress={() => {
                  setEmployeeId(id);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.modalRow,
                  pressed && { backgroundColor: '#f1f5f9' },
                ]}
              >
                <Text style={styles.modalRowTitle}>
                  {id === 'ALL'
                    ? 'All Employees'
                    : employees.find(e => e.id === id)?.name}
                </Text>
                <Text style={styles.modalRowSub}>{id}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Payroll breakdown */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPayrollId(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedPayrollId(null)}
        >
          <Pressable style={styles.breakdownCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Payroll Breakdown</Text>
            {selected && (
              <View style={{ gap: 10 }}>
                <KV k="Employee" v={`${selected.employeeName} (${selected.employeeId})`} />
                <KV k="Month" v={selected.month} />
                <KV k="Basic" v={money(selected.basic)} />
                <KV k="Allowance" v={money(selected.allowance)} />
                <KV k="Deduction" v={money(selected.deduction)} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Net Salary</Text>
                  <Text style={styles.totalValue}>{money(net(selected))}</Text>
                </View>
              </View>
            )}
            <Pressable
              style={styles.closeBtn}
              onPress={() => setSelectedPayrollId(null)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function FilterPill({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

function KV({ k, v }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, color: '#64748b', fontWeight: '600' },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillText: { color: '#0f172a', fontWeight: '800', fontSize: 12 },
  countText: { marginLeft: 'auto', color: '#64748b', fontWeight: '800' },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  th: { flex: 1, fontWeight: '900', color: '#0f172a', fontSize: 12 },
  row: { flexDirection: 'row', paddingVertical: 12, alignItems: 'center' },
  td: { flex: 1, color: '#334155', fontWeight: '700', fontSize: 12 },
  view: { color: '#e11d48', fontWeight: '900' },
  sep: { height: 1, backgroundColor: '#f1f5f9' },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableContainer: {
    minWidth: 720,
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
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalRow: { paddingHorizontal: 14, paddingVertical: 12 },
  modalRowTitle: { color: '#0f172a', fontWeight: '900' },
  modalRowSub: { marginTop: 2, color: '#64748b', fontWeight: '800', fontSize: 12 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  k: { color: '#64748b', fontWeight: '900', flex: 1 },
  v: { color: '#0f172a', fontWeight: '800', flex: 1, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 6,
  },
  totalLabel: { color: '#0f172a', fontWeight: '900' },
  totalValue: { color: '#1d4ed8', fontWeight: '900' },
  closeBtn: {
    marginTop: 14,
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontWeight: '900' },
});

