/**
 * Renders the bot's icon set to PNGs that can be uploaded as Discord server emoji.
 *
 * Discord shows emoji at roughly 22px inline and 48px in a reaction, so these are drawn
 * as bold shapes with no fine detail - anything thinner than ~8px in this 128px box
 * disappears at display size. Output is 128x128 with transparency, well under the 256KB
 * per-emoji limit.
 *
 * On Tailwind: an emoji is a raster image, so no CSS of any kind runs on it - there is
 * nothing for a class to attach to. What IS borrowed here is Tailwind's design system,
 * which is the part that actually decides whether something looks professional: its
 * colour ramps (a 400/500/600/900 step per hue rather than hand-mixed shades), its
 * radius scale, and its elevation model. Every value below is a Tailwind token.
 *
 *   node icons/build-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 128;

// Tailwind's palette, exact values. Using a real ramp is what stops the set looking
// hand-mixed: light/base/dark of one hue are guaranteed to sit in tune with each other.
const T = {
  amber100: "#FEF3C7",
  amber200: "#FDE68A",
  amber300: "#FCD34D",
  amber400: "#FBBF24",
  amber500: "#F59E0B",
  amber600: "#D97706",
  amber900: "#78350F",
  emerald400: "#34D399",
  emerald500: "#10B981",
  emerald600: "#059669",
  red400: "#F87171",
  red500: "#EF4444",
  red600: "#DC2626",
  indigo400: "#818CF8",
  indigo500: "#6366F1",
  indigo600: "#4F46E5",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate900: "#0F172A",
  white: "#FFFFFF",
};

// Tailwind's rounded-3xl (1.5rem) scaled from a 96px tile to this 128px box. A squircle
// rather than a circle: it fills the square emoji slot far better, which is why every
// modern app icon is shaped this way, and at 22px that extra area is the whole game.
const RADIUS = 32;
const INSET = 8; // breathing room so the shadow is not clipped

/**
 * One badge tile: gradient body, hairline top edge, gloss over the upper half, and a
 * soft drop shadow. This is Tailwind's elevation idea - a tinted shadow in the object's
 * own hue reads as depth, a grey one reads as dirt.
 */
function tile(id, light, base, dark) {
  const x = INSET;
  const size = SIZE - INSET * 2;

  return (
    `<defs>` +
    `<linearGradient id="b${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${light}"/>` +
    `<stop offset="0.52" stop-color="${base}"/>` +
    `<stop offset="1" stop-color="${dark}"/>` +
    `</linearGradient>` +
    `<linearGradient id="h${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${T.white}" stop-opacity="0.42"/>` +
    `<stop offset="1" stop-color="${T.white}" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<filter id="d${id}" x="-30%" y="-30%" width="160%" height="160%">` +
    `<feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="${dark}" flood-opacity="0.55"/>` +
    `</filter>` +
    `</defs>` +
    `<rect x="${x}" y="${x}" width="${size}" height="${size}" rx="${RADIUS}"` +
    ` fill="url(#b${id})" filter="url(#d${id})"/>` +
    // Hairline of lighter colour along the very top edge - the detail that reads as a
    // physical bevel rather than a printed rectangle.
    `<rect x="${x}" y="${x}" width="${size}" height="${size}" rx="${RADIUS}"` +
    ` fill="none" stroke="${light}" stroke-opacity="0.85" stroke-width="2"/>` +
    `<rect x="${x + 2}" y="${x + 2}" width="${size - 4}" height="${size / 2}" rx="${RADIUS - 4}"` +
    ` fill="url(#h${id})"/>`
  );
}

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">${body}</svg>`;

/** White glyph with a soft shadow so it never floats flat on the tile. */
const glyph = (body) =>
  `<g filter="url(#gs)" fill="none" stroke="${T.white}" stroke-width="11"` +
  ` stroke-linecap="round" stroke-linejoin="round">${body}</g>`;

// The region is in user space, not percentages of the bounding box. A horizontal rule
// like the minus glyph has a zero-height bbox, so a percentage region collapsed to
// nothing and the glyph vanished entirely.
const GLYPH_SHADOW =
  `<defs><filter id="gs" filterUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">` +
  `<feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="${T.slate900}" flood-opacity="0.28"/>` +
  `</filter></defs>`;

