#!/usr/bin/env node
// This lane's mutation runner.
//
// The implementation is the estate's single canonical one at `test/support/mutate.js`. This file
// used to be a full copy that restored the mutated source with `git checkout -- <file>`, which
// reverts to HEAD: correct on a clean tree, and a DELETE of the lane's own edits on the uncommitted
// working tree every lane actually runs against. It fired once, on `plugins/global-mixin.js`, and
// three lanes in one evening started from a copy of this file — so the defect travelled by exactly
// the mechanism that made the tool worth having.
//
// It is a shim rather than a fresh copy on purpose: copying is what let one runner's defect become
// several. Copy `test/support/mutate.js`, or delegate to it as this does — do not fork it.
//
// This lane's own evidence (mut-*.json, mut-*.results.json) was produced by the previous
// implementation and is deliberately untouched.

const fs = require('fs')
const path = require('path')

// Searched for rather than reached by a counted `../`, because `docs/plan/lanes/` is untracked
// working-tree evidence that survives branch switches: this file can easily find itself sitting
// beside a checkout that does not carry the canonical runner yet. When that happens it must say so
// in one line instead of throwing a module-resolution stack that reads like a broken lane.
function findCanonical (start) {
  let dir = start
  for (;;) {
    const candidate = path.join(dir, 'test/support/mutate.js')
    if (fs.existsSync(candidate)) { return candidate }
    const parent = path.dirname(dir)
    if (parent === dir) { return null }
    dir = parent
  }
}

const canonical = findCanonical(__dirname)
if (!canonical) {
  process.stderr.write(
    'This lane runner delegates to test/support/mutate.js, which is not in the checked-out branch.\n' +
    'Check out a branch that carries it (it landed with L-NO-MUTATION-RUNNER-CAN-DELETE-THE-WORK-IT-IS-TESTING)\n' +
    'and run this again. Do NOT restore the old copy of this file: it deleted uncommitted work.\n')
  process.exit(2)
}

require(canonical)
