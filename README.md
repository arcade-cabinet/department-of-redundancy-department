# Department of Redundancy Department

> *Time Crisis in cubicles.*
>
> Mobile-first arcade rail shooter set in a haunted corporate office. The rail moves you past cubicles in first-person. Aim, fire, reload, take cover, swap weapons, survive Lobby → Stairway A → Open Plan → Stairway B → HR Corridor → Stairway C → Executive Suites → Boardroom (Reaper). Coin-op cabinet experience in your pocket.
>
> Capacitor-wrapped for native iOS / Android. R3F + drei + Rapier renderer. Persistent SQLite high-score table.

**Status:** rail-shooter pivot in progress (Phase 1 vertical slice).
**Live deploy:** https://arcade-cabinet.github.io/department-of-redundancy-department/

## Read first

- **Top-level design:** [`docs/superpowers/specs/2026-04-30-arcade-rail-shooter-design.md`](./docs/superpowers/specs/2026-04-30-arcade-rail-shooter-design.md)
- **Design canon (12 docs):** [`docs/superpowers/specs/arcade-rail-shooter/`](./docs/superpowers/specs/arcade-rail-shooter/)
- **Build plan / PRQ ledger:** [`docs/superpowers/plans/2026-04-30-arcade-rail-shooter-build.md`](./docs/superpowers/plans/2026-04-30-arcade-rail-shooter-build.md)
- **Roadmap:** [`docs/ROADMAP.md`](./docs/ROADMAP.md)
- **Architecture:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Testing:** [`docs/TESTING.md`](./docs/TESTING.md)

## Quick start

```bash
pnpm install
pnpm dev
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | Biome check |
| `pnpm test:node` | Vitest node project |
| `pnpm test:browser` | Vitest browser project (real GPU + R3F) |
| `pnpm test:e2e:ci` | Playwright smoke |
| `pnpm assets:convert` | Blender bpy: `references/` → GLB |
| `pnpm assets:check` | Verify manifest entries match disk |

## License

MIT — see [LICENSE](./LICENSE).
