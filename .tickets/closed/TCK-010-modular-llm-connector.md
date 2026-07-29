---
id: TCK-010
title: "Modular LLM-Connector-Layer & AI-Bridge (OpenAI / Ollama / Gemini / GitHub Models)"
epic_phase: "Epic 2 (V10.0) / AI-Kognition"
status: "closed"
priority: "high"
version: "v10.5"
created: 2026-07-28
completed: 2026-07-28
---

## Description
Einführung einer herstellerunabhängigen Abstraktionsschicht (AI-Bridge) für alle LLM-Anfragen. Dies ermöglicht es, verschiedene Modelle für unterschiedliche Rollen einzusetzen (z.B. Gemini für die Bobs, Ollama/Phi-4 für den Speicher-Compressor) und schützt das System vor Vendor-Lock-ins.

## Verification (Code SSoT)
- **Source Code:**
  - `sim_engine/utils/ai_bridge.js` -> Factory-Klasse, die eingehende Anfragen anhand der Konfiguration an den passenden Treiber weiterleitet.
  - `sim_engine/utils/ai_drivers/gemini_driver.js` -> Nativer Treiber für Googles Gemini API.
  - `sim_engine/utils/ai_drivers/openai_driver.js` -> Kompatibilitätstreiber für OpenAI, Together AI, DeepInfra, GLHF.
  - `sim_engine/utils/ai_drivers/ollama_driver.js` -> Lokaler Treiber für Offline-Inferenz.
  - `sim_engine/utils/ai_drivers/github_driver.js` -> High-Speed Integration für das GitHub Models Service.
  - `sim_engine/utils/api_client.js` -> Universelle Schnittstelle des Runners, die die AI-Bridge transparent kapselt.

## System Impact
Maximale Flexibilität bei Inferenz-Kosten und -Geschwindigkeit. Erlaubt 100% Offline-Betrieb via Ollama sowie ungedrosselten High-Speed-Betrieb via GitHub Models für bezahlte Entwickler-Accounts.

## References
- Spezifikations-Konzept: [LOCAL_LLM_MIGRATION.md](../resources/done/LOCAL_LLM_MIGRATION.md)
- Inferenz-Benchmarks: [FREE_CLOUD_AND_AI_LABS_EVALUATION.md](../resources/done/FREE_CLOUD_AND_AI_LABS_EVALUATION.md)
