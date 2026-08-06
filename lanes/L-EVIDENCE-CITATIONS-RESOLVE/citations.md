# L-EVIDENCE-CITATIONS-RESOLVE — can the evidence this plan cites still be found?

Read-only census. Nothing repaired, nothing committed, no containers, no pushes.
Every count below is reproducible with `python3 census.py` then `python3 report.py`
from `/Users/svendaneel/okam/Web-modules`.

**Snapshot.** Other lanes were writing returns while this ran, so the totals are as of this
pass; `census.py` is re-runnable to refresh them.

## 0. The instrument, validated before its zeros were believed

`F-EMPTY-GREP-READS-AS-ABSENCE` is the defect this lane could most easily have committed
inside the lane measuring citations, so the detector was shown to fire on known cases in
both directions before any total was reported.

| control | expected | detector said |
|---|---|---|
| `e34977a` (web HEAD) | on a ref | `on-ref` |
| `82127eb` (`lane/jest-collects-lanes`) | on a ref | `on-ref` |
| `8e2b57de` (backend integration) | on a ref | `on-ref` |
| `cbb5a98` (orchestrator's dangling case) | on **no** ref | `worktree-head-only` |
| `deadbee`, `abcdef1234` | no such object | `not-a-commit` |
| `artifacts/journeys/modal-scroll-lock.playwright.json` | present, force-added past ignore | `tracked` |
| `artifacts/journeys/NOPE-does-not-exist.json` | absent | `absent` |
| `jest.config.js` | present, tracked, edit not in HEAD | `tracked-dirty` |
| `docs/plan/plan.md` in history index | (unknown) | **not in any commit** |
| `jest.config.js` in history index | present | present — index fires |

The `cbb5a98` row is the one that matters most: the orchestrator reported it as *dangling*,
and it is more precisely **reachable from a detached worktree HEAD** (`web-jestlanes`) while
on no ref. `git for-each-ref --contains` returns nothing for it, which is true but incomplete —
the commit is pinned by a worktree and would survive until that worktree is removed. Scoring
it as plain `dangling` would have understated its survivability; scoring it `on-ref` would have
overstated it. It needs its own class, and it has one.

Refs were enumerated across **both** namespaces the orchestrator named: `refs/heads` (98 web /
315 backend), `refs/lanes` (4), `refs/salvage` (8), plus remotes and tags — 119 web and 339
backend refs, closing over 496 and 3012 commits. Worktree HEADs were enumerated separately
(82 web, 315 backend) so that worktree-pinned commits are not scored as dangling.

## 1. Scope — what counts as a citation

Two sources, because lanes cite evidence in two places and the orchestrator's own calibration
case lives in the second:

- `docs/plan/plan.md` — 323 `### Lane` blocks, 257 carrying an `evidence:` field, 276 lines.
- `docs/plan/returns/*.md` — 283 RETURN files, covering 270 distinct lanes that carry an
  `evidence:` field.

559 evidence lines, tokenised into **1987 citations**: filesystem paths, commit ids, branch
refs and `fact:` keys. `cbb5a98` is cited in *return prose* (`L-COLLECTED-PATHS-1.md`,
`L-JEST-COLLECTS-LANES-1.md`) and **not** in any `evidence:` field — worth stating, because a
census scoped to `plan.md` alone would have missed the very case used to calibrate it.

## 2. Counts

| kind | class | plan.md | returns | verdict |
|---|---|---:|---:|---|
| path | `tracked` | 158 | 198 | resolvable |
| path | `in-tree-not-on-disk` | 5 | 6 | resolvable |
| path | `in-cited-commit` | 5 | 9 | resolvable via the commit the same line cites |
| path | `resolvable-untracked-dir` | 1 | 1 | resolvable |
| path | `tracked-dirty` | 4 | 6 | resolvable, content at risk |
| path | `ignored-by-git` | 33 | 41 | **ignored-by-git** |
| path | `untracked-not-ignored` | 257 | 276 | **would not survive a clone** |
| path | `absent` | 2 | 3 | **absent** |
| path | `bare-filename` | 9 | 10 | unresolvable as written |
| path | `elided-as-written` | 4 | 5 | unresolvable as written |
| path | `wrong-path-same-repo` | 5 | 5 | **file exists, pointer wrong** |
| path | `elsewhere-in-estate` | 11 | 13 | **exists only in an unmerged worktree** |
| commit | `on-ref` | 232 | 292 | resolvable |
| commit | `dangling` | 0 | 1 | **dangling** |
| commit | `not-a-commit` | 0 | 1 | **absent** |
| commit | `third-repo` | 0 | 1 | resolves in a third repository (Core) |
| ref | `ref-exists` | 165 | 202 | resolvable |
| fact | `fact-cited` | 12 | 14 | resolvable |

**Headline.** Of 1987 citations:

- **1300 (65%) resolvable**
- **34 (2%) resolvable but not where cited**
- **10 (1%) resolvable content at risk**
- **1 (0%) third repo**
- **74 (4%) ignored by git**
- **533 (27%) untracked never committed**
- **35 (2%) unresolvable**

## 3. The two flags, answered

### F-EVIDENCE-GITIGNORED — yes, and it is concentrated in the most load-bearing class

**74 citations (38 distinct paths) name a path git ignores.** The cause is one line —
the `artifacts/` rule in the `Web-modules` working-tree `.gitignore` is unanchored, so it
matches at **any** depth:
`artifacts/journeys/…` at the repo root and `lanes/<LANE>/artifacts/…` inside a lane directory
alike. The backend repo does **not** ignore `artifacts/`, which is why backend receipts
(`artifacts/tests/<sha>/RUN.md`) resolve and frontend captures do not.

What lands in that bucket is the browser-journey capture — `artifacts/journeys/*.playwright.json`
and its screenshots. That is the evidence class C5 acceptance rests on, and the artifact
`L-JOURNEY-HARNESS` exists to produce.

**This is policy, not an accident, and the census should not pretend otherwise.** The rule is
deliberate — journey files are the output of a run, and tracking every run would put merge
conflicts on test output. A concurrent lane is, while this ran, editing `.gitignore` to write
that reasoning down and to name the exception: **16 files under `artifacts/` are force-added**
(`modal-scroll-lock`, `modal-estate-scroll-lock`, `workforce-invitation-onboarding`,
`growth-guest-lifecycle`, `growth-testsend-refusal`) precisely because those lanes' exits name
the capture file itself.

So the finding is not "the ignore is wrong". It is: **74 citations name captures on the wrong
side of that exception** — an exit that depends on a specific capture, whose capture is
regenerate-or-absent. A checker that read `.gitignore` without checking tracked-ness first
would also have misscored all 16 deliberate exceptions as lost, which is why tracked-ness is
tested before ignore status throughout this census.

### F-COMMIT-TREE-LEAVES-NO-REF — one lane, and the work behind it is not lost

Of **527 commit ids** cited across both sources, **524 resolve and sit on a ref**. The
remainder is three citations, and each is a different thing:

- **`f176db85` — the one genuinely dangling commit.** Cited by `L-EV-SEED-DEPOSITS`
  as `lane/ev-seed-deposits f176db85`. The object exists, `git
  for-each-ref --contains` returns nothing, and `git log --all` does not reach it. The branch
  has since moved to `caee6ae3`. **The work is not lost**: the commit message *"The demo seed
  provisions the flag the deposit route now gates on"* is present on the branch as
  `7a6d9798`, so the lane was amended or rebased and the citation was never updated. Dead
  citation, live work — and, per the orchestrator's `cbb5a98` lesson, those are two findings,
  not one. Repair is one id. **Consequence is low**: that lane returned `verdict: fail-spec`
  and stands at `state: open`, so no finished-work claim rests on the dead id. Had it been a
  `built` lane this would be the most serious finding in the census; it is not, and saying so
  is the difference between a census and an alarm.
- **`8931bc39` — a third repository.** Cited by `L-MEALS-FUNDED` as `core@8931bc39`,
  a `Core` submodule pointer. It resolves in `/Users/svendaneel/okam/Core`. Not absent, just
  outside the two repositories this plan spans.
- **`cd1cc86` — the only id that resolves nowhere**, cited on the same line as its sibling
  above (`L-MEALS-FUNDED`, `verdict: fail-spec` yet `state: verified` in `plan.md` — a
  mismatch this lane records but does not rule on). Also a `Core` submodule pointer, and
  the local `Core` checkout does not have it;
  it may exist only on the remote. It is the single citation in 1987 that could not be
  dereferenced anywhere at all.

No cited commit was worktree-pinned-only, though the detector demonstrably finds that state
(`cbb5a98`). **The commit-citation discipline in this plan is sound** — this is the doubt
that closes cheaply, and it closes clean. `F-COMMIT-TREE-LEAVES-NO-REF` describes exactly
one lane.

## 4. The fourth and fifth columns — the brief asked, and both earn a place

The brief proposed three classes and asked whether the working-tree-only case deserves a fourth.
It does, and measuring forced a fifth that is larger than either.

**Fourth — `tracked-dirty` (10 citations).** Cited, present on disk, tracked, and the cited
content is a working-tree edit `HEAD` does not carry. `jest.config.js` is the named case and the
detector reproduces it. One `git checkout --` erases the evidence while every reachability check
still reads green. It is not ignored, not absent, and not safe.

**Fifth — `untracked-not-ignored` (533 citations, 282 distinct paths).** On disk, *not* ignored,
simply never committed. Consequence identical to the gitignored case — a fresh clone has nothing —
but cause and repair differ entirely, so reporting them as one number would be wrong. Only **92**
of these paths appear anywhere in either repository's reachable history.

**This is the largest finding in the census, and it includes the plan itself.**
`git status` reports `?? docs/plan/` — the whole hub is untracked, and `docs/plan/plan.md`
appears in **no reachable commit** in the web repo (the history index was proved to fire on
`jest.config.js` first). So `plan.md`, all 283 returns, 300 briefs and 22 reviews are
working-tree-only. **45 citations point into `docs/plan/` itself**, including the six module
review documents that six lanes name as their sole evidence.

A pull request opened from `feature/restaurant-modules` today would carry neither the plan that
describes the work nor the reviews that signed it off. That is worth knowing before the PR, which
is the reason the brief gave for running this lane at all.

## 5. Cross-repo — the crisis that would have been manufactured

`F-CROSS-REPO-EVIDENCE-UNVERIFIABLE` is real, and it is the single largest source of error in
this measurement. A checker resolving only against the two repository roots scores **238 paths
absent**. Every refinement below is a *correction to the instrument*, not a repair to the plan,
and each was forced by hand-checking a result that looked wrong:

| refinement | absent after |
|---|---:|
| naive: two repo roots only | 238 |
| resolve against worktrees named on the same evidence line, and the lane's own dir | 79 |
| expand `lanes/X/{a,b,c}.txt` keeping the suffix after `}` | 47 |
| dereference the tree of a commit the same line cites | 34 |
| check `docs/plan/lanes/` where the citation says `lanes/` | 16 |
| check sibling checkouts at the same relative path | **3** |

**238 → 3.** A census that stopped at the first row would have reported that roughly a quarter
of this plan's evidence points at nothing. That claim would have been false, and it is the
specific failure the brief warned against: manufacturing a crisis out of a path convention.

The brace bug is worth naming because it was invisible to inspection and only hand-checking the
top-ranked result exposed it: `lanes/L-FE-WF-ONBOARD-WALK/{mutation-proof,run-1,...}.txt` puts
the extension **after** the closing brace, so an expander that drops the suffix turns six
existing, tracked files into six absent citations — and they ranked first by consequence.

The worked example: `L-WF-W5-TIMESHEET` cites `lanes/L-WF-W5-TIMESHEET/evidence.md` and, in the
same line, `worktree ~/okam/wt-wfw5`. Against the plan root that path is absent; inside the
worktree it is **tracked**. Same string, opposite verdicts.

The backend checkout was treated as the orchestrator warned: `OkamAPI-modules` has
`lane/meals-grace-pins` (`34c6c103`) checked out, not the integration branch, so backend paths
missing from disk were additionally resolved **by object** against
`refs/heads/feature/restaurant-modules` (`8e2b57de`) rather than by reading the working tree.
That is what the `in-tree-not-on-disk` class records (11 citations): present in git, absent from
this checkout, and wrongly scorable as lost.

## 5b. Two findings that are not absence, and are still worth repairing

**`wrong-path-same-repo` (10 citations, 5 distinct).** The plan hub keeps these lane
directories at `docs/plan/lanes/<LANE>/` while the citation says `lanes/<LANE>/`. The evidence
exists and is one path segment from where the reader is sent:

- `lanes/L-FRAGILE-NEEDLES/mutation-log.md` → actually at `docs/plan/lanes/L-FRAGILE-NEEDLES/mutation-log.md`
- `lanes/L-MARGIN-VIOLATION-ANCHOR/mutation-log.md` → actually at `docs/plan/lanes/L-MARGIN-VIOLATION-ANCHOR/mutation-log.md`
- `lanes/L-MEALS-VIOLATION-EXACT/mutation-log.md` → actually at `docs/plan/lanes/L-MEALS-VIOLATION-EXACT/mutation-log.md`
- `lanes/L-XZ-CREDIT-FIELDS/evidence.md` → actually at `docs/plan/lanes/L-XZ-CREDIT-FIELDS/evidence.md`
- `lanes/L-XZ-PRINTED-DEFECTS/mutation-log.md` → actually at `docs/plan/lanes/L-XZ-PRINTED-DEFECTS/mutation-log.md`

**`elsewhere-in-estate` (24 citations, 13 distinct).** These resolve at the same relative path
in a sibling checkout the citation never names — almost always the lane's own unmerged
worktree. `Web-modules/lanes/L-COERCION-WRITE-PATHS/` is the sharp case: the directory exists
on the integration branch and is **empty**, while `web-coercwrite` holds `mutation-log.md`,
`mutation-proof.py` and `mutation-proof.txt`. A reader who checks the cited path finds a
directory and concludes the evidence is there. It is not — it is on a branch that has not
landed. This is the quietest failure in the census: not a broken link, a hollow one.

- `artifacts/journeys/admin-print-host`
- `lanes/L-COERCION-WRITE-PATHS/mutation-log.md`
- `lanes/L-HOSTED-SERVICE-FLOOR/mutation-log.md`
- `lanes/L-LANES-OUT-OF-THE-ASSEMBLY/mutation-log.md`
- `lanes/L-MEALS-ENROL-PRETICK/evidence.md`
- `lanes/L-MEALS-LEVER-WITHHOLD/evidence.md`
- `lanes/L-MEALS-MEMBERS-READ/mutation-log.md`
- `lanes/L-MRG-PAGE-TEST-VACUOUS/mutation-log.md`
- `lanes/L-MRG-WASTE-FRONTEND/evidence.md`
- `lanes/L-PUSH-TOKEN-IN-PATH/mutation-log.md`
- `lanes/L-ROUTE-GUARD-GAPS/mutation-log.md`
- `lanes/L-TELEMETRY-INITIALIZER-FLOOR/mutation-log.md`
- `lanes/L-WOLT-SYNC/evidence.md`

## 6. The unresolvable list, ranked by consequence

Load-bearing = a citation a reader would rely on to believe something was built. Ranked by the
state of the citing lane: `verified` (asserts a person completed the journey) outranks
`built-unverified`, which outranks `open`/`running` (where a missing scratch file costs nothing).

**35 unresolvable citations across 17 lanes.** Full list:

| lane | state | src | kind | citation | why |
|---|---|---|---|---|---|
| `L-EF-INDEX-SHADOW-SWEEP` | return:built | returns | path | `ModelIndexShadowGuardSelfTests.cs` | bare-filename |
| `L-EF-INDEX-SHADOW-SWEEP` | return:built | returns | path | `ModelIndexShadowSweepTests.cs` | bare-filename |
| `L-EV-DIETARY` | return:built | returns | path | `EventsRunSheetComposer.cs` | bare-filename |
| `L-FLAGS-JOURNEY-SWEEP` | return:built | returns | path | `.playwright.json` | bare-filename |
| `L-GR-CONFIRMED-PIN-FIX` | return:built | returns | path | `.../3cf288fb.../RUN.md` | elided-as-written |
| `L-GR-POSTMARK-WEBHOOK` | return:built | returns | path | `Growth/GrowthPostmarkEventReaderTests` | absent |
| `L-GR-POSTMARK-WEBHOOK` | return:built | returns | path | `Wire/GrowthPostmarkWebhookWireTests` | absent |
| `L-INVOICE-RETRY-RETIREMENT` | return:built | returns | path | `f18ffeda.../RUN.md` | elided-as-written |
| `L-MEALS-UTLKVIT` | return:built | returns | path | `PosReceiptService.cs` | bare-filename |
| `L-MENU-ALLERGEN-MATRIX` | return:built | returns | path | `print-preview.pdf` | bare-filename |
| `L-PDF-NULLDEREF` | return:built | returns | path | `2497ce9d.../RUN.md` | elided-as-written |
| `L-PRICE-SHADOW-GUARD` | return:built | returns | path | `state-A..E.txt` | elided-as-written |
| `L-TRAIN-EVIDENCE-NAMES-COURSE` | return:built | returns | path | `after.trx` | bare-filename |
| `L-TRAIN-EVIDENCE-NAMES-COURSE` | return:built | returns | path | `base.trx` | bare-filename |
| `L-WF-ONBOARD-DEMO-RUN` | return:built | returns | path | `api.log` | bare-filename |
| `L-WF-W5-TIMESHEET` | return:built | returns | path | `WORKFORCE-JOURNEY-MANIFEST.md` | bare-filename |
| `L-EF-INDEX-SHADOW-SWEEP` | built-unverified | plan.md | path | `ModelIndexShadowGuardSelfTests.cs` | bare-filename |
| `L-EF-INDEX-SHADOW-SWEEP` | built-unverified | plan.md | path | `ModelIndexShadowSweepTests.cs` | bare-filename |
| `L-FLAGS-JOURNEY-SWEEP` | built-unverified | plan.md | path | `.playwright.json` | bare-filename |
| `L-GR-CONFIRMED-PIN-FIX` | built-unverified | plan.md | path | `.../3cf288fb.../RUN.md` | elided-as-written |
| `L-GR-POSTMARK-WEBHOOK` | built-unverified | plan.md | path | `Growth/GrowthPostmarkEventReaderTests` | absent |
| `L-GR-POSTMARK-WEBHOOK` | built-unverified | plan.md | path | `Wire/GrowthPostmarkWebhookWireTests` | absent |
| `L-INVOICE-RETRY-RETIREMENT` | built-unverified | plan.md | path | `f18ffeda.../RUN.md` | elided-as-written |
| `L-MEALS-UTLKVIT` | built-unverified | plan.md | path | `PosReceiptService.cs` | bare-filename |
| `L-MENU-ALLERGEN-MATRIX` | built-unverified | plan.md | path | `print-preview.pdf` | bare-filename |
| `L-PDF-NULLDEREF` | built-unverified | plan.md | path | `2497ce9d.../RUN.md` | elided-as-written |
| `L-PRICE-SHADOW-GUARD` | built-unverified | plan.md | path | `state-A..E.txt` | elided-as-written |
| `L-TRAIN-EVIDENCE-NAMES-COURSE` | built-unverified | plan.md | path | `after.trx` | bare-filename |
| `L-TRAIN-EVIDENCE-NAMES-COURSE` | built-unverified | plan.md | path | `base.trx` | bare-filename |
| `L-WF-ONBOARD-DEMO-RUN` | built-unverified | plan.md | path | `api.log` | bare-filename |
| `L-WF-W5-TIMESHEET` | built-unverified | plan.md | path | `WORKFORCE-JOURNEY-MANIFEST.md` | bare-filename |
| `L-EV-SEED-DEPOSITS` | return:fail-spec | returns | commit | `f176db85` | dangling |
| `L-GROWTH-PREFCENTRE` | return:blocked | returns | path | `shots/01-03.png` | absent |
| `L-LIVE-WORLD-DISCOVER` | return:blocked | returns | path | `mutant-A..D.txt` | elided-as-written |
| `L-MEALS-FUNDED` | return:fail-spec | returns | commit | `cd1cc86` | not-a-commit |

## 7. Which unresolvable citations are load-bearing

**31 of 35** unresolvable citations sit behind a lane that asserts finished work
(`verified`, `built-unverified`, or a return with `verdict: built`).

**But read the composition before reading that as alarm.** Of the 35 unresolvable: 28 are
**under-specified rather than missing** — a bare filename with no directory (`base.trx`,
`api.log`, `print-preview.pdf`) or author shorthand that was never a literal path
(`.../3cf288fb.../RUN.md`, `state-A..E.txt`). 5 name a file that exists nowhere, and 2 are
commit ids. So the honest reading is: **almost nothing in this plan points at lost evidence;
a modest number of citations are written too loosely to dereference without knowing which
worktree the author was standing in.** That is a writing-convention defect, not a data-loss
one, and it is cheap to fix — but it is not nothing, because a reviewer cannot check them.

- **`L-EF-INDEX-SHADOW-SWEEP`** (return:built) — 4: `ModelIndexShadowGuardSelfTests.cs`, `ModelIndexShadowSweepTests.cs`
- **`L-GR-POSTMARK-WEBHOOK`** (return:built) — 4: `Growth/GrowthPostmarkEventReaderTests`, `Wire/GrowthPostmarkWebhookWireTests`
- **`L-TRAIN-EVIDENCE-NAMES-COURSE`** (return:built) — 4: `after.trx`, `base.trx`
- **`L-FLAGS-JOURNEY-SWEEP`** (return:built) — 2: `.playwright.json`
- **`L-GR-CONFIRMED-PIN-FIX`** (return:built) — 2: `.../3cf288fb.../RUN.md`
- **`L-INVOICE-RETRY-RETIREMENT`** (return:built) — 2: `f18ffeda.../RUN.md`
- **`L-MEALS-UTLKVIT`** (return:built) — 2: `PosReceiptService.cs`
- **`L-MENU-ALLERGEN-MATRIX`** (return:built) — 2: `print-preview.pdf`
- **`L-PDF-NULLDEREF`** (return:built) — 2: `2497ce9d.../RUN.md`
- **`L-PRICE-SHADOW-GUARD`** (return:built) — 2: `state-A..E.txt`
- **`L-WF-ONBOARD-DEMO-RUN`** (return:built) — 2: `api.log`
- **`L-WF-W5-TIMESHEET`** (return:built) — 2: `WORKFORCE-JOURNEY-MANIFEST.md`
- **`L-EV-DIETARY`** (return:built) — 1: `EventsRunSheetComposer.cs`

## 8. What this lane did not do

Not one citation was repaired. Several repairs are not a clerk's to make: whether `docs/plan/`
and `artifacts/journeys/` *should* be committed is a decision about what this repository is for,
and the `artifacts/` ignore rule is load-bearing for build output even though it swallows
evidence. Both belong to a later lane with an owner.
