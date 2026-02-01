# 🎮 Simulačný mód - Test prepínania kanálov

## Čo to je?

Simulačný mód umožňuje **testovať automatické prepínanie kanálov bez Raspberry Pi**.

Aplikácia sa správa, ako keby bola pripojená na TV a prepína kanály na základe príkazov z API.

## Ako to použiť?

### 1. Zapnite simulačný mód

V aplikácii:
1. Otvorte **Nastavenia** (⚙️)
2. Zvoľte **Simulačný mód (testovanie)**
3. Zapnite prepínač **Simulačný mód**

### 2. Nastavte konfiguráciu

Pred testovaním nastavte:

1. **Nastavenia** → **Přepínání při reklamách**
2. Nastavte **Náhradní kanál** (napr. `2`)
3. Zapnite **Automatické přepínání**
4. Na hlavnej obrazovke prepnite na nejaký kanál (napr. `1`)

### 3. Spustite test

1. **Nastavenia** → **Testovanie** → **Test prepínania**
2. Stlačte tlačidlo **🚨 REKLAMA ZAČALA**
3. Sledujte, ako sa kanál zmení na fallback kanál
4. Stlačte **✅ REKLAMA SKONČILA**
5. Sledujte, ako sa kanál vráti na pôvodný

## Ako to funguje?

```
1. Tlačidlo → Pošle POST /v1/ad-results na API
2. API vytvorí príkaz switch_channel
3. Mobil polluje príkazy (každých 500ms)
4. Mobil dostane príkaz
5. Mobil prepne kanál (v simulácii zobrazí alert, v reále prepne TV)
6. Mobil pošle ACK späť na API
```

## Čo vidíte v logoch?

- **🌐** - Odoslanie na API
- **📥** - Prijatý príkaz z API
- **📺** - Prepnutie kanála
- **ℹ️** - Informácie

## Častý postup testovania

1. Nastavte fallback_channel = `2`
2. Prepnite na kanál `1`
3. Kliknite **🚨 REKLAMA ZAČALA**
4. Do 1 sekundy by ste mali vidieť prepnutie na kanál `2`
5. Kliknite **✅ REKLAMA SKONČILA**
6. Do 1 sekundy by ste mali vidieť prepnutie späť na kanál `1`

## Reálne nasadenie (s Raspberry Pi)

Keď všetko funguje v simulácii:

1. Vypnite simulačný mód
2. Pripojte sa na skutočnú TV (WebSocket)
3. Raspberry Pi s CLIP bude posielať detekcie namiesto simulácie
4. Systém funguje úplne rovnako, len namiesto manuálnych tlačidiel deteguje CLIP reklamy automaticky

---

**Poznámka:** Simulačný mód testuje **iba prepínanie kanálov na základe API príkazov**. Neemuluje CLIP detekciu ani Raspberry Pi - to je v samostatnom systéme.
