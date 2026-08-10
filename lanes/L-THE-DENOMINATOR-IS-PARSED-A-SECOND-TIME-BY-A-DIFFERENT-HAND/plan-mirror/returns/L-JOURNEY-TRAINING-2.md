```
RETURN: L-JOURNEY-TRAINING
brief: 367f0e9a
verdict: blocked
evidence: lanes/L-JOURNEY-TRAINING/gate-measurement.md
needs: +L-TRAIN-DISCLOSURE-LAND,+L-COMPOSE-FE-CANDIDATE
log:
Neither gating merge has landed; no capture produced. Measured at refs only - this checkout is lane/focustrap-teardown, 341 dirty foreign files incl. training components, so the tree is not the truth.
STEP 1 NOT LANDED, unowned: HttpGet("evidence/disclosures") is at lane/train-disclosure 06b8b582 (TrainingController.cs:425) ONLY - is-ancestor of 8e2b57de NO, contains itself, all branches read.
So the shipped panel 404s as ruled: mounted at training-courses.vue + workforce-me.vue:364 calling client:352 .../evidence/disclosures; the backend tip serves only HttpGet("evidence") #16 at :383.
STEP 2 AUTHORED NOT LANDED - corrects the decision's con "nobody has authored it". On candidate/fe-compose f40fdf3: GetEvidence client:369, training-evidence.vue:265, EvidenceDocument, nav :391.
So it is C3-complete; is-ancestor of e34977a NO, contains itself, e34977a IS its ancestor (ahead, not diverged). At e34977a #16 is in neither the bound list nor the four the client omits on purpose.
ONE MERGE IS NOT ENOUGH: compose alone gives the pack read (#16) but not the log entry it appends (#17); backend alone gives the log, no pack surface. I faked no route, no fixture, no half-walk.
CAUTION borrowed tree: training-evidence-document.playwright.json says passed/fixture/commit=e34977ac but its spec does NOT exist at e34977a (cat-file fails), only at f40fdf3. Not proof of reach.
CAUTION on my path: training-course-to-evidence.playwright.json is NOW 9 steps FAILED at the publish-pointer step; my -1 read it as 19 passed. No suite, container, port, push, commit or plan mutation.
END RETURN
```
