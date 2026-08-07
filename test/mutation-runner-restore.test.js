const { execFileSync, spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

// THE TOOL THAT DESTROYED THE WORK IT WAS TESTING.
//
// `test/support/mutate.js` mutates a source file, runs a suite, and puts the file back. Its restore
// used to be `git checkout -- <file>`, which reverts to HEAD. Against a clean tree that is a
// restore; against a lane's uncommitted edits — which is every lane mid-flight — it is a delete. It
// fired once, on `plugins/global-mixin.js`, and cost nothing only because the runner's own
// verify-after-restore assertion noticed and halted.
//
// These tests are the pin rather than a description of the fix. The failing implementation is not
// written out by hand here: it is BUILT from the shipped runner by swapping its restore body for the
// historical one, so "the fix works" and "the old way was broken" are measured against the same
// program. If the shipped runner ever drifts far enough that the swap no longer applies, the anchor
// assertion below fails loudly instead of quietly testing nothing.

const REPO = path.resolve(__dirname, '..')
const RUNNER = path.join(REPO, 'test/support/mutate.js')
const CANONICAL = fs.readFileSync(RUNNER, 'utf8')

// The exact restore this runner ships, and the exact restore it replaced — plus the import the old
// one needed. Both halves matter: a fixture that swapped the body but not the import would throw a
// ReferenceError inside `restore`, leave the MUTATED file on disk, and look like a different defect
// from the one being pinned. (It did exactly that on this file's first run.)
const BUFFER_IMPORT = 'const { spawnSync } = require(\'child_process\')'
const GIT_IMPORT = 'const { execFileSync, spawnSync } = require(\'child_process\')'
const BUFFER_RESTORE = `function restore (absPath, original) {
  fs.writeFileSync(absPath, original)
}`
const GIT_CHECKOUT_RESTORE = `function restore (absPath, original) {
  execFileSync('git', ['checkout', '--', absPath], { cwd: ROOT })
}`

// The shipped runner with its restore swapped back to the historical one, and nothing else changed.
function withGitCheckoutRestore (source) {
  const swapped = source
    .replace(BUFFER_IMPORT, GIT_IMPORT)
    .replace(BUFFER_RESTORE, GIT_CHECKOUT_RESTORE)
  if (!swapped.includes(GIT_IMPORT) || !swapped.includes(GIT_CHECKOUT_RESTORE)) {
    throw new Error('the historical restore no longer swaps into the shipped runner — this pin is ' +
      'measuring nothing until the anchors are updated')
  }
  return swapped
}

const COMMITTED = 'const answer = 1\nconst target = "ORIGINAL"\n'
const UNCOMMITTED = 'const answer = 1\nconst target = "THE LANE\'S UNCOMMITTED WORK"\n'

let dir

// A real git repository with a real committed file and a real uncommitted edit on top of it. The
// hazard is entirely about what HEAD says versus what is on disk, so nothing here is faked.
function makeWorld () {
  const d = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'mutate-pin-'))
  fs.writeFileSync(path.join(d, 'package.json'), '{"name":"pin-world","version":"1.0.0"}\n')
  fs.mkdirSync(path.join(d, 'src'))
  fs.writeFileSync(path.join(d, 'src/target.js'), COMMITTED)
  const git = args => execFileSync('git', args, { cwd: d, stdio: 'pipe' })
  git(['init', '-q'])
  git(['config', 'user.email', 'pin@local'])
  git(['config', 'user.name', 'pin'])
  git(['add', '.'])
  git(['commit', '-q', '-m', 'the committed state'])
  // The lane's own work: on disk, not committed. This is the state every lane is in while it runs a
  // mutation pass over the change it is currently writing.
  fs.writeFileSync(path.join(d, 'src/target.js'), UNCOMMITTED)
  return d
}

// Places a runner at an arbitrary depth inside the world. Depth is deliberate: the runner locates
// the repo root by walking up to `package.json`, and a copy at the wrong depth used to resolve
// paths against the wrong directory entirely.
function installRunner (world, source, relDir) {
  const runnerDir = path.join(world, relDir || 'docs/plan/lanes/L-PIN')
  fs.mkdirSync(runnerDir, { recursive: true })
  const at = path.join(runnerDir, 'mutate.js')
  fs.writeFileSync(at, source)
  return at
}

