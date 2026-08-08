RETURN: L-THE-LAST-FOUR-PAGES-RESUME-AFTER-SIGN-IN
brief: 3dd70107
verdict: built
evidence: docs/plan/returns/L-THE-LAST-FOUR-PAGES-RESUME-AFTER-SIGN-IN-1.md
log:
Commit 4622bb6 on lane/the-last-four-pages-resume-after-sign-in, parent 00d84d7, --no-verify, NOT pushed. G1 closed on overview, offers, kam and goods.
Each page gained ONE starter bound to login-success - startOverviewPage / startOffersPage / startKamPage / startGoodsPage - run by mounted and by the shell's event.
The PRIVILEGE bounce is inside the starter, which 894a3b9 did not have to face: left in mounted it is asked once, before anyone answers "who are you", and never again.
overview's loadFiltersFromLocalStorage is inside the starter, unlike orders' localStorage read: orders' had already run when a sign-in arrives, overview's had not run at all.
wrapped.vue checked and excluded on the stated grounds: it renders no <AdminPage>, so its own bounce is the only door it has. Not touched.
Proof: test/front-door-pages-resume-after-login.test.js, 28 tests. Sign-in raised as the login-success EVENT on the shell, so it travels each page's template binding.
Every assertion is state or screen; fakes record being asked, so a page that never started shows as a page that asked nothing. Fresh-mount equivalence per page, with a non-blank control.
Both entry conditions asserted against the real AdminPage: a redirect-carrying URL, and a REFUSED navigation. Refusal path asserted as sent-away AND not-served.
Mutation check lanes/L-THE-LAST-FOUR-PAGES-RESUME-AFTER-SIGN-IN/mutate-bindings.probe.js -> mutation-run.txt, each mutation alone and reverted; no surviving mutant.
BASELINE 28; overview unbound 4 failed, short 3; offers unbound 3, short 2; kam unbound 3, short 1; goods unbound 3, short 1; RESTORED 28.
sign-in-door-is-on-the-page-that-keeps-it.test.js widened or it went quiet on these four: measured, the pre-widening extraction calls a goods.vue with its guard deleted clean.
It now reads mounted plus the bodies mounted calls directly, accepts the userIsLoggedIn computed, and carries a vacuity guard naming the five pages it must reach.
offers.vue two dialogs x?.clientName -> (x || {}).clientName: identical rendering, and buble behind vue-jest cannot parse ?. - that was why the page had no test at all.
Suite 165/3903/0 against trunk 164/3874/0: +1 suite, +29 tests. eslint errors unchanged 0/0/9/13, one new space-before-function-paren warning per page.
C5 unmet - no person walked it. Journey: sign out, open /admin/overview?redirect=/admin/overview (also offers, kam, goods), sign in, data lands without reload; unprivileged is sent to /admin.
END RETURN
