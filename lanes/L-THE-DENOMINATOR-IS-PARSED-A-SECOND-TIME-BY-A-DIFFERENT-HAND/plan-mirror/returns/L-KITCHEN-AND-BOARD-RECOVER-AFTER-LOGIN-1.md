```
RETURN: L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN
brief: cf46ff6b
verdict: built
evidence: lanes/L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN/notes.md
log:
Base: lane/focustrap-teardown @ 8ac6f63, this checkout's HEAD, NOT the shipped tip. ongoing.vue also held L-ONGOING-SHOWS-EVERY-LIVE-ORDER's uncommitted work.
Sibling 0f88242 does NOT delete this problem: it copies the incomplete starter list forward verbatim and binds ongoing to loadOrders alone. Complementary, not duplicate.
RED first, 6 of 7: a kitchen ticket nine minutes after it was sent renders "schedule0:00"; ongoing draws no order placed after the sign-in. red-proof.txt.
Shape: ONE starter list per page. mounted and closeLoginModal both call startLiveBoard(). Starters clear before they set, so two sign-ins cannot leak an interval.
GREEN: 10/10 in the new file, 5 suites / 69 tests across every suite importing either page, eslint clean on all three changed files.
KILL-PROOF kill-proof.txt: 10 arms, control green, all 9 deletions red, including both handlers restored to the shipped defect verbatim. Each arm names its catching test.
REACHABILITY holds: AdminPage.vue:99 skips its bounce when ?redirect= is set, so both pages do render for a signed-out visitor. Asserted for both. Not dead code.
FLAG that outranks the green: browser/diagnostic-run.txt, clean compile, shows the end-to-end path STILL DEAD with this fix applied.
Two sign-in modals stack on that URL. The visitor uses the shell's, on top. The URL loses its query: AdminPage took $router.replace and never emitted login-success.
After that sign-in /orders/ongoing calls = 0, the board never polled, a modal still covers it. The page's own handler is not reached by the sign-in a person performs.
End-to-end needs three: this starter list, the sibling's modal removal bound to @login-success="startLiveBoard", and AdminPage emitting rather than navigating.
OPEN SEAM for whoever owns AdminPage.vue: compare the redirect target to $route.path, not $route.fullPath. Left alone — sibling's file, five double-lands on record.
Kitchen's fullscreen listener was missing from the sign-in path too and is now in the list. kitchen.vue:152-155 spinner and ongoing.vue:259-267 buckets untouched.
Hygiene: no commit, push, add, stash, container or SQL slot. Ports 3903/4903 are mine. Probes named *.probe.js and *.playwright.js, so no jest config was edited.
Browser arm was moved to a detached worktree and killed mid-run first: it reverts page files and would have clobbered the live sibling. Worktree removed; hunks isolated vs baseline/.
END RETURN
```
