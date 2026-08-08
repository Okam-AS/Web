#!/usr/bin/env node
//
// The Ask Okam vocabulary guard.
//
// WHAT IT IS FOR. The assistant answers questions about a venue's own numbers and proposes changes a
// human approves. It is NOT a compliance product, it produces no statutory document, and it certifies
// nothing. A sentence in its UI that says otherwise is not a wording preference — it is the product
// making a claim it cannot keep, in a surface a merchant may reasonably rely on. This is a standing
// ruling and it has already been enforced elsewhere in this repository (the Timesheets block carries
// the same note: "No statute or § is named anywhere in this block").
//
// The four forbidden words, and why each is on the list:
//
//   internkontroll   The Norwegian statutory internal-control regime (internkontrollforskrifta). Okam
//                    operates no part of it. A screen that uses the word invites a venue to file this
//                    surface as their internal-control system, which it is not.
//   IK-mat           The food-safety internal-control system specifically. Same failure, narrower and
//                    worse: it names a regime with inspection consequences.
//   complian         An English claim of conformance with an unnamed standard. It is unfalsifiable as
//                    written, so it can only mislead. Matched as the STEM, so it catches "compliant"
//                    and "compliance" alike — the noun makes the same claim as the adjective, and
//                    `'compliance'.includes('compliant')` is FALSE, so a list holding the adjective
//                    would have waved the noun straight through.
//   lovlig           "Lawful". The assistant cannot rule on legality, and the merchant must never read
//                    a proposal card as legal advice. Matched as a substring ON PURPOSE, so it also
//                    catches "ulovlig" ("unlawful") — a claim in the other direction is the same
//                    class of claim, and "this is not unlawful" is if anything the more dangerous of
//                    the two.
//
// HOW IT READS THE FILES. It extracts `key: 'value'` pairs with a regex rather than importing the
// modules, for two reasons: the dictionaries are `.ts` and a plain node process cannot import them
// without a transpile step this repo does not have on the lint path, and — more importantly — a
// whole-file text scan would match the EXPLANATORY COMMENTS, including the ones in this file's own
// sibling blocks that necessarily quote the forbidden words to explain them. A guard that fires on
// the document explaining it is a guard that gets switched off.
//
// It also checks KEY PARITY across the three dictionaries. A key present in `no` and missing in `de`
// does not fail loudly at runtime — `$i` falls back no → en → de and finally to the key itself — so
// the symptom is a German operator reading a Norwegian sentence, or a raw key, with nothing red
// anywhere. That is exactly the class of defect a lint should catch and a human review will not.
//
// usage:  node scripts/assistant-vocab-lint.mjs
// exit:   0 clean · 1 a violation was found · 2 refused to run (an input is missing)

/* eslint-disable no-console -- this is a command-line guard whose stdout and stderr ARE its output;
   there is nowhere else for a violation to be reported to, and the calling shell reads both. */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// The tree whose dictionaries are checked. Overridable ONLY so this guard can be pointed at a
// doctored copy and proved to fail — a lint nobody has watched fail is indistinguishable from a
// lint that cannot. `test/assistant-vocab-lint.test.js` uses it for exactly that and for nothing
// else; the default is, and must stay, the repository this file is in.
const ROOT = process.env.ASSISTANT_VOCAB_ROOT || join(HERE, '..');
const LANGUAGES = ['no', 'en', 'de'];

// The prefix this guard governs. `nav_assistant` and `aIQueryBox_handoff` are deliberately OUT of
// scope: they belong to the sidebar and the statistics box, whose own vocabularies are not this
// lane's to rule on, and widening a guard past what it was ruled over is how a guard starts being
// argued with instead of obeyed.
const PREFIX = 'assistant_';

const FORBIDDEN = [
  { word: 'internkontroll', why: 'names the statutory internal-control regime; Okam operates no part of it' },
  { word: 'ik-mat', why: 'names the food-safety internal-control system, which this surface is not' },
  { word: 'complian', why: 'claims conformance with an unnamed standard (matches "compliant" and "compliance"); unfalsifiable as written' },
  { word: 'lovlig', why: 'claims a ruling on legality (also matches "ulovlig")' }
];

// `key: 'value'` or `key: "value"`, single line, tolerating an escaped quote inside the value and an
// optional trailing comma. Every key in these dictionaries is written on one line, which is what
// makes this tractable; a value broken across lines would be missed, so the parity count below is
// also a check that the extraction is still seeing what it should.
const PAIR = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(['"])((?:\\.|(?!\2).)*)\2\s*,?\s*$/;

function readPairs (language) {
  const path = join(ROOT, 'translations', `${language}.ts`);
  if (!existsSync(path)) {
    console.error(`REFUSING: no dictionary at ${path}`);
    process.exit(2);
  }
  const pairs = new Map();
  readFileSync(path, 'utf8').split('\n').forEach((line, index) => {
    const match = PAIR.exec(line);
    if (match && match[1].startsWith(PREFIX)) {
      pairs.set(match[1], { value: match[3], line: index + 1, path });
    }
  });
  return pairs;
}

const dictionaries = new Map(LANGUAGES.map(language => [language, readPairs(language)]));

let failures = 0;
const fail = (message) => { failures += 1; console.error(`  FAIL  ${message}`); };

// ---------------------------------------------------------------------------------- vocabulary --
let scanned = 0;
for (const [language, pairs] of dictionaries) {
  for (const [key, entry] of pairs) {
    scanned += 1;
    const haystack = entry.value.toLowerCase();
    for (const { word, why } of FORBIDDEN) {
      if (haystack.includes(word)) {
        fail(`${language}.ts:${entry.line}  ${key} contains "${word}" — ${why}\n        ${entry.value}`);
      }
    }
  }
}

// -------------------------------------------------------------------------------------- parity --
const everyKey = new Set();
for (const pairs of dictionaries.values()) {
  for (const key of pairs.keys()) { everyKey.add(key); }
}
for (const key of [...everyKey].sort()) {
  const missing = LANGUAGES.filter(language => !dictionaries.get(language).has(key));
  if (missing.length) {
    fail(`${key} is missing from ${missing.join(', ')} — $i falls back silently, so this shows up as the wrong language rather than as an error`);
  }
}

// An extraction that suddenly sees nothing would pass every check above in silence, which is the
// same shape of lie the guard exists to prevent. A dictionary with no `assistant_*` keys at all
// means the regex stopped matching, not that the surface has no copy.
if (everyKey.size === 0) {
  console.error(`REFUSING: no ${PREFIX}* keys were found in any dictionary. The extraction is broken, not the copy.`);
  process.exit(2);
}

console.log(`assistant-vocab-lint: ${everyKey.size} keys × ${LANGUAGES.length} languages, ${scanned} strings scanned`);
if (failures > 0) {
  console.error(`assistant-vocab-lint: ${failures} violation(s)`);
  process.exit(1);
}
console.log('assistant-vocab-lint: clean');
