```
RETURN: L-ADMINPAGE-EMITS-INSTEAD-OF-NAVIGATING
brief: 59786755
verdict: built
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-a65db45f6ddd4ab5b/lanes/L-ADMINPAGE-EMITS-INSTEAD-OF-NAVIGATING/evidence.md
log:
Base 8ac6f63 in a private worktree, NOT the owner's tree and its ~394 uncommitted paths. Two files borrowed unchanged: his ongoing.vue and utils/admin/ongoing-columns.js, the repaired starter list.
RED FIRST, in a browser. /admin/ongoing?redirect=/admin/ongoing: 2 modals stacked, the URL sheds its query on sign-in, /orders/ongoing calls after it = 0, a sign-in modal still visible over the board.
The DEEP LINK /admin/ongoing was never broken (arm-A0-stock, 2 calls): its target is a DIFFERENT page, so replace mounts it and mounted starts the board. Only a redirect pointing at its own page died.
FIX: compare the target to $route.path, and compare its PATH half — a target legitimately carries a query of its own (/admin/ongoing?storeId=1). 37 lines in one file, mostly comment.
LANDING MINE ALONE CHANGES NOTHING A PERSON SEES: arm-A1 matches stock on every visible measure. ongoing.vue binds no @login-success today, so the emit lands nowhere. Said plainly, not implied away.
Not inert everywhere: 39 pages already bind that event. But initAuth is the only producer of a redirect query and always writes /admin, so its reach today is /admin?redirect=/admin and typed URLs.
COMPOSED (starter list + 0f88242 + mine), shipped bytes, arm-A9-final-green: one modal, it closes, 2 /orders/ongoing at t and t+7s, board on screen. That is the exit criterion, counted.
Same composition with my file reverted, arm-A3: 0 calls and no modal left to explain why — a board exposed and frozen, which reads worse than the defect. My change is load-bearing, not cosmetic.
0f88242 binds @login-success to loadOrders; merged with the starter list it must bind startLiveBoard. That merged ongoing.vue lives in baseline/ as the arms' world and is NOT in my diff.
LOGOUT LANE: no conflict. Its closeLoginModal is byte-identical to base (the merge script fails if not); its watcher fires true-to-false, my branch false-to-true. 27/27 on the merged file.
arm-A10: merged AdminPage plus its AdminPageHeader/Footer plus the composed ongoing — 2 board calls, one modal. All four lanes coexist in a browser, not only on paper.
KILL-PROOF, two mutants, a compiler each: the comparison back to fullPath gives 0 calls; leaving the target's own query unstripped gives 0 where the unmutated arm gives 2. Neither line is decoration.
test/adminpage-redirect-target.test.js, 11 tests: 5 red on the base file, 11 green with mine. The 6 green-on-both are controls, including the replace branch a careless fix would have deleted.
Full jest 2598 passed, 2 failed, 114 suites: the pair three siblings reported, journey-artifact-store asserting /^Web-modules@/ on the checkout DIRECTORY name. ESLint 46 problems before, 46 after.
Ports 3941 dev (mine), 5971 API read-only. Every stop was a pid resolved from my own port; pkill -f never ran. No commit, push or container. Nothing written into the owner's checkout by me.
END RETURN
```
