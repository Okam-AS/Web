# L-PROBE-DIR-IS-PINNED — a backend probe refuses to answer from the wrong ref

brief 72e3fbb5 · 2026-08-06 · nothing outside this lane directory and the two benches was written,
and `../OkamAPI-modules` was never checked out to another ref.

## What the instrument is

Four probe lines per `dir`, reading **git's own per-worktree bookkeeping**. Not a stamp, not a
collector, not a script anybody has to remember to run — the files below are written by `git checkout`
itself, so the probe is current the instant the tree moves:

| file | what it settles |
|---|---|
| `<dir>/.git` | which **repo** and which **worktree** this dir is (a linked worktree's `.git` is a pointer *file*) |
| `<repo>/.git/worktrees/<name>/HEAD` | which **ref** that worktree is standing on |

Chained, they pin `dir → repo → worktree → ref`. The repo half is not decoration: it is the brief's
"a SHA without its repo" defect made checkable — `8e2b57de` is an **OkamAPI** ref and resolves to no
object in **Web-modules**, and a dir that quietly became a different repo would otherwise answer every
probe perfectly well.

The exact lines are in `proposed-probes.txt` (8 lines) and `proposed-facts.txt` (2 bullets). This lane
may not edit `docs/plan/**`, so the clerk applies them:

1. the 8 probe lines go inside the ` ```probes ` fence, immediately **before** the `intent.hash` line;
2. the 2 fact bullets go in `## Facts`, immediately **before** the `- Intent hash:` bullet;
3. `plan refresh`.

A probe with no fact span is never evaluated, which is why the bullets are part of the deliverable and
not an afterthought.

## What it reads today (`pinlive-run.txt`, the real tool against the real trees, read-only)

```
  dir ../OkamAPI-modules
    repo   ok      /Users/svendaneel/okam/OkamAPI/.git/worktrees/OkamAPI-modules
    ref    declared=feature/restaurant-modules  found=lane/meals-grace-pins
    pin    unconf  -> MISMATCH

  dir .  (the hub itself)
    repo   ok      /Users/svendaneel/okam/Web/.git/worktrees/Web-modules
    ref    declared=feature/restaurant-modules  found=lane/focustrap-teardown
    pin    unconf  -> MISMATCH
```

**The second row is a finding this lane was not sent to make.** The plan hub's own checkout,
`Web-modules`, is on `lane/focustrap-teardown`. The plan asserts the opposite, as an `ok` fact:

```
<!--fact fe.world.branch 2026-08-04T21:52Z ok-->feature/restaurant-modules<!--/fact-->
<!--fact fe.world        2026-08-04T21:52Z ok-->True<!--/fact-->
```

Those two facts are **false right now, in the green direction**, which is the exact shape
`F-PROBE-ROOT-WRONG-WORLD` says is the worst available. The cause is that `fe.world*` and `be.world*`
read `artifacts/world/WORLD.json`, and `worldstamp` writes that file **from inside the repo it
describes**. The hub's copy was stamped `2026-08-03T08:14Z`; the tree moved afterwards and nothing
re-stamped it. The backend's copy, stamped `2026-08-03T09:23Z`, happens to still be right about the
branch — by luck, not by construction.

So the existing world facts are not a weaker version of this instrument. They are a **different kind of
claim**: a recording of a measurement, which decays silently. The pin probes read the thing itself.

Two corrections the clerk may want for that flag's body, both measured today:

- it says "23 backend probes plus 2 ConsumerWeb = 25". There are **23 backend probes and no ConsumerWeb
  probes** — `L-PROBE-DROP-CONSUMERWEB` removed them. The other **8 probes read the hub itself**, which
  the flag's counts never named as a `dir` at all, and which is off-branch today.
- `../OkamAPI-modules` carries **66** `dir:` fields, not 65: one is the inline roadmap form
  (`· dir:../OkamAPI-modules ·`) that an end-of-line-anchored count misses.

## The mutation arm (`pinbench.sh` → `pinbench-run.txt`, 8 caught+falsified, 0 failures)

A scratch main repo with a linked worktree beside it, mirroring the real topology exactly. The real
`plan` tool, the real extractors, a copy of the real plan.

| act | injection | result |
|---|---|---|
| 0 | scratch worktree on the declared ref | green, and it **names the repo it read** |
| 1 | `git checkout lane/meals-grace-pins` in the scratch worktree | **RED**, `declared=feature/restaurant-modules found=lane/meals-grace-pins` |
| 1f | **falsification**: pin weakened to `exists`, identical injection | **green** — the declared-ref clause is load-bearing |
| 2 | detached HEAD | RED, and the found value is the sha, not a branch name |
| 3 | dir repointed at a **different repo** that is *also* on the declared branch | RED, and `be.dir.gitdir` names the foreign repo. A branch check alone cannot see this |
| 4 | dir removed | RED, and retain-and-mark keeps the last value beside the mark |
| 5 | back on the declared ref | green again — a guard, not a permanent red |
| 6 | a commit lands on the branch | **still green, deliberately** — see the limit below |

The first draft of this bench asserted `unconf` and nothing else, and three acts passed while the bench
had **failed to build at all**. Every assertion now names the value it expects. A check that passes on an
empty world is the silent instrument this lane exists to remove, one level down.

## The proposed edit, run before it is made (`pinproposed.sh` → `pinproposed-run.txt`)

The exact clerk lines applied to a copy of the real plan, in a bench whose backend siblings are
**symlinks to the real trees** and whose hub is a bench worktree in the real shape:

- `plan check`: **1 error / 111 warnings before, 1 error / 111 warnings after** — the lines add no
  violation and remove none.
- `plan refresh`: `be.dir.pin` **RED** with `be.dir.ref = lane/meals-grace-pins`; `fe.dir.pin` **green**
  against the conforming bench hub, which is how the fe lines are shown to work rather than merely to red.
- the rendered sentence a reader actually sees carries both refs:
  `Backend dir ../OkamAPI-modules is worktree …/OkamAPI/.git/worktrees/OkamAPI-modules, repo pin present,
  declared ref feature/restaurant-modules, found ref lane/meals-grace-pins, ref pin pending`.

## Coverage: "every backend dir", checked rather than asserted (`pindirs.py`)

The pin probes answer *is this dir on the declared ref*. They cannot answer *did somebody add a dir and
no pin for it* — that is a property of the plan text. `pindirs.py` derives it:

- census: **exactly two** dirs bear facts — `.` (8 probes) and `../OkamAPI-modules` (23 probes, 66 `dir:`
  fields). No third sibling is read by any probe.
- a dir counts as pinned only when a repo pin exists **and** the ref pin reads *that same worktree's*
  HEAD (`literal + "/HEAD"`) **and** something names the ref found. Without the middle clause a plan can
  pin one dir by reading another dir's HEAD and call itself covered — the same defect one level down.
- the declared ref is read from `world.config`, so the pin literal and the plan's declared world cannot
  drift apart silently. No `integration_branch` → exit 2, never a pass.
- run today: **exit 1, 2 of 2 dirs UNPINNED**. With the proposed lines: **exit 0**. With one extra probe
  reading a new unpinned sibling: **exit 1 again** — the coverage check can be made to fail.

An early version had this checker regressing forever: its own pin probes read `../OkamAPI/...` and
`../Web/...`, so each pin created a dir demanding a pin. Git bookkeeping paths are now excluded from the
census and used only to *resolve* pins.

## Limits, stated rather than discovered later

- **Branch identity, not branch position.** ACT 6 shows the pin green at two different commits on the
  declared branch. How far behind the tree is remains `commits_behind_integration` in `WORLD.json` — and
  that one **is** a stamp, so it goes stale exactly as `fe.world` has. No commit-level probe is offered:
  the only file a probe could read for it is `refs/heads/<branch>`, which vanishes into `packed-refs` and
  would red for a reason that has nothing to do with drift.
- **Layout-bound, and it fails safe.** The pin assumes each checkout is a *linked worktree*, so `.git` is
  a pointer file. Convert either to a plain clone and `probe_sources`' `os.path.isfile` filter drops it and
  the pin **reds** — a false alarm, never a false green, and the remedy is to re-declare the pin for the
  new layout.
- **This instrument does not clear `F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH`.** Its `clears_when` asks that
  every backend probe *read a tree whose branch this plan names*. The pin makes the mismatch loud; putting
  the trees on `feature/restaurant-modules` is a separate act, and the backend one is another lane's
  worktree, so it is the owner's call and not this lane's.
- **`be.dir.pin`'s own value is `present`, never the ref.** `run_probe` returns one of a value or a
  failure, so the gate and the naming are two probes by necessity: `*.dir.pin` reds, `*.dir.ref` names.
  Both refs are on the page either way; neither probe alone carries both.

## Files

| file | what it is |
|---|---|
| `proposed-probes.txt` | the 8 probe lines, verbatim, for the fence |
| `proposed-facts.txt` | the 2 fact bullets, verbatim, for `## Facts` |
| `pinbench.sh` / `pinbench-run.txt` | the mutation arm on a scratch checkout, with falsification |
| `pinlive.sh` / `pinlive-run.txt` | the same instrument against the real trees, read-only |
| `pinproposed.sh` / `pinproposed-run.txt` | the exact proposed edit, run before it is made |
| `pindirs.py` | the coverage check: every fact-bearing dir is pinned, or exit 1 |
