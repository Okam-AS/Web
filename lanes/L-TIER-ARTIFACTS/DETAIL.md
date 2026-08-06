# L-TIER-ARTIFACTS — detail

Branch `lane/tier-artifacts`, 12 commits, `e34977ac..b1a2872`. Never pushed. No container. Frontend only.
Sections 1–4 are pass 1 (`..2a7bf12`); section 5 is pass 2 under the `forward-only-plus-C8` ruling.

## 1. The convention exists, once, and was unfollowable from this repo

**It exists**: `OkamAPI-modules/artifacts/tests/README.md`, authored 2026-07-31 by L-BE-RECEIPT. It is
good. Its rule is *"a run recorded here was produced from a clean checkout of one commit, not from a
working tree"*, and its mechanical shape is exact and worth restating: the receipt commit's **parent is
the SHA the receipt names**, and the commit **adds no source file**, so its tree is source-identical to
the commit the numbers belong to. All six backend receipts hold that shape.

**It was unfollowable here**, for three independent reasons, each fixed rather than described:

1. `.gitignore` excluded `artifacts/` as a **directory**. Git stops at an excluded directory and never
   descends, so no later `!artifacts/...` line could have re-included anything — the negation would have
   been silently inert. Now `artifacts/*` + `!artifacts/tests/`, verified with `git check-ignore` in both
   directions: receipts tracked, `artifacts/journeys/` and stray `*.log` still ignored.
2. **Nothing in either repo emits a receipt.** Every `--logger trx` in the backend is prose *inside* a
   receipt, not an executable; the CI workflow runs `dotnet test` with no logger. `record.sh` is the
   first producer either repo has had.
3. jest emits no junit and `jest-junit` is not installed. `to-junit.js` converts jest's own `--json`
   instead of adding a devDependency, because `package.json`/`package-lock.json` are two of the hottest
   files in a checkout with 70+ live lane worktrees. junit is the format `plan`'s existing extractor
   already reads (`EXTRACTORS = ["trx","junit","exists","sha256"]`).

**Seven incompatible variants** were in use, listed in the shipped README. The two instructive ones:
`lanes/<ID>/*.trx` — 19 such files sit uncommitted on disk right now, and `lanes/` **is not gitignored**,
so they could have been committed at any time by anyone; and `.lane/<ID>-detail.md` inside throwaway
worktrees, which left the clone entirely. Neither was blocked by tooling. **The barrier was never
technical. There was no rule saying which file, at which commit, was the record.**

## 2. What was built

| path | what it is |
| --- | --- |
| `artifacts/tests/README.md` | the normative convention, the superseded variants, and what a receipt is *not* |
| `scripts/tier-receipt/record.sh` | records a tier in a clean detached worktree; commits the receipt alone |
| `scripts/tier-receipt/verify.js` | the mechanical form of `F-COMMIT-CITES-WHAT-IT-LACKS` |
| `scripts/tier-receipt/to-junit.js` | jest `--json` → junit, no new dependency |
| `.gitignore` | `artifacts/*` + `!artifacts/tests/` |

`record.sh` refuses on: a dirty tree, an existing receipt at the same SHA+tier (this is
`F-CONFIRM-MERGE-RECEIPT-TRAP` — two lanes wrote different runs to one path and the counters agreed while
the blobs did not; `--label <slug>` keeps both), a failed submodule init, and unparseable jest output.

`verify.js` does **not** test for a well-named file, which renaming yesterday's run would satisfy. It
tests **source identity**: the commit that added the receipt must have a tree identical to the SHA the
receipt names everywhere outside `artifacts/tests/`. This is why `record.sh` commits the receipt alone —
a receipt commit that also touches source destroys the property that makes it checkable.

## 3. Findings, in order of how much they matter

### 3.1 `core` is pinned at a commit that exists on no remote — NEW, and the serious one

