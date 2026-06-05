import React from 'react';
import { View } from 'react-native';
import { sharedStyles } from '../styles/theme';

function Screen({ children, style }) {
  return <View style={[sharedStyles.screen, style]}>{children}</View>;
}

export default React.memo(Screen);