const AMBER = ["am", T.amber400, T.amber500, T.amber600];
const EMERALD = ["em", T.emerald400, T.emerald500, T.emerald600];
const RED = ["rd", T.red400, T.red500, T.red600];
const INDIGO = ["in", T.indigo400, T.indigo500, T.indigo600];
const SLATE = ["sl", T.slate300, T.slate400, T.slate500];

const ICONS = {
  // --- currency ---------------------------------------------------------
  // The first version was white letters straight on the tile over a 22%-opacity disc,
  // which was invisible - it read as "a square with JC on it", not a coin, and at 22px
  // the letters filled the whole tile and turned to mush. The disc is opaque and light
  // now, so the silhouette alone says coin even when the letters stop resolving, and
  // dark text on a light disc carries much further than white on amber.
  coin: svg(
    tile(...AMBER) +
      GLYPH_SHADOW +
      `<defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${T.amber100}"/><stop offset="1" stop-color="${T.amber300}"/>` +
      `</linearGradient></defs>` +
      `<g filter="url(#gs)">` +
      `<circle cx="64" cy="64" r="40" fill="url(#cf)"/>` +
      // Milled edge: the ring is what makes a flat disc read as struck metal.
      `<circle cx="64" cy="64" r="33" fill="none" stroke="${T.amber400}" stroke-width="3"/>` +
      `<text x="64" y="77" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"` +
      ` font-size="32" font-weight="900" fill="${T.amber900}">JC</text>` +
      `</g>`,
  ),

  wallet: svg(
    tile(...AMBER) +
      GLYPH_SHADOW +
      `<g filter="url(#gs)">` +
      `<rect x="30" y="42" width="68" height="46" rx="10" fill="${T.white}"/>` +
      `<rect x="30" y="42" width="68" height="14" rx="7" fill="${T.white}" fill-opacity="0.75"/>` +
      `<rect x="72" y="58" width="30" height="18" rx="9" fill="${T.amber900}"/>` +
      `<circle cx="87" cy="67" r="5" fill="${T.white}"/>` +
      `</g>`,
  ),

  // --- rewards ----------------------------------------------------------
  gift: svg(
    tile(...AMBER) +
      GLYPH_SHADOW +
      `<g filter="url(#gs)">` +
      `<rect x="30" y="58" width="68" height="16" rx="6" fill="${T.white}"/>` +
      `<rect x="36" y="74" width="56" height="32" rx="7" fill="${T.white}" fill-opacity="0.92"/>` +
      `<rect x="58" y="58" width="12" height="48" fill="${T.amber900}" fill-opacity="0.55"/>` +
      `<ellipse cx="48" cy="44" rx="15" ry="12" fill="${T.white}"/>` +
      `<ellipse cx="80" cy="44" rx="15" ry="12" fill="${T.white}"/>` +
      `<circle cx="64" cy="49" r="9" fill="${T.amber900}" fill-opacity="0.55"/>` +
      `</g>`,
  ),

  pending: svg(
    tile(...AMBER) +
      GLYPH_SHADOW +
      `<g filter="url(#gs)">` +
      `<circle cx="64" cy="64" r="32" fill="none" stroke="${T.white}" stroke-width="9"/>` +
      `<path d="M64 44v20h16" fill="none" stroke="${T.white}" stroke-width="9"` +
      ` stroke-linecap="round" stroke-linejoin="round"/>` +
      `</g>`,
  ),

  done: svg(tile(...EMERALD) + GLYPH_SHADOW + glyph(`<path d="M42 66l15 15 30-32"/>`)),

  cancelled: svg(
    tile(...RED) +
      GLYPH_SHADOW +
      glyph(`<circle cx="64" cy="64" r="28"/><path d="M44 84L84 44"/>`),
  ),

  // --- feedback ---------------------------------------------------------
  error: svg(
    tile(...RED) +
      GLYPH_SHADOW +
      `<g filter="url(#gs)">` +
      `<rect x="57" y="34" width="14" height="42" rx="7" fill="${T.white}"/>` +
      `<circle cx="64" cy="90" r="9" fill="${T.white}"/>` +
      `</g>`,
  ),

  info: svg(
    tile(...INDIGO) +
      GLYPH_SHADOW +
      `<g filter="url(#gs)">` +
      `<circle cx="64" cy="40" r="9" fill="${T.white}"/>` +
      `<rect x="57" y="55" width="14" height="41" rx="7" fill="${T.white}"/>` +
      `</g>`,
  ),

  plus: svg(tile(...EMERALD) + GLYPH_SHADOW + glyph(`<path d="M64 38v52M38 64h52"/>`)),

  minus: svg(tile(...RED) + GLYPH_SHADOW + glyph(`<path d="M38 64h52"/>`)),

  // --- people and access ------------------------------------------------
  user: svg(
    tile(...SLATE) +
      GLYPH_SHADOW +
      `<g filter="url(#gs)">` +
      `<circle cx="64" cy="52" r="17" fill="${T.white}"/>` +
      `<path d="M33 100a31 31 0 0 1 62 0z" fill="${T.white}"/>` +
      `</g>`,
  ),

  staff: svg(
    tile(...INDIGO) +
      GLYPH_SHADOW +
      `<g filter="url(#gs)">` +
      `<path d="M64 28l30 12v24c0 19-13 32-30 39-17-7-30-20-30-39V40z" fill="${T.white}"/>` +
      `<path d="M52 66l9 9 18-20" fill="none" stroke="${T.indigo600}" stroke-width="10"` +
      ` stroke-linecap="round" stroke-linejoin="round"/>` +
      `</g>`,
  ),

  // Drawn upright rather than on the usual diagonal: at 22px a rotated key reads as
  // three unrelated smudges, because the teeth stop touching the shaft.
  code: svg(
    tile(...AMBER) +
      GLYPH_SHADOW +
      `<g filter="url(#gs)">` +
      `<circle cx="64" cy="48" r="22" fill="none" stroke="${T.white}" stroke-width="11"/>` +
      `<rect x="57" y="66" width="14" height="36" rx="7" fill="${T.white}"/>` +
      `<rect x="71" y="76" width="16" height="11" rx="5" fill="${T.white}"/>` +
      `<rect x="71" y="91" width="11" height="11" rx="5" fill="${T.white}"/>` +
      `</g>`,
  ),
};

