import { Tabs } from 'expo-router';
import { Hop as Home, Clock3, Fingerprint } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 0,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: '#29b0f9',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Absen',
          tabBarIcon: ({ size, color }) => (
            <Fingerprint size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ size, color }) => (
            <Clock3 size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
