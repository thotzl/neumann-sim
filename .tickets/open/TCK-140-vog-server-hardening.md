---
id: "TCK-140"
title: "SEC: VoG-Server absichern"
epic_phase: "EPIC-00 Platform Hardening"
epic: "EPIC-00"
status: "open"
priority: "high"
wave: "1"
created: 2026-10-19
dependencies: []
---

# TCK-140: SEC: VoG-Server absichern

## Description
Der Monitor-Server darf nur lokal erreichbar sein und schreibende Endpunkte nur mit Token annehmen.

## Verified Code Gap
- `hud/vog_server.cjs:272` — Bind an alle Interfaces.
- `hud/vog_server.cjs:46` — `Access-Control-Allow-Origin: *`.
- `hud/vog_server.cjs:146` `POST /vog`, `POST /api/broadcast` — ohne Authentifizierung, JSON-Parsing unabhängig vom Content-Type.
- `hud/vog_server.cjs:168` — Sektor-Endpoint ohne Grenzen (Bounding-Box, Seed-Länge).
- `hud/dev.cjs:21` — Vite mit `--host 0.0.0.0`.

## Definition of Done
- [ ] Bind-Adresse Default `127.0.0.1`, per Env `VOG_HOST` überschreibbar.
- [ ] CORS nur für den Vite-Origin (konfigurierbar).
- [ ] Schreibende Endpunkte verlangen `Content-Type: application/json` und Header `X-VoG-Token` (Token aus Env, beim Start generiert und in der Konsole ausgegeben, falls nicht gesetzt); Engine-Broadcast (`broadcast_service.js`) sendet das Token mit.
- [ ] Sektor-Endpoint: maximale Fläche, numerische Validierung, Seed-Länge begrenzt.
- [ ] Vite Default `localhost`.
- [ ] Tests für 401/403/400-Fälle und erfolgreichen Broadcast.

## Verification Command
`node tests/js/test_vog_server.js && node tests/test_all.js`

## References
- [Revisit-Befund](../../docs/revisit/01-security.md#s4--vog-server-ohne-schutz--tck-140)
- [EPIC-00](../epics/EPIC-00-platform-hardening.md)
