```
RETURN: L-MARGIN-WASTE-SURFACE-IS-HONEST
brief: 3f25ad67
verdict: built
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-a14e83ac504f04840/lanes/L-MARGIN-WASTE-SURFACE-IS-HONEST/evidence.md
log:
- ENDING: WITHDRAW via a runtime 404 check, not deletion - the blocker's own or-clause. It un-withdraws itself the day the controller ships, so nothing has to be taken back out.
- BUILD WAS NOT OPEN TO ME: L-MRG-WASTE already built MIG-23, proven at layer 2, unmerged. Merging lands 10 schema changes (plan.md:18056), needs D-DOCKER-VM, C2 puts the slot elsewhere.
- THE ESTATE'S OWN PATTERN: WorkforceEngagementPanel:133, MealsProgramPanel:106, MealsCompanyPicker:81, TrainingDisclosurePanel:34. Spec rejects a fourth flag (50-food-margin-spec:186).
- SWEPT, NOT ASSUMED (route-sweep.txt, live :5971, GET only): status/coverage/statements/recipes/ingredients/suppliers/price-imports all 401. /margin/waste 404, same as /margin/definitely-not-a-route.
- BEFORE, IN A BROWSER: the panel printed "Vi fikk ikke hentet svinnet" and offered 6 of 8 recording controls incl. Registrer, into a route with no handler. Coverage claimed "Ingenting er registrert".
- THE BEFORE ARM CAUGHT SOMETHING SHARPER: "NO REQUEST WAS MADE". createStatement read coverage ALONE while drawing both panels, so a failed fetch was reported for a request never sent. It reads both.
- AFTER: the 404 is genuinely recorded, 0 of 8 controls, both panels state the same true absence. Fresh compiler per arm (.nuxt deleted), my own ports 3925/4925, one fixture, one script.
- ASSERTIONS DISCRIMINATE: margin-waste-absent.spec.js is RED at 8ac6f636 (screenshot kept), green here. Its last step refuses to pass unless the browser really asked and really got 404.
- THE COVERAGE HALF WAS TWO LAYERS DEEP: readWasteSummary MANUFACTURED the zeros via `longOrNull(x) || 0`, justified as "the server always sends it". It never does - the response has no waste field.
- A GREEN TEST HELD IT UP, and it is FLIPPED not deleted: it asserted an absent block reads as entryCount 0. That assertion is why the defect survived review. Kept inverted, plus 3 cases around it.
- A BLOCK THAT ARRIVED STATING ZERO STAYS A COUNTED ZERO. Absence outranks unknown only on the sibling 404, never on wasteUnknown, so a server that does send totals still has them rendered.
- INSTRUMENT FINDING: margin-statement-week's console filter is /favicon|Vue Devtools|status of 404/i, so the waste 404 was dropped as noise on every green run of the walk that covers this page.
- LANDING FAILURE, NOT BUILD FAILURE: two sibling lanes returned built and both sit built-unverified. I ported their proven work onto the owner's tip and WALKED it, which neither of them had.
- OWNER'S CHECKOUT CARRIES AN UNCOMMITTED FIX NOBODY OWNS: Web-modules holds L-MRG-COVERAGE-UNKNOWN's edits in the working tree only; HEAD has neither. A checkout or clean discards them silently.
- margin 23 suites / 458 green (was 21/433, 0 removed); eslint clean. 4 full-run reds are pre-existing env ones. 2 commits on my lane branch, NOT PUSHED. His ports/containers untouched.
END RETURN
```
