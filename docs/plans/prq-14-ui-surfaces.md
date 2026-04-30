# PRQ-14: UI Surfaces — Landing Uplift, EmployeeFile, PauseMenu, Journal, GameOver

**Status:** queued

**Blocked by:** PRQ-13.

## Goal

Replace every UI placeholder with the locked brand: Departure Mono / Inter / JetBrains Mono typography, design-token CSS, stamped-form aesthetic. Polish the landing into the spec §11.3 hero. Fully implement EmployeeFile (saves browser), PauseMenu (with Stats + Settings tabs), JournalSheet (memos collected — alpha may be empty but the surface is built), and GameOver. After this PRQ: the visual gap to `references/poc.html` is unmistakable.

## Spec reference

§ 11 Brand / design tokens (locked), § 11.3 Landing page, § 11.4 In-game HUD chrome, § 19 §19.1 (visual bar — typography + chrome).

## Success criteria

- Self-hosted fonts (Departure Mono, Inter, JetBrains Mono) under `public/assets/fonts/`; `font-face` declarations in `app/styles.css`.
- Design tokens rendered as CSS custom properties (already from PRQ-00) and mirrored in `src/ui/tokens/`. Tailwind config consumes them.
- Landing page exactly per spec §11.3: HDRI-lit middle-manager hero, hairline-rule tagline, two stamped buttons, ambient hum on first gesture, lights-flicker-once entry.
- EmployeeFile view: lists saved games (alpha = single autosave); shows kill counts per slug, current floor, played seconds, threat, deaths.
- PauseMenu: Radix Tabs (Stats / Settings / Journal); Stats mirrors EmployeeFile but for live game; Settings has volume sliders + sensitivity slider + graphics tier dropdown + controls scheme radio; Journal lists collected memos.
- GameOver: stamped `YOU HAVE BEEN TERMINATED` plus stats + Restart.
- All transitions via Framer Motion (paper-shift on hover, stamp-press on click, page-fade between views).
- Lighthouse Accessibility ≥ 90 on landing.
- Visual snapshot tests baselined for every surface.

## Task breakdown

### T1: Self-host fonts

**Files:** `public/assets/fonts/{DepartureMono,Inter,JetBrainsMono}-*.woff2`, `app/styles.css` (font-face).

Pull the open licensed builds (Departure Mono + JetBrains Mono are open; Inter is open). Subset to Latin if size budget pushes; otherwise full.

**Acceptance:** dev mode shows correct fonts; network tab shows woff2 served from same origin.

### T2: Token expansion

**Files:** `src/ui/tokens/{spacing,radius,shadow,motion}.ts`, `app/styles.css` (CSS vars).

Spacing scale `[0,4,8,12,16,24,32,48,64]`; radius scale `[0,2,4,8]`; shadow scale (paper-drop, deep); motion durations `{ instant: 80, fast: 160, base: 240, slow: 480 }` ms.

**Acceptance:** node test: tokens module shape matches schema.

### T3: Radix wrappers + Framer variants library

**Files:** `src/ui/primitives/{Button,Dialog,Tabs,Slider,Switch,RadioGroup,Popover}.tsx`, `src/ui/primitives/motion.ts`.

Each wraps the underlying Radix primitive with the brand styles + `data-attr` hooks. Motion library exports reusable variants: `paperShift`, `stampPress`, `pageFade`, `flickerOnce`.

**Acceptance:** browser-tier story-style tests render each primitive.

### T4: Landing page final

**Files:** `app/views/Landing.tsx` (full rewrite).

- Three.js mini-canvas in the hero region rendering middle-manager GLB lit by HDRI.
- Tagline + subtagline + two stamped buttons.
- Audio hum loop deferred to PRQ-15; for PRQ-14, hook is in place but no-op.
- Resume button text per PRQ-12 lands automatically.

**Acceptance:** visual snapshot baselined; manual side-by-side committed to `docs/qa/landing-vs-poc.png`.

### T5: EmployeeFile view

**Files:** `app/views/EmployeeFile.tsx`.

Reads `world_meta` + `kills` + `played_seconds`; renders as stamped form. Includes `Resume` (→ Game) and `Reset` (with confirmation Dialog).

**Acceptance:** browser snapshot.

### T6: PauseMenu (Stats / Settings / Journal)

**Files:** `app/views/PauseMenu.tsx` (replace stub from PRQ-05), `src/ui/chrome/PauseTabs.tsx`.

Radix Tabs. Stats mirrors live state. Settings sliders write to preferences immediately. Journal lists `journal_entries` rows (alpha: typically empty; surface builds for PRQ-15+ memos).

**Acceptance:** browser test: changing volume slider → preferences updated; reload preserves.

### T7: GameOver final

**Files:** `app/views/GameOver.tsx` (replace stub from PRQ-08).

Stamped `YOU HAVE BEEN TERMINATED`. Per-run summary: floors cleared, kills, deaths counter incremented. `Restart` (resume on last floor) / `New employee` (wipe save + new seed).

**Acceptance:** browser snapshot.

### T8: HUD polish

**Files:** `src/ui/chrome/{HpBar,AmmoCounter,WeaponIcon,ThreatStrip,FloorStamp,Crosshair}.tsx` (refactor).

Use the new tokens + primitives. ThreatStrip tier-cross uses `flickerOnce` variant. FloorStamp uses Departure Mono.

**Acceptance:** snapshot test.

### T9: Lighthouse a11y check

**Files:** none new — invoke `pnpm dlx @lhci/cli@latest autorun --upload.target=temporary-public-storage --collect.url=http://127.0.0.1:5173/` locally.

**Acceptance:** Accessibility ≥ 90 on landing. Add gating via `lighthouserc.cjs` if not.

### T10: PR + merge

PR: `feat(ui): brand uplift + Landing/EmployeeFile/PauseMenu/Journal/GameOver (PRQ-14)`. Squash-merge after `validate-deployed` green.

## Notes

This is the second visual-bar gate. Like PRQ-02, do not merge unless the snapshot diff vs `references/poc.html` is unmistakably superior.
