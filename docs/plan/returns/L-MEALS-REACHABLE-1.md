```
RETURN: L-MEALS-REACHABLE
brief: 95cbc239
verdict: built
evidence: lane/meals-reachable-api@02f27b95 (backend 28/28 container-free); lane/meals-reachable-web@f65595d (frontend 55/55 flag suites)
log:
HALF 2 CONFIRMED, and understated. The default policy exposed "ETag" alone, so X-Meals-Content-Hash (MealsStatementController.cs:131) rode the wire invisible to script. It is the estate's ONLY content-hash header, so "one string" is exact for the hash.
UNDERSTATEMENT: Content-Disposition is unexposed too. 9 actions return File(...), and 2 LIVE browser callers parse it (utils/margin/api-client.js, utils/workforce-rates/rates-client.js) via a fileNameFrom that returns null when unexposed, so margin-statements and workforce-rates took their fallback filename 100% of the time. Both now exposed. Retry-After left off deliberately: 5 writers, 0 readers.
HALF 1 PREMISE OVERSTATED. The board never reported meals.statements effective: GetForStore iterates _catalog.All and MealsFeatureFlags.Describe() returns meals.module only, so no row for it can exist and no "Effective:" value was ever printed.
THE REAL DEFECT, same spirit: ff_withheld_note told operators that ALL withheld stages "would have no effect whatever they were set to". True of Training/Workforce, whose owners state they have no enforcement point. FALSE of Meals, whose Withheld says its three ARE enforced "at fifteen production call sites". The page called an enforced billing flag inert.
FIXED: the note now names both kinds, and a new ff_withheld_deployment_note names the meals money-path flags as deployment configuration, off unless the server configuration sets them, not settable here. No catalog entry, no control drawn, nothing a venue admin can flip.
C3 GAP, stated on screen and here: no endpoint exposes Features:Meals, so the page CANNOT distinguish "off at deployment" from "off for this store". It states the deployment SHAPE and says the value is unknowable from here rather than faking it. Closing it needs a shared platform field.
NON-VACUITY h2: presence and absence read off the SAME response, across 3 worlds. Hash removed -> red at Assert.Contains. Retry-After added -> red at Assert.DoesNotContain with the measured value "ETag,Content-Disposition,X-Meals-Content-Hash,Retry-After", so presence PASSED in the very world where absence failed: the path ran, not a blanked precondition.
NON-VACUITY h1: "no meals.statements control" is measured against a board that demonstrably draws controls; unrendering the disclosure reds 2 DOM tests; restoring the old copy reds the locale test.
EXTENDED 2a052800's AddOkamCors, did not fork it. Base lane/growth-prefcentre (feature/restaurant-modules is its ancestor). A second CORS registration is how F-PROD-CORS-WILDCARD reopens.
DOUBLE-LAND HAZARD: the earlier blocked run's 1b03e8e2 on lane/meals-reachable makes the same half-2 fix INLINE in Program.cs, predating AddOkamCors, so it conflicts with 2a052800. Land this one, drop that. It also carries MealsStatementLeverReachWireTests, written to go red once the fork was ruled; the fork is now ruled, so that test is stale.
Locales hand-edited, 3-line diff each, no regex or bulk edit; the suite's 3-locale KEYS check covers the new key.
TIERS: backend 28/28 container-free (pins + growth CORS suites). Frontend 55/55 on the two flag suites, full run 2437/2438.
PRE-EXISTING, not chased: journey-artifact-store.test.js hardcodes the checkout dir name; 3 core-* suites fail to LOAD because the core submodule is unpopulated in any worktree, and 2 of the 3 pass when core is lent in.
ev-dietary artifacts NOT dirtied: never ran that tier. No container started or touched. Both worktrees clean, local commits by pathspec, no push, no migration.
C6/C7 untouched: no statutory naming added or widened on these screens, no secret or credential at any sink.
END RETURN
```
