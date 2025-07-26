import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Logo from './components/Logo';
import COLORS from './theme/colors';
import { useRouter } from 'expo-router';

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
