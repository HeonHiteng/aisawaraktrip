// Builds the debug APK: `npm run android:apk`
// Requires CAP_SERVER_URL, JDK 21 (JAVA_HOME) and the Android SDK — see docs/android.md.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const isWin = process.platform === "win32";
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("npx", ["cap", "sync", "android"]);
// Absolute + quoted: the project path contains spaces, and cmd.exe won't
// resolve a bare `gradlew.bat` from the cwd on every machine.
const androidDir = join(process.cwd(), "android");
const gradlew = join(androidDir, isWin ? "gradlew.bat" : "gradlew");
run(`"${gradlew}"`, ["assembleDebug"], { cwd: androidDir });
console.log("\nAPK: android/app/build/outputs/apk/debug/app-debug.apk");
