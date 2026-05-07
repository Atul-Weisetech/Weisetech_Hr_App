import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { AppStoreContext, AppStoreActionsContext } from '../state/AppStore';

const THEME = '#CC0D49';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthLabel(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function isFuture(dateStr) {
  const d = new Date(dateStr);
  return d >= new Date(new Date().toDateString());
}

const HolidayCard = React.memo(({ item, onDelete }) => {
  const future = isFuture(item.date);
  return (
    <View style={styles.card}>
      {/* Delete button — top right */}
      <Pressable
        style={styles.cardMenuBtn}
        onPress={() => onDelete(item)}
        hitSlop={8}
      >
        <Text style={styles.cardMenuText}>🗑</Text>
      </Pressable>

      {/* Upcoming badge */}
      {future && (
        <View style={styles.upcomingBadge}>
          <Text style={styles.upcomingBadgeText}>Upcoming</Text>
        </View>
      )}

      {/* Holiday name + Date */}
      <View style={styles.cardRow}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>
            {new Date(item.date).getDate() || '-'}
          </Text>
          <Text style={styles.dateMonth}>
            {MONTH_NAMES[new Date(item.date).getMonth()]?.slice(0, 3) || ''}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.holidayName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.holidayDate}>{formatDisplayDate(item.date)}</Text>
          {item.description ? (
            <Text style={styles.holidayDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
      </View>

      {/* Footer: created by */}
      {item.createdBy ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Added by {item.createdBy}</Text>
        </View>
      ) : null}
    </View>
  );
});

export default function HolidayScreen() {
  const { holidays } = useContext(AppStoreContext);
  const { addHoliday, deleteHoliday } = useContext(AppStoreActionsContext);

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(null);

  const [form, setForm] = useState({ name: '', date: '', description: '' });

  // Available years from holiday data
  const availableYears = useMemo(() => {
    const years = new Set();
    holidays.forEach(h => {
      const y = new Date(h.date).getFullYear();
      if (!Number.isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [holidays]);

  // Filter + group by month
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = holidays.filter(h => {
      if (selectedYear && new Date(h.date).getFullYear() !== selectedYear) return false;
      if (q && !h.name.toLowerCase().includes(q)) return false;
      return true;
    });

    // Sort by date ascending
    const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by "Month Year"
    const groups = {};
    sorted.forEach(h => {
      const key = getMonthLabel(h.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(h);
    });
    return Object.entries(groups).map(([month, items]) => ({ month, items }));
  }, [holidays, search, selectedYear]);

  const totalFiltered = grouped.reduce((s, g) => s + g.items.length, 0);

  const resetForm = () => setForm({ name: '', date: '', description: '' });

  const onSave = async () => {
    if (!form.name.trim() || !form.date.trim()) {
      Alert.alert('Missing fields', 'Holiday name and date are required.');
      return;
    }
    // Basic date format check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
      Alert.alert('Invalid date', 'Date must be in YYYY-MM-DD format.');
      return;
    }
    setSaving(true);
    try {
      await addHoliday({
        name: form.name.trim(),
        date: form.date.trim(),
        description: form.description.trim(),
        createdBy: 'HR Admin',
      });
      resetForm();
      setAddOpen(false);
    } catch (e) {
      Alert.alert('Could not add holiday', e?.response?.data?.error || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = useCallback(item => {
    Alert.alert(
      'Delete Holiday',
      `Remove "${item.name}" on ${formatDisplayDate(item.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHoliday(item.id);
            } catch (e) {
              Alert.alert('Could not delete', e?.response?.data?.error || 'Please try again.');
            }
          },
        },
      ],
    );
  }, [deleteHoliday]);

  const renderItem = useCallback(
    ({ item }) => <HolidayCard item={item} onDelete={onDelete} />,
    [onDelete],
  );

  return (
    <Screen>
      {/* Header */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Holidays</Text>
            <Text style={styles.subtitle}>
              {totalFiltered} holiday{totalFiltered !== 1 ? 's' : ''}
              {selectedYear ? ` in ${selectedYear}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => setAddOpen(true)}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.addBtnText}>+ Add Holiday</Text>
          </Pressable>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search holidays..."
          placeholderTextColor="#94a3b8"
        />

        {/* Year chips */}
        {availableYears.length > 0 && (
          <View style={styles.yearRow}>
            <Pressable
              onPress={() => setSelectedYear(null)}
              style={[styles.yearChip, !selectedYear && styles.yearChipActive]}
            >
              <Text style={[styles.yearChipText, !selectedYear && styles.yearChipTextActive]}>All</Text>
            </Pressable>
            {availableYears.map(y => (
              <Pressable
                key={y}
                onPress={() => setSelectedYear(selectedYear === y ? null : y)}
                style={[styles.yearChip, selectedYear === y && styles.yearChipActive]}
              >
                <Text style={[styles.yearChipText, selectedYear === y && styles.yearChipTextActive]}>{y}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      {/* Grouped holiday list */}
      <FlatList
        data={grouped}
        keyExtractor={g => g.month}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No holidays found.</Text>
          </View>
        }
        renderItem={({ item: group }) => (
          <View>
            <View style={styles.monthHeader}>
              <Text style={styles.monthTitle}>{group.month}</Text>
              <View style={styles.monthCount}>
                <Text style={styles.monthCountText}>{group.items.length}</Text>
              </View>
            </View>
            {group.items.map(h => (
              <HolidayCard key={h.id} item={h} onDelete={onDelete} />
            ))}
          </View>
        )}
      />

      {/* Add Holiday Modal */}
      <Modal
        visible={addOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { setAddOpen(false); resetForm(); }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => { setAddOpen(false); resetForm(); }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Holiday</Text>

            <Text style={styles.formLabel}>Holiday Name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={t => setForm(p => ({ ...p, name: t }))}
              placeholder="e.g. Diwali"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.formLabel}>Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={t => setForm(p => ({ ...p, date: t }))}
              placeholder="2026-10-20"
              placeholderTextColor="#94a3b8"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.formLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={form.description}
              onChangeText={t => setForm(p => ({ ...p, description: t }))}
              placeholder="Any notes about this holiday..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => { setAddOpen(false); resetForm(); }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onSave}
                disabled={saving}
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: { marginBottom: 10, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  addBtn: { backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  yearRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  yearChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  yearChipActive: { backgroundColor: THEME, borderColor: THEME },
  yearChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  yearChipTextActive: { color: '#fff' },

  listContent: { paddingBottom: 24 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94a3b8', fontWeight: '600' },

  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 4 },
  monthTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  monthCount: { backgroundColor: THEME, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  monthCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  /* Holiday card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
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
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardMenuText: { fontSize: 13 },
  upcomingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fce7ef',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  upcomingBadgeText: { fontSize: 10, fontWeight: '800', color: THEME },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  dateBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: THEME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 22 },
  dateMonth: { fontSize: 10, fontWeight: '700', color: '#fce7ef' },
  cardInfo: { flex: 1, paddingRight: 32 },
  holidayName: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  holidayDate: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  holidayDesc: { fontSize: 12, fontWeight: '500', color: '#94a3b8', marginTop: 4 },
  footer: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },

  /* Modal */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#e5e7eb' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { color: '#475569', fontWeight: '700' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10, backgroundColor: THEME },
  saveBtnText: { color: '#fff', fontWeight: '800' },
});
