#!/usr/bin/env node
import { execFileSync } from "node:child_process";
// Rewrites every colour literal under src/ to a Plano token or an app token from
// src/design-system/app-tokens.css. Rerunnable: tokens are not literals, so a second run is a no-op.
//   node scripts/plano-colors.mjs          apply the mapping, fail on any literal not in the table
//   node scripts/plano-colors.mjs --check  exit 1 if any literal remains outside the token files
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED = ["src/design-system/plano/", "src/design-system/app-tokens.css"];

// Opaque literal → token. A "/NN" suffix means that token at NN% opacity.
const SOLID = {
  // Accent family: the old teal brand and the green "complete" state become Plano's one accent.
  "#007780": "accent",
  "#006f77": "accent",
  "#00636a": "accent",
  "#0a6c73": "accent",
  "#08744c": "accent", // complete / met goal; Plano marks a met goal with accent
  "#00666e": "accent-dark",
  "#006a72": "accent-dark",
  "#005f66": "accent-dark",
  "#005d64": "accent-dark",
  "#075d63": "accent-dark",
  "#064f55": "accent-dark",
  "#055a60": "accent-dark",
  "#004f55": "accent-dark",
  "#07603f": "accent-dark",
  "#f3faf9": "accent-tint",
  "#f2fbfa": "accent-tint",
  "#e2f4ee": "accent-tint",
  "#effafa": "accent-tint",
  "#e8f5f4": "accent-tint",
  "#e1f3f0": "accent-tint",
  "#d8f6e8": "accent-tint",
  "#fbfffe": "accent-tint",
  // Secondary button. Its callers are routine edits (Move up/down, Add slot, Replace with custom
  // focus, Review swaps), not destructive actions, so red would misread as danger under Plano.
  // It joins the accent family; button.tsx restyles the variant as Plano's bordered secondary.
  "#d6462f": "accent",
  "#b93725": "accent-dark",
  // Ink: near-blacks and dark teal headings.
  "#11181b": "ink",
  "#120f0d": "ink",
  "#12100d": "ink",
  "#0d1417": "ink",
  "#142126": "ink",
  "#152126": "ink",
  "#151f20": "ink",
  "#162325": "ink",
  "#1d1a16": "ink",
  "#1c1917": "ink",
  "#0c0a09": "ink",
  "#063f44": "ink",
  "#0f2e34": "ink",
  "#0f172a": "ink",
  "#111827": "ink",
  "#1f2d32": "ink-2",
  "#293236": "ink-2",
  "#26353b": "ink-2",
  "#292524": "ink-2",
  "#3f474b": "ink-2",
  "#3f3932": "ink-2",
  "#3f4c52": "ink-2",
  "#405057": "ink-2",
  "#43535b": "ink-2",
  "#43565d": "ink-2",
  "#46555c": "ink-2",
  "#3d545d": "ink-2",
  "#4c4540": "ink-2",
  "#44403c": "ink-2",
  "#31505d": "ink-2",
  "#244256": "ink-2",
  "#5b4630": "ink-2", // body copy inside the volume notice
  "#5d4038": "ink-2",
  "#222f3e": "muted",
  // Muted: notes, meta, subtitles. Body copy never drops to faint.
  "#4f5c62": "muted",
  "#4f656e": "muted",
  "#4d5a60": "muted",
  "#4f5b60": "muted",
  "#506068": "muted",
  "#526873": "muted",
  "#536873": "muted",
  "#58656a": "muted",
  "#596267": "muted",
  "#5b6b72": "muted",
  "#5b6f78": "muted",
  "#5d6468": "muted",
  "#5d6970": "muted",
  "#68757b": "muted",
  "#697176": "muted",
  "#6f7a80": "muted",
  "#6a7d85": "muted",
  "#6b655f": "muted",
  "#7a8b92": "muted",
  "#57534e": "muted",
  "#78716c": "muted",
  // Faint: glyphs, empty-cell dashes and the neutral chart bar, never running text.
  "#8a969b": "faint",
  "#8f9aa0": "faint",
  "#96a0a5": "faint",
  // Paper: whites and creams.
  "#fffdfa": "surface",
  "#fffdf9": "surface",
  "#fdfcf9": "surface",
  "#fcfaf6": "surface",
  "#f7fbfb": "field",
  "#fafaf9": "field",
  "#fbf8f3": "bg",
  "#faf8f4": "bg",
  "#f4f0e8": "bg",
  "#f3eee5": "bg",
  "#f5f5f4": "track",
  "#f1e8dc": "track",
  "#e6ddcf": "border",
  "#d6d3d1": "input-border",
  // Warning: the under pair.
  "#8a4a18": "under-fg",
  "#9a612c": "under-fg",
  "#7c5a20": "under-fg",
  "#8a4b2b": "under-fg",
  "#7a4d0f": "under-fg",
  "#9a6417": "under-fg",
  "#92400e": "under-fg",
  "#78350f": "under-fg",
  "#451a03": "under-fg",
  "#fff8f1": "under-bg",
  "#fffbeb": "under-bg",
  "#db7a1d": "under",
  "#b45309": "under",
  "#b5791d": "under",
  "#f0cfad": "under/45",
  "#fcd34d": "under/45",
  // Errors: blocked drafts use the over pair, invalid input uses danger.
  "#7c2417": "over-fg",
  "#8c3f2c": "over-fg",
  "#7f1d1d": "over-fg",
  "#450a0a": "over-fg",
  "#fdf1ef": "over-bg",
  "#fef2f2": "over-bg",
  "#f3c3bb": "over-fg/30",
  "#fecaca": "over-fg/30",
  "#9f1239": "danger",
  "#b91c1c": "danger",
  // App data colours (app-tokens.css): training-split families and movement-pattern icons.
  "#e5edf6": "data-blue-bg",
  "#3a6d9c": "data-blue-mark",
  "#214b73": "data-blue-ink",
  "#ecefff": "data-blue-bg",
  "#355bd6": "data-blue-ink",
  "#f5eadb": "data-amber-bg",
  "#b0701f": "data-amber-mark",
  "#6f430f": "data-amber-ink",
  "#eee8f5": "data-violet-bg",
  "#6c4f8f": "data-violet-mark",
  "#4f376f": "data-violet-ink",
  "#ffe9e7": "data-red-bg",
};

