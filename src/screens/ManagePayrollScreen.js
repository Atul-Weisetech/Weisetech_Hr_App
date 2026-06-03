import React, { useContext, useMemo, useState } from 'react';
import {
  Alert,
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
import { AppStoreActionsContext, AppStoreContext } from '../state/AppStore';
import hrApi from '../api/hrApi';

const THEME = '#CC0D49';
const BREAKDOWN_CATEGORIES = [
  { label: 'Earning', value: 1 },
  { label: 'Deduction', value: 2 },
];

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

function getMonthKey(monthStr, payrollDate) {
  const parsed = parseMonth(monthStr);
  if (parsed?.year && parsed?.month) {
    return `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
  }
  if (payrollDate && String(payrollDate).length >= 7) {
    return String(payrollDate).slice(0, 7);
  }
  return '';
}

function categoryLabel(category) {
  return Number(category) === 2 ? 'Deduction' : 'Earning';
}

export default function ManagePayrollScreen() {
  const { payrolls, employees } = useContext(AppStoreContext);
  const { addPayroll, updatePayroll, deletePayroll, publishPayroll, refreshPayrolls } = useContext(AppStoreActionsContext);

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
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    payrollDate: '',
    month: '',
    paymentMode: '',
    basic: '',
    allowance: '',
    deduction: '',
  });
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownSaving, setBreakdownSaving] = useState(false);
  const [breakdownTarget, setBreakdownTarget] = useState(null);
  const [breakdownTypes, setBreakdownTypes] = useState([]);
  const [breakdownEntries, setBreakdownEntries] = useState([]);
  const [breakdownHistory, setBreakdownHistory] = useState([]);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [generateMode, setGenerateMode] = useState('single');
  const [isGenerateSaving, setIsGenerateSaving] = useState(false);
  const [breakdownForm, setBreakdownForm] = useState({
    type: '',
    amount: '',
    category: 1,
  });
  const [generateForm, setGenerateForm] = useState({
    employeeId: '',
    payrollDate: '',
    month: '',
    paymentMode: 'NEFT',
    basic: '',
    allowance: '0',
    deduction: '0',
  });

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
  const breakdownMonthLabel = breakdownTarget ? formatMonthLabel(breakdownTarget.month) : '-';
  const todayIso = new Date().toISOString().slice(0, 10);
  const thisMonthIso = todayIso.slice(0, 7);
  const selectedGenerateEmployee = useMemo(
    () => employees.find(e => String(e.id) === String(generateForm.employeeId)) || null,
    [employees, generateForm.employeeId],
  );

  const openActions = item => { setActiveItem(item); setActionsOpen(true); };

  const openGenerateModal = mode => {
    const selectedEmployee = employees.find(e => e.status === 'Active') || employees[0] || null;
    const nextEmployeeId = mode === 'single' ? String(selectedEmployee?.id || '') : '';
    setGenerateMode(mode);
    setGenerateForm({
      employeeId: nextEmployeeId,
      payrollDate: todayIso,
      month: thisMonthIso,
      paymentMode: 'NEFT',
      basic: mode === 'single' ? String(Number(selectedEmployee?.salary || 0)) : '',
      allowance: '0',
      deduction: mode === 'single' ? String(Number(selectedEmployee?.deduction || 0)) : '0',
    });
    setGenerateOpen(true);
  };

  const buildPayrollPayload = (employee, form) => ({
    employeeId: String(employee.id),
    payrollDate: String(form.payrollDate || todayIso).slice(0, 10),
    month: String(form.month || thisMonthIso).slice(0, 7),
    paymentMode: String(form.paymentMode || 'NEFT').trim() || 'NEFT',
    basic: Number(form.basic || employee.salary || 0),
    allowance: Number(form.allowance || 0),
    deduction: Number(form.deduction || employee.deduction || 0),
  });

  const onGeneratePayroll = async () => {
    if (isGenerateSaving) return;

    const payrollDate = String(generateForm.payrollDate || '').trim();
    const month = String(generateForm.month || '').trim();
    const paymentMode = String(generateForm.paymentMode || '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payrollDate)) {
      Alert.alert('Invalid date', 'Use payroll date format YYYY-MM-DD.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      Alert.alert('Invalid month', 'Use pay month format YYYY-MM.');
      return;
    }
    if (!paymentMode) {
      Alert.alert('Missing payment mode', 'Payment mode is required.');
      return;
    }

    setIsGenerateSaving(true);
    try {
      if (generateMode === 'single') {
        const employee = employees.find(e => String(e.id) === String(generateForm.employeeId));
        if (!employee) {
          Alert.alert('Missing employee', 'Please select an employee.');
          return;
        }

        const existing = payrolls.find(
          p => String(p.employeeId) === String(employee.id) && getMonthKey(p.month, p.payrollDate) === month,
        );
        if (existing) {
          Alert.alert('Already generated', 'This employee already has a payroll for the selected month.');
          return;
        }

        await addPayroll(buildPayrollPayload(employee, generateForm));
        Alert.alert('Generated', `Payroll created for ${employee.name}.`);
      } else {
        const activeEmployees = employees.filter(e => e.status !== 'Inactive');
        let created = 0;
        let skipped = 0;

        for (const employee of activeEmployees) {
          const exists = payrolls.find(
            p => String(p.employeeId) === String(employee.id) && getMonthKey(p.month, p.payrollDate) === month,
          );
          if (exists) {
            skipped += 1;
            continue;
          }
          await hrApi.post('/payrolls', buildPayrollPayload(employee, {
            payrollDate,
            month,
            paymentMode,
            basic: employee.salary,
            allowance: 0,
            deduction: employee.deduction,
          }));
          created += 1;
        }

        await refreshPayrolls(employees);
        Alert.alert(
          'Generated',
          `${created} payroll${created === 1 ? '' : 's'} created${skipped ? `, ${skipped} skipped because they already exist` : ''}.`,
        );
      }

      setGenerateOpen(false);
    } catch (error) {
      Alert.alert(
        'Could not generate payroll',
        error?.response?.data?.error || error?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setIsGenerateSaving(false);
    }
  };

  const openEmployeePicker = () => {
    if (generateMode !== 'single') return;
    setEmployeePickerOpen(true);
  };

  const openEditModal = item => {
    if (!item) return;
    const payrollDate = item.payrollDate ? String(item.payrollDate).slice(0, 10) : '';
    const month = item.month ? String(item.month).slice(0, 7) : (payrollDate ? payrollDate.slice(0, 7) : '');
    setEditTarget(item);
    setEditForm({
      payrollDate,
      month,
      paymentMode: item.paymentMode && item.paymentMode !== 'N/A' ? String(item.paymentMode) : 'Cash',
      basic: String(Number(item.basic || 0)),
      allowance: String(Number(item.allowance || 0)),
      deduction: String(Number(item.deduction || 0)),
    });
    setActionsOpen(false);
    setEditOpen(true);
  };

  const confirmDelete = item => {
    if (!item) return;
    Alert.alert(
      'Delete Payroll',
      `Delete payroll for ${item.employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            try {
              await deletePayroll(item.id);
              setActionsOpen(false);
              setActiveItem(null);
              Alert.alert('Deleted', 'Payroll deleted successfully.');
            } catch (error) {
              Alert.alert(
                'Could not delete',
                error?.response?.data?.error || error?.response?.data?.message || 'Please try again.',
              );
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const onPublishPayroll = async item => {
    if (!item) return;
    if (item.isPublished) {
      Alert.alert('Already published', 'This payroll is already published.');
      setActionsOpen(false);
      return;
    }
    setIsActionLoading(true);
    try {
      await publishPayroll(item.id);
      setActionsOpen(false);
      setActiveItem(null);
      Alert.alert('Published', 'Payroll published successfully.');
    } catch (error) {
      Alert.alert(
        'Could not publish',
        error?.response?.data?.error || error?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const onSaveEdit = async () => {
    if (!editTarget) return;
    const payrollDate = String(editForm.payrollDate || '').trim();
    const month = String(editForm.month || payrollDate.slice(0, 7)).trim();
    const paymentMode = String(editForm.paymentMode || '').trim();
    const basic = Number(editForm.basic);
    const allowance = Number(editForm.allowance);
    const deduction = Number(editForm.deduction);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payrollDate)) {
      Alert.alert('Invalid date', 'Use payroll date format YYYY-MM-DD.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      Alert.alert('Invalid month', 'Use pay month format YYYY-MM.');
      return;
    }
    if (!paymentMode) {
      Alert.alert('Missing payment mode', 'Payment mode is required.');
      return;
    }
    if ([basic, allowance, deduction].some(n => Number.isNaN(n) || n < 0)) {
      Alert.alert('Invalid values', 'Basic, allowance and deduction must be 0 or higher.');
      return;
    }

    setIsEditSaving(true);
    try {
      await updatePayroll(editTarget.id, {
        employeeId: editTarget.employeeId,
        payrollDate,
        month,
        paymentMode,
        basic,
        allowance,
        deduction,
        isPublished: !!editTarget.isPublished,
      });
      setEditOpen(false);
      setEditTarget(null);
      setActionsOpen(false);
      setActiveItem(null);
      Alert.alert('Updated', 'Payroll updated successfully.');
    } catch (error) {
      Alert.alert(
        'Could not update payroll',
        error?.response?.data?.error || error?.response?.data?.message || 'Please check values and try again.',
      );
    } finally {
      setIsEditSaving(false);
    }
  };

  const loadBreakdownData = async (item, preferredType = '') => {
    if (!item) return;
    const monthKey = getMonthKey(item.month, item.payrollDate);

    const [typesResult, currentResult, historyResult] = await Promise.allSettled([
      hrApi.get('/payroll-meta-types'),
      hrApi.get(`/payrolls/employee/breakdown?payrollId=${encodeURIComponent(item.id)}`),
      hrApi.get(`/payrolls/employee/${encodeURIComponent(item.employeeId)}/breakdowns`),
    ]);

    const metaRows = typesResult.status === 'fulfilled' && Array.isArray(typesResult.value?.data)
      ? typesResult.value.data
      : [];
    const typeNames = metaRows
      .map(r => String(r?.type_name || '').trim())
      .filter(Boolean);

    const currentRows = currentResult.status === 'fulfilled' && Array.isArray(currentResult.value?.data)
      ? currentResult.value.data
      : [];
    setBreakdownEntries(currentRows);

    const historyRows = historyResult.status === 'fulfilled' && Array.isArray(historyResult.value?.data)
      ? historyResult.value.data
      : [];
    const monthHistory = historyRows.filter(row => {
      const rowMonthKey = getMonthKey(row?.pay_month, null);
      return rowMonthKey === monthKey;
    });
    setBreakdownHistory(monthHistory);

    const fallbackTypes = ['Basic', 'HRA', 'PF', 'Incentive', 'Bonus', 'Tax'];
    const allTypes = typeNames.length ? typeNames : fallbackTypes;
    setBreakdownTypes(allTypes);
    setBreakdownForm(prev => ({
      ...prev,
      type: preferredType || prev.type || allTypes[0] || '',
    }));
  };

  const openBreakdownModal = async item => {
    if (!item) return;
    setActionsOpen(false);
    setBreakdownTarget(item);
    setBreakdownOpen(true);
    setBreakdownLoading(true);
    setBreakdownEntries([]);
    setBreakdownHistory([]);
    setBreakdownForm({ type: '', amount: '', category: 1 });
    try {
      await loadBreakdownData(item);
    } catch (error) {
      Alert.alert(
        'Could not load breakdown',
        error?.response?.data?.error || error?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setBreakdownLoading(false);
    }
  };

  const onAddBreakdown = async () => {
    if (!breakdownTarget || breakdownSaving) return;

    const amount = Number(breakdownForm.amount);
    const type = String(breakdownForm.type || '').trim();
    const category = Number(breakdownForm.category || 1);

    if (!type) {
      Alert.alert('Missing type', 'Please select a breakdown type.');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    setBreakdownSaving(true);
    try {
      await hrApi.post('/payrolls/employeeBreakdown/breakdown', {
        fk_payroll_id: Number(breakdownTarget.id),
        amount,
        type,
        category,
      });
      setBreakdownForm(prev => ({ ...prev, amount: '' }));
      await loadBreakdownData(breakdownTarget, type);
      Alert.alert('Added', 'Breakdown entry added successfully.');
    } catch (error) {
      Alert.alert(
        'Could not add breakdown',
        error?.response?.data?.error || error?.response?.data?.message || 'Please check values and try again.',
      );
    } finally {
      setBreakdownSaving(false);
    }
  };

  const onActionSelect = label => {
    if (!activeItem || isActionLoading) return;
    if (label === 'Edit') {
      openEditModal(activeItem);
      return;
    }
    if (label === 'Delete') {
      confirmDelete(activeItem);
      return;
    }
    if (label === 'Publish' || label === 'Published') {
      onPublishPayroll(activeItem);
      return;
    }
    if (label === 'Manage Breakdown') {
      openBreakdownModal(activeItem);
      return;
    }
  };

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

      <View pointerEvents="box-none" style={styles.fabWrap}>
        <TouchableOpacity
          onPress={() => setQuickActionsOpen(true)}
          activeOpacity={0.85}
          style={styles.fabActionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.fabActionText}>+ Actions</Text>
        </TouchableOpacity>
      </View>

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
                onPress={() => {
                  setQuickActionsOpen(false);
                  if (label === 'Generate All Payrolls') {
                    openGenerateModal('all');
                    return;
                  }
                  openGenerateModal('single');
                }}
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

      {/* Generate payroll modal */}
      <Modal visible={generateOpen} transparent animationType="fade" onRequestClose={() => setGenerateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !isGenerateSaving && setGenerateOpen(false)}>
          <Pressable style={styles.generateModal} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.actionsTitle}>
                {generateMode === 'all' ? 'Generate All Payrolls' : 'Generate Payroll'}
              </Text>
              <Text style={styles.generateHint}>
                {generateMode === 'all'
                  ? 'Creates payrolls for all active employees who do not already have one for the selected month.'
                  : 'Creates a payroll for one employee using the selected date and month.'}
              </Text>

              {generateMode === 'single' ? (
                <>
                  <Text style={styles.editLabel}>Employee</Text>
                  <Pressable style={styles.selectField} onPress={openEmployeePicker}>
                    <Text style={styles.selectFieldText} numberOfLines={1}>
                      {selectedGenerateEmployee?.name || 'Select employee'}
                    </Text>
                    <Text style={styles.selectFieldIcon}>v</Text>
                  </Pressable>
                  {selectedGenerateEmployee ? (
                    <Text style={styles.generateMeta}>
                      {selectedGenerateEmployee.role} | {selectedGenerateEmployee.email || 'No email'}
                    </Text>
                  ) : null}
                </>
              ) : (
                <View style={styles.generateSummaryBox}>
                  <Text style={styles.generateSummaryTitle}>Bulk generation</Text>
                  <Text style={styles.generateSummaryText}>
                    Active employees will be processed one by one. Existing payrolls for the same month are skipped.
                  </Text>
                </View>
              )}

              <Text style={styles.editLabel}>Payroll Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.editInput}
                value={generateForm.payrollDate}
                onChangeText={value => setGenerateForm(prev => ({ ...prev, payrollDate: value }))}
                placeholder="2026-05-13"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              <Text style={styles.editLabel}>Pay Month (YYYY-MM)</Text>
              <TextInput
                style={styles.editInput}
                value={generateForm.month}
                onChangeText={value => setGenerateForm(prev => ({ ...prev, month: value }))}
                placeholder="2026-05"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              <Text style={styles.editLabel}>Payment Mode</Text>
              <TextInput
                style={styles.editInput}
                value={generateForm.paymentMode}
                onChangeText={value => setGenerateForm(prev => ({ ...prev, paymentMode: value }))}
                placeholder="Cash / NEFT / UPI"
                placeholderTextColor="#94a3b8"
              />

              {generateMode === 'single' ? (
                <>
                  <View style={styles.editRow}>
                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>Basic</Text>
                      <TextInput
                        style={styles.editInput}
                        value={generateForm.basic}
                        onChangeText={value => setGenerateForm(prev => ({ ...prev, basic: value }))}
                        keyboardType="numeric"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>Allowance</Text>
                      <TextInput
                        style={styles.editInput}
                        value={generateForm.allowance}
                        onChangeText={value => setGenerateForm(prev => ({ ...prev, allowance: value }))}
                        keyboardType="numeric"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <Text style={styles.editLabel}>Deduction</Text>
                  <TextInput
                    style={styles.editInput}
                    value={generateForm.deduction}
                    onChangeText={value => setGenerateForm(prev => ({ ...prev, deduction: value }))}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />
                </>
              ) : (
                <Text style={styles.generateNote}>
                  Base salary and deduction are taken from each employee record. Allowance is set to `0`.
                </Text>
              )}

              <View style={styles.editActionRow}>
                <Pressable
                  style={[styles.editActionBtn, styles.editCancelBtn]}
                  disabled={isGenerateSaving}
                  onPress={() => setGenerateOpen(false)}
                >
                  <Text style={styles.editCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.editActionBtn, styles.editSaveBtn, isGenerateSaving && { opacity: 0.65 }]}
                  disabled={isGenerateSaving}
                  onPress={onGeneratePayroll}
                >
                  <Text style={styles.editSaveText}>
                    {isGenerateSaving ? 'Generating...' : generateMode === 'all' ? 'Generate All' : 'Generate'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Employee picker modal */}
      <Modal visible={employeePickerOpen} transparent animationType="fade" onRequestClose={() => setEmployeePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEmployeePickerOpen(false)}>
          <Pressable style={styles.pickerModal} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Select Employee</Text>
            <ScrollView style={styles.employeePickerScroll} showsVerticalScrollIndicator={false}>
              {employees.map(employee => (
                <Pressable
                  key={employee.id}
                  style={[
                    styles.employeePickRow,
                    String(generateForm.employeeId) === String(employee.id) && styles.employeePickRowActive,
                  ]}
                  onPress={() => {
                    setGenerateForm(prev => ({
                      ...prev,
                      employeeId: String(employee.id),
                      basic: String(Number(employee.salary || 0)),
                      deduction: String(Number(employee.deduction || 0)),
                    }));
                    setEmployeePickerOpen(false);
                  }}
                >
                  <View style={styles.employeePickContent}>
                    <Text style={styles.employeePickName}>{employee.name}</Text>
                    <Text style={styles.employeePickMeta}>{employee.role} | {employee.email || 'No email'}</Text>
                  </View>
                  <Text style={styles.employeePickBadge}>{employee.status}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit payroll modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !isEditSaving && setEditOpen(false)}>
          <Pressable style={styles.actionsModal} onPress={() => {}}>
            <Text style={styles.actionsTitle}>Edit Payroll</Text>
            <Text style={styles.editHint}>{editTarget?.employeeName || ''}</Text>

            <Text style={styles.editLabel}>Payroll Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.editInput}
              value={editForm.payrollDate}
              onChangeText={value => setEditForm(prev => ({ ...prev, payrollDate: value }))}
              placeholder="2026-05-13"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />

            <Text style={styles.editLabel}>Pay Month (YYYY-MM)</Text>
            <TextInput
              style={styles.editInput}
              value={editForm.month}
              onChangeText={value => setEditForm(prev => ({ ...prev, month: value }))}
              placeholder="2026-05"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />

            <Text style={styles.editLabel}>Payment Mode</Text>
            <TextInput
              style={styles.editInput}
              value={editForm.paymentMode}
              onChangeText={value => setEditForm(prev => ({ ...prev, paymentMode: value }))}
              placeholder="Cash / NEFT / UPI"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.editRow}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Basic</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.basic}
                  onChangeText={value => setEditForm(prev => ({ ...prev, basic: value }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Allowance</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.allowance}
                  onChangeText={value => setEditForm(prev => ({ ...prev, allowance: value }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.editLabel}>Deduction</Text>
            <TextInput
              style={styles.editInput}
              value={editForm.deduction}
              onChangeText={value => setEditForm(prev => ({ ...prev, deduction: value }))}
              keyboardType="numeric"
            />

            <View style={styles.editActionRow}>
              <Pressable
                style={[styles.editActionBtn, styles.editCancelBtn]}
                disabled={isEditSaving}
                onPress={() => setEditOpen(false)}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.editActionBtn, styles.editSaveBtn, isEditSaving && { opacity: 0.65 }]}
                disabled={isEditSaving}
                onPress={onSaveEdit}
              >
                <Text style={styles.editSaveText}>{isEditSaving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Manage breakdown modal */}
      <Modal visible={breakdownOpen} transparent animationType="slide" onRequestClose={() => setBreakdownOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !breakdownSaving && setBreakdownOpen(false)}>
          <Pressable style={styles.breakdownModal} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownTitle}>Manage Breakdown</Text>
              <Pressable
                onPress={() => setBreakdownOpen(false)}
                hitSlop={8}
                style={({ pressed }) => [styles.breakdownCloseBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.breakdownCloseText}>X</Text>
              </Pressable>
            </View>

            <View style={styles.breakdownFormCard}>
              <View style={styles.breakdownFormRow}>
                <View style={styles.breakdownField}>
                  <Text style={styles.breakdownFieldLabel}>Type</Text>
                  <Pressable style={styles.breakdownSelect} onPress={() => setTypePickerOpen(true)}>
                    <Text style={styles.breakdownSelectText} numberOfLines={1}>
                      {breakdownForm.type || 'Select Type'}
                    </Text>
                    <Text style={styles.breakdownSelectIcon}>v</Text>
                  </Pressable>
                </View>

                <View style={styles.breakdownField}>
                  <Text style={styles.breakdownFieldLabel}>Amount</Text>
                  <TextInput
                    style={styles.breakdownInput}
                    value={breakdownForm.amount}
                    onChangeText={value => setBreakdownForm(prev => ({ ...prev, amount: value }))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.breakdownField}>
                  <Text style={styles.breakdownFieldLabel}>Category</Text>
                  <Pressable style={styles.breakdownSelect} onPress={() => setCategoryPickerOpen(true)}>
                    <Text style={styles.breakdownSelectText} numberOfLines={1}>
                      {categoryLabel(breakdownForm.category)}
                    </Text>
                    <Text style={styles.breakdownSelectIcon}>v</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.breakdownAddRow}>
                <Pressable
                  onPress={onAddBreakdown}
                  disabled={breakdownSaving || breakdownLoading}
                  style={[styles.breakdownAddBtn, (breakdownSaving || breakdownLoading) && { opacity: 0.7 }]}
                >
                  <Text style={styles.breakdownAddBtnText}>
                    {breakdownSaving ? 'Adding...' : 'Add Breakdown'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {breakdownLoading ? (
              <View style={styles.breakdownEmptyWrap}>
                <Text style={styles.breakdownEmptyText}>Loading breakdowns...</Text>
              </View>
            ) : breakdownEntries.length === 0 ? (
              <View style={styles.breakdownEmptyWrap}>
                <Text style={styles.breakdownEmptyText}>No breakdown entries yet.</Text>
              </View>
            ) : (
              <View style={styles.breakdownCurrentWrap}>
                {breakdownEntries.map((row, idx) => (
                  <View key={`${row?.id || 'entry'}-${idx}`} style={styles.breakdownCurrentRow}>
                    <Text style={styles.breakdownCurrentType}>{row?.type || '-'}</Text>
                    <View style={[
                      styles.breakdownCatBadge,
                      Number(row?.category) === 2 ? styles.breakdownCatDeduct : styles.breakdownCatEarn,
                    ]}>
                      <Text style={[
                        styles.breakdownCatBadgeText,
                        Number(row?.category) === 2 ? styles.breakdownCatDeductText : styles.breakdownCatEarnText,
                      ]}>
                        {categoryLabel(row?.category)}
                      </Text>
                    </View>
                    <Text style={styles.breakdownCurrentAmount}>{formatMoney(row?.amount || 0)}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.breakdownHistoryTitle}>Breakdown History</Text>
            <Text style={styles.breakdownHistorySub}>
              Showing only {breakdownMonthLabel} (other payrolls for this month)
            </Text>

            {breakdownHistory.length === 0 ? (
              <View style={styles.breakdownHistoryEmptyWrap}>
                <Text style={styles.breakdownHistoryEmptyText}>No history for this month.</Text>
              </View>
            ) : (
              <View style={styles.breakdownTableWrap}>
                <View style={styles.breakdownTableHeader}>
                  <Text style={[styles.breakdownTh, styles.breakdownTypeCol]}>Type</Text>
                  <Text style={[styles.breakdownTh, styles.breakdownCategoryCol]}>Category</Text>
                  <Text style={[styles.breakdownTh, styles.breakdownAmountCol]}>Amount</Text>
                </View>
                <ScrollView style={styles.breakdownTableBody} nestedScrollEnabled>
                  {breakdownHistory.map((row, idx) => (
                    <View key={`${row?.id || 'history'}-${idx}`} style={styles.breakdownTr}>
                      <Text style={[styles.breakdownTd, styles.breakdownTypeCol]} numberOfLines={1}>
                        {row?.type || '-'}
                      </Text>
                      <View style={[styles.breakdownCategoryCol, styles.breakdownCategoryCell]}>
                        <View style={[
                          styles.breakdownCatBadge,
                          Number(row?.category) === 2 ? styles.breakdownCatDeduct : styles.breakdownCatEarn,
                        ]}>
                          <Text style={[
                            styles.breakdownCatBadgeText,
                            Number(row?.category) === 2 ? styles.breakdownCatDeductText : styles.breakdownCatEarnText,
                          ]}>
                            {categoryLabel(row?.category)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.breakdownTd, styles.breakdownAmountCol]}>
                        {formatMoney(row?.amount || 0)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Breakdown type picker */}
      <Modal visible={typePickerOpen} transparent animationType="fade" onRequestClose={() => setTypePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTypePickerOpen(false)}>
          <Pressable style={styles.pickerModal} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Select Type</Text>
            {(breakdownTypes.length ? breakdownTypes : ['Basic', 'HRA', 'PF', 'Incentive', 'Bonus', 'Tax']).map(typeName => (
              <Pressable
                key={typeName}
                onPress={() => {
                  setBreakdownForm(prev => ({ ...prev, type: typeName }));
                  setTypePickerOpen(false);
                }}
                style={[styles.yearItem, breakdownForm.type === typeName && styles.yearItemActive]}
              >
                <Text style={[styles.yearItemText, breakdownForm.type === typeName && styles.yearItemTextActive]}>
                  {typeName}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Breakdown category picker */}
      <Modal visible={categoryPickerOpen} transparent animationType="fade" onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={styles.pickerModal} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Select Category</Text>
            {BREAKDOWN_CATEGORIES.map(cat => (
              <Pressable
                key={cat.value}
                onPress={() => {
                  setBreakdownForm(prev => ({ ...prev, category: cat.value }));
                  setCategoryPickerOpen(false);
                }}
                style={[styles.yearItem, Number(breakdownForm.category) === cat.value && styles.yearItemActive]}
              >
                <Text style={[styles.yearItemText, Number(breakdownForm.category) === cat.value && styles.yearItemTextActive]}>
                  {cat.label}
                </Text>
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
            {['Edit', 'Delete', activeItem?.isPublished ? 'Published' : 'Publish', 'Manage Breakdown'].map(label => (
              <Pressable
                key={label}
                style={[styles.actionMenuItem, isActionLoading && { opacity: 0.6 }]}
                disabled={isActionLoading}
                onPress={() => onActionSelect(label)}
              >
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
  fabWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  /* Floating action button */
  fabActionBtn: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    backgroundColor: THEME,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    zIndex: 1000,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 12,
  },
  fabActionText: { color: '#fff', fontWeight: '800', fontSize: 14 },

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
  scrollContent: { paddingBottom: 96 },

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
  generateModal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: '88%',
  },
  generateHint: { color: '#64748b', fontSize: 12, lineHeight: 17, marginBottom: 12 },
  generateSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  generateSummaryTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  generateSummaryText: { fontSize: 12, color: '#475569', lineHeight: 17 },
  generateMeta: { color: '#64748b', fontSize: 11, marginTop: 4, marginBottom: 8 },
  generateNote: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 2, marginBottom: 4 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 4,
  },
  selectFieldText: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  selectFieldIcon: { color: '#94a3b8', fontSize: 11, marginLeft: 8, fontWeight: '900' },
  employeePickerScroll: { maxHeight: 360, marginTop: 2 },
  employeePickContent: { flex: 1 },
  employeePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  employeePickRowActive: { backgroundColor: '#fce7ef', borderColor: THEME },
  employeePickName: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  employeePickMeta: { color: '#64748b', fontWeight: '600', fontSize: 11, marginTop: 2 },
  employeePickBadge: {
    color: THEME,
    fontWeight: '800',
    fontSize: 10,
    backgroundColor: '#fce7ef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  quickActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  quickActionIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fce7ef', alignItems: 'center', justifyContent: 'center' },
  quickActionIcon: { fontSize: 14, color: THEME, fontWeight: '800' },
  quickActionText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  editHint: { color: '#64748b', fontSize: 12, marginTop: -6, marginBottom: 10 },
  editRow: { flexDirection: 'row', gap: 10 },
  editField: { flex: 1 },
  editLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 },
  editInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  editActionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editActionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editCancelBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  editSaveBtn: { backgroundColor: THEME },
  editCancelText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  editSaveText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  actionMenuItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  actionMenuText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  actionMenuTextDanger: { color: '#dc2626' },

  /* ── Breakdown modal ─────────────────────────────────────────────────── */
  breakdownModal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    maxHeight: '90%',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  breakdownTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  breakdownCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownCloseText: { fontSize: 13, fontWeight: '900', color: '#dc2626' },

  /* Form card */
  breakdownFormCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 14,
  },
  breakdownFormRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  breakdownField: { flex: 1 },
  breakdownFieldLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 4 },
  breakdownSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  breakdownSelectText: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },
  breakdownSelectIcon: { fontSize: 10, color: '#94a3b8' },
  breakdownInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  breakdownAddRow: { alignItems: 'flex-end' },
  breakdownAddBtn: {
    backgroundColor: THEME,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  breakdownAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  /* Current entries */
  breakdownEmptyWrap: { alignItems: 'center', paddingVertical: 16 },
  breakdownEmptyText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  breakdownCurrentWrap: { marginBottom: 14, gap: 6 },
  breakdownCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  breakdownCurrentType: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  breakdownCurrentAmount: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  /* Category badge */
  breakdownCatBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginHorizontal: 6 },
  breakdownCatEarn: { backgroundColor: '#dcfce7' },
  breakdownCatDeduct: { backgroundColor: '#fee2e2' },
  breakdownCatBadgeText: { fontSize: 11, fontWeight: '700' },
  breakdownCatEarnText: { color: '#15803d' },
  breakdownCatDeductText: { color: '#b91c1c' },

  /* History table */
  breakdownHistoryTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  breakdownHistorySub: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 10 },
  breakdownHistoryEmptyWrap: { alignItems: 'center', paddingVertical: 12 },
  breakdownHistoryEmptyText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  breakdownTableWrap: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  breakdownTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  breakdownTh: { fontSize: 11, fontWeight: '800', color: '#475569' },
  breakdownTableBody: { maxHeight: 180 },
  breakdownTr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  breakdownTd: { fontSize: 12, fontWeight: '600', color: '#334155' },
  breakdownTypeCol: { flex: 1 },
  breakdownCategoryCol: { width: 90 },
  breakdownCategoryCell: { alignItems: 'flex-start' },
  breakdownAmountCol: { width: 90, textAlign: 'right' },
});
