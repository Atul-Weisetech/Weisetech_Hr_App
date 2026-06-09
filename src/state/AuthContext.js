import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import hrApi from '../api/hrApi';

const SESSION_KEY = '@hr_app_session';

export const AuthContext = createContext(null);

function normalizeRoleFromApi({ role, userRole }) {
  const roleByUserRole = {
    0: 'admin',
    1: 'hr',
    2: 'employee',
  };

  const parsedUserRole = Number(userRole);
  if (Number.isInteger(parsedUserRole) && roleByUserRole[parsedUserRole]) {
    return {
      role: roleByUserRole[parsedUserRole],
      userRole: parsedUserRole,
    };
  }

  const roleText = String(role || '').toLowerCase();
  if (roleText === 'admin') return { role: 'admin', userRole: 0 };
  if (roleText === 'hr') return { role: 'hr', userRole: 1 };
  return { role: 'employee', userRole: 2 };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true); // true until AsyncStorage is checked

  // On mount: restore session from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then(raw => {
        if (raw) {
          try {
            setUser(JSON.parse(raw));
          } catch {
            AsyncStorage.removeItem(SESSION_KEY);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsRestoring(false));
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    setIsLoading(true);
    try {
      const { data } = await hrApi.post('/login', { email, password });
      const apiUser = data?.user || {};
      const employee = data?.employee || null;
      const { role, userRole } = normalizeRoleFromApi({
        role: data?.role,
        userRole: apiUser?.user_role,
      });

      let resolvedEmployeeId = employee?.id || apiUser?.fk_employee_id || null;
      let resolvedName =
        [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') ||
        apiUser?.username ||
        apiUser?.email_address ||
        email;
      let resolvedDesignation = employee?.designation || apiUser?.designation || '';

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
        role,
        userRole,
        isPrivileged: role === 'admin' || role === 'hr',
        employeeId: resolvedEmployeeId,
        designation: resolvedDesignation,
      };

      // Persist session
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return { ok: true, user: normalizedUser };
    } catch (error) {
      const status = error?.response?.status;
      const serverMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        null;

      let message;
      if (!error?.response) {
        message = 'Unable to connect. Please check your internet connection and try again.';
      } else if (status === 401) {
        message = serverMsg || 'Incorrect email or password.';
      } else if (status === 403) {
        message = serverMsg || 'Your account is not authorized to access this app.';
      } else if (status === 404) {
        message = serverMsg || 'Account not found. Please check your email.';
      } else if (status >= 500) {
        message = 'Server error. Please try again later.';
      } else {
        message = serverMsg || 'Login failed. Please check your credentials.';
      }
      return { ok: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isRestoring, isSignedIn: !!user, signIn, signOut }),
    [user, isLoading, isRestoring, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
