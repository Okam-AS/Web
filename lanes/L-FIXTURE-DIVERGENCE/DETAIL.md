# L-FIXTURE-DIVERGENCE - full detail

The fifteen-line return is docs/plan/returns/L-FIXTURE-DIVERGENCE-1.md.
Evidence: lanes/L-FIXTURE-DIVERGENCE/receipts.txt. Commits a62160e, 61a76ef off base 31fc45d.


**Base.** `31fc45da44faa590a6a095f30780b3f627d32049` on `feature/restaurant-modules`, clean of
tracked modifications at lane start. Two commits: `a62160e` (the check) and `61a76ef` (unresolved
refusals reported rather than silently absent). Nothing pushed.

**Verified before building, as the brief asked.** The divergence is still real and the flag's own
instance still holds, but not in the shape "somebody forgot". `growth.test_address_not_own` - the
403 the fixture now mirrors - exists on `wt-gr-confirmed @ 48950702` (`lane/gr-confirmed-email`) and
does **not** exist on `OkamAPI-restaurant-control @ 903b70d1`
(`feature/restaurant-control-stage0`). Same for `growth.dispatch_disabled` and
`meals.invitation-contact-mismatch`. **There is no single backend to be behind**, which is itself
the finding: the fixture is level with three lane branches and ahead of the integration branch.
The check therefore takes `OKAM_API_REPO` - the same variable `live-world.sh` takes - and prints the
sha, branch and dirty state it read. No committed snapshot, because a snapshot goes green the moment
the backend moves and nobody regenerates it, which is this defect moved one file across.

**What is derived and what is written down.** The refusal sets on both sides are read out of code.
The backend's status-per-refusal comes from each module's typed exception class - six of them,
`Growth/Workforce/Meals/Margin/Training/Events` - whose static factories fix the status; adding a
factory extends the check with no edit. Codes resolve through the `*ErrorCodes` constants. Routes
come from `[Route]` + `[HttpX]`. The fixture's refusal primitives are found by SIGNATURE: a function
whose parameters name both `status` and `code`, which picks up `growthError`, `problem`, `ctx.problem`
and `refuse` in meals/training without being told any of them.

The one written-down thing is the route mapping (`// @backend POST /v1/growth/...`). It is a mapping,
not a refusal list - it does not go stale when a refusal is added on either side, which is precisely
the failure mode the flag names. Twelve routes anchored: the whole Growth newsletter family (ten,
including two preambles that carry the store-admin concealment down the file) and the two Meals
invitee routes, which prove the mechanism on a problem+json module rather than only on Growth's own
envelope.

**Scoping was the hard part, and the first cut failed exactly as the brief predicted.** An unscoped
call-graph walk resolved `SHA256.Create(...)` to a controller action named `Create` and attributed
every module's refusals to every route - 48 refusals on `GET .../newsletters`, a check that reds on
everything. Fixed by two rules that are themselves derived: follow a call only when it is unqualified,
on an injected field, or on a type declared in the scanned corpus; and scope the corpus to the module
directories the controller's own `using` declarations name. Result on the same route: one refusal,
correct.

**Fail-closed exemptions.** A fixture may declare a backend refusal it does not model, with the reason
(`// @backend-unmodelled 401 growth.unattributed - ...`). Six were needed, each a real statement about
what the fixture's world cannot represent (no unattributed caller; no deployment configuration to be
absent; no writer for provider-pause; no drift-within-a-version). Forgetting one **reds**, never
greens. A declaration the backend no longer emits is reported as `stale-exemption`, so the exemptions
cannot rot into a second stale list - that is arm 7 of the proof, and it fires for real when the check
is pointed at stage0.

**Non-vacuity, both halves.** `npm run test:e2e:fixture-divergence:prove` builds stand-in trees in a
temp directory and runs seven arms: `level` green; `removed`, `restatused` (the found defect
reproduced) and `invented` each red in their own direction; `stale-exemption` red; and the half that
discriminates - `benign-fixture` (helper renamed, messages rewritten, handlers reordered, a field
added to the 200) and `benign-backend` (message rewritten, method added, **a whole new route with
refusals of its own**) both green. Each arm asserts its mutation actually changed the file, so an arm
whose regex stopped matching fails rather than passing quietly.

Repeated on the real corpus against the real backend and recorded in `receipts.txt`: deleting the
test-send refusal reds with `exit=1` naming `403 growth.test_address_not_own` at
`growth-newsletter.js:332`; restoring greens; the benign edits green.

**It found two things on its first run, which is the point.**

- `PUT .../newsletters/{id}` let a **Dispatched** newsletter be edited into a new version, while
  `EditDraftAsync` refuses anything not Draft or Approved. A journey could have walked a save the API
  would have refused. Closed here, mirroring the backend's own condition.
- Against `feature/restaurant-control-stage0` the fixture is **ahead** on three refusals whose backend
  lanes have not merged. Correct behaviour, and useful: it tells a lane which branch its journey
  evidence is actually evidence about.

**A pre-existing journey failure, measured rather than assumed.**
`growth-newsletter-send-gate.spec.js` fails on this checkout at the FIRST step - the app shell stays
on "Loading..." and `waitForURL(/\/admin\?redirect=/)` times out at 30s, before any newsletter route
is touched. **It fails identically with my two fixture files reverted to HEAD**, so it is not this
lane's. Recorded, not chased. Consequence worth naming: those runs overwrote the untracked
`artifacts/journeys/growth-newsletter-send-gate.playwright.json` with a failed run; the file is
gitignored and no tracked artifact moved, but a reader who finds it on disk is looking at my failure,
not at whatever was there before.

**Where it lives, and where it does not.** `test/e2e/scripts/refusal-shapes.js` is the derivation,
`test/e2e/scripts/fixture-divergence.js` the runner, both beside `guard-proof.js`.
`test/fixture-refusal-divergence.test.js` puts the seven arms and five counted identities into the
ordinary Jest suite, so the comparator reds if it rots even with no checkout on the machine. It is NOT
wired into CI, for the reason already recorded as `F-GUARD-PROOF-NOT-IN-CI` - no workflow in this repo
runs any suite.

**What this does not establish.** Twelve of the fixture's routes are anchored; `api-server.js`
(workforce, events, auth), `margin.js`, `training.js` and the rest of `meals.js` are not, and an
unanchored handler is simply not compared. Extending is anchoring work, not code work - the derivation
already handles all six error families and finds the primitives in those files. And **C5 is not met**:
a person has not walked anything here. This lane is not a journey; it is what makes journey evidence
mean something, and its own evidence is the exit code in `receipts.txt`.

**Ops.** No container started, no migration authored, nothing pushed. Committed by pathspec, six
files named explicitly. `core/` is a real checkout here and was verified intact after the journey
runs. Ports 3971/4971 used to avoid the five foreign servers already listening. No translation file
touched.
