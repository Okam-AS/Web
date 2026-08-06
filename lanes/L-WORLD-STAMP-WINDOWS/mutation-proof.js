#!/usr/bin/env node
//
// DO THE TWO WINDOW TESTS ACTUALLY RED WHEN THE GUARD IS REMOVED?
//
//   node lanes/L-WORLD-STAMP-WINDOWS/mutation-proof.js
//
// The exit criterion for this lane is "pinned by a test per window that REDS IF EITHER GUARD IS
// REMOVED", and a test that passes is not evidence of that — a test asserting nothing passes too. So
// each guard is deleted from a COPY of `world-stamp.js` in a temp directory and
// `test/world-stamp-windows.test.js` is run against the mutant through its `WORLD_STAMP_MODULE`
// affordance. Nothing in the checkout is edited: other lanes read these files.
//
// Two things are checked per mutant, and the second is the one that stops this being theatre:
//
//   * the anchor text was FOUND. A mutation that silently failed to apply would leave the real code
//     running, every test would pass, and this script would report "the guard is not pinned" for a
//     guard that is. It exits non-zero on a missed anchor instead.
//   * the NAMED tests failed, and the rest still passed. "Something went red" is satisfied by a typo.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE = path.join(REPO_ROOT, 'test', 'e2e', 'support', 'world-stamp.js');
const SPEC = path.join(REPO_ROOT, 'test', 'world-stamp-windows.test.js');

const W1_GUARD = `  // W1. Named first because it is the cheapest refusal and the one an operator most needs spelled out.
  const declaredBuild = String(builtFrom == null ? '' : builtFrom).trim();
  if (!declaredBuild) {
    throw new Error('a world stamp must name the build it is stamping: pass \`builtFrom\`, the token ' +
      '\`world-stamp.js built <repo>\` printed when the binary was built. Without it the stamp would ' +
      'record whatever the checkout says NOW, which is not necessarily what is running.');
  }
  const nowBuild = buildTokenOf(repo);
  if (!nowBuild) {
    throw new Error('not a git checkout, so there is no build to stamp: ' + repo);
  }
  if (nowBuild !== declaredBuild) {
    throw new Error('the checkout has moved since the build: ' + repo + ' was built from ' + declaredBuild +
      ' and now says ' + nowBuild + '. Refusing to stamp — a stamp naming ' + nowBuild +
      ' would name a commit this binary was not built from.');
  }`;

const W1_REVERTED = `  // [MUTANT] W1 removed: the build is read AT STAMP TIME, which is what the reviewed lane did.
  const nowBuild = buildTokenOf(repo);
  if (!nowBuild) {
    throw new Error('not a git checkout, so there is no build to stamp: ' + repo);
  }
  const declaredBuild = nowBuild;`;

const W2_GUARD = '  const servingPid = socketHolder(at.port, launchedPid);';
const W2_REVERTED = '  const servingPid = Number(launchedPid);  // [MUTANT] W2 removed: stamp `$!`, the launcher.';

const MUTANTS = [
  {
    id: 'W1',
    why: 'the build is read at STAMP time again, so a moved head is recorded instead of refused',
    from: W1_GUARD,
    to: W1_REVERTED,
    mustRed: [
      'refuses when the checkout has been rebased onto a different commit since the build',
      'refuses when the tree merely gained an edit after the build, because that is not the tree that was built',
      'will not stamp at all when nobody says which build it is stamping'
    ]
  },
  {
    id: 'W2',
    why: 'the launcher pid is stamped again, so liveness proves "the launcher is alive" and nothing more',
    from: W2_GUARD,
    to: W2_REVERTED,
    mustRed: [
      'records the process serving the port, not the launcher that started it',
      'loses its answer when the server dies — even though the launcher is still alive',
      'refuses when the port is held by a process this run did not start',
      'refuses when nothing is listening on the origin at all'
    ]
  }
];

function say (line) { process.stdout.write(line + '\n'); }

function runSpec (modulePath, label) {
  const report = path.join(os.tmpdir(), 'wsw-report-' + label + '-' + process.pid + '.json');
  const env = Object.assign({}, process.env, { CI: '1' });
  if (modulePath) { env.WORLD_STAMP_MODULE = modulePath; }
  spawnSync('npx', ['jest', SPEC, '--coverage=false', '--json', '--outputFile=' + report], {
    cwd: REPO_ROOT, env, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'], timeout: 300000
  });
  if (!fs.existsSync(report)) { throw new Error('jest produced no report for ' + label); }
  const parsed = JSON.parse(fs.readFileSync(report, 'utf8'));
  fs.rmSync(report, { force: true });
  const results = [];
  (parsed.testResults || []).forEach(file => (file.assertionResults || []).forEach(a => {
    results.push({ title: a.title, status: a.status });
  }));
  if (!results.length) { throw new Error('jest ran no assertions for ' + label); }
  return results;
}

function statusOf (results, title) {
  const hit = results.find(r => r.title === title);
  if (!hit) { throw new Error('no test titled: ' + title); }
  return hit.status;
}

let failed = 0;

say('BASELINE — the real module, unmutated');
const baseline = runSpec(null, 'baseline');
const baselineRed = baseline.filter(r => r.status !== 'passed');
say('  ' + baseline.length + ' tests, ' + baselineRed.length + ' not passing');
if (baselineRed.length) {
  failed += 1;
  baselineRed.forEach(r => say('    RED (should be green): ' + r.title));
}

const source = fs.readFileSync(SOURCE, 'utf8');

MUTANTS.forEach(mutant => {
  say('\nMUTANT ' + mutant.id + ' — ' + mutant.why);
  if (!source.includes(mutant.from)) {
    failed += 1;
    say('  ANCHOR NOT FOUND. The mutation did not apply, so this run says NOTHING about ' + mutant.id + '.');
    say('  Fix the anchor in this script before reading any verdict from it.');
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsw-mutant-' + mutant.id + '-'));
  const file = path.join(dir, 'world-stamp.js');
  fs.writeFileSync(file, source.replace(mutant.from, mutant.to));

  const results = runSpec(file, mutant.id);
  const stillGreen = mutant.mustRed.filter(title => statusOf(results, title) === 'passed');
  const wentRed = mutant.mustRed.filter(title => statusOf(results, title) !== 'passed');
  wentRed.forEach(title => say('  red as required   ' + title));
  stillGreen.forEach(title => say('  STILL GREEN       ' + title));
  if (stillGreen.length) { failed += 1; }

  // Collateral is reported, not failed on: removing a guard legitimately breaks the arm that proves
  // the guard works from the other direction too.
  const others = results.filter(r => r.status !== 'passed' && !mutant.mustRed.includes(r.title));
  others.forEach(r => say('  also red          ' + r.title));

  fs.rmSync(dir, { recursive: true, force: true });
});

say('');
if (failed) {
  say(failed + ' mutation(s) were not caught. A guard nothing reds on is a guard that can be deleted.');
  process.exit(1);
}
say('Both guards are pinned: removing either one reds the test written for it, and the unmutated');
say('module is green. Nothing in the checkout was edited to find that out.');
