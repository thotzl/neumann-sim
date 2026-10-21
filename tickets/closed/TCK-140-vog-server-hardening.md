---
id: "TCK-140"
title: "SEC: VoG-Server absichern"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "closed"
priority: "high"
wave: "1"
created: 2026-10-19
dependencies: []
completed: 2026-10-19
version: "v13.10.2"
---

# TCK-140: SEC: VoG-Server absichern

## Description
Der Monitor-Server darf nur lokal erreichbar sein und schreibende Endpunkte nur mit Token annehmen.

## Verified Code Gap (Ausgangslage)
- `hud/vog_server.cjs:272` — Bind an alle Interfaces.
- `hud/vog_server.cjs:46` — `Access-Control-Allow-Origin: *`.
- `hud/vog_server.cjs:146` `POST /vog`, `POST /api/broadcast` — ohne Authentifizierung, JSON-Parsing unabhängig vom Content-Type.
- `hud/vog_server.cjs:168` — Sektor-Endpoint ohne Grenzen (Bounding-Box, Seed-Länge).
- `hud/dev.cjs:21` — Vite mit `--host 0.0.0.0`.

## Definition of Done
- [x] Bind-Adresse Default `127.0.0.1`, per Env `VOG_HOST` überschreibbar.
- [x] CORS nur für den Vite-Origin (konfigurierbar).
- [x] Schreibende Endpunkte verlangen `Content-Type: application/json` und Header `X-VoG-Token` (Token aus Env, beim Start generiert und in der Konsole ausgegeben, falls nicht gesetzt); Engine-Broadcast (`broadcast_service.js`) sendet das Token mit.
- [x] Sektor-Endpoint: maximale Fläche, numerische Validierung, Seed-Länge begrenzt.
- [x] Vite Default `localhost`.
- [x] Tests für 401/403/400-Fälle und erfolgreichen Broadcast.

## Verification Command
`node tests/js/test_vog_server.js && node tests/test_all.js`

## Verification (Code SSoT)
- `hud/vog_server.cjs`: Bind `127.0.0.1` (`VOG_HOST`), Port `VOG_PORT`; CORS nur `VOG_ALLOWED_ORIGINS` (fremde Origins 403, WebSocket-Origin-Check); `POST /vog`, `/api/broadcast`, `/api/events` verlangen `application/json` (415) und `X-VoG-Token` (401, timing-safe); Body-Limits 1 MB / 16 MB (413); Sektor-Endpoint validiert Zahlen, Fläche ≤ 1e11, Seed ≤ 64 Zeichen, Dichte [0,10] (400), Generator-Argumente als `--opt=value`.
- `hud/dev.cjs`: Token aus Env → `.env` → generiert; an Server (`VOG_TOKEN`) und Vite (`VITE_VOG_TOKEN`); Vite-Host Default `localhost` (`VITE_HOST`), ebenso `hud/vite.config.ts`.
- `hud/src/monitor/components/LogPanel.tsx`: sendet `X-VoG-Token`, Fehlerbehandlung bei non-2xx.
- `src/sim_engine/services/broadcast_service.js`: Token-Header, Ziel `127.0.0.1`/`VOG_HOST`, einmalige Warnung bei 401; `state_exporter.js` nutzt dieselbe Funktion (Duplikat entfernt).
- README: Abschnitt „Monitor Security (VoG Server)“ mit Env-Variablen.
- Test: `tests/js/test_vog_server.js` (401/415/413/403-CORS/WS-Origin/400/200), im Hub registriert.
- Verifikation (node:20-trixie): Hub grün, HUD `tsc` 0, Vitest 9/9.
- Restrisiko (dokumentiert): Mit gültigem Token kann `/api/broadcast` weiterhin `experiment_dir` setzen.

## References
- [Revisit-Befund](../../wiki/history/revisit-2026-10.md)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
