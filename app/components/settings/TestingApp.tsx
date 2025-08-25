import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';
import ChannelButton from '@/app/components/ChannelButton';
import { loadSelectedChannels } from '@/app/storage/channels';
import { usePersistentTVConnection } from '@/src/usePersistentTVConnection';

type SavedRaw = {
  id?: string;
  label: string;
  appOrder?: number;
  index?: number;
  tvNumber?: number;
};
type Saved = {
  id: string;
  label: string;
  appOrder?: number;
  tvNumber?: number;
};

const STEP_SECONDS = 10;

export default function TestingApp() {
  const [available, setAvailable] = useState<Saved[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { isConnected, connectedTVName, connectedTVIP, refreshConnectionState, remoteController, runChannelTest } = usePersistentTVConnection();
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0: → first, 1: → second, 2: → back to first
  const [seconds, setSeconds] = useState(STEP_SECONDS);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // load only channels with tvNumber
  useEffect(() => {
    (async () => {
      const raw = (await loadSelectedChannels()) as SavedRaw[] | undefined;
      const normalized: Saved[] = (raw ?? [])
        .map((c, i) => ({
          id: c.id ?? c.label,
          label: c.label,
          appOrder:
            typeof c.appOrder === 'number'
              ? c.appOrder
              : typeof c.index === 'number'
              ? c.index
              : i + 1,
          tvNumber: typeof c.tvNumber === 'number' ? c.tvNumber : undefined,
        }))
        .filter(c => typeof c.tvNumber === 'number' && c.tvNumber! > 0)
        .sort((a, b) => (a.appOrder ?? 0) - (b.appOrder ?? 0));
      setAvailable(normalized);
    })();
  }, []);

  const togglePick = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id]; // replace oldest
    });
  }, []);

  const selected = useMemo(
    () => available.filter(c => selectedIds.includes(c.id)),
    [available, selectedIds],
  );

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    setSeconds(STEP_SECONDS);
    tickerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s > 1) return s - 1;
        // step boundary
        setPhase(p => {
          const nextPhase = (p + 1) as 0 | 1 | 2;
          if (nextPhase >= 3) {
            // Stop ticker after final phase
            setTimeout(() => stopTicker(), 1000);
            // wait 1s, then close modal
            setTimeout(() => cancelTest(), 1000);
          }
          return nextPhase;
        });
        return STEP_SECONDS;
      });
    }, 1000);
  }, [stopTicker]);

  const runTest = useCallback(() => {
    if (selected.length !== 2) return;
    if (!remoteController.isConnected) {
      Alert.alert('Nejste připojeni', 'Nejprve se prosím připojte k TV.');
      return;
    }
    // start controller's timers (4-step version: original → first → second → original)
    runChannelTest(selected[0].tvNumber!, selected[1].tvNumber!, STEP_SECONDS);
    // open interactive modal countdown
    setPhase(0);
    setModalOpen(true);
    startTicker();
  }, [selected, remoteController, startTicker]);

  const cancelTest = useCallback(() => {
    stopTicker();
    setModalOpen(false);
  }, [remoteController, stopTicker]);

  // compute "what's next" per phase
  const nextLabel = useMemo(() => {
    if (selected.length < 2) return '';
    if (phase === 0) return `${selected[0].label} (#${selected[0].tvNumber})`;
    if (phase === 1) return `${selected[1].label} (#${selected[1].tvNumber})`;
    if (phase === 2) return `${selected[0].label} (#${selected[0].tvNumber})`;
    return 'Konec testu';
  }, [phase, selected]);

  // auto-close when phase reaches the end
  useEffect(() => {
    if (phase === 2 && modalOpen) {
      // Wait for the ticker to complete the full cycle, then close
      const t = setTimeout(() => cancelTest(), (STEP_SECONDS + 1) * 1000);
      return () => clearTimeout(t);
    }
  }, [phase, modalOpen, cancelTest]);

  // pick-order badges (UI only)
  const pickOrderById = useMemo<Record<string, number>>(
    () =>
      selectedIds.reduce(
        (acc, id, i) => ((acc[id] = i + 1), acc),
        {} as Record<string, number>,
      ),
    [selectedIds],
  );


  return (
    <View style={styles.container}>
            {/* Connection status indicator */}
      <View style={styles.connectionStatus}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isConnected ? '#29a329' : '#d9534f',
            },
          ]}
        />
        <Text style={styles.statusText}>
          {isConnected 
            ? `Připojeno k ${connectedTVName || connectedTVIP}`
            : 'Nepřipojeno k TV'
          }
        </Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => {
            refreshConnectionState();
          }}
        >
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.stepsBox}>
        <Text style={styles.step}>
          1. Vyber dvě TV stanice (z těch, které mají přiřazené číslo).
        </Text>
        <Text style={styles.step}>2. Za 2 s se přepne na první vybranou stanici.</Text>
        <Text style={styles.step}>3. Za dalších 2 s se přepne na druhou stanici.</Text>
        <Text style={styles.step}>
          4. Za 2 s se vrátí na první stanici.
        </Text>
      </View>

      <Text style={styles.listTitle}>Stanice s přiřazeným číslem</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {available.map(ch => (
          <ChannelButton
            key={ch.id}
            label={ch.label}
            selected={selectedIds.includes(ch.id)}
            appOrder={pickOrderById[ch.id]} // show pick order
            tvNumber={ch.tvNumber}
            onPress={() => togglePick(ch.id)}
          />
        ))}
        {available.length === 0 && (
          <Text style={styles.empty}>
            Zatím nemáš žádné stanice s přiřazeným TV číslem.
          </Text>
        )}
      </ScrollView>


      {selectedIds.length === 2 && (
        <TouchableOpacity
          style={styles.bigButton}
          onPress={runTest}
          activeOpacity={0.85}
        >
          <Text style={styles.bigButtonText}>
            Spustit test ({selected[0]?.label} → {selected[1]?.label})
          </Text>
        </TouchableOpacity>
      )}

      {/* Interactive modal with live countdown */}
      <Modal
        transparent
        visible={modalOpen}
        animationType="fade"
        onRequestClose={cancelTest}
      >
        <Pressable style={styles.scrim} onPress={cancelTest} />
        <View style={styles.sheet}>
          <Text style={styles.modalTitle}>Probíhá test</Text>
          <Text style={styles.modalLine}>Další: {nextLabel}</Text>
          <Text style={styles.modalCountdown}>Přepnutí za: {seconds}s</Text>

          {/* simple progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((STEP_SECONDS - seconds) / STEP_SECONDS) * 100}%`,
                },
              ]}
            />
          </View>

          <TouchableOpacity style={styles.okBtn} onPress={cancelTest}>
            <Text style={styles.okText}>OK (zrušit test)</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 16,
  },
  stepsBox: {
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    marginTop: -15,
  },
  step: { ...textStyles.body, color: COLORS.textPrimary, marginBottom: 6 },
  listTitle: {
    ...textStyles.h3,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginVertical: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 110,
  },
  empty: {
    ...textStyles.body,
    color: COLORS.textPrimary,
    opacity: 0.8,
    marginTop: 8,
  },

  bigButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigButtonText: { ...textStyles.h4, color: '#fff', textAlign: 'center' },

  // modal
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  modalTitle: { ...textStyles.h3, color: COLORS.textPrimary, marginBottom: 6 },
  modalLine: {
    ...textStyles.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modalCountdown: {
    ...textStyles.h3,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginVertical: 6,
  },
  progressTrack: {
    height: 8,
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: '100%', backgroundColor: '#111' },
  okBtn: {
    marginTop: 12,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  okText: { ...textStyles.bodyBold, color: '#fff' },
  volumeCard: {
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  volumeTitle: { ...textStyles.h3, color: COLORS.textPrimary, marginBottom: 8 },
  volumeRow: { flexDirection: 'row', gap: 10 },
  volBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volBtnDisabled: { backgroundColor: '#9E9E9E' },
  volText: { ...textStyles.h3, color: '#fff' },
  volHint: {
    ...textStyles.caption,
    color: COLORS.textPrimary,
    marginTop: 8,
    opacity: 0.8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { ...textStyles.body, color: COLORS.textPrimary, flex: 1 },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshButtonText: {
    fontSize: 16,
  },
});
