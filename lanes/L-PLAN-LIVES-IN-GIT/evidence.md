# L-PLAN-LIVES-IN-GIT — evidence

Brief `2290eb92`. Built 2026-08-06. All measurements taken in
`/Users/svendaneel/okam/Web-modules` (a worktree of `/Users/svendaneel/okam/Web/.git`).

The deliverable is everything up to but not including the shared-branch act. The branch exists
locally, the fresh-checkout property is proven empirically, the owner's push is written and
dry-run-validated. **The push is unperformed and owed.**

---

## 1. The present state, measured (not inherited)

### 1.1 What is under `docs/plan`

At build time, `2026-08-06 13:52`:

| set | files | bytes |
|---|---:|---:|
| everything under `docs/plan` | **863** | 13,062,785 |
| tracked on the current branch (`lane/focustrap-teardown`) | **0** | — |
| ignored by `docs/plan/.gitignore` + root `.gitignore` | **419** | 9,470,708 |
| the addable remainder — what went on the branch | **444** | **3,592,077** |

The 444: `plan.md` (25,686 lines), `intent.md`, `log.md`, `docs/plan/.gitignore`, **415 returns**,
**22 reviews**, 3 walks.

### 1.2 The brief's "zero of 812 tracked on any branch" is now *nearly* true, not exactly

A sweep of all 139 local heads and 8 remote-tracking refs found **four** return files that have
been swept incidentally into lane commits:

```
docs/plan/returns/L-JOURNEY-MEALS-1.md
docs/plan/returns/L-JOURNEY-PROXY-BLINDSPOT-1.md
docs/plan/returns/L-PRICE-SHADOW-GUARD-1.md
docs/plan/returns/L-WF-KODEOVERSIKT-UI-1.md
```

on `candidate/fe-compose-2026-08-05`, `lane/ack-receipt-survives-reload`, and five single-file
lane branches. `plan.md`, `intent.md`, `log.md` and **every one of the 22 reviews** are tracked
on **zero** branches. The correction does not change the finding; it is itself evidence for §5
(plan files are already leaking into code-branch diffs by accident).

### 1.3 `docs/plan/.gitignore` exists and excludes 419 files — this is by design, not loss

```
docs/plan/.gitignore:
  briefs/
  render/
  *.tmp-plan
```
plus root `.gitignore:5:*.log`, which catches `docs/plan/stamps.log`.

Excluded: **410 briefs**, **8 render outputs** (`COCKPIT.md`, `DECISIONS.md`, `FLAGS.md`,
`HISTORY.md`, `LANES.md`, `ROADMAP.md`, `WHY.md`, `plan.html` — 1.3 MB), `stamps.log`.

All three are **derived**, verified in the tool at `/Users/svendaneel/.local/bin/plan`:

- `write_briefs()` at line 1904 — *"§1.1: briefs are regenerated per dispatch"*, called from
  line 2957 on every dispatch.
- `render/` is a rendered view of `plan.md`.
- `stamps.log` is a log.

So respecting the existing ignore file loses nothing durable, and it lands **exactly** the three
things the exit criterion names: the plan, the returns, the reviews. A naive `git add -f` that
overrode the ignore would have added 419 derived files and **46,986 lines of churn per day**
(§5.2) for no recoverable information.

### 1.4 The stopgap ref: stale, and unreachable by any clone

`refs/lanes/plan-snapshot` = `212a2b8` — *"Snapshot docs/plan: 812 files, none of them tracked on
any branch"*, Sven Daneel, **Wed Aug 5 14:53:31 2026**. Re-measured, it holds **812** files.

**It is not current against the working tree.** Against the tree as of 2026-08-06 13:52:

| | count |
|---|---:|
| files in the tree that the snapshot does not have | **57** (29 briefs, 28 returns) |
| files whose content has changed since | **11** (`plan.md`, `log.md`, 8 render files, 1 brief) |
| paths only in the snapshot | **6** |