// Literals whose role depends on where they sit, keyed by file name.
const IN_FILE = {
  "foundation-pattern-icon.tsx": { "#b93725": "data-red-ink" },
};

// Colours whose role depends on the property they colour, or that appear translucent.
// Each kind (text, fill, border, divider, outline, shadow, or any as the fallback) holds a rule:
// a token; "token/a" for that token at the literal's alpha; or a ramp of [alpha below, rule].
// A ramp that ends at 1 leaves opaque literals to SOLID.
const ACCENT_ALPHA = [[1, "accent/a"]];
const INK = {
  outline: "accent",
  shadow: [[1, "shadow-ink/a"]],
  border: [
    [0.07, "border-soft"],
    [0.125, "border"],
    [1, "input-border"],
  ],
  divider: [
    [0.105, "rule"],
    [1, "border"],
  ],
  fill: [
    [0.06, "rule"],
    [0.25, "track"],
    [1, "scrim"],
  ],
  text: [[1, "muted"]],
};
const TEAL = {
  outline: "accent",
  fill: [[0.125, "accent-tint"], ...ACCENT_ALPHA],
  any: ACCENT_ALPHA,
};
const WHITE = {
  text: "on-accent/a",
  outline: "on-accent/a",
  fill: [
    [0.5, "on-accent/a"],
    [2, "surface"],
  ],
  any: [
    [1, "on-accent/a"],
    [2, "surface"],
  ],
};
const SLATE = {
  text: [[1, "faint"]],
  any: [
    [0.2, "border"],
    [1, "faint"],
  ],
};
const paper = (token) => ({ fill: token, any: `${token}/a` });
const tinted = (token) => ({ fill: [[1, token]] });

const FAMILY = {
  "#1c1917": INK,
  "#0c0a09": INK,
  "#120f0d": INK,
  "#142126": INK,
  "#11181b": INK,
  "#0f172a": INK,
  "#111827": INK,
  "#222f3e": INK,
  "#007780": TEAL,
  "#00636a": TEAL,
  "#00484e": { outline: "accent", any: "accent-dark/a" },
  "#ffffff": WHITE,
  "#31505d": SLATE,
  "#f2fbfa": paper("accent-tint"),
  "#fffdf9": paper("surface"),
  "#fffdfa": paper("surface"),
  "#fffaf2": paper("field"),
  "#fafaf9": paper("field"),
  "#f4f0e8": paper("bg"),
  "#fff7ed": paper("under-bg"),
  "#fffbeb": paper("under-bg"),
  "#fbf8f3": {
    any: [
      [0.001, "transparent"],
      [2, "bg/a"],
    ],
  },
  "#b5791d": tinted("under-bg"),
  "#8c3f2c": tinted("over-bg"),
  "#08744c": tinted("accent-tint"),
  "#ba561f": { any: "under/a" },
};

