import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = () => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const files = process.argv.length > 2 ? process.argv.slice(2) : ["README.md", "profile/README.md"].map((f) => join(root(), f)).filter(existsSync);
if (files.length === 0) {
  console.error("usage: node readme-lint.mjs [<README.md>...]  (default: the repository's README.md and profile/README.md)");
  process.exit(2);
}

const ATX = /^ {0,3}#{1,6}(\s|$)/;
const SETEXT = /^ {0,3}(=+|-+)\s*$/;
const HTML_HEADING = /<h[1-6][\s>]/i;
const ANCHOR = /^<a (?:id|name)="([^"]+)"><\/a>\s*$/;
const BANNER = /section-[\w.-]+?(?:-(?:dark|light))?\.svg/;

const lint = (file) => {
  const problems = [];
  const at = (n, msg) => problems.push(`${file}:${n}: ${msg}`);
  const lines = readFileSync(file, "utf8").split("\n");
  const base = dirname(file);
  const ids = new Set();
  const links = [];
  let fence = null;
  let headings = 0;
  lines.forEach((line, i) => {
    const n = i + 1;
    const f = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      return;
    }
    if (f) {
      fence = f[1];
      return;
    }
    const prev = lines[i - 1] ?? "";
    if (ATX.test(line)) {
      headings++;
      at(n, `markdown heading: titles are SVG banners, never "${line.trim()}"`);
    } else if (SETEXT.test(line) && prev.trim() && !/^\s*[<|>\-*+]/.test(prev) && !/^ {0,3}(`{3,}|~{3,})/.test(prev)) {
      headings++;
      at(n, `setext heading under "${prev.trim()}": titles are SVG banners`);
    }
    if (HTML_HEADING.test(line)) {
      headings++;
      at(n, "HTML heading <h1>-<h6>: titles are SVG banners");
    }
    for (const m of line.matchAll(/\b(?:id|name)="([^"]+)"/g)) ids.add(m[1]);
    for (const m of line.matchAll(/(?:\]\(|href=")#([^)"\s]+)/g)) links.push([n, m[1]]);
    for (const m of line.matchAll(/(?:src|srcset)="([^"]+)"|!\[[^\]]*\]\(([^)\s]+)/g)) {
      const src = m[1] ?? m[2];
      if (!/^(https?:|data:|#)/.test(src) && !existsSync(join(base, decodeURIComponent(src.split(/[?#]/)[0])))) at(n, `image not found: ${src}`);
    }
    for (const m of line.matchAll(/<img\b[^>]*>/gi)) if (!/\balt="[^"]+"/.test(m[0])) at(n, "<img> without alt text");
    const anchor = line.match(ANCHOR);
    if (anchor) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const block = lines.slice(j, j + 6).join("\n");
      if (!/^\s*(<picture|<p align="center">|<img|!\[)/.test(lines[j] ?? "") || !BANNER.test(block)) at(n, `section "${anchor[1]}" has no banner right after its anchor`);
    }
    if (BANNER.test(line) && /<img\b[^>]*width="100%"/.test(line)) {
      let j = i - 1;
      while (j >= 0 && !ANCHOR.test(lines[j]) && j > i - 8) j--;
      if (j < 0 || !ANCHOR.test(lines[j])) at(n, "section banner without an <a id> anchor before it");
    }
  });
  for (const [n, id] of links) if (!ids.has(id)) at(n, `link to #${id}, which no anchor defines`);
  return { problems, headings };
};

let total = 0;
let headings = 0;
for (const file of files) {
  const r = lint(file);
  r.problems.forEach((p) => console.log(p));
  total += r.problems.length;
  headings += r.headings;
}
console.log(`readme-lint: ${files.length} file(s), ${headings} heading(s), ${total} problem(s)`);
process.exit(total ? 1 : 0);