The 6 snapshot-only paths are **not lost work**. They are `docs/plan/lanes/*/mutation-log.md` and
one `evidence.md`; the lane workdir root moved from `docs/plan/lanes/` to repo-root `lanes/`
(248 lane dirs, 2,629 files there now). All six were hash-compared against their new home and are
**byte-identical**:

```
IDENTICAL lanes/L-FRAGILE-NEEDLES/mutation-log.md
IDENTICAL lanes/L-MARGIN-VIOLATION-ANCHOR/mutation-log.md
IDENTICAL lanes/L-MEALS-VIOLATION-EXACT/mutation-log.md
IDENTICAL lanes/L-WF-CORRECTION-PINS/mutation-log.md
IDENTICAL lanes/L-XZ-CREDIT-FIELDS/evidence.md
IDENTICAL lanes/L-XZ-PRINTED-DEFECTS/mutation-log.md
```

**Answer to "is the snapshot ref still current": no.** It is stale by 57 files, 11 contents and
3,107 lines, in 23 hours.

And it is worse than stale — it is **unreachable**:

```
$ git ls-remote origin | grep -c 'refs/lanes/'
0
$ git config --get-all remote.origin.fetch
+refs/heads/*:refs/remotes/origin/*
```

The ref has never been pushed, and the default clone refspec names only `refs/heads/*`, so even
if it were pushed no clone would fetch it. It preserves bytes on one disk and nothing else.

---

## 2. The local branch

`plan/docs-20260806` — name checked free across `refs/heads`, `refs/remotes`, `refs/tags`,
`refs/lanes` and `git ls-remote origin 'refs/heads/plan/*'` before creation.

```
commit  54d4dfc265d8d3ebd0a464705a3aa5e59d24e8ed
author  Sven Daneel <sven4696@gmail.com>
date    Thu Aug 6 13:52:29 2026 +0200
parents (none — orphan)
files   444
bytes   3,592,077
```

Trailers on the commit:

```
plan-corresponds-to-code: e34977a…  (feature/restaurant-modules)
supersedes-snapshot-ref:  212a2b8…
built-by: agent:L-PLAN-LIVES-IN-GIT (brief 2290eb92)
push-is-unperformed: this branch is local only; publishing it is the owner's act
```

### 2.1 The primary checkout's index was never touched

The primary checkout carries **2,102** uncommitted paths (`--untracked-files=all`) belonging to
other lanes. `git add -A` there would sweep every one of them. It was not run, and no `git add`
of any kind ran against the primary index.

The tree was built in a temporary index outside the repo:

```sh
export GIT_INDEX_FILE=<scratch>/plan-only-index
git read-tree --empty
git add -- docs/plan          # pathspec-limited; honours docs/plan/.gitignore
TREE=$(git write-tree)
COMMIT=$(git commit-tree "$TREE" -F <msg>)   # no -p ⇒ orphan
git update-ref refs/heads/plan/docs-20260806 "$COMMIT" ""
```

Index fingerprint of `/Users/svendaneel/okam/Web/.git/worktrees/Web-modules/index`:

```
before: 1785918138 89350
after:  1785918138 89350
```

Byte-identical, same mtime. No worktree file was created, modified or deleted outside this lane
directory. `git stash` was not used.

### 2.2 Why orphan

An orphan branch carries `docs/plan` and **nothing else**. Consequences, all deliberate:

- Publishing the plan publishes **no code history**. Basing it on `feature/restaurant-modules`
  instead would have pushed that branch's entire history to `origin` as a side effect — and
  `feature/restaurant-modules` is **not on origin today** (§4.2). Publishing a document should
  not publish a branch nobody decided to publish.
- The push is ~3.5 MB of markdown.
- It cannot be merged into a code branch (unrelated histories). **This branch is for reading, not
  for merging.** If the owner rules "same branch as the code" instead, §4.3 gives that command.
