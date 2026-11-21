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

const frame = (t, w, h, label, body, kind) => {
  const grid = [];
  for (let x = 64; x < w; x += 64) grid.push(`M${x} 0V${h}`);
  for (let y = 64; y < h; y += 64) grid.push(`M0 ${y}H${w}`);
  const glow = t.glow ? `<rect width="${w}" height="${h}" fill="url(#l)"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${kind ? ` data-kind="${kind}"` : ""} role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><defs><radialGradient id="l" cx="0.5" cy="0" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="${t.glow}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><clipPath id="c"><rect width="${w}" height="${h}" rx="16"/></clipPath>${defs()}</defs><g clip-path="url(#c)"><rect width="${w}" height="${h}" fill="${t.bg}"/><path d="${grid.join("")}" stroke="${t.line}" stroke-opacity="${t.grid}" fill="none"/>${glow}${body}</g><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="15.5" fill="none" stroke="${t.line}" stroke-opacity="0.18"/></svg>\n`;
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

const pipeline = (t, d) => {
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
  return frame(t, w, h, d.label, parts.join(""), "pipeline");
};

const W = 1200;
const M = 56;
const tone = (t, s) => (s === "muted" ? t.muted : s === "accent" ? t.accentText : t.ink);
const rowOf = (row) => (Array.isArray(row) ? row : [row, ""]);
const plate = (t, x, y, w, h, rx, accent, dashed) =>
  `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${t.box}" stroke="${accent ? t.accentText : t.line}" stroke-opacity="${accent ? 1 : 0.18}"${accent ? ' stroke-width="2"' : ""}${dashed ? ' stroke-dasharray="6 5"' : ""}/>`;
const head = (x, y, ang, color) => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const p = (dx, dy) => `${r(x + dx * c - dy * s)} ${r(y + dx * s + dy * c)}`;
  return `<path d="M${p(0, 0)}L${p(-11, -5)}L${p(-11, 5)}Z" fill="${color}"/>`;
};
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (p, n) => p[0] > n.x && p[0] < n.x + n.w && p[1] > n.y && p[1] < n.y + n.h;

const G = { title: 20, sub: 14, row: 16, label: 14, pad: 20 };
const nodeH = (n) =>
  n.shape === "start" || n.shape === "end" ? 26 : n.shape === "pill" ? (n.sub ? 72 : 52) : n.rows?.length ? 120 + (n.rows.length - 1) * 28 : n.sub ? 80 : 58;

const drawNode = (t, n) => {
  const { x, y, w, h } = n;
  const what = `node "${n.id}"`;
  if (n.shape === "start") return `<circle cx="${r(x + w / 2)}" cy="${r(y + h / 2)}" r="11" fill="${t.ink}"/>`;
  if (n.shape === "end") return `<circle cx="${r(x + w / 2)}" cy="${r(y + h / 2)}" r="12" fill="none" stroke="${t.ink}" stroke-width="2"/><circle cx="${r(x + w / 2)}" cy="${r(y + h / 2)}" r="6.5" fill="${t.ink}"/>`;
  if (n.shape === "pill") {
    const cx = x + w / 2;
    return [
      plate(t, x, y, w, h, h / 2, n.accent, n.dashed),
      centered(monoMedium, fit(monoMedium, n.title, G.title, w - 28, what), cx, n.sub ? y + 32 : y + h / 2 + 7, G.title, n.accent ? t.accentText : t.ink),
      n.sub ? centered(monoMedium, fit(monoMedium, n.sub, G.sub, w - 28, what), cx, y + 55, G.sub, t.muted) : "",
    ].join("");
  }
  return [
    plate(t, x, y, w, h, 12, n.accent, n.dashed),
    text(monoMedium, fit(monoMedium, n.title, G.title, w - 2 * G.pad, what), x + G.pad, y + 36, G.title, n.accent ? t.accentText : t.ink),
    n.sub ? text(monoMedium, fit(monoMedium, n.sub, G.sub, w - 2 * G.pad, what), x + G.pad, y + 60, G.sub, t.muted) : "",
    n.rows?.length ? `<path d="M${r(x + G.pad)} ${y + 78}H${r(x + w - G.pad)}" stroke="${t.line}" stroke-opacity="0.1"/>` : "",
    ...(n.rows ?? []).map((row, i) => {
      const [s, k] = rowOf(row);
      return text(monoMedium, fit(monoMedium, s, G.row, w - 2 * G.pad, what), x + G.pad, y + 106 + i * 28, G.row, tone(t, k));
    }),
  ].join("");
};

