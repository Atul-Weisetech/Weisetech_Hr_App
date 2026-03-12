import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function PrimaryButton({ title, onPress, variant = 'primary' }) {
  return (
    <TouchableOpacity
      style={[styles.button, variant === 'danger' && styles.danger]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  text: {
    color: '#ffffff',
    fontWeight: '800',
  },
});

