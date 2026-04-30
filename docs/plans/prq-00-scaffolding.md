# PRQ-00: Repo Scaffolding

**Status:** queued (this is the active PRQ)

## Goal

Stand up the empty repo with the full toolchain wired (vite + R3F + Capacitor + drizzle + Yuka + Koota + Radix + Framer + biome + vitest + playwright), commit-by-commit, then push to `arcade-cabinet/department-of-redundancy-department` with mean-streets-shaped CI/CD/release workflows already green. After this PRQ: `pnpm dev` runs an empty R3F canvas, all CI checks pass on a draft PR, and Pages deploys an empty placeholder on merge.

## Spec reference

`docs/superpowers/specs/2026-04-29-dord-foundation-design.md` §§ 1, 2, 11, 12, 13, 15, 19, 20.

## Success criteria

- `pnpm install` clean from a fresh checkout (frozen lockfile honored).
- `pnpm typecheck`, `pnpm lint`, `pnpm test:node`, `pnpm test:browser`, `pnpm test:e2e:ci`, `pnpm build` all green locally.
- All workflows present and matching mean-streets shape: `ci.yml`, `cd.yml`, `release.yml`, `automerge.yml`. SHA-pinned actions, mean-streets pin set.
- First merge to `main` triggers a successful Pages deployment showing a placeholder Landing page.
- `validate-deployed` Playwright job passes on the deployed URL.
- Repo created public on `arcade-cabinet` org with branch protection enabled (squash-only, linear history, required status checks: `core`, `browser`, `e2e-smoke`, `bundle-size`).
- `references/` is gitignored; `references/poc.html` (refined goalpost) preserved on disk but not tracked.
- `.agent-state/{directive,digest,cursor}.md` + `decisions.ndjson` seeded; `.claude/{settings,gates}.json` in place.

## Task breakdown

### T1: Initialize git + .gitignore + LFS attributes + LICENSE + README

**Files:** `.gitignore`, `.gitattributes`, `.nvmrc`, `LICENSE`, `README.md`.

`.gitignore` covers `node_modules/`, `dist/`, `.vite/`, Capacitor build dirs, `references/`, `*.log`, `.env*`, `.DS_Store`. `.gitattributes` puts `public/assets/{audio,models,hdri}/**` under LFS and marks `pnpm-lock.yaml` as `linguist-generated`. `.nvmrc` = `22`. MIT license. README is a 1-page pointer to the foundation spec + quick-start commands.

**Acceptance:** `git init && git status` shows the five files staged-clean; `git check-ignore references/` matches.

### T2: Park existing artifacts under `references/`

**Files:** `references/poc-original.html`, `references/poc2.html`, `references/conversation.md`.

Move the root `poc.html`, `poc2.html`, `conversation.md` (or `.html`) into `references/`. The refined `references/poc.html` stays where it is — it's the visual goalpost.

**Acceptance:** repo root has no stray HTML/MD POC files outside `references/` and the canonical docs.

### T3: `package.json` with full pinned dependency set

