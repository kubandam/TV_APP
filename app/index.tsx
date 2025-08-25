import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Logo from './components/Logo';
import COLORS from './theme/colors';
import { useRouter } from 'expo-router';

// 192.168.63.103
export default function SplashScreen() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/home');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Logo />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.splashBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
