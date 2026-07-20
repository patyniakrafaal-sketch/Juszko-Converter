/**
 * Renders the bot's icon set to PNGs that can be uploaded as Discord server emoji.
 *
 * Discord shows emoji at roughly 22px inline and 48px in a reaction, so these are drawn
 * as bold flat shapes with no fine detail - anything thinner than ~8px in this 128px box
 * disappears at display size. Output is 128x128 with transparency, well under the 256KB
 * per-emoji limit.
 *
 *   node icons/build-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 128;

// One palette for the whole set, matching the embed colours in bot.js.
const C = {
  brand: "#F5C518",
  brandDark: "#B8900A",
  brandInk: "#5C4400",
  success: "#2ECC71",
  successDark: "#1E8E4E",
  danger: "#E74C3C",
  dangerDark: "#A93226",
  info: "#5865F2",
  infoDark: "#3C45A5",
  neutral: "#B9BBBE",
  neutralDark: "#7E8287",
  white: "#FFFFFF",
};

/**
 * Gradients and a soft top highlight are what separate these from flat clip-art. They
 * survive the downscale because they run across the whole shape rather than sitting in
 * small details - at 22px the eye still reads the light direction even when it cannot
 * resolve anything else.
 */
const defs = (id, from, to) =>
  `<defs>` +
  `<linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
  `</linearGradient>` +
  // Glass highlight: a bright wash over the upper half, fading to nothing by the middle.
  `<linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/>` +
  `<stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>` +
  `</linearGradient>` +
  `</defs>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">${body}</svg>`;

/**
 * Base of every badge-style icon: a darker rim, a vertical gradient body and a highlight
 * arc across the top, so the disc reads as a raised token instead of a flat circle.
 */
const disc = (id, fill, ring) =>
  `${defs(id, fill, ring)}` +
  `<circle cx="64" cy="64" r="58" fill="${ring}"/>` +
  `<circle cx="64" cy="64" r="50" fill="url(#g${id})"/>` +
  `<ellipse cx="64" cy="44" rx="42" ry="30" fill="url(#s${id})"/>`;

