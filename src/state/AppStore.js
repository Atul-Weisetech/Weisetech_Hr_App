import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import hrApi from '../api/hrApi';
import { AuthContext } from './AuthContext';

// DATA context — re-renders consumers when data changes
export const AppStoreContext = createContext(null);
// ACTIONS context — stable references, never causes re-renders from data changes
export const AppStoreActionsContext = createContext(null);

const LEAVE_STATUS = {
  requested: 'Pending',
  approved: 'Approved',
  declined: 'Rejected',
  cancel_requested: 'Pending',
  canceled: 'Rejected',
};

function mapLeaveStatus(statusText) {
  return LEAVE_STATUS[(statusText || '').toLowerCase()] || 'Pending';
}
function mapRequestStatusToApi(status) {
  if (status === 'Approved') return 'approved';
  if (status === 'Rejected') return 'declined';
  return 'requested';
}
function mapSeverityFromTypes(types) {
  const text = (types || []).join(' ').toLowerCase();
  if (text.includes('high')) return 'High';
  if (text.includes('low')) return 'Low';
  return 'Medium';
}
function normalizeEmployee(e) {
  const id = String(e.employee_id ?? e.id ?? '');
  return {
    id,
    name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email_address || `Employee ${id}`,
    role: e.designation || 'Employee',
    email: e.email_address || '',
    status: e.is_active ? 'Active' : 'Inactive',
    salary: Number(e.salary || 0),
    deduction: Number(e.deduction || 0),
    joiningDate: e.joining_date || null,
  };
}
function normalizeLeave(row) {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    employeeName: row.employee_name,
    type: 'General',
    from: row.from_date,
    to: row.to_date,
    reason: row.description || '',
    status: mapLeaveStatus(row.status_text),
    rawStatus: (row.status_text || 'requested').toLowerCase(),
  };
}
function normalizeWfh(row) {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    employeeName: row.employee_name,
    from: row.from_date,
    to: row.to_date,
    reason: row.description || '',
    status: mapLeaveStatus(row.status_text),
    rawStatus: (row.status_text || 'requested').toLowerCase(),
  };
}
function normalizeWarning(row) {
  let warningTypes = [];
  if (Array.isArray(row.warning_types)) {
    warningTypes = row.warning_types;
  } else if (typeof row.warning_types === 'string') {
    try {
      const parsed = JSON.parse(row.warning_types);
      warningTypes = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      warningTypes = [];
    }
  }

  const warningTypeText = warningTypes
    .map(t => (typeof t === 'string' ? t : t?.warning_type || t?.warningType || t?.type || ''))
    .filter(Boolean)
    .join(', ');

  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    employeeName: row.employee_name,
    reason: row.overall_notes || warningTypeText || 'Performance warning',
    date: row.created_at ? String(row.created_at).slice(0, 10) : '',
    severity: mapSeverityFromTypes(warningTypes),
    warningTypes,
    createdBy: row.created_by || 'HR Admin',
  };
}
function normalizePayroll(row, employeeNameMap = {}) {
  const employeeId = String(row.fk_employee_id);
  const allowance =
    row.allowance ??
    row.allowances ??
    row.other_earnings ??
    row.other_allowance ??
    0;
  const deduction =
    row.deduction ??
    row.deductions ??
    row.total_deduction ??
    row.other_deduction ??
    0;
  return {
    id: String(row.id),
    employeeId,
    employeeName:
      `${row.first_name || ''} ${row.last_name || ''}`.trim() ||
      employeeNameMap[employeeId] ||
      `Employee ${employeeId}`,
    month: row.pay_month || (row.payroll_date ? String(row.payroll_date).slice(0, 7) : 'Unknown'),
    payrollDate: row.payroll_date,
    paymentMode: row.mode_of_payment || 'N/A',
    basic: Number(row.payroll_amount || 0),
    allowance: Number(allowance || 0),
    deduction: Number(deduction || 0),
    isPublished: !!row.is_published,
  };
}
function normalizeNotification(row) {
  return {
    id: String(row.id),
    employeeId: String(row.user_id),
    title: row.title,
    message: row.message,
    type: row.type || 'info',
    referenceId: row.reference_id != null ? String(row.reference_id) : null,
    read: !!row.is_read,
    date: row.created_at ? String(row.created_at).slice(0, 10) : '',
  };
}

