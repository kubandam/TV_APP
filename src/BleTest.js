import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, Text, View } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const BleTest = () => {
  const manager = new BleManager();

  useEffect(() => {
    async function startScan() {
      console.log('Starting scan');
      // On Android, request location permission for BLE scanning
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
      }
      console.log('manager', manager);
      // Begin scanning
      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.warn('Scan error:', error);
          return;
        }
        // Look for your TV by name prefix (adjust to your model)
        if (device.name?.startsWith('Samsung')) {
          console.log('Found TV:', device.id, device.name);
          manager.stopDeviceScan();

          // Try to connect
          device.connect()
            .then((d) => {
              console.log('Connected to', d.name);
              return d.discoverAllServicesAndCharacteristics();
            })
            .then((d) => d.services())
            .then((services) => {
              console.log('Discovered services:', services.map(s => s.uuid));
            })
            .catch((err) => console.warn('Connection error:', err));
        }
      });
    }

    startScan();

    // Clean up on unmount
    return () => manager.destroy();
  }, [manager]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Scanning for Samsung TV… Check your Metro/logcat console.</Text>
    </View>
  );
};

export default BleTest;
