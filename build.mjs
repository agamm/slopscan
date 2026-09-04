#!/usr/bin/env node
// Bundles src/ into a single drop-in IIFE. No dependencies by design: the
// output has to be pasteable into a console and encodable into a bookmarklet,
// so it must be one self-contained file with no imports and no runtime.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(ROOT, 'src/scan.js');
const OUT = resolve(ROOT, 'dist');

const IMPORT_RE = /^\s*import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]*)['"];?\s*$/;

// Depth-first over the import graph, emitting each module after its deps.
function order(file, seen = new Set(), out = []) {
  const key = resolve(file);
  if (seen.has(key)) return out;
  seen.add(key);
  const src = readFileSync(key, 'utf8');
  for (const line of src.split('\n')) {
    const m = line.match(IMPORT_RE);
    if (m) order(resolve(dirname(key), m[2]), seen, out);
    else if (/^\s*import\s/.test(line)) {
      throw new Error(`${relative(ROOT, key)}: unsupported import form -> ${line.trim()}`);
    }
  }
  out.push(key);
  return out;
}

// Imports become nothing (everything shares one scope); exports lose the keyword.
function strip(src) {
  return src.split('\n')
    .filter(l => !IMPORT_RE.test(l))
    .join('\n')
    .replace(/^export\s+(const|let|function|class)\s/gm, '$1 ')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
}

// Conservative: whole-line comments and indentation only, and only outside
// template literals. Never touches inline comments or anything that could be
// a regex literal.
function minify(src) {
  const out = [];
  let inTemplate = false, inBlock = false;
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (!inTemplate) {
      if (inBlock) { if (t.includes('*/')) inBlock = false; continue; }
      if (t.startsWith('/*')) { if (!t.includes('*/')) inBlock = true; continue; }
      if (t.startsWith('//')) continue;
      if (!t) continue;
    }
    out.push(inTemplate ? line : t);
    const ticks = (line.match(/(?<!\\)`/g) || []).length;
    if (ticks % 2 === 1) inTemplate = !inTemplate;
  }
  return out.join('\n');
}

const files = order(ENTRY);
const banner = `/* slopscan — deterministic AI-slop UI detector. ${files.length} modules, built ${new Date().toISOString().slice(0, 10)}. */`;
const body = files.map(f =>
  `\n// ---- ${relative(ROOT, f)} ${'-'.repeat(Math.max(0, 58 - relative(ROOT, f).length))}\n${strip(readFileSync(f, 'utf8')).trim()}`
).join('\n');

const bundle = `${banner}\n(() => {\n'use strict';\n${body}\n\nreturn runScan();\n})();\n`;
const min = `(()=>{'use strict';\n${minify(files.map(f => strip(readFileSync(f, 'utf8'))).join('\n'))}\nreturn runScan();})();`;

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'slopscan.js'), bundle);
writeFileSync(resolve(OUT, 'slopscan.min.js'), min);

// encodeURIComponent escapes far more than a javascript: URL needs. Only %,
// #, quote and newline actually have to go; everything else survives verbatim
// and the payload shrinks by roughly a third.
const bookmarklet = 'javascript:' + min
  .replace(/%/g, '%25')      // must run first
  .replace(/#/g, '%23')
  .replace(/"/g, '%22')
  .replace(/\r/g, '')
  .replace(/\n/g, '%0A');
writeFileSync(resolve(OUT, 'bookmarklet.txt'), bookmarklet);

// A bundle that does not parse is worse than no bundle.
for (const f of ['slopscan.js', 'slopscan.min.js']) {
  execFileSync(process.execPath, ['--check', resolve(OUT, f)]);
}

const html = readFileSync(resolve(ROOT, 'src/install.template.html'), 'utf8')
  .replace('__BOOKMARKLET__', bookmarklet
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
  .replace('__SIZE__', (bookmarklet.length / 1024).toFixed(1))
  .replace('__RULES__', String((bundle.match(/^\s*id: '/gm) || []).length));
writeFileSync(resolve(OUT, 'install.html'), html);
// also at the repo root, so GitHub Pages serves the drag target at / rather
// than at /dist/install.html
writeFileSync(resolve(ROOT, 'index.html'), html);

const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log(`modules   ${files.length}`);
console.log(`rules     ${(bundle.match(/^\s*id: '/gm) || []).length}`);
console.log(`bundle    ${kb(bundle.length)}  dist/slopscan.js`);
console.log(`minified  ${kb(min.length)}  dist/slopscan.min.js`);
console.log(`bookmark  ${kb(bookmarklet.length)}  dist/bookmarklet.txt`);
console.log(`install   dist/install.html + index.html`);
