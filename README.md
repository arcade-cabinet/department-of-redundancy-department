# Department of Redundancy Department

> *Time Crisis in cubicles.*
>
> Mobile-first arcade rail shooter set in a haunted corporate office. The rail carries you past cubicles in first-person. Aim, fire, reload, take cover, swap weapons, survive Lobby → Stairway A → Open Plan → Stairway B → HR Corridor → Stairway C → Executive Suites → Boardroom (Reaper). The arcade-cabinet experience in your pocket.
>
> Built on Babylon.js. Capacitor-wrapped for native iOS / Android. High scores via `Capacitor.Preferences` — no save blob, no SQLite. It's an arcade game.

**Status:** Babylon pivot in progress.
**Live deploy:** https://arcade-cabinet.github.io/department-of-redundancy-department/

## Read first

- **Overview:** [`docs/spec/00-overview.md`](./docs/spec/00-overview.md)
- **Pacing & time math:** [`docs/spec/01-pacing-and-time-math.md`](./docs/spec/01-pacing-and-time-math.md)
- **Encounter vocabulary:** [`docs/spec/02-encounter-vocabulary.md`](./docs/spec/02-encounter-vocabulary.md) — archetypes + fire programs
- **Difficulty & modifiers:** [`docs/spec/03-difficulty-and-modifiers.md`](./docs/spec/03-difficulty-and-modifiers.md)
- **Construction primitives:** [`docs/spec/04-construction-primitives.md`](./docs/spec/04-construction-primitives.md)
- **Screenplay language:** [`docs/spec/05-screenplay-language.md`](./docs/spec/05-screenplay-language.md) — cue-verb reference
- **Per-level screenplays:** [`docs/spec/levels/`](./docs/spec/levels/)
- **Paper playtest:** [`docs/spec/playtest-2026-04-30.md`](./docs/spec/playtest-2026-04-30.md)
- **Architecture:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Testing:** [`docs/TESTING.md`](./docs/TESTING.md)
- **Privacy policy:** [`docs/privacy-policy.md`](./docs/privacy-policy.md) — required for App Store / Play Store listings; DORD collects nothing

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
| `pnpm lint:fix` | Biome check --write (organize imports + format) |
| `pnpm test:node` | Vitest node project |
| `pnpm cap:sync` | Capacitor sync to native shells |

## License

MIT — see [LICENSE](./LICENSE).