// The runner appends the spec's `test` value to whatever `MUTATE_TEST_COMMAND` holds, so an inline
// `if ... fi` would receive a trailing argument and be a syntax error. A script file takes it as
// `$1` and ignores it, which is also closer to how a real project points this at its own suite.
function installStubSuite (world, name, body) {
  const at = path.join(world, name)
  fs.writeFileSync(at, '#!/bin/sh\n' + body + '\n', { mode: 0o755 })
  return at
}

function writeSpec (world, entries) {
  const at = path.join(world, 'spec.json')
  fs.writeFileSync(at, JSON.stringify(entries, null, 2))
  return at
}

// A stub suite that RAN. It reports an executed-test count on the contract the runner parses, which
// is now the difference between a suite and a command: `true` also exits 0, but it executed nothing,
// and a runner that cannot tell those apart certifies kills for runs that never happened. These pins
// are about the restore, so the stub reports a passing suite and spawning a real jest per case would
// make them too slow to keep.
const STUB_SUITE_RAN = 'printf \'MUTATE_TESTS_RUN=1\\n\'; true'
// The same, failing: one test ran and one failed.
const STUB_SUITE_FAILED = 'printf \'MUTATE_TESTS_RUN=1\\nMUTATE_TESTS_FAILED=1\\nMUTATE_FAILED_NAME=the stub test\\n\'; exit 1'

function runRunner (runnerPath, specPath, env) {
  return spawnSync(process.execPath, [runnerPath, specPath], {
    encoding: 'utf8',
    env: Object.assign({}, process.env, { MUTATE_TEST_COMMAND: STUB_SUITE_RAN }, env || {})
  })
}

const ONE_MUTATION = [{
  name: 'flip the target string',
  file: 'src/target.js',
  test: 'anything',
  from: 'THE LANE\'S UNCOMMITTED WORK',
  to: 'MUTANT'
}]

const readTarget = world => fs.readFileSync(path.join(world, 'src/target.js'), 'utf8')

beforeEach(() => { dir = makeWorld() })
afterEach(() => { if (dir) { fs.rmSync(dir, { recursive: true, force: true }) } })

