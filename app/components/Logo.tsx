import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';

export default function Logo() {
  return (
    // <Image
    //   source={require('@/app/assets/logo.png')}
    //   style={styles.logo}
    //   resizeMode="contain"
    // />
    <Text style={styles.logo}>LOGO</Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    color: 'white',
    fontSize: 52,
    fontWeight: 'medium',
  },
});