export function AppStoreProvider({ children }) {
  const { user } = useContext(AuthContext);

  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [notificationsByEmployee, setNotificationsByEmployee] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    const { data } = await hrApi.get('/employees');
    const rows = Array.isArray(data) ? data : [];
    const normalized = rows.map(normalizeEmployee);
    setEmployees(normalized);
    return normalized;
  }, []);

  const loadPayrolls = useCallback(async employeeList => {
    const { data } = await hrApi.get('/payrolls');
    const rows = Array.isArray(data) ? data : [];
    // Use the passed list to avoid depending on employees state
    const map = Object.fromEntries((employeeList || []).map(e => [e.id, e.name]));
    setPayrolls(rows.map(p => normalizePayroll(p, map)));
  }, []); // no employees dep — receives list as param

  const loadLeaveRequests = useCallback(async () => {
    const { data } = await hrApi.get('/leave-requests');
    const rows = Array.isArray(data?.data) ? data.data : [];
    setLeaveRequests(rows.map(normalizeLeave));
  }, []);

  const loadWfhRequests = useCallback(async () => {
    const { data } = await hrApi.get('/work-from-home');
    const rows = Array.isArray(data?.data) ? data.data : [];
    setWfhRequests(rows.map(normalizeWfh));
  }, []);

  const loadWarnings = useCallback(async () => {
    const { data } = await hrApi.get('/performance-warnings');
    const rows = Array.isArray(data?.data) ? data.data : [];
    setWarnings(rows.map(normalizeWarning));
  }, []);

  const loadHolidays = useCallback(async (year) => {
    const url = year ? `/holidays?year=${year}` : '/holidays';
    const { data } = await hrApi.get(url);
    const rows = Array.isArray(data) ? data : [];
    setHolidays(rows.map(r => ({
      id: String(r.id),
      name: r.holiday_name,
      date: r.holiday_date ? String(r.holiday_date).slice(0, 10) : '',
      description: r.description || '',
      createdBy: r.created_by || 'HR Admin',
      createdAt: r.created_at ? String(r.created_at).slice(0, 10) : '',
    })));
  }, []);

  const loadNotifications = useCallback(async employeeId => {
    if (!employeeId) return [];
    const { data } = await hrApi.get(`/notifications/employee/${employeeId}`);
    const rows = Array.isArray(data?.data) ? data.data : [];
    const normalized = rows.map(normalizeNotification);
    setNotificationsByEmployee(prev => ({ ...prev, [String(employeeId)]: normalized }));
    return normalized;
  }, []);

  const loadTimeEntries = useCallback(async employeeIdParam => {
    const employeeId = String(employeeIdParam || user?.employeeId || user?.id || '');
    if (!employeeId) {
      setTimeEntries([]);
      return;
    }
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const { data } = await hrApi.get(`/attendance/records/${employeeId}?month=${month}&year=${year}`);
      const rows = Array.isArray(data?.records) ? data.records : [];
      const normalized = rows.map((row, idx) => ({
        id: `${employeeId}-${row.date}-${idx}`,
        employeeId,
        date: row.date,
        startTime: row.clock_in || '',
        endTime: row.clock_out || '',
        durationMinutes: Math.max(0, Math.round(Number(row.hours || 0) * 60)),
      }));
      setTimeEntries(normalized);
    } catch (e) {
      setTimeEntries([]);
    }
  }, [user?.employeeId, user?.id]);

  const refreshAllData = useCallback(async () => {
    try {
      const employeeList = await loadEmployees();
      const empId = user?.employeeId || user?.id;
      await Promise.allSettled([
        loadPayrolls(employeeList),
        loadLeaveRequests(),
        loadWfhRequests(),
        loadWarnings(),
        loadHolidays(),
        loadTimeEntries(empId),
      ]);
      if (empId) await loadNotifications(String(empId));
    } catch (e) {
      console.log('App data refresh failed', e?.message);
    }
  }, [loadEmployees, loadPayrolls, loadLeaveRequests, loadWfhRequests, loadWarnings, loadHolidays, loadNotifications, loadTimeEntries, user?.employeeId, user?.id]);

  useEffect(() => { refreshAllData(); }, [refreshAllData]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addPayroll = useCallback(async payload => {
    const body = {
      fk_employee_id: Number(payload.employeeId),
      payroll_amount: Number(payload.basic || 0) + Number(payload.allowance || 0) - Number(payload.deduction || 0),
      allowance: Number(payload.allowance || 0),
      deduction: Number(payload.deduction || 0),
      payroll_date: payload.payrollDate || new Date().toISOString().slice(0, 10),
      pay_month: payload.month,
      mode_of_payment: payload.paymentMode || 'NEFT',
      is_published: 0,
    };
    const { data } = await hrApi.post('/payrolls', body);
    await loadPayrolls(employees);
    return data;
  }, [loadPayrolls, employees]);

  const updatePayroll = useCallback(async (id, payload) => {
    const body = {
      fk_employee_id: Number(payload.employeeId),
      payroll_amount:
        Number(payload.basic || 0) +
        Number(payload.allowance || 0) -
        Number(payload.deduction || 0),
      payroll_date: payload.payrollDate,
      pay_month: payload.month,
      mode_of_payment: payload.paymentMode || 'NEFT',
      is_published: payload.isPublished ? 1 : 0,
    };
    const { data } = await hrApi.put(`/payrolls/${id}`, body);
    await loadPayrolls(employees);
    return data;
  }, [loadPayrolls, employees]);

  const deletePayroll = useCallback(async id => {
    const { data } = await hrApi.delete(`/payrolls/${id}`);
    await loadPayrolls(employees);
    return data;
  }, [loadPayrolls, employees]);

  const publishPayroll = useCallback(async id => {
    const { data } = await hrApi.post(`/payrolls/publish/${id}`);
    await loadPayrolls(employees);
    return data;
  }, [loadPayrolls, employees]);

  const updateLeaveStatus = useCallback(async (id, status) => {
    await hrApi.put(`/leave-requests/${id}/status`, { status: mapRequestStatusToApi(status), reviewed_by: 'HR Admin' });
    await loadLeaveRequests();
  }, [loadLeaveRequests]);

  const updateWfhStatus = useCallback(async (id, status) => {
    await hrApi.put(`/work-from-home/${id}/status`, { status: mapRequestStatusToApi(status), reviewed_by: 'HR Admin' });
    await loadWfhRequests();
  }, [loadWfhRequests]);

  const addWarning = useCallback(async payload => {
    const body = {
      employee_id: Number(payload.employeeId),
      employee_name: payload.employeeName,
      overall_notes: payload.reason,
      warning_types: [{ warning_type: payload.severity || 'Medium', description: payload.reason || '' }],
      created_by: 'HR Admin',
    };
    const { data } = await hrApi.post('/performance-warnings', body);
    await loadWarnings();
    return data;
  }, [loadWarnings]);

  const addLeaveRequest = useCallback(async payload => {
    const body = {
      employee_id: Number(payload.employeeId),
      employee_name: payload.employeeName,
      from_date: payload.from,
      to_date: payload.to,
      description: payload.reason || payload.type || 'Leave request',
    };
    const { data } = await hrApi.post('/leave-requests', body);
    await loadLeaveRequests();
    return data;
  }, [loadLeaveRequests]);

  const addWfhRequest = useCallback(async payload => {
    const body = {
      employee_id: Number(payload.employeeId),
      employee_name: payload.employeeName,
      from_date: payload.from,
      to_date: payload.to,
      description: payload.reason || 'Work from home request',
    };
    const { data } = await hrApi.post('/work-from-home', body);
    await loadWfhRequests();
    return data;
  }, [loadWfhRequests]);

  const markNotificationRead = useCallback(async (notificationId, employeeId) => {
    await hrApi.patch(`/notifications/${notificationId}/read`);
    await loadNotifications(employeeId);
  }, [loadNotifications]);

  const addHoliday = useCallback(async payload => {
    const body = {
      holiday_name: payload.name,
      holiday_date: payload.date,
      created_by: payload.created_by || payload.createdBy || 'HR Admin',
    };

    if (payload.description) {
      body.description = payload.description;
    }

    await hrApi.post('/holidays', body);

    // Refresh is best-effort so a temporary list fetch issue does not hide a successful save.
    try {
      await loadHolidays();
    } catch (refreshErr) {
      console.warn('Holiday refresh failed after save', refreshErr?.message);
    }
  }, [loadHolidays]);

  const deleteHoliday = useCallback(async id => {
    await hrApi.delete(`/holidays/${id}`);
    await loadHolidays();
  }, [loadHolidays]);

  const startAttendanceSession = useCallback(async employeeId => {
    const { data } = await hrApi.post('/attendance/clock-in', {
      empl_id: Number(employeeId),
      lat: 0,
      log: 0,
    });
    if (!data?.success) throw new Error(data?.message || 'Unable to start tracking');
    await loadTimeEntries(employeeId);
    return data;
  }, [loadTimeEntries]);

  const endAttendanceSession = useCallback(async employeeId => {
    const { data } = await hrApi.post('/attendance/clock-out', {
      empl_id: Number(employeeId),
      lat: 0,
      log: 0,
    });
    if (!data?.success) throw new Error(data?.message || 'Unable to end tracking');
    await loadTimeEntries(employeeId);
    return data;
  }, [loadTimeEntries]);

  // ── DATA context value — changes when data changes ─────────────────────────
  const dataValue = useMemo(() => ({
    employees,
    payrolls,
    leaveRequests,
    wfhRequests,
    warnings,
    notificationsByEmployee,
    holidays,
    timeEntries,
  }), [employees, payrolls, leaveRequests, wfhRequests, warnings, notificationsByEmployee, holidays, timeEntries]);

  // ── ACTIONS context value — stable, changes only when loaders change ────────
  const actionsValue = useMemo(() => ({
    addPayroll,
    updatePayroll,
    deletePayroll,
    publishPayroll,
    updateLeaveStatus,
    updateWfhStatus,
    addWarning,
    addLeaveRequest,
    addWfhRequest,
    markNotificationRead,
    addHoliday,
    deleteHoliday,
    refreshEmployees: loadEmployees,
    refreshPayrolls: loadPayrolls,
    refreshLeaveRequests: loadLeaveRequests,
    refreshWfhRequests: loadWfhRequests,
    refreshWarnings: loadWarnings,
    refreshNotifications: loadNotifications,
    refreshHolidays: loadHolidays,
    startAttendanceSession,
    endAttendanceSession,
    refreshTimeEntries: loadTimeEntries,
    refreshAllData,
  }), [addPayroll, updatePayroll, deletePayroll, publishPayroll, updateLeaveStatus, updateWfhStatus, addWarning, addLeaveRequest, addWfhRequest,
      markNotificationRead, addHoliday, deleteHoliday, loadEmployees, loadPayrolls,
      loadLeaveRequests, loadWfhRequests, loadWarnings, loadNotifications, loadHolidays, startAttendanceSession, endAttendanceSession, loadTimeEntries, refreshAllData]);

  return (
    <AppStoreContext.Provider value={dataValue}>
      <AppStoreActionsContext.Provider value={actionsValue}>
        {children}
      </AppStoreActionsContext.Provider>
    </AppStoreContext.Provider>
  );
}
