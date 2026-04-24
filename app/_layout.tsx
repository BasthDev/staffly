import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { initDatabase } from '@/lib/database';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    initDatabase().catch((error) => {
      console.error('[InitDatabase] Failed to initialize local database:', error);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Keep Android system nav bar below app content (no overlay over tabs).
    NavigationBar.setPositionAsync('relative').catch(() => {});
    NavigationBar.setBackgroundColorAsync('#FFFFFF').catch(() => {});
    NavigationBar.setButtonStyleAsync('dark').catch(() => {});
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
