---
title: Autonomy — gh + GraphQL recipes for autonomous PR cycles
updated: 2026-04-29
status: current
domain: ops
---

# Autonomy: gh + GraphQL Recipes

Concrete tooling for the autonomous PR feedback cycle described in [EXECUTION.md](./EXECUTION.md). Every recipe is verified against the GitHub GraphQL v4 API and the `gh` CLI. The repo `arcade-cabinet/department-of-redundancy-department` is owned by the executor's GitHub identity, with `repo` token scope.

## Mergeable-state polling

```bash
gh api graphql -f query='
query($owner: String!, $name: String!, $pr: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      mergeable
      mergeStateStatus
      reviewDecision
      isDraft
      headRefOid
      commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
    }
  }
}' -F owner=arcade-cabinet -F name=department-of-redundancy-department -F pr=$PR
```

`reviewDecision` values:
- `APPROVED` — at least one approving review, no requested-changes outstanding.
- `CHANGES_REQUESTED` — at least one outstanding requested-changes review.
- `REVIEW_REQUIRED` — required reviewer not yet submitted.
- `null` — no required reviewers (default for DORD pre-RC).

The merge gate from EXECUTION.md is satisfied when:
- `mergeable == "MERGEABLE"`.
- `mergeStateStatus == "CLEAN"`.
- `reviewDecision == "APPROVED"` OR `null`.
- All review threads resolved (queried below).
- `statusCheckRollup.state == "SUCCESS"` on the head commit.

## Resolving review threads

```bash
# list unresolved threads
gh api graphql -f query='
query($owner: String!, $name: String!, $pr: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes { id isResolved comments(last: 1) { nodes { body author { login } } } }
      }
    }
  }
}' -F owner=arcade-cabinet -F name=department-of-redundancy-department -F pr=$PR \
   --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {id, body: .comments.nodes[0].body}'

# resolve a thread by ID
gh api graphql -f query='
mutation($id: ID!) {
  resolveReviewThread(input: { threadId: $id }) {
    thread { isResolved }
  }
}' -F id="$THREAD_ID"
```

Pattern: walk the unresolved threads, classify per EXECUTION.md, push the fix commit, **reply** to the thread referencing the fix SHA, then resolve.

```bash
# reply to a thread
gh api graphql -f query='
mutation($id: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $id, body: $body }) {
    comment { id }
  }
}' -F id="$THREAD_ID" -F body="Addressed in $FIX_SHA — <one-line summary>."
```

## CI status polling

```bash
gh run list --branch=$(git branch --show-current) --limit 5
gh run view <run_id> --log    # only when needed; redirect to file for context-mode parsing
```

For `cd.yml` post-merge:

```bash
gh run list --workflow=cd.yml --branch=main --limit 1 --json databaseId,status,conclusion
gh run watch <run_id>          # blocks until done — use sparingly; prefer poll loop in autonomous mode
```

## Branch protection probe

```bash
gh api repos/arcade-cabinet/department-of-redundancy-department/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts, reviews: .required_pull_request_reviews}'
```

If protection has drifted from PRQ-00 setup, re-run `node scripts/setup-github.mjs` (idempotent).

## Concurrency control

The `concurrency:` group in workflows ensures only one `cd.yml` per branch runs at a time. If a fast-follow PR lands while a previous `cd.yml` is mid-flight, the newer one queues — no manual intervention.

For `release.yml`, `concurrency.group = release-${{ github.ref }}` with `cancel-in-progress: false` so an in-flight tag build never gets cancelled.

## Forbidden operations

- `git push --force` to main — never. Use `--force-with-lease` only on personal feature branches.
- `gh pr merge --admin` — never. If branch protection blocks, fix the underlying check.
- `--no-verify` on commit/push — never.
- Force-disabling required status checks — never.
- Rotating `CI_GITHUB_TOKEN` without a coordinated rotation across mean-streets / chonkers / grovekeeper.

## Decision log discipline

Every non-trivial decision appends a line to `.agent-state/decisions.ndjson`:

```jsonc
{
  "ts": "2026-04-29T17:00:00Z",
  "slug": "<short-decision-slug>",
  "kind": "choice|event|override|risk",
  "why": "<≥10-word rationale>",
  "resolves": "<PRQ-NN[/Tn]>"
}
```

Query later via `ctx_search source:"decisions:dord"` if context-mode is configured.
