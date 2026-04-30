# PRQ-16: Mobile Shell — Capacitor 8 iOS + Android

**Status:** queued

**Blocked by:** PRQ-15.

## Goal

Generate the iOS + Android Capacitor shells; wire app icons + splash screens at all required densities; verify the native SQLite adapter works on a simulator/emulator; produce a debug AAB and an iOS Simulator build that boots into the Landing page. After this PRQ: an Android dev can side-load DORD onto a real phone.

## Spec reference

§ 1 (Capacitor 8 mobile shell), § 2 (tech stack — Capacitor 8, drizzle native adapter), § 12 (mobile perf budgets — fps target 45+ on iPhone 12).

## Success criteria

- `pnpm cap:sync` runs clean.
- `android/` directory generated, builds Debug AAB via Android Studio + Gradle.
- `ios/` directory generated, builds via Xcode for iOS Simulator (Debug).
- App icon (1024×1024 source) + adaptive icons + splash screens generated for all required iOS + Android densities via `@capacitor/assets` (or hand-pinned set).
- `appId: cabinet.arcade.dord`; `appName: DORD`.
- Native adapter (`src/db/client.native.ts` from PRQ-04) verified working on iOS Simulator: round-trip insert + select on `world_meta`.
- Native back-button (Android) handled: pause game when app backgrounded; resume on foreground.
- Status bar configured (dark icons on light Landing; light icons in dark Game).
- Splash screen ≤ 2s before Landing renders.
- Bundle: `pnpm build:native` produces `dist/` with the right `base: '/'` (not Pages base).

## Task breakdown

### T1: Generate native shells

**Files:** `android/`, `ios/`. Run `pnpm exec cap add android && pnpm exec cap add ios && pnpm cap:sync`.

Commit the generated trees. (Mean-streets/grovekeeper pattern: yes, the generated Android + iOS code is checked in.)

**Acceptance:** `ls android/app/src/main/AndroidManifest.xml` exists; `ls ios/App/App.xcodeproj` exists.

### T2: App icons + splash

**Files:** `resources/icon.png` (1024²), `resources/splash.png` (2732²), generated assets via `pnpm dlx @capacitor/assets generate`.

Source images: a stamped `D` mark on paper-with-paper-clip. Ink color `--ink`, background `--paper`. Splash adds the tagline below.

**Acceptance:** `ls android/app/src/main/res/mipmap-*` shows generated icons; iOS asset catalog populated.

### T3: AndroidManifest + Info.plist tuning

**Files:** `android/app/src/main/AndroidManifest.xml`, `ios/App/App/Info.plist`.

Set portrait orientation lock; permissions: vibrate (haptics post-alpha); `usesCleartextTraffic="false"`. Status bar style.

**Acceptance:** AAB built; iOS Simulator boots without entitlement warnings.

### T4: Verify native SQLite adapter

**Files:** `e2e/native-sqlite.appium.spec.ts` (optional Appium spec; for alpha, smoke via manual run on a simulator with a `?test=native-sqlite` route that runs the round-trip + reports via console).

**Acceptance:** manual run on iOS Simulator confirms `world_meta` insert + select works; capture in `docs/qa/native-sqlite.png`.

### T5: App lifecycle hooks

**Files:** `app/shell/lifecycle.ts`.

`Capacitor.App.addListener('appStateChange', (state) => state.isActive ? resume() : pauseAndFlush())`. `addListener('backButton', ...)` on Android navigates: in Game → open PauseMenu; in PauseMenu → close it; in Landing → confirm-exit Dialog.

**Acceptance:** lifecycle hooks fire (verified via dev hook + `--inspect` Chrome attached to WebView).

### T6: Build scripts in CI

**Files:** `.github/workflows/cd.yml` (extend with optional Android debug-AAB job, gated on `android/gradlew` presence).

Mirror chonkers/mean-streets: setup-java 21 temurin + setup-android api 34 → `pnpm build:native && pnpm exec cap sync android && cd android && ./gradlew assembleDebug` → upload artifact. Optional gate so it doesn't run if Android isn't initialized yet.

**Acceptance:** PR to main triggers a successful Android Debug AAB artifact upload.

### T7: PR + merge

PR: `feat(mobile): Capacitor 8 ios + android shells + native SQLite verified (PRQ-16)`. Squash-merge after `validate-deployed` green.

## Notes

iOS code-signing for TestFlight is deferred to PRQ-RC4 (RC milestone). Alpha only requires Simulator boot + Android side-load.
