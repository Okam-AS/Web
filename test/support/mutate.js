#!/usr/bin/env node
// THE CANONICAL MUTATION RUNNER. Copy THIS file — not a sibling lane's copy of it.
//
// Applies one mutation at a time to a source file, runs the named test file, records whether the
// suite RED-ed, and puts the source back before moving on. A test that stays green under every
// mutation of the line it claims to cover is not testing anything, and this is the instrument that
// says so.
//
// Usage: node mutate.js <mutations.json>
// Each entry: { file, test, name, from, to }
// `from` must appear EXACTLY ONCE in the file; a mutation that does not apply is reported as
// NOT-APPLIED rather than silently counted as a pass.
//
// ---- WHAT A KILL MEANS HERE, AND WHY THE OLD ANSWER WAS NOT ONE -------------------------------
//
// This runner used to decide RED with
//
//     /Tests:.*\d+ failed/.test(out) || run.status !== 0
//
// and ran jest under `--silent`. Three things followed, all of them measured on 2026-08-07 by the
// audit in `docs/plan/reviews/L-READ-WHETHER-THE-NEW-TESTS-CAN-ACTUALLY-FAIL.md`, and this file now
// exists to not have any of them:
//
//   1. NO BASELINE. Nothing established what the suite does UNMUTATED, so a test already failing
//      counted as killed by every mutation, and a suite that ran zero tests counted as killed by
//      every mutation too.
//   2. A CRASH SCORED AS A KILL. `run.status !== 0` is true for a syntax error, a missing module, a
//      jest config error, and for "no tests found" (jest exits 1). The mutation that breaks the file
//      hardest scores identically to the mutation the suite actually caught.
//   3. RED TEST NAMES WERE NEVER CAPTURED. `--silent` suppresses the `✕` lines the regex looked for,
//      so every committed result read `"reddened": 0, "first": []` — RED verdicts with no named red
//      test anywhere. Internally inconsistent as committed, and unable to support a per-test claim.
//
// The instrument therefore fails in BOTH directions: zero tests + exit 0 reads as a survivor, and
// zero tests + a parse failure reads as a kill. It is not enough to be careful about one of them.
//
// WHAT IS ASSERTED NOW:
//   * a baseline run per test path, BEFORE any mutation, whose total must be non-zero — a zero-test
//     baseline aborts the whole run rather than certifying everything in it;
//   * results are read from jest's own `--json`, not from scraping human output, so a test name is
//     a datum rather than a regex match;
//   * RED requires at least one NEWLY failed test — one failing now that was not failing at
//     baseline. A suite with a standing red no longer launders that red into a kill;
//   * a run that produced no parseable results, or fewer tests than the baseline, is INVALID or
//     SHORT-RUN. Neither counts as a kill;
//   * a mutant whose delimiters do not balance while the original's do is INVALID-MUTANT and is
//     never run — that is the specific shape that used to manufacture a false RED.
//
// AND THE OUTPUT IS A PER-TEST KILL MAP. `newlyRed` names on every entry, plus a closing report of
// every baseline-green test that no mutation ever reddened. "Every mutation was killed" and "every
// test can fail" are different claims; only the second is evidence a test is worth its line, and
// only this map can support it.
//
// ---- WHY THIS FILE LIVES HERE AND NOT IN A LANE DIRECTORY -------------------------------------
//
// It used to live in whichever lane wrote it first, and lanes copied it from each other. On
// 2026-08-07 three lanes in one evening started from a sibling's copy, and one of those copies
// restored with `git checkout` (see below) — so the defect propagated by exactly the mechanism that
// made the tool useful. A tool that lanes are expected to copy has to have one address that is not
// somebody's evidence directory. This is that address.

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ---- THE DEFECT THIS FILE EXISTS TO NOT HAVE --------------------------------------------------
//
// RESTORE FROM THE BUFFER THIS SCRIPT READ, NEVER FROM GIT.
//
// The original runner restored with `git checkout -- <file>`, which reverts the file to HEAD. That
// is correct only while the file under mutation is unmodified relative to HEAD — and a lane
// mid-flight is, by definition, the opposite of that. Run against uncommitted work it does not undo
// the mutation, it DELETES THE LANE'S OWN EDITS and calls it a restore. It did exactly that to
// `plugins/global-mixin.js` on first use.
//
// The buffer is the file as it stood one statement before the mutation was written, so it is the
// right answer whether the tree is clean, dirty, staged, on a detached head, or not a git
// repository at all. Nothing here consults git, and nothing here should ever start.
function restore (absPath, original) {
  fs.writeFileSync(absPath, original)
}

