#!/usr/bin/env node
/* Enumerate the top-level option keys of the default export of every .vue SFC,
   inside <script> only, with comments/strings masked. This gives the POPULATION
   of declared option names, so the sweep is not limited to shapes guessed in
   advance. Read-only. */
const fs = require('fs');
const path = require('path');

const roots = process.argv.slice(2);
function walk (d, o) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { walk(p, o); } else if (e.name.endsWith('.vue')) { o.push(p); } } return o; }

function mask (s) {
  let out = ''; let str = null; let ln = false; let bl = false; let tpl = false;
  for (let j = 0; j < s.length; j++) {
    const c = s[j]; const n = s[j + 1];
    if (ln) { if (c === '\n') { ln = false; out += '\n'; } else { out += ' '; } continue; }
    if (bl) { if (c === '*' && n === '/') { bl = false; out += '  '; j++; } else { out += (c === '\n' ? '\n' : ' '); } continue; }
    if (str) { if (c === '\\') { out += '  '; j++; continue; } if (c === str) { str = null; } out += ' '; continue; }
    if (tpl) { if (c === '\\') { out += '  '; j++; continue; } if (c === '`') { tpl = false; } out += (c === '\n' ? '\n' : ' '); continue; }
    if (c === '/' && n === '/') { ln = true; out += '  '; j++; continue; }
    if (c === '/' && n === '*') { bl = true; out += '  '; j++; continue; }
    if (c === '"' || c === "'") { str = c; out += ' '; continue; }
    if (c === '`') { tpl = true; out += ' '; continue; }
    out += c;
  }
  return out;
}

function matchBrace (s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') { depth++; } else if (s[j] === '}') { depth--; if (depth === 0) { return j; } }
  }
  return -1;
}

const files = [];
for (const r of roots) { walk(r, files); }
files.sort();

const keyUse = new Map();   // key -> [file:line]
let parsed = 0; const unparsed = [];

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const sm = /<script\b[^>]*>/i.exec(raw);
  if (!sm) { unparsed.push(f + ' (no <script>)'); continue; }
  const bs = sm.index + sm[0].length;
  const be = raw.indexOf('</script>', bs);
  const src = raw.slice(bs, be);
  const m2 = mask(src);
  const ex = /export\s+default\s*\{/.exec(m2);
  if (!ex) { unparsed.push(f + ' (no `export default {`)'); continue; }
  const open = ex.index + ex[0].length - 1;
  const close = matchBrace(m2, open);
  if (close < 0) { unparsed.push(f + ' (unbalanced)'); continue; }
  parsed++;
  const inner = m2.slice(open + 1, close);
  const base = open + 1;
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '{' || c === '[' || c === '(') { depth++; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; continue; }
    if (depth !== 0) { continue; }
    if (!/[A-Za-z_$]/.test(c)) { continue; }
    const p = inner[i - 1];
    if (p && /[\w$.]/.test(p)) { continue; }
    const km = /^[A-Za-z_$][\w$]*/.exec(inner.slice(i));
    if (!km) { continue; }
    const rest = inner.slice(i + km[0].length);
    // option key: `name:` or `name (` (method shorthand) or `name,`/`name}` (shorthand prop)
    if (/^\s*:/.test(rest) || /^\s*\(/.test(rest) || /^\s*[,}]/.test(rest)) {
      const line = raw.slice(0, bs + base + i).split('\n').length;
      if (!keyUse.has(km[0])) { keyUse.set(km[0], []); }
      keyUse.get(km[0]).push(f + ':' + line);
    }
    i += km[0].length - 1;
  }
}

// Ground truth measured from the INSTALLED runtime, not from docs.
const VUE_LIFECYCLE = ['beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated',
  'beforeDestroy', 'destroyed', 'activated', 'deactivated', 'errorCaptured', 'serverPrefetch',
  'renderTracked', 'renderTriggered'];
const VUE_OTHER = ['data', 'props', 'propsData', 'computed', 'methods', 'watch', 'components', 'directives',
  'filters', 'mixins', 'extends', 'provide', 'inject', 'name', 'model', 'inheritAttrs', 'render',
  'staticRenderFns', 'functional', 'template', 'el', 'delimiters', 'comments', 'parent', 'setup',
  'renderError', '_scopeId', '__file'];
const NUXT_ANY = ['head', 'fetch', 'fetchOnServer', 'fetchDelay', 'loading'];
const NUXT_PAGE_ONLY = ['asyncData', 'middleware', 'layout', 'validate', 'watchQuery', 'scrollToTop',
  'transition', 'key', 'meta'];
const known = new Set([...VUE_LIFECYCLE, ...VUE_OTHER, ...NUXT_ANY, ...NUXT_PAGE_ONLY]);

console.log('parsed default-export option objects: ' + parsed + ' / ' + files.length + ' .vue files');
if (unparsed.length) { console.log('NOT parsed (' + unparsed.length + '):'); unparsed.forEach(u => console.log('   ' + u)); }
console.log('');
console.log('--- every top-level option key observed, with count ---');
const rows = [...keyUse.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [k, v] of rows) {
  const tag = known.has(k) ? '' : '   <== NOT a Vue 2.7 or Nuxt 2 option';
  console.log('  ' + String(v.length).padStart(4) + '  ' + k + tag);
}
console.log('');
console.log('--- UNRECOGNISED keys, with every site ---');
let any = false;
for (const [k, v] of rows) {
  if (known.has(k)) { continue; }
  any = true;
  console.log('  ' + k + ':');
  v.forEach(s => console.log('      ' + s));
}
if (!any) { console.log('  (none)'); }
console.log('');
console.log('--- NUXT PAGE-ONLY options declared under components/ (ignored there) ---');
let anyp = false;
for (const k of NUXT_PAGE_ONLY) {
  const v = (keyUse.get(k) || []).filter(s => s.startsWith('components/'));
  if (!v.length) { continue; }
  anyp = true;
  console.log('  ' + k + ': ' + v.join(', '));
}
if (!anyp) { console.log('  (none)'); }
