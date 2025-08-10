import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  return (
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
    </Stack>
    </GestureHandlerRootView>
  );
}
