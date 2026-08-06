# L-JOURNEY-TRAINING — gate measurement, 2026-08-05

Brief 367f0e9a. Ruling `land-then-build-then-walk` (D-SPEC-L-JOURNEY-TRAINING, @sven 2026-08-05):
"merge the disclosure backend, build the pack caller as a product lane, then walk it."

**Verdict: blocked. Neither merge has landed. No capture was produced.**

Everything below is measured with `git show <ref>:<path>` / `merge-base --is-ancestor` at the named
refs, never from the working directory — this checkout is on `lane/focustrap-teardown` (8ac6f63) and
carries **341 dirty files** of another lane's in-flight work, including modified `components/admin/training/*`.
The working tree is not the shipped tree here, and reading it would have produced a false measurement.

Refs measured: frontend `e34977a` (= `feature/restaurant-modules`), backend `8e2b57de`
(= `feature/restaurant-modules`, checkout parked on `lane/meals-grace-pins`).

---

## Step 1 — backend merge: NOT LANDED

`[HttpGet("evidence/disclosures")]` exists at **`lane/train-disclosure` @ 06b8b582**, `Controllers/TrainingController.cs:425`.

- `git merge-base --is-ancestor 06b8b582 8e2b57de` → **NO**.
- `git branch --contains 06b8b582` → **`lane/train-disclosure` only**. An ancestor of nothing shipped.
- Scanned **every** backend branch for `HttpGet("evidence/disclosures")`: that one branch, and no other.
- Backend tip 8e2b57de serves only `[HttpGet("evidence")]` (#16, line 383). No `disclos` token anywhere
  in the controller at the tip except one XML-doc sentence.

Consequence, exactly as the ruling states: the shipped disclosure panel **404s today**. It is complete
and mounted at `pages/admin/training-courses.vue` and `pages/admin/workforce-me.vue:364`, calling
`utils/training/training-client.js:352` → `GET /training/stores/{id}/evidence/disclosures`.

## Step 2 — frontend pack caller: AUTHORED, NOT LANDED

**This corrects the decision's stated `con` ("the middle one is a product lane nobody has authored").
It has been authored.** It lives on **`candidate/fe-compose-2026-08-05` @ f40fdf3**:

- `utils/training/training-client.js:369` — `GetEvidence(storeId, personRef)` → `GET .../evidence?personRef=`
- `pages/admin/training-evidence.vue` (calls it at :265)
- `components/admin/training/TrainingEvidenceDocument.vue`
- nav entry `components/organisms/AdminPageHeader.vue:391` → `/admin/training-evidence` — so it is C3-complete
  (route + page + navigation in one change), not a service nobody can reach.

Ancestry: `merge-base --is-ancestor f40fdf3 e34977a` → **NO**; `branch --contains f40fdf3` → itself only.
`e34977a` **is** an ancestor of `f40fdf3`, so the candidate is strictly ahead of shipped, not diverged.
At `e34977a` the client binds #1–#15 and #17 and its own header enumerates the four it omits deliberately;
**#16 is in neither list** — the route list stops one short, precisely as briefed. Zero frontend callers.

That landing is itself contested: `L-COMPOSE-FE-CANDIDATE-4` reports "No push (no upstream)" and that the
ruling premise behind the candidate was **refuted** (0 of 28 unlanded heads became clean at the new tip;
the 12 order-induced heads conflict on 0 files against the pristine tip and on 1–3 at the candidate).

## Why one merge is not enough

- Compose merge alone → the pack read works (backend tip already serves #16), but the exit requires reading
  **the disclosure-log entry that read created** — that is #17, which needs the backend merge.
- Backend merge alone → the log route exists, but the shipped branch still has no pack surface to read from.

Both, or the exit criterion is unreachable. Nothing was faked to close either half: no fixture entry for
`evidence/disclosures` was added, no route invented, no half-journey captured. The earlier refusal stands.

---

## Two cautions for whoever walks this after the merges

1. **A passed artifact is stamped to a tree that cannot contain its spec.**
   `artifacts/journeys/training-evidence-document.playwright.json` records `status: passed`,
   `backend: fixture`, `commit: e34977acebd59b223584158c33451b6f1ffd82c1` — but
   `test/e2e/journeys/training-evidence-document.spec.js` **does not exist at e34977a** (`git cat-file -e` fails);
   it exists only at `f40fdf3`. So a green pack-page walk carries the shipped commit whose tree has no such
   page. It must not be read as evidence the pack is reachable on the shipped branch. This is the
   borrowed-tree hazard, and the artifact's `commit` field records the base, not the tree walked.

2. **The sibling journey now records FAILED, and it is on my path.**
   `artifacts/journeys/training-course-to-evidence.playwright.json` is now **9 steps, failed**, failing at
   step 9 "the publish control is reachable BY POINTER at this viewport". My previous return read this same
   artifact as **19 steps, passed**, and recorded that the publish-button defect had resolved to "not blocked
   at this viewport" in the stored run. It has been re-run since and now fails. Publishing a version is a
   prerequisite of the course→evidence walk (a completion is recorded against a frozen version), so this
   blocks the walk independently of the two merges. Recorded, not chased — not this lane's exit.

## What this pass did and did not do

Pure measurement at refs. **No test suite run, no container started or touched, no port bound (4010 left
alone), no push, no commit, no plan mutation, no artifact written or re-run.** Read
`training-course-to-evidence` and `training-evidence-document` artifacts without re-running them.
Wrote only `lanes/L-JOURNEY-TRAINING/gate-measurement.md` and `docs/plan/returns/L-JOURNEY-TRAINING-2.md`,
both left uncommitted: the checkout sits on another lane's branch and committing there is forbidden.

## Unblock order

1. `+L-TRAIN-DISCLOSURE-LAND` — merge `06b8b582` into backend `feature/restaurant-modules`. No plan lane
   owns this step today; the ruling names it and nobody holds it.
2. `+L-COMPOSE-FE-CANDIDATE` — land `f40fdf3` (or the pack-caller heads out of it) into frontend
   `feature/restaurant-modules`. Blocked in turn on `D-REBASE-CONFLICTING-HEADS`.
3. Then the walk: read the pack, read the log, see `evidence.read`; read the log again and see the
   `disclosure-log.read` the first read appended — counted before and after so absence is falsifiable.
