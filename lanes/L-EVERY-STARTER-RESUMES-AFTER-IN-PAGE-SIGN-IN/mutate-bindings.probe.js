#!/usr/bin/env node
/*
 * Mutation check for `test/orders-and-statistics-resume-after-login.test.js`.
 *
 * A test that passes proves nothing on its own; what matters is whether it FAILS when the fix is
 * taken away. The defect this lane fixed was invisible to the tests that existed precisely because
 * those tests asserted a handler had been called, and the handler HAD been called — it was just the
 * wrong, shorter one. So the mutations below are not "delete the feature"; two of them restore the
 * exact binding that shipped the defect, which is the mutation that matters.
 *
 * Each mutation is applied ALONE, the suite is run, the file is restored, and the number of failing
 * tests is recorded.
 *
 * Run:  node lanes/L-EVERY-STARTER-RESUMES-AFTER-IN-PAGE-SIGN-IN/mutate-bindings.probe.js
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const SUITE = 'test/orders-and-statistics-resume-after-login.test.js'

const ORDERS = path.join(ROOT, 'pages/admin/orders.vue')
const STATISTICS = path.join(ROOT, 'pages/admin/statistics.vue')

const MUTATIONS = [
  {
    name: 'orders: bind login-success back to the SHORT handler that shipped the defect',
    file: ORDERS,
    from: '@login-success="startOrdersView"',
    to: '@login-success="fetchOrders()"'
  },
  {
    name: 'orders: bind login-success to nothing at all',
    file: ORDERS,
    from: ' @login-success="startOrdersView"',
    to: ''
  },
  {
    name: 'statistics: bind login-success back to the SHORT handler that shipped the defect',
    file: STATISTICS,
    from: '@login-success="startStatisticsView"',
    to: '@login-success="loadStatistics"'
  },
  {
    name: 'statistics: bind login-success to nothing at all',
    file: STATISTICS,
    from: ' @login-success="startStatisticsView"',
    to: ''
  }
]

// Jest prints `Tests: N failed, M passed, T total`. Read the failed count off it; a suite that fails
// to RUN prints no such line and is reported as such rather than silently counted as zero.
//
// Both streams are read, and that is not incidental. Jest writes its whole reporter output to
// STDERR, including on a fully green run, so a stdout-only read reports every passing run as "suite
// did not run" — which would have made the two green anchors of this probe, the baseline and the
// restore, unreadable while the mutants still looked convincing.
function runSuite () {
  const result = spawnSync('npx', ['jest', SUITE, '--coverage=false'], {
    cwd: ROOT,
    encoding: 'utf8'
  })
  const out = (result.stdout || '') + (result.stderr || '')
  const line = out.split('\n').find(l => l.trim().startsWith('Tests:'))
  if (!line) {
    return { failed: null, passed: null, raw: 'suite did not run' }
  }
  const failed = /(\d+) failed/.exec(line)
  const passed = /(\d+) passed/.exec(line)
  return {
    failed: failed ? Number(failed[1]) : 0,
    passed: passed ? Number(passed[1]) : 0,
    raw: line.trim(),
    names: out.split('\n').filter(l => l.includes('●') && !l.includes('Console')).map(l => l.trim())
  }
}

function main () {
  const results = []

  const baseline = runSuite()
  results.push({ name: 'BASELINE — fix in place', ...baseline })

  for (const mutation of MUTATIONS) {
    const original = fs.readFileSync(mutation.file, 'utf8')
    if (!original.includes(mutation.from)) {
      throw new Error('mutation anchor not found in ' + mutation.file + ': ' + mutation.from)
    }
    fs.writeFileSync(mutation.file, original.replace(mutation.from, mutation.to))
    try {
      results.push({ name: mutation.name, ...runSuite() })
    } finally {
      fs.writeFileSync(mutation.file, original)
    }
  }

  // Restored. Prove it rather than assume it.
  const restored = runSuite()
  results.push({ name: 'RESTORED — fix back in place', ...restored })

  const lines = []
  for (const r of results) {
    lines.push('')
    lines.push(r.name)
    lines.push('  ' + r.raw)
    for (const n of (r.names || [])) { lines.push('    ' + n) }
  }

  const mutants = results.slice(1, 1 + MUTATIONS.length)
  const survivors = mutants.filter(r => !r.failed)
  lines.push('')
  lines.push(survivors.length === 0
    ? 'VERDICT: every mutation is caught — no surviving mutant.'
    : 'VERDICT: ' + survivors.length + ' SURVIVING MUTANT(S) — the suite does not see them.')

  const report = lines.join('\n')
  process.stdout.write(report + '\n')
  fs.writeFileSync(path.join(__dirname, 'mutation-run.txt'), report + '\n')

  if (baseline.failed !== 0 || restored.failed !== 0 || survivors.length > 0) {
    process.exitCode = 1
  }
}

main()