describe('the runner is built the way this defect requires', () => {
  it('ships the buffer restore, and the historical one still swaps cleanly into it', () => {
    expect(CANONICAL.split(BUFFER_RESTORE).length - 1).toBe(1)
    expect(CANONICAL.split(GIT_CHECKOUT_RESTORE).length - 1).toBe(0)
    expect(() => withGitCheckoutRestore(CANONICAL)).not.toThrow()
  })

  // Static and cheap, so it holds even for code paths no case below happens to walk. The runner has
  // no business talking to git at all: every read it needs is on disk in front of it.
  it('invokes git nowhere at all', () => {
    const code = CANONICAL.split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .join('\n')
    expect(code).not.toMatch(/git\s+checkout/)
    expect(code).not.toMatch(/git\s+restore/)
    expect(code).not.toMatch(/git\s+stash/)
    expect(code).not.toMatch(/execFileSync\(\s*'git'/)
    expect(code).not.toMatch(/'checkout'/)
  })

  // The assertion that turned this defect into a halt instead of a loss. It is called out by name so
  // that deleting it is a deliberate act that fails a named test, rather than a tidy-up nobody
  // reviews.
  it('keeps the verify-after-restore assertion', () => {
    expect(CANONICAL).toContain('fs.readFileSync(abs, \'utf8\') !== original')
    expect(CANONICAL).toContain('RESTORE FAILED')
  })
})

describe('a mutation run over a lane\'s uncommitted work', () => {
  // THE EXIT CRITERION.
  it('gives the lane its uncommitted edits back, byte for byte', () => {
    const runner = installRunner(dir, CANONICAL)
    const run = runRunner(runner, writeSpec(dir, ONE_MUTATION))
    expect(run.status).toBe(0)
    expect(readTarget(dir)).toBe(UNCOMMITTED)
  })

  // THE SAME RUN, AGAINST THE IMPLEMENTATION THIS LANE REPLACED. Without this arm the test above
  // would pass just as happily on the broken runner if the hazard were mis-modelled, and would be a
  // description of the fix rather than a pin on it.
  it('is DESTROYED by the git-checkout restore — the defect, reproduced', () => {
    const broken = withGitCheckoutRestore(CANONICAL)
    expect(broken).not.toBe(CANONICAL)
    const run = runRunner(installRunner(dir, broken), writeSpec(dir, ONE_MUTATION))
    // The lane's work is gone: the file has been reverted to what HEAD said, not to what the lane
    // had written.
    expect(readTarget(dir)).toBe(COMMITTED)
    expect(readTarget(dir)).not.toBe(UNCOMMITTED)
    // And the guard is what stops the run rather than letting it proceed over the wreckage.
    expect(run.status).not.toBe(0)
    expect((run.stdout || '') + (run.stderr || '')).toContain('RESTORE FAILED')
  })

  it('leaves a clean tree exactly as it found it', () => {
    execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' })
    execFileSync('git', ['-c', 'user.email=p@l', '-c', 'user.name=p', 'commit', '-q', '-m', 'lane work'], { cwd: dir, stdio: 'pipe' })
    const runner = installRunner(dir, CANONICAL)
    runRunner(runner, writeSpec(dir, ONE_MUTATION))
    expect(readTarget(dir)).toBe(UNCOMMITTED)
    expect(execFileSync('git', ['status', '--porcelain', 'src/target.js'], { cwd: dir, encoding: 'utf8' })).toBe('')
  })

  it('restores between every mutation, not only at the end', () => {
    const runner = installRunner(dir, CANONICAL)
    const spec = writeSpec(dir, [
      ONE_MUTATION[0],
      { name: 'second, anchored on the same untouched line', file: 'src/target.js', test: 'x', from: 'const answer = 1', to: 'const answer = 2' },
      { name: 'third, anchored on the first mutation\'s own text', file: 'src/target.js', test: 'x', from: 'THE LANE\'S UNCOMMITTED WORK', to: 'AGAIN' }
    ])
    const run = runRunner(runner, spec)
    expect(run.status).toBe(0)
    // The third only finds its anchor if the first was undone before it ran.
    expect(run.stdout).not.toContain('SKIP')
    expect(readTarget(dir)).toBe(UNCOMMITTED)
  })

  // A runner that dies holding a mutated file has corrupted the lane just as surely as one that
  // reverts it wrongly, so the restore sits in a `finally`.
  //
  // RE-AIMED TWICE, AND THE HISTORY IS THE POINT. It first asserted the outcome was `RED` — a
  // command that could not be spawned scored as a kill. That was the defect asserted AS THE
  // CONTRACT, which is why it survived a hardening pass aimed at exactly this class of bug. It then
  // asserted `INVALID`. Both versions used a command that fails from the very first call, and a
  // runner that measures its baseline before mutating anything now refuses that spec outright —
  // which is correct, but it stops exercising the thing this arm is for.
  //
  // So the command here WORKS for the baseline and dies afterwards: the suite is real, the run
  // starts, and the death happens inside the mutated window. That is the only shape in which
  // "restores even when the run dies" means anything.
  it('puts the file back even when the suite command dies after the baseline', () => {
    const runner = installRunner(dir, CANONICAL)
    const flag = path.join(dir, '.baseline-taken')
    const stub = installStubSuite(dir, 'suite-that-dies.sh',
      'if [ -f "' + flag + '" ]; then exec /nonexistent/command/that/cannot/spawn; fi\n' +
      'touch "' + flag + '"\n' +
      'printf \'MUTATE_TESTS_RUN=1\\n\'')
    const run = runRunner(runner, writeSpec(dir, ONE_MUTATION), { MUTATE_TEST_COMMAND: stub })
    expect(readTarget(dir)).toBe(UNCOMMITTED)
    expect(run.status).toBe(0)
    // Not a kill and not a survivor: no measurement was obtained.
    expect(run.stdout).toContain('INVAL')
    expect(run.stdout).not.toContain('RED   ')
    const results = JSON.parse(fs.readFileSync(path.join(dir, 'spec.results.json'), 'utf8'))
    expect(results.mutations[0].outcome).toBe('INVALID-RUN')
  })

  // ---- THE VOID DIRECTIONS ---------------------------------------------------------------------
  //
  // Demonstrated live on `lane/mutation-runner-cannot-delete-work` @ `c65b19c`:
  //
  //     MUTATE_TEST_COMMAND=false  ->  2/2 mutations reddened the suite     (a certified kill)
  //     MUTATE_TEST_COMMAND=true   ->  0/2, both SURVIVED                   (a certified survivor)
  //
  // Neither command executed a test. THE EXIT STATUS OF A TEST COMMAND SAYS NOTHING ABOUT WHETHER A
  // TEST RAN, and the runner had no other input, so it certified whatever the exit code implied.
  // Both directions matter: one manufactures kills, the other manufactures survivors, and a
  // hardening pass that fixes only the failing direction leaves the suite able to certify that every
  // mutation was caught by a suite that never ran.
  //
  // The reproduction against the real historical file is committed under
  // `lanes/L-A-KILL-CERTIFICATE-REQUIRES-A-TEST/repro/`; these two arms are the standing pin.
  it.each([
    ['a command that exits 0 having run nothing', 'true'],
    ['a command that exits 1 having run nothing', 'false']
  ])('refuses to certify anything from %s', (_name, command) => {
    const runner = installRunner(dir, CANONICAL)
    const spec = writeSpec(dir, ONE_MUTATION)
    const run = runRunner(runner, spec, { MUTATE_TEST_COMMAND: command })

    // It stops at the baseline, so nothing is mutated and nothing is certified.
    expect(run.status).not.toBe(0)
    expect(run.stderr).toContain('UNUSABLE BASELINE')
    expect(readTarget(dir)).toBe(UNCOMMITTED)
    expect(fs.existsSync(path.join(dir, 'spec.results.json'))).toBe(false)
    expect(run.stdout).not.toContain('RED')
    expect(run.stdout).not.toContain('reddened the suite')
  })

  // The second half of the same hole. The old red-name counter read jest's `✕` markers only, so a
  // .NET run reported `RED (0)` — a verdict indistinguishable from a void run, which is why this
  // runner could not judge an xunit suite at all. One parser closes both, and this is the half a
  // jest-only fixture would never notice.
  it('judges a suite that is not jest, from the counts it reports', () => {
    const runner = installRunner(dir, CANONICAL)
    const spec = writeSpec(dir, ONE_MUTATION)
    // A baseline with no failures, and a mutation whose run fails two: that is a kill, and the old
    // counter scored it GREEN because it found no `✕` anywhere in vstest's output.
    const flag = path.join(dir, '.vstest-baseline')
    const stub = installStubSuite(dir, 'vstest.sh',
      'if [ -f "' + flag + '" ]; then\n' +
      '  printf \'Total tests: 12\\nPassed: 10\\nFailed: 2\\n\'\n' +
      '  exit 1\n' +
      'fi\n' +
      'touch "' + flag + '"\n' +
      'printf \'Total tests: 12\\nPassed: 12\\nFailed: 0\\n\'')
    const run = runRunner(runner, spec, { MUTATE_TEST_COMMAND: stub })

    expect(run.status).toBe(0)
    expect(run.stdout).toContain('BASE')
    const results = JSON.parse(fs.readFileSync(path.join(dir, 'spec.results.json'), 'utf8'))
    expect(results.mutations[0].outcome).toBe('RED')
    // Judged, but honestly: vstest gave counts and no names, so it maps no individual test.
    expect(run.stdout).toContain('no test NAMES')
  })

  it('never writes a file the spec did not name', () => {
    const before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8')
    runRunner(installRunner(dir, CANONICAL), writeSpec(dir, ONE_MUTATION))
    expect(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).toBe(before)
  })

  it('reports an anchor it cannot place instead of counting it as a pass', () => {
    const run = runRunner(installRunner(dir, CANONICAL), writeSpec(dir, [
      { name: 'anchor that is not there', file: 'src/target.js', test: 'x', from: 'NOT PRESENT', to: 'X' }
    ]))
    expect(run.stdout).toContain('SKIP')
    expect(readTarget(dir)).toBe(UNCOMMITTED)
    // The results file carries the per-test kill map alongside the per-mutation outcomes now, so
    // the mutation list is a named field rather than the whole document. The map is the only thing
    // that can support a per-TEST falsifiability claim, which is what this runner gained.
    const results = JSON.parse(fs.readFileSync(path.join(dir, 'spec.results.json'), 'utf8'))
    expect(results.mutations[0].outcome).toBe('NOT-APPLIED')
  })

  it('writes its results beside the spec that asked for them', () => {
    runRunner(installRunner(dir, CANONICAL), writeSpec(dir, ONE_MUTATION))
    expect(fs.existsSync(path.join(dir, 'spec.results.json'))).toBe(true)
  })

  // The original counted `../../../..` from its own location, so a copy at any other depth resolved
  // every path against the wrong directory — it would have mutated, or created, files outside the
  // repository entirely.
  it('finds the same repository root from any depth a copier puts it at', () => {
    for (const depth of ['tools', 'docs/plan/lanes/L-DEEP', 'a/b/c/d/e/f']) {
      const world = makeWorld()
      try {
        const run = runRunner(installRunner(world, CANONICAL, depth), writeSpec(world, ONE_MUTATION))
        expect([depth, run.status]).toEqual([depth, 0])
        expect([depth, readTarget(world)]).toEqual([depth, UNCOMMITTED])
      } finally {
        fs.rmSync(world, { recursive: true, force: true })
      }
    }
  })
})

// THE SWEEP, AS A STANDING GUARD RATHER THAN A ONE-EVENING GREP.
//
// The report this lane was asked for names the copies that existed tonight. This arm is what stops
// a new one appearing: lanes will keep copying a runner into their own directory, and the next
// broken copy has to fail a test rather than wait to be noticed by whoever it bites.
describe('no mutation runner anywhere under docs/plan/lanes/ restores from git', () => {
  const LANES = path.join(REPO, 'docs/plan/lanes')
  // `test/support` is tracked and therefore always present; `docs/plan/lanes` is untracked evidence
  // and is present only on a machine where lanes have actually run. Sweeping both means this guard
  // polices at least the canonical runner in every checkout, instead of passing vacuously in the one
  // place a regression would be easiest to miss — CI.
  const SWEEP_ROOTS = [path.join(REPO, 'test/support'), LANES]

  function runnerScripts (root) {
    if (!fs.existsSync(root)) { return [] }
    const found = []
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const full = path.join(root, entry.name)
      if (entry.isDirectory()) { found.push(...runnerScripts(full)); continue }
      // Executable mutation drivers only. A lane's `.md`, `.txt`, `.log` and `.json` are its
      // findings, and a finding is entitled to quote `git checkout` as prose.
      if (!/\.(js|sh|py|zsh|bash)$/.test(entry.name)) { continue }
      if (!/mutat/i.test(entry.name)) { continue }
      found.push(full)
    }
    return found
  }

  // `docs/plan/lanes/` is untracked working-tree evidence, so it is present on the machine where the
  // copying actually happens and absent from a fresh checkout. The guard is written to be honest
  // about which of those it is looking at rather than reporting a pass for an empty sweep — a
  // vacuous green here would be the same failure the runner itself exists to catch.
  it('sweeps every mutation script in the tree, and always has at least one to sweep', () => {
    const scripts = SWEEP_ROOTS.reduce((all, root) => all.concat(runnerScripts(root)), [])
    process.stdout.write('  [sweep] ' + scripts.length + ' mutation script(s): ' +
      scripts.map(s => path.relative(REPO, s)).join(', ') + '\n')
    // The canonical runner is tracked, so zero here means the sweep is looking in the wrong place
    // rather than that the tree is clean — the vacuous green this whole lane is about.
    expect(scripts.length).toBeGreaterThan(0)

    const offenders = []
    for (const full of scripts) {
      // Executable drivers only, and comments stripped: a lane's findings are entitled to quote
      // `git checkout` as prose, and this runner's own header explains the defect by name.
      const code = fs.readFileSync(full, 'utf8').split('\n')
        .filter(line => !/^\s*(#|\/\/)/.test(line))
        .join('\n')
      for (const [what, re] of [
        ['git checkout --', /git\s+checkout\s+--\s/],
        ['git restore', /git\s+restore\b/],
        ['git stash', /git\s+stash\b/],
        ['execFileSync(\'git\'...\'checkout\')', /execFileSync\([^)]*['"]git['"][^)]*checkout/]
      ]) {
        if (re.test(code)) { offenders.push(path.relative(REPO, full) + ' — ' + what) }
      }
    }
    expect(offenders).toEqual([])
  })
})
