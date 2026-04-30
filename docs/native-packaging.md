# Native packaging (PRQ-RC4)

Runbook for shipping signed iOS + Android binaries. Requires Xcode + Android Studio + Apple Developer + Play Console accounts (toolchains aren't on CI runners).

## Prerequisites

- macOS with Xcode 15+
- Android Studio with API 34
- JDK 17 (`brew install openjdk@17`)
- Apple Developer Program seat (Team ID configured)
- Google Play Console seat
- A 1024×1024 PNG icon source at `resources/icon.png`
- A 2732×2732 PNG splash source at `resources/splash.png`

## One-time setup

```bash
pnpm install
pnpm build:native
pnpm exec cap add android
pnpm exec cap add ios
pnpm dlx @capacitor/assets generate
pnpm exec cap sync
```

Commit the generated `android/` + `ios/` directories.

## iOS — App Store / TestFlight

```bash
pnpm build:native
pnpm exec cap sync ios
pnpm exec cap open ios
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** → set Team.
2. Bump `MARKETING_VERSION` to match the release tag.
3. Product → Archive.
4. Window → Organizer → Distribute App → App Store Connect → Upload.
5. App Store Connect → TestFlight → enable for internal testers.
6. After review (~24h) → release to public testers / App Store.

Bundle ID per `capacitor.config.ts`: `cabinet.arcade.dord`.

## Android — Play Internal Testing

Generate an upload keystore once:

```bash
keytool -genkey -v -keystore ~/.android/dord-upload.keystore -alias dord -keyalg RSA -keysize 2048 -validity 10000
```

Set in `android/key.properties`:

```
storeFile=/Users/<you>/.android/dord-upload.keystore
storePassword=<from password manager>
keyAlias=dord
keyPassword=<from password manager>
```

(The file is gitignored.)

Then:

```bash
pnpm build:native
pnpm exec cap sync android
cd android && ./gradlew bundleRelease
```

The signed AAB lands at `android/app/build/outputs/bundle/release/app-release.aab`. Upload to Play Console → Internal Testing.

## Store metadata

Both stores need:

- App icon (already generated in setup).
- 6-8 screenshots per platform/density. Capture against the iOS Simulator + Android Emulator on the live build.
- Short description ≤ 80 chars: "First-person voxel-prop FPS in an infinite procedural office."
- Long description ≤ 4000 chars: the spec §11.3 brand copy.
- Privacy policy URL: TBD (see RC2 telemetry opt-in).
- Age rating: 12+ (cartoon violence).
