# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Changed

- **Pivot to arcade rail shooter** (2026-04-30). DORD is now a mobile-first rail shooter in the Time Crisis / House of the Dead / Virtua Cop lineage — single canonical 9-level run (Lobby → Boardroom), 5 verbs, 3-state reticle, hand-crafted levels. The pre-pivot voxel/floor/maze/navmesh world has been removed. Canon: `docs/superpowers/specs/arcade-rail-shooter/`.
- All pre-pivot plan documents (`docs/plans/prq-*.md`, `docs/plans/EXECUTION.md`, `docs/plans/AUTONOMY.md`, `docs/plans/MONOLITHIC-PR-CONSOLIDATION.md`, `docs/ROADMAP.md` M1-M7) deleted; replaced by the build plan at `docs/superpowers/plans/2026-04-30-arcade-rail-shooter-build.md`.
- All root + `docs/` documentation realigned to the rail-shooter design (see `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/TESTING.md`, `docs/ROADMAP.md`, `README.md`, `AGENTS.md`, `STANDARDS.md`).

### Removed

- `src/world/{chunk,floor,blocks,traps,workbench}` — voxel chunk system, floor archetypes, voxel block registry, traps, workbench (PRQ-1.0).
- `src/ai/{navmesh,enemies,perception}` — yuka navmesh + enemy entities + perception layer (replaced by rail-shooter encounter beats).
- `src/render/{world,stairwells,characters,lighting,camera}` — voxel world meshing, stairwell streaming, character rig, scene lighting, kinematic player (replaced by R3F rail camera).
- `src/{building,combat,content,narrator,ecs,verify}` — building/mining radials, hitscan adapter, drop tables, Tracery narrator, koota wiring, boot a11y verify (replaced or moved into focused rail-shooter modules).
- `app/views/{EmployeeFile,WorkbenchPanel}` — pre-pivot pause-menu surfaces.

### Added

- `src/shared/rng.ts` — single-source `createRng(seed)` (preserved verbatim from the pre-pivot world generator).

## 1.0.0 (2026-04-30)


### Features

* **app:** empty Landing + Game views with R3F canvas (PRQ-00 T6) ([3f0c8a2](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/3f0c8a20925a80291078776289c79eec40baa2bc))


### Bug Fixes

* **e2e:** trim trailing slash from DORD_BASE_URL (PRQ-00 T12 follow-up) ([#5](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/5)) ([a4a4e07](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a4a4e079ddec4c94d6ffccb16ae432b65ea8d07f))
