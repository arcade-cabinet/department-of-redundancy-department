# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [1.1.2](https://github.com/arcade-cabinet/department-of-redundancy-department/compare/v1.1.1...v1.1.2) (2026-05-03)


### Bug Fixes

* **ci:** pin Xcode 15.4 (Swift 5.10) for capacitor plugin compat ([#111](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/111)) ([b39bd93](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/b39bd9313378bf80bb79c9b3376aaf3ce9a8d867))

## [1.1.1](https://github.com/arcade-cabinet/department-of-redundancy-department/compare/v1.1.0...v1.1.1) (2026-05-03)


### Bug Fixes

* **ci:** allow ios archive without signing secrets (validation-only) ([#109](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/109)) ([69f227f](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/69f227f802f42746ff491c51422770d3c432043d))
* **ci:** allow workflow_dispatch to rebuild artifacts for existing tag ([#106](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/106)) ([0012639](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/0012639ab828382e6742863bfd61c06f6c1d2ce6))
* **ci:** build-ios continue-on-error until signing + plugin compat ready ([#110](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/110)) ([59ff9d6](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/59ff9d63e91451176c47269ad903e274f2e3b30b))
* **ci:** correct setup-java SHA + Xcode path in native build jobs ([#104](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/104)) ([e68b426](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/e68b426c8b2a372d5bd39f4f1b4688446d9b0649))
* **ci:** Java 21 for Android, drop Pod install for Capacitor 8 SPM ([#107](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/107)) ([ca8e61d](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/ca8e61d42f19cb81c00e92c1adf53929d3e685bd))
* **ci:** xcodebuild -project (SPM) not -workspace (CocoaPods) ([#108](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/108)) ([73b7ef3](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/73b7ef357e32c74628c81fc43b3a71e92908dc41))

## [1.1.0](https://github.com/arcade-cabinet/department-of-redundancy-department/compare/v1.0.0...v1.1.0) (2026-05-03)


### Features

* **ai:** middle-manager FSM + perception + hitscan + spawner + HUD (PRQ-08) ([#15](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/15)) ([a98ba8a](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a98ba8a4c3bab370647ba0b8ef29e42f5aae183a))
* **ai:** threat system + spawn director + tier archetypes (PRQ-10) ([#17](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/17)) ([4366210](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/4366210cbb6bceac8a0c09a5ebd39a003080ed01))
* **ai:** yuka navmesh + rapier kinematic player + tap-to-travel (PRQ-06) ([#13](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/13)) ([378ab32](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/378ab32227f9f29f345b438292495ff4329d68e3))
* **assets:** asset pipeline — bpy convert + gltf-transform optimize + PolyHaven fetch (PRQ-01) ([#6](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/6)) ([63e585c](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/63e585c479dae9934f1eef806304eb0e2de271ca))
* **audio:** A.10 — wire 7 missing SFX cues + fix 2 broken paths ([#81](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/81)) ([2f07142](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/2f07142ab7b51d29a1ec787ad8fe6c3d7cc92598))
* **audio:** AudioBus + audio-stinger / ambience-fade cue verbs ([#35](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/35)) ([e3b9eaf](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/e3b9eaf01b890f7dabfe1939f587655902ed0c89))
* **babylon:** pivot to Babylon.js arcade rail shooter ([#30](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/30)) ([46d46b1](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/46d46b155b4ec4bbf599edecc46471a39f8d2e64))
* **beta-content:** M4 — full weapon roster + damage zones + enemy variants + floor archetypes + recipes + skill gates + traps (PRQ-B0+B6+B7+B2+B1+B8+B3) ([#24](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/24)) ([d03537f](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/d03537f5a688006d720fa659655436bf073f2fc9))
* **beta-polish:** M5 — Tracery narrator + threat-tier ambience layers + mobile UX helpers (PRQ-B5+B4+B9) ([#25](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/25)) ([a539d84](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a539d8445051c99bec024480e7b6299b09554fd0))
* **boardroom:** PRQ A.8 — Reaper Phase-2 chandelier swing ([#84](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/84)) ([4d33d8c](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/4d33d8cfadb500dc26319afc09a1cc229f442595))
* **boss:** bespoke fire programs for all 5 named bosses ([#48](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/48)) ([7d61653](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/7d61653d060b065c575817a29c560e16e91a9359))
* **canonical-run:** strip picker + daily, add quarter economy + health kits ([#56](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/56)) ([79b8799](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/79b87991d7e99383110996f67f5e965551db9eb7))
* **ci:** PRQ B.5 — Android build job in release.yml ([#90](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/90)) ([9ea4f0e](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/9ea4f0e247928026bba1171e533fafbaf85d192b))
* **ci:** PRQ B.6 — iOS build job in release.yml ([#91](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/91)) ([852fb8a](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/852fb8a47be1880fdea1b6357865586de9b9ff67))
* **combat:** enemies slide along their authored spawn rails ([#36](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/36)) ([99dd7c7](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/99dd7c7c6e35f939ab25b29e0d7eebe3d7b079df))
* **combat:** reticle hit-test + pointer-down fire + scoring ([#32](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/32)) ([e8143c9](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/e8143c94b8f8dfa6437124f6bbe0ac32f927773e))
* **combat:** weapons + Equipped + melee/autoEngage/pickups + HUD chrome + PRQ-08 fixes (PRQ-09) ([#16](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/16)) ([6783fea](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/6783fea753d8c353f1e34d1ce4ff615b29d9a9c3))
* **cues:** boss-spawn + boss-phase via BOSSES table ([#47](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/47)) ([9ea990a](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/9ea990a5edcd75a66448dab65ae0073aae83afd6))
* **cues:** narrator + camera-shake handlers ([#45](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/45)) ([6d9b368](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/6d9b368c5fecb69f91094367e38ce3722da77d52))
* **cues:** pending-cue queue drains on handles-ready ([#57](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/57)) ([54dad8f](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/54dad8f5ca0adddcea964333f823822bd20bcd3f))
* **cues:** prop-anim handler (drop / roll-in / shatter) ([#46](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/46)) ([e74881e](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/e74881ef092bd76f3004d08bd8dcfa57448410db))
* **daily:** daily-challenge modifier selection + visible UI ([#50](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/50)) ([faab872](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/faab872d9c16c8a11f29a3b601c695bfc500d0fa))
* **daily:** wire 4 more modifier effects (Glass Cannon, Iron Man, Justice Only, Permadeath) ([#52](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/52)) ([03603d9](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/03603d90d212ffb397023823dd925db3ce6478fd))
* **daily:** wire 5 modifier effects (No HUD, Headshots Only, Pistol/Rifle Only, No Reload) ([#51](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/51)) ([310afd9](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/310afd9e2a107c13df0dc1d7102c8d865b1a63bb))
* **e2e:** playwright suite covering canonical run + transitions ([#69](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/69)) ([66d6f19](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/66d6f19a37b1483ba2b8be2ef4b1d937ddeef49e))
* **e2e:** visual regression for 8 levels + fire→kill pipeline gate ([#72](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/72)) ([3995462](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/39954625cc309547238bd3a7eb12118389698aad))
* **encounter:** mini-boss phase-2 + Reaper HP escalation + fire-alarm opener ([#75](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/75)) ([c429831](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/c4298313ec173257ea47167e86ada82f91bbb02b))
* **encounter:** PRQ A.7 — justice-shot scoring + glint VFX ([#80](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/80)) ([da3a4a5](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/da3a4a56093fc6e3431ba12093d370545974bd58))
* **encounter:** PRQ A.9 — hostage-threat civilian-loss routing ([#85](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/85)) ([aebad6d](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/aebad6d177d56a35b202d89019510fbc820ee503))
* **engine:** PRQ C.2 + C.5 — seeded RNG facade + disposal lifecycle gaps ([#79](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/79)) ([eac898e](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/eac898e5ff3fefcbeea69c6bdd3fec63090648b7))
* **finish-the-game:** bundled remaining slices for v1.0 ([#61](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/61)) ([1f1b2ba](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/1f1b2ba844aae16b6d1a8a2621ad66b6732ee094))
* **gui:** difficulty-select overlay — 5×2 grid ([#34](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/34)) ([329a45f](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/329a45f256e22183eaf673b1d5e2ff35d942884e))
* **health-kits:** full-level coverage + validator extension ([#58](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/58)) ([6334fe2](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/6334fe2de8549652bb3a5ccecc370364fad93805))
* **high-scores:** top-10 table on title screen ([#59](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/59)) ([686c9ae](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/686c9ae8c43365fc28dd7d59444d2c8b7be521b4))
* **hud:** top-strip HUD — HP / score / combo / lives + brand fonts ([#33](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/33)) ([853037a](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/853037a7e6e6cf009d17cb811111344514509599))
* **input:** tap/hold/drag classifier + radial menu + pause + desktop fallback (PRQ-05) ([#12](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/12)) ([a3e2ec7](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a3e2ec7379e5be2711d3aa8b2f73944374132c8b))
* **levels:** boardroom — Reaper final-boss arena (3-phase) ([#44](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/44)) ([c150c8d](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/c150c8d9b601703c8b3284504587d68fd449b09e))
* **levels:** construction-primitives renderer + lobby content ([#31](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/31)) ([febdf97](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/febdf9706d4690df62264e5a338ea037f92e6c6c))
* **levels:** executive — pre-aggro lounge + ceiling-vent + Crawford ([#43](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/43)) ([e81a880](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/e81a8802ec6fd4dd35ab379458834014dda7be65))
* **levels:** hr-corridor — first hostage beat + Phelps mini-boss ([#41](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/41)) ([9ffb729](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/9ffb72961d23f3bc7ca15542a80e556b89635869))
* **levels:** open-plan + lore repurpose (policeman → office security guard, swat → head of security) ([#38](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/38)) ([1792e5d](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/1792e5d057b4facee1d0815510f59ede8e13c124))
* **levels:** stairway-A — first vertical level + first policeman ([#37](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/37)) ([a3e99a3](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a3e99a3cf6a7b0ee7364fa85a5772da0716cfdb2))
* **levels:** stairway-B — first hitman + mass-pop-volley ([#39](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/39)) ([fc50bce](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/fc50bce1f5a31f1c4b7bf2fec4cff6b0d7bfd983))
* **levels:** stairway-C — hidden-door reveal + sniper + ad rush ([#42](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/42)) ([b4af17d](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/b4af17d920a68f658a30ccaaccf6389d21e53caa))
* **native:** PRQ B.1 — generate android/ios shells + portrait lock ([#86](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/86)) ([8ed128c](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/8ed128c383deccb80ee066b929a9d61cd099fc5b))
* **native:** PRQ B.2 — icon + splash assets via @capacitor/assets ([#87](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/87)) ([66148b2](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/66148b22b5916050d4a6197a586246fe94ef6c43))
* **native:** PRQ B.3 — status-bar/splash-screen/haptics plugins ([#88](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/88)) ([42a485d](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/42a485d6acc70ccfa921d4930b54f2ead75100a3))
* **native:** PRQ B.4 — iOS safe-area inset for HUD overlay ([#89](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/89)) ([9f07c0b](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/9f07c0be8c0aada39afe15fef850780cfb045f97))
* **persistence:** drizzle + sql.js/capacitor-sqlite adapters + repos + save loop (PRQ-04) ([#10](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/10)) ([8a51880](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/8a51880d8c07645b7f94ef1b8f9f123a90ea98f0))
* **presentation:** M2 — design tokens, primitives, archetype enemies, projectile + pickup R3F, radial wiring, audio system, UI rewrites (PRQ-14 + PRQ-15 + deferred R3F) ([#21](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/21)) ([3932f60](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/3932f60e08718cffcbdd64a49c3c10896400403e))
* **rail-shooter:** pivot — doc realignment + PRQ-1.0 clean slate ([#28](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/28)) ([69d46ed](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/69d46edd84be320b6e41536340b68c0ea61e225d))
* **rc-hardening:** M6 — perf budget tables + WCAG-AA contrast + save blob round-trip (PRQ-RC0+RC1+RC2) ([#26](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/26)) ([7f7bf57](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/7f7bf57dfac2ddbc947457f0098e16ee42517b81))
* **rc-release:** M7 — i18n scaffold + native-packaging runbook + release-process doc (PRQ-RC5+RC4+RC7) ([#27](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/27)) ([033ce38](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/033ce385fbc665ecaaf741ce39b2ada1e2dc0d05))
* **release:** PRQ B.7 — release-please native version bumping ([#92](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/92)) ([c040d4b](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/c040d4b9ce64fc03cf1718874833e742111c82a6))
* **render:** hop-walk locomotion + Character component (PRQ-07) ([#14](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/14)) ([921c4f1](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/921c4f10261f09743aeeca39fc8f7e400af18767))
* **render:** render foundation — Lighting + Maze + dual-track Rng (PRQ-02) ([#8](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/8)) ([9346ca9](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/9346ca91ba5073156a740b8c73b6fd267a64f002))
* **ship-prep:** M3 — golden-path e2e + perf budget assertions + Capacitor lifecycle (PRQ-17 + PRQ-18 + PRQ-16) ([#22](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/22)) ([c8264cc](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/c8264cc746320bdc6e3509e6dd79379b1edf811d))
* **stairwells:** door placement + floor swap engine + audio cue bus + last_floor resume (PRQ-12 logic) ([#19](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/19)) ([44eb943](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/44eb943eb0445fccccba215aedf04fadc6b9da38))
* **weapons:** pistol/rifle ammo, reload (R), weapon-swap (Tab) ([#49](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/49)) ([4722ee0](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/4722ee0353e082a94ba43c60974817bca08305d7))
* **world-loop:** M1 — Door/Transition R3F + HR Reaper boss + every-5-floors gate (PRQ-12 deferred + PRQ-13) ([#20](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/20)) ([df6b5a0](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/df6b5a0f629d580363b5581dfa1d7b621803f631))
* **world:** chunked voxel world + seeded floor generator + per-chunk BVH (PRQ-03) ([#9](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/9)) ([4685fad](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/4685fad5d43012074745cf90fa0cef6bbd477f4c))


### Bug Fixes

* **director:** gate dwell early-resume on at-least-one-spawn ([#66](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/66)) ([0eb17c5](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/0eb17c58851082e0b517b8543baeab94d1cc868e))
* **e2e:** biome format on justice-shot test (single-line union cast) ([#103](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/103)) ([e0d7b5c](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/e0d7b5c9cc29cd00ec672c58df14420d0f063450))
* **e2e:** justice-shot 100ms stride to deterministically catch 300ms aim window ([#101](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/101)) ([6e2a095](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/6e2a0952f6dff822bd11d5f550b8390b3b491f7e))
* **e2e:** rebuild for preview server + eager-install __dord namespace + realistic perf budgets (alpha verification) ([#23](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/23)) ([b303423](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/b30342312fde3f0707ee12b0042a1a8677a2358c))
* **e2e:** replace justice-shot polling with in-page tick loop ([#102](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/102)) ([912f9d4](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/912f9d4e6bac16d66f5d4aee5ea84509c15346e4))
* **engine:** root-cause postProcessManager race + restore strict e2e assertions ([#71](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/71)) ([4bf0679](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/4bf0679ad45601f930a8b2f9607991db39369bc3))
* **gui+levels:** visual audit — overlay survives scene swap; tile PBR; visible enemies ([#62](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/62)) ([462ea08](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/462ea0854c4976cf85084f2c794bce7ea45ece1d))
* **high-scores:** harden persistence + dedup-aware rank + overlay race ([#60](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/60)) ([740ce2a](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/740ce2a3f6c7b7e64ac84cffa2dce6fedd695608))
* **levels+engine:** scene.pick crashed silently; close stairways+open-plan ([#63](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/63)) ([28224d5](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/28224d54b9eb04fafcf4761681dc3dae29277c56))
* **levels:** biome lint on builders.ts (trailing blank line + type-only import) ([#83](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/83)) ([ebcfcc7](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/ebcfcc77fc7c50c673844743e5991f353fd9f375))
* **levels:** on-clear transitions + spawn-rail clipping cleanup ([#67](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/67)) ([685e59b](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/685e59bc4e2834616207ec6e3d1540936f1408f3))
* **levels:** per-level prop + lighting content pass ([#65](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/65)) ([161475a](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/161475a6c103114fec8054b963e908c713330a69))
* **levels:** visible-defect playability fixes per directive no-deferral rule ([#64](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/64)) ([27ecf88](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/27ecf88b5ff4b916b4acdcbd7aade95eb209b8f1))
* **persistence:** code review fold-forward (PRQ-04) ([#11](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/11)) ([2349915](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/23499153e42b7e1f5b21b7c652a7eb09a8e5db8f))
* **validate:** catch on-clear cues bound to terminal cameraRail node ([#68](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/68)) ([36d94fb](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/36d94fb651aa179a53e701b3051da57ec0130692))

## [Unreleased]

### Changed

- **Babylon pivot** (2026-04-30). Renderer migrated from React Three Fiber to Babylon.js. Native shell simplified to `@capacitor/core` + `@capacitor/preferences` (no `@capacitor/app` lifecycle — `document.visibilitychange` covers pause/resume). Single `<canvas id="game">` in root `index.html`; no React, no router, no views directory. Persistence via `Capacitor.Preferences` only — drizzle/SQLite/`@capacitor-community/sqlite` removed (it's an arcade game).
- **Screenplay model locked.** Levels are now cue lists keyed off wall-clock + rail-events. Enemies are dumb props on spawn rails ticking authored fire-program tapes. The `EncounterDirector` is the only thing with agency. No FSM library, no AI library, no PRNG — gameplay is fully scripted. Canon: `docs/spec/05-screenplay-language.md` + `docs/spec/02-encounter-vocabulary.md`.
- **Construction primitives model locked.** Levels are bags of `Wall` / `Floor` / `Ceiling` / `Door` / `Window` / `Shutter` / `Whiteboard` / `Pillar` / `Prop` / `Light` primitives that reference textures from the curated 240-PNG retro library + 5 PBR sets. No "big level GLB." Canon: `docs/spec/04-construction-primitives.md`.
- Design canon migrated from `docs/superpowers/specs/arcade-rail-shooter/` to `docs/spec/` (flat). Top-level dated design + build-plan docs removed; per-PRQ catalogue replaced by ad-hoc TaskList entries off the canon.

### Removed

- React + React Three Fiber + drei + Rapier renderer.
- drizzle + sql.js + `@capacitor-community/sqlite` persistence.
- yuka + koota + radix-ui + framer-motion + tailwind 4 + seedrandom.
- The 60-PRQ build plan + Phase 1-6 catalogue + M1-M7 milestones (replaced by single-PR pivot + ad-hoc canon-driven tasks).
- OOM lockdown protocol (Babylon's `dispose()` cascades replace the React-cleanup discipline).
- Voxel/floor/maze/navmesh systems and weapon-progression Tasks 15-21 (gone in the prior pivot but still referenced in pre-pivot docs).
- `app/`, `src/db/`, `src/i18n/`, `src/ui/`, `src/input/`, `src/shared/`, `src/audio/` directories.

### Added

- `src/main.ts` — runtime boot (Babylon Engine + Game state machine + EncounterDirector + GUI overlays).
- `src/preferences.ts` — `Capacitor.Preferences`-backed settings + high scores.
- `src/encounter/` — screenplay director (`EncounterDirector`), enemies (`Enemy.ts`, `ARCHETYPES`), spawn rails (`SpawnRail.ts`), fire-program presets (`firePatterns.ts`), cue language (`cues.ts`).
- `src/levels/` — level types (`types.ts`) + Lobby data (`lobby.ts`) + level registry (`index.ts`).
- `src/game/` — top-level state machine (`Game.ts` + `GameState.ts`).
- `src/gui/` — Babylon GUI overlays (Reticle, InsertCoinOverlay, ContinueOverlay, GameOverOverlay, SettingsOverlay).
- `docs/spec/04-construction-primitives.md` — Wall/Floor/Door/Window/Shutter/etc. schemas.
- `docs/spec/05-screenplay-language.md` — cue trigger + cue-action verb reference, 14 verbs.
- `docs/spec/playtest-2026-04-30.md` — paper-playtest report with 8 friction edits + 2 schema extensions.
- All 8 level docs (`docs/spec/levels/01-lobby.md` … `08-boardroom.md`) enriched with construction primitives, spawn-rail maps, camera-rail nodes, and cue lists.

## 1.0.0 (2026-04-30)


### Features

* **app:** empty Landing + Game views with R3F canvas (PRQ-00 T6) ([3f0c8a2](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/3f0c8a20925a80291078776289c79eec40baa2bc))


### Bug Fixes

* **e2e:** trim trailing slash from DORD_BASE_URL (PRQ-00 T12 follow-up) ([#5](https://github.com/arcade-cabinet/department-of-redundancy-department/issues/5)) ([a4a4e07](https://github.com/arcade-cabinet/department-of-redundancy-department/commit/a4a4e079ddec4c94d6ffccb16ae432b65ea8d07f))