const graph = (t, d, kind, nodes, edges, groups, h) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const get = (id) => byId.get(id) ?? (() => { throw new Error(`diagram "${d.slug}": edge to unknown node "${id}"`); })();
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => { if (overlaps(a, b)) throw new Error(`diagram "${d.slug}": nodes "${a.id}" and "${b.id}" overlap`); }));
  const parts = [];
  const plates = [];
  for (const g of groups) {
    const ms = g.nodes.map(get);
    const x = Math.min(...ms.map((n) => n.x)) - 20;
    const y = Math.min(...ms.map((n) => n.y)) - 44;
    const box = { x, y, w: Math.max(...ms.map((n) => n.x + n.w)) + 20 - x, h: Math.max(...ms.map((n) => n.y + n.h)) + 20 - y };
    nodes.filter((n) => !g.nodes.includes(n.id) && overlaps(n, box)).forEach((n) => { throw new Error(`diagram "${d.slug}": node "${n.id}" sits inside group "${g.title}"`); });
    parts.push(
      `<rect x="${r(box.x)}" y="${r(box.y)}" width="${r(box.w)}" height="${r(box.h)}" rx="16" fill="none" stroke="${g.accent ? t.accentText : t.line}" stroke-opacity="${g.accent ? 0.8 : 0.28}" stroke-dasharray="6 6"/>`,
      text(monoMedium, fit(monoMedium, g.title, G.label, box.w - 32, `group "${g.title}"`), box.x + 16, box.y + 26, G.label, g.accent ? t.accentText : t.muted),
    );
  }
  const pairs = new Set(edges.map((e) => `${e.from}>${e.to}`));
  for (const e of edges) {
    const a = get(e.from);
    const b = get(e.to);
    const color = e.accent ? t.accentText : t.muted;
    const ca = [a.x + a.w / 2, a.y + a.h / 2];
    const cb = [b.x + b.w / 2, b.y + b.h / 2];
    const len = Math.hypot(cb[0] - ca[0], cb[1] - ca[1]);
    const px = -(cb[1] - ca[1]) / len;
    const py = (cb[0] - ca[0]) / len;
    const off = e.offset ?? (pairs.has(`${e.to}>${e.from}`) ? 9 : 0);
    ca[0] += px * off; ca[1] += py * off; cb[0] += px * off; cb[1] += py * off;
    const bend = e.bend ?? 0;
    const c = [(ca[0] + cb[0]) / 2 + px * bend, (ca[1] + cb[1]) / 2 + py * bend];
    const exit = (n, from, to) => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const k = Math.min(dx ? (n.w / 2 + 8) / Math.abs(dx) : Infinity, dy ? (n.h / 2 + 8) / Math.abs(dy) : Infinity);
      return [from[0] + dx * k, from[1] + dy * k];
    };
    const s = exit(a, ca, c);
    const f = exit(b, cb, c);
    const at = (u) => [(1 - u) ** 2 * s[0] + 2 * (1 - u) * u * c[0] + u * u * f[0], (1 - u) ** 2 * s[1] + 2 * (1 - u) * u * c[1] + u * u * f[1]];
    for (let u = 0.04; u < 0.97; u += 0.03)
      for (const n of nodes) if (n !== a && n !== b && inside(at(u), n)) throw new Error(`diagram "${d.slug}": edge ${e.from} -> ${e.to} crosses node "${n.id}"`);
    const dash = e.dashed ? ' stroke-dasharray="5 5"' : "";
    parts.push(`<path d="M${r(s[0])} ${r(s[1])}Q${r(c[0])} ${r(c[1])} ${r(f[0])} ${r(f[1])}" fill="none" stroke="${color}" stroke-width="1.5"${dash}/>`);
    parts.push(head(f[0], f[1], Math.atan2(f[1] - c[1], f[0] - c[0]), color));
    if (e.both) parts.push(head(s[0], s[1], Math.atan2(s[1] - c[1], s[0] - c[0]), color));
    if (e.label) {
      const lw = width(monoMedium, e.label, G.label) + 14;
      const q = at(e.labelAt ?? 0.5);
      const short = kind !== "hub" && Math.hypot(f[0] - s[0], f[1] - s[1]) < lw + 48;
      if (off || short) {
        const side = off ? Math.sign(off) : Math.abs(py) > Math.abs(px) ? (py > 0 ? -1 : 1) : px > 0 ? 1 : -1;
        const k = side * (Math.abs(px) * lw / 2 + Math.abs(py) * 12 + 4);
        q[0] += px * k;
        q[1] += py * k;
      }
      const box = { x: q[0] - lw / 2, y: q[1] - 12, w: lw, h: 24 };
      for (const n of nodes) if (overlaps(box, n)) throw new Error(`diagram "${d.slug}": label "${e.label}" covers node "${n.id}"`);
      for (const p of plates) if (overlaps(box, p.box)) throw new Error(`diagram "${d.slug}": label "${e.label}" covers label "${p.label}"`);
      plates.push({ box, label: e.label });
      parts.push(`<rect x="${r(box.x)}" y="${r(box.y)}" width="${r(lw)}" height="24" rx="6" fill="${t.bg}"/>` + text(monoMedium, e.label, box.x + 7, q[1] + 5, G.label, color));
    }
  }
  parts.push(...nodes.map((n) => drawNode(t, n)));
  return frame(t, W, h, d.label, parts.join(""), kind);
};