/**
 * A glyph can silently fail to render - the minus sign did, because its drop shadow
 * filter used a percentage region and a horizontal rule has a zero-height bounding box.
 * The result is a tile in one flat colour, which looks fine in a file listing and is
 * only caught by eye.
 *
 * So: measure contrast, not whiteness. Checking for white pixels would have passed the
 * broken minus (white tile? no) but failed the corrected coin, whose glyph is dark text
 * on a light disc. Comparing each pixel's luminance against the tile's dominant
 * luminance catches a missing glyph whichever way round it is drawn.
 */
async function glyphPixels(png) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const luma = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

  const values = [];
  for (let p = 0; p < data.length; p += info.channels) {
    if (info.channels === 4 && data[p + 3] < 200) continue; // ignore transparent margin
    values.push(luma(p));
  }
  if (!values.length) return 0;

  values.sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)]; // the tile itself
  return values.filter((v) => Math.abs(v - median) > 60).length;
}

const MIN_GLYPH_PIXELS = 300;

await mkdir(OUT_DIR, { recursive: true });

const report = [];
for (const [name, markup] of Object.entries(ICONS)) {
  const png = await sharp(Buffer.from(markup)).resize(SIZE, SIZE).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(OUT_DIR, `${name}.png`), png);
  await writeFile(path.join(OUT_DIR, `${name}.svg`), markup);
  report.push({ name, kb: +(png.length / 1024).toFixed(1), glyph: await glyphPixels(png) });
}

const tooBig = report.filter((r) => r.kb > 256);
const blank = report.filter((r) => r.glyph < MIN_GLYPH_PIXELS);

console.log(`Wygenerowano ${report.length} ikon (PNG 128x128 + zrodlowy SVG):\n`);
for (const r of report) {
  const flag = r.glyph < MIN_GLYPH_PIXELS ? "  <-- BRAK GLIFU" : "";
  console.log(`  ${r.name.padEnd(12)} ${String(r.kb).padStart(5)} KB   glif: ${String(r.glyph).padStart(5)} px${flag}`);
}

console.log(`\nLimit Discorda to 256 KB na emotke. Przekroczonych: ${tooBig.length}`);
console.log(`Ikon bez widocznego glifu: ${blank.length}`);
process.exit(tooBig.length || blank.length ? 1 : 0);
