# PERLA1 Scenario And Event Mapping Protocol

Status: dormant planning protocol for future scenario/gameplay integration.

This document defines how future sceneggiatura and gameplay specifications must be converted into PERLA1 map placements, time schedules, behavior loops, dialogue/event lines, battle placeholders, and missing-asset placeholders.

It does not override `AGENTS.md`, `PERLA1_TASK_INTAKE_PROTOCOL.md`, or runtime validation rules. It becomes operational only when a task imports or maps scenario/gameplay content.

## Trigger

Use this protocol whenever the task goal mentions sceneggiatura, gameplay, events, eventi, dialoghi, NPC placement, character placement, animals, resources, player base upgrades, battle launch, or story-to-map mapping.

Required references:

- `assets/rtp/README_RTP_ASSETS.md`
- `assets/rtp/manifest/rtp.characters.json`
- this file
- `PERLA1/RTP_GAME_COMPLETION_PLAN.md`
- `PERLA1/report/SCENEGGIATURA_GAMEPLAY_MAPPING_DRAFT_2026-06-14.md` when using the first supplied sceneggiatura/GDD/storyboard source set

Required specialist gate:

- `rtp-scenario-workflow-planner` is `CALL` at task start and end for non-trivial RTP/scenario branch work. It reads `PERLA1/RTP_GAME_COMPLETION_PLAN.md` at task start, updates it at task end when production state changes, reads and updates `PERLA1/RTP_SCENARIO_WORKFLOW_ROADMAP.md` with current phase, active milestone, task packet, blockers, validation evidence, completed delta, and next step; it also opens and closes `PERLA1/RTP_SCENARIO_TASK_LEDGER.json` with planner start/end evidence.
- `scenario-rtp-map-auditor` is `CALL` before and after scenario/RTP identity mapping, entity discovery, source priority, or future manifest planning.
- `map-placement-auditor` is `CALL` before and after placement, coordinate, zone, walkability, visibility, route, density, or schedule-location decisions.
- `sprite-animation-placement-auditor` is `CALL` before and after sprite animation settings and placement/readability are coupled: animation IDs, `rtp.behaviors.json`, `rtp.placements.json`, idle/walk loops, facing/mirror-left policy, 8-frame standard animation policy, special ambient exceptions, anchors/contact feet, sprite scale, quality-distance settings, draw distance, LOD/stripe budget, sprite density, or runtime sprite loader/render integration.
- `event-flow-auditor` is `CALL` before and after event graph, quest, battle placeholder, prerequisite/effect, success/failure, or no-softlock decisions.
- `dialogue-continuity-auditor` is `CALL` before and after dialogue, speaker, portrait policy, line continuity, or dialogue/event link decisions.

The planner may update only `PERLA1/RTP_GAME_COMPLETION_PLAN.md`, the roadmap, and the ledger files. The auditors are read-only domain checks and must read the game-completion plan when their domain is touched. They do not replace `asset-integrity-auditor`, `code-mapper`, `renderer-block-auditor`, `visual-qa-auditor`, `workflow-guard`, `workflow-consistency-auditor`, `plan-integrity-auditor`, or `task-watchdog`, and they do not make dormant manifests active runtime data.

Project-wide agents, protocols, and root `.codex/hooks.json` are secondary support for RTP/scenario work. They must be mapped and respected, and may be called when the primary RTP workflow lacks a needed specialty or a general guard/runtime/sync concern appears. They cannot bypass the RTP planner, close the RTP ledger, replace mandatory RTP `CALL` agents, or approve RTP readiness alone.

## Core Principle

The scenario/gameplay input is the design source. The runtime map is the spatial constraint. The RTP manifest is the identity/asset source.

When the scenario is precise, follow it. When it is incomplete, infer the most plausible placement, schedule, behavior, or representation and mark the result as inferred with a short rationale.

Never silently invent facts as if they were specified.

## Future Output Manifests

