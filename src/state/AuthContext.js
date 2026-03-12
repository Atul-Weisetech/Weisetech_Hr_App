import React, { createContext, useMemo, useState } from 'react';

export const AuthContext = createContext(null);

// Mock auth state (no backend).
// user shape: { id, name, email, role: 'admin' | 'employee' }
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const value = useMemo(
    () => ({
      user,
      isSignedIn: !!user,
      signIn: (userData) => setUser(userData),
      signOut: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