**Files:** `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

Dependencies match spec §2 verbatim: `@react-three/{fiber,drei,rapier}`, `three`, `three-mesh-bvh`, `yuka`, `koota`, `@radix-ui/*`, `framer-motion`, `tailwindcss@4`, `drizzle-orm`, `sql.js`, `jeep-sqlite`, `@capacitor/*` 8.x, `@capacitor-community/sqlite`, `@capacitor/preferences`, React 19. Dev deps: TS 5.7, Vite 6, Vitest 4, Playwright 1.59, Biome 2.3, drizzle-kit, size-limit, `@types/*`. Scripts cover `dev`, `build`, `typecheck`, `lint`, `test:{node,browser,e2e,e2e:ci}`, `assets:{convert,check}`, `cap:sync`, `drizzle:{gen,push}`. `predev`/`prebuild` chain `prepare:public` (copy WASM) + `assets:check`. `engines.node = ">=22"`. `packageManager = "pnpm@10.33.0"`.

**Acceptance:** `pnpm install` succeeds; `pnpm-lock.yaml` produced; `pnpm dlx tsc --version && pnpm dlx vite --version` print cleanly.

### T4: TypeScript + Biome configs

**Files:** `tsconfig.json`, `tsconfig.node.json`, `biome.json`, `src/vite-env.d.ts`.

`tsconfig.json` strict: `strict: true`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, JSX `react-jsx`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, paths `@/* → src/*`, `@app/* → app/*`. `biome.json` extends 2.3 schema, ignores `dist/`, `references/`, `src/db/migrations/`; tab indent 2; quote single; trailing commas all.

**Acceptance:** `pnpm typecheck` and `pnpm lint` both clean (no source files yet).

### T5: Vite / Vitest / Playwright / Capacitor / Drizzle configs

**Files:** `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `capacitor.config.ts`, `drizzle.config.ts`.

`vite.config.ts` reads `GITHUB_PAGES` to flip `base` to `/department-of-redundancy-department/`; entry is `app/index.html`; React + Tailwind plugins; alias `@`/`@app`. `vitest.config.ts` has two projects: `node` (logic) and `browser` (Vitest browser w/ Playwright Chromium). `playwright.config.ts` reads `DORD_BASE_URL` (defaults `127.0.0.1:5173`); `webServer` only spawns when target is local. `capacitor.config.ts` declares `appId: cabinet.arcade.dord`, `webDir: dist`, SQLite plugin config. `drizzle.config.ts` points at `src/db/schema/index.ts` → `src/db/migrations/`, dialect sqlite.

**Acceptance:** `pnpm typecheck` clean.

### T6: App entry + empty Landing/Game views + token CSS

**Files:** `app/index.html`, `app/main.tsx`, `app/App.tsx`, `app/styles.css`, `app/views/{Landing,Game}.tsx`, `app/shell/Routes.tsx`, `src/ui/tokens/index.ts`, `scripts/copy-wasm.mjs`, `scripts/check-asset-manifest.mjs`, `public/content/{recipes,memos,narrator-grammar}.json` stubs.

`Landing.tsx` renders the title + `CLOCK IN` button (`data-testid="clock-in"`). `Game.tsx` mounts `<Canvas>` from `@react-three/fiber` with one ambient light + a placeholder cube + an `EXIT` button. `Routes.tsx` toggles between `landing` and `game` via local state (no router yet). Tokens exported as a typed const + mirrored to CSS custom properties in `styles.css`. `copy-wasm.mjs` is a stub that creates `public/wasm/` (populated in PRQ-04). `check-asset-manifest.mjs` passes when manifest absent (PRQ-01 produces it).

**Acceptance:** `pnpm dev` serves at `127.0.0.1:5173`; landing renders; clicking `CLOCK IN` shows the canvas and EXIT returns; `pnpm build` produces clean `dist/`.

### T7: Vitest smoke (node + browser projects)

**Files:** `src/shared/utils/{index.ts,index.test.ts}`, `app/views/Landing.browser.test.tsx`. Add `@testing-library/react` + `@testing-library/dom` to devDependencies.

`clamp(value, min, max)` with three test cases (within/below/above) for the node project. `Landing.browser.test.tsx` renders `<Landing/>`, asserts the button exists, fires click, asserts `onClockIn` callback fired.

**Acceptance:** `pnpm test:node` 3/3 green; `pnpm test:browser` 1/1 green.

### T8: Playwright golden + perf smoke

**Files:** `e2e/smoke.spec.ts`.

Two tests: `@golden` — load `/`, assert `data-testid="landing"` visible, click `CLOCK IN`, assert `data-testid="game"` visible. `@perf` — load `/` and assert TTI < 5000ms (placeholder budget; tightened in PRQ-18).

**Acceptance:** `pnpm exec playwright install chromium` then `pnpm build && pnpm test:e2e:ci` both pass.

### T9: Project memory + agent state seeding

**Files:** `CLAUDE.md`, `AGENTS.md`, `.agent-state/{directive,digest,cursor}.md`, `.agent-state/decisions.ndjson` (empty), `.claude/settings.json`, `.claude/gates.json`.

`CLAUDE.md` includes `~/.claude/profiles/{standard-repo,ts-browser-game}.md` via absolute-path `@includes`, names the foundation spec, and locks the critical rules (R3F-only, no fog, no animations, no joysticks, mean-streets workflows). `AGENTS.md` mirrors grovekeeper's session-startup + autonomy rules verbatim with DORD-specific PRQ protocol. Directive lists alpha PRQ-00..18 in order with hard sequencing rule. Digest gives a ~10-line state summary. Cursor names current PRQ + Task + branch. `.claude/settings.json` allows the bash + gh + git operations the autonomous loop uses; `gates.json` enforces per-scope coverage rules per spec §15.

**Acceptance:** all seven files exist; `cat .agent-state/directive.md` shows `Status: ACTIVE`; `~/.claude/profiles/{standard-repo,ts-browser-game}.md` resolve.

### T10: Seed all PRQ files + EXECUTION + AUTONOMY runbooks + docs pointers

**Files:** `docs/{DESIGN,ARCHITECTURE,ROADMAP,TESTING}.md`, `docs/plans/EXECUTION.md`, `docs/plans/AUTONOMY.md`, `docs/plans/prq-{01..18}-<slug>.md` populated, plus stubbed beta + RC PRQ files (header only, body to be written when promoted).

`EXECUTION.md` + `AUTONOMY.md` cribbed from chonkers conventions: PR-per-PRQ, parallel reviewer trio dispatched per commit, gh + GraphQL recipes for the merge gate. Doc pointers are 1-line references to spec sections.

**Acceptance:** `ls docs/plans/prq-*.md | wc -l` ≥ 18 alpha + 10 beta + 8 RC = 36; `head -3 docs/plans/prq-01-asset-pipeline.md` shows the standard `# PRQ-01: <title>` shape.

### T11: GitHub workflows + dependabot + PR/issue templates + release-please config

**Files:** `.github/workflows/{ci,cd,release,automerge}.yml`, `.github/dependabot.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/{bug,feat,prq-blocker}.yml`, `release-please-config.json`, `.release-please-manifest.json`.

`ci.yml` triggers on `pull_request:` only with jobs `core` (typecheck/lint/test:node/build), `browser` (xvfb-run + test:browser), `e2e-smoke` (playwright), `bundle-size` (size-limit). `cd.yml` triggers on `push: main` + `workflow_dispatch` with jobs `release-checks` → `deploy-pages` (post-build LFS pull only for `public/assets/{audio,models,hdri}/`) → `validate-deployed` (Playwright against the live `page_url`). `release.yml` runs release-please on every push and builds the web tarball when `release_created == 'true'`. `automerge.yml` auto-approves + auto-squash-merges dependabot + release-please PRs. All actions SHA-pinned to the mean-streets pin set (spec §20.5).

**Acceptance:** `pnpm dlx js-yaml .github/workflows/*.yml > /dev/null` all parse; pin SHAs match spec §20.5 verbatim.

### T12: GitHub repo creation + initial push + Pages enable + branch protection

**Files:** `scripts/setup-github.mjs` (idempotent gh CLI wrapper).

The script verifies `gh auth status`, asserts `arcade-cabinet` org membership, creates the public repo if absent (`gh repo create --public --source=. --remote=origin --push`), applies repo settings (squash-only, linear history, delete-on-merge, has_discussions=true), enables Pages with `build_type=workflow`, sets topics (`game`, `fps`, `voxel`, `r3f`, `capacitor`, `mobile-game`), and applies branch protection on `main` requiring `core` + `browser` + `e2e-smoke` + `bundle-size` checks. After running it: watch `cd.yml` complete; verify `https://arcade-cabinet.github.io/department-of-redundancy-department/` returns 200; append a decisions-log line; update digest + cursor + directive to mark PRQ-00 done.

**Acceptance:** `gh repo view arcade-cabinet/department-of-redundancy-department` shows public + Pages URL; `cd.yml` run completes green including `validate-deployed`; `curl -fsS <page_url>` returns 200; `.agent-state/directive.md` shows PRQ-00 ticked.

## Notes

This is the only PRQ where the agent runs against a brand-new GitHub repo. PRQ-01 onward operates against the live remote with PR-per-PRQ + squash-merge.
