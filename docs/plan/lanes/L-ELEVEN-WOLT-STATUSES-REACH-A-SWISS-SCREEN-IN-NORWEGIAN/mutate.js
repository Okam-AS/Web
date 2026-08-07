#!/usr/bin/env node
// Applies one mutation at a time to a source file, runs the named jest test file, records whether
// the suite RED-ed, and restores the source from git before moving on. A test that stays green under
// every mutation of the line it claims to cover is not testing anything, and this is the instrument
// that says so.
//
// Usage: node mutate.js <mutations.json>
// Each entry: { file, test, name, from, to }
// `from` must appear EXACTLY ONCE in the file; a mutation that does not apply is reported as such
// rather than being silently counted as a pass.

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../../..')
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const results = []

// RESTORE FROM THE BUFFER THIS SCRIPT READ, NEVER FROM GIT. The previous lane's copy of this runner
// used `git checkout -- <file>`, which restores a file to HEAD — correct only while the file under
// mutation is unmodified relative to HEAD. Run against an UNCOMMITTED change it silently reverts the
// lane's own work instead of undoing the mutation, which is exactly what it did here on first use.
// The buffer is the file as it was one line before the mutation was written, so it is right whether
// the working tree is clean, dirty or on a detached head.
function restore (file, original) {
  fs.writeFileSync(path.join(ROOT, file), original)
}

for (const m of spec) {
  const abs = path.join(ROOT, m.file)
  const original = fs.readFileSync(abs, 'utf8')
  const occurrences = original.split(m.from).length - 1
  if (occurrences !== 1) {
    results.push({ name: m.name, outcome: 'NOT-APPLIED', detail: occurrences + ' occurrences of the anchor' })
    continue
  }
  fs.writeFileSync(abs, original.replace(m.from, m.to))
  const run = spawnSync('npx', ['jest', m.test, '--coverage=false', '--silent'],
    { cwd: ROOT, encoding: 'utf8' })
  restore(m.file, original)
  if (fs.readFileSync(abs, 'utf8') !== original) {
    throw new Error('RESTORE FAILED for ' + m.file)
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

fs.writeFileSync(path.join(__dirname, path.basename(process.argv[2], '.json') + '.results.json'),
  JSON.stringify(results, null, 2))

const survived = results.filter(r => r.outcome !== 'RED')
process.stdout.write('\n' + results.filter(r => r.outcome === 'RED').length + '/' + results.length +
  ' mutations reddened the suite\n')
if (survived.length) {
  process.stdout.write('SURVIVED: ' + survived.map(s => s.name + ' [' + s.outcome + ']').join('; ') + '\n')
}
