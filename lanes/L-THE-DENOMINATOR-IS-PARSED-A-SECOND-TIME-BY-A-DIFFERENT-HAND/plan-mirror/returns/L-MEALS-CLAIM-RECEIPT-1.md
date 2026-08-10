```
RETURN: L-MEALS-CLAIM-RECEIPT
brief: ff75fe32
verdict: built
evidence: lanes/L-MEALS-CLAIM-RECEIPT/evidence.md
log:
Frontend lane, not backend: the page, the wire it discards and the 3-language copy are all Web-modules. Nothing backend edited.
Base Web-modules feature/restaurant-modules 4b5c5c2, own worktree web-meals-claim-receipt, branch lane/fe-meals-claim-receipt, commit d833d19. Not pushed. No container started. No migration.
Defect real at the tip: join.vue printed `claimed.membershipId` unconditionally. Checked the unmerged Meals branches too - meals-reachable-web has it unbuilt; fe-meals-claim and fe-meals-write are already ancestors.
Backend read at OkamAPI-modules feature/restaurant-modules 569887a5 (the SHA the brief named, still tip): MealsMemberModel.EmployeeReference exists, ClaimAsync copies it, MemberDisplayRef falls back on IsNullOrWhiteSpace.
Rule extracted to utils/meals/statement-reference.js and SHARED with admin-view.js memberRow, so the concierge table and the invitee receipt cannot answer differently about one bill line.
8 pins, all BY VALUE off data-test="statement-ref", never non-emptiness: camelCase present -> ANS-2287; camelCase null -> membershipId; PascalCase present -> ANS-2287; PascalCase key-omitted -> membershipId; whitespace -> membershipId; neither -> dash; plus the company-supplied sentence on/off; plus the 3-language key check.
PascalCase is not speculative: MealsIdempotentMutation stores its replay answer with a bare JsonConvert.SerializeObject; only the DeserializeObject<T> round trip re-camelCases it, and this page's retry path IS the replay path.
Non-vacuity, 4 states all watched (mutation-proof.py/.txt): baseline 46 green; ignore-reference -> 3 red (all present-case, every absent-case pin stayed GREEN); ignore-fallback -> 4 red (all absent-case, every present-case pin stayed green); restored byte-identical -> 46 green.
Both stale comment blocks on the page rewritten ("EmployeeReference does not exist ... a bare GUID permanently" was false), and the guest-claim journey's third copy of the same falsehood. One added copy key in no/en/de, shown only when the company chose the string.
Suites: baseline 2581/2583, with changes 2589/2591. +8 tests, 0 new failures. Meals only 217/217. eslint 0 errors (3 pre-existing indent warnings 4200 lines from my edits).
The 2 reds are PRE-EXISTING and environmental, measured on the stashed baseline too: journey-artifact-store.test.js:457 pins the checkout DIRECTORY NAME (/^Web-modules@/), so it reds in every lane worktree. L-ARTIFACT-PROVENANCE's (94fa256), not mine - flagged as F1.
F2: test/e2e/fixture/meals.js models neither invitationModel().employeeReference nor the claim response's, and no seeded invitation carries one, so the journey can only ever render the fallback. Left alone - I cannot run Playwright, and a pin I did not watch fail is not a pin.
F3: admin-view's non-trimming text() called '   ' a reference while the bill printed the id. Closed by the shared rule.
C4 not engaged - this is a rendering off a response, no money-path write touched. C1/C2/C3/C6/C7 clean. OkamFunctionsDocumentRenderer.cs never opened.
No overlap with L-MEALS-VIOLATION-EXACT (different repo). Translations conflict surface is 3 added lines at a stable anchor. C5 open: Sven has not walked invite -> claim -> receipt.
END RETURN
```
