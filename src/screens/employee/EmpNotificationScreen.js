import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import hrApi from '../../api/hrApi';
import { AuthContext } from '../../state/AuthContext';
import { AppStoreContext, AppStoreActionsContext } from '../../state/AppStore';

function formatDate(dateText) {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateText) {
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateDaysInclusive(fromDate, toDate) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function statusStyle(status) {
  if (status === 'Approved') return { bg: '#dcfce7', text: '#16a34a' };
  if (status === 'Rejected') return { bg: '#fee2e2', text: '#dc2626' };
  return { bg: '#fef3c7', text: '#d97706' };
}

function normalizeWarningTypeDetails(rawWarningTypes = [], fallbackMessage = '-') {
  if (!Array.isArray(rawWarningTypes) || rawWarningTypes.length === 0) {
    return [{ type: 'General', description: fallbackMessage || '-' }];
  }

  const normalized = rawWarningTypes.map(item => {
    if (typeof item === 'string') return { type: item, description: '' };
    const description =
      item?.description ||
      item?.details ||
      item?.detail ||
      item?.warning_description ||
      item?.warning_details ||
      item?.reason ||
      item?.note ||
      item?.overall_note ||
      '';

    return {
      type: item?.warning_type || item?.warningType || item?.type || 'General',
      description: typeof description === 'string' ? description.trim() : '',
    };
  });

  return normalized.length ? normalized : [{ type: 'General', description: fallbackMessage || '-' }];
}

function parseWarningTypesFromMessage(message = '') {
  const text = String(message || '');
  const typeMatch = text.match(/warning types:\s*(.*?)\s*(?:\.|overall note:|$)/i);
  const noteMatch = text.match(/overall note:\s*(.*)$/i);

  const types = typeMatch?.[1]
    ? typeMatch[1].split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return {
    types,
    overallNote: noteMatch?.[1]?.trim() || text || '-',
  };
}

export default function EmpNotificationScreen() {
  const { user } = useContext(AuthContext);
  const {
    notificationsByEmployee,
    leaveRequests,
    wfhRequests,
    warnings,
  } = useContext(AppStoreContext);
  const {
    refreshNotifications,
    refreshLeaveRequests,
    refreshWfhRequests,
    refreshWarnings,
  } = useContext(AppStoreActionsContext);

  const [searchText, setSearchText] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);

  const employeeId = String(user.employeeId || user.id);

  const notifications = useMemo(
    () => notificationsByEmployee[employeeId] || [],
    [notificationsByEmployee, employeeId],
  );

  useEffect(() => {
    refreshNotifications(employeeId);
    refreshLeaveRequests();
    refreshWfhRequests();
    refreshWarnings();
  }, [employeeId, refreshNotifications, refreshLeaveRequests, refreshWfhRequests, refreshWarnings]);

  const warningAlerts = useMemo(() => {
    const warningsById = new Map(warnings.map(w => [String(w.id), w]));

    const directWarnings = warnings
      .filter(w => String(w.employeeId) === employeeId)
      .map(w => {
        const warningTypeDetails = normalizeWarningTypeDetails(w.warningTypes, w.reason || '-');
        const warningTypesText = warningTypeDetails.map(x => x.type).join(', ');
        return ({
        id: `warn-${w.id}`,
        dedupeKey: `warn-${w.id}`,
        title: 'Performance Warning',
        message: `You have received a new performance warning. Warning types: ${warningTypesText || 'General'}. Overall note: ${w.reason || '-'}`,
        createdAt: w.date,
        warningTypeDetails,
        warningTypes: warningTypeDetails.map(x => x.type),
        overallNote: w.reason || '-',
        warningMessage: w.reason || '-',
        employeeName: w.employeeName || user.name || '-',
        employeeDepartment: w.employeeDepartment || user.department || '-',
        createdBy: w.createdBy || 'Admin',
        sourceWarningId: String(w.id),
        });
      });

    const notificationWarnings = notifications
      .filter(n => n.type === 'warning' || n.type === 'performance_warning')
      .map(n => {
        const linkedWarning = n.referenceId ? warningsById.get(String(n.referenceId)) : null;
        const parsed = parseWarningTypesFromMessage(n.message);
        const messagePart = n.message?.split(/overall note:/i)[0]?.trim() || n.message || '-';

        const warningTypeDetails = linkedWarning
          ? normalizeWarningTypeDetails(linkedWarning.warningTypes, linkedWarning.reason || '-')
          : ((parsed.types || []).length
            ? parsed.types.map(type => ({ type, description: '' }))
            : [{ type: 'General', description: messagePart }]);

        const overallNote = linkedWarning?.reason || parsed.overallNote || '-';

        return {
        id: `notif-${n.id}`,
        dedupeKey: linkedWarning ? `warn-${linkedWarning.id}` : `notif-${n.id}`,
        title: n.title || 'Performance Warning',
        message: n.message,
        createdAt: n.date,
        warningTypeDetails,
        warningTypes: warningTypeDetails.map(x => x.type),
        overallNote,
        warningMessage: messagePart || '-',
        employeeName: linkedWarning?.employeeName || n.employeeName || user.name || '-',
        employeeDepartment: linkedWarning?.employeeDepartment || n.employeeDepartment || user.department || '-',
        createdBy: linkedWarning?.createdBy || n.createdBy || 'Admin',
        referenceId: n.referenceId || null,
        sourceWarningId: linkedWarning?.id ? String(linkedWarning.id) : (n.referenceId ? String(n.referenceId) : null),
        };
      });

    const directKeySet = new Set(
      directWarnings.map(item => item.dedupeKey),
    );

    const filteredNotificationWarnings = notificationWarnings.filter(item => !directKeySet.has(item.dedupeKey));

    const merged = [...directWarnings, ...filteredNotificationWarnings];
    const unique = [];
    const seen = new Set();

    merged.forEach(item => {
      const key = item.dedupeKey || `${item.title}-${item.createdAt}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    return unique.slice(0, 6);
  }, [warnings, notifications, employeeId, user.name, user.department]);

  const requestRows = useMemo(() => {
    const leaveRows = leaveRequests
      .filter(r => String(r.employeeId) === employeeId)
      .map(r => ({
        id: `leave-${r.id}`,
        type: 'Leave',
        status: r.status,
        from: r.from,
        to: r.to,
        days: calculateDaysInclusive(r.from, r.to),
        description: r.reason || '-',
        reviewedBy: r.reviewedBy || 'Smart One',
        reviewedAt: r.reviewedAt || r.to || r.from,
      }));

    const wfhRows = wfhRequests
      .filter(r => String(r.employeeId) === employeeId)
      .map(r => ({
        id: `wfh-${r.id}`,
        type: 'WFH',
        status: r.status,
        from: r.from,
        to: r.to,
        days: calculateDaysInclusive(r.from, r.to),
        description: r.reason || '-',
        reviewedBy: r.reviewedBy || 'Smart One',
        reviewedAt: r.reviewedAt || r.to || r.from,
      }));

    return [...leaveRows, ...wfhRows].sort(
      (a, b) => new Date(b.from || 0).getTime() - new Date(a.from || 0).getTime(),
    );
  }, [leaveRequests, wfhRequests, employeeId]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return requestRows;

    return requestRows.filter(r => {
      const bag = `${r.type} ${r.status} ${r.description} ${r.reviewedBy}`.toLowerCase();
      return bag.includes(q);
    });
  }, [requestRows, searchText]);

  const onRefresh = async () => {
    await Promise.all([
      refreshNotifications(employeeId),
      refreshLeaveRequests(),
      refreshWfhRequests(),
      refreshWarnings(),
    ]);
  };

  const onOpenAlertDetails = async alertItem => {
    setSelectedAlert(alertItem);
    setIsAlertModalVisible(true);

    const warningId = alertItem?.sourceWarningId || alertItem?.referenceId;
    if (!warningId) return;

    try {
      const { data } = await hrApi.get(`/performance-warnings/${warningId}`);
      const payload = data?.data ?? data;
      const warningRecord = Array.isArray(payload) ? payload[0] : payload;
      if (!warningRecord) return;

      const warningTypeDetails = normalizeWarningTypeDetails(
        warningRecord.warning_types || warningRecord.warningTypes || [],
        '',
      );

      setSelectedAlert(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          warningTypeDetails,
          warningTypes: warningTypeDetails.map(x => x.type),
          overallNote: warningRecord.overall_note || warningRecord.overall_notes || prev.overallNote || '-',
          employeeName: warningRecord.employee_name || warningRecord.employeeName || prev.employeeName || '-',
          createdBy: warningRecord.created_by || warningRecord.createdBy || prev.createdBy || 'Admin',
          createdAt: warningRecord.created_at || prev.createdAt,
        };
      });
    } catch (e) {
      // Keep the already shown modal data if details endpoint fails.
    }
  };

  const onCloseAlertDetails = () => {
    setIsAlertModalVisible(false);
    setSelectedAlert(null);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Notification Center</Text>
          <Text style={styles.pageSubtitle}>
            Track approval status of your leave and work from home requests
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={16} color="#334155" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>ALERTS & NOTIFICATIONS</Text>

      {warningAlerts.length === 0 ? (
        <View style={styles.emptyAlertCard}>
          <Text style={styles.emptyAlertText}>No alerts at the moment</Text>
        </View>
      ) : (
        warningAlerts.map(item => (
          <View key={item.id} style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <MaterialCommunityIcons name="alert-outline" size={20} color="#d97706" />
            </View>
            <View style={styles.alertBody}>
              <View style={styles.warningBadge}>
                <Text style={styles.warningBadgeText}>Warning</Text>
              </View>
              <Text style={styles.alertTitle}>{item.title}</Text>
              <Text style={styles.alertMessage}>{item.message}</Text>
              <Text style={styles.alertDate}>{formatDateTime(item.createdAt)}</Text>
              <TouchableOpacity onPress={() => onOpenAlertDetails(item)} activeOpacity={0.8}>
                <Text style={styles.alertLink}>Tap to view full details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <View style={styles.tableHeadRow}>
        <Text style={styles.sectionTitle}>LEAVE & WORK FROM HOME</Text>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by status or description..."
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <View style={styles.tableWrap}>
        {filteredRows.length === 0 ? (
          <View style={styles.emptyTableRow}>
            <Text style={styles.emptyTableText}>No matching records</Text>
          </View>
        ) : (
          filteredRows.map(row => {
            const sc = statusStyle(row.status);
            return (
              <View key={row.id} style={styles.requestCard}>
                <View style={styles.cardLine}>
                  <View style={[styles.typeChip, row.type === 'Leave' ? styles.typeLeave : styles.typeWfh]}>
                    <Text style={styles.typeChipText}>{row.type}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusChipText, { color: sc.text }]}>{row.status}</Text>
                  </View>
                </View>

                <View style={styles.cardLine}>
                  <Text style={styles.cardMetaText}>
                    {formatDate(row.from)} - {formatDate(row.to)}
                  </Text>
                  <Text style={styles.cardMetaText}>Days: {row.days}</Text>
                </View>

                <View style={styles.cardLineLast}>
                  <Text style={styles.cardDescText} numberOfLines={1}>Description: {row.description}</Text>
                  <View style={styles.cardReviewRow}>
                    <View style={styles.reviewerChip}>
                      <Text style={styles.reviewerChipText}>{row.reviewedBy}</Text>
                    </View>
                    <Text style={styles.cardReviewedAt}>{formatDateTime(row.reviewedAt)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      <Modal
        visible={isAlertModalVisible}
        transparent
        animationType="fade"
        onRequestClose={onCloseAlertDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconWrap}>
                  <MaterialCommunityIcons name="alert-outline" size={22} color="#d97706" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{selectedAlert?.title || 'Performance Warning'}</Text>
                  <Text style={styles.modalSubTitle}>Full warning details</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onCloseAlertDetails} style={styles.modalCloseBtn} activeOpacity={0.8}>
                <MaterialCommunityIcons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>Employee</Text>
              <Text style={styles.modalEmployeeName}>{selectedAlert?.employeeName || '-'}</Text>
              <Text style={styles.modalEmployeeDept}>{selectedAlert?.employeeDepartment || '-'}</Text>
            </View>

            <Text style={styles.modalBlockTitle}>WARNING TYPES</Text>
            {(selectedAlert?.warningTypeDetails || [{ type: 'General', description: '-' }]).map((item, idx) => (
              <View style={styles.modalSection} key={`${item.type}-${idx}`}>
                <View style={styles.modalWarningTypePill}>
                  <Text style={styles.modalWarningTypeText}>{item.type || 'General'}</Text>
                </View>
                <Text style={styles.modalBodyText}>
                  {item.description || `No additional details provided for ${item.type || 'this warning type'}.`}
                </Text>
              </View>
            ))}

            <View style={styles.modalNoteBox}>
              <Text style={styles.modalBlockTitle}>OVERALL NOTE</Text>
              <Text style={styles.modalNoteText}>{selectedAlert?.overallNote || '-'}</Text>
            </View>

            <View style={styles.modalMetaRow}>
              <Text style={styles.modalMetaText}>{selectedAlert?.createdBy || 'Admin'}</Text>
              <Text style={styles.modalMetaText}>{formatDateTime(selectedAlert?.createdAt)}</Text>
            </View>

            <TouchableOpacity style={styles.modalCloseActionBtn} onPress={onCloseAlertDetails} activeOpacity={0.9}>
              <Text style={styles.modalCloseActionText}>Close</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e5e7eb' },
  content: { padding: 16, paddingBottom: 26 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  titleWrap: { flex: 1, minWidth: 240 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { marginTop: 4, fontSize: 15, color: '#64748b' },
  refreshBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshText: { fontSize: 20, fontWeight: '600', color: '#1e293b' },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 0.6,
  },

  alertCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  alertBody: { flex: 1 },
  warningBadge: {
    backgroundColor: '#fde68a',
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 24,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginBottom: 6,
  },
  warningBadgeText: { color: '#b45309', fontWeight: '700', fontSize: 14 },
  alertTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  alertMessage: { fontSize: 12, color: '#334155', lineHeight: 25 },
  alertDate: { marginTop: 4, fontSize: 15, color: '#94a3b8' },
  alertLink: { marginTop: 4, fontSize: 15, color: '#e11d48', fontWeight: '700' },
  emptyAlertCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 18,
    marginBottom: 8,
  },
  emptyAlertText: { color: '#64748b', fontWeight: '600' },

  tableHeadRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchWrap: {
    minWidth: 250,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 0, color: '#0f172a' },

  tableWrap: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    padding: 10,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  cardLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  cardLineLast: {
    gap: 8,
  },
  cardMetaText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  cardDescText: {
    fontSize: 13,
    color: '#475569',
  },
  cardReviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  cardReviewedAt: {
    fontSize: 12,
    color: '#64748b',
  },

  typeChip: {
    height: 24,
    borderRadius: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeLeave: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  typeWfh: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
  typeChipText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  statusChip: {
    borderRadius: 999,
    height: 26,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusChipText: { fontSize: 12, fontWeight: '700' },

  reviewerChip: {
    height: 26,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  reviewerChipText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  emptyTableRow: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  emptyTableText: { color: '#64748b', fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: '88%',
  },
  modalScrollContent: { paddingBottom: 2 },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalSubTitle: { marginTop: 2, fontSize: 15, color: '#64748b' },
  modalCloseBtn: { padding: 4 },
  modalSection: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  modalSectionLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  modalEmployeeName: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  modalEmployeeDept: { fontSize: 20, color: '#64748b', marginTop: 2 },
  modalBlockTitle: {
    fontSize: 19,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 2,
  },
  modalWarningTypePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#fde68a',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  modalWarningTypeText: { fontSize: 15, color: '#9a3412', fontWeight: '800' },
  modalBodyText: { fontSize: 20, color: '#475569', lineHeight: 37 },
  modalNoteBox: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  modalNoteText: { fontSize: 20, color: '#1e293b', lineHeight: 38 },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
    flexWrap: 'wrap',
  },
  modalMetaText: { fontSize: 20, color: '#94a3b8' },
  modalCloseActionBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseActionText: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
});
