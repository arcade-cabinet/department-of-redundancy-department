# AGENTS.md — Department of Redundancy Department

## Session startup

1. Read `.agent-state/digest.md` (~10 lines).
2. Read `.agent-state/cursor.md`.
3. Read `.agent-state/directive.md`.
4. Call `TaskList` for queue.
5. If working on canon: open the relevant doc under [`docs/spec/`](./docs/spec/).

Do NOT read everything. Trust the digest.

## Persistent state layout

```
.agent-state/
├── directive.md          # standing rules + locked architecture
├── digest.md             # ~10-line state summary (auto-maintained)
├── cursor.md             # next work pointer (auto-maintained)
└── decisions.ndjson      # append-only decision log
```

## Autonomous operation rules

- Continuous work: when one task finishes, start the next per directive.
- One topic branch = one PR. Squash-merge.
- After each commit: dispatch parallel reviewer trio (`comprehensive-review:full-review` + `security-scanning:security-sast` + `code-simplifier:code-simplifier`) scoped to commit's diff. Fold findings forward; never amend a reviewed commit.
- Stubs / TODOs / `pass` bodies / `as any` / `it.todo` are bugs. Fix or delete.
- Refactors not shims: when a module moves, every caller moves with it in the same commit.
- PR feedback: address everything. Wait for CI. Never `--admin` merge. Never `--no-verify`.

## Architecture & rendering

Babylon.js only. No React. No three.js. No R3F. All visuals via `@babylonjs/core` + `@babylonjs/loaders` + `@babylonjs/gui`. Single canvas in `index.html`. See `CLAUDE.md` for the full stack.

## No PRNG, no AI library

Gameplay is fully scripted via the screenplay model — no random draws in gameplay code. Enemies are dumb props on spawn rails ticking authored fire-program tapes; no FSM library, no behaviour trees. The `EncounterDirector` (`src/encounter/EncounterDirector.ts`) is the only thing with agency.

## Babylon disposal discipline

Every level captures every Babylon resource it constructs (`Scene` / `Mesh` / `Material` / `Texture` / `AnimationGroup` / `Sound`) and disposes via `scene.dispose()` (cascades) on the `transition` cue. Shared assets (hands, weapons, common enemies) live in a long-running asset cache.

## Wiring rule (absolute)

A FEATURE IS NOT DONE UNTIL IT IS WIRED INTO THE PLAYABLE GAME LOOP AND VISIBLE TO THE PLAYER. A pure-data table + a unit test is NOT a shipped feature. Before claiming any task done:

1. The module must be IMPORTED in `src/main.ts` boot path or a level data file.
2. The runtime must CALL its functions on tick / event / cue.
3. The player must OBSERVE the effect (visual, audio, gameplay change).

## Per-task workflow

1. Claim the task in TaskList (set status `in_progress`).
2. Implement. Mirror docs/spec canon verbatim — no speculation, no invented vocabulary.
3. `pnpm typecheck` + `pnpm lint` + `pnpm test:node` green.
4. Commit (Conventional Commits, doc reference in body where relevant).
5. Mark TaskList task `completed`.
6. Move to next.

## Test diagnostic surface

- Vitest node — pure logic. The rail state machine (`src/rail/Rail.test.ts`) is the canonical example: 25 tests covering math helpers, transitions, and edge cases.
- No browser test runner in v1 (Babylon's GPU surface needs real Chromium; deferred until perf-test pass).

## Decisions log

Append a line to `.agent-state/decisions.ndjson` for any non-trivial decision (or use commit-body `Decision:` / `Why:` / `Resolves:` lines — the post-commit hook extracts them automatically).
