---
id: TCK-119
title: "HOTFIX: Rebrand SSoT Cognitive Protocol from ANALYSIS to LOGBOOK"
epic_phase: "Cognitive Alignment"
status: "closed"
priority: "high"
created: 2026-08-07
completed: 2026-08-07
version: "v13.7"
dependencies: []
---

## Description
This ticket mandates a complete, breaking, and consistent rebranding of the SSoT Cognitive Protocol. The term `ANALYSIS` (and `1. ANALYSIS:`) must be thoroughly replaced with the term `LOGBOOK` (and `1. LOGBOOK:`) across all layers of the project, including parsers, agents' system prompts, unit tests, mock servers, and frontend visualization components.

This is a non-backward-compatible change designed to align the Bobs' cognitive stream with an immersive, continuous captain's diary narrative ("Ship's Logbook"), preventing sterile telemetry repetition and stylistic loop stagnation.

## Technical Requirements

### 1. Parser & Runner Updates (`sim_engine`)
- **File:** `src/sim_engine/services/agent_turn_service.js`
  - Update the regex from checking `/1\.\s*ANALYSIS:/i` to `/1\.\s*LOGBOOK:/i` (and similar secondary matches).
  - Update the prompt assembly formatting rule: `"Respond strictly in protocol format (1. LOGBOOK followed by 2. ACTION)."`
  - Ensure stored history blocks (`state.histories`) save the header as `1. LOGBOOK:` instead of `1. ANALYSIS:`.
- **File:** `src/sim_engine/helpers/logger.js`
  - Change the visual markdown output header from `**Manifestation (Cognitive Logs):**` to `**Consciousness Logbook (1. LOGBOOK):**`.

### 2. System Instructions & Prompt Template Updates
- **File:** `src/sim_engine/config/core-config.json` (and any related configurations)
  - Update the `"COGNITIVE PROTOCOL (MANDATORY):"` section.
  - Swap the word `ANALYSIS` completely with `LOGBOOK`.
  - Inject the strict narrative instructions:
    1. **NO TELEMETRY REPETITION:** Do not list, restate, or describe raw numbers, inventories, coordinates, or module health. Proceed directly to strategic, logical, and navigational reasoning.
    2. **CAPTAIN'S LOG STYLE:** Speak naturally. Treat your thoughts as an ongoing, continuous captain's diary of your voyage, directly continuing and expanding upon the last entry in your history.

### 3. Verification & Testing Updates
- **Files:** Update all JS and Python tests to reflect the new `1. LOGBOOK:` structure:
  - `tests/js/test_agent_turn_service.js`
  - `tests/js/test_diary_only.js`
  - `src/sim_engine/drivers/ai_drivers/mock_driver.js`
  - `monitor/test_helpers.ts`
  - Any other test files containing hardcoded `1. ANALYSIS:` or `/ANALYSIS:/` regexes.

### 4. Frontend & Monitor Updates
- Update frontend code in `monitor/` or `hud/` that checks for `type === 'thought'` or attempts to strip/parse thoughts containing `1. ANALYSIS:` to match the new `1. LOGBOOK:` format.

## DoD (Definition of Done)
1. The word `ANALYSIS` is completely and consistently replaced with `LOGBOOK` in the context of the SSoT cognitive format across parsers, tests, mock data, and prompt templates.
2. The new prompt guidelines against telemetry repetition are fully integrated.
3. Running `node tests/test_all.js` yields a 100% green passing status.
4. The changes are staged and committed under standard formatting conventions:
   `fix(sim_engine): rebrand cognitive protocol from ANALYSIS to LOGBOOK and optimize prompt template`

## Verification (Code SSoT)
- **Prompt Template:** `src/sim_engine/config/core-config.json` fully rebranded and optimized for natural Captain's Diary logs without telemetry repetition.
- **Parser Engine:** `src/sim_engine/services/agent_turn_service.js` updated regex matching logic and fallback templates.
- **Visual Logger:** `src/sim_engine/helpers/logger.js` revised header output to Consciousness Logbook.
- **Tests Passing:** `node tests/test_all.js` executed and verified with 100% success across all JS/Python integration and unit tests, including rebranded E2E scenarios.
