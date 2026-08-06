// Makes, and unmakes, the change a careless merge makes to a translations dictionary: a key that
// is already declared near the top of the file declared a second time further down. Node's object
// literal keeps the LAST one, so the product silently starts saying the second string and no test
// in this repository notices. `no-dupe-keys` is `error` in the resolved .eslintrc.js and finds it
// in under a second - it just had nothing to run it.
//
//   node lanes/L-LINT-RUNS-ON-SOMETHING/mutate-dictionary.js apply
//   node lanes/L-LINT-RUNS-ON-SOMETHING/mutate-dictionary.js revert
//
// `revert` restores from git, so it cannot leave a half-repaired dictionary behind.
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.join(__dirname, '..', '..')
const DICTIONARY = path.join('translations', 'no.ts')
const DUPLICATE = '  aIQueryBox_example1: \'Duplikat fra en slurvete merge\','
const INSERT_AFTER_LINE = 5000

const mode = process.argv[2]

if (mode === 'apply') {
  const full = path.join(REPO_ROOT, DICTIONARY)
  const lines = fs.readFileSync(full, 'utf8').split('\n')
  lines.splice(INSERT_AFTER_LINE, 0, DUPLICATE)
  fs.writeFileSync(full, lines.join('\n'))
  console.log(`applied: ${DICTIONARY}:${INSERT_AFTER_LINE + 1} re-declares aIQueryBox_example1`)
} else if (mode === 'revert') {
  execFileSync('git', ['checkout', '--', DICTIONARY], { cwd: REPO_ROOT, stdio: 'inherit' })
  console.log(`reverted: ${DICTIONARY} restored from the index`)
} else {
  console.error('usage: mutate-dictionary.js apply|revert')
  process.exit(2)
}
