// Mutates one guard at a time in test/e2e/support/artifact-store.js, runs the store suite, and
// reports how many tests each mutation kills. A mutation that kills nothing means the assertion that
// was supposed to cover it asserts nothing; twenty non-failing shapes have been catalogued on this
// branch this week, so a new guard arrives with its mutant or it does not arrive.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TARGET = path.join(ROOT, 'test/e2e/support/artifact-store.js');
// Read from the file itself rather than from a checked-in copy of it. A second copy of a source file
// living in a lane directory is a duplicate that drifts the first time the original is edited, and
// this branch merge-blocks on duplication. If this process is killed between the two writes below,
// `git checkout -- test/e2e/support/artifact-store.js` is the whole recovery.
const PRISTINE = fs.readFileSync(TARGET, 'utf8');

const MUTANTS = [
  {
    id: 'E',
    why: 'the displaced stronger record is destroyed again (preservation removed)',
    from: "  const supersedes = takes && standing && keyOfRecord(standing) === key && compareRank(incoming, standing) < 0\n    ? preserveStrongest(artifactDir, files, standing)\n    : null;",
    to: '  const supersedes = null;'
  },
  {
    id: 'F',
    why: 'the kept file is overwritten by whatever displaced last (high-water rule removed)',
    from: '  const kept = held && compareRank(standing, held) <= 0 ? held : standing;',
    to: '  const kept = standing;'
  },
  {
    id: 'G',
    why: 'the fixture goes back to answering null about its own build',
    from: "  const built = buildFromCheckout(repoRoot, 'fixture:' + (fixtureFile || 'test/e2e/fixture/api-server.js'));",
    to: '  const built = null; void repoRoot; void fixtureFile;'
  },
  {
    id: 'H',
    why: 'a dirty tree keys identically to the clean commit it sits on (dirty marker dropped)',
    from: "  const suffix = text.includes(DIRTY) ? '-dirty' : '';",
    to: "  const suffix = '';"
  }
];

function runSuite () {
  // BOTH streams, on both paths. Jest prints its summary on STDERR even when everything passes, so
  // reading only stdout on the success path reported "(no summary)" for the pristine run — a
  // comparison with nothing on one side of it, which is the shape this harness exists to catch.
  const r = spawnSync('npx', ['jest', 'test/journey-artifact-store.test.js', '--coverage=false'],
    { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || '') + (r.stderr || '');
}

function summary (out) {
  const line = (out.match(/^Tests:.*$/m) || ['Tests: (no summary)'])[0];
  return line.replace(/\s+/g, ' ').trim();
}

process.on('exit', () => { fs.writeFileSync(TARGET, PRISTINE); });
console.log('pristine   ' + summary(runSuite()));

MUTANTS.forEach((m) => {
  if (!PRISTINE.includes(m.from)) {
    console.log('mutant ' + m.id + '   REFUSED: the statement it mutates is no longer in the file.');
    process.exitCode = 2;
    return;
  }
  fs.writeFileSync(TARGET, PRISTINE.replace(m.from, m.to));
  console.log('mutant ' + m.id + '   ' + summary(runSuite()) + '   <- ' + m.why);
  fs.writeFileSync(TARGET, PRISTINE);
});

console.log('restored   ' + summary(runSuite()));
