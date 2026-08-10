# L-THE-FIRST-TRANCHE-REACHES-THE-TRUNK — evidence

**Trunk `d4c308e` → `d99f92d`.** Three of tranche one's four branches landed; the runner is held.
Nothing pushed.

| step | merged | merge | conflicts |
|---|---|---|---|
| 1 | `1c607fd` `lane/register-stops-trusting-a-session-id` | `--no-ff`, automatic | **0** |
| 2 | `32518da` `lane/wolt-status-labels-translate` | `--no-ff`, automatic | **0** |
| 3 | `6026d35` `lane/flag-corpus-remeasured` | `--no-ff`, automatic | **0** |

`c65b19c` (`lane/mutation-runner-cannot-delete-work`) is **held** per the gate and is **not an
ancestor of the trunk** — asserted with `merge-base --is-ancestor` after the worktree was created and
again after the last merge, because it is the one branch that must not arrive by accident. It remains
intact at `c65b19c` for its own lane.

## The gate

Read from `docs/plan/reviews/L-READ-TRANCHE-ONE.md` directly rather than from the relay, because two
figures had already been transcribed short today:

> **Land `1c607fd`, `32518da` and `6026d35` … HOLD `c65b19c`**

The review's own composed measurement (`170 / 4080 / 0`) independently corroborates the endpoint
correction this lane made in its first pass, when the brief gave T1 as ending at 4024.

## The tier — arithmetic the reviewer stated, now measured

The reviewer was explicit that `169 / 4067 / 0` was **arithmetic, not separately run**, and asked for a
measurement. Measured at `d99f92d`, `npx jest --ci`, exit 0, no `FAIL` line, no suite that failed to
run, `core` pinned to `9626a561`:

```
Test Suites: 169 passed, 169 total
Tests:       4067 passed, 4067 total
```

**It agrees exactly.** Every test accounted for, using the per-branch deltas this lane measured in its
four-way dry run:

| | suites | tests |
|---|---|---|
| base `d4c308e` | 168 | 4007 |
| `1c607fd` | +0 | **+4** |
| `32518da` | +1 | **+56** |
| `6026d35` (docs only) | +0 | +0 |
| **total** | **169** | **4067** |

The agreement is worth more than a matching number. The arithmetic assumed the three branches'
file sets are **disjoint from the runner's**, so that removing `c65b19c` subtracts its 13 tests and one
suite cleanly and leaves no interaction term. A measured 4067 is what confirms that assumption held;
had the sets overlapped, the arithmetic would have been the thing that broke. That is why the
reviewer asked for it to be run.

## Conflicts

**Zero, across all three merges** — `git merge` reported *Automatic merge went well* each time and
`git status` showed no `UU`/`AA`/`DD` entries. `git merge-file` was therefore never invoked; reported
because the brief mandates hunk-level resolution and there was nothing to resolve. All three tips sit
directly on `d4c308e`, which is why.

## Arity sweep on the final tree

Without the runner the landing changes **two** importable modules rather than three —
`test/support/mutate.js` is the runner's and did not land. Swept tree-wide against every tracked
`.js`/`.vue`/`.ts` outside `core/`, `docs/`, `lanes/`:

```
modules swept      : plugins/global-mixin.js, utils/workforce/pos-clock-state.js
named imports      : 25   -> every one resolves to a real export
call sites checked : 36   -> every one matches its signature
raw flags          : 0
```

Zero raw flags, so nothing needed adjudicating — against the landing plan's 26 raw flags, all of which
its own note records as homonyms plus a bug in its counter.

The sweep is not made redundant by the green tier: jest exercises only what a test reaches, so an
unresolved import in a production file no suite imports passes the tier and fails in a browser. That is
the class of defect that produced a clean-but-uncompilable backend tree earlier today.

## Carried forward, deliberately not acted on

- **The Wolt lane's record is wrong three ways** and its behaviour is right. `statusesToSave` has
  **ten** members including `DropoffCompleted` since `6454f3c71`; **eleven of fifteen** statuses reach;
  **four are wordless**; and the label its lane called a carried courtesy is **load-bearing**. The gate
  ruled this a two-sentence record correction with **no code change**, and explicitly that it must not
  hold the landing. It is not fixed here and belongs to whoever owns that record.
- **The runner's defect**, in the gate's words: it certifies kills for runs that executed zero tests in
  both exit directions, and **its own pin blesses the false kill** — the "suite command cannot be run
  at all" arm expects `RED`. Every kill certificate in this program flows through that file. Its fix is
  a separate lane.

  Worth noting for whoever takes it: this lane used that runner earlier today against a .NET suite and
  did not hit the defect, because the wrapper it drove logged a per-invocation test count and refused
  any run whose count differed from a non-zero baseline. That wrapper pattern is the shape of the fix,
  but it lived outside the runner — which is precisely the gate's point.

## Teardown

`Web-modules-wt/L-T1-LAND` detached in place, then removed with `rm -rf` plus `git worktree prune`.
**No worktree holds `feature/restaurant-modules`; the trunk ref is free for tranche two.** The earlier
dry-run worktree `L-T1-DRYRUN` was removed in the same lane's first pass. `web-livewalk` untouched, no
container started, nothing beyond tranche one touched.

## Revert

```
git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules d4c308e
```
