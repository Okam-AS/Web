RETURN: L-MODAL-BROKEN-TWO
brief: a1f82e91
verdict: built
evidence: lanes/L-MODAL-BROKEN-TWO/detail.md · artifacts/journeys/admin-single-login-prompt · artifacts/journeys/admin-change-delivery-type · lane/modal-broken-two @ 6348944 (worktree ~/okam/web-modal-two, not pushed)
log: |
  BRIEF HALF-WRONG. Defect 1 does not exist. `deliveryTypeLabel` IS defined — global mixin, plugins/global-mixin.js:97, registered nuxt.config.js:189; five other components call it identically and `git log -S` puts it in the tree before the modal was written.
  NEITHER REPAIRED NOR DELETED — it needed OPENING. The wire is whole and every link was checked: OrderCard button (no v-if) -> emit change-delivery -> ongoing.vue:343 -> modal -> PUT /orders/change-delivery-type; all 15 i18n keys present in no/en/de.
  DROVE IT: "Nåværende leveringstype: Hent selv" (helper resolved, asserted != the raw enum), three options with the current type filtered out, changed to dine-in, order card agrees. Zero browser errors attributable to the modal.
  DEFECT 2 REAL, AND WORSE. Eleven pages, not ten, all wrapping AdminPage. Unfixed build: 2 modals, 2 headings, 2 PHONE INPUTS, 2 buttons, both visible and perfectly superimposed — the one underneath is a live tab stop and a second login form in the a11y tree.
  Brief called it transient. On a URL already carrying ?redirect= — the shape the app's own login flow mints — initAuth does not navigate, nothing unmounts the page and BOTH STAY. Measured same build via HMR swap: peak 2 / settled 2 before, 1 / 1 after.
  FIXED WHERE IT LIVES: in the pages. ~40 sibling admin pages already use `<AdminPage @login-success>` with no modal of their own; these 11 were stragglers. AdminPage gains promptLogin() for the two pages that re-prompt on a stale token mid-session.
  FOUND BY LOOKING: brev.vue's post-login handler called this.loadOrders(), a method that page lacks; wolt-menu.vue bound @login-success to a handleLoginSuccess that was NEVER DEFINED, so the shell's event landed on undefined. Both fixed.
  TRAP HIT AND CORRECTED: my first login journey PASSED against the broken build — it waited for a modal to be visible then counted, by which time the redirect had taken the second. Rewritten: durable ?redirect= case asserted plainly, transient case polled from first paint on the MAXIMUM seen.
  The Jest guard asserts what pages DECLARE, not a mount, and says why: core/ is empty in a lane worktree so component tests use stand-ins for the mixin — a stubbed test proves the modal renders, an unstubbed one proves it throws, and neither is a fact about the app.
  It also checks every @login-success handler a page binds actually exists (how wolt-menu's dangling one surfaced), and caught its own comment as a false positive on first run.
  SUITES: Jest 94 suites / 2306 tests all pass. All 5 browser journeys pass, including the 3 predating this lane. ESLint error set byte-identical to HEAD on every touched file (one no-useless-return I introduced was removed).
  UNTOUCHED: translations/*.ts, pages/meals/join.vue (sole owner, does not use AdminPage), no SQL tier (Docker down), nothing pushed, no containers started.
  GOTCHA FOR THE NEXT LANE: playwright globalTeardown calls releaseBorrowedCore() and strips core/ even from a hand-started dev server. HMR then rebuilds an app with no client bundle and every probe reads zero — which looks exactly like a product defect. Cost one wrong measurement here.
  OPEN, NOT FIXED (cosmetic, outside exit criteria): the modal's confirm button reuses changeDeliveryTypeModal_title, so it reads the same string as the heading.
  Build output deleted at end of run; journey evidence kept on disk. Disk 126Gi free.
END RETURN
