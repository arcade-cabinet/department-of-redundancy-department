---
title: Privacy Policy
updated: 2026-05-02
status: current
domain: ops
---

# Privacy Policy — Department of Redundancy Department (DORD)

**Effective date:** 2026-05-02

DORD is a single-player offline arcade rail shooter. **The game does not collect, transmit, or store any personal information off-device.**

## What stays on your device

DORD uses [Capacitor Preferences](https://capacitorjs.com/docs/apis/preferences) to store the following data **locally on your device only**:

- **Game settings** — audio volume, control preferences, accessibility toggles.
- **High scores** — your top-ranked runs (score + initials you choose) and the lifetime quarter balance for that install.
- **Run state** — temporary in-progress run data, cleared on game completion or process termination.

This data:

- Lives in the standard iOS / Android per-app sandbox (`NSUserDefaults` on iOS, `SharedPreferences` on Android).
- Is **never transmitted to us or any third party**.
- Is removed when you uninstall the app or use your device's "Clear app data" / "Reset" feature.
- Is not synced across devices (no cloud save).

## What we do not collect

DORD does **not**:

- Connect to any server we operate, ever.
- Use third-party analytics SDKs (no Firebase Analytics, no Crashlytics, no AppsFlyer, no Adjust, no Sentry, no AppCenter).
- Display advertising of any kind.
- Request access to your contacts, photos, microphone, location, calendar, or health data.
- Use cookies or persistent identifiers (advertising ID, IDFA, AAID).
- Read or write outside its own application sandbox.
- Make any network requests for gameplay purposes after install.

The only network activity DORD initiates is the one-time download of bundled assets if your platform's app store requires on-demand resource fetching — those requests go to the platform's CDN (Apple App Store, Google Play), not to us.

## Children's privacy

DORD is rated for general audiences but contains stylized cartoon violence. Because we collect zero personal information, the app is in compliance with COPPA, GDPR (Article 8), and the UK Age Appropriate Design Code by default — there is simply nothing to gather, profile, or transmit.

## Permissions DORD requests

| Permission | Reason |
|---|---|
| Vibration / Haptics | Tactile feedback on trigger pull (configurable in settings). Used only when you fire the weapon; no background haptics. |
| Storage (implicit, sandboxed only) | Save your settings + high scores via Capacitor Preferences. |

DORD does **not** request: camera, microphone, location, contacts, calendar, photos, motion, biometric, network state, or any other permission.

## Crash reports

There are no automatic crash reports. If the app crashes on iOS or Android, the platform's own crash reporting (Apple Crash Reporter, Google Play Console crash reports) may receive an anonymized stack trace per the standard system behavior. We do not enrich these reports with any DORD-specific data, and we receive only the aggregated, anonymized counts that the platform makes available to us as the developer — no per-user data.

## Changes to this policy

If this policy ever changes, the previous version will remain available in the project's git history at the URL where you found this document. Material changes will be announced in the app's update notes.

## Contact

Questions about this policy: file an issue at the project's source repository, [github.com/arcade-cabinet/department-of-redundancy-department](https://github.com/arcade-cabinet/department-of-redundancy-department).
