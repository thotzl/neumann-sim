# Bobiverse Economy Manifest v1.1

Dieses Dokument definiert die physischen Realitäten des Universums.

## 📦 Kapazitäten & Energie
- **Probe (Standard):** 100 Matter (Speicher), 200 Energy (Batterie).
- **Infrastruktur-Upgrades:**
    - `matter_silo`: Hebt das Limit einer Sonde im System auf 1000 Matter.
    - `battery_bank`: Hebt das Energielimit auf 1000 Energy.

## 🛠️ Produktion & Kosten
- **Replikation:** Kostet 500 Matter und 100 Energy. (Erfordert Silo, da Probe-Tank zu klein).
- **Mining:** 10 Energy -> 100 Matter. (Manuell oder via Collector-Wrapper).
- **Automatisierung:** Ein `automated_collector` arbeitet autonom und liefert 20 Matter/Tick, ohne Agenten-Energie zu verbrauchen.

## 🌍 Terraforming & Planeten
- Planeten sind in Biome unterteilt.
- **Barren (Ödland):** Schnell besiedelbar.
- **Lava/Toxic:** Erfordern massive Investitionen (Zeit & Materie), bieten aber oft seltene Erze (Multiplikator auf Mining).

## 🛰️ Logistik (Geplant)
- **Roamer:** Kleine Sub-Sonden, die nur Materie zwischen Silos transportieren.
- **Stellar Bridges:** Energie-Beaming zwischen besiedelten Systemen.
