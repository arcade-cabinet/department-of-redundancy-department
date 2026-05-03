#!/usr/bin/env node
/**
 * Patch ios/App/App.xcodeproj/project.pbxproj with the version from
 * package.json. Called from .github/workflows/release.yml (build-ios)
 * after checkout but before xcodebuild archive, so the .ipa carries
 * the same MARKETING_VERSION + CURRENT_PROJECT_VERSION as the npm
 * package and the Android .aab.
 *
 * release-please bumps package.json directly, but pbxproj is a binary-ish
 * format with two build configurations (Debug + Release) that each have
 * their own version line — easier to patch from a script than via
 * release-please's text-replace updater.
 *
 * MARKETING_VERSION = "1.2.3" (the human-readable version)
 * CURRENT_PROJECT_VERSION = 10203 (encoded as 1*10000 + 2*100 + 3,
 *                                  matching the Android versionCode
 *                                  derivation in app/build.gradle)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const pkgPath = resolve(root, 'package.json');
const pbxPath = resolve(root, 'ios/App/App.xcodeproj/project.pbxproj');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
	process.stderr.write(`sync-ios-version: package.json version "${version}" is not semver MAJOR.MINOR.PATCH\n`);
	process.exit(1);
}

const [major, minor, patch] = version.split('.').map(Number);
const projectVersion = major * 10000 + minor * 100 + patch;

let pbx = readFileSync(pbxPath, 'utf-8');

// Replace ALL occurrences of the two settings — debug + release configs.
// pbxproj uses tab indent so we accept any whitespace before the key.
const before = pbx;
pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
pbx = pbx.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${projectVersion};`);

if (pbx === before) {
	process.stderr.write(`sync-ios-version: no MARKETING_VERSION / CURRENT_PROJECT_VERSION lines matched in ${pbxPath}\n`);
	process.exit(1);
}

writeFileSync(pbxPath, pbx);
process.stdout.write(`sync-ios-version: ${pbxPath} → MARKETING_VERSION=${version}, CURRENT_PROJECT_VERSION=${projectVersion}\n`);
