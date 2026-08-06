# L-JOURNEY-TRAINING — why the stated exit cannot be walked

Brief 960d3eae. Exit as written:

> `artifacts/journeys/training-evidence-pack.playwright.json` captures a manager opening an
> evidence pack for a completed course and reading the disclosure log entry their own read created

The exit names two product surfaces. **Neither can be reached, and they fail for opposite reasons.**
This file records how that was measured rather than read, because eleven blockers filed today
described defects that no longer existed and the brief asked this lane not to be the twelfth.

Base: `Web-modules` `feature/restaurant-modules` @ `4cfd306`. The checkout is SHARED and carried
another lane's uncommitted Events work (`test/e2e/fixture/api-server.js`, `world.js`, untracked
`events.js` + `events-enquiry-to-settlement.spec.js`) throughout. Nothing here touched it.
Training-scoped jest base, measured before anything: **6 suites / 196 tests / 0 failed**.
No container started, none touched. No migration. Nothing pushed.

---

## Half A — the evidence pack: a served route with no caller

`GET /training/stores/{storeId}/evidence?personRef=` (endpoint #16) **exists on the backend
integration branch.**

- `OkamAPI-modules` `feature/restaurant-modules` @ `3579bbbc`,
  `Controllers/TrainingController.cs:383` — `[HttpGet("evidence")] GetEvidence(int storeId, [FromQuery] Guid personRef)`.
- `d52a8313` "Route the evidence read, so the competency register can be asked" and `c5c15f17`
  "Pin the evidence read's tenant scope and its disclosure over HTTP" are both **ancestors** of
  `feature/restaurant-modules` (`git merge-base --is-ancestor` => YES for both).
- Proven at the wire tier with an authorization matrix, on that branch:
  `WebApi.Tests/Wire/TrainingWireTests.cs:975`
  `An_evidence_read_answers_for_the_venue_the_caller_administers_and_refuses_the_other`
  (adminOfA vs adminOfB, own store vs foreign store) and `:1010`
  `An_evidence_read_records_who_asked_attributed_to_the_token_the_bearer_handler_resolved`.
  Plus `TrainingInspectorEvidencePackTests` (11 facts) and `TrainingEvidenceReadTests` (5).

**The frontend has zero callers for it.** Measured, not assumed:

- `utils/training/training-client.js` binds #1, #2, #3, #4, #6, #8, #9, #10, #11, #12, #15 and #17.
  Its own header enumerates the routes it binds and the four it deliberately omits (#5, #7, #13, #14).
  **#16 is in neither list — it is simply absent**, and there is no `GetEvidence` method.
- Repo-wide grep for `GetEvidence|getEvidence|'/evidence'` outside `lanes/` and `coverage/`: the only
  hits are `evidence/disclosures` (#17). No page, no component, no store action.
- `pages/admin/` has no evidence page; `pages/admin/training-courses.vue` is still the only Training
  screen, and it mounts seven panels, none of which is a pack.
- `translations/no.ts` carries `trn_disclosure_*` keys and **no** pack keys.

So a manager cannot open an evidence pack through the product. This is a **C3 reachability gap**:
service + DI + route landed without the caller.

### `F-TRAIN-NO-EVIDENCE` is stale as written

The flag says *"the inspector evidence pack has a full test suite and no endpoint"* and
*"only the route does not [exist]"*; `plan.md:537` repeats it as **"The inspector evidence pack has
no route"**. That was true when it was filed and is not true now — `d52a8313` landed the route and
`L-TRAIN-EVID-LAND` returned `built` recording the merge. Its `clears_when` ("served by a route,
proven at the wire tier with an authorization matrix") is **met on the backend**.

What is left is the opposite gap, and `L-TRAIN-EVID-LAND` already named it in its own return:
*"OPEN 2: no operator surface links to the route, so C5 acceptance is unavailable — the capability
answers over HTTP but nobody can walk it."* And `L-TRAIN-EVIDENCE-NAMES-COURSE`:
*"the evidence pack has zero frontend callers, so the fuller document still cannot be opened."*
Two prior lanes said it; nothing has closed it. The flag should be restated as a frontend-caller
gap, not retired.

---

## Half B — the disclosure log: a shipped surface with no served route

The inverse. **The frontend is complete and the backend integration branch has no route.**

Frontend, all present on `feature/restaurant-modules`:

- `utils/training/training-client.js:350` `GetDisclosures(storeId, personRef)` -> `GET .../evidence/disclosures`.
- `utils/training/disclosure.js` — three-state read, `distinctReaders`, counts parsed from
  `payloadSnapshotJson`, and the deliberate refusal to resolve an actor id to a name.
- `components/admin/training/TrainingDisclosurePanel.vue` — mounted twice:
  `pages/admin/training-courses.vue:96` (manager, names a subject) and
  `pages/admin/workforce-me.vue:364` (worker, subject resolved from the token).
- Translations present in `no.ts` (`trn_disclosure_*`, incl. `trn_disclosure_recorded`:
  "opening this log is itself a lookup, and is recorded in it").
- Unit coverage: `test/training-disclosure.test.js`, `test/workforce-me-training-disclosure.test.js`.

Backend:

- `06b8b582` "A person can see who has looked at their training record" — the commit
  `L-TRAIN-DISCLOSURE` returned `built` on — is on **`lane/train-disclosure` ONLY**.
  `git branch -a --contains 06b8b582` => `lane/train-disclosure`, nothing else.
  `git merge-base --is-ancestor 06b8b582 feature/restaurant-modules` => **NO**.
- `git grep disclosures feature/restaurant-modules -- '*.cs'` returns test prose and audit-row
  assertions only. **No route, no `GetDisclosures` action** on the integration branch.
- Worktree scan: only `/Users/svendaneel/okam/wt-traindisc` (`lane/train-disclosure`) has
  `evidence/disclosures` in `Controllers/TrainingController.cs`.

So the disclosure panel that ships today would take a 404 against the integration backend.
`L-TRAIN-DISCLOSURE` said so itself: *"NOT ACCEPTED under C5: nobody has walked this in a browser."*

---

## The fixture models neither route — measured, not read

Booted `test/e2e/fixture/api-server.js` on port 4099 and asked it, with the manager bearer token:

| request | answer |
| --- | --- |
| `GET /training/stores/42/context` (control) | `200` |
| `GET /training/stores/42/evidence?personRef=<Ola>` | `404 FIXTURE_UNROUTED` — "GET /training/stores/42/evidence is not in the fixture." |
| `GET /training/stores/42/evidence/disclosures?personRef=<Ola>` | `404 FIXTURE_UNROUTED` — "...evidence/disclosures is not in the fixture." |

`test/e2e/fixture/training.js` implements #1, #2, #3, #4, #6, #8, #9, #10, #11, #12, #15 and stops.

---

## Why this lane did not just add the fixture routes and walk it

Adding fixture #17 would have produced a green browser walk of the disclosure log. It was rejected
deliberately.

The fixture is **a claim about a backend**. `test/e2e/scripts/refusal-shapes.js` exists because that
claim went unchecked twice in one day and six journeys were green against a world that could not
refuse. A fixture route for #17 would claim that `feature/restaurant-modules` serves the disclosure
log. It does not. The journey would be green while the same click on the same page against the real
integration backend 404s — which is the exact defect class the divergence guard was built to end,
moved one file across. "The fixture is allowed to be ahead on three refusal shapes" is a measured
tolerance for *refusal shapes on anchored routes*, not a licence to invent a whole route.

Fixture #16 alone would be honest (the backend serves it). It would not help: there is nothing in the
browser to click, and the exit also requires the disclosure-log read, which needs #17.

**No amount of frontend work in this repo reaches this exit.** The `evidence.read` row that the pack
read appends is only readable through #17, and #17 is a backend merge this lane may not perform
(never push; merges serialise; different repo).

## No live backend was available

`live-world.sh` needs a SQL container. Five foreign containers are up and the brief grants no slot,
so live mode was never an option and no run was labelled `live`.

---

## What would actually close this exit, in order

1. **Land `06b8b582` (`lane/train-disclosure`) into `feature/restaurant-modules`.** Until then the
   shipped disclosure panel is dead against the integration backend, and the log half of the exit
   cannot exist at any layer.
2. **Build the evidence-pack caller in `Web-modules`:** `GetEvidence(storeId, personRef)` on
   `TrainingStoreService`, a panel rendering `TrainingEvidenceResponse` (it is designed to be
   re-checkable — verdict beside score beside threshold, content hash beside the frozen pages/quiz
   it was computed from, `PersonOnFile`, `AuditCoverage`, `ContentHashLinkage`), mounted on
   `training-courses.vue`, keys in `no.ts`/`en.ts`/`de.ts`. That is a product lane, not a journey.
3. **Then** the journey: pack read -> log read shows `evidence.read`; log read again shows the
   `disclosure-log.read` the first log read appended. Non-vacuity is available for free in that
   shape — count the log before the pack read and after, one variable.

Note for whoever writes it: the honest non-vacuity control is that a **refused** read appends
nothing, because the row is appended after the answer is assembled. That is walkable as
"ask as somebody who is neither the subject nor an admin, then re-read the log and find the count
unchanged" — and it is the one assertion in this walk that an absence cannot fake, because the same
walk produces presence.

## Receipts

- Training-scoped jest base and after (unchanged, no code touched): 6 suites / 196 tests / 0 failed.
- `npm run test:e2e:guard-proof`: **all 7 arms held** (arms 1-3 exit 1 on a mislabelled run; arms
  M1/M2 go green again with the re-throw removed). Run to ground the brief's claim about the guard,
  not as evidence of a walk.
- `artifacts/journeys/training-course-to-evidence.playwright.json` read, NOT re-run and NOT edited:
  19 steps, `passed`, `backend: fixture`, two `note` findings. Its step 8 does read
  "THE STATED EXIT CANNOT BE WALKED" — about the *quiz*, a different absent surface from this
  lane's. The sibling sweep's report was accurate.
- Incidental, recorded and not chased: step 9 of that artifact ("DEFECT — the publish button is not
  clickable at a 1280px viewport") resolved to **"not blocked at this viewport"** in the stored run,
  so that conditional finding did not fire. Not this lane's to act on.
