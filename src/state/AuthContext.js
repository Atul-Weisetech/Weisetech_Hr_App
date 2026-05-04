import React, { createContext, useMemo, useState } from 'react';
import hrApi from '../api/hrApi';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = async ({ email, password }) => {
    setIsLoading(true);
    try {
      const { data } = await hrApi.post('/login', { email, password });
      const apiUser = data?.user || {};
      const employee = data?.employee || null;
      const role = data?.role || 'employee';

      let resolvedEmployeeId = employee?.id || apiUser?.fk_employee_id || null;
      let resolvedName =
        [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') ||
        apiUser?.username ||
        apiUser?.email_address ||
        email;
      let resolvedDesignation = employee?.designation || apiUser?.designation || '';

      // Fallback: if backend login response has no employee object, resolve by email.
      if (!resolvedEmployeeId && apiUser?.email_address) {
        try {
          const { data: employeeList } = await hrApi.get(
            '/employees?includeInactive=true&includeHR=true',
          );
          const rows = Array.isArray(employeeList) ? employeeList : [];
          const match = rows.find(
            e =>
              String(e.email_address || '').toLowerCase() ===
              String(apiUser.email_address || '').toLowerCase(),
          );
          if (match) {
            resolvedEmployeeId = match.employee_id ?? match.id ?? null;
            resolvedName =
              [match.first_name, match.last_name].filter(Boolean).join(' ') ||
              resolvedName;
            resolvedDesignation = match.designation || resolvedDesignation;
          }
        } catch (e) {
          console.log('Employee fallback resolution failed', e?.message);
        }
      }

      const normalizedUser = {
        id: resolvedEmployeeId || apiUser?.id,
        name: resolvedName,
        email: apiUser?.email_address || email,
        role: role === 'admin' || role === 'hr' ? 'admin' : 'employee',
        employeeId: resolvedEmployeeId,
        designation: resolvedDesignation,
      };

      setUser(normalizedUser);
      return { ok: true, user: normalizedUser };
    } catch (error) {
      const isNetworkError =
        !error?.response &&
        (String(error?.message || '').toLowerCase().includes('network') ||
          String(error?.code || '').toLowerCase().includes('network'));
      const message =
        (isNetworkError
          ? `Cannot reach backend server (${error?.message || 'network error'}). Current API: ${hrApi.defaults.baseURL}. Check src/api/hrApi.js.`
          : null) ||
        (error?.response
          ? `Login failed (${error.response.status}). ${error?.response?.data?.error || error?.response?.data?.message || 'Server rejected login request.'}`
          : null) ||
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Login failed. Please check your credentials.';
      return { ok: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isSignedIn: !!user,
      signIn,
      signOut: () => setUser(null),
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
