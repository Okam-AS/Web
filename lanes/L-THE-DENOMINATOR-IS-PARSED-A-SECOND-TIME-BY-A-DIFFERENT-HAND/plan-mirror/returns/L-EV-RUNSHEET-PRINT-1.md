```
RETURN: L-EV-RUNSHEET-PRINT
brief: fccb5eca
verdict: built
evidence: artifacts/journeys/events-runsheet-print.playwright.json (10/10 steps passed) + artifacts/journeys/events-runsheet-print/run-sheet.pdf
log:
BRIEF VERIFIED, not taken on trust: zero window.print and zero @media print in any Events file before this. Dietary IS recorded and reachable; run sheet IS inside EventsJourney.vue on the pipeline page; both handover links print on screen at :107 and :147. All four claims held.
BUILT: print control on the run sheet (offered only against a HELD sheet), a paper-only masthead naming the event, and TWO scoped @media print stylesheets - component decides what of one event reaches the paper, page decides nothing else does. Both DEFAULT-DENY, so a section added later is off the sheet until named. .ev-journey__handover hidden by the default AND by name. Named @page ev-runsheet (A4/14mm), inert until claimed. 4 keys x 3 locales, by hand.
DIVERGED FROM THE BRIEF'S REFERENCE, deliberately: the personalliste's control and stylesheet shapes were copied, its GUARD was not. That guard is a class set imperatively on document.body, and L-MENU-ALLERGEN-MATRIX measured it wiped by vue-meta in a browser - the wfpl print path is inert today. Scoped CSS needs no class applied, cannot leak to another admin screen, and dies on unmount. It also touches no shared file, so it neither strips okam-ch nor collides with the layouts/default.vue string-vs-array merge decision.
PROVED IT TAKES EFFECT, twice, by mutation: component half -> @media speech reds with BOTH guest addresses on the sheet; page half -> @media speech reds with the page title, guest-links panel and action buttons on it. Neither half is decorative. Restored and re-green after each.
INSTRUMENT: browser journey measures the real cascade under emulated print media (not "the rule exists in the file"), then reads the produced PDF back with pdftotext - text AND geometry. It first asserts on SCREEN that the dietary sentence and a guest address are both present, so "no token on the sheet" cannot pass vacuously.
CORRECTED MY OWN CLAIM: I added an unscoped :has()-guarded rule to flatten the shell's 264px sidebar gutter, then measured the produced A4 PDF and found it was never inset by it (leftmost text 63.0pt, inside the 14mm box). The gutter is an artifact of the viewport screenshot only. Removed the rule rather than ship an unscoped rule whose effect I could not observe. Zero unscoped rules ship.
SUITES: 98/98 jest suites, 2257/2257 tests. eslint 0 errors, stylelint clean. Journey 10/10.
FLAG (residue, cosmetic): OnboardingNotification is an ancestor of this page's scope and would print above the sheet for a store still in onboarding. .admin-nav already hides itself (asserted). Fixing it needs a body-class contributor - the mechanism measured inert - so it is a merge decision across the lanes touching layouts/default.vue, not a lane decision.
FLAG (shared files): test/e2e/fixture/world.js and api-server.js were edited concurrently by the feature-flags lane while I worked. My additions are additive and coexist (verified by require + a green journey), but my commit c1b4619 sweeps that lane's in-flight hunks in those two files along with mine.
C5: acceptance is Sven's, not this suite's. To walk it: npm run test:e2e:headed, or open /admin/events-pipeline (99999999/AppSettings__DemoVerificationCode__REDACTED), select the event, press "Skriv ut kjøreplanen".
NOT DONE: no plan accept/decide, no push, no docs/plan edits beyond this RETURN. Local commit c1b4619 only.
END RETURN
```
