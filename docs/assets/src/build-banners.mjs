import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");
const here = process.argv[2] ? resolve(process.argv[2]) : dirname(fileURLToPath(import.meta.url));
const out = process.argv[3] ? resolve(process.argv[3]) : join(here, "..");
const spec = JSON.parse(readFileSync(join(here, "readme.assets.json"), "utf8"));

const font = (pkg, file) => {
  const buf = readFileSync(require.resolve(`@fontsource/${pkg}/files/${file}`));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const serif = font("instrument-serif", "instrument-serif-latin-400-normal.woff");
const italic = font("instrument-serif", "instrument-serif-latin-400-italic.woff");
const mono = font("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff");
const monoMedium = font("jetbrains-mono", "jetbrains-mono-latin-500-normal.woff");

const THEMES = {
  dark: { bg: "#0e1116", ink: "#f5f5f2", muted: "#8a919c", accent: "#c6f432", accentText: "#c6f432", box: "#12161d", line: "#f5f5f2", grid: 0.04, glow: 0.09 },
  light: { bg: "#f5f5f2", ink: "#0e1116", muted: "#586070", accent: "#c6f432", accentText: "#4a6a00", box: "#ffffff", line: "#0e1116", grid: 0.05, glow: 0 },
};

const width = (f, t, size) => f.getAdvanceWidth(t, size);
const r = (n) => Math.round(n * 10) / 10;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fit = (f, s, size, max, what) => {
  if (width(f, s, size) > max) throw new Error(`${what}: "${s}" overflows its box (${r(width(f, s, size))} > ${max})`);
  return s;
};

let glyphs;
const reset = () => {
  glyphs = new Map();
};
const glyphId = (f, glyph, size) => {
  const key = `${f.names.fullName.en}|${size}|${glyph.index}`;
  if (!glyphs.has(key)) glyphs.set(key, { id: `g${glyphs.size}`, d: glyph.getPath(0, 0, size).toPathData(size >= 30 ? 0 : 1) });
  return glyphs.get(key);
};
const defs = () => [...glyphs.values()].filter((g) => g.d).map((g) => `<path id="${g.id}" d="${g.d}"/>`).join("");
const text = (f, s, x, y, size, fill) => {
  const uses = [];
  f.forEachGlyph(s, x, y, size, { kerning: true }, (glyph, gx, gy) => {
    const g = glyphId(f, glyph, size);
    if (g.d) uses.push(`<use href="#${g.id}" x="${r(gx)}" y="${r(gy)}"/>`);
  });
  return `<g fill="${fill}">${uses.join("")}</g>`;
};
const runs = (parts, x, y) => {
  let cx = x;
  return parts
    .map(([f, s, size, fill]) => {
      const p = text(f, s, cx, y, size, fill);
      cx += width(f, s, size);
      return p;
    })
    .join("");
};

const mark = (x, y, s) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect width="1024" height="1024" rx="160" fill="#151a22"/><rect width="1024" height="190" fill="#1a1f27"/><rect y="190" width="1024" height="4" fill="#2a313c"/><circle cx="320" cy="96" r="22" fill="#3a424e"/><circle cx="392" cy="96" r="22" fill="#3a424e"/><circle cx="464" cy="96" r="22" fill="#c6f432"/><path d="M158 467L310 541V581L158 655V617L287 561L158 505Z" fill="#3a424e"/><path d="M376 432H441L521 688H532L612 432H677L578 732H477Z" fill="#f5f5f2"/><rect x="716" y="694.5" width="149" height="37.5" rx="9" fill="#c6f432"/></g>`;

const frame = (t, w, h, label, body) => {
  const grid = [];
  for (let x = 64; x < w; x += 64) grid.push(`M${x} 0V${h}`);
  for (let y = 64; y < h; y += 64) grid.push(`M0 ${y}H${w}`);
  const glow = t.glow ? `<rect width="${w}" height="${h}" fill="url(#l)"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><defs><radialGradient id="l" cx="0.5" cy="0" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="${t.glow}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><clipPath id="c"><rect width="${w}" height="${h}" rx="16"/></clipPath>${defs()}</defs><g clip-path="url(#c)"><rect width="${w}" height="${h}" fill="${t.bg}"/><path d="${grid.join("")}" stroke="${t.line}" stroke-opacity="${t.grid}" fill="none"/>${glow}${body}</g><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="15.5" fill="none" stroke="${t.line}" stroke-opacity="0.18"/></svg>\n`;
};

const wordmark = (t, x, y, size) => runs([[mono, "versatile", size, t.ink], [mono, ".sh", size, t.accentText]], x, y);
const centered = (f, s, cx, y, size, fill) => text(f, s, cx - width(f, s, size) / 2, y, size, fill);
const shrink = (f, s, size, min, max, what) => {
  while (width(f, s, size) > max && size > min) size -= 2;
  fit(f, s, size, max, what);
  return size;
};

const hero = (t) => {
  reset();
  const w = 1200;
  const h = 540;
  const cx = w / 2;
  const max = w - 160;
  const size = shrink(serif, spec.name, 128, 76, max, "hero name");
  const [lead, accent, tail = ""] = spec.pitch;
  let ps = 50;
  const pitchW = (n) => width(serif, lead, n) + width(italic, accent, n) + width(serif, tail, n);
  while (pitchW(ps) > max && ps > 38) ps -= 2;
  if (pitchW(ps) > max) throw new Error(`hero pitch overflows (${r(pitchW(ps))} > ${max})`);
  const ss = shrink(serif, spec.sub, 36, 28, max, "hero sub");
  const crumb = spec.badge ? `  /  ${spec.badge}` : "";
  const topW = 40 + 14 + width(mono, "versatile.sh", 20) + width(mono, crumb, 20);
  const tx = cx - topW / 2;
  const tags = spec.tags ?? [];
  const tagW = tags.map((tag) => width(mono, tag, 18) + 36);
  const rowW = tagW.reduce((a, b) => a + b, 0) + 14 * Math.max(0, tags.length - 1);
  if (rowW > w - 96) throw new Error("hero tags overflow");
  let px = cx - rowW / 2;
  const pills = tags
    .map((tag, i) => {
      const p = `<rect x="${r(px)}" y="430" width="${r(tagW[i])}" height="42" rx="21" fill="none" stroke="${t.line}" stroke-opacity="0.2"/>${text(mono, tag, px + 18, 457, 18, t.muted)}`;
      px += tagW[i] + 14;
      return p;
    })
    .join("");
  const body = [
    mark(tx, 50, 40 / 1024),
    wordmark(t, tx + 54, 77, 20),
    crumb ? text(mono, crumb, tx + 54 + width(mono, "versatile.sh", 20), 77, 20, t.muted) : "",
    centered(serif, spec.name, cx, 232, size, t.ink),
    runs([[serif, lead, ps, t.ink], [italic, accent, ps, t.accentText], [serif, tail, ps, t.ink]], cx - pitchW(ps) / 2, 312),
    centered(serif, spec.sub, cx, 368, ss, t.muted),
    `<path d="M${cx - 48} 400H${cx + 48}" stroke="${t.accent}" stroke-width="2"/>`,
    pills,
  ].join("");
  return frame(t, w, h, spec.heroLabel ?? `${spec.name}: ${lead}${accent}${tail} ${spec.sub}`, body);
};

const section = (t, kicker, plain, accent) => {
  reset();
  const w = 960;
  const h = 168;
  const cx = w / 2;
  const max = w - 96;
  let size = 64;
  const titleW = (n) => width(serif, plain, n) + width(italic, accent, n);
  while (titleW(size) > max && size > 44) size -= 2;
  if (titleW(size) > max) throw new Error(`section title "${plain}${accent}" overflows (${r(titleW(size))} > ${max})`);
  const crumb = `${spec.name}  /  ${kicker}`;
  fit(mono, crumb, 20, max - 40, "section breadcrumb");
  const cw = 26 + 12 + width(mono, crumb, 20);
  const bx = cx - cw / 2;
  const body = [
    mark(bx, 38, 26 / 1024),
    text(mono, crumb, bx + 38, 58, 20, t.muted),
    runs([[serif, plain, size, t.ink], [italic, accent, size, t.accentText]], cx - titleW(size) / 2, 132),
  ].join("");
  return frame(t, w, h, `${plain}${accent}`.trim(), body);
};

const diagram = (t, d) => {
  reset();
  const w = 1200;
  const n = d.cards.length;
  const top = 48;
  const gap = d.gap ?? 80;
  const pad = 24;
  const maxRows = Math.max(...d.cards.map((c) => c.rows.length));
  const boxH = d.height ?? Math.max(210, 146 + maxRows * 38);
  const weights = d.cards.map((c) => c.weight ?? 1);
  const unit = (w - 112 - gap * (n - 1)) / weights.reduce((a, b) => a + b, 0);
  const xs = [];
  const ws = [];
  let cx0 = 56;
  weights.forEach((wt, i) => {
    xs.push(cx0);
    ws.push(unit * wt);
    cx0 += unit * wt + gap;
  });
  const box = (x, y, bw, bh) => `<rect x="${x}" y="${y}" width="${r(bw)}" height="${bh}" rx="12" fill="${t.box}" stroke="${t.line}" stroke-opacity="0.18"/>`;
  const card = (c, x, bw) =>
    [
      box(x, top, bw, boxH),
      text(monoMedium, fit(monoMedium, c.title, 26, bw - 2 * pad, `card title`), x + pad, top + 50, 26, t.ink),
      text(monoMedium, fit(monoMedium, c.sub, 16, bw - 2 * pad, `card subtitle`), x + pad, top + 80, 16, t.muted),
      `<path d="M${r(x + pad)} ${top + 104}H${r(x + bw - pad)}" stroke="${t.line}" stroke-opacity="0.1"/>`,
      ...c.rows.map((row, i) => {
        const [s, tone] = Array.isArray(row) ? row : [row, ""];
        const fill = tone === "muted" ? t.muted : tone === "accent" ? t.accentText : t.ink;
        return text(monoMedium, fit(monoMedium, s, 18, bw - 2 * pad, `row`), x + pad, top + 146 + i * 38, 18, fill);
      }),
    ].join("");
  const arrow = (x1, x2, y, color, label) => {
    if (width(monoMedium, label, 16) > x2 - x1 - 8) throw new Error(`arrow label "${label}" does not fit the gap`);
    return `<path d="M${r(x1 + 12)} ${y}H${r(x2 - 14)}" stroke="${color}" stroke-width="1.5"/><path d="M${r(x2 - 22)} ${y - 5}L${r(x2 - 12)} ${y}L${r(x2 - 22)} ${y + 5}Z" fill="${color}"/>` +
      text(monoMedium, label, (x1 + x2) / 2 - width(monoMedium, label, 16) / 2, y - 14, 16, color);
  };
  const parts = d.cards.map((c, i) => card(c, xs[i], ws[i]));
  (d.arrows ?? []).forEach((a, i) => {
    if (!a) return;
    const color = a.accent ? t.accentText : t.muted;
    parts.push(arrow(xs[i] + ws[i], xs[i + 1], top + boxH / 2, color, a.label));
  });
  let h = top + boxH + 48;
  if (d.footer) {
    const f = d.footer;
    const at = f.under ?? Math.floor(n / 2);
    const fx = xs[at];
    const fw = ws[at];
    const cy = top + boxH + 48;
    const mid = fx + fw / 2;
    parts.push(
      `<path d="M${r(mid)} ${top + boxH + 8}V${cy - 14}" stroke="${t.muted}" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M${r(mid - 5)} ${cy - 18}L${r(mid)} ${cy - 8}L${r(mid + 5)} ${cy - 18}Z" fill="${t.muted}"/>`,
      f.label ? text(monoMedium, f.label, mid + 14, top + boxH + 30, 16, t.muted) : "",
      box(fx, cy, fw, 96),
      `<circle cx="${r(fx + pad + 5)}" cy="${cy + 35}" r="5" fill="${t.accent}"/>`,
      text(monoMedium, fit(monoMedium, f.title, 26, fw - 2 * pad - 22, "footer title"), fx + pad + 22, cy + 44, 26, t.ink),
      text(monoMedium, fit(monoMedium, f.sub, 16, fw - 2 * pad - 22, "footer sub"), fx + pad + 22, cy + 76, 16, t.muted),
    );
    h = cy + 96 + 48;
  }
  return frame(t, w, h, d.label, parts.join(""));
};

let count = 0;
const emit = (name, fn) => {
  for (const [variant, t] of Object.entries(THEMES)) {
    writeFileSync(join(out, `${name}-${variant}.svg`), fn(t));
    count++;
  }
};
emit("banner-hero", hero);
for (const [slug, kicker, plain, accent] of spec.sections ?? []) emit(`section-${slug}`, (t) => section(t, kicker, plain, accent));
for (const d of spec.diagrams ?? []) emit(`diagram-${d.slug}`, (t) => diagram(t, d));
console.log(`wrote ${count} images to ${out}`);
