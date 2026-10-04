import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { initDatabase } from '@/lib/database';
import UpdatePopup from '../components/UpdatePopup';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    initDatabase().catch((error) => {
      console.error('[InitDatabase] Failed to initialize local database:', error);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Hide native Android navigation bar so only the app Tab Navigator is visible
    async function hideSystemNavBar() {
      try {
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        await NavigationBar.setVisibilityAsync('hidden');
      } catch {
        // fallback
      }
    }
    hideSystemNavBar();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        hideSystemNavBar();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <UpdatePopup />
      <StatusBar style="dark" />
    </>
  );
}
