import React, { createContext, useCallback, useMemo, useState } from 'react';
import {
  initialLeaveRequests,
  initialPayrolls,
  initialWarnings,
  initialWfhRequests,
} from '../data/mockData';

export const AppStoreContext = createContext(null);

// Central app store using mock data (swap hrApi calls in here when backend is ready).
export function AppStoreProvider({ children }) {
  const [payrolls, setPayrolls] = useState(initialPayrolls);
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);
  const [wfhRequests, setWfhRequests] = useState(initialWfhRequests);
  const [warnings, setWarnings] = useState(initialWarnings);

  const addPayroll = useCallback(payload => {
    const created = { id: `PAY-${Date.now()}`, ...payload };
    setPayrolls(prev => [created, ...prev]);
    return created;
  }, []);

  const updateLeaveStatus = useCallback((id, status) => {
    setLeaveRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
  }, []);

  const updateWfhStatus = useCallback((id, status) => {
    setWfhRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
  }, []);

  const addWarning = useCallback(payload => {
    const created = { id: `WARN-${Date.now()}`, ...payload };
    setWarnings(prev => [created, ...prev]);
    return created;
  }, []);

  // Employee-side: submit own leave request
  const addLeaveRequest = useCallback(payload => {
    const created = { id: `LR-${Date.now()}`, status: 'Pending', ...payload };
    setLeaveRequests(prev => [created, ...prev]);
    return created;
  }, []);

  // Employee-side: submit own WFH request
  const addWfhRequest = useCallback(payload => {
    const created = { id: `WFH-${Date.now()}`, status: 'Pending', ...payload };
    setWfhRequests(prev => [created, ...prev]);
    return created;
  }, []);

  const value = useMemo(
    () => ({
      payrolls,
      leaveRequests,
      wfhRequests,
      warnings,
      addPayroll,
      updateLeaveStatus,
      updateWfhStatus,
      addWarning,
      addLeaveRequest,
      addWfhRequest,
    }),
    [
      payrolls,
      leaveRequests,
      wfhRequests,
      warnings,
      addPayroll,
      updateLeaveStatus,
      updateWfhStatus,
      addWarning,
      addLeaveRequest,
      addWfhRequest,
    ],
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}
