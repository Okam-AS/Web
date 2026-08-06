#!/usr/bin/env node
/* Brace-matched extraction of data() bodies from .vue SFCs, then report
   top-level returned keys whose first char is _ or $ (Vue 2 initData skips
   proxy for those: isReserved -> charCode 0x24 || 0x5f).
   Also reports watch: keys with the same prefixes.
   Read-only. Writes nothing into the measured tree. */
const fs = require('fs');
const path = require('path');

const roots = process.argv.slice(2);
if (!roots.length) { console.error('usage: scan-data-keys.js <dir...>'); process.exit(2); }

function walk (dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p, out); } else if (e.name.endsWith('.vue')) { out.push(p); }
  }
  return out;
}

// return [startIndexOfOpen, indexAfterMatchingClose] scanning from `from`
function matchBrace (s, from, open, close) {
  let i = s.indexOf(open, from);
  if (i < 0) { return null; }
  let depth = 0;
  let inStr = null; let inLine = false; let inBlock = false; let inTpl = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j]; const n = s[j + 1]; const prev = s[j - 1];
    if (inLine) { if (c === '\n') { inLine = false; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inStr) { if (c === '\\') { j++; continue; } if (c === inStr) { inStr = null; } continue; }
    if (inTpl) { if (c === '\\') { j++; continue; } if (c === '`') { inTpl = false; } continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '`') { inTpl = true; continue; }
    if (c === open) { depth++; }
    else if (c === close) { depth--; if (depth === 0) { return [i, j + 1]; } }
    if (prev === undefined) { /* noop */ }
  }
  return null;
}

function stripCommentsAndStrings (s) {
  // replace comment + string bodies with spaces of equal length so indexes stay aligned
  let out = '';
  let inStr = null; let inLine = false; let inBlock = false; let inTpl = false;
  for (let j = 0; j < s.length; j++) {
    const c = s[j]; const n = s[j + 1];
    if (inLine) { out += (c === '\n' ? (inLine = false, '\n') : ' '); continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; out += '  '; j++; } else { out += (c === '\n' ? '\n' : ' '); } continue; }
    if (inStr) { if (c === '\\') { out += '  '; j++; continue; } if (c === inStr) { inStr = null; out += ' '; } else { out += ' '; } continue; }
    if (inTpl) { if (c === '\\') { out += '  '; j++; continue; } if (c === '`') { inTpl = false; out += ' '; } else { out += (c === '\n' ? '\n' : ' '); } continue; }
    if (c === '/' && n === '/') { inLine = true; out += '  '; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; out += '  '; j++; continue; }
    if (c === '"' || c === "'") { inStr = c; out += ' '; continue; }
    if (c === '`') { inTpl = true; out += ' '; continue; }
    out += c;
  }
  return out;
}

function lineOf (s, idx) { return s.slice(0, idx).split('\n').length; }

const files = [];
for (const r of roots) { walk(r, files); }
files.sort();

let scanned = 0;
const dataHits = [];
const watchHits = [];
const noDataBlock = [];

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  // take every <script ...> ... </script> block
  const blocks = [];
  const re = /<script\b[^>]*>/gi;
  let m;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('</script>', start);
    if (end > 0) { blocks.push([start, end]); }
  }
  if (!blocks.length) { continue; }
  scanned++;
  for (const [bs, be] of blocks) {
    const src = raw.slice(bs, be);
    const masked = stripCommentsAndStrings(src);

    // --- data blocks ---
    // forms: `data () {`, `data() {`, `data: function`, `data: () => ({`, `data: {`
    const dre = /(^|[^\w.$])data\s*(\(\s*\)\s*\{|:\s*function\s*\([^)]*\)\s*\{|:\s*\(\s*\)\s*=>\s*\(?\s*\{|:\s*\{)/g;
    let d; let found = false;
    while ((d = dre.exec(masked))) {
      found = true;
      const openAt = masked.indexOf('{', d.index + d[0].length - 1 - 1 >= 0 ? d.index : d.index);
      // find the '{' that this match ends on
      const braceIdx = d.index + d[0].length - 1;
      const mm = matchBrace(masked, braceIdx, '{', '}');
      if (!mm) { continue; }
      let [bodyStart, bodyEnd] = mm;
      let objStart = bodyStart; let objEnd = bodyEnd;
      // if it was a function body, locate the `return {` inside
      if (/\(\s*\)\s*\{$|function\s*\([^)]*\)\s*\{$/.test(d[2].trim()) || /\)\s*\{$/.test(d[2].trim())) {
        const rIdx = masked.indexOf('return', bodyStart);
        if (rIdx > 0 && rIdx < bodyEnd) {
          const rm = matchBrace(masked, rIdx, '{', '}');
          if (rm && rm[1] <= bodyEnd) { [objStart, objEnd] = rm; }
        }
      }
      // top-level keys of the object literal objStart..objEnd
      const inner = masked.slice(objStart + 1, objEnd - 1);
      const base = objStart + 1;
      let depth = 0;
      for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (c === '{' || c === '[' || c === '(') { depth++; continue; }
        if (c === '}' || c === ']' || c === ')') { depth--; continue; }
        if (depth !== 0) { continue; }
        if (c === '_' || c === '$') {
          // must be start of an identifier token
          const p = inner[i - 1];
          if (p && /[\w$.]/.test(p)) { continue; }
          const km = /^[_$][\w$]*/.exec(inner.slice(i));
          if (!km) { continue; }
          const after = inner.slice(i + km[0].length);
          if (/^\s*:/.test(after) || /^\s*[,}]/.test(after)) {
            dataHits.push({ file: f, line: lineOf(raw, bs + base + i), key: km[0], shorthand: !/^\s*:/.test(after) });
          }
          i += km[0].length - 1;
        }
      }
    }
    if (!found) { noDataBlock.push(f); }

    // --- watch blocks ---
    const wre = /(^|[^\w.$])watch\s*:\s*\{/g;
    let w;
    while ((w = wre.exec(masked))) {
      const braceIdx = w.index + w[0].length - 1;
      const wm = matchBrace(masked, braceIdx, '{', '}');
      if (!wm) { continue; }
      const inner = masked.slice(wm[0] + 1, wm[1] - 1);
      const base = wm[0] + 1;
      let depth = 0;
      for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (c === '{' || c === '[' || c === '(') { depth++; continue; }
        if (c === '}' || c === ']' || c === ')') { depth--; continue; }
        if (depth !== 0) { continue; }
        if (c === '_' || c === '$') {
          const p = inner[i - 1];
          if (p && /[\w$.]/.test(p)) { continue; }
          const km = /^[_$][\w$]*/.exec(inner.slice(i));
          if (!km) { continue; }
          if (/^\s*[:(]/.test(inner.slice(i + km[0].length))) {
            watchHits.push({ file: f, line: lineOf(raw, bs + base + i), key: km[0] });
          }
          i += km[0].length - 1;
        }
      }
    }
  }
}

console.log('files with <script>: ' + scanned + ' / ' + files.length + ' .vue files');
console.log('files with no recognised data block: ' + new Set(noDataBlock).size);
console.log('');
console.log('--- data() top-level keys starting with _ or $ (NOT proxied by Vue 2.7 initData) ---');
if (!dataHits.length) { console.log('(none)'); }
for (const h of dataHits) { console.log(h.file + ':' + h.line + '  key=' + h.key + (h.shorthand ? ' (shorthand)' : '')); }
console.log('');
console.log('--- watch keys starting with _ or $ ---');
if (!watchHits.length) { console.log('(none)'); }
for (const h of watchHits) { console.log(h.file + ':' + h.line + '  key=' + h.key); }
