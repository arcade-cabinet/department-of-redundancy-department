# STANDARDS.md — Department of Redundancy Department

Code, brand, and quality non-negotiables.

## Code quality

### Forbidden in this codebase

- `.skip(`, `.todo(`, `.fixme(`, `xtest(`, `xit(`
- `TODO:`, `FIXME:`, `throw new Error('not implemented')`
- `return null as any`, `as unknown as`, `// @ts-ignore`
- `// @ts-expect-error` without a justifying comment
- `Math.random()` in gameplay code (gameplay is fully scripted; the screenplay director does not roll dice)
- Hand-edited baseline PNGs (regenerate via `--update-snapshots`, eyeball the diff)
- `--no-verify` on git commit / push (hooks must pass; fix the underlying issue)
- `--admin` merge on PRs
- Speculative engine code that doesn't mirror canon — the design canon under `docs/spec/` is the contract. Engine implements it verbatim.

### Required

- TypeScript strict — no opt-outs.
- Conventional Commits on every commit.
- All Babylon resources captured at construction and disposed on level-end (per `docs/ARCHITECTURE.md`).
- Per-commit reviewer trio dispatched in background after meaningful commits (`comprehensive-review:full-review` + `security-scanning:security-sast` + `code-simplifier`).

## Brand

Brand canon is in [`docs/spec/`](./docs/spec/).

- **Tone:** office comedy-horror, with a tonal arc from gentle satire (Lobby) → tip-over (HR Corridor) → grand-guignol (Boardroom).
- **Palette:** ink `#15181C`, paper `#F4F1EA`. Threat-tier ambience layers per `docs/spec/00-overview.md`.
- **Typography:** Departure Mono for chrome, Inter for body, JetBrains Mono for debug. Self-hosted woff2 (see `docs/fonts.md`).
- **Mark:** stamped `D` on paper-with-paper-clip.

## Rendering

Babylon.js only. `@babylonjs/core` for the scene/engine, `@babylonjs/loaders` for GLB import, `@babylonjs/gui` for HUD overlays. No three.js direct mounts. No React.

No fog. No skeletal animations. No viewmodel-arms IK.

## Audio

Web Audio via Babylon's `Sound` API. Curated 66-file library under `public/assets/audio/`. Audio cues are first-class screenplay verbs (`audio-stinger`, `ambience-fade`) and ride the cue queue.

## Testing

Each design-canon claim has an assertion. Tests reify spec lines. See `docs/TESTING.md`.

## Architecture canon

The design canon under `docs/spec/` is the source of truth. The engine implements it verbatim:

- `src/levels/types.ts` mirrors `docs/spec/04-construction-primitives.md`.
- `src/encounter/cues.ts` mirrors `docs/spec/05-screenplay-language.md`.
- `src/encounter/Enemy.ts` + `src/encounter/firePatterns.ts` mirror `docs/spec/02-encounter-vocabulary.md`.
- `src/encounter/EncounterDirector.ts` honours the difficulty table from `docs/spec/03-difficulty-and-modifiers.md`.

When canon changes, the engine changes in the same commit. No drift.
