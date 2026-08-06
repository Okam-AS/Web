# Fable review — Training (L-TRAIN-REVIEW, 2026-08-01)

Read-only review. No file was edited. Web-modules `feature/restaurant-modules` @ `7b99f2a`; backend checkout on
`lane/meals-grace-pins` @ `de1e5c5e`, the identical commit `feature/restaurant-modules` points at. Frontend
Training suites green: 5 suites, 195/195.

## 0. Corrections to the clerk's brief

1. **"Five Training flags advertised but gating nothing" is no longer true.** Commit `66d5bba8`
   (2026-07-30 19:55, *"Withhold the five training.* flags that gate nothing"*) removed all five from the
   operator catalog. They are now **declared-but-withheld**, each with a written reason
   (`Services/Training/TrainingFeatureFlags.cs:90-109`), the store-backed layer refuses to serve a stale
   override row for them, and a census test pins the truth route-by-route
   (`TrainingFlagConsumptionTests.cs:84-104`). They still gate nothing — but no operator can flip them
   anymore, and `/context` reports them OFF, which is true.
2. **The certificate vault exists and is browsable.** Entity, routes #12–14 (`TrainingController.cs:279-359`),
   panel `TrainingCertificatePanel.vue`. A certificate names the worker, the type/issuer and the dates with a
   server-derived Valid/Expiring/Expired badge. It deliberately does **not** name a course — it is the vault
   for *externally-issued* competence; course competence lives on the completions ledger. What a person
   **cannot** do is open one: no detail view, and `documentReference` is parsed (`journey.js:375`) and never
   rendered, so the document behind the row is unreachable from the browser.
3. **The repo's own RUNBOOK is stale in the other direction.** `Scripts/demo/RUNBOOK.md` §9b still says the
   three wave flags "are nonetheless advertised in the shared catalog, so an operator can flip them and
   nothing happens" — written at `6e69b32b` (19:07), falsified 48 minutes later by `66d5bba8` (19:55). This
   produced a live break (L1 below).

## 1. The first stop — two answers, by persona

**For the module's stated exit — "a worker passes the quiz" — the halt is total and by ruling, not by
defect.** There is no worker-facing Training surface anywhere: no `/training/me/*` route exists, no page under
`pages/` is worker-facing for training, the version-authoring form sends `quizJson: null` unconditionally by
documented ruling (`TrainingVersionPanel.vue:197`, rationale at 118-135 — a guessed quiz schema would be
minted into the statutory content hash), and `TrainingCompletionSource.Quiz` has **zero producers**; the only
completion write hardcodes `ManagerRecorded` (`TrainingCompletionService.cs:141`). The achievable exit on this
branch is the *manager* half — author → publish (frozen+hashed) → assign → record score → server-derived
verdict → completion and holdings readable. That half has **no stop.**

**For a manager on a real store, the first stop is the gate, and there is no browser way past it.** All
`training.*` flags default OFF deny-closed; `/context` answers an opaque 404; the page honestly says training
is not switched on. The lever exists — `PUT /stores/{storeId}/feature-flags` — but **no frontend file calls
it.** Enablement is curl-only.

**And nobody has ever watched this module work.** RUNBOOK §10 admits the Training seed is *"Not run — checked
line by line against the code, never against a screen"*. The seed exists because the last browser walk found
the page dark, and it now dies before finishing (L1).

## 2. The inventory (abridged to the breaks and the notable holds)

| Step | Verdict |
|---|---|
| Find the module | **reachable** — sidebar "Opplæring"; 184 `trn_*` keys in all 3 locales, zero missing |
| Enable the module | **broken: API-only** — deny-closed backend lever, zero frontend callers |
| Author course / cut draft version / publish (freeze + hash) | **reachable**. The immutability trigger **is in the migration** (`20260727221455_RestaurantModules_Initial.cs:4238`) plus an EF guard |
| Read back frozen content | **dead capability** — the wire carries the frozen material (`TrainingCourseModels.cs:61-62`); no panel renders it. Authored content is write-only in the browser |
| Edit draft / retire / correct certificate / expiring feed | **deliberately unbound**, reasons recorded in `training-client.js:22-35`; the expiring feed blocked on the open TR-B3 epoch ruling |
| Assign | **reachable** — published-only; attempted person-scoped revoke refused |
| Worker takes quiz | **absent by ruling** |
| Record completion | **reachable — and the quiz CAN be failed**: score below the frozen threshold renders a red "Not passed"; a retake is a new row and the fail stays |
| Completion readable as evidence | **degraded** — the row parses `courseId`/`courseVersionId` and renders neither: **the evidence row does not name the course** |
| Holdings | **reachable** |
| Inspector evidence pack (#16) | **backend complete, browser-absent** — course titles, frozen content, hash linkage, audit chain, recomputable integrity, and the GET itself writes a disclosure audit event. Zero frontend callers: **the one document that fully satisfies "readable as evidence" cannot be opened by anyone** |
| Durability of evidence | **holds** — the completion is decoupled by value: no FK to course, version, person or store; no course DELETE/PATCH route exists; published content frozen by trigger + guard; hash snapshotted onto the row. It survives the worker leaving, and **the FK-before-trigger masking from estate memory does not apply here because there is no FK at all** |

## 3. The flag table

Pinned behaviourally by `TrainingFlagConsumptionTests` and `TrainingFlagCensus` (which drives all 10 mutations
with one flag off at a time).

| Flag | Advertises | Actually gates | Verdict |
|---|---|---|---|
| `training.setup` | courses, certificates, competency tagging | course create/version/publish/retire; certificate create/patch; doubles as module visibility | **advertised + gating** |
| `training.assignments` | assignment + completion recording | assignment create/delete, completion create | **advertised + gating** |
| `training.onboarding` | onboarding tracks/runs | **nothing** — no tables, service or route | **withheld** with reason |
| `training.checklists` | recurring checklists (the internkontroll half) | **nothing** | **withheld** |
| `training.deviations` | deviation log | **nothing** | **withheld** |
| `training.competency-seam` | Training→Workforce competency projection | **nothing** — `/context` reports the seam bound straight off the flag, and no projection exists for Workforce to consult | **withheld** — the module's headline differentiator is unwired in both directions |
| `training.reminders` | outbox reminder dispatch | **nothing** — no dispatcher, no outbox seam | **withheld** |

## 5. What could not be determined

- **Whether the backend Training suites pass on this exact HEAD.** The .NET suite was not run. The flag
  census, append-only, immutability, tenant-isolation and wire pins were verified **by reading**, not
  execution.
- Whether `demo-up.sh` behaves as predicted at L1 — derived from the controller's deny-closed write and
  `demo_flag`'s die path. High confidence, but the script has never been executed by anyone, which is itself
  the finding.
- Whether stale `training.*` override rows exist in any real database. The code refuses to serve or clear
  them; whether any exist is a data question no repo can answer.
- Whether the flag-catalog frontend consumer described at `StoreFeatureFlagsController.cs:75-77` is in flight
  elsewhere or was never built.
