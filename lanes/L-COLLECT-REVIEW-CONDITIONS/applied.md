# L-COLLECT-REVIEW-CONDITIONS — the five conditions, applied or refused

The review's verdict was APPROVE-WITH-CONDITIONS on a fix whose every measured number reproduced.
Nothing here changes what the fix does: `testPathIgnorePatterns` is
`["/node_modules/","<rootDir>/test/e2e/","<rootDir>/lanes/"]` before and after, and a comment-stripped
diff of `jest.config.js` against `82127eb` is empty. What changed is what the fix and its evidence
**say** — three false or mis-worded claims corrected, one measuring script repaired, one hazard
unstaged.

Measured 2026-08-05 01:25–02:10 CEST. Shared checkout `feature/restaurant-modules` at `e34977ac`
(270 dirty files from concurrent lanes, none of it this lane's). Lane worktree
`/Users/svendaneel/okam/web-collectcond`. No container, no server, no port; `--listTests` executes no
test.

---

## Condition 1 — `jest.config.js:23`, the false `(14 paths in this repo)` — APPLIED

**The claim was never true of anything.** Re-measured across the whole ref space:

| where | `docs/plan/lanes/` paths |
|---|---|
| on disk, now | **6**, all `.md`, all untracked |
| tracked on `feature/restaurant-modules` | **0** |
| tracked on each of the other 119 refs | **0**, except `refs/lanes/plan-snapshot` (`51970563`) |
| `refs/lanes/plan-snapshot` | **6** — the same six, preserved that night |

The reviewer said "0 tracked on any of 119 refs"; there are 120 refs now, and the 120th is the
snapshot taken at 23:23 which holds the six. So the correction stands and the reviewer's count was
one ref out of date rather than wrong.

Replaced with the on-disk framing, and deliberately **with no number at all** — a count in a comment
is exactly what went stale here. New text names the directory as real, its contents as untracked
`.md`, and the damage as latent rather than current.

Applied **only in the lane worktree**, as briefed. The shared checkout's working copy is untouched
and still byte-identical to `82127eb`, which is the only live protection on this branch.

## Condition 2 — `lanes/L-JEST-COLLECTS-LANES/evidence.md` §3 and §4 — APPLIED, plus one the review missed

- §3 `29 it() blocks` → **`29 test( cases`**. Counted on the file itself: the archive at
  `lane/mrg-page-test-vacuous` is 551 lines, `it(` = **0**, `test(` = **29**. The number was right and
  the keyword was not, exactly as the review said.
- §5 carries the **same wrong keyword** ("the archived copy's 29 `it()` blocks") and the review did
  not name it. Corrected too.
- §4 `docs/plan/lanes/ holds 14 real paths` → **6**, with the ref-space measurement above written in
  beside it so the next reader does not have to re-derive it.
- §3 also gained the branch correction below.

## Condition 2b — the orchestrator's correction to the reviewer — APPLIED

The reviewer described the archive as putting **superseded** assertions back into the green. Measured
on both branches:

| file | lines | `test(` | `it(` |
|---|---|---|---|
| `lanes/…/margin-recipes-page.OLD.test.js` @ `lane/mrg-page-test-vacuous` | 551 | 29 | 0 |
| `test/margin-recipes-page.test.js` @ `feature/restaurant-modules` (`e34977ac`) | 551 | 29 | 0 |
| `test/margin-recipes-page.test.js` @ `lane/mrg-page-test-vacuous` | 681 | 31 | 0 |

`diff` of the first two: **identical**. So on the branch the fix is landing on, the inflation is exact
duplication; the 681/31 replacement exists only on the lane branch. Both the evidence §3 and the
`jest.config.js` comment said "superseded"; **both now say what is true on each branch**, which is
that the duplicates are not independent evidence either way and the total cannot show it.

## Condition 3 — `lanes/L-COLLECTED-PATHS/evidence.md` finding A — APPLIED, after reading the refs

The review said the fix "is merged into `candidate/fe-compose-2026-08-05`", and a composition lane was
moving that branch while this lane ran. Read directly rather than believed:

```
git branch --contains 82127eb  ->  candidate/fe-compose-2026-08-05, lane/jest-collects-lanes
candidate/fe-compose-2026-08-05 tip at read time: 9f7d8df
git diff 82127eb -- jest.config.js (shared checkout working tree): empty
```

**The reviewer was right.** `82127eb` is on the candidate; it is **not** on
`feature/restaurant-modules`, so finding A's sentence about this branch stays operative and was kept
verbatim. The commit fact was appended as a quoted note naming the SHA, both containing branches, the
candidate tip it was read at, and the byte-identity of the working copy.

Two further staleness corrections in the same file, not named by the review:
- "re-checks all **15** assertions" → **20** (five controls added, below).
- §3 called the lane worktree "detached at `e34977ac`"; it is on `lane/collected-paths` at `6f03b18`.
  `e34977ac` is `6f03b18`'s parent and that commit adds only the lane directory, so the tree under
  test is unchanged — now stated that way instead.

## Condition 4 — `rerun.sh` needs `cd` — APPLIED, and the condition is right; demonstrated in two worlds

**The standard was a demonstration, so nothing below is argued.** The bare first listing passes no
`--config`, so jest resolves one by traversing up from the **working directory**. The other five
listings pin `rootDir` absolutely in their config files and are immune. Two runs of the **unmodified**
script from two foreign directories:

**World A — cwd is another jest project** (`/Users/svendaneel/okam/web-collectcond`):

```
FAIL  wrapper is neutral (control == real config): expected same, got differ
FAIL  pattern ADDS nothing to the live suite: expected 0, got 112
FAIL  everything the pattern removes is under the excluded dir: expected 0, got 126
PASS  live suite collects nothing under the excluded dir (0)
PASS  live suite collects no archived/superseded name (0)
```

`collected.txt` — the artifact §1 of the evidence cites as "126 paths, every one of them under
`test/`" — was **overwritten with 112 absolute paths from a different tree**:

```
/Users/svendaneel/okam/web-collectcond/test/account-email-page.test.js
```

**World B — cwd has no jest config above it at all** (an empty scratch directory). jest exits 1 into
the discarded `2>/dev/null`; the pipeline's status is `sort`'s, so `set -e` never sees it:

```
ORIGINAL script exit=1
PASS  live suite collects nothing under the excluded dir (0)
PASS  live suite collects no archived/superseded name (0)
FAIL  wrapper is neutral (control == real config): expected same, got differ
...
collected.txt after that run:  0 bytes,  0 lines
13 of 15 assertions PASS on an empty file.
```

**What makes this worse than a wrong number.** In both worlds the two assertions that answer
`F-ARCHIVED-TEST-INFLATES-THE-GREEN` — `^lanes/` and the archived-name regex — **pass vacuously**:
`^lanes/` cannot match an absolute path and matches nothing at all in an empty file, and a tree that
holds no archived copy has no archived name to find. The script does exit non-zero, but the failures
it prints accuse the **control wrapper**, which is the one part of the machinery that was working. A
reader would go looking in the wrong file, and the evidence artifact is destroyed either way.

**The fix, and one deviation from the condition's letter.** The condition said "add `cd "$S"` after
`set -eu`". Taken literally that breaks the script: `S` is defined *after* `set -eu`, so under
`set -u` the `cd` would abort on an unbound variable. It is placed immediately after the variable
block instead — the earliest point at which it can work — with the two worlds above written into the
comment above it.

**After, from both foreign directories:**

```
cwd=/Users/svendaneel/okam/web-collectcond   exit=0   20 PASS   0 FAIL
cwd=<empty scratch dir, no jest config>      exit=0   20 PASS   0 FAIL
```

and every one of the six listings is **byte-identical to the backup taken before any of this ran** —
so the corruption from the two "before" runs is fully repaired and the numbers in the evidence (126,
131, 121, 115, 112) still describe the files on disk.

### Condition 4b — the positive control — APPLIED, widened

The reviewer's point: the archived-name regex appears only in assertions that expect **zero**, so a
regex that matched nothing would pass every time. Five controls now run *before* the assertions that
depend on them:

| control | expects |
|---|---|
| the regex matches a known archived name, fed to it directly | 1 |
| the regex fires on a **real** listing that contains one (`worstcase-without-pattern.txt`) | 1 |
| the regex does **not** match the live suite's name | 0 |
| `collected.txt` is not empty | yes |
| `collected.txt` holds repo-relative paths, so `^lanes/` can match at all | 0 lines start with `/` |

The last two are beyond what the review asked for and are there on purpose: they are what would have
caught World A and World B **by name**, instead of leaving three unrelated assertions to fail. The
regex itself is now a single `ARCHIVED` variable used by both the controls and the assertion, so a
future edit cannot correct one and leave the other behind.

Assertion count: **15 → 20**. `docs/plan/plan.md` still records this lane's evidence as
"(15/15 assertions pass)"; that line is outside this lane's write boundary and is flagged in the
RETURN.

## Condition 5 — the staged runnable archive — APPLIED

`/Users/svendaneel/okam/web-collected` (the `L-COLLECTED-PATHS` worktree, on `lane/collected-paths` at
`6f03b18`) had it **staged**, an `A` in the index:

```
A  lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js
```

It got there from the `git checkout lane/mrg-page-test-vacuous -- <path>` in `rerun.sh` §B, which
stages by design. Unstaged with `git restore --staged`. **The file is deliberately left on disk** —
the worst-case tree exists to show that the archive is *present and not collected*, and deleting it
would turn the exclusion proof back into an absence proof. Index is now clean.

**What was staged beside it: nothing.** The rest of that worktree is `M jest.config.js` (the copied
fix) and seven untracked paths — the five probes, `test/lanes/`, `test/multi-lanes-rollout.test.js`
and `docs/plan/`, which there holds **one** file, the canary, not the 627-file plan tree. So a
`git add -A` in that worktree would have committed the runnable archive, the three canaries and the
five probes onto `lane/collected-paths` — a branch already merged into the composition candidate.
That is the hazard the condition names, and it was one careless command away.

---

## What was refused

Nothing. All five conditions were re-derived true before being applied. One was applied against its
letter (`cd` placement, above) because the letter does not run.

## Where the changes are

| file | where it was applied |
|---|---|
| `jest.config.js` | lane worktree **only** — the shared checkout is untouched and still `82127eb`-identical |
| `lanes/L-COLLECTED-PATHS/rerun.sh` | shared checkout (the path `plan.md` tells people to run) **and** the lane commit |
| `lanes/L-COLLECTED-PATHS/evidence.md` | same |
| `lanes/L-JEST-COLLECTS-LANES/evidence.md` | same |

The three lane files are **untracked** in the shared checkout — the fragility the plan snapshot was
taken against — so the corrected copies are committed on `lane/collect-review-conditions`, branched
from the candidate tip `9f7d8df`, which is the only base that already carries both `82127eb` (the
config) and `6f03b18` (the lane directory). Nothing was pushed and no shared branch was written.
