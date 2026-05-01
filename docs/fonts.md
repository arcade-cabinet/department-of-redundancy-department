---
title: Self-hosted fonts
updated: 2026-04-30
status: current
domain: technical
---

# Self-hosted fonts

The project ships three open-licensed font families served from same-origin so iOS / Capacitor + offline runs never fall back to system defaults. Required by the brand spec in [`docs/superpowers/specs/2026-04-30-arcade-rail-shooter-design.md`](./superpowers/specs/2026-04-30-arcade-rail-shooter-design.md).

| Role | Family | File | License |
|---|---|---|---|
| Display / arcade glyph (score, lives, headers) | Departure Mono | `public/assets/fonts/DepartureMono-Regular.woff2` | OFL 1.1 |
| Body / numerics / HUD copy | Inter (variable, weights 100–900) | `public/assets/fonts/Inter-Variable.woff2` | OFL 1.1 |
| Debug / dev overlays | JetBrains Mono | `public/assets/fonts/JetBrainsMono-Regular.woff2` | OFL 1.1 |

Sources: <https://departuremono.com/>, <https://rsms.me/inter/>, <https://www.jetbrains.com/lp/mono/>.

## Registration

`@font-face` declarations live inline in `index.html`. Babylon GUI controls reference the family names `'Departure Mono'`, `'Inter'`, `'JetBrains Mono'` — do not invent new aliases or stack fallbacks; if a control needs a font, set it explicitly.

`font-display: block` is used so the cabinet UI never momentarily renders in a system stack — short flash of nothing is preferable to type-shift in an arcade frame.
