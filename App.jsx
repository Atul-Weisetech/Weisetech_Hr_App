import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/state/AuthContext';
import { AppStoreProvider } from './src/state/AppStore';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>App crashed on web</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown runtime error'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppStoreProvider>
          <RootNavigator />
        </AppStoreProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#9f1239',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#111827',
  },
});
