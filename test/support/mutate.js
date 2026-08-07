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

for (const m of spec) {
  const abs = path.join(ROOT, m.file)
  const original = fs.readFileSync(abs, 'utf8')
  const occurrences = original.split(m.from).length - 1
  if (occurrences !== 1) {
    results.push({ name: m.name, outcome: 'NOT-APPLIED', detail: occurrences + ' occurrences of the anchor' })
    process.stdout.write('SKIP  (' + occurrences + ' anchors) ' + m.name + '\n')
    continue
  }

  let run
  try {
    fs.writeFileSync(abs, original.replace(m.from, m.to))
    run = spawnSync(
      TEST_COMMAND + ' ' + JSON.stringify(m.test) +
        (process.env.MUTATE_TEST_COMMAND ? '' : ' --coverage=false --silent'),
      { cwd: ROOT, encoding: 'utf8', shell: true })
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

  const out = (run.stdout || '') + (run.stderr || '')
  const failed = /Tests:.*\d+ failed/.test(out) || run.status !== 0
  const failedNames = (out.match(/✕ .*/g) || []).map(s => s.replace(/^✕ /, '').trim())
  results.push({
    name: m.name,
    outcome: failed ? 'RED' : 'STILL-GREEN',
    reddened: failedNames.length,
    first: failedNames.slice(0, 3)
  })
  process.stdout.write((failed ? 'RED   ' : 'GREEN ') + '(' + failedNames.length + ') ' + m.name + '\n')
}

// Beside the SPEC, not beside this script: the spec lives in the lane that wrote it and so should
// its results. (The original wrote next to itself, which was the same directory only because the
// script was sitting in the lane too.)
fs.writeFileSync(
  path.join(path.dirname(specPath), path.basename(specPath, '.json') + '.results.json'),
  JSON.stringify(results, null, 2))

const survived = results.filter(r => r.outcome !== 'RED')
process.stdout.write('\n' + results.filter(r => r.outcome === 'RED').length + '/' + results.length +
  ' mutations reddened the suite\n')
if (survived.length) {
  process.stdout.write('SURVIVED: ' + survived.map(s => s.name + ' [' + s.outcome + ']').join('; ') + '\n')
}