`core` is a submodule pinned at `1bcab0b6b3882bc232795437d7ad48455a5af0a6`. That commit is on **no remote
ref**. `git submodule update --init` gets `fatal: remote error: upload-pack: not our ref` from GitHub.
It exists in exactly one place: `Web/.git/worktrees/Web-modules/modules/core`, reachable only from the
local, **unpushed** branch `lane/core-ore-label`. `Web/.git/modules/core` does **not** have it either.

Consequences beyond receipts: **a fresh clone of `feature/restaurant-modules` cannot check out its own
dependency, cannot build, and cannot test.** It works on this machine only because one worktree's
submodule gitdir happens to hold the objects. This is a disaster-recovery and supply exposure, and it is
one `git gc` away from being unrecoverable if that ref is ever deleted. **It is not mine to fix and I
have not touched it.** Suggested as a flag: the branch cites a dependency it cannot fetch — the same
shape as `F-COMMIT-CITES-WHAT-IT-LACKS`, one layer down.

### 3.2 An unpopulated submodule hid 36 tests behind a healthy-looking total

`git worktree add` does not populate submodules, so a clean checkout has an empty `core/` and three
suites report `Test suite failed to run`. The two committed receipts are the demonstration:

| receipt | tests | suites | note |
| --- | --- | --- | --- |
| `1420d499-fast-tier.junit.xml` | 2547 total / 2545 passed / 2 failed | 112, **4 failed** | submodule not populated |
| `1da49e44-fast-tier.junit.xml` | 2583 total / 2581 passed / 2 failed | 112, **1 failed** | submodule at the pin |

Same source as far as any test is concerned; **36 tests** apart. The first reported `112 suites, 4
failed` right beside a total that looked fine. Quoted in a return rather than committed, it would have
been plausible and uncheckable. Both rows are kept: the superseded run is the honest record of what was
true an hour earlier, and it is the clearest teaching case in the repository.

`record.sh` now inits submodules and **refuses to record if that fails**, because a receipt that quietly
understates the suite is worse than none.

### 3.3 Recording needs `protocol.file.allow=always`

Borrowing from a local donor fails with `fatal: transport 'file' not allowed` — git has refused submodule
clones over local paths since CVE-2022-39253. The mitigation targets a hostile `.gitmodules` naming a
local path; here the path is one the script selects itself from `git worktree list`. Also note a donor
must hold the pin **on a ref**, not merely as an object: sibling worktrees share an object store, so
`cat-file -t` succeeds in all of them while `git clone` transfers refs and fetches the pin from none.

### 3.4 Two failures remain, and they are someone else's flag

`test/journey-artifact-store.test.js` asserts the world stamp matches `/^Web-modules@<sha>/`, but the
stamp is built from the **checkout directory basename** — so it passes in a directory named `Web-modules`
and fails in every other one, receipt worktree or lane worktree alike. On record as
`F-SUITE-PINS-THE-CHECKOUT-NAME`. The README says explicitly **not** to rename a worktree to make it
pass: a receipt that goes green only from one magic path is measuring the path.

### 3.5 Two defects in my own tools, found by running them on themselves

`verify.js` flagged the receipt commit as an unbacked claim (a receipt commit quotes the numbers it
records and no receipt can ever name it, since a receipt is committed as its child — a permanent,
unfixable MISSING). And the first donor search used `cat-file -t`, which passes in every sibling
worktree. Both fixed. Neither would have been found by reading the code.

## 4. Honest limits

- **The claim detector is a heuristic.** It misses `"the remaining 2547 tests went green"`, and I left it
  narrow rather than widening it until it matched prose. It is a prompt, not a proof. The source-identity
  check is the rigorous half and has no false positives.
- **`node_modules` is borrowed** from the primary checkout, not installed at the SHA. RUN.md says so. The
  code under test is the commit's; the dependency tree is whatever was installed there.
