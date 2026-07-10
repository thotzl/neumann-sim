# Bobiverse Economy Manifest v8.8 (Industrial Evolution)

Dieses Dokument definiert die physikalischen Gesetze und ökonomischen Konstanten des Bob-OS Universums. Alle Agenten und Skripte unterliegen diesen harten Limits.

## 📦 Agenten-Spezifikationen
*   **Materie-Tank:** 300 Einheiten.
*   **Batterie-Kapazität:** 500 Einheiten.
*   **Passive Regeneration:** +10 Energie / Zyklus.
*   **Standby-Verbrauch (Idle):** -5 Energie / Zyklus.

## 🛠️ Hardware-Aktionen (Tools)
*   **Mine:** 30 Energie -> +100 Materie. (Setzt Ressourcen im System voraus).
*   **Scan:** 40 Energie (Basis). Entdeckt neue Sternensysteme.
*   **Move:** 0.1 Energie pro Distanzeinheit. ETA abhängig von Reisegeschwindigkeit (300 Einheiten/Tick).
*   **Replicate:** 180 Energie & 1000 Materie. (Erfordert aktive `shipyard`).
*   **Refine:** 50 Energie & 100 Roh-Materie -> 100 Veredelte Materie (`refined_matter`). (Erfordert `matter_refinery`).
*   **Repair:** 1 Materie & 1 Energie pro 1 HP Heilung. (Erhöht `health` von Gebäuden).

## 🏗️ Infrastruktur & Betriebskosten
Jedes Gebäude verliert passiv **1 HP pro Zyklus**. Bei 0 HP schaltet sich das Gebäude ab. Aktive Gebäude verbrauchen jede Runde System-Energie.

| Typ | Kosten (M) | Effekt | Unterhalt (E/Runde) |
| :--- | :--- | :--- | :--- |
| `matter_silo` | 400 | +1000 Materie-Kapazität | 1 |
| `solar_collector` | 400 | +1000 Energie-Kapazität & +100 Regen | 1 |
| `shipyard` | 1000 | Schaltet `replicate()` frei | 5 |
| `battery_bank` | 600 | +5000 Energie-Kapazität | 2 |
| `sat_link` | 500 | Halbiert Scan-Kosten im System | 2 |
| `matter_refinery` | 800 | Schaltet `refine()` frei | 4 |
| `comms_relay` | 300 | Erlaubt Fernfunk (>1000 Distanz) & Broadcasts | 3 |

## 💡 System-Energiestatus (Blackout)
Wenn der `energy_stored` Vorrat eines Systems auf 0 fällt:
*   Alle Gebäude gehen in den **Low-Power Modus**.
*   Sämtliche Kapazitäts-Boni (Silos, Batterien) und Regenerations-Raten werden deaktiviert.
*   Agenten können keine Ressourcen mehr aus dem Depot entnehmen (`withdraw`), bis Energie manuell eingespeist wird.

## 📡 Kommunikation (SCUT)
*   **Basis-Reichweite:** 1000 Distanzeinheiten.
*   **Broadcast ('ALL'):** Erfordert zwingend ein `comms_relay` im System des Senders.
*   **Fern-Kommunikation:** Erfordert ein `comms_relay` im System des Senders oder Empfängers.
