#!/usr/bin/env node
/**
 * MUTATION CHECK for `test/front-door-pages-resume-after-login.test.js`.
 *
 * A green suite is not evidence that a test bites. This class of defect — a page that never hears
 * the shell's `login-success` — survived THREE reviews, and the reason it survived the first two is
 * that the tests written for it asserted a handler had fired rather than that the page held any
 * state. So this file breaks the fix, one way at a time, and records the reds.
 *
 * Two mutations per page, because there are two ways to get this wrong and the estate has shipped
 * both:
 *
 *   UNBOUND  the `@login-success` attribute is removed. This is the trunk's own state before this
 *            lane, and it is the shape the reviewer found (finding G1).
 *   SHORT    the attribute is bound to the LAST call in the starter list instead of the starter.
 *            This is what `orders`, `statistics`, `ongoing` and `kitchen` each shipped, and what
 *            made the defect invisible: some data arrives, so the page does not look broken.
 *
 * Every mutation is applied ALONE and reverted before the next, and the file is restored from the
 * bytes read at the start rather than re-edited.
 *
 * Reads BOTH stdout and stderr: jest writes its reporter output to stderr even when the run is
 * green, and a probe that read stdout alone once mistook every green anchor for "the suite did not
 * run" (recorded by lane L-EVERY-STARTER-RESUMES-AFTER-IN-PAGE-SIGN-IN).
 *
 *   node lanes/L-THE-LAST-FOUR-PAGES-RESUME-AFTER-SIGN-IN/mutate-bindings.probe.js
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const SUITE = 'test/front-door-pages-resume-after-login.test.js'

// page file, the starter the fix binds, and the short handler each page would have been given if
// somebody had written the second copy by hand from the bottom of the starter list.
const PAGES = [
  { file: 'pages/admin/overview.vue', starter: 'startOverviewPage', short: 'loadOverview' },
  { file: 'pages/admin/offers.vue', starter: 'startOffersPage', short: 'fetchOfferProposals' },
  { file: 'pages/admin/kam.vue', starter: 'startKamPage', short: 'fetchData' },
  { file: 'pages/admin/goods.vue', starter: 'startGoodsPage', short: 'fetchOfferItems' }
]

const original = new Map()
for (const p of PAGES) {
  original.set(p.file, fs.readFileSync(path.join(ROOT, p.file), 'utf8'))
}

function restoreAll () {
  for (const [file, text] of original) {
    fs.writeFileSync(path.join(ROOT, file), text)
  }
}

function runSuite () {
  const res = spawnSync('npx', ['jest', SUITE, '--coverage=false'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' }
  })
  // BOTH streams. jest reports to stderr even on a green run.
  const out = (res.stdout || '') + (res.stderr || '')
  const m = /Tests:\s+(?:(\d+) failed,\s*)?(?:(\d+) skipped,\s*)?(\d+) passed,\s*(\d+) total/.exec(out)
  if (!m) {
    const suiteFailed = /Test suite failed to run/.test(out)
    return { ran: false, failed: null, passed: null, total: null, suiteFailed, tail: out.slice(-600) }
  }
  return {
    ran: true,
    failed: Number(m[1] || 0),
    passed: Number(m[3]),
    total: Number(m[4]),
    suiteFailed: false,
    tail: ''
  }
}

function apply (file, transform) {
  const before = original.get(file)
  const after = transform(before)
  if (after === before) {
    throw new Error('mutation changed nothing in ' + file + ' — the probe is not testing what it claims')
  }
  fs.writeFileSync(path.join(ROOT, file), after)
}

const results = []

function record (label, r) {
  const verdict = r.suiteFailed
    ? 'SUITE FAILED TO RUN'
    : (!r.ran ? 'NO RESULT LINE' : (r.failed > 0 ? r.failed + ' failed / ' + r.total : 'ALL ' + r.total + ' PASSED'))
  results.push(label.padEnd(46) + verdict)
  console.log(label.padEnd(46) + verdict)
  if (r.tail) { console.log(r.tail) }
}

try {
  restoreAll()
  record('BASELINE (the fix as committed)', runSuite())

  for (const p of PAGES) {
    const bound = '@login-success="' + p.starter + '"'

    restoreAll()
    apply(p.file, text => text.replace(' ' + bound, ''))
    record(p.file + ' UNBOUND', runSuite())

    restoreAll()
    apply(p.file, text => text.replace(bound, '@login-success="' + p.short + '"'))
    record(p.file + ' SHORT (' + p.short + ')', runSuite())
  }

  restoreAll()
  record('RESTORED', runSuite())
} finally {
  restoreAll()
}

console.log('\n--- summary ---')
results.forEach(r => console.log(r))
