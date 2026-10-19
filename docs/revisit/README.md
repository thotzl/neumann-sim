# Revisit 2026-10 — Projekt-Audit & Sanierungsplan

Stand: 2026-10-19 · Basis-Commit: `b32e5d6` (master) · Epic: [EPIC-00 Platform Hardening](../../.tickets/epics/EPIC-00-platform-hardening.md)

Dieses Verzeichnis dokumentiert den Tiefen-Audit des Projekts vor der Weiterentwicklung. Jeder Befund ist mit Datei/Zeile belegt und einem Ticket zugeordnet. Neue Features werden erst nach Abschluss der Sanierung (EPIC-00) aufgenommen; unentschiedene Ideen liegen in `.tickets/pool/`.

## TL;DR

Funktional ist der Kern stabil: die CI-Suite (35 Suites, 169 Python-SDK-Tests) läuft unter Linux mit aktueller glibc grün. Kritisch ist die fehlende Isolation: LLM-Output und agentengeschriebenes Python laufen ungefiltert mit Host-Rechten. Daneben: Linux-only ohne deklarierte Voraussetzungen, 21 verwaiste/veraltete Tests, mehrere doppelte Wahrheitsquellen, toter Code und stark veraltete Projekt-Skills/Dokumentation.

## Baseline (verifiziert am 2026-10-19)

| Umgebung | Ergebnis |
|---|---|
| Linux, glibc 2.41, Node 20, Python 3.13 (`node:20-trixie`) | `node tests/test_all.js`: 35/35 grün |
| Linux, glibc 2.36 (Debian 12) | 14 Suites rot: `sqlite3@6` Prebuilt verlangt glibc ≥ 2.38 |
| Windows nativ | nicht lauffähig (`python3`-Hardcoding, `:`-PYTHONPATH, POSIX-Quoting, Symlinks, fehlendes `pyyaml`) |
| HUD | `tsc --noEmit` 0 Fehler, Vitest 9/9 grün (2 Testdateien, nicht in CI) |
| Tests außerhalb des Hubs | 21 rot/veraltet (17 JS, 4 Python), weitere grün aber nicht eingebunden (Details: [02-tests-platform.md](02-tests-platform.md)) |

## Bereiche

| Dokument | Inhalt | Tickets |
|---|---|---|
| [01-security.md](01-security.md) | Shell-Ausführung von LLM-Output, Agenten-Python mit Host-Rechten, offener VoG-Server | TCK-138, TCK-139, TCK-140 |
| [02-tests-platform.md](02-tests-platform.md) | Plattform-Abhängigkeiten, Test-Hygiene, verwaiste Tests | TCK-141, TCK-142 |
| [03-ssot-architecture.md](03-ssot-architecture.md) | Doppelte Configs/Generatoren, Inline-Python, Persistenz, Driver | TCK-144, TCK-145, TCK-146, TCK-147, TCK-148, TCK-130 |
| [04-cleanup.md](04-cleanup.md) | Toter Code, Root-Artefakte | TCK-143 |
| [05-docs-ticketing.md](05-docs-ticketing.md) | Skill-/Doku-Drift, tote Links, Ticket-Infrastruktur | TCK-137, TCK-150 |

## Umsetzungsreihenfolge

| Welle | Tickets | Hinweis |
|---|---|---|
| 0 | TCK-137 | Ticket-Sync für `pool/` und `epics/` — Voraussetzung für Push |
| 1 | TCK-138, TCK-140, TCK-141, TCK-142 | parallelisierbar, disjunkte Dateien |
| 2 | TCK-139, TCK-143, TCK-144, TCK-145 | 139/145 bauen auf 138 auf |
| später | TCK-146 – TCK-150, TCK-130 | angelegt, Umsetzung nach Entscheidung |

## Methode

Gelesen: Engine-Kern (`src/sim_engine/**`), Python-Kernel (`src/bob_os/core/**`), HUD-Einstieg und VoG-Server, Configs, CI-Workflows, alle Projekt-Skills, alle offenen Tickets und Ressourcen. Statische Scans: Modul-Nutzung, SQL/Exec-Muster, Markdown-Links. Dynamisch: CI-Hub und alle Testdateien in Linux-Containern auf einer `git archive`-Kopie, HUD `tsc`/`vitest`.
