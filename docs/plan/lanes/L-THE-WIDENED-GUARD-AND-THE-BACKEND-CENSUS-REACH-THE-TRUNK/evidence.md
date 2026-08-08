# L-THE-WIDENED-GUARD-AND-THE-BACKEND-CENSUS-REACH-THE-TRUNK — evidence

Trunk **`31e6c60` → `9d88101`**, tier **183 / 4445 / 0**. **One of the two branches landed.**
`lane/backend-landing-order` @ `392a2fd` is **held**, for a measured reason. Nothing pushed.

## The finding: the two branches are incompatible as they stand

Landing both produces a **red trunk**. Merging the guard first and the census second gives:

```
Test Suites: 1 failed, 182 passed, 183 total
Tests:       5 failed, 4440 passed, 4445 total
[sweep] 54 script(s) swept across 3 roots
```

and the sole offender is a file the **census branch itself brings**:

```
docs/plan/lanes/L-THE-BACKEND-LANDING-ORDER-IS-COMPUTED/compose.sh — git checkout --
```

The other four reds are consequential, not independent: they are the *"does not accuse"* arms, which
assert the offender list is empty and therefore fail on any extra entry.

**Isolated by measurement rather than deduction.** Resetting to the guard merge alone:

```
Test Suites: 183 passed, 183 total
Tests:       4445 passed, 4445 total
[sweep] 53 script(s) swept across 3 roots
```

Green, and **53 across 3 roots — exactly the branch's own claim**. The 54th script is `compose.sh`, and
it is the only thing standing between these two branches and a green trunk.

## Why I held the census rather than editing `compose.sh`

`compose.sh:30` is `cd $WT && git checkout -- $RUNSHEET`, restoring
`artifacts/journeys/ev-dietary/run-sheet.json` — the tracked artifact the backend tier rewrites — inside
a throwaway detached-HEAD composition worktree. Its own comment says so: *"The non-SQL tier rewrites
this TRACKED file. Restore it; never `git add -A`."* That is the same hygiene step I performed by hand
in the backend money tranche.

So by the guard's **rule** it is a true positive; by the guard's **stated danger** it is not. The defect
the guard exists to prevent is a runner restoring the file *under mutation* from git, which reverts to
HEAD and destroys a lane's uncommitted work. `compose.sh` restores a *generated artifact* in a worktree
that holds no uncommitted work by construction.

Two reasons I did not simply edit it:

1. **`compose.sh` is a record, not live code.** It is the script that was actually run to produce the
   census. Editing it so a guard passes would make the evidence directory hold a script that is no
   longer the one that produced the measurements beside it.
2. **It exposes a real gap in the widening, which is worth a decision rather than a patch.** The guard
   sweeps `docs/plan/lanes/`, a directory whose contents are *findings*. It already carves out file
   types — its own comment says a lane's `.md`, `.txt`, `.log` and `.json` "are its findings, and a
   finding is entitled to quote `git checkout` as prose" — but a `.sh` that is equally a record is
   still swept as a live driver. That distinction is the owner's to draw, not a landing lane's.

**Three ways forward, none of them mine to choose:** narrow the sweep so evidence records are treated
like the other finding file types; change `compose.sh` to snapshot and `cp` back; or accept the
offender and adjust the arm. The census branch is untouched at `392a2fd` and its artifact is otherwise
ready — it merged cleanly and `docs/plan/artifacts/backend-landing-order.md` **was** tracked after the
merge, so the bare `artifacts/` rule did not eat it.

## The guard branch: measured against the moved trunk

Its base is `3807e905c`, two tranches behind. The brief predicted its +7 net arms would still be +7.

```
31e6c60  before   183 suites / 4438 / 0
9d88101  after    183 suites / 4445 / 0
delta             +0 suites / +7 tests
```

**+7 exactly, measured on the current trunk rather than inferred from the stale base.**

## The three things that had to survive — all confirmed at the landed tip

**1. Both widenings.**

| | trunk `31e6c60` | landed `9d88101` |
|---|---|---|
| `SWEEP_ROOTS` entries | 2 | **3** |
| `/mutat/i.test(entry.name)` filename narrowing | 1 | **0 — removed** |
| scripts swept | 2 | **53** |

Either widening alone would have left the hole open: the extra root is where 47 of the drivers live,
and the filename narrowing is how `run-browser-arm.sh` stayed hidden while patching `LoginModal.vue`.

**2. The comment stripper, both directions.** The arms are present and green at the tip: it does not
accuse a python driver naming `git checkout` in its **docstring**, nor a driver naming it in a **block
comment**, nor a script naming it in a `#` comment — while it **still accuses** an executed restore
passed as a single-quoted argument and as a triple-quoted one. A triple quote is prose only when it
*opens* a line, so `subprocess.run("git checkout -- x")` is still caught.

**3. `run-browser-arm.sh` is the fixed file, by blob identity.**

```
landed  e633fc957202     branch b6715dd  e633fc957202     trunk 31e6c60  04907e7e1cfa
```

The merge took the **fixed** blob, not the trunk's unfixed one. Confirmed by identity rather than by an
empty diff. Its remaining mention of `git checkout` is at line 34, inside a `#` comment explaining what
it *used* to do — the fix's own account of the defect, which is precisely the false positive the
stripper exists to prevent. It now restores with `cp "${ORIGINAL}" "${TARGET}"` from an `mktemp` buffer,
in the trap and before each arm.

## The decision check, made before merging

Using each open decision's `blocks:` field. **Fifteen decisions are open. Neither
`lane/guard-sweeps-where-runners-live` nor `lane/backend-landing-order` is named in any of them**, so
both were free to land on that axis — the hold above is a measured tier failure, not a gate.

## Arity sweep

The landed branch changes no importable module — it changes a test file and a lane's shell script. The
sweep that can fail here is the guard's own module resolution, and the suite exercises it directly: all
183 suites resolve and run, with no `Cannot find module` and no suite failing to run.

## Teardown

`Web-modules-wt/L-GUARD-CENSUS` detached in place, then `rm -rf` plus `git worktree prune`. No worktree
holds the trunk. `lane/loginmodal-success-is-silent` and its worktree were not touched — it still
carries the unfixed blob `04907e7e` and inherits the fix when it rebases. `web-livewalk` untouched, no
container started, nothing pushed; neither core pin is on any remote.

## Revert

```
git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules 31e6c60
```