- Hazard: `git checkout plan/docs-20260806` **in an existing working clone replaces the working
  tree with just `docs/`**. Read it with `git worktree add` or a separate clone, not a checkout
  in place.

---

## 3. The fresh-checkout proof (this is the point; the push is not)

A real clone over the `file://` transport, so object negotiation is genuine rather than a
directory copy:

```sh
git clone --single-branch --branch plan/docs-20260806 \
  file:///Users/svendaneel/okam/Web \
  /Users/svendaneel/okam/Web-modules/lanes/L-PLAN-LIVES-IN-GIT/fresh-clone
```

The clone lives at `lanes/L-PLAN-LIVES-IN-GIT/fresh-clone/` and is ignored via
`lanes/L-PLAN-LIVES-IN-GIT/.gitignore` so no other lane can accidentally embed it as a gitlink.

### 3.1 What the clone contains

```
HEAD:     54d4dfc265d8d3ebd0a464705a3aa5e59d24e8ed
branch:   plan/docs-20260806
dirty:    0 paths
refspec:  +refs/heads/plan/docs-20260806:refs/remotes/origin/plan/docs-20260806

$ find . -path ./.git -prune -o -type f -print | wc -l
     444
$ find docs/plan -type f | wc -l
     444
       4 (root)
     415 returns
      22 reviews
       3 walks
```

Top level of the clone is `docs/` and nothing else.

### 3.2 Three named files, opened in the clean checkout

**The plan — `docs/plan/plan.md`**, 1,762,155 bytes, 25,686 lines:

```
---
plan: restaurant-modules
owner: @sven
phase: cockpit
signed: 7c84435b072ff7fe
caps: sql=2 suite=4 node=6 analysis=6 global=12
---
# Plan — restaurant-modules
```

**A return — `docs/plan/returns/L-ABSENCE-AUDIT-CONDITIONS-1.md`**:

```
RETURN: L-ABSENCE-AUDIT-CONDITIONS
brief: 7daf3e4f
verdict: built
evidence: lanes/L-ABSENCE-AUDIT-CONDITIONS/applied.md
```

**A review — `docs/plan/reviews/L-CONFIRM-CHAIN-REVIEW.md`**:

```
# Fable review — the confirm chain read as one composed thing (2026-08-02)
Verdict: SOUND-WITH-CONDITIONS. Eleven commits, five true heads, trial-merged in the object
database only (no checkout touched, trial objects released, temporary tag deleted).
```

All 22 reviews are present, by name, in the clone.

### 3.3 Byte-identity, all 444 files

Every path on the branch was hashed in the clone and in the primary working tree:

```
identical=444  differs=0  gone=0
```

The clone is not "files with the right names" — it is the same bytes.

---

## 4. The owner's step

Full copy-pasteable block: **`lanes/L-PLAN-LIVES-IN-GIT/owner-step.md`**.

### 4.1 The command

```sh
git -C /Users/svendaneel/okam/Web-modules \
  push origin plan/docs-20260806:refs/heads/plan/docs-20260806
```

**Remote:** `origin` → `git@github.com:Okam-AS/Web.git`. It is the **only** remote configured.

**Dry-run validated** (writes nothing, runs the pre-push hook, proves auth):

```
$ git push --dry-run origin plan/docs-20260806:refs/heads/plan/docs-20260806
To github.com:Okam-AS/Web.git
 * [new branch]      plan/docs-20260806 -> plan/docs-20260806
exit=0
$ git ls-remote --heads origin 'refs/heads/plan/*' | wc -l
0      # still absent — nothing was published
```

An explicit `src:refs/heads/dst` refspec is used because `push.default` is unset (`simple`) and
the branch has no upstream.

### 4.2 `feature/restaurant-modules` — re-checked

**It exists on no remote.** There is only one remote. `origin` carries 7 heads:

