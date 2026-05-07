import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { AppStoreContext } from '../state/AppStore';

const THEME = '#CC0D49';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMoney(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseMonth(monthStr) {
  if (!monthStr || monthStr === 'Unknown') return null;
  const isoMatch = monthStr.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return { year: Number(isoMatch[1]), month: Number(isoMatch[2]) };
  const namedMatch = monthStr.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (namedMatch) {
    const idx = MONTH_NAMES_FULL.findIndex(m => m.toLowerCase() === namedMatch[1].toLowerCase());
    if (idx >= 0) return { year: Number(namedMatch[2]), month: idx + 1 };
  }
  return null;
}

function formatMonthLabel(monthStr) {
  const parsed = parseMonth(monthStr);
  if (!parsed) return monthStr || '-';
  return `${MONTH_NAMES_FULL[parsed.month - 1]} ${parsed.year}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return String(dateStr).slice(0, 10);
}

export default function ManagePayrollScreen({ navigation }) {
  const { payrolls } = useContext(AppStoreContext);

  const [searchName, setSearchName] = useState('');
  const [selectedYear, setSelectedYear] = useState(null);
  const [fromMonth, setFromMonth] = useState(null);
  const [toMonth, setToMonth] = useState(null);

  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Move action buttons to header top-right
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setQuickActionsOpen(true)}
          activeOpacity={0.8}
          style={styles.headerActionBtn}
        >
          <Text style={styles.headerActionText}>+ Actions</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const availableYears = useMemo(() => {
    const years = new Set();
    payrolls.forEach(p => {
      const parsed = parseMonth(p.month);
      if (parsed && !Number.isNaN(parsed.year)) years.add(parsed.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payrolls]);

  const filtered = useMemo(() => {
    return payrolls.filter(p => {
      const parsed = parseMonth(p.month);
      if (!parsed) return false;
      if (selectedYear && parsed.year !== selectedYear) return false;
      if (fromMonth && parsed.month < fromMonth) return false;
      if (toMonth && parsed.month > toMonth) return false;
      if (searchName.trim()) {
        const q = searchName.trim().toLowerCase();
        if (!(p.employeeName || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [payrolls, selectedYear, fromMonth, toMonth, searchName]);

  const groupedByMonth = useMemo(() => {
    const groups = filtered.reduce((acc, item) => {
      if (!acc[item.month]) acc[item.month] = [];
      acc[item.month].push(item);
      return acc;
    }, {});
    return Object.keys(groups).sort().reverse().map(key => ({ month: key, items: groups[key] }));
  }, [filtered]);

  const clearFilters = () => {
    setSelectedYear(null);
    setFromMonth(null);
    setToMonth(null);
    setSearchName('');
  };

  const hasFilters = selectedYear || fromMonth || toMonth || searchName.trim();
  const openActions = item => { setActiveItem(item); setActionsOpen(true); };

  return (
    <Screen>
      {/* Filter card */}
      <Card style={styles.filterCard}>
        {/* Row 1: YEAR + FROM MONTH */}
        <View style={styles.filterRow}>
          {/* YEAR */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>YEAR</Text>
            <Pressable
              onPress={() => setYearPickerOpen(true)}
              style={[styles.filterDropdown, selectedYear && styles.filterDropdownActive]}
            >
              <Text style={[styles.filterDropdownText, selectedYear && styles.filterDropdownTextActive]} numberOfLines={1}>
                {selectedYear || 'Select Year'}
              </Text>
              <Text style={[styles.filterDropdownIcon, selectedYear && { color: '#fff' }]}>▾</Text>
            </Pressable>
          </View>

          {/* FROM MONTH */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>FROM MONTH</Text>
            <Pressable
              onPress={() => setFromPickerOpen(true)}
              style={[styles.filterDropdown, fromMonth && styles.filterDropdownActive]}
            >
              <Text style={[styles.filterDropdownText, fromMonth && styles.filterDropdownTextActive]} numberOfLines={1}>
                {fromMonth ? MONTH_NAMES_FULL[fromMonth - 1] : '------, ----'}
              </Text>
              <Text style={[styles.filterDropdownIcon, fromMonth && { color: '#fff' }]}>📅</Text>
            </Pressable>
          </View>
        </View>

        {/* Row 2: TO MONTH + EMPLOYEE */}
        <View style={styles.filterRow}>
          {/* TO MONTH */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>TO MONTH</Text>
            <Pressable
              onPress={() => setToPickerOpen(true)}
              style={[styles.filterDropdown, toMonth && styles.filterDropdownActive]}
            >
              <Text style={[styles.filterDropdownText, toMonth && styles.filterDropdownTextActive]} numberOfLines={1}>
                {toMonth ? MONTH_NAMES_FULL[toMonth - 1] : '------, ----'}
              </Text>
              <Text style={[styles.filterDropdownIcon, toMonth && { color: '#fff' }]}>📅</Text>
            </Pressable>
          </View>

          {/* EMPLOYEE */}
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>EMPLOYEE</Text>
            <TextInput
              style={styles.filterInput}
              value={searchName}
              onChangeText={setSearchName}
              placeholder="Search by name..."
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Clear button */}
        {hasFilters && (
          <Pressable onPress={clearFilters} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕ Clear Filters</Text>
          </Pressable>
        )}
      </Card>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          {groupedByMonth.length > 0 ? ` across ${groupedByMonth.length} month${groupedByMonth.length !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      {/* Payroll list */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {groupedByMonth.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No payroll records found.</Text>
          </View>
        ) : (
          groupedByMonth.map(group => (
            <View key={group.month}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>{formatMonthLabel(group.month)}</Text>
                <Pressable style={({ pressed }) => [styles.publishAllBtn, pressed && { opacity: 0.85 }]}>
                  <Text style={styles.publishAllText}>Publish All</Text>
                </Pressable>
              </View>

              {group.items.map(item => {
                const net = (item.basic || 0) + (item.allowance || 0) - (item.deduction || 0);
                return (
                  <View key={item.id} style={styles.payrollCard}>
                    <Pressable style={styles.cardMenuBtn} onPress={() => openActions(item)} hitSlop={8}>
                      <Text style={styles.cardMenuText}>•••</Text>
                    </Pressable>

                    <View style={[styles.pubBadge, item.isPublished ? styles.pubBadgeYes : styles.pubBadgeNo]}>
                      <Text style={[styles.pubBadgeText, item.isPublished ? styles.pubBadgeTextYes : styles.pubBadgeTextNo]}>
                        {item.isPublished ? 'Published' : 'Unpublished'}
                      </Text>
                    </View>

                    <View style={styles.cardRow}>
                      <Text style={styles.empName} numberOfLines={1}>{item.employeeName}</Text>
                      <Text style={styles.amount}>{formatMoney(net)}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.cardRow}>
                      <View style={styles.cardCell}>
                        <Text style={styles.cellLabel}>Date</Text>
                        <Text style={styles.cellValue}>{formatDate(item.payrollDate)}</Text>
                      </View>
                      <View style={[styles.cardCell, styles.cellRight]}>
                        <Text style={styles.cellLabel}>Payment Mode</Text>
                        <Text style={styles.cellValue}>{item.paymentMode || 'NEFT'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Year picker modal */}
      <Modal visible={yearPickerOpen} transparent animationType="fade" onRequestClose={() => setYearPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setYearPickerOpen(false)}>
          <Pressable style={styles.pickerModal} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Select Year</Text>
            <Pressable
              onPress={() => { setSelectedYear(null); setYearPickerOpen(false); }}
              style={[styles.yearItem, !selectedYear && styles.yearItemActive]}
            >
              <Text style={[styles.yearItemText, !selectedYear && styles.yearItemTextActive]}>All Years</Text>
            </Pressable>
            {availableYears.map(y => (
              <Pressable
                key={y}
                onPress={() => { setSelectedYear(y); setYearPickerOpen(false); }}
                style={[styles.yearItem, selectedYear === y && styles.yearItemActive]}
              >
                <Text style={[styles.yearItemText, selectedYear === y && styles.yearItemTextActive]}>{y}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* From month picker */}
      <Modal visible={fromPickerOpen} transparent animationType="fade" onRequestClose={() => setFromPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFromPickerOpen(false)}>
          <Pressable style={styles.pickerModal} onPress={() => {}}>
            <Text style={styles.pickerTitle}>From Month</Text>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1;
                return (
                  <Pressable
                    key={m}
                    onPress={() => { setFromMonth(fromMonth === m ? null : m); setFromPickerOpen(false); }}
                    style={[styles.monthChip, fromMonth === m && styles.monthChipActive]}
                  >
                    <Text style={[styles.monthChipText, fromMonth === m && styles.monthChipTextActive]}>{name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* To month picker */}
      <Modal visible={toPickerOpen} transparent animationType="fade" onRequestClose={() => setToPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setToPickerOpen(false)}>
          <Pressable style={styles.pickerModal} onPress={() => {}}>
            <Text style={styles.pickerTitle}>To Month</Text>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1;
                return (
                  <Pressable
                    key={m}
                    onPress={() => { setToMonth(toMonth === m ? null : m); setToPickerOpen(false); }}
                    style={[styles.monthChip, toMonth === m && styles.monthChipActive]}
                  >
                    <Text style={[styles.monthChipText, toMonth === m && styles.monthChipTextActive]}>{name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Quick actions modal (from header button) */}
      <Modal visible={quickActionsOpen} transparent animationType="fade" onRequestClose={() => setQuickActionsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setQuickActionsOpen(false)}>
          <Pressable style={styles.actionsModal} onPress={() => {}}>
            <Text style={styles.actionsTitle}>Payroll Actions</Text>
            {[
              { label: 'Generate Payroll', icon: '⚙' },
              { label: 'Generate All Payrolls', icon: '⚙' },
              { label: 'Add Payment', icon: '+' },
            ].map(({ label, icon }) => (
              <Pressable
                key={label}
                style={styles.quickActionItem}
                onPress={() => setQuickActionsOpen(false)}
              >
                <View style={styles.quickActionIconWrap}>
                  <Text style={styles.quickActionIcon}>{icon}</Text>
                </View>
                <Text style={styles.quickActionText}>{label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Row actions modal */}
      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionsOpen(false)}>
          <Pressable style={styles.actionsModal} onPress={() => {}}>
            <Text style={styles.actionsTitle}>{activeItem?.employeeName || 'Actions'}</Text>
            {['Edit', 'Delete', 'Toggle Published', 'Manage Breakdown'].map(label => (
              <Pressable key={label} style={styles.actionMenuItem} onPress={() => setActionsOpen(false)}>
                <Text style={[styles.actionMenuText, label === 'Delete' && styles.actionMenuTextDanger]}>{label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* Header button (set via navigation.setOptions) */
  headerActionBtn: {
    backgroundColor: THEME,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
  },
  headerActionText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  /* Filter card */
  filterCard: { marginBottom: 10, gap: 10 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterItem: { flex: 1 },
  filterLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 4, letterSpacing: 0.5 },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  filterDropdownActive: { backgroundColor: THEME, borderColor: THEME },
  filterDropdownText: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },
  filterDropdownTextActive: { color: '#fff' },
  filterDropdownIcon: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
  filterInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  clearBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearBtnText: { color: '#b91c1c', fontWeight: '700', fontSize: 11 },

  /* Summary */
  summaryRow: { marginBottom: 8 },
  summaryText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },

  /* Scroll */
  scrollContent: { paddingBottom: 24 },

  /* Month group */
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 6 },
  monthTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  publishAllBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#e2e8f0' },
  publishAllText: { fontSize: 11, fontWeight: '700', color: '#374151' },

  /* Payroll card */
  payrollCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
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

  pubBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  pubBadgeYes: { backgroundColor: '#dcfce7' },
  pubBadgeNo: { backgroundColor: '#fef3c7' },
  pubBadgeText: { fontSize: 10, fontWeight: '700' },
  pubBadgeTextYes: { color: '#15803d' },
  pubBadgeTextNo: { color: '#92400e' },

  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCell: { flex: 1 },
  cellRight: { alignItems: 'flex-end' },
  empName: { fontSize: 13, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 40 },
  amount: { fontSize: 14, fontWeight: '900', color: THEME },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  cellLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 1 },
  cellValue: { fontSize: 11, fontWeight: '700', color: '#334155' },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94a3b8', fontWeight: '600' },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },

  pickerModal: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  pickerTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 },

  yearItem: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  yearItemActive: { backgroundColor: THEME },
  yearItemText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  yearItemTextActive: { color: '#fff', fontWeight: '800' },

  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip: { width: '22%', paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  monthChipActive: { backgroundColor: THEME, borderColor: THEME },
  monthChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  monthChipTextActive: { color: '#fff' },

  actionsModal: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  actionsTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10 },

  quickActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  quickActionIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fce7ef', alignItems: 'center', justifyContent: 'center' },
  quickActionIcon: { fontSize: 14, color: THEME, fontWeight: '800' },
  quickActionText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  actionMenuItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  actionMenuText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  actionMenuTextDanger: { color: '#dc2626' },
});
