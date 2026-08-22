# PERLA1 RTP Asset Reference

Status: optimized asset package, dormant runtime integration.

This document describes the PERLA1 RTP character/event/dialogue asset layer. It does not override `AGENTS.md`, `PERLA1_TASK_INTAKE_PROTOCOL.md`, `PERLA1_PROJECT_MAP.md`, or runtime integration rules.

Optimized WebP assets are present under this folder. Until runtime code explicitly loads `assets/rtp/manifest/rtp.characters.json`, this folder is not active gameplay behavior.

Current generated payload:

- 9 main-character dialogue portraits;
- 9 approved real supplied NPC dialogue portraits;
- 198 standard 8-frame sprite animations plus 4 special ambient source assets;
- 220 WebP files total;
- 5,757,790 generated WebP bytes;
- 0 generated PNG files, 0 generated nested zip files.

## When To Use This Reference

Consult this folder and `manifest/rtp.characters.json` for any task whose goal mentions RTP, characters, personaggi, NPC, animals, eventi, dialoghi, dialogue portraits, or RPG Maker-style conversation UI.

For tasks that map sceneggiatura/gameplay into world placement, time bands, behavior loops, dialogue lines, battle placeholders, resources, or upgradeable base objects, also consult `SCENARIO_EVENT_MAPPING_PROTOCOL.md`.

For the first supplied scenario/gameplay source set, also consult `PERLA1/report/SCENEGGIATURA_GAMEPLAY_MAPPING_DRAFT_2026-06-14.md`.

When scenario/gameplay mapping is in scope, the intake gate must call `rtp-scenario-workflow-planner` at task start and end for non-trivial work, must read/update `PERLA1/RTP_GAME_COMPLETION_PLAN.md` as the permanent production plan, must record the task in `PERLA1/RTP_SCENARIO_TASK_LEDGER.json`, and must call the matching read-only domain auditors: `scenario-rtp-map-auditor`, `map-placement-auditor`, `event-flow-auditor`, and `dialogue-continuity-auditor` as their signals apply. These agents must be aware of the game-completion plan, do not activate the RTP layer, and do not replace runtime validation.

When sprite animation settings and map placement/readability are jointly touched, `sprite-animation-placement-auditor` is `CALL`. This covers `rtp.behaviors.json`, `rtp.placements.json`, animation IDs, idle/walk loops, facing/mirror-left policy, 8-frame standard animation policy, special ambient exceptions, anchors/contact feet, sprite scale, quality-distance settings, draw distance, LOD/stripe budget, sprite density, or runtime sprite loader/render integration. It must compare RTP main/NPC/animal settings with the historical `assets/raycast/` sprite pipeline and current runtime sprite symbols, not create a separate RTP-only quality policy.

The permanent game-completion plan is `PERLA1/RTP_GAME_COMPLETION_PLAN.md`. It records the ordered work needed to finish the game layer: main characters, NPCs, animals, scenario manifests, events, dialogues, gameplay systems, runtime integration, and final intro storyboard integration. The planner must read it at task start and update it at task end when production state changes.
The permanent roadmap is `PERLA1/RTP_SCENARIO_WORKFLOW_ROADMAP.md`. It records current phase, active milestone, active task packet, blockers, validation evidence, completed delta, and next step.
The dynamic ledger is `PERLA1/RTP_SCENARIO_TASK_LEDGER.json`. It records planner start/end evidence for each non-trivial RTP/scenario branch task and must have `activeTask: null` when the task is closed.

Exception: legacy environmental/object assets already present in `assets/raycast/` remain governed by `ASSET_MANIFEST` and the existing raycaster asset pipeline.

## Runtime Folder Contract

```text
assets/rtp/
  README_RTP_ASSETS.md
  SCENARIO_EVENT_MAPPING_PROTOCOL.md
  manifest/
    rtp.characters.json
    rtp.placements.json      # future dormant manifest
    rtp.behaviors.json       # future dormant manifest
    rtp.dialogues.json       # future dormant manifest
    rtp.events.json          # future dormant manifest
  schema/
    rtp.placements.schema.json
    rtp.behaviors.schema.json
    rtp.dialogues.schema.json
    rtp.events.schema.json
  characters/
    portraits/
      main/
        <character_id>.webp
      npc/
        <character_id>.webp
    sprites/
      main/
        <character_id>/<animation_id>.webp
      npc/
        <character_id>/<animation_id>.webp
      animals/
        <character_id>/<animation_id>.webp
```

