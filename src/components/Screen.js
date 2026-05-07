import React from 'react';
import { StyleSheet, View } from 'react-native';

function Screen({ children, style }) {
  return <View style={[styles.root, style]}>{children}</View>;
}

export default React.memo(Screen);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
});
