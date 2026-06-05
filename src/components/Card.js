import React from 'react';
import { View } from 'react-native';
import { sharedStyles } from '../styles/theme';

function Card({ children, style }) {
  return <View style={[sharedStyles.card, style]}>{children}</View>;
}

export default React.memo(Card);
