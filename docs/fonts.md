---
title: Self-hosted fonts
updated: 2026-04-30
status: current
domain: technical
---

# Self-hosted fonts

The project depends on three open-licensed font families served from same-origin so iOS / Capacitor + offline runs don't fall back to system defaults. Required by the brand spec in [`docs/superpowers/specs/2026-04-30-arcade-rail-shooter-design.md`](./superpowers/specs/2026-04-30-arcade-rail-shooter-design.md) (Departure Mono UI + Inter body + JetBrains Mono debug).

## Required files

| File | Source | License |
|---|---|---|
| `DepartureMono-Regular.woff2` | <https://departuremono.com/> | OFL 1.1 |
| `Inter-Regular.woff2` | <https://rsms.me/inter/> | OFL 1.1 |
| `Inter-Medium.woff2` | <https://rsms.me/inter/> | OFL 1.1 |
| `Inter-SemiBold.woff2` | <https://rsms.me/inter/> | OFL 1.1 |
| `JetBrainsMono-Regular.woff2` | <https://www.jetbrains.com/lp/mono/> | OFL 1.1 |

## Provisioning

Until a `pnpm run assets:fonts` script lands, drop the woff2 binaries into this directory by hand. The font-face declarations in `app/styles.css` use `font-display: swap` so the build doesn't break on a missing file — it falls back to system stacks until the binaries exist.

The Inter subset to Latin if size budget pressure (currently each woff2 is ~30 KB Latin / ~80 KB full).
