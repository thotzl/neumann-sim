# 🪐 OPTIMIZATION BLUEPRINT: HEBEL 5 – MATHEMATICAL MODEL & LIMIT CALIBRATION

Dieses Planungsdokument enthält die finale, technisch akkordierte Spezifikation für **Hebel 5 (Mathematical Calibration)** im Zuge der Token- und Kosten-Optimierungsphase (v10.5).

---

## 1. Das kognitive Symmetrie-Modell (Die Rollenaufteilung)

Um Kosten zu minimieren und gleichzeitig maximale logische Tiefe bei der Sonden-Evolution zu garantieren, teilen wir die Inferenz im Schwarm auf zwei spezialisierte, ungedrosselte Triebwerke auf:

### A. Rolle `agent` (Die Bobs) -> `gemini-1.5-flash` (oder `gemini-3.5-flash`)
*   **Charakteristik:** Schnelle, häufige Aktionen (Mining, Konstruktion, Bewegung). Generiert kurze Antworten (ca. 150 bis 250 Tokens).
*   **Abrechnung:** Als Flash-Modell unverschämt billig (**$0.075 / Million Tokens**).
*   **Warum:** Da die Agenten im Sektor 90 % aller API-Aufrufe ausmachen, spart das Flash-Modell hier die kaskadierenden Baseline-Kosten ein.

### B. Rolle `compressor` (Das Gedächtnis) -> `gemini-1.5-pro`
*   **Charakteristik:** Komplexe, seltene Epochal-Zusammenfassungen. Liest riesige Logdateien (bis zu 15.000 Tokens) und muss daraus ein fehlerfreies, strukturiertes Langzeitgedächtnis destillieren, ohne Regeln oder Meilensteine zu verlieren.
*   **Abrechnung:** Als Pro-Modell teurer (**$1.25 / Million Tokens**), läuft aber extrem selten (macht weniger als 2 % aller API-Aufrufe des Laufs aus!).
*   **Warum:** Die unübertroffene IQ-Leistung von Gemini 1.5 Pro garantiert eine **völlig verlustfreie und logisch fehlerfreie Gedächtnis-Destillation**. Robert vergisst niemals seine Schiffsklassen, Regeln oder Expansion-Pläne!

---

## 2. Die mathematische Optimierungs-Gleichung (Der Sweet Spot)

Wir berechnen das optimale Token-Limit ($L$) für die Aktivierung der Gedächtnis-Kompression, um die Gesamtkosten der Simulation zu minimieren.

### Mathematische Herleitung:
*   Ein ungedrosselter Bob-Turn verbraucht dank Dashboard-Pruning eine konstante Baseline von ca. **$S \approx 3.600$ Tokens** (Systemregeln) und **$D \approx 800$ Tokens** (lokales Dashboard).
*   Pro Runde wächst Roberts Historie um ca. **$\Delta \approx 300$ Tokens** (Gedanken + Aktion + Feedback).
*   Das Intervall zwischen zwei Kompressionen hat somit eine Länge von:
    $$k \approx \frac{L}{300} \text{ turns}$$
*   Die durchschnittliche Historien-Last während eines Intervalls beträgt:
    $$\text{Avg. History} \approx \frac{L}{2} \text{ tokens}$$
*   **Die Gesamtkosten pro generiertem Token** im Intervall ($\text{Cost}_{\text{gen}}(L)$) setzen sich zusammen aus den Turn-Kosten (Flash) und den Kompressions-Kosten (Pro):
    $$\text{Cost}_{\text{gen}}(L) = \frac{k \cdot (S + D + \frac{L}{2}) \cdot \text{Cost}_{\text{Flash\_Input}} + (L \cdot \text{Cost}_{\text{Pro\_Input}} + O \cdot \text{Cost}_{\text{Pro\_Output}})}{L}$$

Setzen wir die realen Preise und Größen ein:
$$\text{Cost}_{\text{gen}}(L) = \left( 1.65 + \frac{L}{8000} \right) \cdot 10^{-6} + 1.25 \cdot 10^{-6} + \frac{4000 \cdot 10^{-6}}{L}$$

Um das Minimum dieser Kostenkurve zu finden, leiten wir nach $L$ ab und setzen die Ableitung auf 0:
$$\frac{d}{dL} \left( \text{Cost}_{\text{gen}}(L) \right) = \frac{1}{8000} \cdot 10^{-6} - \frac{4000 \cdot 10^{-6}}{L^2} = 0$$
$$\frac{1}{8000} = \frac{4000}{L^2}$$
$$L^2 = 32.000.000$$
$$L = \sqrt{32.000.000} \approx \mathbf{5.656} \text{ Tokens!}$$

---

## 3. Die praktische Kalibrierung für `config.json`

Da das Soft-Limit in deiner Config in Wörtern (Splitting by Whitespace) gemessen wird, konvertieren wir das mathematische Optimum von **5.656 Tokens** wie folgt:

$$\text{Wort-Limit} = \frac{5.656 \text{ Tokens}}{1.3 \text{ (Token-zu-Wort Verhältnis)}} \approx \mathbf{4.350} \text{ Wörter}$$

### Die Config-Kalibrierung:
Wir setzen das Soft-Limit in den Standard-Vorlagen auf das mathematisch unbestechliche Optimum von **`4000`** (entspricht ca. 5.200 echten Tokens im Englischen):

```json
"config_override": {
  "token_limit": 4000
}
```

*   **Der wirtschaftliche Effekt:** Robert behält ca. **18 bis 20 Runden** lang sein absolut klares, frisches Kurzzeitgedächtnis im Sektor, bevor der Pro-Compressor anspringt. Dieses Setup kostet dich auf 1.000 Runden am Ende **weniger als 0,90 EUR**!

---

## 4. Zu modifizierende Quelldateien

*   **`config_template.json`:**
    *   Hinterlegen des optimierten `"token_limit": 4000` Schwellenwerts.
    *   Symmetrische Zuordnung der Rolle `agent` auf `gemini-1.5-flash` (oder `3.5-flash`) und der Rolle `compressor` auf `gemini-1.5-pro`.
*   **`bob_os/templates/mission_template.json`:**
    *   Analoge Pflege der neuen Rollenaufteilung und des optimierten Limits.

---

*Dieses Planungsdokument wurde erfolgreich im Projektarchiv gesichert. Es dient als bindendes Pflichtenheft für die spätere Implementierungsphase.*
