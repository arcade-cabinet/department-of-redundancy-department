---
title: Execution Runbook — DORD
updated: 2026-04-29
status: current
domain: ops
---

# Execution Runbook

The operations procedure for landing DORD PRQs as autonomous PRs. Each PRQ lands as exactly one PR; each PR satisfies its acceptance criteria before merging; each commit dispatches reviewer agents; reviewer feedback is automated through GraphQL (see [AUTONOMY.md](./AUTONOMY.md)).

The repo (`arcade-cabinet/department-of-redundancy-department`) follows the same conventions as `arcade-cabinet/{grovekeeper, chonkers, mean-streets}` — workflows, action SHA pins, branch protection, squash-merge-only, conventional commits, release-please. Where the patterns differ between those repos, **DORD aligns to mean-streets** (current org reference; see foundation spec §20.4).

## Pre-execution checklist

Before starting work on any PRQ:

1. Confirm `.agent-state/digest.md` reflects current state (the on-commit hook updates it; if it looks stale, run `pnpm run update-digest` to refresh manually — wired in PRQ-00 if needed).
2. Confirm the PRQ's `Blocked by` predecessor is `[x]` in `.agent-state/directive.md`. If not, work the predecessor first.
3. Confirm `gh auth status` is green and the working tree is clean (`git status` empty).
4. Read the PRQ file in full. Re-read the relevant spec sections it points at.
5. If the PRQ is **stub-only** (beta + RC start as stubs): your first commit on that PRQ's branch is to flesh out the plan to PRQ-00..PRQ-18 depth. Then proceed.

## PR workflow

### 1. Branch creation

```bash
git checkout main
git pull --rebase
git checkout -b prq-NN-<slug>
```

Branch names: `prq-NN-<slug>` for alpha, `prq-bN-<slug>` for beta, `prq-rcN-<slug>` for RC.

### 2. Task execution loop

For each task in the PRQ's `Task breakdown`, in order:

1. **Read the task description + acceptance criteria** in the PRQ.
2. **Write tests first** (red bar) when the task is a test-task. Verify failure: `pnpm test:node <path>` or `pnpm test:browser <path>` should fail with the expected reason.
3. **Implement** until tests pass.
4. **Run the relevant suite for the package being touched.** At minimum every commit:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test:node` for any logic touched
   - `pnpm test:browser` if rendering / R3F / BVH / Rapier touched
   - `pnpm test:e2e:ci` for visual-shell or floor-transition or input touched
5. **Commit** with Conventional Commits — e.g. `feat(ai): yuka navmesh build (PRQ-06 T1)`. Message body briefly describes WHY the change matters (1–3 sentences). Sign with the standard `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer.
6. **Dispatch reviewer trio** scoped to the commit's diff, in parallel + background:
   - `comprehensive-review:full-review` — architecture + design + style sweep
   - `security-scanning:security-sast` — security-specific anti-patterns
   - `code-simplifier:code-simplifier` — over-abstraction / dead code
7. **Continue to the next task immediately.** Do NOT wait for reviewer agents to complete. Fold their findings into the next forward commit when they surface; never amend the commit they reviewed.

### 3. PR creation

When all PRQ tasks are committed:

```bash
gh pr create \
  --title "feat(<scope>): <PRQ acceptance summary> (PRQ-NN)" \
  --body "$(cat <<'EOF'
## PRQ

[PRQ-NN: <title>](docs/plans/prq-NN-<slug>.md)

## Summary

<2-3 bullets covering deliverables>

## Acceptance criteria

<checked list copied from PRQ Success criteria>

## DoD checklist

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test:node`
- [ ] `pnpm test:browser` (if applicable)
- [ ] `pnpm test:e2e:ci`
- [ ] Local manual verification (where applicable)
- [ ] Visuals exceed `references/poc.html` baseline (visual-touching PRQs only)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 4. Merge gate

The merge gate from [AUTONOMY.md](./AUTONOMY.md) is satisfied when:

- `mergeable == "MERGEABLE"`.
- `mergeStateStatus == "CLEAN"`.
- `reviewDecision == "APPROVED"` OR `null` (no required reviewers configured for solo agent work).
- All review threads resolved (queried separately — see AUTONOMY.md).
- All four CI checks green: `core`, `browser`, `e2e-smoke`, `bundle-size`.

When all are satisfied:

```bash
gh pr merge --squash --delete-branch
```

The squash-merge title is the PR title; the body is the PR body (review acceptance + DoD checklist).

### 5. Post-merge gate (the alpha bar)

After squash-merge, **wait for `cd.yml` to complete on `main`**, including the `validate-deployed` job. Only then is the PRQ truly complete.

If `validate-deployed` is red on `main`:
- Open a fast-follow fix PR (`prq-NN-fix-deployed`).
- Do NOT mark the PRQ complete in `.agent-state/directive.md` until the next `cd.yml` is green.

When green:

```bash
# update directive
sed -i '' "s|^- \[ \] PRQ-NN:|- [x] PRQ-NN:|" .agent-state/directive.md
# log decision
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "{\"ts\":\"$ts\",\"slug\":\"prq-NN-complete\",\"kind\":\"event\",\"why\":\"validate-deployed green on main\",\"resolves\":\"PRQ-NN\"}" >> .agent-state/decisions.ndjson
# refresh cursor
# ...write next PRQ pointer
git add .agent-state/
git commit -m "chore(state): mark PRQ-NN complete"
git push
```

The next `cd.yml` run for that state-only commit re-validates the deploy (idempotent). Then move to PRQ-(NN+1).

## Reading review feedback

### Line-level review comments

Reviewer agents post comments on specific files/lines. Read each, classify:

- **Bug or correctness issue** → fix in next commit, reply with the fix commit SHA.
- **Style or readability nit** → fix if cheap; otherwise reply explaining why deferring.
- **Architectural disagreement** → assess against spec; if spec wins, reply with spec section reference; if reviewer wins, fix.

Never amend a reviewed commit. Always fix forward.

### CodeRabbit / Gemini integration (when applicable)

If GitHub-hosted bots are enabled later (post-RC), follow the same pattern: classify, fix forward, reply with commit SHA.

## Stop conditions

Halt the autonomous loop and ask the user when:

- A test you can't make pass blocks > 1 hour of work.
- A spec ambiguity blocks design choice.
- A dependency upgrade requires a coordinated change across mean-streets / chonkers / grovekeeper.
- Any irreversible action is required (force-push to main, secret rotation, repo deletion).
- A PRQ's success criteria cannot be met within reasonable scope; the PRQ likely needs decomposition.

Otherwise, continue.
