#!/usr/bin/env node
// Applies one mutation at a time to a source file, runs a jest file, records which tests went red,
// and RESTORES the source. Nothing here is part of the product; it is the instrument that proves the
// tests in this lane can fail. Run:  node lanes/mutate.js lanes/mutations-<name>.json
//
// Restoration is in a `finally` and is re-verified against the original bytes after every run, so a
// crash mid-mutation cannot leave a mutated source behind.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const spec = JSON.parse(fs.readFileSync(path.resolve(root, process.argv[2]), 'utf8'))

function runJest (testFile) {
  const out = path.join(root, 'lanes', '.mutate-result.json')
  // An ARRAY, spread into argv. Passing "a.test.js b.test.js" as one string makes jest read it as a
  // single pattern, match nothing, run 0 tests and exit 0 — so every mutation reports GREEN and the
  // sweep certifies work it never measured. The baseline assertion below is the backstop.
  const patterns = Array.isArray(testFile) ? testFile : [testFile]
  try {
    execFileSync('npx', ['jest', ...patterns, '--coverage=false', '--json', '--outputFile=' + out], {
      cwd: root, stdio: ['ignore', 'ignore', 'ignore']
    })
  } catch (e) { /* a red run exits non-zero; the report is what matters */ }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'))
  const failed = []
  for (const suite of report.testResults) {
    const cases = suite.assertionResults || suite.testResults || []
    if (cases.length === 0 && suite.message) { failed.push('SUITE-LEVEL: ' + suite.name) }
    for (const t of cases) { if (t.status === 'failed') { failed.push(t.title) } }
  }
  return { failed, total: report.numTotalTests }
}

const baseline = runJest(spec.test)
console.log('BASELINE red (' + baseline.total + ' tests):', JSON.stringify(baseline.failed))
// A sweep over nothing reports every mutation GREEN, which reads exactly like a suite too weak to
// catch them. Refuse rather than report it.
if (baseline.total === 0) {
  console.error('ABORT: the baseline ran 0 tests — `test` matched no file. Nothing below would mean anything.')
  process.exit(2)
}
// Likewise a mutation that makes the suite fail to LOAD: zero tests run, the runner sees no named
// red, and a real regression reads as a survived mutation.
const expectedTotal = baseline.total

let ok = 0
let bad = 0
for (const m of spec.mutations) {
  // A mutation is one or more edits applied TOGETHER — a rule defended in two places needs both
  // removed before a test about the rule can red, and pretending otherwise would look like a
  // vacuous test when it is really a redundant guard.
  const edits = m.edits || [{ file: m.file, from: m.from, to: m.to }]
  const originals = new Map()
  let result
  let skipped = false
  try {
    for (const e of edits) {
      const file = path.resolve(root, e.file)
      if (!originals.has(file)) { originals.set(file, fs.readFileSync(file, 'utf8')) }
      const current = fs.readFileSync(file, 'utf8')
      const occurrences = current.split(e.from).length - 1
      if (occurrences !== 1) {
        console.log('SKIP  ' + m.id + ' — anchor matched ' + occurrences + ' times, needs exactly 1')
        skipped = true
        break
      }
      fs.writeFileSync(file, current.replace(e.from, e.to))
    }
    if (!skipped) { result = runJest(spec.test) }
  } finally {
    for (const [file, original] of originals) {
      fs.writeFileSync(file, original)
      if (fs.readFileSync(file, 'utf8') !== original) { throw new Error('RESTORE FAILED for ' + file) }
    }
  }
  if (skipped) { bad += 1; continue }

  // The tests that went red BECAUSE of this mutation, i.e. excluding the ones already red.
  const newlyRed = result.failed.filter(t => !baseline.failed.includes(t))
  const hit = newlyRed.some(t => t.includes(m.expect))
  const shortfall = result.total < expectedTotal ? ' [ran ' + result.total + '/' + expectedTotal + ' — suite failed to load]' : ''
  console.log((hit ? 'RED   ' : 'GREEN ') + m.id + shortfall + ' -> ' + JSON.stringify(newlyRed))
  if (hit) { ok += 1 } else { bad += 1 }
}

console.log('\nmutations that produced the expected red: ' + ok + '/' + (ok + bad))
process.exit(bad === 0 ? 0 : 1)
