import { Baloo2_700Bold, Baloo2_800ExtraBold, useFonts } from '@expo-google-fonts/baloo-2';
import { Nunito_500Medium, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BadgeCelebration from '@/components/BadgeCelebration';
import MusicPlayer from '@/components/MusicPlayer';
import { AppStoreProvider, useApp } from '@/store/AppStore';
import { WalkProvider } from '@/store/WalkStore';
import { C, F } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { ready } = useApp();
  const [fontsLoaded] = useFonts({ Baloo2_700Bold, Baloo2_800ExtraBold, Nunito_500Medium, Nunito_800ExtraBold });

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: C.ink,
          headerStyle: { backgroundColor: C.bg },
          headerTitleStyle: { fontFamily: F.displayMed },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="yeni-kedi" options={{ title: 'Yeni Kedi', presentation: 'modal' }} />
        <Stack.Screen name="kedi/[id]" options={{ title: '' }} />
        <Stack.Screen name="yuruyus-ozeti" options={{ title: 'Yürüyüş özeti', presentation: 'modal' }} />
      </Stack>
      <BadgeCelebration />
      <MusicPlayer />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <WalkProvider>
          <Root />
        </WalkProvider>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