// The repository root, found by walking up to the nearest `package.json` rather than counting `../`
// from this file. The original counted four levels because it sat four levels down; a copy placed at
// any other depth silently resolved `m.file` against the WRONG directory and mutated — or created —
// files outside the repository. Walking up is location-independent, so moving or copying this file
// cannot repoint it.
function repoRootFrom (start) {
  let dir = start
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) { return dir }
    const parent = path.dirname(dir)
    if (parent === dir) { throw new Error('no package.json above ' + start + ' — cannot locate the repo root') }
    dir = parent
  }
}

const ROOT = repoRootFrom(__dirname)
const specPath = path.resolve(process.argv[2])
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
const results = []

// How the suite is run. Defaults to this repository's jest; overridable ONLY so that the runner
// itself can be tested without spawning a full jest for every case (see
// `test/mutation-runner-restore.test.js`). The command receives the spec's `test` value as its last
// argument and is judged solely on its exit status.
const TEST_COMMAND = process.env.MUTATE_TEST_COMMAND || 'npx jest'
const USING_REAL_JEST = !process.env.MUTATE_TEST_COMMAND

// Delimiter balance, counted outside strings, template literals, regex literals and comments. Used
// only as a VETO before a mutant is run: if the original balances and the mutant does not, the
// mutant cannot compile and any red it produced would be the parser's, not the suite's.
function balances (src) {
  const pairs = { ')': '(', ']': '[', '}': '{' }
  const stack = []
  let i = 0
  let prevSignificant = ''
  while (i < src.length) {
    const c = src[i]
    const two = src.slice(i, i + 2)
    if (two === '//') { const nl = src.indexOf('\n', i); i = nl === -1 ? src.length : nl; continue }
    if (two === '/*') { const end = src.indexOf('*/', i + 2); i = end === -1 ? src.length : end + 2; continue }
    if (c === '"' || c === "'" || c === '`') {
      i++
      while (i < src.length && src[i] !== c) { i += src[i] === '\\' ? 2 : 1 }
      i++
      prevSignificant = 'x'
      continue
    }
    // A `/` opens a regex only where a value may start; after an identifier or a closer it is
    // division. Getting this wrong on a `.vue` file's script block is how a balance check turns
    // into a second source of false verdicts.
    if (c === '/' && !'x)]}'.includes(prevSignificant)) {
      i++
      while (i < src.length && src[i] !== '/') {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === '[') { while (i < src.length && src[i] !== ']') { i += src[i] === '\\' ? 2 : 1 } }
        if (src[i] === '\n') { break }
        i++
      }
      i++
      prevSignificant = 'x'
      continue
    }
    if (c === '(' || c === '[' || c === '{') { stack.push(c); prevSignificant = c }
    else if (pairs[c]) {
      if (stack.pop() !== pairs[c]) { return false }
      prevSignificant = c
    } else if (/\S/.test(c)) { prevSignificant = /[\w$]/.test(c) ? 'x' : c }
    i++
  }
  return stack.length === 0
}

