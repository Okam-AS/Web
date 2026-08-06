#!/usr/bin/env node
// The hub-file hazard, measured directly.
//
// compose.md 6/F1 asks for the journey specs after each merge because "a translations/*.ts merge
// resolved by concatenation can drop or duplicate a key that a journey asserts on screen, and the
// conflict will have been in the translations file while the damage shows in the page."
//
// Three files touched by 37 of 61 heads generate 666 of the frontend's 768 colliding pairs. This
// checks the named failure DIRECTLY and per-merge, instead of inferring it from a browser:
//
//   DUPLICATE  a key appearing twice in one file. In a JS object literal the second silently wins,
//              so this never throws and no test that reads the winning value can see it.
//   DROPPED    a key either merge parent had that the merge result does not. Concatenation-style
//              resolution loses hunks; nothing in the file's own syntax notices.
//   SKEW       a key in one language file and not its siblings -- a lane that added to en.ts and
//              not no.ts. Reported against a BASELINE so only skew this composition introduced
//              is charged to it.
//
// Usage: node translations-check.js <ours-ref> <theirs-ref> [--baseline]
'use strict';
const {execSync} = require('child_process');
const FILES = ['translations/en.ts', 'translations/no.ts', 'translations/de.ts'];
const WT = '/Users/svendaneel/okam/web-fe-candidate';
const BASELINE = '/Users/svendaneel/okam/Web-modules/lanes/L-COMPOSE-FE-CANDIDATE/receipts/translations-baseline.json';

const keysOf = (text) => {
  const out = [];
  for (const line of text.split('\n')) {
    const m = /^ {2}([A-Za-z0-9_$]+)\s*:/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
};
const at = (ref, file) => {
  try { return execSync(`git show ${ref}:${file}`, {cwd: WT, maxBuffer: 1 << 26}).toString(); }
  catch (e) { return null; }
};

const ours = process.argv[2], theirs = process.argv[3];
const wantBaseline = process.argv.includes('--baseline');
const report = {duplicate: [], dropped: [], skew: [], counts: {}};

const perFile = {};
for (const f of FILES) {
  const text = at('HEAD', f);
  if (text === null) { report.counts[f] = null; continue; }
  const ks = keysOf(text);
  perFile[f] = new Set(ks);
  report.counts[f] = ks.length;

  const seen = new Set(), dup = new Set();
  for (const k of ks) { if (seen.has(k)) dup.add(k); seen.add(k); }
  for (const k of dup) report.duplicate.push(`${f}:${k}`);

  if (ours && theirs) {
    for (const parent of [ours, theirs]) {
      const pt = at(parent, f);
      if (pt === null) continue;
      for (const k of keysOf(pt)) if (!seen.has(k)) report.dropped.push(`${f}:${k} (had by ${parent})`);
    }
  }
}

const langs = FILES.filter((f) => perFile[f]);
if (langs.length > 1) {
  const union = new Set();
  for (const f of langs) for (const k of perFile[f]) union.add(k);
  for (const k of union) {
    const missing = langs.filter((f) => !perFile[f].has(k));
    if (missing.length) report.skew.push(`${k} missing from ${missing.join(',')}`);
  }
}
report.skew.sort();

if (wantBaseline) {
  require('fs').writeFileSync(BASELINE, JSON.stringify({skew: report.skew, counts: report.counts}, null, 1));
  console.log(`BASELINE written: ${report.skew.length} pre-existing skew, counts ${JSON.stringify(report.counts)}`);
  process.exit(0);
}

let base = {skew: []};
try { base = JSON.parse(require('fs').readFileSync(BASELINE, 'utf8')); } catch (e) {}
const baseSkew = new Set(base.skew);
const newSkew = report.skew.filter((s) => !baseSkew.has(s));

const dedupDropped = [...new Set(report.dropped)];
const bad = report.duplicate.length + dedupDropped.length;
const verdict = bad ? 'TRANSLATIONS-DAMAGE' : (newSkew.length ? 'TRANSLATIONS-NEW-SKEW' : 'TRANSLATIONS-OK');
console.log(`${verdict} | keys ${JSON.stringify(report.counts)} | dup=${report.duplicate.length} dropped=${dedupDropped.length} new-skew=${newSkew.length} (baseline skew ${base.skew.length})`);
for (const d of report.duplicate.slice(0, 20)) console.log(`  DUPLICATE ${d}`);
for (const d of dedupDropped.slice(0, 20)) console.log(`  DROPPED   ${d}`);
for (const d of newSkew.slice(0, 20)) console.log(`  NEW-SKEW  ${d}`);
process.exit(bad ? 1 : 0);
