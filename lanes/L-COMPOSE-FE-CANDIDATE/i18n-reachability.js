#!/usr/bin/env node
// The assertion key-set bookkeeping cannot make.
//
// translations-check.js can see that a key left the file. It CANNOT tell a key a lane deleted on
// purpose (with its usage) from a key a merge lost -- and in this run all 33 of its "dropped"
// reports were the former, one key, deleted by lane/journey-workforce with no surviving caller.
//
// This is the check that matters to a person looking at the screen: a key the composed CODE still
// asks for and the composed TRANSLATIONS no longer carry. That renders as blank or as a raw key,
// and no jest suite in this repo fails on it.
'use strict';
const fs = require('fs'), path = require('path');
const WT = '/Users/svendaneel/okam/web-fe-candidate';
const SKIP = new Set(['node_modules', '.git', 'core', 'lanes', 'artifacts', '.nuxt', 'dist', 'coverage', 'test']);

const keys = new Set();
for (const line of fs.readFileSync(path.join(WT, 'translations/en.ts'), 'utf8').split('\n')) {
  const m = /^ {2}([A-Za-z0-9_$]+)\s*:/.exec(line);
  if (m) keys.add(m[1]);
}

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, {withFileTypes: true})) {
    if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('.')) walk(path.join(d, e.name)); }
    else if (/\.(vue|js|ts)$/.test(e.name)) files.push(path.join(d, e.name));
  }
})(WT);

const missing = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // $i('key')  /  $i("key")  -- the literal call sites. Dynamic keys are not decidable here and
  // are deliberately NOT guessed at; they are counted so the blind spot is stated, not hidden.
  let m, dynamic = 0;
  const re = /\$i\(\s*(['"])([A-Za-z0-9_$]+)\1\s*\)/g;
  while ((m = re.exec(src))) { if (!keys.has(m[2])) { if (!missing.has(m[2])) missing.set(m[2], []); missing.get(m[2]).push(path.relative(WT, f)); } }
  const red = /\$i\(\s*[^'")]/g;
  while ((red.exec(src))) dynamic++;
  if (dynamic) process.env.SHOW_DYN && console.log(`  dyn ${dynamic} ${path.relative(WT, f)}`);
}

console.log(`i18n reachability: ${keys.size} keys in en.ts, ${files.length} source files scanned`);
if (!missing.size) { console.log('I18N-OK — every literal $i() key the composed code asks for exists in the composed translations'); process.exit(0); }
console.log(`I18N-MISSING — ${missing.size} key(s) referenced by code and absent from translations/en.ts:`);
for (const [k, fs_] of missing) console.log(`  ${k}  <- ${fs_.slice(0, 3).join(', ')}`);
process.exit(1);