When scenario integration begins, generate explicit data manifests instead of burying decisions in runtime code:

```text
assets/rtp/manifest/
  rtp.characters.json      # existing identity/assets manifest
  rtp.placements.json      # map positions, zones, schedules
  rtp.behaviors.json       # idle/walk loops, patrol rules, ambient routines
  rtp.dialogues.json       # character-only dialogue/event lines
  rtp.events.json          # story/gameplay event mapping and placeholders
```

These files must remain dormant until `index.html` or future runtime modules explicitly load them.

Minimum schemas for those future manifests live in:

```text
assets/rtp/schema/rtp.placements.schema.json
assets/rtp/schema/rtp.behaviors.schema.json
assets/rtp/schema/rtp.dialogues.schema.json
assets/rtp/schema/rtp.events.schema.json
```

Static validation lives in:

```text
PERLA1/tools/perla_rtp_scenario_validator.py
PERLA1/tools/perla_rtp_performance_budget_validator.py
```

Run it after creating or changing any future `rtp.placements.json`, `rtp.behaviors.json`, `rtp.dialogues.json`, or `rtp.events.json` file. In static mode it verifies manifest parseability, ID references, role/entity-type compatibility, no animal dialogues, portrait policy, explicit/inferred labeling, schedule conflicts, battle placeholder branches, no physical left-facing duplicate assets, and mirror-derived left-facing policy. It does not prove runtime coordinates, walkability, visibility, collision, or final rendered behavior.

Run the RTP performance budget validator before runtime integration design and after changes that affect live sprite density, event concurrency, loading/cache policy, or behavior radius. It verifies static budgets for live sprites per zone/time band, main/NPC density, animal/ambient density, interactive event concurrency, battle placeholder concurrency, non-blocking behavior policy, lazy/dormant loading signals, and spacing policy. It does not measure final FPS; runtime performance still requires `performance-auditor`, renderer counters, visual QA, and regression checks.

## Entity Classification

Every scenario/gameplay entity must be classified before placement:

| Entity type | Examples | Required mapping |
|---|---|---|
| `main_character` | Bruno Basalto, Imperio, Nina Ciottolo | placement, time bands, behavior loop, dialogue lines, event links |
| `npc` | Agente Igiene 007, Nonna Pina | placement, time bands, behavior loop, dialogue lines, event links |
| `animal` | cat, dog, birds, lizard | placement, time bands, ambient behavior loop only |
| `resource` | collectible materials, pickups | placeholder asset, spawn logic, placement |
| `base_or_upgrade` | player base, upgrade stages | placeholder or required asset, map footprint, upgrade states |
| `system_event` | battle, unlock, quest step, tutorial | trigger position, prerequisites, outcome handling |

Animals must not receive dialogue lines. If a future design needs animal communication, it must be promoted to a special narrative exception instead of being treated as default animal behavior.

## Placement Rules

For each entity, produce a placement record with:

- `id`
- `entityType`
- `zone`
- `position`: exact coordinates if provided, otherwise inferred coordinates
- `placementSource`: `script_explicit`, `storyboard_explicit`, `gameplay_explicit`, or `inferred`
- `placementRationale`
- `timeBands`
- `availabilityConditions`
- `eventLinks`
- `validationNotes`

If the scenario does not specify a position, infer one from:

- character role and narrative function;
- referenced place, activity, or relationship;
- gameplay access flow;
- nearby event triggers;
- biome/zone fit for animals;
- visibility and readability in raycaster view;
- avoidance of blocked tiles, roofs, walls, tight corridors, and high-overdraw crowds.

Do not place entities only because there is empty space. Placement must support story clarity, gameplay readability, and believable world life.

## Time Bands

Every character or animal must receive time-band availability.

Use explicit scenario times when present. If missing, infer plausible bands and mark them as inferred.

Recommended normalized bands:

```text
dawn
morning
day
afternoon
sunset
night
storm_or_special_weather
event_only
```

