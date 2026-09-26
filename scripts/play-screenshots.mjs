// Captures the Google Play phone screenshots + the feature graphic:
//   1. start the app in DEMO mode:   npm run dev            (NEXT_PUBLIC_DEMO_MODE unset/true, no Supabase keys needed)
//   2. npm run play:screenshots      (or SHOT_URL=https://... to shoot another deployment)
// Output: store/play/screenshots/*.png (1080x2160) and store/play/feature-graphic.png (1024x500).
// Demo mode is used on purpose: clean, repeatable data and nothing written to the real database.
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.SHOT_URL ?? "http://localhost:3000";
const out = join(root, "store", "play");
mkdirSync(join(out, "screenshots"), { recursive: true });
const mark = JSON.parse(readFileSync(join(root, "brand", "mark.json"), "utf8"));

const browser = await chromium.launch();

// ---- phone screenshots: 360x720 CSS px @3x = 1080x2160 (Play wants 16:9–9:16 at most 2:1) ----
const ctx = await browser.newContext({
  viewport: { width: 360, height: 720 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
});
const page = await ctx.newPage();
// store images shouldn't show the demo banner or the Next.js dev badge
const CLEAN = "[data-demo-banner], nextjs-portal { display: none !important; }";
const shot = async (name) => {
  await page.addStyleTag({ content: CLEAN });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600); // let image fade-ins finish
  await page.screenshot({ path: join(out, "screenshots", `${name}.png`) });
  console.log("  ", name);
};

await page.goto(`${base}/login`);
await page.getByRole("button", { name: "Continue as guest" }).click();
await page.waitForURL(/\/home$/);
await page.waitForLoadState("networkidle");
await shot("1-home");

await page.goto(`${base}/explore`);
await page.waitForLoadState("networkidle");
await shot("2-explore");

await page.goto(`${base}/explore/experiences/kuching-heritage-street-food-walk`);
await page.waitForLoadState("networkidle");
await shot("3-experience");

await page.goto(`${base}/plan`);
await page.waitForLoadState("networkidle");
await shot("4-plan");

await page.getByRole("button", { name: "Generate my trip" }).click();
await page.waitForURL(/\/trips\/[^/]+$/, { timeout: 60_000 });
await page.waitForLoadState("networkidle");
await shot("5-trip");

await ctx.close();

// ---- feature graphic 1024x500 ----
const [c1, c2] = mark.gradient;
const { x, y, w, h } = mark.bounds;
const g = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await g.setContent(`<!doctype html><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:1024px;height:500px;font-family:"Segoe UI",Inter,Arial,sans-serif;color:#fff;
       background:linear-gradient(135deg,${c1},${c2});display:flex;align-items:center;padding:0 72px;gap:56px;overflow:hidden}
  .mark{flex:none;width:300px;height:300px}
  h1{font-size:64px;line-height:1.05;font-weight:800;letter-spacing:-1px}
  p{margin-top:18px;font-size:27px;line-height:1.35;font-weight:500;opacity:.92;max-width:520px}
</style>
<svg class="mark" viewBox="${x - 20} ${y - 20} ${w + 40} ${h + 40}"><path d="${mark.pin}" fill="#fff" fill-rule="evenodd"/><path d="${mark.spark}" fill="#fff"/></svg>
<div><h1>Sarawak<br>Trip Planner</h1><p>Plan your Kuching trip with AI. Book verified local experiences.</p></div>`);
await g.screenshot({ path: join(out, "feature-graphic.png") });
console.log("   feature-graphic");

await browser.close();
