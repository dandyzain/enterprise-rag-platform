/**
 * Design-token contrast audit for app/globals.css.
 *
 * Parses the light (:root) and dark (.dark) token blocks and verifies WCAG 2.x
 * contrast for every text-on-surface pairing the design system allows.
 *   - text tokens  >= 4.5:1 (AA, normal text)
 *   - UI tokens    >= 3:1   (AA, non-text: input boundaries, focus ring, icons)
 *
 * Usage: node scripts/check-design-tokens.mjs   (or `pnpm check:tokens`)
 */
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

function block(selector) {
  const start = css.search(new RegExp(`^${selector.replace(".", "\\.")}\\s*\\{`, "m"));
  if (start === -1) throw new Error(`Token block ${selector} not found`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  const tokens = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), a: 1 };
  }
  const rgb = value.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (rgb) return { rgb: [+rgb[1], +rgb[2], +rgb[3]], a: rgb[4] ? +rgb[4] : 1 };
  return null;
}

/** Composite a (possibly translucent) colour over an opaque base. */
function over(top, base) {
  return top.rgb.map((c, i) => Math.round(c * top.a + base[i] * (1 - top.a)));
}

function luminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background(s), minimum]. A background written "soft@card"
// means the translucent `soft` token composited over `card`.
const TEXT = 4.5;
const UI = 3;
const rules = [
  ["foreground", ["background", "card", "popover", "muted", "secondary", "accent", "sidebar"], TEXT],
  ["card-foreground", ["card"], TEXT],
  ["popover-foreground", ["popover"], TEXT],
  ["muted-foreground", ["background", "card", "popover", "muted", "secondary", "sidebar"], TEXT],
  ["subtle-foreground", ["background", "card", "popover", "muted", "sidebar"], TEXT],
  ["secondary-foreground", ["secondary"], TEXT],
  ["accent-foreground", ["accent"], TEXT],
  ["primary-foreground", ["primary"], TEXT],
  ["signal-foreground", ["signal"], TEXT],
  ["danger-foreground", ["danger"], TEXT],
  ["signal-text", ["background", "card", "signal-soft@card"], TEXT],
  ["warning-text", ["background", "card", "warning-soft@card"], TEXT],
  ["danger-text", ["background", "card", "danger-soft@card"], TEXT],
  ["info-text", ["background", "card", "info-soft@card"], TEXT],
  ["input", ["background", "card"], UI],
  ["ring", ["background", "card"], UI],
  ["signal", ["background", "card"], UI],
];

let failures = 0;
let checks = 0;

for (const [label, selector] of [
  ["light", ":root"],
  ["dark", ".dark"],
]) {
  const t = block(selector);
  const resolve = (name) => {
    const [token, baseName] = name.split("@");
    const c = parseColor(t[token] ?? "");
    if (!c) throw new Error(`[${label}] token --${token} missing or not a hex/rgb() colour`);
    if (c.a === 1) return c.rgb;
    const base = parseColor(t[baseName ?? "background"]);
    return over(c, base.rgb);
  };

  console.log(`\n${label.toUpperCase()} THEME`);
  for (const [fg, bgs, min] of rules) {
    for (const bg of bgs) {
      checks++;
      const r = ratio(resolve(fg), resolve(bg));
      const ok = r >= min;
      if (!ok) failures++;
      console.log(`  ${ok ? "✓" : "✗"} --${fg} on --${bg}: ${r.toFixed(2)}:1 (min ${min})`);
    }
  }
}

console.log(`\n${checks - failures}/${checks} contrast checks passed`);
process.exit(failures ? 1 : 0);
