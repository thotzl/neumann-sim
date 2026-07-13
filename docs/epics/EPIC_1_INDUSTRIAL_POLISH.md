# EPIC 1: Industrial Polish & Economy Loop (V9.5)

**Ziel:** Bevor wir die große strukturelle Trennung zwischen Geist und Hülle vollziehen, muss die bestehende Industrie-Ökonomie in sich schlüssig und "rund" werden. Es darf keine Ressourcen geben, die als "Appendix" ohne echten Nutzen existieren (wie aktuell `refined_matter`). Das Bau-Menü muss erweitert werden.

## 1. Refined Matter Integration (Der Tech-Tree)
*   **Logik-Update:** Die SDK-Methoden `build()` und `repair()` müssen modifiziert werden, um zwischen `raw_matter` und `refined_matter` zu unterscheiden.
*   **Der "Veredelungs-Booster":** Wenn ein Gebäude mit `refined_matter` repariert oder gebaut wird, wird ein Multiplikator angewendet (z.B. 1 Einheit `refined_matter` entspricht 2 oder 3 Einheiten Baufortschritt/HP). Das macht den Betrieb einer Raffinerie extrem lukrativ für die Skalierung.

## 2. Tier-2 Infrastruktur (Advanced Hardware)
*   Einführung neuer Gebäude-Typen in `ECONOMY_RULES.json`, die für den Bau **zwingend** einen Mix aus `raw` und `refined` Matter erfordern.
*   **Advanced Shipyard:** Benötigt für die kommenden Schiffs-Klassen (Epic 2).
*   **Deep Space Scanner (Interstellar_Array):** Erlaubt das Entdecken von Systemen in viel größerer Reichweite (z.B. > 3000 Einheiten), kostet massiv Energie und Veredelte Materie.
*   **Warp Gate (Optional):** Erlaubt den sofortigen Transit zwischen zwei Systemen, in denen jeweils ein Gate steht (hoher Energie-Drain).

## 3. World Physics: Core Regeneration (Die atmende Galaxie)
*   **Das Problem:** Aktuell verhalten sich die Bobs wie eine zerstörerische Heuschreckenplage. Leere Systeme sind permanente Friedhöfe (0 Materie), was ewige Migration erzwingt.
*   **Die Lösung (Geologische Regeneration):** Planetenkerne regenerieren sich extrem langsam (z.B. +2 bis +5 Materie pro Runde) bis zu einem absoluten Maximum. 
*   **Der Impact:** Systeme werden nicht mehr wertlos. Es entsteht ein strategischer Anreiz, ein System nicht komplett aufzugeben, sondern eine Infrastruktur oder ein KMI-Skript (Drohne) zurückzulassen, das den "Töpfchen-Ertrag" passiv erntet, während der Hauptschwarm weiterzieht.

## 4. Maintenance Grace Period (Der 99-HP Bug)
*   **Das Problem:** Agenten sind in einen endlosen Reparatur-Loop gefangen, weil die System-Physik am Ende jeder Runde 1 HP abzieht. Wer auf 100 HP repariert, hat im nächsten Scan wieder 99 HP ("Reparatur-Anomalie").
*   **Die Lösung:** Neue Spalte `maintenance_cooldown` (Integer) in der Tabelle `infrastructure`.
    *   Wenn ein Gebäude gebaut oder über `repair()` repariert wird, erhält es einen Cooldown (z.B. 10 Runden).
    *   Die `physics_update.py` reduziert pro Zyklus diesen Cooldown. Nur wenn der Cooldown auf 0 ist, wird 1 HP (`decay_rate`) von der Struktur abgezogen.
*   **Der Impact:** Bobs müssen nicht mehr jede Runde Mikromanagement betreiben. Eine Reparatur "hält" für eine Weile, was Token spart und Kapazitäten für Exploration freimacht.

## 5. Balancing & SDK Feedback
*   Das YAML-Dashboard muss anzeigen, welche Ressourcen-Typen ein Gebäude für ein Upgrade benötigt und ob eine planetare Regeneration stattfindet.
*   Das LLM muss klares Feedback bei `build()` erhalten, wenn ihm spezifisch `refined_matter` für ein Tier-2 Gebäude fehlt.