const gridLayout = (d, nodes, top) => {
  const cols = d.cols ?? Math.max(...nodes.map((n) => n.at[0] + (n.span ?? 1)));
  const [gx, gy] = d.gap ?? [72, 72];
  const cw = (W - 2 * M - (cols - 1) * gx) / cols;
  const rows = [];
  for (const n of nodes) {
    const span = n.span ?? 1;
    const full = span * cw + (span - 1) * gx;
    n.w = n.shape === "start" || n.shape === "end" ? 26 : Math.min(n.width ?? full, full);
    n.x = M + n.at[0] * (cw + gx) + (full - n.w) / 2;
    n.h = nodeH(n);
    const ri = Math.floor(n.at[1]);
    rows[ri] = Math.max(rows[ri] ?? 0, n.h);
  }
  const rowY = [];
  let y = top;
  for (let i = 0; i < rows.length; i++) {
    rowY[i] = y;
    y += (rows[i] ?? 0) + gy;
  }
  for (const n of nodes) {
    const ri = Math.floor(n.at[1]);
    const frac = n.at[1] - ri;
    n.y = rowY[ri] + frac * ((rows[ri] ?? 0) + gy) + ((rows[ri] ?? 0) - n.h) / 2;
  }
  return Math.max(...nodes.map((n) => n.y + n.h));
};

const map = (t, d, kind = "map") => {
  reset();
  const groups = d.groups ?? [];
  const nodes = d.nodes.map((n) => ({ ...n, shape: n.shape ?? (kind === "states" ? "pill" : "box") }));
  const bottom = gridLayout(d, nodes, 48 + (groups.length ? 44 : 0));
  return graph(t, d, kind, nodes, d.edges ?? [], groups, bottom + 48 + (groups.length ? 20 : 0));
};

const hub = (t, d) => {
  reset();
  const n = d.spokes.length;
  const sw = d.spokeWidth ?? 270;
  const center = { ...d.center, id: d.center.id ?? "center", shape: "box", accent: d.center.accent ?? true };
  center.w = d.center.width ?? 300;
  center.h = nodeH(center);
  const spokes = d.spokes.map((s, i) => ({ ...s, id: s.id ?? `spoke${i}`, shape: "box", accent: s.highlight, w: sw, h: nodeH(s) }));
  const sh = Math.max(...spokes.map((s) => s.h));
  const rx = (W - 2 * M - sw) / 2;
  const ry = d.ry ?? Math.max(center.h / 2 + sh / 2 + 130, 240);
  const cx = W / 2;
  const cy = 48 + ry + sh / 2;
  const start = d.start ?? -90 + (n % 2 ? 0 : 180 / n);
  spokes.forEach((s, i) => {
    const a = ((s.angle ?? start + (360 * i) / n) * Math.PI) / 180;
    s.x = cx + rx * Math.cos(a) - s.w / 2;
    s.y = cy + ry * Math.sin(a) - s.h / 2;
  });
  center.x = cx - center.w / 2;
  center.y = cy - center.h / 2;
  const edges = spokes.map((s, i) => {
    const out = s.dir === "out";
    return { from: out ? center.id : s.id, to: out ? s.id : center.id, both: s.dir === "both", label: s.label, accent: d.spokes[i].accent, dashed: s.dashed, labelAt: s.labelAt ?? (out || s.dir === "both" ? 0.6 : 0.4) };
  });
  const h = Math.max(...spokes.map((s) => s.y + s.h), center.y + center.h) + 48;
  return graph(t, d, "hub", [center, ...spokes], edges, [], h);
};

