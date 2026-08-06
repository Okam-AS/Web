```
RETURN: L-JOURNEY-TRAINING
brief: 960d3eae
verdict: fail-spec
evidence: lanes/L-JOURNEY-TRAINING/verification.md
spec_gap: The exit names two surfaces and neither is reachable, for opposite reasons - the evidence pack (#16) is SERVED by the backend integration branch and has zero frontend callers, while the disclosure log (#17) is fully built in the frontend and has NO route on feature/restaurant-modules (06b8b582 is on lane/train-disclosure only), so the log entry the pack read appends cannot be read at any layer and no frontend work in this repo reaches the exit.
log:
Verified before building, as instructed; measured rather than read. Base 4cfd306, training jest 6 suites/196 tests/0 failed. No container, no migration, no push, no artifact touched.
HALF A, pack: backend HAS it. TrainingController.cs:383 [HttpGet("evidence")]; d52a8313 and c5c15f17 are ancestors of feature/restaurant-modules; wire tier proves the authorization matrix (TrainingWireTests:975 adminOfA vs adminOfB, own vs foreign) and the disclosure append (:1010). Frontend has NOTHING: training-client.js binds #1-#15 and #17 and its header lists the four it omits deliberately - #16 is in neither list. No page, no panel, no translation key. Repo-wide grep outside lanes/coverage returns only evidence/disclosures.
F-TRAIN-NO-EVIDENCE IS STALE AS WRITTEN. It says "no endpoint" and plan.md:537 says "has no route"; the route landed and its clears_when is met on the backend. The live gap is the inverse - a C3 caller gap - and two prior lanes already said so (L-TRAIN-EVID-LAND "OPEN 2: no operator surface links to the route"; L-TRAIN-EVIDENCE-NAMES-COURSE "zero frontend callers"). Restate it, do not retire it.
HALF B, log: frontend complete (GetDisclosures, disclosure.js, TrainingDisclosurePanel mounted on training-courses.vue:96 and workforce-me.vue:364, no.ts keys, 2 jest suites) - and 06b8b582 is on lane/train-disclosure ONLY. branch --contains says so; is-ancestor of feature/restaurant-modules says NO; git grep finds no route on that branch. The shipped panel 404s against the integration backend. L-TRAIN-DISCLOSURE said it itself: "NOT ACCEPTED under C5: nobody has walked this in a browser."
FIXTURE MODELS NEITHER, measured live: booted api-server.js on :4099, context 200 (control), /evidence and /evidence/disclosures both 404 FIXTURE_UNROUTED.
I DID NOT ADD FIXTURE #17 AND WALK IT. That would have been green. A fixture is a claim about a backend; claiming the integration branch serves a route it does not have makes the browser pass where the real click 404s - the exact defect refusal-shapes.js exists to end. Being ahead on three refusal shapes on anchored routes is not a licence to invent a route. Fixture #16 alone would be honest and useless: nothing in the browser clicks it, and the exit still needs #17.
No live backend: live-world.sh needs SQL, five foreign containers are up, no slot granted. Nothing was labelled live.
Did not mass re-run other journeys. Read training-course-to-evidence.playwright.json without re-running it: 19 steps, passed, backend fixture. Its step 8 "THE STATED EXIT CANNOT BE WALKED" is about the QUIZ, a different absent surface; the sibling sweep was accurate and is not this lane's blocker.
Grounded the brief's guard claim rather than repeating it: npm run test:e2e:guard-proof, all 7 arms held.
TO CLOSE THIS EXIT, in order: (1) land 06b8b582 into feature/restaurant-modules - backend merge, not mine; (2) build the pack caller in Web-modules (GetEvidence + a panel rendering TrainingEvidenceResponse + keys in three locales + a mount) - a product lane, not a journey; (3) then the walk: pack read, log shows evidence.read, log read again shows the disclosure-log.read the first read appended, counted before and after so absence is falsifiable.
Incidental, recorded not chased: that artifact's step 9 publish-button defect resolved to "not blocked at this viewport" in the stored run.
Shared checkout carried another lane's uncommitted Events fixture work throughout; untouched. Wrote only lanes/L-JOURNEY-TRAINING/ and this RETURN.
END RETURN
```
