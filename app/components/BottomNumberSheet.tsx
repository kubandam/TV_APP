// components/BottomNumberSheet.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, Pressable, StyleSheet, Text, TextInput, View, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePersistentTVConnection } from '@/src/usePersistentTVConnection';
import { RemoteKey } from '@/src/useSamsungRemoteController';

type Props = {
  visible: boolean;
  channelLabel?: string;
  defaultValue?: string;
  onSave: (value: string) => void;
  onRemove?: () => void;
  onClose: () => void;
};

export default function BottomNumberSheet({
  visible,
  channelLabel,
  defaultValue = '',
  onSave,
  onRemove,
  onClose,
}: Props) {
  const translateY = useRef(new Animated.Value(300)).current;
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);
  const { 
    isConnected,
    remoteController 
  } = usePersistentTVConnection();
  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true })
        .start(() => setTimeout(() => inputRef.current?.focus(), 50));
    } else {
      Animated.timing(translateY, { toValue: 300, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, translateY]);

  const onSwitch = () => {
    if (!isConnected) {
      Alert.alert('Nepřipojeno k TV', 'Nejprve se připojte k TV v nastavení.');
      return;
    }
    Alert.alert('Odesláno', `TV by se měla přepnout na ${channelLabel} (#${value.trim()}).`);
    remoteController.sendKey(`KEY_${value.trim()}` as RemoteKey);
    setValue('');
    onClose();
  };

  const save = () => {
    onSave(value.trim());
    setValue('');
  };

  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
          <Text style={s.title}>Přiřadit číslo kanálu (TV)</Text>
          {channelLabel ? <Text style={s.subtitle}>{channelLabel}</Text> : null}

          <View style={s.iconContainer}>
            {onSwitch && (
              <Pressable onPress={onSwitch} hitSlop={8}>
                <Ionicons name="play-circle-outline" size={30} color="green" />
              </Pressable>
            )}
            {onRemove && (
              <Pressable onPress={onRemove}>
                <Ionicons name="trash" size={26} color="#d33" />
              </Pressable>
            )}
          </View>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={setValue}
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder="Např. 12"
            style={s.input}
            onSubmitEditing={save}
          />

          <Pressable style={s.saveBtn} onPress={save}>
            <Text style={s.saveText}>Uložit</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    padding: 16, paddingBottom: 24,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  subtitle: { marginTop: 4, marginBottom: 10, fontSize: 14, color: '#444' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 18,
  },
  saveBtn: {
    marginTop: 14, backgroundColor: '#111', paddingVertical: 12,
    borderRadius: 10, alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  iconContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
});
