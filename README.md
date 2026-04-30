# Department of Redundancy Department

> *DOOM meets Minecraft, in cubicles.*
>
> A first-person voxel-prop FPS set inside an infinite procedurally generated corporate office. Mobile-first PWA, Capacitor-wrapped for iOS / Android. Persistent SQLite world. R3F + drei + Rapier renderer.

**Status:** pre-alpha (PRQ-00 scaffolding in progress).
**Live deploy:** https://arcade-cabinet.github.io/department-of-redundancy-department/

## Foundation spec

[`docs/superpowers/specs/2026-04-29-dord-foundation-design.md`](./docs/superpowers/specs/2026-04-29-dord-foundation-design.md) — read first.

## Roadmap

[`docs/ROADMAP.md`](./docs/ROADMAP.md) — alpha → beta → RC. PRQ files at [`docs/plans/`](./docs/plans/).

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
