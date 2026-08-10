```
RETURN: L-WF-PIVOT-DEFECTS
brief: d69d43f2
verdict: built
evidence: lanes/L-WF-PIVOT-DEFECTS/{workforce-schedule-publish.live.playwright.json,live-run-after.txt,probe-fixed.txt,probe-mutant-defect1.txt,probe-mutant-defect2.txt,probe-restored.txt,shots-after/,shots-mutant/}
spec_gap: the exit reads as if the two defects were unfixed, but both were already fixed in code at 35440cf on 2026-08-03 (a day after the staff lane's live run recorded them) and the only thing outstanding was the live browser proof, which is what this lane produced.
reason: (nothing stopped it)
log:
Both defects are ONE root cause: the authoring notice `<p v-if="isRoles && canAuthorHere">` sat INSIDE the three-pivot chain and re-headed it.
So the employees pivot drew WeekGrid AND MonthGrid (MonthGrid's `v-else` bound to the notice), and the roles pivot of an EDITABLE week drew the notice INSTEAD OF the role grid.
Already fixed at 35440cf, and journey step 8 already asserts the property instead of recording it. I wrote no product code; this lane is the live proof only.
Ran the real `@live` workforce-schedule-publish journey in chromium against a REAL backend: artifact says backend=live, apiBaseUrl http://127.0.0.1:5961, probe 200 Healthy, 53 backend calls, commit e34977ac, 12/12 steps passed.
Step 8 "each pivot renders its own grid and only its own" PASSED; the two pivot findings the 2026-08-02 artifact carried are gone, leaving only the two pre-existing navigation pageerrors that artifact also had.
Built in a fresh detached worktree at committed HEAD e34977a on my own port 3904, so the checkout's ~215 dirty files from concurrent lanes were never compiled into the evidence.
Orphan hazard avoided: a dev server from 2026-08-02 still holds 3961 in this checkout and pairs with :5961 — adopting it would have served pre-fix code and passed for the wrong reason.
Mutation proof, historical bug re-applied and verified structurally identical to 174a550c: defect 1 reds on `.wf-month` toHaveCount(0) receiving 1 on the employees pivot.
Defect 2 needs its own arm because one mutation reintroduces both and the first masks the second; it reds on `.wf-roles` toBeVisible not found, with the notice assertion passing immediately before it.
Fix restored, both arms green again. Screenshots show the roles pivot with notice AND role grid together, and the mutant showing a second grid starting under the week grid.
Probes kept in the lane directory and deliberately NOT added to test/e2e/journeys/: untagged specs run in every live run and would mutate the world.
World side-effect on :5961: the journey published the current week and left workforce.publication on (it always does), and the probes left a draft on Uke 38; `live-world-reset.sh restore` undoes both.
Also observed and NOT acted on: :5951 and :5952 answer /health but their SQL containers are gone, so they are dead worlds that still look alive to a health probe.
No container started, touched or killed; the orphan on 4010 left alone; nothing committed, nothing pushed; my only write in the shared checkout is lanes/L-WF-PIVOT-DEFECTS/.
Verified the `core` borrow is a copy not a move, so the shared checkout's core/ is intact, and I removed my worktree's node_modules symlink before removing the worktree.
END RETURN
```
