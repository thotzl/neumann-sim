# 🛸 Bob-OS V14.0: Sonden-Waffensysteme & Ballistik (Konzept)

Dieses Dokument dient als architektonische und physikalische Blaupause für die zukünftige Implementierung einer taktischen Kampfschicht in Bob-OS. Um Over-Engineering zu vermeiden, trennen wir sauber zwischen **Sektor-Direktschüssen (0-Tick)** und **interstellarer strategischer Belagerung (Multi-Tick-Transit)**.

---

## I. Die Reichweiten- & Tracking-Hierarchie (Physisches Schießen)

```
                            [THE RANGE SPECTRUM]
                                     |
       +-----------------------------+-----------------------------+
       |                                                           |
LOCAL / SYSTEM COMBAT (Guided & Instant)               INTERSTELLAR SIEGE (Extreme Long-Range)
- Laser (Nahbereich / Instant)                         - Raketen / Missiles (Ganz weit weg)
- Railgun (Scharfschütze / Instant)                    - Multi-Round Travel between Systems
- Torpedo & Brecher (Guided / Target Tracking)         - Direct Sector Depot & Infrastructure Siege
```

### 1. Lokaler Sektor-Kampf (Direct-Hit & Homing)

Kämpfe innerhalb desselben Sektors (`location == target_location`) werden im selben Tick berechnet, um komplexe Bullet-Pfad-Kalkulationen zu vermeiden.

*   **Thermo-Laser (Nahbereich / Instant):**
    *   *Kosten:* Reine `energy` (zieht massiv Strom aus den Schiffsbatterien). Keine physische Munition.
    *   *Wirkung:* Sofortiger thermischer Treffer. Schmilzt gegnerische Schilde und Panzerung durch thermische Überlastung. Der Schaden nimmt mit der euklidischen Distanz quadratisch ab.
*   **Magnetische Railgun (Mittelstrecke / Instant / Precision):**
    *   *Kosten:* Geringe `refined_matter` (Munition wird on-the-fly hergestellt).
    *   *Wirkung:* Sofortiger physischer Nadelstich. Hohe Panzerdurchdringung, zerstört mit hoher Wahrscheinlichkeit ein spezifisches Modul in seiner Bahn (z. B. den Bohrer oder Triebwerkskacheln), während der euklidische Hüllenschaden moderat bleibt.
*   **Gelenkter Torpedo (Guided Homing / 1-2 Ticks):**
    *   *Kosten:* Vorproduzierte Munition (Werft-Item).
    *   *Wirkung:* Selbstlenkender Sprengkopf, der den euklidischen Koordinaten des Gegners aktiv folgt. Verursacht flächendeckenden Explosionsschaden an allen Außenmodulen (Solarpanele, Antennen), kann aber von PDCs abgefangen werden.
*   **Gelenkter Brecher (Guided Buster / 1-2 Ticks):**
    *   *Kosten:* Vorproduzierte, extrem schwere Munition (Werft-Item).
    *   *Wirkung (Bobiverse):* Eine massive, gelenkte Stahlkugel mit Manövrierdüsen. Sie kollabiert Schilde physisch und besitzt eine **Impulsübertragung (Knockback)**, die das getroffene Schiff physisch im Sektor um 10-30 euklidische Einheiten zurückschleudert (Koordinaten-Shift!). Kann nicht von Standard-PDCs abgefangen werden.

### 2. Interstellarer Kampf (Langstrecke / Ganz weit weg)

Echte physikalische Flugbahnen über mehrere Runden werden ausschließlich für strategische Angriffe auf extreme interstellare Distanzen genutzt.

*   **Strategische Raketen (Missiles):**
    *   *Kosten:* Schwere, an Werften vorproduzierte Ordnance.
    *   *Wirkung:* Wird über interstellare Sektorgrenzen hinweg abgefeuert und fliegt über mehrere Runden durch die interstellare Leere. Besitzt keine hyper-agile Zielverfolgung für wendige Schiffe, sondern steuert feste Koordinaten an, um planetare Fabrik-Infrastrukturen (`shipyard`, `mind_forge`) zu zerschlagen oder Sektor-Depots zu leeren.
*   **Partikelstrahl-Lanze (Relativistic Particle Beam):**
    *   *Kosten:* Gigantischer, kontinuierlicher `energy`-Verbrauch.
    *   *Wirkung:* Ein schwerer interstellarer Teilchenbeschleuniger, der Protonen/Ionen nahe Lichtgeschwindigkeit ($> 0.9c$) verschießt. Der Strahl bleibt über astronomische Einheiten hinweg scharf fokussiert, durchdringt Panzerungen und destabilisiert Schilde auf extreme Distanzen, ohne Munition zu verbrauchen.

---

## II. Die Munitions- & Logistik-Matrix

```
                           [LOGISTICS & AMMUNITION]
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
  ON-THE-FLY RESOURCES                                        PRE-PRODUCED ORDNANCE
  - Laser: Pure Energy                                        - Torpedoes: Shipyard Item (Matter)
  - Railgun: Raw Matter on-the-fly                            - Brecher (Buster): Shipyard Item (Massive)
  - Particle Beam: Pure Energy
```

1.  **Reine Energie-Verbraucher (Laser / Partikelstrahl):**
    *   Müssen nicht vorproduziert werden, belasten den Laderaum mit $0$ Masse. Benötigen beim Schuss lediglich freie Batteriekapazität.
2.  **On-the-fly-Materie-Verbraucher (Railgun):**
    *   Müssen nicht vorproduziert werden. Das Schiff schmilzt die Wolfram-Projektile bei Bedarf über seinen internen Basis-Fabrikator selbst zusammen und zieht den Betrag direkt aus dem Frachtraum ab.
3.  **Werft-Munition / Pre-produced (Torpedos & Brecher):**
    *   Müssen zwingend vorproduziert werden! Werden an Werften oder Gantry-Kränen aus schweren Rohstoffen zusammengebaut und belegen physische Inventar-Slots im Laderaum des Schiffes. Nach Verbrauch muss das Schiff zur Basis zurückkehren und neu aufmunitionieren.

---

## III. Verknüpfung mit relevanten Tickets

*   **TCK-101 (Agent Hardware Upgrades):** Integration der neuen Waffen-Kacheln (`laser`, `railgun`, `pdc`) in die Blueprint-Matrix-Logik und Erweiterung der `evaluate_ship_matrix`-Physikberechnung um Schadens- und Schild-Gegenwerte.
*   **TCK-102 (Vessel Retrofitting):** Nachrüstung bestehender Sonden mit den neuen Modul-Kacheln im laufenden Sektor-Betrieb.
*   **TCK-108 (Deeper Verse Runway Setup):** Integration der physikalischen interstellaren Vektor-Flugbahnen für Raketen, Partikellanzen und RKV-Brecher durch den leeren interstellaren Raum zwischen Neumann-Nodes.