- **`.gitignore` will likely conflict** with the in-flight journeys-lane edit to the same block in the
  shared checkout. Resolution is mechanical: keep `artifacts/*`, keep both the journeys force-add prose
  and `!artifacts/tests/`. A plain `artifacts/` on either side re-breaks the negation silently.
- **Backend not touched.** Its checkout is on `lane/meals-grace-pins`, not the integration branch, so I
  took no baseline from it and changed nothing there. The backend already satisfies the convention.

---

## 5. Pass 2 — the ruling was `forward-only-plus-C8`

No receipt was retrofitted onto any branch. Two commits landed on `lane/tier-artifacts`:

| commit | what |
| --- | --- |
| `f6c0579` | `scripts/tier-receipt/census.js` — counts the unbacked backlog; `verify.js` now exports `CLAIM_PATTERNS` |
| `b1a2872` | `artifacts/tests/README.md` — the dated backlog note, forward-only, with the two corrections below |

`census.js` imports the claim patterns from `verify.js` rather than restating them, so the census counts
what the checker enforces. A copy would have agreed only by coincidence and drifted on the first edit.
`verify.js` gained `module.exports` and a `require.main === module` guard; it still runs standalone
(scan mode exit 0, single-commit mode `OK` on both receipts, re-checked after the edit).

### 5.1 Both figures this lane published on 2026-08-04 were wrong

Corrected in `artifacts/tests/README.md` rather than dropped, because both were wrong in the shape this
lane exists to catch — a plausible number read off one place and reported as an estate fact.

- **"~361 lane branches carry tier claims"** was a branch-and-return-scale estimate, never a census. The
  measured count of distinct commits making a tier claim is **92** estate-wide.
- **"8 receipts estate-wide"** came from `ls` in one working checkout. Branches carry different receipt
  sets; across all local branches there are **28 receipt files naming 25 commits**. The convention had
  been adopted about three times more widely than the lane that wrote it reported.

### 5.2 The census, measured 2026-08-06, reproduced twice

| | Web-modules | OkamAPI-modules | estate |
| --- | --- | --- | --- |
| base | `feature/restaurant-modules` `e34977ac` | `feature/restaurant-modules` `8e2b57de` | |
| local branches | 137 | 331 | 468 |
| receipts | 2 files / 2 commits | 26 files / 23 commits | 28 / 25 |
| distinct claiming commits | 6 | 86 | **92** |
| backed | 0 | 9 | **9** |
| unbacked | 6 | 77 | **83** |

**The naive count inflates about elevenfold.** Lane branches share ancestors, so a per-branch tally
counts one commit once per branch containing it: 1,054 branch-hits collapse to 92 distinct commits, and
the first version of `census.js` reported *"61 backed"* in a repository holding 26 receipt files. That
bug was found by noticing the two numbers could not both be true, and `census.js` now prints both
columns so the next reader notices it too. A second mislabel was caught the same way — the tool printed
`receipt files N` while counting SHAs, and 26 files name only 23 commits because three commits carry both
a fast and an sql receipt.

### 5.3 The census reads commit messages only

C8 binds a claim in a commit message, a return, a status update or a plan document. `census.js` sees the
first. **178 of 399 returns on disk state a tier figure**, none of them counted above. The 92 is a floor,
not a total, and this is stated where the number is used rather than only here.

### 5.4 Not done, deliberately

- **`docs/plan/intent.md` is untouched.** C8's final text is in `proposed-C8.md`, with the forward-only
  clause moved *inside* `violated_when` — a future author who reads C8 and concludes "then I must receipt
  my older commits" would be doing the harm, and only the constraint block is copied into every brief.
- **No suite was run this pass.** Nothing in the ruling needed one, and a new run would have produced
  precisely the retrofitted receipt the ruling forbids.
- **The pass-1 findings stand unre-verified**: `core` pinned at `1bcab0b6`, on no remote ref
  (§3.1, still the serious one), and `F-SUITE-PINS-THE-CHECKOUT-NAME` (§3.4). Neither is this lane's.
