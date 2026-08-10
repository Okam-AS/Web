```
RETURN: L-THE-REVIEWED-INSTRUMENT-LANDS
brief: 784dd940
verdict: built
evidence: docs/plan/lanes/L-THE-REVIEWED-INSTRUMENT-LANDS/evidence.md
log:
TRUNK feature/restaurant-modules 3ff7f07 -> 780d405; ort merge of 52dd348, ZERO conflicts so git merge-file was never reached; parents 3ff7f07 then 52dd348; NOTHING PUSHED
revert = git branch -f feature/restaurant-modules 3ff7f07; diff 3ff7f07..780d405 is exactly the lane's five files and nothing else; core pin unchanged at 9626a561
PROBE STILL BITES at the new tip, re-run rather than inherited: wrapper transform 5 passed; the one jest.config.js line reverted to vue-jest 5 failed, exit 1; config restored, tree clean
all five named assertions red on the revert -- indented statements, non-column-0 statements, function entries, branch inside a method, real component past export default
TIER at 780d405: 153 suites / 3594 tests / 0 failed. Baseline I measured myself at 3ff7f07: 152 / 3589 / 0, reproducing the clerk exactly
DELTA +1 suite +5 tests and nothing else; no existing suite changed name, count or result; both tiers ran with core at the pinned commit, so no suite failed to RESOLVE
five buble 'Failed to collect coverage from' errors in BOTH runs, file list byte-identical, no failing suite: pre-existing, neither caused nor fixed here
those five: molecules/ReceiptModal.vue, onboarding/OnboardingProductImages.vue, admin/offers.vue, admin/products.vue, admin/wolt-menu.vue
THE INHERITED CAVEAT IS SETTLED, not carried: the SAME commit 780d405 ran 21.634s cold and 10.250s warm, so transform-cache warmth is worth about 11s
that is far more than the 3.7s speed-up the lane reported, so the instrument does not make the suite faster; the lane's numbers were cold-then-warm and no honest cost follows from them
coverage headline moves as intended, same collectCoverageFrom: All files stmts 65.38 -> 33.93, branch 49.73 -> 31.46, funcs 54.71 -> 37.74; collectCoverageFrom left alone as an owner call
BRANCH WAS HELD: feature/restaurant-modules was checked out in the RETRACTED lane L-THE-SEEDS-AND-THE-STATUTORY-TOP-LAND's worktree, which blocks git branch -f
verified that worktree clean, detached it in place at 3ff7f07 -- HEAD stopped being a symbolic ref, not one file changed, not removed -- then advanced the branch
owner checkout /Users/svendaneel/okam/Web-modules never checked out, reset or committed to; no container touched, no port bound, no pkill, no npm ci or install
worktree created and REMOVED by this lane: /Users/svendaneel/okam/web-vueinstr-land; node_modules symlinked to the shared tree, core fetched by the documented ref recipe
END RETURN
```
