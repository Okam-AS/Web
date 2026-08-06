# L-WORKTREE-BASENAME-TAX — run record

Question: does `lane/worktree-basename-pin` actually close the condition — the suite passing in a
worktree whose basename is not `Web-modules` — while keeping the pin honest?

Answer: **yes, in both directions.** Verdict `built`.

## 0. Instrument

| fact | value |
|---|---|
| lane worktree | `/Users/svendaneel/okam/web-wtbasename-tax` (basename `web-wtbasename-tax`, **not** `Web-modules`) |
| submodule | `git -c protocol.file.allow=always submodule update --init core` → `1bcab0b6b3882bc232795437d7ad48455a5af0a6` |
| node_modules | symlink → `/Users/svendaneel/okam/Web-modules/node_modules`, as the sibling worktrees do. `jest --version` = 26.6.3, so the runner resolves rather than exiting 0 on a validation error |
| baseline ref | `e34977a` (current `feature/restaurant-modules` tip) |
| fix ref | `lane/worktree-basename-pin` @ `0cea96a` (detached; the branch is checked out in another worktree) |
| my own tree's `*.test.js` count | **112** — measured here, not inherited. No suite total was taken from the orchestrator. |

## 1. Two corrections to the brief (substance stands, facts do not)

- **Path.** The brief names `test/e2e/journey-artifact-store.test.js`. The file is at
  **`test/journey-artifact-store.test.js`**. `test/e2e/` holds `fixture/ journeys/ scripts/ support/`
  and no such file.
- **"A fix exists … and is on no tip."** `0cea96a` **is** on two tips today:
  `candidate/fe-compose-2026-08-05` and `lane/collect-review-conditions`. It is not on
  `feature/restaurant-modules`, which is presumably what was meant. Landing it is therefore
  partly a question of which of those already carries it.

## 2. Baseline — the tax reproduces, exactly and only as described