Rules:

- One entity cannot be in two incompatible locations in the same time band.
- Event-critical characters should use `event_only` or a tightly scoped band when their presence would otherwise create paradoxes.
- Animals may use wider ambient bands, but should still respect biome and activity.
- If time of day is irrelevant, use `day` as a default only with `timeBandSource: "inferred"`.

## Behavior Loop Rules

Every placed character/animal needs an intelligent map behavior loop.

Standard behavior shape:

```json
{
  "mode": "idle_walk_loop",
  "anchor": {"x": 0, "y": 0},
  "radius": 2,
  "idleSeconds": [2, 6],
  "walkSeconds": [1, 4],
  "turnBehavior": "face_path_or_player_when_interacted",
  "collisionPolicy": "non_blocking_or_soft_blocking",
  "schedulePolicy": "active_only_in_time_bands"
}
```

Premium raycaster-world standards:

- routines should make the world feel alive without blocking player flow;
- patrol radius should stay readable and local unless the character has a story reason to roam;
- important characters should idle near readable landmarks or event anchors;
- animals should use ambient movement, short patrols, fleeing/perching/resting loops, or biome-specific idle;
- no behavior should create heavy sprite clustering in one camera corridor;
- no routine should require left-facing duplicate assets; left-facing render is derived by mirror.
- live RTP sprite quality-distance, draw distance, LOD/stripe behavior, anchors/contact feet, and readability must stay coherent with the historical `assets/raycast/` sprite pipeline unless measured visual/performance validation approves a documented exception.

Recommended static spacing before exact coordinate activation:

- main character or NPC near another main/NPC: at least 2.5 map tiles unless a scripted cutscene locks movement;
- animal or ambient sprite near another live sprite: at least 2 map tiles when the sprite is ground-level or path-adjacent;
- event trigger near another interactive trigger: at least 2 map tiles, or explicit priority/serialization;
- if coordinates are still `runtime_pending`, record the spacing check as pending and do not claim runtime readiness.

## Dialogue Rules

Dialogues are for characters only: `main_character` and `npc`.

For every character dialogue:

- connect it to a scenario line, event line, quest step, or fallback ambient line;
- record prerequisites and outcome effects;
- attach the correct portrait for main characters and for NPCs with an explicitly approved `npc_portrait_exception`;
- do not assign dialogue to animals;
- do not let dialogue contradict the entity's time band or current event state.

Recommended future dialogue record:

```json
{
  "id": "dialogue.bruno_basalto.intro_001",
  "speakerId": "bruno_basalto",
  "eventId": "event.intro.meet_bruno",
  "lineType": "event",
  "portraitPolicy": "main_character_portrait",
  "conditions": [],
  "effects": []
}
```

## Battle Placeholder Switch

When a scenario/gameplay event is supposed to launch battle, the final integration will call a separate battle app.

Until that app is integrated, map the battle as a test switch:

```json
{
  "type": "battle_placeholder",
  "battleAppIntegrated": false,
  "testSwitch": {
    "enabled": true,
    "prompt": "Segnare questa battle come vinta o persa?",
    "outcomes": ["won", "lost"]
  }
}
```

Rules:

- The switch must be fast to disable once the real battle app call exists.
- Both `won` and `lost` branches must be mapped if the game system depends on them.
- The placeholder must be visibly marked in data as temporary; never hide it as final battle logic.

## Missing Asset And Placeholder Rules

When the scenario/gameplay requires something not present in RTP assets, create an explicit placeholder mapping:

- player base and upgrade stages;
- collectible resources;
- interactable props;
- quest objects;
- doors, gates, unlock devices;
- battle/event markers.

Placeholder record must include:

- `placeholderId`
- `missingAssetType`
- `temporaryRepresentation`
- `recommendedFinalAsset`
- `placement`
- `upgradeOrStateVariants` when relevant
- `validationRisk`

