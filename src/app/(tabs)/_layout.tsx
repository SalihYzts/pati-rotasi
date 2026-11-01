import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useApp } from '@/store/AppStore';
import { C, F } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon =
  (on: IconName, off: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => <Ionicons name={focused ? on : off} size={24} color={color as string} />;

export default function TabLayout() {
  const { state } = useApp();
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.inkSoft,
        tabBarStyle: { backgroundColor: '#FFFBF5', borderTopColor: C.line, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: F.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Harita', tabBarIcon: icon('map', 'map-outline') }} />
      <Tabs.Screen name="hareket" options={{ title: 'Hareket', tabBarIcon: icon('footsteps', 'footsteps-outline') }} />
      <Tabs.Screen name="koleksiyon" options={{ title: 'Kediler', tabBarIcon: icon('albums', 'albums-outline') }} />
      <Tabs.Screen name="mama" options={{ title: 'Mama', tabBarIcon: icon('heart', 'heart-outline') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('paw', 'paw-outline') }} />
    </Tabs>
  );
}
