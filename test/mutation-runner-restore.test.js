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
  // ---- THE REPO WHERE .NET LIVES HAS NO package.json -------------------------------------------
  //
  // The runner anchored by walking up to a `package.json`, so it THREW in the backend repository —
  // which has none anywhere above its test projects. The vstest dialect added to it specifically to
  // judge .NET suites was therefore unreachable in the only repository where .NET suites live, and
  // every backend mutation pass in this program was hand-rolled for that reason.
  //
  // This world is a real git repository with NO `package.json`, which is the backend's exact shape,
  // and the stub speaks vstest rather than jest — so the arm exercises the new anchor AND the
  // dialect that had never once run through the runner itself.
  it('runs in a repository that has no package.json, and judges a vstest suite there', () => {
    const world = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'mutate-dotnet-'))
    try {
      fs.mkdirSync(path.join(world, 'src'))
      fs.writeFileSync(path.join(world, 'src/target.js'), COMMITTED)
      const git = args => execFileSync('git', args, { cwd: world, stdio: 'pipe' })
      git(['init', '-q'])
      git(['config', 'user.email', 'pin@local'])
      git(['config', 'user.name', 'pin'])
      git(['add', '.'])
      git(['commit', '-q', '-m', 'the committed state'])
      fs.writeFileSync(path.join(world, 'src/target.js'), UNCOMMITTED)
      // The shape that used to make this impossible.
      expect(fs.existsSync(path.join(world, 'package.json'))).toBe(false)
      expect(fs.existsSync(path.join(world, '.git'))).toBe(true)

      // `dotnet test` output: a baseline that passes twelve, and a mutant run that fails two.
      const flag = path.join(world, '.vstest-baseline')
      const stub = installStubSuite(world, 'vstest.sh',
        'if [ -f "' + flag + '" ]; then\n' +
        '  printf \'Total tests: 12\\nPassed: 10\\nFailed: 2\\n\'\n' +
        '  exit 1\n' +
        'fi\n' +
        'touch "' + flag + '"\n' +
        'printf \'Total tests: 12\\nPassed: 12\\nFailed: 0\\n\'')

      const run = runRunner(installRunner(world, CANONICAL, 'tools'),
        writeSpec(world, ONE_MUTATION), { MUTATE_TEST_COMMAND: stub })

      // It ran at all — which is the whole point — and did not throw locating its root.
      expect(run.stderr).not.toContain('cannot locate the repo root')
      expect(run.status).toBe(0)
      // The count the arm executed. A zero-test pass is precisely what this runner exists to
      // refuse, so the number is asserted rather than assumed.
      expect(run.stdout).toContain('BASE')
      expect(run.stdout).toMatch(/BASE\s+\S+\s+—\s+12 tests, 0 red/)
      // And the mutation was JUDGED, not written off as unmeasurable.
      const results = JSON.parse(fs.readFileSync(path.join(world, 'spec.results.json'), 'utf8'))
      expect(results.mutations[0].outcome).toBe('RED')
      // The lane's uncommitted work came back, in a repository the runner could not previously enter.
      expect(fs.readFileSync(path.join(world, 'src/target.js'), 'utf8')).toBe(UNCOMMITTED)
    } finally {
      fs.rmSync(world, { recursive: true, force: true })
    }
  })

  // Found the first time the runner met a REAL .NET suite, which is the thing this lane made
  // possible. ASP.NET logs "Failed to determine the https port for redirect." during host startup,
  // and the vstest name pattern collected it as the name of a failed test — so a clean baseline
  // reported one red. The counts were right and the verdict survived, but a phantom name that
  // appears in one run and not another is exactly how a false RED or a masked kill gets made.
  it('does not read a log line beginning "Failed" as the name of a failed test', () => {
    const world = makeWorld()
    try {
      const stub = installStubSuite(world, 'vstest.sh',
        // The real shape: a startup log line, then a clean summary.
        'printf \'      Failed to determine the https port for redirect.\\n\'\n' +
        'printf \'Passed!  - Failed:     0, Passed:     6, Skipped:     0, Total:     6\\n\'')
      const run = runRunner(installRunner(world, CANONICAL), writeSpec(world, ONE_MUTATION),
        { MUTATE_TEST_COMMAND: stub })

      expect(run.status).toBe(0)
      // Six ran, none red. The prose line is prose.
      expect(run.stdout).toMatch(/BASE\s+\S+\s+—\s+6 tests, 0 red/)
    } finally {
      fs.rmSync(world, { recursive: true, force: true })
    }
  })

  // The other side of that tightening: a genuine vstest failure line is still read as a name.
  it('still reads a real vstest failure line as a test name', () => {
    const world = makeWorld()
    try {
      const stub = installStubSuite(world, 'vstest.sh',
        'printf \'      Failed to determine the https port for redirect.\\n\'\n' +
        'printf \'  Failed WebApi.Tests.Wire.PdfDownloadWireTests.A_credit_note [12 ms]\\n\'\n' +
        'printf \'Failed!  - Failed:     1, Passed:     5, Skipped:     0, Total:     6\\n\'')
      const run = runRunner(installRunner(world, CANONICAL), writeSpec(world, ONE_MUTATION),
        { MUTATE_TEST_COMMAND: stub })

      // One red at baseline, and it is the TEST, not the log line.
      expect(run.stdout).toMatch(/BASE\s+\S+\s+—\s+6 tests, 1 red/)
      expect(run.stdout).not.toContain('https port')
    } finally {
      fs.rmSync(world, { recursive: true, force: true })
    }
  })

  // The other half of the anchor, and the property the `../`-counting defect broke: a tree that is
  // NEITHER a repository NOR a package is refused outright rather than operated on. Without this the
  // widening would have replaced a throw with a silent walk to the filesystem root.
  it('refuses to operate in a tree that is neither a repository nor a package', () => {
    const outside = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'mutate-bare-'))
    try {
      fs.mkdirSync(path.join(outside, 'src'))
      fs.writeFileSync(path.join(outside, 'src/target.js'), UNCOMMITTED)
      expect(fs.existsSync(path.join(outside, '.git'))).toBe(false)
      expect(fs.existsSync(path.join(outside, 'package.json'))).toBe(false)

      const run = runRunner(installRunner(outside, CANONICAL, 'tools'), writeSpec(outside, ONE_MUTATION))

      expect(run.status).not.toBe(0)
      expect(run.stderr).toContain('will not operate outside a repository')
      // Nothing was mutated on the way to refusing.
      expect(fs.readFileSync(path.join(outside, 'src/target.js'), 'utf8')).toBe(UNCOMMITTED)
      expect(fs.existsSync(path.join(outside, 'spec.results.json'))).toBe(false)
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })

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
describe('no script in the tree restores a source file from git', () => {
  // ---- WHERE THE RUNNERS ACTUALLY LIVE ---------------------------------------------------------
  //
  // This swept `test/support` and `docs/plan/lanes` and reported TWO scripts. The estate keeps most
  // of its lane evidence under REPO-ROOT `lanes/`, which held fourteen more executable drivers — so
  // the guard was policing the two directories where a runner is least likely to be copied and
  // missing the one where copying actually happens. All three runner defects this estate has had
  // spread by copying.
  const SWEEP_ROOTS = [
    path.join(REPO, 'test/support'),
    path.join(REPO, 'docs/plan/lanes'),
    path.join(REPO, 'lanes')
  ]

  // ---- AND THE SECOND, UNEXAMINED NARROWING ----------------------------------------------------
  //
  // The roots were not the only filter. It also required `mutat` IN THE FILENAME, and that hid a
  // real offender: `lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/run-browser-arm.sh` patches
  // `components/molecules/LoginModal.vue` to put a defect back, compiles it, drives a browser arm,
  // and restores with `git checkout -- "${TARGET}"` — in its cleanup trap AND before each arm. It is
  // a mutation driver in everything but its name, so widening the roots alone would have walked
  // straight past it.
  //
  // So the name filter is gone. The rule enforced here — NEVER RESTORE A SOURCE FILE FROM GIT WHILE
  // A LANE MAY HAVE UNCOMMITTED WORK — was never a rule about files called `mutate`; it is a rule
  // about scripts that write to the tree. Sweeping every executable script is measurably safe rather
  // than merely broader: across all 44 scripts under these roots it produced exactly one offender,
  // the real one, and no false positive.
  function runnerScripts (root) {
    if (!fs.existsSync(root)) { return [] }
    const found = []
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const full = path.join(root, entry.name)
      if (entry.isDirectory()) { found.push(...runnerScripts(full)); continue }
      // Executable scripts only. A lane's `.md`, `.txt`, `.log` and `.json` are its findings, and a
      // finding is entitled to quote `git checkout` as prose.
      if (!/\.(js|sh|py|zsh|bash)$/.test(entry.name)) { continue }
      found.push(full)
    }
    return found
  }

  // The offending shapes, and the comment stripping that keeps this honest. A script is safe if it
  // restores from a buffer AND names `git checkout` only in prose — the surviving Wolt copy and this
  // runner's own header both pass that way, on purpose rather than by luck. Widening the sweep
  // without keeping the stripping would trade one false negative for false positives across every
  // file swept.
  const OFFENDING = [
    ['git checkout --', /git\s+checkout\s+--\s/],
    ['git restore', /git\s+restore\b/],
    ['git stash', /git\s+stash\b/],
    ["execFileSync('git'...'checkout')", /execFileSync\([^)]*['"]git['"][^)]*checkout/]
  ]

  // ---- WHAT COUNTS AS PROSE, AND WHY THIS HAD TO GROW -----------------------------------------
  //
  // Stripping `#` and `//` lines was enough while the sweep saw only JavaScript in two directories.
  // The moment it reached repo-root `lanes/` it met PYTHON drivers, and a Python docstring is not a
  // `#` comment — so `lanes/L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR/mutate.py`, which restores
  // from an in-memory buffer and names `git checkout -- <file>` in its module docstring purely to
  // explain what it deliberately does NOT do, was accused the moment the roots widened.
  //
  // That is precisely the trade this change had to avoid: one false negative swapped for a false
  // positive on an honest file. So the stripper learned docstrings and block comments.
  //
  // IT DELIBERATELY DOES NOT STRIP EVERY STRING. A triple-quoted block is prose only when it OPENS
  // A LINE — a module or function docstring. `subprocess.run("""git checkout -- x""")` and
  // `run("git checkout -- x")` are executed commands that happen to live in quotes, and a stripper
  // that removed every quoted region would wave them straight through. Both directions are pinned.
  const TRIPLE = /^("""|''')/

  function withoutProse (source) {
    const kept = []
    let fence = null
    for (const line of source.split('\n')) {
      if (fence) {
        if (line.includes(fence)) { fence = null }
        continue
      }
      const bare = line.trim()
      const opener = TRIPLE.exec(bare)
      if (opener) {
        // A docstring that opens and closes on one line is prose too.
        if (!bare.slice(3).includes(opener[1])) { fence = opener[1] }
        continue
      }
      if (/^\s*(#|\/\/)/.test(line)) { continue }
      kept.push(line)
    }
    // Block comments are unambiguous prose in every dialect that has them.
    return kept.join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
  }

  function offendersIn (scripts) {
    const offenders = []
    for (const full of scripts) {
      const code = withoutProse(fs.readFileSync(full, 'utf8'))
      for (const [what, re] of OFFENDING) {
        if (re.test(code)) { offenders.push(path.relative(REPO, full) + ' — ' + what) }
      }
    }
    return offenders
  }

  const allScripts = () => SWEEP_ROOTS.reduce((all, root) => all.concat(runnerScripts(root)), [])

  // `docs/plan/lanes/` is untracked working-tree evidence, so it is present on the machine where the
  // copying actually happens and absent from a fresh checkout. The guard is written to be honest
  // about which of those it is looking at rather than reporting a pass for an empty sweep — a
  // vacuous green here would be the same failure the runner itself exists to catch.
  it('sweeps every script in the tree, and always has at least one to sweep', () => {
    const scripts = allScripts()
    process.stdout.write('  [sweep] ' + scripts.length + ' script(s) swept across ' +
      SWEEP_ROOTS.length + ' roots\n')
    // The canonical runner is tracked, so zero here means the sweep is looking in the wrong place
    // rather than that the tree is clean — the vacuous green this whole lane is about.
    expect(scripts.length).toBeGreaterThan(0)
    // And the root that was missing is the one that must not fall out again unnoticed: a `lanes/`
    // that stops being swept would read exactly like a clean tree.
    expect(scripts.some(s => path.relative(REPO, s).startsWith('lanes/'))).toBe(true)

    expect(offendersIn(scripts)).toEqual([])
  })

  // ---- THE ARM THAT MAKES THE WIDENING A CLAIM RATHER THAN A HOPE ------------------------------
  //
  // A widened root that no test exercises is the same class of claim as a mutation nobody ran. So a
  // deliberately broken copy is written under REPO-ROOT `lanes/` — the directory that was missing —
  // and the sweep must name it; then it is removed and the sweep must go quiet. Both halves matter:
  // the first says the guard can see there at all, the second says it is not reporting an offender
  // unconditionally.
  it('names a broken copy placed under repo-root lanes/, and goes quiet when it is removed', () => {
    const planted = path.join(REPO, 'lanes', '.sweep-probe-' + process.pid, 'mutate.sh')
    fs.mkdirSync(path.dirname(planted), { recursive: true })
    // The defect verbatim, on an executable line so comment stripping cannot excuse it.
    fs.writeFileSync(planted, '#!/bin/sh\n# a copy that restores the wrong way\ngit checkout -- "$1"\n')
    try {
      const swept = allScripts()
      expect(swept.map(s => path.relative(REPO, s))).toContain(path.relative(REPO, planted))
      expect(offendersIn(swept)).toContain(path.relative(REPO, planted) + ' — git checkout --')
    } finally {
      fs.rmSync(path.dirname(planted), { recursive: true, force: true })
    }
    // Removed: the sweep still finds real scripts, and reports no offender at all.
    const after = allScripts()
    expect(after.length).toBeGreaterThan(0)
    expect(offendersIn(after)).toEqual([])
  })

  // The narrowing that hid the real offender, pinned separately from the roots. A driver whose
  // FILENAME says nothing about mutation is still a driver: `run-browser-arm.sh` patched a source,
  // compiled it, measured it and restored with `git checkout --`, and the old `mutat`-in-the-name
  // filter walked past it even where the sweep already looked. This plants exactly that shape.
  it('names a broken driver whose filename says nothing about mutation', () => {
    const planted = path.join(REPO, 'lanes', '.sweep-unnamed-' + process.pid, 'run-browser-arm.sh')
    fs.mkdirSync(path.dirname(planted), { recursive: true })
    fs.writeFileSync(planted, '#!/bin/sh\nTARGET="components/molecules/LoginModal.vue"\ngit checkout -- "${TARGET}"\n')
    try {
      expect(offendersIn(allScripts()))
        .toContain(path.relative(REPO, planted) + ' — git checkout --')
    } finally {
      fs.rmSync(path.dirname(planted), { recursive: true, force: true })
    }
  })

  // The false positive the widening created and then had to close. A Python driver that restores
  // from a buffer, and names the wrong way only in its DOCSTRING, is honest and must stay unaccused.
  // This is not hypothetical: it is the shape of a real driver already on the trunk.
  it('does not accuse a python driver that names git checkout only in its docstring', () => {
    const planted = path.join(REPO, 'lanes', '.sweep-docstring-' + process.pid, 'mutate.py')
    fs.mkdirSync(path.dirname(planted), { recursive: true })
    fs.writeFileSync(planted,
      '#!/usr/bin/env python3\n' +
      '"""Mutation receipt for a lane.\n\n' +
      'Restores from an IN-MEMORY BUFFER. It never runs `git checkout -- <file>`, which would\n' +
      "revert to HEAD and delete the lane's uncommitted work.\n" +
      '"""\n' +
      'path.write_text(original)\n')
    try {
      const swept = allScripts()
      expect(swept.map(s => path.relative(REPO, s))).toContain(path.relative(REPO, planted))
      expect(offendersIn(swept)).toEqual([])
    } finally {
      fs.rmSync(path.dirname(planted), { recursive: true, force: true })
    }
  })

  // And the other side of that stripper, so excusing prose never becomes excusing execution. A
  // `git checkout` inside a string the script RUNS is a restore, whatever quotes it wears.
  it.each([
    ['a single-quoted argument', 'import subprocess\nsubprocess.run("git checkout -- target.js", shell=True)\n'],
    ['a triple-quoted argument', 'import subprocess\nsubprocess.run("""git checkout -- target.js""", shell=True)\n']
  ])('still accuses an executed restore passed as %s', (_name, body) => {
    const planted = path.join(REPO, 'lanes', '.sweep-exec-' + process.pid, 'mutate.py')
    fs.mkdirSync(path.dirname(planted), { recursive: true })
    fs.writeFileSync(planted, '#!/usr/bin/env python3\n' + body)
    try {
      expect(offendersIn(allScripts()))
        .toContain(path.relative(REPO, planted) + ' — git checkout --')
    } finally {
      fs.rmSync(path.dirname(planted), { recursive: true, force: true })
    }
  })

  // The third prose dialect. A JavaScript driver is entitled to explain the defect in a `/* */`
  // header, and several in this tree do exactly that. Without this arm the block-comment half of the
  // stripper is unexercised — code that cannot be shown to matter, which is the same unproven claim
  // this guard exists to refuse.
  it('does not accuse a driver that names git checkout only in a block comment', () => {
    const planted = path.join(REPO, 'lanes', '.sweep-block-' + process.pid, 'mutate.js')
    fs.mkdirSync(path.dirname(planted), { recursive: true })
    fs.writeFileSync(planted,
      '/*\n' +
      ' * The original restore ran `git checkout -- <file>`, which reverts to HEAD and deletes a\n' +
      " * lane's uncommitted work. This one restores from the buffer it read.\n" +
      ' */\n' +
      'fs.writeFileSync(absPath, original)\n')
    try {
      const swept = allScripts()
      expect(swept.map(s => path.relative(REPO, s))).toContain(path.relative(REPO, planted))
      expect(offendersIn(swept)).toEqual([])
    } finally {
      fs.rmSync(path.dirname(planted), { recursive: true, force: true })
    }
  })

  // The false negative the widening must not trade away. A script that restores from a buffer and
  // names `git checkout` only in prose is CLEAN, and stays clean when swept.
  it('does not accuse a script that only names git checkout in a comment', () => {
    const planted = path.join(REPO, 'lanes', '.sweep-prose-' + process.pid, 'mutate.js')
    fs.mkdirSync(path.dirname(planted), { recursive: true })
    fs.writeFileSync(planted,
      '// The original restore was `git checkout -- <file>`, which reverts to HEAD and deletes a\n' +
      "// lane's uncommitted work. This one restores from the buffer it read.\n" +
      'fs.writeFileSync(absPath, original)\n')
    try {
      const swept = allScripts()
      expect(swept.map(s => path.relative(REPO, s))).toContain(path.relative(REPO, planted))
      expect(offendersIn(swept)).toEqual([])
    } finally {
      fs.rmSync(path.dirname(planted), { recursive: true, force: true })
    }
  })
})
