# STRATEGISCHE SYNERGIE: REAL-TIME WEB-BROADCAST VS. STATEFUL MATRIX SLEEP

Dieses Dokument dokumentiert eine neu identifizierte, hochgradige architektonische Synergie im Bob-OS Simulations-Core, welche im Zuge der v10.5-Konsolidierung aufgedeckt wurde.

---

## 1. Das mathematische Problem
Die Inferenz von LLM-Agenten ist die primäre Kostenquelle der Simulation. Wenn ein Agent keine Aktionen durchführen muss (z.B. weil er sich im interstellaren Transit befindet, im Standby-Matrixmodus verweilt oder auf Ressourcen-Lieferungen wartet), verbraucht sein permanentes Aufwecken (Turns) nutzlose API-Aufrufe und Tokens.

## 2. Die Einzellösungen
- **Lösung A - Stateful Matrix Sleep (Hebel 2):** Ein Agent geht via `me.sleep(duration)` in einen tiefen, datenbankgestützten Schlafzustand über. Der Runner überspringt den API-Inferenz-Turn dieses Agenten komplett (0 API-Aufrufe / 0 Tokens) und dekrementiert lediglich die Schlummer-Zyklen.
- **Lösung B - Real-Time WebSocket-Broadcast (V12.0):** Der Runner meldet Zustandsänderungen asynchron und in Echtzeit per WebSocket direkt an das C2-Monitor-Frontend, anstatt dauerhaft schwere JSON-Snapshots auf die SSD zu spülen.

---

## 3. Die Synergie (Das Effizienz-Maximum)

Durch die Kombination beider Systeme entsteht ein hocheffizientes, ereignisgesteuertes Gesamtsystem:

```
┌──────────────────────────────────────┐
│  Bob-1 aktiviert deep sleep (10 Rd)  │  --> 0 API-Calls / 0 Tokenverbrauch!
└──────────────────┬───────────────────┘
                   │
                   ▼ (Turn 0 Matrix Hintergrund-Scanner)
┌──────────────────────────────────────┐
│  Sensor registriert kritisches Event │  --> (Incoming SCUT or Radar Signature)
└──────────────────┬───────────────────┘
                   │
                   ▼ (Instant Wakeup & API-Inferenz)
┌──────────────────────────────────────┐
│    Agent wacht rundenbasiert auf     │  --> (Turn wird sofort ausgeführt)
└──────────────────┬───────────────────┘
                   │
                   ▼ (Silent Web Broadcast in Millisekunden)
┌──────────────────────────────────────┐
│  C2-Web-Monitor leuchtet rot auf    │  --> Operator sieht den Wakeup sofort
└──────────────────────────────────────┘
```

### Der messbare Mehrwert:
1. **API-Kosten sinken um bis to 90%** für reisende oder wartende Agenten.
2. **Reaktionszeit sinkt auf 0 Ticks:** Es gibt keine "Verschlafungs-Verluste", da der Hintergrund-Wächter den Inferenz-Turn bei Ereignissen sofort erzwingt.
3. **Echtzeit-Sichtbarkeit:** Der menschliche Operator muss nicht periodisch die Weboberfläche aktualisieren oder auf zyklische File-Writes warten. Der Zustands-Wechsel von Schlaf -> Erwachen -> Aktion wird dem Web-Frontend in Millisekunden gemeldet.

---

## 4. Beteiligte Tickets
- **[TCK-DONE-005]** System Energy & Standby
- **[TCK-DONE-011]** V12.0 WebSocket Reactive Architecture
- **[TCK-TODO-104]** Runner-Level Auto-Radio-Poll
