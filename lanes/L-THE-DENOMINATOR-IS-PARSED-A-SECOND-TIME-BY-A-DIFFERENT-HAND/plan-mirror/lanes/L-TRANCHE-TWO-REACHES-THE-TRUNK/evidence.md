# L-TRANCHE-TWO-REACHES-THE-TRUNK — evidence

Trunk **`1525e74` → `c6c04c7`**, tier **173 / 4200 / 0**. One branch, one merge, no conflicts.
Nothing pushed. T3–T5 confirmed still off the trunk.

## The ordering constraint, verified as asked — and it holds more strongly than "empty diff"

Both invocations the brief named return **nothing**:

```
git diff c65b19c 40ab62d -- test/support/mutate.js                 -> 0 lines
git diff c65b19c 40ab62d -- test/mutation-runner-restore.test.js   -> 0 lines
```

An empty diff is weak evidence on its own — two files that are both *absent* also diff to nothing —
so it was confirmed by blob identity and by size:

| ref | `test/support/mutate.js` | `mutation-runner-restore.test.js` | runner blob |
|---|---|---|---|
| `c65b19c` | 131 lines | 297 lines | `e539034c7e24` |
| `40ab62d` | 131 lines | 297 lines | **`e539034c7e24` — same blob** |
| `316f22a` | **413 lines** | **393 lines** | `42ad26312eea` |
| trunk before | absent | absent | — |

`40ab62d` carries the defective runner **byte-for-byte**, and `316f22a` is not an ancestor of it
(`merge-base --is-ancestor` false). **The constraint stands**: landing `40ab62d` before this would have
shipped a runner that certifies kills for runs that executed nothing.

The wholesale-resolution instruction turned out to be moot in practice, and the reason is worth
recording: **the trunk carried neither file**, because `c65b19c` was held out of tranche one. So both
arrived as pure additions with nothing to three-way merge against. The instruction was still the right
one to give — it would have mattered had tranche one landed the runner.

**Exit criterion's teeth, asserted rather than assumed:** the landed blobs are
`42ad26312eea` and `79496a63c0e7`, **identical to `316f22a`'s and not to `c65b19c`'s**, 413 and 393
lines on disk. The four refusals the brief named all survive: `INVALID-RUN` (twice, one being the
result branch), the three-dialect count (`MUTATE_TESTS_RUN`, jest summary, vstest `Total`), and the
baseline running before a byte is written.

## A seam SEAM-1's resolution does not actually cover — it passes, but not for the stated reason

SEAM-1 was closed on the ground that *the same tip that carries the guard also deleted the meals
`mutate.js`*. True, but incomplete: **tranche one introduced a different copy**. `32518da` committed
`docs/plan/lanes/L-ELEVEN-WOLT-STATUSES-REACH-A-SWISS-SCREEN-IN-NORWEGIAN/mutate.js`, and it is on the
trunk today. `316f22a` never touches it, so the merge produces the union and the guard sweeps it.

It passes — and the guard says so itself in the tier output:

```
[sweep] 2 mutation script(s): test/support/mutate.js,
        docs/plan/lanes/L-ELEVEN-WOLT-STATUSES-REACH-A-SWISS-SCREEN-IN-NORWEGIAN/mutate.js
```

It passes for a **different reason** than SEAM-1's closure: that copy restores from a buffer
(`fs.writeFileSync`), and its only mention of `git checkout` is prose in a `//` comment, which the
guard strips before matching. Checked before merging rather than discovered by a red tier.

The distinction matters for whoever maintains this: the guard is safe against *new lane copies*
because of its comment-stripping and its buffer-restore requirement — not because any one branch
deleted any one file. A future copy that genuinely restores from git will red, which is the design
working.

## The tier — measured, not inferred

`npx jest --ci`, exit 0, no `FAIL` line, no suite that failed to run, `core` pinned to `9626a561`.

```
1525e74  before   169 suites / 4069 / 0
c6c04c7  after    173 suites / 4200 / 0
delta             +4 suites / +131 tests
```

**Every test accounted for.** `316f22a`'s own tier read **172 / 4138 / 0** against base `d4c308e`
(**168 / 4007 / 0**) — a delta of **+4 suites / +131 tests**. Composed against a trunk that has since
moved twice, the delta is **identical**.

That equality is the point, and it is the same lesson tranche one taught. The predictable number
(`4069 + 131 = 4200`) rests on an *assumption*: that `316f22a`'s file sets are disjoint from tranche
one's three branches and from the Wolt record correction, so no interaction term exists. Measuring is
what confirms the assumption; had they overlapped, the arithmetic is exactly the thing that would have
broken, silently.

## Arity sweep on the final tree

One importable module changed: `test/support/mutate.js`.

```
named imports resolved : 0
call sites checked     : 14
raw flags              : 0
```

**The zero import count is honest rather than impressive** and should not be read as a strong pass:
`mutate.js` is a `#!/usr/bin/env node` CLI script driven by `spawnSync` from
`test/mutation-runner-restore.test.js`, not imported by name anywhere. The 14 call sites are its own
internal functions, all matching their signatures. Nothing else in the merge adds or changes an
importable module, so there was little for the sweep to bite on this time.

## A zsh trap that produced a false measurement mid-lane

Recorded because it nearly turned into a wrong answer on the load-bearing check.

`git show "$ref:test/support/mutate.js"` inside a loop returned **empty for every ref**, and
`git rev-parse "$ref:test/..."` returned `c65b19cest/s`. In zsh, `$ref:t` is the **`:t` (tail)
modifier**, applied even inside double quotes — so `$r:test/...` expands to *basename of `$r`* followed
by the literal `est/...`. Every per-ref file lookup silently answered about a path that does not exist.

Had that gone unnoticed it would have "confirmed" the empty-diff claim for the worst possible reason —
both files reading as absent at every ref. The fix is `${r}:path`, braces terminating the parameter
name. The literal-ref commands (`git diff c65b19c 40ab62d -- <path>`) were never affected, which is why
the two diffs the brief asked for were valid throughout.

## Teardown

`Web-modules-wt/L-T2-LAND` detached in place, then `rm -rf` plus `git worktree prune`. No worktree
holds `feature/restaurant-modules` — free for tranche three. `web-livewalk` untouched, no container
started, nothing pushed.

**Nothing beyond tranche two touched**, asserted: `8d4d1b0`, `2ce83f6`, `6d43520` and `40ab62d` are all
still absent from the trunk.

## Revert

```
git -C /Users/svendaneel/okam/Web-modules branch -f feature/restaurant-modules 1525e74
```
