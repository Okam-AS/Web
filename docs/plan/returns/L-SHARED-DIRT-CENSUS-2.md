```
RETURN: L-SHARED-DIRT-CENSUS
brief: b7685924
verdict: built
evidence: lanes/L-SHARED-DIRT-CENSUS/dirt.md
spec_gap: none
log:
DENOMINATOR 133 paths, as of 2026-08-05T02:43:01Z, baseline e34977ac (still e34977ac). `git status -uall` file-level saw 1,216 entries.
IN SCOPE = all of it EXCEPT lanes/** (735 entries) and docs/plan/** (348), both excluded and stated: together 89% of the dirt, and they
are the programme's own bookkeeping, not source. The brief's "~270" is the -unormal count (293 here), which counts DIRECTORIES, not files.
THREE LANES WROTE WHILE I MEASURED. Re-read 11 min later at 02:54Z: lanes/ +24, docs/plan/ +3 -- but zero in-scope paths and zero in-scope
BLOBS moved. Exact at 02:43Z, still exact at 02:54Z; any path may have changed since, so re-derive before acting rather than trusting this.
CLASSES 99 already-committed-elsewhere / 34 live-lane-work / 0 unattributed; every path names a lane. Keyed on (path, blob), never path:
hash-object vs cat-file over 140 roots -- refs/heads 107, refs/lanes 9, refs/salvage 8, refs/remotes 8, + 8 detached worktree HEADs no ref holds.
CALIBRATION REPRODUCED before the method was trusted: utils/price.js blob 4673f24c is the tip of refs/lanes/L-XZ-NEGATED-ABSENCE AND an
ancestor of L-RECEIPT-DISCOUNT-ROW-DROPPED (tip a6327b76) -- an earlier revision, so already-committed-elsewhere. 3 more paths are like it.
HAZARDS 66 of 133 are dirty in more than one lane's interest; 49 are single-lane bookkeeping. Worst: translations/{no,en,de}.ts 46 lanes and
43 rival variants EACH; test/e2e/fixture/api-server.js 26; world.js 19; utils/workforce/roster-client.js 12; AdminPageHeader.vue 9. Table in dirt.md.
FOUR LANES HAVE WORK AND NO BRANCH: 18 paths exist in no commit on any root -- L-WF-FAILURES-SURFACE 7, L-WF-PUNCH-UI 6, L-GUARD-W0 2,
L-GUARD-DEMO 1. plan.md:17371 calls scripts/drift-demo/demo.sh "finished, committed work"; it is committed nowhere. A clean takes all 18.
Four instruments returned plausible wrong answers and were corrected -- log simplification hid 20 of 28 commits, --name-only omits merges, git diff calls every untracked path different, zsh word-split; all four written up in dirt.md with the numbers each changed.
I CHANGED NOTHING: no commit/stash/restore/clean/add, no container, --no-optional-locks; HEAD, refs/lanes, stash identical, all 133 blobs identical at a third read 03:02Z. refs/heads went 107->108 at 04:59 local: another lane's `guard-repair-lands` 7030c00, which commits 5 in-scope paths, changes NO verdict (its blobs differ from the tree) but adds a claimant to each -- so the hazard column is a floor. Recorded in dirt.md.
END RETURN
```
