```
RETURN: L-TRAINING-WALK-IS-GREEN
brief: 87358a45
verdict: built
evidence: artifacts/journeys/training-course-to-evidence.playwright.json
log:
THE PRODUCT — and it was already fixed. Probe re-run in my clean worktree: publish @1280 state A fix OFF pointer-click FAILS -> fix ON LANDS; 8 of 10 width x state cells flip. probe-rerun.txt
THE WALK was broken too: at e34977ac step 9 FILED a defect and passed anyway and step 10 dispatched. Arm A ran that walk clean at e34977ac -> 19/19 passed with the defect live. Vacuous, not green.
Both repaired by 28548f96 (lane/train-publish-unclickable, built 08-04, NOT merged): overflow-x:auto on 7 tables; step 9 -> trial click + escape invariant; step 10 -> a real .click().
THE RED ON DISK IS NEITHER — it is that lane's own MUTATION ARM. runs/ still shows it: .superseded=passed 20:04, canonical=failed 20:05, same ports 3098/4098, backendBuild e34977ac+dirty.
A deliberately-broken arm finished a minute after the green one and the slot kept it two days. NOT the Growth shape: 58 req / 48 to the subject were served, and the defect was real.
RED BEFORE, GREEN AFTER, both step 9: repaired walk x product at e34977ac -> failed, 9 steps, 58/48, the recorded shape exactly; restored -> passed, 19 steps. Red arm ran first so the slot ends green.
GATE PROVEN in a sandbox (live docs/plan untouched): plan verify rc=6 on the failed capture ("reads status: failed"), rc=0 -> verified on mine. Regenerated, never relabelled.
INSTALLED: passed, 19 steps, commit 28548f96, build id clean (no +dirty), 97 req / 85 subject / 0 foreign, 4 shots resolve, 0 defect findings. No canonical capture in the estate declares failed now.
OWED: 28548f96 is not an ancestor of lane/focustrap-teardown — the defect is live on the line while the primary checkout carries the fix UNCOMMITTED. Ports 3082/4082; nothing pushed or committed.
END RETURN
```
