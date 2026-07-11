import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '../../../store/AppContext';

export default function BooksLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    />
  );
}
