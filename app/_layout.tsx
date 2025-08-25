import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from './hooks/useFonts';
import { View, ActivityIndicator } from 'react-native';
import COLORS from './theme/colors';
import { TVConnectionProvider } from '@/src/TVConnectionContext';

export default function Layout() {
  const { fontsLoaded, fontError } = useFonts();

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.textPrimary} />
      </View>
    );
  }

  return (
    <TVConnectionProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          initialRouteName="index"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="findTVs" />
          <Stack.Screen name="channel-control" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="list" />
          <Stack.Screen name="tv-connection" />
          <Stack.Screen name="samsung-remote-demo" />
        </Stack>
      </GestureHandlerRootView>
    </TVConnectionProvider>
  );
}