The source zip is not a runtime asset and must not be committed here.

## Identity Rules

- Use stable lowercase ASCII IDs.
- Replace spaces and dashes with underscores.
- Do not use display names as runtime keys.
- Keep source identity, display name, role, portrait policy, and sprite animation metadata in `manifest/rtp.characters.json`.

Example:

```text
Display name: Bruno Basalto
Runtime ID: bruno_basalto
Portrait: characters/portraits/main/bruno_basalto.webp
Sprite animation: characters/sprites/main/bruno_basalto/iso_walk_down.webp
```

## Portrait Contract

Portraits are part of the optimized RTP layer. Main characters and approved NPC dialogue portraits are supported; animals never receive dialogue portraits.

- Purpose: RPG Maker-style dialogue portrait.
- Runtime format: optimized WebP.
- Target size: 512 px max side unless a smaller UI target is explicitly approved.
- Load policy: lazy load on first dialogue open, or prefetch shortly before a known scripted dialogue.
- NPC portraits from the source package are included as approved dialogue portraits when declared in `manifest/rtp.characters.json` and referenced through `npc_portrait_exception` with `portraitExceptionApproved: true`.

## Sprite Contract

Standard source packages provide:

- states: `idle`, `walk`;
- stored source facings: `up`, `down`, `right`;
- derived facing: `left`, by horizontal mirror from `right`;
- runtime frame count: 8 per standard animation;
- source frame count: 25 per standard animation;
- source frame size: 256x256;
- source atlas size: 1280x1280.
- runtime atlas size: 1024x512, 4 columns x 2 rows.
- frame selection: visual arc-length distribution across the 25 source frames.

Runtime should keep one representation per animation. Do not ship both atlas PNGs and individual frame PNGs.

Do not generate or commit duplicate left-facing assets. `iso_idle_left` and `iso_walk_left` are derived from `iso_idle_right` and `iso_walk_right` by horizontal mirroring. This is a loader/app rule, not a request to duplicate files on disk.

Ambient animal exceptions such as bees and mosquitoes are represented as optimized direct WebP assets under `characters/sprites/animals/<id>/` and are marked with `sourceLayout: "special_direct_png"` in the manifest.

Do not inflate special ambient sources to 8 frames when the source only provides 1 or 3 real images. Repeating frames would increase metadata/work without adding animation quality.

## Loading Policy

- Do not add RTP assets to the current global `ASSET_MANIFEST`.
- Do not preload the full RTP layer at game startup.
- Character sprites load by event or zone.
- Main portraits load by dialogue.
- Animals load by ambience zone.
- Service worker caching must be versioned and capped before activation.

## Scenario Manifest Validation

Future `rtp.placements.json`, `rtp.behaviors.json`, `rtp.dialogues.json`, and `rtp.events.json` files are validated by `PERLA1/tools/perla_rtp_scenario_validator.py`.
Static live-sprite/event budget risk is validated by `PERLA1/tools/perla_rtp_performance_budget_validator.py`.

The static validator checks schema parseability, cross-manifest references, character roles, no animal dialogue, portrait policy, explicit/inferred labeling, schedule conflicts, battle placeholder `won`/`lost` branches, and mirror-derived left-facing policy. It intentionally does not prove runtime coordinate bounds, walkability, visibility, collision, sprite occlusion, or rendered correctness.

The performance budget validator checks dormant manifest budgets before runtime integration: live sprites per zone/time band, main/NPC density, animal/ambient density, interactive event concurrency, battle placeholder concurrency, non-blocking behavior policy, lazy/dormant loading signals, and spacing policy. Runtime performance still requires measured counters and `performance-auditor`.

## Safety Rules

- Never load nested zip files directly in the browser.
- Never extract source zip paths without path normalization and zip-slip checks.
- Verify file magic bytes; do not trust extensions.
- Keep this RTP layer separate from legacy `assets/raycast/` assets.
- Runtime quality-distance, draw distance, LOD/stripe, and anchor/readability behavior for RTP live sprites must remain coherent with the historical `assets/raycast/` sprite pipeline unless measured performance/visual validation approves a documented exception.
- Update `PERLA1_PROJECT_MAP.md` and run the required validation only when runtime code starts consuming this manifest.
