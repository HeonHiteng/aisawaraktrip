// Generates the Android launcher icons, splash mark and the Google Play store icon from the
// brand mark (brand/mark.json):  npm run android:assets
//
//   android/app/src/main/res/mipmap-*/ic_launcher{,_round,_foreground}.png
//   android/app/src/main/res/drawable-*dpi/splash_mark.png
//   store/play/icon-512.png                       (Play Console "App icon")
//
// The adaptive-icon background and the splash background are gradient XML drawables, checked in.
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mark = JSON.parse(readFileSync(join(root, "brand", "mark.json"), "utf8"));
const res = join(root, "android", "app", "src", "main", "res");
const [c1, c2] = mark.gradient;
const { x: bx, y: by, w: bw, h: bh } = mark.bounds;
const cx = bx + bw / 2;
const cy = by + bh / 2;

const paint = (fill) =>
  `<path fill="${fill}" fill-rule="evenodd" d="${mark.pin}"/><path fill="${fill}" d="${mark.spark}"/>`;
const gradient = `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="512" y2="512"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`;

/** An SVG whose viewBox is `size` units square, centred on the mark. */
const view = (size) => `${cx - size / 2} ${cy - size / 2} ${size} ${size}`;
const svg = (viewBox, body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`);

// full-bleed icon: gradient square + white mark (mark ≈ 72% of the height)
const square = () =>
  svg(view(512), `${gradient}<rect x="${cx - 256}" y="${cy - 256}" width="512" height="512" fill="url(#g)"/>${paint("#fff")}`);
// round legacy icon: same, clipped to a circle
const round = () =>
  svg(
    view(512),
    `${gradient}<clipPath id="c"><circle cx="${cx}" cy="${cy}" r="256"/></clipPath><g clip-path="url(#c)"><rect x="${cx - 256}" y="${cy - 256}" width="512" height="512" fill="url(#g)"/>${paint("#fff")}</g>`,
  );
// adaptive foreground: transparent, the mark inside the centre 61% (the always-visible safe zone)
const foreground = () => svg(view(bh / 0.58), paint("#fff"));
// splash mark: transparent, with breathing room
const splash = () => svg(view(512), paint("#fff"));

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function png(input, size, file) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(input, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
}

for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = join(res, `mipmap-${d}`);
  await png(square(), Math.round(48 * k), join(dir, "ic_launcher.png"));
  await png(round(), Math.round(48 * k), join(dir, "ic_launcher_round.png"));
  await png(foreground(), Math.round(108 * k), join(dir, "ic_launcher_foreground.png"));
  await png(splash(), Math.round(160 * k), join(res, `drawable-${d}`, "splash_mark.png"));
}
await png(square(), 512, join(root, "store", "play", "icon-512.png"));
console.log("Android icons, splash mark and store/play/icon-512.png written.");