const TAILWIND = {
  white: "#ffffff",
  black: "#000000",
  "stone-50": "#fafaf9",
  "stone-100": "#f5f5f4",
  "stone-300": "#d6d3d1",
  "stone-500": "#78716c",
  "stone-600": "#57534e",
  "stone-700": "#44403c",
  "stone-800": "#292524",
  "stone-900": "#1c1917",
  "stone-950": "#0c0a09",
  "red-50": "#fef2f2",
  "red-200": "#fecaca",
  "red-700": "#b91c1c",
  "red-900": "#7f1d1d",
  "red-950": "#450a0a",
  "amber-50": "#fffbeb",
  "amber-300": "#fcd34d",
  "amber-800": "#92400e",
  "amber-900": "#78350f",
  "amber-950": "#451a03",
};

const HUES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const TW_PREFIX =
  "bg|text|border(?:-[trblxy])?|divide|ring|outline|fill|stroke|from|via|to|shadow|decoration|placeholder|caret|accent";
const LITERAL = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\([^)]*\)/g;
const TW_PALETTE = new RegExp(
  `(?<![\\w-])(${TW_PREFIX})-(white|black|(?:${HUES})-(?:50|[1-9]00|950))(?:/(\\d+))?(?![\\w-])`,
  "g",
);
const TW_ARBITRARY = new RegExp(
  `(?<![\\w-])(${TW_PREFIX})-\\[(#[0-9a-fA-F]{3,8})\\](?:/(\\d+))?`,
  "g",
);

const CSS_KINDS = [
  [/^--.*(border|edge|rule)/, "border"],
  [/^--.*(focus|outline|ring)/, "outline"],
  [/^--.*shadow/, "shadow"],
  [/^--.*(bg|surface|gutter|track|fill|backdrop)/, "fill"],
  [/^--/, "text"],
  [/^border-(top|bottom|left|right)(-color)?$/, "divider"],
  [/^(border|column-rule)/, "border"],
  [/^outline/, "outline"],
  [/shadow|filter/, "shadow"],
  [/^background/, "fill"],
  [/^/, "text"],
];
const TW_KINDS = [
  [/^(bg|from|via|to)$/, "fill"],
  [/^border-[trbl]$/, "divider"],
  [/^(border|divide)/, "border"],
  [/^(ring|outline)$/, "outline"],
  [/^shadow$/, "shadow"],
  [/^/, "text"],
];
const kindOf = (kinds, name) => kinds.find(([pattern]) => pattern.test(name))[1];

const pct = (a) => Math.round(a * 1000) / 10;

function parse(literal) {
  const s = literal.toLowerCase().trim();
  if (s.startsWith("#")) {
    const short = s.length <= 5;
    const h = short ? [...s.slice(1)].map((c) => c + c).join("") : s.slice(1);
    const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
    return { base: `#${h.slice(0, 6)}`, a };
  }
  const [r, g, b, a = 1] = s
    .replace(/^rgba?\(|\)$/g, "")
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  const base = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  return { base, a };
}

function splitAlpha(value) {
  const [token, n = "100"] = value.split("/");
  return { token, alpha: Number(n) / 100 };
}

function pick(rule, a) {
  const chosen = Array.isArray(rule) ? rule.find(([below]) => a < below)?.[1] : rule;
  if (!chosen) return undefined;
  return chosen.endsWith("/a") ? { token: chosen.slice(0, -2), alpha: a } : splitAlpha(chosen);
}

function resolve(literal, kind, file) {
  const { base, a } = parse(literal);
  const pinned = IN_FILE[basename(file)]?.[base];
  const family = pinned ? undefined : FAMILY[base];
  const fromFamily = family && pick(family[kind] ?? family.any, a);
  const solid = pinned ?? SOLID[base];
  if (fromFamily || !solid) return fromFamily || undefined;
  const { token, alpha } = splitAlpha(solid);
  return { token, alpha: alpha * a };
}

