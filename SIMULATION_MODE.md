# 🎮 Simulačný mód

## Čo to je?

Simulačný mód umožňuje **testovať automatické prepínanie kanálov bez Raspberry Pi**.

Keď je zapnutý, aplikácia polluje príkazy z API a vykonáva ich automaticky.

## Ako to použiť?

### 1. Zapnite simulačný mód

1. Otvorte **Nastavenia** (⚙️)
2. Zvoľte **Simulačný mód**
3. Zapnite prepínač

### 2. Sledujte log príkazov

V tej istej sekcii uvidíte **Log príkazov** - posledných 10 príkazov, ktoré aplikácia prijala a vykonala.

Každý záznam obsahuje:
- **Čas** - kedy sa príkaz vykonal
- **Typ** - aká akcia (📺 prepnutie kanála, 📥 prijatý príkaz, atď.)
- **Správa** - čo sa stalo

### 3. Testovanie

Pre testovanie môžete:
1. Otvoriť API monitor na https://tv-bridge-api-ih76.onrender.com/monitor
2. Manuálne vytvoriť príkaz (napr. simulovať začiatok/koniec reklamy)
3. Sledovať v aplikácii v logu, ako sa príkaz vykonal

## Ako to funguje?

```
1. API vytvorí príkaz (switch_channel) keď deteguje reklamu
2. Aplikácia polluje príkazy každých 500ms
3. Dostane príkaz → prepne kanál
4. Zapíše do logu čo sa stalo
```

## Vypnutie simulácie

Keď vypnete simulačný mód:
- Aplikácia prestane volať API príkazy
- Log sa vymaže
- Všetko sa vráti do normálneho stavu

---

**Poznámka:** Simulačný mód sa správa presne ako reálne pripojenie na TV, len zobrazuje výsledky v logu namiesto skutočného prepínania TV.
