# AGENTS.md — Department of Redundancy Department

## Session startup

1. Read `.agent-state/digest.md` (~10 lines).
2. Read `.agent-state/cursor.md`.
3. Read `.agent-state/directive.md`.
4. If working on a PRQ: open `docs/plans/prq-NN-<slug>.md`.

Do NOT read everything. Trust the digest.

## Persistent state layout

```
.agent-state/
├── directive.md          # ordered work queue; Status: ACTIVE / RELEASED
├── digest.md             # ~10-line state summary
├── cursor.md             # current PRQ + Task + branch
└── decisions.ndjson      # append-only
```

## Autonomous operation rules

- Continuous work: when one task finishes, start the next per directive.
- One PR per PRQ; one commit per task within it.
- After each commit: dispatch parallel reviewer trio (`comprehensive-review:full-review` + `security-scanning:security-sast` + `code-simplifier:code-simplifier`) scoped to commit's diff. Fold findings forward; never amend a reviewed commit.
- Stubs / TODOs / `pass` bodies / `as any` / `it.todo` are bugs. Fix or delete.
- Refactors not shims: when a module moves, every caller moves with it in the same commit.
- PR feedback: address everything. Wait for CI. Never `--admin` merge. Never `--no-verify`.
- Back up `~/.claude/settings.json` to `~/backups/` before modifying.

## PRQ execution protocol

1. Open the PRQ file.
2. For each task `Tn`: TDD where applicable (RED → GREEN → REFACTOR → COMMIT).
3. After PRQ done: ensure CI green, e2e green if applicable, squash-merge.
4. Wait for `cd.yml`'s `validate-deployed` to be green on `main` before declaring the PRQ complete.
5. Update `.agent-state/directive.md` to mark the PRQ done.

## Rendering rule

Single pipeline through R3F + drei. No bare three.js. No JollyPixel.

## Audio rule

`GlobalAudio` wrapper over `THREE.Audio` + listener. Not Howler. Not bare THREE.Audio.

## Test diagnostic surface

- Vitest node — pure logic.
- Vitest browser (via `@vitest/browser-playwright`) — R3F components, BVH raycast, Rapier collisions.
- Playwright — golden-path + perf.

## Decisions log

Append a line to `.agent-state/decisions.ndjson` for any non-trivial decision:

```jsonc
{"ts":"2026-04-29T17:00:00Z","slug":"workflow-pin-set","kind":"choice","why":"mean-streets parity","resolves":"PRQ-00"}
```