const pool = (t, d) => {
  const k = d.workers.length;
  const mid = (k - 1) / 2;
  const cols = [d.source, d.queue, "workers", d.sink].filter(Boolean);
  const col = (x) => cols.indexOf(x);
  const nodes = [];
  const edges = [];
  if (d.source) nodes.push({ ...d.source, id: "source", at: [col(d.source), mid] });
  nodes.push({ ...d.queue, id: "queue", at: [col(d.queue), mid], accent: d.queue.accent ?? true });
  d.workers.forEach((w, i) => nodes.push({ ...w, id: `w${i}`, at: [col("workers"), i] }));
  if (d.sink) nodes.push({ ...d.sink, id: "sink", at: [col(d.sink), mid] });
  const half = Math.floor(mid);
  if (d.source) edges.push({ from: "source", to: "queue", label: d.source.label, accent: true });
  d.workers.forEach((_, i) => edges.push({ from: "queue", to: `w${i}`, label: i === half && k % 2 ? d.queue.label : undefined }));
  if (d.sink) d.workers.forEach((_, i) => edges.push({ from: `w${i}`, to: "sink", label: i === half && k % 2 ? d.sink.label : undefined }));
  return map(t, { ...d, cols: cols.length, gap: d.gap ?? [110, 28], nodes, edges }, "pool");
};

const sequence = (t, d) => {
  reset();
  const n = d.actors.length;
  const colW = (W - 2 * M) / n;
  const xs = d.actors.map((_, i) => M + colW * (i + 0.5));
  const idx = new Map(d.actors.map((a, i) => [a.id ?? a.title, i]));
  const top = 44;
  const hh = d.actors.some((a) => a.sub) ? 72 : 52;
  const bw = Math.min(colW - 24, 260);
  const step = d.step ?? 58;
  const y0 = top + hh + 58;
  const end = y0 + (d.messages.length - 1) * step + 34;
  const parts = [];
  d.actors.forEach((a, i) => {
    const x = xs[i] - bw / 2;
    parts.push(
      `<path d="M${r(xs[i])} ${top + hh}V${end}" stroke="${t.line}" stroke-opacity="0.22" stroke-dasharray="4 6"/>`,
      plate(t, x, top, bw, hh, 12, a.accent),
      centered(monoMedium, fit(monoMedium, a.title, G.title, bw - 28, "actor"), xs[i], a.sub ? top + 32 : top + 33, G.title, a.accent ? t.accentText : t.ink),
      a.sub ? centered(monoMedium, fit(monoMedium, a.sub, G.sub, bw - 28, "actor sub"), xs[i], top + 55, G.sub, t.muted) : "",
    );
  });
  d.messages.forEach((m, i) => {
    const y = y0 + i * step;
    const a = idx.get(m.from);
    const b = idx.get(m.to);
    if (a === undefined || b === undefined) throw new Error(`diagram "${d.slug}": message ${i + 1} names an unknown actor`);
    const color = m.accent ? t.accentText : t.muted;
    const dash = m.reply ? ' stroke-dasharray="5 5"' : "";
    const num = `${i + 1}  `;
    const lw = width(monoMedium, num + m.label, G.label);
    const label = (x) => runs([[monoMedium, num, G.label, t.muted], [monoMedium, m.label, G.label, m.accent ? t.accentText : t.ink]], x, y - 10);
    if (a === b) {
      const x = xs[a] + 6;
      parts.push(`<path d="M${r(x)} ${y - 9}H${r(x + 34)}V${y + 9}H${r(x + 12)}" fill="none" stroke="${color}" stroke-width="1.5"${dash}/>`, head(x + 2, y + 9, Math.PI, color));
      parts.push(text(monoMedium, fit(monoMedium, num + m.label, G.label, (a === n - 1 ? W - M : xs[a + 1] - 16) - (x + 44), `message "${m.label}"`), x + 44, y + 5, G.label, color));
      return;
    }
    const dir = Math.sign(b - a);
    const x1 = xs[a] + dir * 6;
    const x2 = xs[b] - dir * 6;
    if (lw > Math.abs(x2 - x1) - 20) throw new Error(`diagram "${d.slug}": message "${m.label}" overflows its span (${r(lw)} > ${r(Math.abs(x2 - x1) - 20)})`);
    parts.push(`<path d="M${r(x1)} ${y}H${r(x2 - dir * 4)}" stroke="${color}" stroke-width="1.5"${dash}/>`, head(x2, y, dir > 0 ? 0 : Math.PI, color));
    parts.push(label((x1 + x2) / 2 - lw / 2));
  });
  return frame(t, W, end + 40, d.label, parts.join(""), "sequence");
};

