```
RETURN: L-ONGOING-SHOWS-EVERY-LIVE-ORDER
brief: ac1b45c2
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-ONGOING-SHOWS-EVERY-LIVE-ORDER/evidence.md
log:
Measured against lane/focustrap-teardown @ 8ac6f63 in the shared checkout, ~394 foreign uncommitted paths present. Nothing committed, stashed or pushed.
CONFIRMED: ongoing.vue bucketed 5 of the 9 OrderStatus members. DriverPickedUp and OpenCheck were loaded by GetAllOngoing() and rendered in no column -- unseen, uncounted, un-completable.
RED FIRST at lanes/.../red-before-fix.txt: 5 failed, 1 passed. The failure names the two absent ids. The one green was the terminal-exclusion test, which is correct.
FIX: utils/admin/ongoing-columns.js states the board as ONE total table over the enum. unclassifiedStatuses() returns members placed nowhere and excluded nowhere; the suite asserts it empty.
PLACEMENT: OpenCheck -> New, no action (the register owns it until accepted). Accepted -> New/Neste. Processing -> Processing/Neste. The four out-of-kitchen statuses -> Ready/Fullfor.
DriverPickedUp gets Fullfor, not just a card: visible-but-stuck would be half a fix. core/pinia/order.ts:127 already collapses that rung onto ReadyForDriver, so this matches the estate.
Completed and Canceled are excluded by name with a written reason. An UNRECOGNISED wire status falls back to the New column with no action -- surfaced, never dropped.
MUTATION PROOF (mutation-proof.txt): row deleted -> 5 red; row moved to the excluded list -> 5 red (totality green, DOM presence reds); OpenCheck deleted -> 1 red. Baseline 10/10 after each restore.
BROWSER: artifacts/journeys/ongoing-board-live-statuses.playwright.json, passed, 0 failed requests -- "16 orders sent, 16 cards drawn, same ids"; DriverPickedUp -> Klar, OpenCheck -> Nye.
Browser RED arm on its own fresh compiler (CI=1, ports 3904/4904) fails with exactly the two ids missing. Every arm had its own nuxt dev; no server reused across a mutation.
Seeding the two orders into test/e2e/fixture/world.js BROKE modal-estate-scroll-lock. Reverted to the byte-exact prior content; the journey now injects at the wire via page.route.
modal-estate-scroll-lock is FLAKY, not regressed: runs 3909 and 3922 are identical configs with opposite results, and it passes 3/3 alone with this change in. Lead: it races the board 7s auto-refresh.
jest 135 suites / 3088 tests / 0 failed (TZ=Europe/Oslo); eslint clean on all five touched paths.
ADJACENT, NOT FIXED: 5 .vue files carry ?. in templates, which buble cannot parse, so no jest test may import them -- ReceiptModal is why /admin/ongoing had no unit test. jest.mock works around it.
COLLISION: pages/admin/ongoing.vue is shared with F-KITCHEN-CLOCK-FREEZES-AFTER-LOGIN, which already added startLiveBoard/stopLiveBoard here. Edits are disjoint; that file's diff is BOTH lanes.
END RETURN
```
