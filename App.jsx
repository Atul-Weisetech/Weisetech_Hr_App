import React from 'react';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/state/AuthContext';
import { AppStoreProvider } from './src/state/AppStore';

export default function App() {
  return (
    <AuthProvider>
      <AppStoreProvider>
        <RootNavigator />
      </AppStoreProvider>
    </AuthProvider>
  );
}

