import {
  Literata_300Light,
  Literata_400Regular,
  Literata_500Medium,
  Literata_600SemiBold,
  useFonts,
} from '@expo-google-fonts/literata';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '../components/Toast';
import { AccountProvider } from '../store/AccountContext';
import { AppProvider, useApp } from '../store/AppContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { ready, theme } = useApp();
  const [fontsLoaded] = useFonts({
    Literata_300Light,
    Literata_400Regular,
    Literata_500Medium,
    Literata_600SemiBold,
  });

  const booted = ready && fontsLoaded;

  useEffect(() => {
    if (booted) SplashScreen.hideAsync().catch(() => {});
  }, [booted]);

  if (!booted) return null;

  return (
    <ToastProvider>
      <AccountProvider>
        <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} animated />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reading/[bookId]/[chapter]" />
          <Stack.Screen name="profile" />
        </Stack>
      </AccountProvider>
    </ToastProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