// ---- HOW MANY TESTS ACTUALLY RAN --------------------------------------------------------------
//
// THE EXIT STATUS OF A TEST COMMAND SAYS NOTHING ABOUT WHETHER A TEST RAN. `false` exits 1 having
// executed nothing and used to be certified as a kill; `true` exits 0 having executed nothing and
// was certified as a survivor. Both were demonstrated live on this runner. So the count is parsed,
// and a run that cannot show one is not judged at all.
//
// It also has to work for a suite that is not jest. The old red-name counter read `✕` markers only,
// so every xunit run reported `RED (0)` — indistinguishable from a void run, which is why this
// runner could not judge a .NET suite either. ONE PARSER CLOSES BOTH: the same missing fact — an
// executed-test count — was behind the false kill and behind the unjudgeable suite.
//
// Three dialects, most explicit first:
//   1. `MUTATE_TESTS_RUN=<n>` (and optionally `MUTATE_TESTS_FAILED=<n>`) — the contract any harness
//      can meet on purpose, and the one the self-tests use.
//   2. jest's human summary — `Tests: 1 failed, 28 passed, 29 total`.
//   3. `dotnet test` — `Total tests: N` or the `Passed!  - Failed: F, Passed: P, ... Total: T` line.
// Names are collected where the dialect offers them (`✓`/`✕` for jest, `Passed X`/`Failed X` for
// vstest). A dialect that yields counts but no names still supports a RED/GREEN verdict; it just
// cannot contribute to the per-test kill map, and says so by returning no names.
function readRun (output) {
  const explicit = /MUTATE_TESTS_RUN\s*=\s*(\d+)/.exec(output)
  if (explicit) {
    const failedCount = /MUTATE_TESTS_FAILED\s*=\s*(\d+)/.exec(output)
    const named = (output.match(/MUTATE_FAILED_NAME\s*=\s*(.+)/g) || [])
      .map(s => s.replace(/.*MUTATE_FAILED_NAME\s*=\s*/, '').trim())
    return {
      total: Number(explicit[1]),
      failedNames: named,
      failedCount: failedCount ? Number(failedCount[1]) : named.length,
      allNames: []
    }
  }

  const jest = /Tests:.*?(\d+)\s+total/.exec(output)
  if (jest) {
    const names = (output.match(/[✕×]\s+.*/g) || []).map(s => s.replace(/^[✕×]\s+/, '').trim())
    const failed = /Tests:.*?(\d+)\s+failed/.exec(output)
    return {
      total: Number(jest[1]),
      failedNames: names,
      failedCount: failed ? Number(failed[1]) : names.length,
      allNames: (output.match(/[✓√]\s+.*/g) || []).map(s => s.replace(/^[✓√]\s+/, '').trim()).concat(names)
    }
  }

  const vstest = /Total tests:\s*(\d+)/.exec(output) || /Total:\s*(\d+)/.exec(output)
  if (vstest) {
    const names = (output.match(/^\s*Failed\s+\S.*$/gm) || []).map(s => s.trim().replace(/^Failed\s+/, '').replace(/\s*\[[^\]]*\]\s*$/, ''))
    const failed = /Failed:\s*(\d+)/.exec(output)
    return {
      total: Number(vstest[1]),
      failedNames: names,
      failedCount: failed ? Number(failed[1]) : names.length,
      allNames: []
    }
  }

  return null
}

