# L-COLLECTED-PATHS — what the runner says it collects

Closes `F-ARCHIVED-TEST-INFLATES-THE-GREEN` on a **collected-path list**, not on a green run — a green
run being precisely what the inflated count already produced.

Every number here comes from `jest --listTests`. That collects and prints paths and **executes no
test**: no server, no browser, no port, no container, and no interference with the two composition
lanes running at the same time. Regenerate everything with `sh lanes/L-COLLECTED-PATHS/rerun.sh`,
which re-lists and then re-checks **20** assertions — the 15 below plus five controls added
2026-08-05 by L-COLLECT-REVIEW-CONDITIONS, which also made the script `cd` to the repo root so it
measures this tree from any working directory. Before that it did not: run from elsewhere it
overwrote `collected.txt` with a listing of a different tree, or with nothing at all, while the two
assertions that answer the flag went on passing. Both worlds are demonstrated in
`lanes/L-COLLECT-REVIEW-CONDITIONS/applied.md`.

Measured 2026-08-05 00:40–00:50 CEST, shared checkout on `feature/restaurant-modules` at
`e34977acebd59b223584158c33451b6f1ffd82c1`, **268 dirty files** from concurrent lanes (none of the
churn is this lane's).

---

## 1. The answer

`collected.txt` is the live frontend suite's collected-path list — **126 paths, every one of them
under `test/`**. It contains no path under `lanes/` and no filename marked `.OLD.`, `superseded`,
`archive`, `deprecated`, `.bak` or `.orig`.

## 2. Both directions, because a pattern that excludes too much fails just as quietly

The "before" number is not taken from memory or from a prior lane's write-up. It is a second listing
of **the same tree at the same instant**, through a config that inherits the real one and removes only
the entry under test (`jest.without-lanes.config.js`). The difference between the two listings *is*
the answer to both directions at once: every path the pattern removed, named.

| listing | paths |
|---|---|
| `collected-without-pattern.txt` — the entry removed | **131** |
| `collected.txt` — the suite as it stands | **126** |

```
removed: 5      added: 0      removed NOT under lanes/: 0
lanes/L-JOURNEY-PORT-HARDCODED/portproof/port-resolution.spec.js
lanes/L-TRAIN-PUBLISH-UNCLICKABLE/probe.spec.js
lanes/L-TRAIN-READONLY-VISIBLE/train-rows.probe.spec.js
lanes/L-WF-PIVOT-DEFECTS/wf-pivot-probe-roles.spec.js
lanes/L-WF-PIVOT-DEFECTS/wf-pivot-probe.spec.js
```

**Live suite count is unchanged.** 131 − 5 = 126, the 5 are all lane evidence, and **nothing was
added**. No live suite was swallowed.

The override could itself have been the thing being measured, so `collected-via-control-wrapper.txt`
inherits the real config *unchanged* through the same wrapper: byte-identical to `collected.txt`. The
diff above is the pattern, not the plumbing.

## 3. Absence is not exclusion — the worst-case tree

The shared checkout does **not** hold the archived jest copy on disk. A listing there would show that
file's *absence*, which proves nothing about the pattern. So the six hazardous files were assembled on
disk in this lane's own worktree (`/Users/svendaneel/okam/web-collected`, created detached at
`e34977ac` and now on `lane/collected-paths` at `6f03b18`, whose only change from `e34977ac` is this
lane directory — the tree under test is unchanged):
the real `lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js` checked out from
`lane/mrg-page-test-vacuous`, and all five probes copied from the shared checkout.

| listing | paths |
|---|---|
| `worstcase-without-pattern.txt` | **121** |
| `worstcase-with-anchored-pattern.txt` — the fix | **115** |
| `worstcase-with-bare-pattern.txt` — the rejected form | **112** |

Anchored removes exactly **6, all under `lanes/`, adds 0** — including the archived copy, which is
**present on disk and not collected**. That is the exclusion doing the work.

## 4. Over-exclusion, asked of the runner instead of reasoned about

The prior lane argued the anchor by reading the regex and marked its similar-path case
*hypothetical*. This lane made three such cases real — live suites at paths that merely resemble the
excluded one — and listed:

| live suite planted | anchored `<rootDir>/lanes/` | bare `lanes` |
|---|---|---|
| `test/multi-lanes-rollout.test.js` | collected | **swallowed** |
| `test/lanes/rollout.test.js` | collected | **swallowed** |
| `docs/plan/lanes/collect-canary.test.js` | collected | **swallowed** |

All three survive the shipped pattern (112 → 115) and all three die under the bare form. The anchor is
load-bearing and now measured. `docs/plan/lanes/` holds 6 files at this moment, all `.md`, so the bare
form's damage there is latent rather than current — the canary makes the latent case answerable today.

---

## Findings

**A. The fix is not committed anywhere on this branch.** `jest.config.js` is a **dirty working-tree
edit**; `git show HEAD:jest.config.js` has no `lanes` entry, and `cbb5a98` — where the originating
lane committed it — is contained by **no branch**. So the only copy of this fix is riding in the same
268-file dirty tree that every lane is warned not to sweep into a commit, and a single
`git checkout -- jest.config.js` erases it. Everything measured above is true of the working tree and
false of `e34977ac`. **This needs committing to `feature/restaurant-modules` by whoever owns the
merge**; it is outside this lane's write boundary.

> **Since committed — the branch sentence above stays operative.** Re-read 2026-08-05 by
> L-COLLECT-REVIEW-CONDITIONS, from the refs rather than from a report: the fix is committed at
> **`82127eb`** ("The suite stops collecting the lanes' own evidence") and `git branch --contains
> 82127eb` names **`lane/jest-collects-lanes`** and **`candidate/fe-compose-2026-08-05`** (read at
> tip `9f7d8df`, a branch a composition lane was moving at the time). It does **not** name
> `feature/restaurant-modules`, so on this branch the fix is still only a working-tree edit and the
> paragraph above is still the live situation. The shared checkout's working copy was verified
> byte-identical to `82127eb` (`git diff 82127eb -- jest.config.js` is empty), so what was measured
> here is exactly what is committed there.



**B. On this branch the archived copy is byte-identical to the live test it "superseded."** At
`e34977ac`, `test/margin-recipes-page.test.js` and
`lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js` are the same 551 lines with the same
29 cases (`diff -q` reports identical). The improved 681-line / 31-case version exists only on
`lane/mrg-page-test-vacuous`, which has **not** landed here — so the prior lane's "29 vs 31" was
measured on its own branch and does not describe this one. The inflation figure of **29** holds
either way, but here the mechanism is an exact duplicate rather than a superseded variant.

**C. Minor correction to the prior write-up.** These suites declare cases with `test(`, not `it(`; a
count of `it()` blocks returns 0 for both files. The figure 29 is right, the keyword named was not.

**D. Known condition, not caused here.** `core/` is an empty submodule in lane worktrees
(`F-CORE-PIN-ON-NO-REMOTE`). It cannot affect `--listTests`, which resolves no modules, and none of
these listings touched it. `--listTests` does need the `transform` modules to resolve, which is why
`rerun.sh` symlinks the shared `node_modules` into the worktree.
