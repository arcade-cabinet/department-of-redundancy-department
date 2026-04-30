---
title: Release Process
updated: 2026-04-30
status: current
domain: ops
---

# Release process

Automated via `release-please` + Conventional Commits. Tags + GitHub Releases ship from `main`; native binaries follow a manual sign-off step.

## Conventional commit prefixes

| Prefix | Bump | Use for |
|---|---|---|
| `feat:` | minor | new features |
| `fix:` | patch | bug fixes |
| `feat!:` / `BREAKING CHANGE:` | major | API breaks |
| `chore:` | none | infra, no user-facing change |
| `docs:` | none | doc-only |
| `refactor:` | none | rewrites without behavior change |
| `perf:` | patch | perf wins |
| `test:` | none | test additions |
| `ci:` | none | workflow updates |
| `build:` | none | build-system updates |

## Automated flow on push to `main`

1. `cd.yml` runs typecheck + lint + node tests + e2e + build.
2. `deploy-pages` ships `dist/` to GitHub Pages.
3. `validate-deployed` runs `playwright test --grep '@golden|@perf'` against the live URL.
4. `release-please` opens / updates a release-PR with the conventional-commit changelog.
5. Merging the release-PR cuts a GitHub Release + tag.

## Manual native sign-off

1. Pull `main` after a tagged release.
2. Run `pnpm build:native && pnpm exec cap sync` (per `docs/mobile-shell.md`).
3. iOS: `pnpm exec cap open ios`; archive in Xcode → upload to App Store Connect → TestFlight.
4. Android: `pnpm exec cap open android`; build signed AAB → upload to Play Console → Internal Testing.

## Hotfix process

1. Branch from the released tag: `git checkout -b hotfix/<short-name> v<n.n.n>`.
2. Apply the fix; commit with `fix:`.
3. Open a PR targeting `main` (not the tag); cherry-pick later if needed for the release branch.
4. release-please auto-bumps the patch version on merge.

## Pre-release smoke checklist

Before marking a release-PR green:

- [ ] `pnpm test:node` clean
- [ ] `pnpm test:browser` clean (post Phase 4 lockdown lift)
- [ ] `pnpm exec playwright test` headless (post Phase 4 lockdown lift)
- [ ] `pnpm typecheck` clean
- [ ] `pnpm exec biome check .` exit 0
- [ ] Live `validate-deployed` job green on `main`
