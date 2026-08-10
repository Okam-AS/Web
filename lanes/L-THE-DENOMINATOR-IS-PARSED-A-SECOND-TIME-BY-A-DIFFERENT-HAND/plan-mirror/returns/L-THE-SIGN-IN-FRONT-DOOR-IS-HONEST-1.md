```
RETURN: L-THE-SIGN-IN-FRONT-DOOR-IS-HONEST
brief: 0d7a64b6
verdict: built
evidence: docs/plan/lanes/L-THE-SIGN-IN-FRONT-DOOR-IS-HONEST/walk-EXIT-WALK.json
log:
WALKED, not asserted: both defects reproduced in Chromium against the live API on :5971 before any edit, and both traced back to ONE cause.
ONE CAUSE: AdminPage raised the sign-in modal on a route it was about to leave, then navigated away and destroyed the modal it had just raised.
DEFECT TWO was never a send that did not happen. Click at 404ms really sent; six OTP boxes at 453ms; redirect committed 478ms; modal destroyed 485ms.
So LoginModal could not have reported it - from inside the modal the send worked. Only the shell knows the page is leaving. Took the unclickable shape.
FIX A: the shell raises no door on a route it is leaving; the destination raises its own; a REFUSED navigation puts it back so no page is left with no way in.
DEFECT ONE is not the sign-in path: the redirect survives sign-in intact. Four PAGES destroyed it before sign-in ever happened.
AdminPage is a page's CHILD so its mounted runs first; the page's mounted then answered "not a Key Account Manager" to a visitor it had never met.
FIX B: overview, offers, kam, goods now let the shell answer authentication first - the same line eleven sibling pages already open with.
BRIEF CORRECTED: it attributes defect one to the sign-in path throwing the redirect away. Measured, it does not. The four pages are named instead.
REGRESSION I SHIPPED AND CAUGHT: wrapped.vue looks like a fifth but renders no AdminPage; delegating left an anonymous visitor on a blank page, no way in.
That regression passed jest and was found only in a browser. Its evidence was re-created deliberately as walk-wrapped-delegation-regression.json.
PAIRED PROOF, 4 runs each, same live API, deep link /admin/overview, pressing the send control the first frame it exists: stock 0/4, fixed 4/4 landed.
Stock lost the OTP boxes mid-typing in 3 of 4 runs; one run waited 40s then sent a SECOND code. Fixed sent one code and never waited.
The sibling lane's in-page sign-in URL is byte-identical on both arms. 141/141 across ten suites; the new suite reds 4 of 8 against stock.
My own server on 3975 from my worktree; owner's 3971/5971 never restarted, never bound by me, mine stopped after. Commit 0719ec8, NOT pushed.
END RETURN
```