`jest test/journey-artifact-store.test.js` at `e34977a` in `web-wtbasename-tax`, **real exit code 1**
(captured with `$?` on a non-piped command — zsh does not populate bash's `PIPESTATUS`, which
swallowed the first attempt's exit code and is a 14th way to read a wrong answer here):

```
Tests: 2 failed, 36 passed, 38 total
● backend identity › asks whoever is holding the port what directory they are running from
    Expected pattern: /^Web-modules@[0-9a-f]{40}(\+dirty)?$/
    Received string:  "web-wtbasename-tax@e34977acebd59b223584158c33451b6f1ffd82c1"
● backend identity › the world stamp › names the checkout the world script recorded, not the one holding the port
    Expected pattern: /^Web-modules@/
    Received string:  "web-wtbasename-tax@e34977acebd59b223584158c33451b6f1ffd82c1"
```

Both reds are the checkout **directory name** and nothing else. This is the tax five lanes each paid.

## 3. Exit criterion — the suite passes in a foreign-named worktree

At `0cea96a`, same worktree, tree clean (`git status --porcelain` empty):

```
Tests: 38 passed, 38 total     REAL_EXITCODE=0     basename = web-wtbasename-tax
```

**The total is still 38.** 36 passed + 2 failed → 38 passed. No test was deleted or skipped to get
there, which is the first way this fix could have been faked.

## 4. And it did not merely move which directory fails

A second worktree at `<scratchpad>/Web-modules` — basename literally `Web-modules` — same ref,
own submodule, symlinked modules:

```
Tests: 38 passed, 38 total
```

Green in a foreign-named tree **and** in a canonically-named one.

## 5. The other half — the pin still reds when the record is genuinely wrong

Mutations against production code (`test/e2e/support/*.js`) with the fixed test file in place. Each
mutation asserts it applied before the run, and the tree is reverted and re-verified green after.

| mutation | what it destroys | result |
|---|---|---|
| **A** — `id: head` (drop the checkout name from the build id) | the id no longer says which tree produced the artifact | **3 failed**, 35 passed |
| **B** — `path.resolve(repo) + '@' + head` (absolute path instead of basename) | leaks the laptop's layout; name no longer a name | **2 failed**, 36 passed |
| **C** — `buildFromWorldStamp` returns `null` (world stamp silently unavailable) | the artifact **genuinely lacks its world stamp** and falls back to the port's answer | **6 failed**, 32 passed |
| revert | — | **38 passed**, 38 total |

C is the criterion the brief actually asked for: *the pin still reds when the artifact genuinely
lacks its world stamp*. It does — six ways. A and B reproduce the fix commit's own claimed mutation
counts (3 and 2) exactly, which independently corroborates that the author ran what he said he ran.

> **A near-miss worth recording.** My first pass at A and B used `perl -0pi -e` with `\Q…\E` around a
> string containing `@`; both substitutions **silently no-oped** and the suite reported `38 passed`.
> Read at face value that is "the mutation did not break anything" — a plausible, wrong answer of
> exactly the kind the brief enumerates. It was caught only because the verification `grep` printed
> nothing. The rerun asserts `s.count(old)==1` in-process before writing. **A mutation that reports
> green is worthless until you have proved the mutation landed.**

## 6. What the diff does — reviewed against the branch tip

`git diff e34977a 0cea96a` = **2 files, +181/−7**: `test/journey-artifact-store.test.js` (+36/−7) and
`lanes/L-WORKTREE-BASENAME-PIN/evidence.md` (new). **No production code is touched**, and
`test/journey-artifact-store.test.js` is the only file in the repo that requires
`test/e2e/support/artifact-store` from a test. Blast radius outside this one suite is nil — which is
why no full-suite run is owed for non-regression.

The mechanism: one derived constant, used in four places that previously spelled the name.

```js
const SELF = path.basename(path.resolve(__dirname, '..'));
```

| site | before | after |
|---|---|---|
| `:311` | `toMatch(/^Web-modules@[0-9a-f]{40}(\+dirty)?$/)` | `toMatch(/^[^@]+@[0-9a-f]{40}(\+dirty)?$/)` **and** `expect(build.id.split('@')[0]).toBe(SELF)` |
| `:366` | `not.toContain('Web-modules@')` | `not.toContain(SELF + '@')` |
| `:475` | `toMatch(/^Web-modules@/)` | `expect(...split('@')[0]).toBe(SELF)` |
| `:477` | `not.toMatch(/^Web-modules@/)` | `expect(build.id.split('@')[0]).not.toBe(SELF)` |

**This is not a relaxed assertion.** The brief's stated failure mode — "a pin that accepts any
basename records nothing" — would look like `toMatch(/^[^@]+@/)` and stop there. The diff does the
opposite: at `:311` it splits the old regex into a *shape* check plus an explicit *identity* check
`toBe(SELF)`, so the name is still asserted exactly, merely derived instead of spelled. Mutations A
and B are the proof that the identity half still bites.

**It is not circular.** `SELF` comes from `__dirname`. The value under test comes from `lsof`'s
answer for the cwd of whichever process holds the port. Two independent sources; the test still
proves the right process was found and its tree correctly named.

**`:366` was strengthened, not weakened.** `not.toContain('Web-modules@')` was *vacuously true* in
every lane worktree — it asserted nothing in precisely the trees where lanes run. `SELF + '@'` makes
it a real assertion everywhere. This is the one place the old code was silently worse than red.

One small honest debit: `:475` dropped the `@`-shape that `/^Web-modules@/` implied, so an id that
lost its `@` entirely would pass that line. Mutation A shows the case is still caught (3 reds), so it
costs nothing today.

## 7. Residual of the same class — reported, not fixed

`test/e2e/support/core-checkout.js:74-76` still hard-codes the name:

```js
if (a === 'Web-modules') { return -1; }
if (b === 'Web-modules') { return 1; }
```

`candidateSources()` scans *siblings of the repo root* for `core`, so a lane worktree's own `core` is
in the list but the shared checkout's is **ranked ahead of it**. It is a discovery preference, not an
assertion, so it reds nothing and did not affect any run above (`OKAM_CORE_PATH` outranks it, and the
submodule commit is the same in both trees). It is the same defect class this lane exists to remove
and it will outlive the fix. The fix commit reports it in its own message rather than quietly
changing a preference that affects every lane at once — the right call for a separate change.

## 8. Constraints

C1/C2/C4/C6/C7 are not engaged: the diff adds no SQL, no migration, no money-path write, no statutory
string, no log call. C3 is not engaged: no service, page or flag is added. **C5 is the subject** —
this record's claim is about what a suite result is worth, and it is deliberately not asserting that
anything is *accepted*: it reports that a branch closes a stated condition, with the mutation
evidence that the check is still live. Acceptance remains Sven's.

## 9. Cleanup

Both worktrees are throwaway instruments and are left registered for audit:
`/Users/svendaneel/okam/web-wtbasename-tax` and `<scratchpad>/Web-modules`. Nothing was pushed,
nothing was committed, no shared branch was touched, no container was started, port 4010 was never
bound and pid 73160 was never signalled. The shared checkout's 200+ dirty files were never disturbed.
