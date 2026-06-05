import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { sharedStyles } from '../styles/theme';

export default function PrimaryButton({ title, onPress, variant = 'primary' }) {
  return (
    <TouchableOpacity
      style={[
        sharedStyles.primaryButton,
        variant === 'danger' && sharedStyles.dangerButton,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={sharedStyles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}
