// Compare two jest --json reports suite-by-suite and test-by-test.
// Totals can match while WHICH tests pass moves; that is the case this exists to catch.
const fs = require('fs'), path = require('path');
const [a, b] = process.argv.slice(2);
const load = f => {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const suites = new Map(), tests = new Map();
  for (const s of j.testResults) {
    const rel = path.relative('/Users/svendaneel/okam/web-vuejest', s.name);
    suites.set(rel, s.status);
    for (const t of s.assertionResults) tests.set(rel + ' :: ' + t.fullName, t.status);
  }
  return { j, suites, tests };
};
const A = load(a), B = load(b);
const tot = x => `suites ${x.numPassedTestSuites}P/${x.numFailedTestSuites}F/${x.numTotalTestSuites}T  tests ${x.numPassedTests}P/${x.numFailedTests}F/${x.numPendingTests}skip/${x.numTotalTests}T`;
console.log('A ' + a + '\n  ' + tot(A.j));
console.log('B ' + b + '\n  ' + tot(B.j));
const diffMap = (ma, mb, label) => {
  const keys = new Set([...ma.keys(), ...mb.keys()]);
  const rows = [];
  for (const k of [...keys].sort()) {
    const va = ma.get(k) ?? '<absent>', vb = mb.get(k) ?? '<absent>';
    if (va !== vb) rows.push(`  ${k}\n      A=${va}  B=${vb}`);
  }
  console.log(`\n${label} differing: ${rows.length}`);
  rows.forEach(r => console.log(r));
  return rows.length;
};
const sd = diffMap(A.suites, B.suites, 'SUITES');
const td = diffMap(A.tests, B.tests, 'TESTS');
console.log(`\nfailing suites in A: ${[...A.suites].filter(([,v])=>v!=='passed').map(([k])=>k).join(', ')||'(none)'}`);
console.log(`failing suites in B: ${[...B.suites].filter(([,v])=>v!=='passed').map(([k])=>k).join(', ')||'(none)'}`);
console.log(`\nVERDICT: ${sd===0&&td===0 ? 'IDENTICAL outcome sets (no suite and no test changed side)' : 'OUTCOMES MOVED'}`);
