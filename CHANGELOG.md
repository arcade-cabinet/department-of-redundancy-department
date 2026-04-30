# Changelog

## [1.1.0](https://github.com/arcade-cabinet/department-of-redundancy-department/compare/v1.0.0...v1.1.0) (2026-04-30)


### Features

* **ai:** middle-manager FSM + perception + hitscan + spawner + HUD (PRQ-08) ([#15](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/15)) ([a98ba8a](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a98ba8a4c3bab370647ba0b8ef29e42f5aae183a))
* **ai:** threat system + spawn director + tier archetypes (PRQ-10) ([#17](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/17)) ([4366210](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/4366210cbb6bceac8a0c09a5ebd39a003080ed01))
* **ai:** yuka navmesh + rapier kinematic player + tap-to-travel (PRQ-06) ([#13](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/13)) ([378ab32](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/378ab32227f9f29f345b438292495ff4329d68e3))
* **assets:** asset pipeline — bpy convert + gltf-transform optimize + PolyHaven fetch (PRQ-01) ([#6](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/6)) ([63e585c](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/63e585c479dae9934f1eef806304eb0e2de271ca))
* **beta-content:** M4 — full weapon roster + damage zones + enemy variants + floor archetypes + recipes + skill gates + traps (PRQ-B0+B6+B7+B2+B1+B8+B3) ([#24](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/24)) ([d03537f](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/d03537f5a688006d720fa659655436bf073f2fc9))
* **beta-polish:** M5 — Tracery narrator + threat-tier ambience layers + mobile UX helpers (PRQ-B5+B4+B9) ([#25](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/25)) ([a539d84](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a539d8445051c99bec024480e7b6299b09554fd0))
* **combat:** weapons + Equipped + melee/autoEngage/pickups + HUD chrome + PRQ-08 fixes (PRQ-09) ([#16](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/16)) ([6783fea](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/6783fea753d8c353f1e34d1ce4ff615b29d9a9c3))
* **input:** tap/hold/drag classifier + radial menu + pause + desktop fallback (PRQ-05) ([#12](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/12)) ([a3e2ec7](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a3e2ec7379e5be2711d3aa8b2f73944374132c8b))
* **persistence:** drizzle + sql.js/capacitor-sqlite adapters + repos + save loop (PRQ-04) ([#10](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/10)) ([8a51880](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/8a51880d8c07645b7f94ef1b8f9f123a90ea98f0))
* **presentation:** M2 — design tokens, primitives, archetype enemies, projectile + pickup R3F, radial wiring, audio system, UI rewrites (PRQ-14 + PRQ-15 + deferred R3F) ([#21](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/21)) ([3932f60](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/3932f60e08718cffcbdd64a49c3c10896400403e))
* **rc-hardening:** M6 — perf budget tables + WCAG-AA contrast + save blob round-trip (PRQ-RC0+RC1+RC2) ([#26](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/26)) ([7f7bf57](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/7f7bf57dfac2ddbc947457f0098e16ee42517b81))
* **rc-release:** M7 — i18n scaffold + native-packaging runbook + release-process doc (PRQ-RC5+RC4+RC7) ([#27](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/27)) ([033ce38](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/033ce385fbc665ecaaf741ce39b2ada1e2dc0d05))
* **render:** hop-walk locomotion + Character component (PRQ-07) ([#14](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/14)) ([921c4f1](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/921c4f10261f09743aeeca39fc8f7e400af18767))
* **render:** render foundation — Lighting + Maze + dual-track Rng (PRQ-02) ([#8](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/8)) ([9346ca9](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/9346ca91ba5073156a740b8c73b6fd267a64f002))
* **ship-prep:** M3 — golden-path e2e + perf budget assertions + Capacitor lifecycle (PRQ-17 + PRQ-18 + PRQ-16) ([#22](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/22)) ([c8264cc](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/c8264cc746320bdc6e3509e6dd79379b1edf811d))
* **stairwells:** door placement + floor swap engine + audio cue bus + last_floor resume (PRQ-12 logic) ([#19](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/19)) ([44eb943](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/44eb943eb0445fccccba215aedf04fadc6b9da38))
* **world-loop:** M1 — Door/Transition R3F + HR Reaper boss + every-5-floors gate (PRQ-12 deferred + PRQ-13) ([#20](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/20)) ([df6b5a0](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/df6b5a0f629d580363b5581dfa1d7b621803f631))
* **world:** chunked voxel world + seeded floor generator + per-chunk BVH (PRQ-03) ([#9](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/9)) ([4685fad](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/4685fad5d43012074745cf90fa0cef6bbd477f4c))


### Bug Fixes

* **e2e:** rebuild for preview server + eager-install __dord namespace + realistic perf budgets (alpha verification) ([#23](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/23)) ([b303423](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/b30342312fde3f0707ee12b0042a1a8677a2358c))
* **persistence:** code review fold-forward (PRQ-04) ([#11](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/11)) ([2349915](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/23499153e42b7e1f5b21b7c652a7eb09a8e5db8f))

## 1.0.0 (2026-04-30)


### Features

* **app:** empty Landing + Game views with R3F canvas (PRQ-00 T6) ([3f0c8a2](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/3f0c8a20925a80291078776289c79eec40baa2bc))


### Bug Fixes

* **e2e:** trim trailing slash from DORD_BASE_URL (PRQ-00 T12 follow-up) ([#5](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/5)) ([a4a4e07](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a4a4e079ddec4c94d6ffccb16ae432b65ea8d07f))