function toCss({ token, alpha }) {
  if (token === "transparent") return "transparent";
  if (alpha >= 1) return `var(--${token})`;
  return `color-mix(in srgb, var(--${token}) ${pct(alpha)}%, transparent)`;
}

function toClass(prefix, { token, alpha }) {
  const n = pct(alpha);
  const suffix = alpha >= 1 ? "" : Number.isInteger(n) ? `/${n}` : `/[${n}%]`;
  return `${prefix}-${token}${suffix}`;
}

function withAlpha(hex, opacity) {
  if (opacity === undefined) return hex;
  const { base } = parse(hex);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${Number(opacity) / 100})`;
}

export function rewriteFile(text, file) {
  const missing = [];
  const rewrite = (match, literal, kind, format) => {
    const resolved = literal && resolve(literal, kind, file);
    if (resolved) return format(resolved);
    missing.push(match);
    return match;
  };
  const next = file.endsWith(".css") ? rewriteCss(text, rewrite) : rewriteTsx(text, rewrite);
  return { missing, text: next };
}

function rewriteCss(text, rewrite) {
  return text.replace(LITERAL, (literal, index) => {
    const before = text.slice(0, index);
    const start = Math.max(
      before.lastIndexOf(";"),
      before.lastIndexOf("{"),
      before.lastIndexOf("}"),
    );
    const prop = /^\s*(--[\w-]+|[a-z-]+)\s*:/.exec(text.slice(start + 1, index))?.[1] ?? "color";
    return rewrite(literal, literal, kindOf(CSS_KINDS, prop), toCss);
  });
}

function rewriteTsx(text, rewrite) {
  const rewriteClass = (match, prefix, color, opacity) =>
    rewrite(match, withAlpha(TAILWIND[color] ?? color, opacity), kindOf(TW_KINDS, prefix), (r) =>
      toClass(prefix, r),
    );
  const toArbitrary = (r) => toCss(r).replace(/,\s*/g, ",").replace(/\s+/g, "_");
  return text
    .replace(TW_PALETTE, rewriteClass)
    .replace(TW_ARBITRARY, rewriteClass)
    .replace(/\[[^\]\s"'`]*\]/g, (arbitrary) =>
      arbitrary.replace(LITERAL, (literal) => rewrite(literal, literal, "shadow", toArbitrary)),
    );
}

export function remainingLiterals(text, file) {
  const classes = file.endsWith(".css")
    ? []
    : [...(text.match(TW_PALETTE) ?? []), ...(text.match(TW_ARBITRARY) ?? [])];
  return [...classes, ...(text.replace(TW_ARBITRARY, "").match(LITERAL) ?? [])];
}

function check(files) {
  const offenders = files.flatMap((f) =>
    remainingLiterals(readFileSync(f, "utf8"), f).map((lit) => `${f}: ${lit}`),
  );
  if (!offenders.length)
    return console.log("plano-colors: no colour literals outside the token files");
  console.error(offenders.join("\n"));
  console.error(
    `\n${offenders.length} colour literals outside Plano tokens. Map them in scripts/plano-colors.mjs and run it.`,
  );
  process.exitCode = 1;
}

function apply(files) {
  const results = files.map((file) => {
    const text = readFileSync(file, "utf8");
    return { file, original: text, ...rewriteFile(text, file) };
  });
  const missing = results.flatMap(({ file, missing }) =>
    missing.map((lit) => `unmapped ${lit} in ${file}`),
  );
  if (missing.length) {
    console.error(
      `${missing.join("\n")}\n\n${missing.length} colour literals have no entry in the table. Nothing was written.`,
    );
    process.exitCode = 1;
    return;
  }
  const changed = results.filter(({ original, text }) => text !== original);
  for (const { file, text } of changed) writeFileSync(file, text);
  console.log(`plano-colors: rewrote ${changed.length} files`);
}

function sourceFiles() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src"])
    .toString()
    .trim()
    .split("\n")
    .filter((f) => /\.(css|tsx?)$/.test(f) && !ALLOWED.some((allowed) => f.startsWith(allowed)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) check(sourceFiles());
  else apply(sourceFiles());
}