```
main, backup/pre-core-consolidation, swiss,
feature/POS, feature/swiss, feature/dintero-in-person-terminal, feature/email-campaign
```

`feature/restaurant-modules` exists **only locally**, at `e34977a` (2026-08-04). Both module
branches the plan describes are unpublished; this branch would be the first thing about the
restaurant-modules program to reach `origin`.

### 4.3 What a reviewer would see

A new branch `plan/docs-20260806` with **one commit, 444 files, no code**. Because it is an
orphan, GitHub's compare view against `main` shows all 444 as additions and a PR would report
unrelated histories — expected, and the reason it is a reading branch. To read it without
disturbing a working clone:

```sh
git fetch origin plan/docs-20260806
git worktree add /tmp/plan origin/plan/docs-20260806
```

### 4.4 Optional, if the owner wants the ref retired

The 6 `docs/plan/lanes/*` paths held only by `refs/lanes/plan-snapshot` are byte-identical to
files that exist today at repo-root `lanes/` (§1.4). Nothing in that ref is unique. It can be
deleted after the push, or left as a dated marker. **This lane did not delete it and did not
resurrect its paths** — resurrecting files someone moved would misreport the present.

---

## 5. Where should it live — measurement, then a recommendation

The brief names two options: the same branch as the code, or a dedicated branch. Both beat the
present state. The costs are asymmetric and measurable.

### 5.1 The cost of *same branch as the code*: churn, paid by every reviewer, forever

One day of plan churn, measured as the diff from the snapshot ref (Aug 5 14:53) to this branch
(Aug 6 13:52) — **23 hours**, restricted to the tracked set:

```
30 files changed, 3,107 insertions(+), 211 deletions(-)
  plan.md    1 file,  2,356 insertions, 211 deletions
  log.md     1 file,    200 insertions
  returns   28 files,   551 insertions
```

A representative lane diff against its merge-base with `feature/restaurant-modules`:

| lane | files | lines |
|---|---:|---|
| `lane/focustrap-teardown` | 6 | 400 +, 6 − |
| `lane/consent-reason-vocabulary` | 5 | 633 +, 1 − |
| `lane/L-PRICE-SHADOW-GUARD` | 10 | 994 +, 12 − |
| `lane/fe-journey-meals` | 15 | 1,387 + |
| `lane/wf-kodeoversikt-ui` | 16 | 1,250 +, 60 − |

**A single day of plan churn is 2× to 6× a whole focused lane's diff** — 30 files against a
median of 10, and 3,107 lines against a median of ~1,000. A lane living two days on the code
branch would carry more plan churn than its own work.

This estate has already run the experiment. `lanes/` (the per-lane workdirs) *is* tracked on the
code branch, and it is what turns focused lanes into unreviewable ones:

```
lane/duplicate-key-guard         289 files, 51,368 +   ← 127 of those files are lanes/
lane/lint-two-real-defects       291 files, 51,091 +
lane/mrg-waste-panel-says-absent 293 files, 54,873 +
```

`docs/plan` on the code branch adds a second, larger source of the same disease. And it has
already started by accident: four return files are sitting in lane commits today (§1.2) with
nobody having decided that.

Worse, `plan.md` is a **single 1.7 MB file that every lane's dispatch rewrites**. On a shared
code branch it is a guaranteed conflict on every merge, resolvable only by regenerating — which
is exactly the class of merge trap `docs/plan/reviews/L-CONFIRM-CHAIN-REVIEW.md` already
documents for a `.trx` at a shared path.

### 5.2 The cost of ignoring `docs/plan/.gitignore` on either option

Tracking `briefs/` and `render/` too, same 23-hour window:

```
389 files changed, ~46,986 lines
```

15× the churn of the tracked set, all of it regenerable. Whichever branch is chosen, **keep the
ignore file.**

### 5.3 The cost of *a dedicated branch*: staleness — bounded, and now detectable

