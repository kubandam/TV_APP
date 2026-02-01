// components/TVConnectionTest.tsx
import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';

// URL tvojho API, ktoré posiela príkazy TV
const API_BASE = '192.168.68.103:8001';

export default function TVConnectionTest() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus('Testujem pripojenie...');
    try {
      // 1. Otestuj handshake s TV
      const res = await fetch(`${API_BASE}/ping`);
      if (!res.ok) throw new Error('Ping zlyhal');
      setStatus('Pripojené k TV ✔');

      // 2. Ulož pôvodný kanál
      const current = await fetch(`${API_BASE}/getChannel`).then(r => r.json());
      const originalChannel = current.channel;
      setStatus(`Aktuálny kanál: ${originalChannel}`);

      // 3. Prepnúť na testovací kanál
      await fetch(`${API_BASE}/setChannel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 5 }) // testovací kanál
      });
      setStatus('Prepnuté na testovací kanál. Čakám 10s...');
      await new Promise(res => setTimeout(res, 10000));

      // 4. Vrátiť späť na pôvodný kanál
      await fetch(`${API_BASE}/setChannel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: originalChannel })
      });``
      setStatus('Vrátené na pôvodný kanál ✔');
    } catch (err: any) {
      setStatus(`Chyba: ${err.message}`);
      console.log(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test pripojenia k TV</Text>
      {loading && <ActivityIndicator size="large" />}
      {status && <Text style={styles.status}>{status}</Text>}
      <Button title="Spustiť test" onPress={testConnection} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  status: { marginVertical: 10, textAlign: 'center' }
});
