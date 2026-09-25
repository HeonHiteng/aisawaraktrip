import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android shell. The app is a Next.js server-rendered app (Server Actions, RSC),
 * so the APK is a native WebView that loads it from a server rather than
 * bundling static files.
 *
 * Point it at a server with CAP_SERVER_URL when running `npm run android:sync`:
 *   - LAN test build : http://<this PC's Wi-Fi IP>:3000  (dev server running)
 *   - Production     : https://<your deployed domain>
 * Cleartext (http) is only enabled when the URL is http — production https
 * builds ship with it off.
 */
const url = process.env.CAP_SERVER_URL;
if (!url) {
  throw new Error(
    "CAP_SERVER_URL is not set. Example: CAP_SERVER_URL=http://192.168.1.20:3000 npm run android:sync",
  );
}

const config: CapacitorConfig = {
  appId: "com.sarawaktrip.app",
  appName: "Sarawak Trip Planner",
  // Only used for the offline/error screen; the app itself loads from `server.url`.
  webDir: "capacitor-www",
  server: {
    url,
    cleartext: url.startsWith("http://"),
    // Shown when the server can't be reached (no network, dev server off).
    errorPath: "offline.html",
  },
  android: {
    // Never let the WebView be debugged from a release build.
    webContentsDebuggingEnabled: false,
    // The app's JS/CSS (React 19, Tailwind v4) needs Chrome 111+. Older WebViews
    // render broken, unstyled pages — show offline.html's message instead.
    minWebViewVersion: 111,
  },
};

export default config;
