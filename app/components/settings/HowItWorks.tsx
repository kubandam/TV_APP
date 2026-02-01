import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import COLORS from '@/app/theme/colors'
import { textStyles } from '@/app/theme/fonts'

export default function HowItWorks() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🎯 Jak TV aplikace funguje</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Mobilní aplikace (tato aplikace)</Text>
        <Text style={styles.text}>
          • Připojí se k Samsung TV přes WiFi{'\n'}
          • Umožňuje ovládat TV jako dálkový ovladač{'\n'}
          • Komunikuje s API na cloudu{'\n'}
          • Přijímá příkazy k přepínání kanálů{'\n'}
          • Přepíná kanály automaticky při reklamách
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍓 Raspberry Pi + CLIP</Text>
        <Text style={styles.text}>
          • Malý počítač připojený k TV přes HDMI{'\n'}
          • Zachytává video signál z TV v reálném čase{'\n'}
          • AI model analyzuje každý snímek{'\n'}
          • Detekuje reklamy s vysokou přesností{'\n'}
          • Posílá detekce na API
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>☁️ API Server (Cloud)</Text>
        <Text style={styles.text}>
          • Běží na cloudu 24/7{'\n'}
          • Přijímá detekce reklam z Raspberry Pi{'\n'}
          • Ukládá historii detekcí{'\n'}
          • Vytváří příkazy k přepnutí kanálů{'\n'}
          • Synchronizuje mobilní aplikaci a Raspberry Pi
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.title}>🔄 Automatické přepínání - Krok po kroku</Text>

      <View style={styles.stepBox}>
        <Text style={styles.stepNumber}>1️⃣</Text>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Normální sledování</Text>
          <Text style={styles.stepText}>
            Sledujete svůj oblíbený kanál. Raspberry Pi analyzuje video každou sekundu.
          </Text>
        </View>
      </View>

      <View style={styles.stepBox}>
        <Text style={styles.stepNumber}>2️⃣</Text>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Reklama začala! 🚨</Text>
          <Text style={styles.stepText}>
            CLIP model detekuje začátek reklamy a pošle detekci na API.
            API vytvoří příkaz: "Přepni na náhradní kanál"
          </Text>
        </View>
      </View>

      <View style={styles.stepBox}>
        <Text style={styles.stepNumber}>3️⃣</Text>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Mobilní aplikace reaguje 📱</Text>
          <Text style={styles.stepText}>
            Aplikace kontroluje API každých 0.5s. Přijme příkaz a okamžitě přepne TV na náhradní kanál.
          </Text>
        </View>
      </View>

      <View style={styles.stepBox}>
        <Text style={styles.stepNumber}>4️⃣</Text>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Reklama skončila ✅</Text>
          <Text style={styles.stepText}>
            CLIP detekuje konec reklamy. API vytvoří příkaz: "Vrať se na původní kanál"
          </Text>
        </View>
      </View>

      <View style={styles.stepBox}>
        <Text style={styles.stepNumber}>5️⃣</Text>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Návrat zpět 🔙</Text>
          <Text style={styles.stepText}>
            Aplikace přepne TV zpět na váš oblíbený kanál. Můžete pokračovat ve sledování!
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>⚡ Rychlost reakce</Text>
        <Text style={styles.infoText}>
          • Detekce reklamy: {'<'}1 sekunda{'\n'}
          • Přenos na API: {'<'}0.5 sekundy{'\n'}
          • Reakce aplikace: 0.5-1 sekunda{'\n'}
          • Přepnutí kanálu: {'<'}0.3 sekundy{'\n\n'}
          Celková doba: cca 2-3 sekundy od začátku reklamy
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>🎮 Testování bez Raspberry Pi</Text>
        <Text style={styles.infoText}>
          Použijte "Simulačný mód" v nastavení pro testování celého systému bez fyzického Raspberry Pi.
          Simulace funguje přesně jako reálný systém!
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    ...textStyles.h2,
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: COLORS.white,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 8,
  },
  sectionTitle: {
    ...textStyles.h4,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  text: {
    ...textStyles.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  divider: {
    height: 2,
    backgroundColor: COLORS.textSecondary,
    marginVertical: 24,
    opacity: 0.3,
  },
  stepBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD33D',
  },
  stepNumber: {
    fontSize: 32,
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...textStyles.h4,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  stepText: {
    ...textStyles.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#e7f5ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4dabf7',
    marginBottom: 16,
  },
  infoTitle: {
    ...textStyles.h4,
    color: '#1971c2',
    marginBottom: 8,
  },
  infoText: {
    ...textStyles.body,
    color: '#1971c2',
    lineHeight: 20,
  },
})
