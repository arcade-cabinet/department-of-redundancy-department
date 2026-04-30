---
title: Mobile shell — generating android/ + ios/
updated: 2026-04-30
status: current
domain: ops
---

# Mobile shell — generating android/ + ios/

The JS-side scaffolding lives at `capacitor.config.ts` + `app/shell/lifecycle.ts` + the `build:native` script. Generating the actual `android/` + `ios/` directories requires native toolchains that don't run in CI (Android Studio + Xcode + JDK + simulators), so this is a one-time manual step.

## One-time generation

Run on a machine with Xcode + Android Studio installed:

```bash
pnpm install
pnpm build:native
pnpm exec cap add android
pnpm exec cap add ios
pnpm exec cap sync
```

Commit the generated `android/` + `ios/` directories. Per the mean-streets / grovekeeper convention, native trees are checked in.

## App icons + splash

```bash
# Drop the 1024² icon source + 2732² splash source.
mkdir -p resources
cp <icon-1024.png> resources/icon.png
cp <splash-2732.png> resources/splash.png
pnpm dlx @capacitor/assets generate
pnpm exec cap sync
```

Source: stamped `D` mark on paper-with-paper-clip per the brand canon in `docs/superpowers/specs/2026-04-30-arcade-rail-shooter-design.md`. Ink color `--ink` (#15181C), background `--paper` (#F4F1EA). Splash adds the tagline "There has been a reorganization" below.

## Verify on iOS Simulator

```bash
pnpm build:native
pnpm exec cap sync
pnpm exec cap open ios
# In Xcode: select an iPhone 15 simulator, hit Run.
```

The Landing page should render within ~2s. Tap CLOCK IN; the game should boot. Open Safari → Develop → Simulator → DORD to attach the WebInspector and confirm score-table writes round-trip through the native SQLite adapter.

## Verify on Android Emulator

```bash
pnpm build:native
pnpm exec cap sync
pnpm exec cap open android
# In Android Studio: pick a Pixel 7 / API 34 AVD, hit Run.
```

The lifecycle hooks land via `app/shell/lifecycle.ts`. Confirm:
- App background (Home button) pauses the game.
- App foreground re-enters paused state (player must tap RESUME).
- Back button in Game opens PauseMenu; back button in PauseMenu closes it.

## CI

`.github/workflows/cd.yml` runs `validate-deployed` against the GitHub Pages build. A future Android-debug-AAB job gates on the presence of `android/gradlew` and lands once the native trees are committed.
