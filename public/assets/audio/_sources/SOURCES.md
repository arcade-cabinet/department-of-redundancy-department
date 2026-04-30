---
title: Audio Sources
updated: 2026-04-30
status: current
domain: ops
---

# Audio sources

All packs are PixelLoops Audio (royalty-free for commercial use).

## Curated subsets

| Subdir | Source pack | Files | Curated by |
|---|---|---:|---|
| `ambience/` | Ultimate Game Ambient Sound Effects Pack | 4 | Threat-tier loops |
| `footsteps/` | Footsteps Sound Effects Pack | 16 | Carpet (wood), tile (stone), metal, armor; jump+land |
| `impact/` | Impact Hit Sound Effects Pack | 13 | Body, metal, wood, heavy, punch |
| `explosion/` | Game Explosion Sound Effects Pack | 6 | Small/medium/big + debris |
| `inventory/` | Inventory And Item Sound Effects Pack | 12 | Pickup/equip/menu/craft |
| `ui/` | PixelLoops UI Sound Effects Pack | 9 | Click/confirm/cancel/hover/error/notify/popup/unlock/achievement |
| `stinger/` | Victory Level Complete Music Pack | 6 | Floor/boss/level-up/100% |

Total: 66 files.

## License

> Royalty Free License – PixelLoops Audio
>
> All sound effects included in this package are royalty free. You are
> permitted to use them in personal and commercial projects, including
> games, videos, apps, and other multimedia productions.

See per-pack LICENSE.txt in each `references/<pack>` source dir before
that dir is purged. The LICENSE applies to ALL files in this directory
tree.

## Re-curate

Run `pnpm assets:audio` (alias for `node scripts/curate-audio.mjs`).
The script is idempotent — same inputs produce the same outputs.