// One run of the suite. Returns { ok, total, failedNames, allNames, reason } — `ok:false` means no
// measurement was obtained, which is INVALID-RUN and is never a kill and never a survivor.
function runSuite (testPath) {
  if (!USING_REAL_JEST) {
    const r = spawnSync(TEST_COMMAND + ' ' + JSON.stringify(testPath), { cwd: ROOT, encoding: 'utf8', shell: true })
    if (r.error || r.status === null) {
      return { ok: false, reason: 'the suite command could not be spawned', total: 0, failedNames: [], allNames: [] }
    }
    const read = readRun((r.stdout || '') + (r.stderr || ''))
    if (!read) {
      return { ok: false, reason: 'the suite command reported no executed-test count', total: 0, failedNames: [], allNames: [] }
    }
    return { ok: read.total > 0, reason: read.total > 0 ? null : 'the suite executed no tests', ...read }
  }
  const out = path.join(
    fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutate-')), 'jest.json')
  spawnSync(
    TEST_COMMAND + ' ' + JSON.stringify(testPath) +
      ' --coverage=false --json --outputFile=' + JSON.stringify(out),
    { cwd: ROOT, encoding: 'utf8', shell: true })
  let report
  try {
    report = JSON.parse(fs.readFileSync(out, 'utf8'))
  } catch (e) {
    return { ok: false, reason: 'jest produced no parseable report', total: 0, failedNames: [], allNames: [] }
  }
  const failedNames = []
  const allNames = []
  for (const suite of report.testResults || []) {
    for (const a of suite.assertionResults || []) {
      allNames.push(a.fullName)
      if (a.status === 'failed') { failedNames.push(a.fullName) }
    }
  }
  // A jest that could not even build the suite reports zero tests. That is not a kill; it is the
  // absence of a measurement.
  const total = report.numTotalTests || 0
  return {
    ok: total > 0,
    reason: total > 0 ? null : 'the suite executed no tests',
    total,
    failedNames,
    failedCount: typeof report.numFailedTests === 'number' ? report.numFailedTests : failedNames.length,
    allNames
  }
}

// ---- BASELINE, BEFORE ANYTHING IS TOUCHED -----------------------------------------------------
const testPaths = [...new Set(spec.map(m => m.test))]
const baseline = {}
// NO BYPASS FOR THE STUB PATH. It used to skip the baseline entirely "because the harness has no
// suite", and that exemption WAS the hole: with no baseline there was no count to compare against,
// so `MUTATE_TEST_COMMAND=false` (exit 1, nothing executed) certified 2/2 kills and `=true` (exit 0,
// nothing executed) certified survivors. An escape hatch cut for testability is still a hatch.
//
// This runs BEFORE a single byte is written. `process.exit` does not run a `finally`, and neither
// does a throw that escapes one — aborting after a mutation had been applied would leave the mutant
// on disk, so the abort has to live where nothing is mutated yet.
for (const t of testPaths) {
  const b = runSuite(t)
  if (!b.ok) {
    throw new Error(
      'UNUSABLE BASELINE for ' + t + ' — ' + (b.reason || 'no measurement') + '. Refusing to run: ' +
      'every mutation would be judged against a run that proves nothing, and the whole spec would ' +
      'be certified on no evidence. Nothing has been mutated.')
  }
  baseline[t] = b
  process.stdout.write('BASE  ' + t + ' — ' + b.total + ' tests, ' + b.failedNames.length + ' red\n')
}

for (const m of spec) {
  const abs = path.join(ROOT, m.file)
  const original = fs.readFileSync(abs, 'utf8')
  const occurrences = original.split(m.from).length - 1
  if (occurrences !== 1) {
    results.push({ name: m.name, outcome: 'NOT-APPLIED', detail: occurrences + ' occurrences of the anchor' })
    process.stdout.write('SKIP  (' + occurrences + ' anchors) ' + m.name + '\n')
    continue
  }

  // The delimiter veto, BEFORE the mutant is ever run. A mutant that cannot parse reds the suite
  // for a reason that has nothing to do with the test, and the old runner scored that as a kill.
  const mutant = original.replace(m.from, m.to)
  if (balances(original) && !balances(mutant)) {
    results.push({ name: m.name, outcome: 'INVALID-MUTANT', detail: 'delimiters do not balance; not run' })
    process.stdout.write('INVAL (unbalanced, not run) ' + m.name + '\n')
    continue
  }

  let run
  try {
    fs.writeFileSync(abs, mutant)
    run = runSuite(m.test)
  } finally {
    // In a `finally`, so a throw between the write and the run — or a SIGINT-driven unwind — cannot
    // leave a mutated file on disk. A runner that dies mid-mutation and leaves the source corrupted
    // is the same failure as one that reverts it wrongly.
    restore(abs, original)
  }

  // ---- THE ASSERTION THAT MUST NEVER BE REMOVED -----------------------------------------------
  //
  // Read the file back and compare it to the buffer. This is not belt-and-braces: when the
  // `git checkout` restore silently reverted a lane's uncommitted work, THIS is what noticed and
  // halted the run — the restore was wrong and the guard was the only thing between a wrong restore
  // and a lane losing its edits with no signal at all. A restore that is "obviously correct" is
  // exactly the kind that is only obviously correct until the day it is not, and by then the work is
  // already gone. Anyone tempted to strip this as noise should read the paragraph above it first.
  if (fs.readFileSync(abs, 'utf8') !== original) {
    throw new Error(
      'RESTORE FAILED for ' + m.file + ' — the file on disk does not match the buffer this run read. ' +
      'STOP: do not run further mutations, and check that file before doing anything else.')
  }

  const base = baseline[m.test]

  // THE ABSENCE OF A MEASUREMENT IS NOT A VERDICT — in EITHER exit direction. A command that could
  // not spawn, one that printed no executed-test count, and one that ran zero tests are all the same
  // thing: nothing was tested. Scoring any of them as RED manufactures a kill certificate, and
  // scoring any of them as STILL-GREEN manufactures a survivor. Both were shipped.
  if (!run.ok) {
    results.push({ name: m.name, outcome: 'INVALID-RUN', detail: run.reason || 'no measurement', reddened: 0, newlyRed: [] })
    process.stdout.write('INVAL (' + (run.reason || 'no measurement') + ') ' + m.name + '\n')
    continue
  }
  // Fewer tests than the baseline means part of the suite never ran — the shape that lets a
  // vanished suite masquerade as a passing one.
  if (run.total < base.total) {
    results.push({ name: m.name, outcome: 'SHORT-RUN', detail: run.total + ' of ' + base.total + ' tests ran' })
    process.stdout.write('SHORT (' + run.total + '/' + base.total + ') ' + m.name + '\n')
    continue
  }

  // NEWLY red: failing now and not failing at baseline. A suite carrying a standing red cannot
  // launder it into a kill, and this is what makes the per-test map trustworthy.
  const newlyRed = run.failedNames.filter(n => !base.failedNames.includes(n))
  // A dialect that reports counts but no names — `dotnet test` without a detailed logger — can
  // still be JUDGED, it just cannot contribute to the per-test map. Falling back to the count is
  // what lets this runner give a verdict on a suite whose test names it cannot see; without it,
  // every xunit run scored STILL-GREEN however many assertions the mutation broke.
  const failedNow = typeof run.failedCount === 'number' ? run.failedCount : run.failedNames.length
  const failedBefore = typeof base.failedCount === 'number' ? base.failedCount : base.failedNames.length
  const red = newlyRed.length > 0 || failedNow > failedBefore
  const outcome = red ? 'RED' : 'STILL-GREEN'
  results.push({ name: m.name, outcome, reddened: newlyRed.length, newlyRed, first: newlyRed.slice(0, 3), failedNow, failedBefore })
  process.stdout.write((red ? 'RED   ' : 'GREEN ') + '(' + newlyRed.length + ') ' + m.name + '\n')
}

// ---- THE PER-TEST KILL MAP --------------------------------------------------------------------
//
// "Every mutation was killed" and "every test can fail" are different claims. A spec can kill all
// its mutations while whole groups of tests never move, and that is exactly what happened here: 71
// mutations, 70 killed, and 32 of 115 tests never red under any of them. Only this section can tell
// the two apart, so it is computed rather than left to the reader.
const killedBy = {}
for (const r of results) {
  for (const n of r.newlyRed || []) { (killedBy[n] = killedBy[n] || []).push(r.name) }
}

const perTest = {}
for (const t of testPaths) {
  const b = baseline[t]
  const greenAtBaseline = (b.allNames || []).filter(n => !b.failedNames.includes(n))
  perTest[t] = {
    total: b.total,
    namesAvailable: (b.allNames || []).length > 0,
    baselineRed: b.failedNames,
    neverReddened: greenAtBaseline.filter(n => !killedBy[n])
  }
}

fs.writeFileSync(
  path.join(path.dirname(specPath), path.basename(specPath, '.json') + '.results.json'),
  JSON.stringify({ baseline: perTest, killedBy, mutations: results }, null, 2))

const survived = results.filter(r => r.outcome !== 'RED')
process.stdout.write('\n' + results.filter(r => r.outcome === 'RED').length + '/' + results.length +
  ' mutations reddened the suite\n')
if (survived.length) {
  process.stdout.write('SURVIVED: ' + survived.map(s => s.name + ' [' + s.outcome + ']').join('; ') + '\n')
}
process.stdout.write('\nPER-TEST COVERAGE\n')
for (const t of testPaths) {
  const p = perTest[t]
  // A dialect that reports counts but no test names supports a verdict and not a map. Saying so is
  // the point: printing "3/3 reddened" off an empty name list would be the same species of claim
  // this whole file exists to stop — a number with no measurement under it.
  if (!p.namesAvailable) {
    process.stdout.write('  ' + t + ' — ' + p.total + ' tests ran; the suite reported no test NAMES, ' +
      'so mutations here are judged but not mapped per test\n')
    continue
  }
  const never = p.neverReddened.length
  process.stdout.write('  ' + t + ' — ' + (p.total - p.baselineRed.length - never) + '/' +
    (p.total - p.baselineRed.length) + ' green tests reddened by some mutation; ' +
    never + ' never reddened\n')
  for (const n of p.neverReddened) { process.stdout.write('      NEVER-RED: ' + n + '\n') }
}
