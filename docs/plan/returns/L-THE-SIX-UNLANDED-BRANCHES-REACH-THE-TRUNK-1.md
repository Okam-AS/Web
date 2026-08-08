```
RETURN: L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK
brief: 8ac06581
verdict: built
evidence: backend feature/restaurant-modules 7bf975572 -> d30c1c4d4 (4 merges, tier 5037/5048 green at the tip); frontend feature/restaurant-modules 914e593 -> de5e68c (184 suites/4484 green)
log:
LANDED 5 of 6, REFUSED 1. 8357c8a33 checked against the decisions and correctly not an ancestor; no branch I touched carried a gate. Nothing pushed.
PREMISE CORRECTED: MealsDeliveryReceiptSqlServerTests (3 tests) and DeliveryReceiptComplianceTests (11) ARE on the backend trunk, via lane/meals-utlkvit, which IS an ancestor.
Only MealsXZCreditSaleTests is genuinely absent. It sits on lane/meals-xz-credit 25586d86b, unlanded, lane state verified. Outside my six, so left alone and named here.
L-STATUTE-EVIDENCE-WORLD is a FRONTEND branch; my earlier artifact filed it backend by keyword. And only ONE of the five backend branches is SQL-tier, not three.
Tier ran from WebApi.Tests/ with --filter Database!=SqlServer at every composed tip, WebApi.dll mtime moving each time; 5006/5017 baseline, zero failed throughout. Landed one at a time.
Each git branch -f re-read the trunk in the same command and matched its merge base before moving.
vipps-redact-404 +15, incl. the exit's trailing-dot deposit link; mutating the unrouted branch back to fail-open reds 6/15.
wf-withheld-bound +2; mutating the re-poll guard reds 1/2. Its SECOND Withheld site, the expiry sweep, reds NOTHING under mutation - that arm is unfalsified by its own two tests.
census-floors-derived +6; mutating the derived census to lose one site reds 1/44.
Its conflict was stale prose, but the CLEANLY merged part broke the build: GrowthAudit, added to the trunk after the fork, still passed the KnownFiles and three floors the branch deletes.
That is verbatim the rot the branch's own comment predicts - lanes editing different modules merge without git objecting. Removed the four counts.
wf-idempotency-refusal-rest +8; its four test conflicts were each side adding different tests around one shared method tail, resolved as unions with the tail duplicated. Mutation reds 4.
Its WorkforceD1RaceSqlServerTests passed 2/2 asserted by name from a trx, Testcontainers building and disposing its own container. One SQL lane of the two allowed.
REFUSED wf-demo-presence: seed scripts only, no test can see them, and ADOPT mode reached the trunk AFTER the fork (12 mentions against 0). Merging means authoring what adopt does.
It would also falsify the trunk's own printed line that an adopted world carries no clock punches. Frontend: branch declared bodyAttrs.class a joined string, trunk now requires an array.
END RETURN
```
