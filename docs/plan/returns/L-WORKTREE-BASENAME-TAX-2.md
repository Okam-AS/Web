```
RETURN: L-WORKTREE-BASENAME-TAX
brief: f97e6ee7
verdict: built
evidence: lanes/L-WORKTREE-BASENAME-TAX/run.md
spec_gap: brief names test/e2e/journey-artifact-store.test.js (file is test/journey-artifact-store.test.js) and calls the fix "on no tip" though 0cea96a is on candidate/fe-compose-2026-08-05 and lane/collect-review-conditions
log:
lane/worktree-basename-pin @ 0cea96a closes the condition. It is a real fix, not a relaxation.
Baseline e34977a in worktree web-wtbasename-tax: 2 failed / 36 passed / 38, exit 1; both reds are
the checkout directory name only. At 0cea96a same worktree: 38/38, exit 0 - total still 38, so no
test was dropped to get green. Also 38/38 in a second worktree named literally Web-modules, so the
fix did not merely move which directory fails.
Pin still bites. Mutations on production code with the fixed test in place: drop the checkout name
from the build id -> 3 red; absolute path instead of basename -> 2 red; buildFromWorldStamp returns
null, ie the artifact truly lacks its world stamp -> 6 red; revert -> 38/38. First two match the
fix commit's own claimed counts.
Diff is 2 files +181/-7, no production code. A derived SELF = basename(resolve(__dirname,'..'))
replaces four spelled literals. At :311 the old regex became a shape check PLUS an explicit
toBe(SELF), so the name is still asserted, only derived - not circular, as the value under test
comes from lsof's cwd for the port holder. :366 was VACUOUS in every lane worktree, now real.
Residual reported not fixed: core-checkout.js:74-76 still ranks a dir named Web-modules first.
Near-miss: a mutation pass silently no-oped and reported 38 passed; reruns assert it landed first.
END RETURN
```
