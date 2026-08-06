```
RETURN: L-WF-ROLES-UI
brief: 876bcca7
verdict: built
evidence: commit ff21e48 on refs/heads/lane/wf-roles-ui; journey artifacts/journeys/workforce-role-catalogue.playwright.json (passed, 10 steps, 4 shots); full detail in lanes/L-WF-ROLES-UI/NOTES.md
log:
Baseline e34977ac; backend checkout was on lane/meals-grace-pins, so every backend fact was read from feature/restaurant-modules.
Premise CONFIRMED, one correction: the client write was ABSENT, not present-and-unimported (roster-client.js:26-29 recorded it as "a screen of its own"). THREE consumers had the empty axis, not two — schedule editor, rates role scope, and WorkforceEngagementPanel.vue:247, which printed "no roles defined" beside no way to define one.
C3 whole wire in one commit: UpsertRoles client method + pages/admin/workforce-roles.vue + Nuxt route + AdminPageHeader sidebar entry + both nav pins. admin-nav-access 28/28 incl. THE CONVERSE WALK.
The endpoint is sharp two ways, both read out of the service: PUT /roles is a MERGE whose PUT sibling AssignStaffRoles is a full REPLACE (so one item is sent per act, never the catalogue), and its update branch assigns EffectiveToUtc UNCONDITIONALLY, so an edit that omitted it would silently un-retire a retired role. It validates nothing, so blank name and the column widths are refused client-side.
Virginity established three ways: store 44 is a NEW venue seeded as [] (not a cleaned one); the screen asserts the positive-empty element and a role select offering exactly ['Uten funksjon']; and the run's network log is 7 role GETs then exactly one write, PUT /workforce/stores/44/roles.
Driven by clicking throughout: store changed via the header picker (not seeded localStorage), the page reached by CLICKING the sidebar link (not goto), the role typed and submitted, then picked in the editor and saved onto the grid.
Falsified with three mutants, each applied and reverted: unpersisted write, pre-seeded store, removed nav entry — all RED (the last also reds the converse walk).
The unit suite found and fixed a real defect: a new role took sortOrder 1 on a store that already had roles, because the form was seeded before the catalogue read returned.
Suites: new workforce-roles-page 15/15; admin-nav-access 28/28; full jest 2910/2910 tests, 124 suites (the 5 failing suites are OTHER lanes' stray Playwright probes under lanes/); journey 1/1.
1280x720 measured with elementFromPoint at the button's own centre: clear, and no horizontal page overflow.
TWO REDS THAT ARE NOT MINE: workforce-schedule-publish (@live) needs the live 11-rule pack and the fixture answers its 2; workforce-flag-lever reds on 19 vs 18 .ff-row because a sibling added a workforce.export catalog row HEAD does not have — and the backend deliberately WITHHOLDS that flag as having no lawful enforcement point.
Ports 4028/3028 bound fresh; "[fixture] listening on http://127.0.0.1:4028" is in every run log; the orphan on 4010 (PID 73160) was left running and untouched. No container, no push, no shared-ref move.
Commit made with commit-tree + update-ref: HEAD is still e34977ac on feature/restaurant-modules, the shared index is empty, the working tree is as found.
Six of the twelve files were ALREADY sibling-dirty, so the commit is HEAD + my hunks only rather than the tree; the rebuilt world.js reports 18 flag-catalog rows, proving the sibling's export row is excluded. Re-verified against the committed tree: 43/43 jest, plus the fixture's role routes exercised directly (merge, idempotency 400, 36-char GUID, store isolation).
DISCLOSURE: during mutation testing I restored world.js, api-server.js and AdminPageHeader.vue from my own backups; a sibling write to those three in that ~4-minute window may have been reverted IN THE WORKING TREE. Nothing committed is affected. Expect conflicts in those files and the three translations; all my changes there are pure additions at distinct anchors.
END RETURN
```
