import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import COLORS from '@/app/theme/colors'
import { textStyles } from '@/app/theme/fonts'

import HowItWorks from './components/settings/HowItWorks'
import SupportedTV from './components/settings/SupportedTV'
import ConnectionStatus from './components/settings/ConnectionStatus'
import SignOut from './components/settings/SignOut'
import TestingApp from './components/settings/TestingApp'
import AdSwitchSettings from './components/settings/AdSwitchSettings'
import SimulationMode from './components/settings/SimulationMode'
import { Ionicons } from '@expo/vector-icons'
import { useTVConnection } from '@/src/TVConnectionContext'

type MenuItem = {
  key: string
  title: string
  label: string
  component: React.FC
  showOnlyInSimulation?: boolean
}

const TITLE = 'Nastavení'
const ALL_MENU: MenuItem[] = [
  { key: 'how', title: 'Jak TV aplikace funguje', label: 'Jak aplikace funguje', component: HowItWorks },
  { key: 'supported', title: 'Seznam schválených TV', label: 'Na jaké TV aplikace funguje', component: SupportedTV },
  { key: 'connection', title: 'Nastavení připojení k TV', label: 'Propojeno / Nepropojeno s TV', component: ConnectionStatus },
  { key: 'adswitch', title: 'Přepínání při reklamách', label: 'Přepínání při reklamách', component: AdSwitchSettings },
  { key: 'simulation', title: 'Simulačný mód', label: '🎮 Simulačný mód (testovanie)', component: SimulationMode },
  { key: 'signout', title: 'Odhlásit členství', label: 'Odhlásit členství', component: SignOut },
  { key: 'testing', title: 'Testovací aplikace', label: 'Testovací aplikace', component: TestingApp },
]

export default function Settings() {
  const router = useRouter()
  const { simulationMode } = useTVConnection()
  const [active, setActive] = useState<string | null>(null)
  
  // Filter menu based on simulation mode
  const MENU = React.useMemo(() => {
    return ALL_MENU.filter(item => {
      if (item.showOnlyInSimulation) {
        return simulationMode
      }
      return true
    })
  }, [simulationMode])

  // Find the active component
  const ActiveComponent = active
    ? MENU.find(item => item.key === active)?.component!
    : null

  let title = TITLE
  if (active) {
    title = MENU.find(item => item.key === active)?.title || TITLE
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity 
          onPress={() => {
            if (active) setActive(null)
            else router.back()
          }}
          style={styles.headerLeft}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={40} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.tvBox}>
          <Text style={styles.tvText}>TV</Text>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>

      {ActiveComponent ? (
        <ActiveComponent />
      ) : (
        <FlatList
          data={MENU}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          style={styles.menuList}
        />
      )}
    </View>
  )

  function renderItem({ item }: ListRenderItemInfo<MenuItem>) {
    return (
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => setActive(item.key)}
      >
        <View style={styles.menuItemContent}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} style={styles.forward} />
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
    paddingHorizontal: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginRight: 30,
  },
  headerLeft: {
    height: 60,
    justifyContent: 'center',
    paddingRight: 20,
  },
  tvBox: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  tvText: {
    ...textStyles.h2,
    color: COLORS.textPrimary,
  },
  title: {
    ...textStyles.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginVertical: 15,
  },
  menuList: {
    flexGrow: 0,
  },
  menuItem: {
    paddingVertical: 4,
  },
  menuLabel: {
    ...textStyles.h3,
    color: COLORS.textSecondary,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',  
  },
  forward: {
    marginLeft: 'auto',
  },
})
