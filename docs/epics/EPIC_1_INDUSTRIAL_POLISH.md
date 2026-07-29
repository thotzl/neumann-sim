# 🏁 EPIC 1 POST-IMPLEMENTATION SPECIFICATION: INDUSTRIAL EVOLUTION & WORLD PHYSICS

Dieses Dokument dokumentiert die abgeschlossenen, stabil integrierten Spielphysik- und Ökonomie-Erweiterungen von Bob-OS v8.8+. Es verknüpft historische Planungsdaten mit dem realen physikalischen Regelwerk der Engine.

---

## 1. Zielsetzung & Historie
Vor der Einführung der relationalen Schiffbau-Physik musste das Fundament der planetaren Wirtschaft und Infrastruktur in sich konsistent und "rund" werden. Epic 1 zerschlug den alten unendlichen HP-Schleifen-Bug (Wartungs-Paralyse) und führte echte geologische planetare Kern-Regenerationen ein, um dauerhaft besiedelte Sektoren lebendig zu halten.

---

## 2. Physikalische Säulen der Wirtschaft

### 2.1 Geologische Regeneration (Planetenkerne)
Damit ausgebeutete Sektoren nicht als dauerhafte Schlacke-Friedhöfe enden, generieren Planetenkerne kontinuierlich neue abbaufähige Materie pro Zyklus.
- **Mechanik:** Der automatische Physics-Update Loop (`physics_update.py`) dekrementiert nicht nur Transportzeiten, sondern füllt die `extractable_matter_in_core` eines Systems schrittweise bis zum globalen Maximum (`max_extractable_matter`) auf.
- **Mathematisches SSoT-Regelwerk (`ECONOMY_RULES.json`):**
  - Basis-Regenerationsrate: `5` Einheiten Materie pro Runde.

### 2.2 Struktureller HP-Verfall & Maintenance Grace Period
Gebäude verlieren passiv pro Runde HP durch Verschleiß. Um zu verhindern, dass Bobs rundenlang Reparaturen im Bereich von 99% auf 100% mikromanagen (99-HP-Bug), wurde ein Wartungs-Schutzzeitraum eingeführt.
- **Wartungs-Schutzzeitraum (`maintenance_cooldown`):** Nach dem Bau oder einer erfolgreichen Reparatur erhält eine Infrastruktur einen Cooldown von 10 Runden. In diesem Zeitraum findet **kein passiver HP-Verfall** statt.
- **HP-Verfall:** Nach Ablauf des Cooldowns verliert das Gebäude passiv HP basierend auf der globalen `decay_rate` (z.B. 1-2% pro Runde). Sinkt die HP auf 0, geht das Gebäude in den *Blackout* (Inoperabel).

---

## 3. Tier-2 Infrastruktur & Refined Matter (Der Tech-Tree)
Einführung veredelter Materie (`refined_matter`) zur Freischaltung spezialisierter Hardware-Gebäude.

- **`matter_refinery` (Die Schmelze):** Wandelt rohe `raw_matter` unter Energieaufwand in `refined_matter` um.
- **`advanced_shipyard` (Die Trockenwerft):** Benötigt veredelte Materie für den Bau komplexerer Schiffs-Chassis (z.B. Heavy Miner, Constructor).
- **`sem_matrix` & `mind_forge`:** Ermöglichen das dauerhafte Hosten und Klonen von disembodied Minds ohne physisches Trägerschiff.

---

## 4. Beteiligte Core-Tickets (Schnittstellen-Verknüpfung)
Sämtliche Meilensteine dieses Epics sind vollständig implementiert und über folgende Tickets versioniert:
- **`[TCK-DONE-007]` Geological Planetary Core Regeneration** ([Link](../../.tickets/closed/TCK-DONE-007-geological-regeneration.md))
- **`[TCK-DONE-008]` Structural Decay & Maintenance Grace Period** ([Link](../../.tickets/closed/TCK-DONE-008-structural-decay.md))
