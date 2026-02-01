import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';
import { useTVConnection } from '@/src/TVConnectionContext';

/**
 * Floating notification that shows channel switches without blocking UI
 */
export default function ChannelSwitchNotification() {
  const { lastChannelSwitch } = useTVConnection();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (lastChannelSwitch) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Auto fade out after 2.5 seconds
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2500);
    } else {
      // Reset animations when notification is cleared
      fadeAnim.setValue(0);
      slideAnim.setValue(-100);
    }
  }, [lastChannelSwitch]);

  if (!lastChannelSwitch) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>📺</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Prepínam kanál</Text>
          <Text style={styles.channel}>Kanál {lastChannelSwitch.channel}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    zIndex: 1000,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFD33D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...textStyles.h4,
    color: COLORS.white,
    marginBottom: 2,
  },
  channel: {
    ...textStyles.body,
    color: '#FFD33D',
    fontWeight: 'bold',
  },
});