const ICONS = {
  // --- currency ---------------------------------------------------------
  coin: svg(
    `${disc("br", C.brand, C.brandDark)}` +
      `<text x="64" y="82" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"` +
      ` font-size="46" font-weight="900" fill="${C.brandInk}">JC</text>`,
  ),

  wallet: svg(
    `${defs("wa", C.brand, C.brandDark)}` +
      `<rect x="12" y="30" width="104" height="72" rx="14" fill="${C.brandDark}"/>` +
      `<rect x="12" y="30" width="104" height="60" rx="14" fill="url(#gwa)"/>` +
      `<rect x="12" y="30" width="104" height="34" rx="14" fill="url(#swa)"/>` +
      `<rect x="74" y="56" width="42" height="26" rx="10" fill="${C.brandInk}"/>` +
      `<circle cx="92" cy="69" r="7" fill="${C.brand}"/>`,
  ),

  // --- rewards ----------------------------------------------------------
  gift: svg(
    `${defs("gi", C.brand, C.brandDark)}` +
      `<rect x="22" y="68" width="84" height="46" rx="8" fill="${C.brandDark}"/>` +
      `<rect x="14" y="46" width="100" height="22" rx="6" fill="url(#ggi)"/>` +
      `<rect x="56" y="46" width="16" height="68" fill="${C.brandInk}"/>` +
      // Two rounded loops rather than pointed paths - at emoji size a sharp bow
      // collapses into a blob.
      `<ellipse cx="44" cy="32" rx="18" ry="14" fill="url(#ggi)"/>` +
      `<ellipse cx="84" cy="32" rx="18" ry="14" fill="url(#ggi)"/>` +
      `<circle cx="64" cy="38" r="11" fill="${C.brandDark}"/>` +
      `<rect x="14" y="46" width="100" height="12" rx="6" fill="url(#sgi)"/>`,
  ),

  pending: svg(
    `${disc("br", C.brand, C.brandDark)}` +
      `<rect x="58" y="30" width="12" height="38" rx="6" fill="${C.brandInk}"/>` +
      `<rect x="62" y="58" width="30" height="12" rx="6" fill="${C.brandInk}"/>` +
      // Hub, so the two hands read as one clock instead of a bent line.
      `<circle cx="64" cy="64" r="8" fill="${C.brandInk}"/>`,
  ),

  done: svg(
    `${disc("su", C.success, C.successDark)}` +
      `<path d="M40 66l16 16 32-34" fill="none" stroke="${C.white}" stroke-width="14"` +
      ` stroke-linecap="round" stroke-linejoin="round"/>`,
  ),

  cancelled: svg(
    `${disc("da", C.danger, C.dangerDark)}` +
      `<rect x="36" y="57" width="56" height="14" rx="7" fill="${C.white}"` +
      ` transform="rotate(-45 64 64)"/>` +
      `<circle cx="64" cy="64" r="34" fill="none" stroke="${C.white}" stroke-width="12"/>`,
  ),

  // --- feedback ---------------------------------------------------------
  error: svg(
    `${disc("da", C.danger, C.dangerDark)}` +
      `<rect x="56" y="30" width="16" height="44" rx="8" fill="${C.white}"/>` +
      `<circle cx="64" cy="92" r="10" fill="${C.white}"/>`,
  ),

  info: svg(
    `${disc("in", C.info, C.infoDark)}` +
      `<circle cx="64" cy="38" r="10" fill="${C.white}"/>` +
      `<rect x="56" y="54" width="16" height="44" rx="8" fill="${C.white}"/>`,
  ),

  plus: svg(
    `${disc("su", C.success, C.successDark)}` +
      `<rect x="56" y="34" width="16" height="60" rx="8" fill="${C.white}"/>` +
      `<rect x="34" y="56" width="60" height="16" rx="8" fill="${C.white}"/>`,
  ),

  minus: svg(
    `${disc("da", C.danger, C.dangerDark)}` + `<rect x="34" y="56" width="60" height="16" rx="8" fill="${C.white}"/>`,
  ),

  // --- people and access ------------------------------------------------
  user: svg(
    `${disc("ne", C.neutral, C.neutralDark)}` +
      `<circle cx="64" cy="52" r="18" fill="${C.white}"/>` +
      `<path d="M30 104a34 34 0 0 1 68 0z" fill="${C.white}"/>`,
  ),

  staff: svg(
    `${defs("st", C.info, C.infoDark)}` +
      `<path d="M64 10l44 18v34c0 28-19 47-44 56-25-9-44-28-44-56V28z" fill="${C.infoDark}"/>` +
      `<path d="M64 22l33 13v27c0 21-14 35-33 43-19-8-33-22-33-43V35z" fill="url(#gst)"/>` +
      `<path d="M64 22l33 13v14H31V35z" fill="url(#sst)"/>` +
      `<path d="M46 66l12 12 24-26" fill="none" stroke="${C.white}" stroke-width="12"` +
      ` stroke-linecap="round" stroke-linejoin="round"/>`,
  ),

  // Drawn upright rather than on the usual diagonal: at 22px a rotated key reads as
  // three unrelated smudges, because the teeth stop touching the shaft.
  code: svg(
    `${defs("co", C.brand, C.brandDark)}` +
      `<circle cx="64" cy="40" r="30" fill="url(#gco)"/>` +
      `<ellipse cx="64" cy="28" rx="24" ry="16" fill="url(#sco)"/>` +
      `<circle cx="64" cy="40" r="12" fill="none" stroke="${C.brandInk}" stroke-width="10"/>` +
      `<rect x="55" y="62" width="18" height="54" rx="6" fill="url(#gco)"/>` +
      `<rect x="73" y="82" width="20" height="13" rx="5" fill="${C.brandDark}"/>` +
      `<rect x="73" y="102" width="14" height="13" rx="5" fill="${C.brandDark}"/>`,
  ),
};

await mkdir(OUT_DIR, { recursive: true });

const report = [];
for (const [name, markup] of Object.entries(ICONS)) {
  const file = path.join(OUT_DIR, `${name}.png`);
  const png = await sharp(Buffer.from(markup)).resize(SIZE, SIZE).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(file, png);
  await writeFile(path.join(OUT_DIR, `${name}.svg`), markup);
  report.push({ name, kb: +(png.length / 1024).toFixed(1) });
}

const tooBig = report.filter((r) => r.kb > 256);
console.log(`Wygenerowano ${report.length} ikon (PNG 128x128 + zrodlowy SVG):\n`);
for (const r of report) console.log(`  ${r.name.padEnd(12)} ${String(r.kb).padStart(5)} KB`);
console.log(`\nLimit Discorda to 256 KB na emotke. Przekroczonych: ${tooBig.length}`);
process.exit(tooBig.length ? 1 : 0);
