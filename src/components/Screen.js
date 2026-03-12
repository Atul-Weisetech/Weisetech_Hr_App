import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function Screen({ children, style }) {
  return <View style={[styles.root, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
});

