# 🪐 OPTIMIZATION BLUEPRINT: HEBEL 4 – CONFIGURABLE RECURSIVE MEMORY

Dieses Planungsdokument enthält die finale, technisch akkordierte Spezifikation für **Hebel 4 (Configurable Recursive Memory)** im Zuge der Token- und Kosten-Optimierungsphase (v10.5).

---

## 1. Architektonische Leitlinie (Die Verlustfreie Dichte)

Bisher wuchs der `GEDÄCHTNIS-EXTRAKT` bei jeder Destillation an, da das System verlangte, alle Meilensteine, Regeln und Historien unbegrenzt zu bewahren. Nach 5 Generationen blähte dies den Prompt unkontrolliert auf.

Ab sofort implementieren wir ein **modulares, kaskadierendes Kompressionssystem**, das:
1.  Über die `config.json` flexibel an- und ausgeschaltet werden kann.
2.  Ein **verlustfreies, mathematisch optimiertes Standard-Token-Budget von 1.200 Tokens** erzwingt, damit Bob wichtige technologische Fortschritte niemals vergisst.

---

## 2. Das neue Konfigurations-Schema (`config.json`)

Das `memory`-Objekt in der Config wird um die neuen Schalter erweitert:

```json
"memory": {
  "soft_token_limit": 10000,
  "hard_token_limit": 30000,
  "recursive_compression": true,
  "max_compression_output_tokens": 1200
}
```

### Die Schalter-Verhalten im Detail:
*   **`recursive_compression` (Default: `true`):** Aktiviert die kaskadierende Destillation standardmäßig, um deine Token-Abrechnung von Anfang an im Late-Game zu schonen.
*   **`max_compression_output_tokens` (Optional):**
    *   **Wenn definiert (z. B. `1200`):** Erstellt ein hartes Obergrenzen-Budget (Sperre) sowohl im System-Prompt als auch im Request-Body (`max_output_tokens`). Dies garantiert absolute Kostenkontrolle.
    *   **Wenn undefined / weggelassen:** Es wird **kein hartes Limit** erzwungen! Der Compressor-Agent darf im "Uncapped-Modus" so viele Tokens erzeugen, wie er benötigt, um Roberts Erlebnisse absolut verlustfrei zu bündeln. Dies ist ideal für maximale historische Dichte.

---

## 3. Die kaskadierende Kompressions-Logik

Wenn `recursive_compression` aktiv ist, verhält sich die Inferenz im `state_manager.js` wie folgt:

```
  +------------------------------------------------------------+
  |              FRISCHE HISTORIE REISST LIMIT                |
  +-----------------------------┬------------------------------+
                                │
                                ▼
  +------------------------------------------------------------+
  |               DER COMPRESSOR-TURN (Gemini Pro)             |
  |                                                            |
  |  * Nimmt das bisherige Gedächtnis + die neuen Logs.        |
  |  * Kürzt redundante Ereignisse.                            |
  |  * Verpackt etablierte Historien in "Epochal-Meilensteine". |
  |  * Erzwingt im Request-Body: max_output_tokens = 1200.      |
  +-----------------------------┬------------------------------+
                                │
                                ▼
  +------------------------------------------------------------+
  |          NEUER GEDÄCHTNIS-EXTRAKT (< 1200 Tokens)          |
  |                                                            |
  |  * Wird als einzige Start-Nachricht in die Historie        |
  |    des Agenten zurückgeschrieben.                          |
  +------------------------------------------------------------+
```

---

## 4. Zu modifizierende Quelldateien

*   **`sim_engine/utils/state_manager.js`:**
    *   Auslesen der Parameter `recursive_compression` und `max_compression_output_tokens` aus dem Config-Objekt.
    *   Injektion der harten Output-Restriktionen in die API-Payloads der Generierungs-Aufrufe.
    *   Optimierung der Destillations-Prompts auf die strenge Einhaltung der Token-Obergrenze.

---

*Dieses Planungsdokument wurde erfolgreich im Projektarchiv gesichert. Es dient als bindendes Pflichtenheft für die spätere Implementierungsphase.*
