# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Changed

- **Babylon pivot** (2026-04-30). Renderer migrated from React Three Fiber to Babylon.js. Native shell simplified to `@capacitor/core` + `@capacitor/preferences` (no `@capacitor/app` lifecycle — `document.visibilitychange` covers pause/resume). Single `<canvas id="game">` in root `index.html`; no React, no router, no views directory. Persistence via `Capacitor.Preferences` only — drizzle/SQLite/`@capacitor-community/sqlite` removed (it's an arcade game).
- **Screenplay model locked.** Levels are now cue lists keyed off wall-clock + rail-events. Enemies are dumb props on spawn rails ticking authored fire-program tapes. The `EncounterDirector` is the only thing with agency. No FSM library, no AI library, no PRNG — gameplay is fully scripted. Canon: `docs/spec/05-screenplay-language.md` + `docs/spec/02-encounter-vocabulary.md`.
- **Construction primitives model locked.** Levels are bags of `Wall` / `Floor` / `Ceiling` / `Door` / `Window` / `Shutter` / `Whiteboard` / `Pillar` / `Prop` / `Light` primitives that reference textures from the curated 240-PNG retro library + 5 PBR sets. No "big level GLB." Canon: `docs/spec/04-construction-primitives.md`.
- Design canon migrated from `docs/superpowers/specs/arcade-rail-shooter/` to `docs/spec/` (flat). Top-level dated design + build-plan docs removed; per-PRQ catalogue replaced by ad-hoc TaskList entries off the canon.

### Removed

- React + React Three Fiber + drei + Rapier renderer.
- drizzle + sql.js + `@capacitor-community/sqlite` persistence.
- yuka + koota + radix-ui + framer-motion + tailwind 4 + seedrandom.
- The 60-PRQ build plan + Phase 1-6 catalogue + M1-M7 milestones (replaced by single-PR pivot + ad-hoc canon-driven tasks).
- OOM lockdown protocol (Babylon's `dispose()` cascades replace the React-cleanup discipline).
- Voxel/floor/maze/navmesh systems and weapon-progression Tasks 15-21 (gone in the prior pivot but still referenced in pre-pivot docs).
- `app/`, `src/db/`, `src/i18n/`, `src/ui/`, `src/input/`, `src/shared/`, `src/audio/` directories.

### Added

- `src/main.ts` — runtime boot (Babylon Engine + Game state machine + EncounterDirector + GUI overlays).
- `src/preferences.ts` — `Capacitor.Preferences`-backed settings + high scores.
- `src/encounter/` — screenplay director (`EncounterDirector`), enemies (`Enemy.ts`, `ARCHETYPES`), spawn rails (`SpawnRail.ts`), fire-program presets (`firePatterns.ts`), cue language (`cues.ts`).
- `src/levels/` — level types (`types.ts`) + Lobby data (`lobby.ts`) + level registry (`index.ts`).
- `src/game/` — top-level state machine (`Game.ts` + `GameState.ts`).
- `src/gui/` — Babylon GUI overlays (Reticle, InsertCoinOverlay, ContinueOverlay, GameOverOverlay, SettingsOverlay).
- `docs/spec/04-construction-primitives.md` — Wall/Floor/Door/Window/Shutter/etc. schemas.
- `docs/spec/05-screenplay-language.md` — cue trigger + cue-action verb reference, 14 verbs.
- `docs/spec/playtest-2026-04-30.md` — paper-playtest report with 8 friction edits + 2 schema extensions.
- All 8 level docs (`docs/spec/levels/01-lobby.md` … `08-boardroom.md`) enriched with construction primitives, spawn-rail maps, camera-rail nodes, and cue lists.

## 1.0.0 (2026-04-30)


### Features

* **app:** empty Landing + Game views with R3F canvas (PRQ-00 T6) ([3f0c8a2](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/3f0c8a20925a80291078776289c79eec40baa2bc))


### Bug Fixes

* **e2e:** trim trailing slash from DORD_BASE_URL (PRQ-00 T12 follow-up) ([#5](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/5)) ([a4a4e07](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a4a4e079ddec4c94d6ffccb16ae432b65ea8d07f))
