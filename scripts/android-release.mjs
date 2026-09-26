// Builds the signed release bundle for Google Play:  npm run android:aab
//   npm run android:aab -- --bump      # versionCode + 1 first (every Play upload needs a higher one)
//   npm run android:aab -- --apk       # a signed release APK instead, for installing on a phone
//
// Needs: CAP_SERVER_URL=https://<your live domain>, android/keystore.properties (see
// docs/play-store.md), JDK 21 and the Android SDK (docs/android.md).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const isWin = process.platform === "win32";
const androidDir = join(process.cwd(), "android");
const versionFile = join(androidDir, "app-version.json");
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

const url = process.env.CAP_SERVER_URL;
if (!url) fail("CAP_SERVER_URL is not set. Example: CAP_SERVER_URL=https://your-domain.com npm run android:aab");
if (!url.startsWith("https://")) fail(`CAP_SERVER_URL must be https:// for a release build (got ${url}).`);
if (/localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.\d+\.\d+/.test(url)) fail(`CAP_SERVER_URL points at a local address (${url}).`);

const propsFile = join(androidDir, "keystore.properties");
if (!existsSync(propsFile)) fail("android/keystore.properties is missing — create your release keystore first (docs/play-store.md, step 1).");
const props = Object.fromEntries(
  readFileSync(propsFile, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
for (const k of ["storeFile", "storePassword", "keyAlias", "keyPassword"]) {
  if (!props[k]) fail(`android/keystore.properties has no ${k}.`);
}
if (!existsSync(join(androidDir, props.storeFile))) fail(`Keystore file not found: android/${props.storeFile}`);

const version = JSON.parse(readFileSync(versionFile, "utf8"));
if (process.argv.includes("--bump")) {
  version.versionCode += 1;
  writeFileSync(versionFile, JSON.stringify(version, null, 2) + "\n");
}
console.log(`Building ${version.versionName} (versionCode ${version.versionCode}) for ${url}`);

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const apk = process.argv.includes("--apk");
run("npx", ["cap", "sync", "android"]);
const gradlew = join(androidDir, isWin ? "gradlew.bat" : "gradlew");
run(`"${gradlew}"`, [
  apk ? "assembleRelease" : "bundleRelease",
  `-PappVersionCode=${version.versionCode}`,
  `-PappVersionName=${version.versionName}`,
], { cwd: androidDir });
console.log(
  apk
    ? "\nSigned APK: android/app/build/outputs/apk/release/app-release.apk"
    : "\nUpload this to Play Console: android/app/build/outputs/bundle/release/app-release.aab",
);
