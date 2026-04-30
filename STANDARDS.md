# STANDARDS.md — Department of Redundancy Department

Code, brand, and quality non-negotiables.

## Code quality

### Forbidden in this codebase

- `.skip(`, `.todo(`, `.fixme(`, `xtest(`, `xit(`
- `TODO:`, `FIXME:`, `throw new Error('not implemented')`
- `return null as any`, `as unknown as`, `// @ts-ignore`
- `// @ts-expect-error` without a justifying comment
- `Math.random()`, `Date.now()`, `performance.now()` outside the engine clock/RNG facade
- Hand-edited baseline PNGs (regenerate via `--update-snapshots`, eyeball the diff)
- `retries: N` on visual tests to mask flake (find the determinism break instead)
- `--no-verify` on git commit / push (hooks must pass; fix the underlying issue)
- `--admin` merge on PRs

### Required

- TypeScript strict — no opt-outs.
- Conventional Commits on every commit.
- Per-commit reviewer trio dispatched in background after every PRQ commit.
- Memory dispose cleanup on every `useEffect` mount (per `docs/ARCHITECTURE.md`).
- All gameplay RNG via `createRng(seed)` from `src/shared/rng.ts`.

## Brand

Brand canon is in `docs/superpowers/specs/2026-04-30-arcade-rail-shooter-design.md` and `docs/superpowers/specs/arcade-rail-shooter/`.

- **Tone:** office comedy-horror. Departure Mono UI. Intercom-page narrator.
- **Palette:** ink `#15181C`, paper `#F4F1EA`. Threat-tier ambience layers.
- **Typography:** Departure Mono for chrome, Inter for body, JetBrains Mono for debug. Self-hosted woff2 (see `docs/fonts.md`).
- **Mark:** stamped `D` on paper-with-paper-clip.

## Rendering

R3F + drei only. No bare three.js mounts. No JollyPixel. No SolidJS. All loaded models via drei's `<Gltf/>` / `useGLTF`. Character meshes wrapped in `<Character slug="..."/>`.

No fog. No skeletal animations. No viewmodel-arms IK. T-pose hands only.

## Audio

Web Audio graph. Curated 66-file library. Every SFX cue has a Web Audio assertion (node connected, envelope shape, timing window) — see `tests/audio/`.

## Determinism

Seed all RNG. Fixed timestep for tests. Disable animations in test mode. Wait for fonts before screenshots. Mask volatile regions. `retries: 0` for visual tests locally.

## Testing

Each design-canon claim has an assertion. Tests reify spec lines. See `docs/TESTING.md`.

## Lockdown protocol

OOM lockdown ACTIVE until Phase 4 lift gate. Banned commands and lift criteria are in `.agent-state/directive.md`. Every dispatched subagent inherits the bans.