const layers = (t, d) => {
  reset();
  const top = 44;
  const bh = d.bandHeight ?? 100;
  const gap = 58;
  const lw = d.titleWidth ?? 340;
  const parts = [];
  d.bands.forEach((b, i) => {
    const y = top + i * (bh + gap);
    const what = `band "${b.title}"`;
    parts.push(
      plate(t, M, y, W - 2 * M, bh, 14, b.accent, b.dashed),
      text(monoMedium, fit(monoMedium, b.title, 22, lw - 48, what), M + 26, y + bh / 2 - (b.sub ? 4 : -8), 22, b.accent ? t.accentText : t.ink),
      b.sub ? text(monoMedium, fit(monoMedium, b.sub, G.sub, lw - 48, what), M + 26, y + bh / 2 + 22, G.sub, t.muted) : "",
      `<path d="M${M + lw} ${y + 18}V${y + bh - 18}" stroke="${t.line}" stroke-opacity="0.1"/>`,
    );
    const items = (b.items ?? []).map(rowOf);
    const cw = items.map(([s]) => width(monoMedium, s, G.row) + 32);
    const room = W - M - 24 - (M + lw + 24);
    if (cw.reduce((a, c) => a + c, 0) + 12 * Math.max(0, items.length - 1) > room) throw new Error(`diagram "${d.slug}": ${what} items overflow`);
    let x = M + lw + 24;
    items.forEach(([s, k], j) => {
      parts.push(`<rect x="${r(x)}" y="${y + bh / 2 - 20}" width="${r(cw[j])}" height="40" rx="20" fill="none" stroke="${k === "accent" ? t.accentText : t.line}" stroke-opacity="${k === "accent" ? 1 : 0.22}"/>`, text(monoMedium, s, x + 16, y + bh / 2 + 6, G.row, tone(t, k)));
      x += cw[j] + 12;
    });
    const a = d.arrows?.[i];
    if (a && i < d.bands.length - 1) {
      const ax = M + lw / 2;
      const y1 = y + bh + 6;
      const y2 = y + bh + gap - 6;
      const color = a.accent ? t.accentText : t.muted;
      parts.push(`<path d="M${ax} ${y1 + (a.dir === "up" || a.dir === "both" ? 10 : 0)}V${y2 - (a.dir === "up" ? 0 : 10)}" stroke="${color}" stroke-width="1.5"${a.dashed ? ' stroke-dasharray="5 5"' : ""}/>`);
      if (a.dir !== "up") parts.push(head(ax, y2, Math.PI / 2, color));
      if (a.dir === "up" || a.dir === "both") parts.push(head(ax, y1, -Math.PI / 2, color));
      if (a.label) parts.push(text(monoMedium, fit(monoMedium, a.label, G.label, W - 2 * M - lw / 2 - 40, "layer arrow"), ax + 16, (y1 + y2) / 2 + 5, G.label, color));
    }
  });
  return frame(t, W, top + d.bands.length * (bh + gap) - gap + 44, d.label, parts.join(""), "layers");
};

const KINDS = { pipeline, layers, hub, sequence, states: (t, d) => map(t, d, "states"), pool, map: (t, d) => map(t, d, "map") };
const diagram = (t, d) => {
  if (!KINDS[d.kind]) throw new Error(`diagram "${d.slug}": kind must be one of ${Object.keys(KINDS).join(", ")}; pick it from the system's real shape`);
  if (!d.why) throw new Error(`diagram "${d.slug}": "why" is required, one line on why this kind fits this system`);
  return KINDS[d.kind](t, d);
};
if (!(spec.diagrams ?? []).length && !spec.diagramsWhy) console.warn('readme.assets.json: no diagrams and no "diagramsWhy" saying why a table explains it better');

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