Do not block scenario mapping just because a final sprite is missing. Represent it honestly and flag the asset gap.

## Event Mapping Rules

Every scenario/gameplay event must receive:

- `eventId`
- `eventType`
- `location`
- `timeBand`
- `participants`
- `trigger`
- `conditions`
- `effects`
- `dialogueRefs`
- `battleRef` if any
- `placeholderRefs` if any
- `successState`
- `failureState`
- `noParadoxChecks`

Events must be placed where the player can understand them spatially. If the best exact location is not specified, infer it and document why.

Event concurrency rules:

- Interactive events in the same zone and time band should not all run as independent parallel triggers by default.
- When two interactive events share a zone/time band, map them as serialized, prioritized, or explicitly parallel-safe.
- Battle placeholders in the same zone/time band should normally be one active challenge at a time.
- Ambient events may be parallel, but they must respect sprite density and cache budgets.
- Runtime activation must preserve responsiveness: no event loop should block movement, dialogue close, day-cycle updates, or pause/debug controls.

## Coherence And No-Paradox Validation

Before declaring a scenario/gameplay mapping ready, validate:

- all referenced character/animal IDs exist in `rtp.characters.json`;
- no animal has dialogue;
- no NPC portrait is used unless it is explicitly promoted through `npc_portrait_exception` and `portraitExceptionApproved`;
- no entity is scheduled in impossible overlapping locations;
- event prerequisites and effects do not create loops or dead states;
- battle placeholders have both `won` and `lost` test outcomes when downstream logic needs them;
- missing assets are explicit placeholders, not silent omissions;
- inferred placements and time bands are marked as inferred;
- important events are reachable, visible, and not hidden behind walls/roofs or blocked routes;
- behavior loops do not block required paths;
- sprite density remains reasonable for raycaster performance;
- live sprite spacing and event concurrency remain within `perla_rtp_performance_budget_validator.py` static budgets;
- left-facing behavior uses mirror logic and does not create duplicate left assets;
- runtime integration changes still require the normal PERLA1 validation ladder.

## Workflow Self-Expansion Circuit

When a scenario/RTP/event/dialogue/placement task exposes a structural workflow limit, loop, missing checker rule, authority ambiguity, or cross-document conflict, do not continue by assumption. Classify and repair the workflow before the next protected step.

Required circuit:

1. Classify the anomaly: `missing_agent`, `missing_schema`, `missing_validator`, `doc_drift`, `authority_conflict`, `runtime_boundary_conflict`, `loop_or_softlock`, `validation_gap`, or `source_of_truth_gap`.
2. Stop the unsafe protected step: no runtime integration, readiness claim, sync, or final event mapping approval until the anomaly is handled or explicitly reported as blocked.
3. Call `workflow-guard` and `workflow-consistency-auditor` for workflow anomalies; call the relevant RTP domain auditor for the affected data domain.
4. Apply the smallest durable fix: update the protocol, schema, validator, TOML agent, intake gate, orchestration file, or project map that actually owns the missing rule.
5. Add deterministic checker coverage when the issue is mechanically inspectable.
6. Preserve the dormant/runtime boundary: a workflow expansion may add rules, docs, schemas, or validators, but it must not silently activate runtime loading.
7. Validate with `tools/perla_codex_workflow_check.ps1` and, when future scenario manifests exist, with `tools/perla_rtp_scenario_validator.py`.
8. If a rule would grant new write authority, bypass user approval, or create a circular validator/approver relationship, stop for the user instead of self-approving.

## Acceptance Checklist

For each scenario/gameplay import, the final mapping report must state:

- source scenario/gameplay files read;
- entities discovered;
- placements explicit vs inferred;
- time bands explicit vs inferred;
- behavior loops assigned;
- dialogue lines mapped, characters only;
- battle placeholders created;
- missing assets/placeholders created;
- no-paradox validation result;
- runtime files changed, if any;
- validation performed and remaining risk.