"What breaks if a dedicated branch is forgotten" is not hypothetical. The estate already has a
forgotten out-of-band plan artifact, and its decay rate is measured: `refs/lanes/plan-snapshot`
was written once and never refreshed, and **in 23 hours it went stale by 57 files, 11 contents
and 3,107 lines** (§1.4).

The drift is faster than that. Between building this branch and finishing this document —
about **ten minutes** — the working tree already moved:

```
drifted since build: docs/plan/plan.md, docs/plan/log.md
new plan files since build: 2
```

The plan is a live cockpit; any commit of it is a photograph. A stale plan branch is arguably
**worse than no branch**, because it presents superseded rulings to a newcomer with the full
authority of `plan.md` and no marker saying when it was true.

Two things bound that cost, and neither was available to the ref:

1. **It is one command to detect.** `git fetch origin plan/docs-20260806 && git diff --stat FETCH_HEAD -- docs/plan` names the gap exactly — that is how §1.4's numbers were produced. Nobody could have run that against `refs/lanes/plan-snapshot`, because a clone never fetches `refs/lanes/*`.
2. **It is one command to fix**, and the fix is the same five lines that built it — no rebase, no conflict, no interaction with any lane, because nothing else writes that branch.
3. The commit records `plan-corresponds-to-code: <sha>`, so a reader can always ask how far the code has moved past the plan they are reading.

### 5.4 Recommendation — the owner rules, this lane does not

**A dedicated branch, refreshed by dated commits, with `docs/plan/.gitignore` respected.**

The measurement behind it: the churn cost is **unbounded and recurring** — 30 files and 3,107
lines per day levied on every reviewer of every lane diff, on top of a `lanes/` problem that
already produces 289-file diffs, plus a guaranteed conflict on a 1.7 MB file that every dispatch
rewrites. The staleness cost is **bounded and mechanical** — one detectable number, fixed by one
command that touches nothing else.

Two things would change the recommendation, and the owner is better placed to weigh both:

- If the plan must be **reviewable alongside the code that answers it** — a reviewer seeing the
  ruling and the diff in one PR — then same-branch wins on a value this lane cannot measure.
- If nobody will own the refresh, a dedicated branch decays into a confident lie. The honest
  version of the recommendation is: **dedicated branch, only if the refresh has an owner.**
  Otherwise same-branch, and pay the churn, because churn is at least self-correcting.

The one thing the measurement rules out on its own is tracking `briefs/` and `render/`.

---

## 6. Hazards observed and avoided

- `git add -A` never run in the primary checkout — 2,102 uncommitted paths there belong to other
  lanes.
- `npm ci` / `npm install` never run.
- `git stash` never used.
- No container started or stopped.
- No fixed scratch path: everything under `lanes/L-PLAN-LIVES-IN-GIT/` or the session scratchpad.
- Refs always brace-quoted as `"refs/heads/${b}"`.
- **New trap, cost about ten minutes:** in zsh, `while read -r sha path` **destroys `PATH`** —
  `path` is zsh's array alias for `PATH`. The loop body loses `git`, `wc`, `sed`, everything, and
  fails with `command not found` rather than anything that names the cause. Never bind a shell
  variable called `path` in zsh; this one used `fp`.
- `git push --dry-run` was used to validate the owner's command. It writes nothing; `git ls-remote`
  after it confirmed 0 `plan/*` heads on origin. **No push, no tag, no commit to any shared
  branch was performed.**
- Lane directory: this lane wrote to repo-root **`lanes/L-PLAN-LIVES-IN-GIT/`**, not
  `docs/plan/lanes/`. That matches the brief's `workdir: lanes/L-PLAN-LIVES-IN-GIT/`, the 248
  peer lane dirs, and the `evidence:` paths other returns already use. `docs/plan/lanes/` is the
  abandoned layout (§1.4) and writing there would have put this lane's output inside the very
  tree it snapshots.
