```
RETURN: L-SHARED-DIRT-CENSUS
brief: b7685924
verdict: built
evidence: lanes/L-SHARED-DIRT-CENSUS/dirt.md
spec_gap: none
reason: census complete; every in-scope path classified and attributed
log:
DENOMINATOR 133 paths, as of 2026-08-05T02:43:01Z, baseline e34977ac. `-uall` file-level saw
1,216 entries; lanes/** (735) and docs/plan/** (348) EXCLUDED and stated -- 89% of the dirt is
the programme's own paperwork. The brief's "~270" is the -unormal count (293 here), which
counts untracked DIRECTORIES, not files. Re-measured 02:54Z: lanes/ +24, docs/plan/ +3, and
in scope zero paths and zero BLOBS moved. Any path may have changed since.
99 already-committed-elsewhere / 34 live-lane-work / 0 unattributed.
CALIBRATION REPRODUCED: utils/price.js blob 4673f24c is the tip of refs/lanes/L-XZ-NEGATED-
ABSENCE, an ancestor of L-RECEIPT-DISCOUNT-ROW-DROPPED (tip a6327b76) -- earlier revision,
already-committed-elsewhere. 4 paths total are superseded that way.
66 of 133 are dirty in >1 lane's interest; 49 single-lane bookkeeping. Worst: translations/
{no,en,de}.ts 46 lanes / 43 rival variants each, api-server.js 26, world.js 19.
FOUR LANES HAVE WORK AND NO BRANCH -- 18 paths in no commit anywhere: L-WF-FAILURES-SURFACE 7,
L-WF-PUNCH-UI 6, L-GUARD-W0 2, L-GUARD-DEMO 1. plan.md:17371 calls drift-demo/demo.sh
"finished, committed work"; it is committed nowhere. A clean here takes all 18.
FOUR INSTRUMENTS RETURNED PLAUSIBLE WRONG ANSWERS AND WERE CORRECTED: `git log -- path` hid 20
of 28 price.js commits (need --full-history); --name-only omits merges (264 commits -> 335,
965 pairs -> 3,085); `git diff <ref> -- <path>` calls every UNTRACKED path different because
diff reads the index -- it mis-scored 2 of 2 spot-checks and would have mis-scored 57 rows;
zsh does not word-split $var. Decided on (path, blob) via hash-object + cat-file only.
L-WF-TIMESHEET-UI already did this for its own files: lanes/L-WF-TIMESHEET-UI/shared-edits/.
Its 6 recorded diffs match today's tree EXACTLY (73/73 44/44 358/358 126/126 6/6 52/52) but
are FULL diffs incl. siblings -- read as ownership they over-claim 5.8x on api-server.js.
CHANGED NOTHING: no commit/stash/restore/clean/add, no container, HEAD + 107 heads + 9 lanes
+ 1 stash identical, --no-optional-locks throughout, writes only under my lane dir.
END RETURN
```
