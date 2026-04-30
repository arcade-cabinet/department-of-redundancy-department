# AGENTS.md — Department of Redundancy Department

## Session startup

1. Read `.agent-state/digest.md` (~10 lines).
2. Read `.agent-state/cursor.md`.
3. Read `.agent-state/directive.md`.
4. Call `TaskList` — per-PRQ status lives there, not in directive.
5. If working on a PRQ: open the entry in [`docs/superpowers/plans/2026-04-30-arcade-rail-shooter-build.md`](./docs/superpowers/plans/2026-04-30-arcade-rail-shooter-build.md).

Do NOT read everything. Trust the digest.

## Persistent state layout

```
.agent-state/
├── directive.md          # standing rules + lockdown protocol + design canon
├── digest.md             # ~10-line state summary (auto-maintained)
├── cursor.md             # next work pointer (auto-maintained)
└── decisions.ndjson      # append-only decision log
```

Per-PRQ status lives in the **TaskList tool**, not in the directive. The directive's checkboxes are phase-level only.

## Autonomous operation rules

- Continuous work: when one PRQ finishes, start the next per directive.
- One topic branch = one PR per phase. PRQs are commit boundaries inside.
- After each commit: dispatch parallel reviewer trio (`comprehensive-review:full-review` + `security-scanning:security-sast` + `code-simplifier:code-simplifier`) scoped to commit's diff. Fold findings forward; never amend a reviewed commit.
- Stubs / TODOs / `pass` bodies / `as any` / `it.todo` are bugs. Fix or delete.
- Refactors not shims: when a module moves, every caller moves with it in the same commit.
- PR feedback: address everything. Wait for CI. Never `--admin` merge. Never `--no-verify`.

## OOM lockdown protocol (active until Phase 4 lift gate)

Triggered 2026-04-30 by host OOM crash. Banned commands until lockdown lifts:

- `pnpm dev` / `vite` / any long-lived dev server
- `pnpm test:browser` / vitest browser mode
- `pnpm test:e2e:headed` / `playwright test --headed`
- Any background process opening a browser, GPU surface, or canvas

Allowed: `pnpm typecheck`, `pnpm lint`, `pnpm test:node`, `git`, file reads, static-analysis specialist agents.

Lift criteria are in `.agent-state/directive.md`.

## Per-PRQ workflow

1. Claim the PRQ task in TaskList (set status `in_progress`).
2. Spawn fresh subagent with focused PRQ context.
3. Subagent implements PRQ + writes tests.
4. `pnpm typecheck` + `pnpm test:node` green (Phase 1-4) / + browser tests (Phase 5+ post lockdown lift).
5. Commit (Conventional Commits, PRQ id in body).
6. Dispatch parallel review trio in background.
7. Mark TaskList task `completed`.
8. Move to next PRQ; fold prior review findings into next forward commit's body.
9. When phase's last PRQ lands, push topic branch and open ONE squash-merge PR.

## Rendering rule

R3F + drei only. No bare three.js mounts. Use drei's `<Gltf/>` (or `useGLTF`) for all loaded models.

## RNG rule

No `Math.random()` outside `node_modules/yuka/**`. Every random draw goes through `createRng(seed)` from `src/shared/rng.ts`.

## Memory dispose discipline

Pattern from commit 577eb2c (canon). Every `useEffect` mount has a cleanup that disposes BufferGeometry, Materials, Textures, BVH, Audio sources, and koota host refs. Material clones disposed individually. Audio source nodes paired: `play(loop:true)` → `stop()`.

## Wiring rule (absolute)

A FEATURE IS NOT DONE UNTIL IT IS WIRED INTO THE PLAYABLE GAME LOOP AND VISIBLE TO THE PLAYER. A pure-data table + a unit test is NOT a shipped feature. Before claiming any PRQ done:

1. The module must be IMPORTED in `app/` code (not just exercised by tests).
2. The runtime must CALL its functions on tick / event / mount.
3. The player must OBSERVE the effect (visual, audio, gameplay change).

## Test diagnostic surface

- Vitest node — pure logic.
- Vitest browser (via `@vitest/browser-playwright`) — R3F components, BVH raycast, Rapier collisions. **Disabled during lockdown.**
- Playwright — golden-path + perf. **Disabled during lockdown.**

## Decisions log

Append a line to `.agent-state/decisions.ndjson` for any non-trivial decision (or use commit-body `Decision:` / `Why:` / `Resolves:` lines — the post-commit hook extracts them automatically).
