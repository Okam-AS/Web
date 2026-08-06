# L-WF-LINK-DEADEND - detail

## Base measured

- Backend integration tip `feature/restaurant-modules` = **35696d6b** ("Merge the composition-root
  family into feature/restaurant-modules") - the tip the brief named. `CorrectLinkAsync` does **not
  exist** at that tip: `git grep CorrectLinkAsync` across every local branch matches only
  `lane/wf-blind-bind-name`, which is unmerged (merge-base with the tip = 3579bbbc). So the defect
  cannot be measured at the tip, and this lane is built on the branch that carries the endpoint.
- Backend base: `lane/wf-blind-bind-name` @ **3b593fef**, worktree `~/okam/wt-wflinkdead`, new branch
  `lane/wf-link-deadend` @ **a3a526ae**. NOT pushed.
- Frontend base: `lane/fe-wf-blind-bind-name` @ **c67df92**, worktree `~/okam/web-linkdeadend`, new
  branch `lane/fe-wf-link-deadend` @ **bed932e**. NOT pushed.
- No migration authored. No container started. `feature/restaurant-modules` not moved on either repo.
- The tip moved again during this lane: `feature/restaurant-modules` read **35696d6b** when I measured
  and **4685fb01** when I finished. Nothing here is based on either - the base is the unmerged lane
  branch that carries the endpoint - so the merge is a plain three-way onto whatever the tip then is.

## The defect, verified at the base before building

1. `WorkforceStaffService.UpdateStaffAsync` (endpoint 5) writes `staff.IsActive = request.IsActive.Value`
   and touches nothing else; `UpdateWorkforceStaffRequest` has no operator field, so nothing clears
   `OperatorId`. The stranded row is written by the product.
2. `WorkforcePosOperatorResolver` requires `sm.IsActive` -> the till answers
   `workforce.pos-operator-not-linked`.
3. `ImportAsync`'s `existingOperatorLink` pre-check filters `s.OperatorId != null` with **no** active
   filter -> `AlreadyImported`.
4. `CorrectLinkAsync`'s holder query required `s.IsActive` -> opaque 404, and the tracked re-read
   guard required it a second time.

All four still true at 3b593fef. Not stale.

## The change

`Services/Workforce/WorkforceOperatorImportService.cs`

- Holder query: `&& s.IsActive` removed, replaced by materialise + `.OrderByDescending(x => x.IsActive)
  .FirstOrDefault()` - the same shape and the same in-memory ordering `ListCandidatesAsync` already
  uses for its links dictionary, copied rather than re-derived.
- Tracked re-read guard: `|| !engagement.IsActive` removed. It guards the link MOVING between the two
  reads; an engagement that ended in between still holds the id it has to give back.
- Both refusals are still decided BEFORE anything is tracked or staged - no guard throws after a
  mutation. The `_context.Entry` mutation (`engagement.OperatorId = null`) is still the last thing
  before the audit append and the single commit.
- NOT changed: the import pre-check. Withdraw-then-import stays the exit. Making an ended link stop
  counting as `AlreadyImported` would let a second active row bind the same operator id, which is
  exactly the state `L-WF-OPERATOR-UNIQUE`'s index is being added to forbid.

`components/admin/workforce/WorkforceOperatorImportPanel.vue`, `utils/workforce/operator-import.js`

- New row field `correctableLink = linked || endedLink` - the panel's mirror of the server's
  active-first holder rule, so the expected id it sends is the one the server would name.
- The withdraw control is gated on `correctableLink` instead of `linkState === 'linked'`.
- `correctionQuestion(row)` picks between the live and the ended confirmation sentence.
- `selectable` unchanged (`!linked && !endedLink`): re-import is still refused while any link is held.

Translations, edited by hand in all three files:

- `wfoi_correct_confirm_ended` - NEW, defined and non-empty in `no.ts`, `en.ts`, `de.ts`.
- `wfoi_linked_to_ended` - CORRECTED. It said "en ny kobling er ikke mulig" / "a new link is not
  possible" / "eine neue Verknuepfung ist nicht moeglich", which stopped being true with this change.

## Evidence

Backend, container-free tier (`--filter "Database!=SqlServer"`), full run:
`lanes/L-WF-LINK-DEADEND/backend-containerfree.txt` -> **4397 passed / 0 failed / 12 skipped**.
The parent's own return records 4392/0/12 at 3b593fef; delta +5 = the 3 service-tier and 2 wire-tier
tests added here. Zero regressions.

Frontend, full jest:
- mine: `lanes/L-WF-LINK-DEADEND/frontend-jest.txt` -> **99 suites / 2296 tests, 0 failed**
- baseline at c67df92, measured in a throwaway worktree:
  `lanes/L-WF-LINK-DEADEND/frontend-jest-baseline.txt` -> **99 suites / 2292 tests, 0 failed**
- delta +4 = the 4 new frontend tests. Zero regressions. (The parent's return says 2278; the parent
  tip actually measures 2292, so that figure was stale, not a regression.)

## Non-vacuity - three backend mutations and two frontend ones, each applied, watched red, restored

Every cycle was a full `dotnet build` / `npx jest`; no `--no-build`, and the restored file was
`touch`ed so MSBuild could not serve a stale assembly.

| mutation | red |
| --- | --- |
| holder query: put `&& s.IsActive` back | all 3 service-tier tests + the wire dead-end test (4/26 red) |
| holder query: drop `.OrderByDescending(x => x.IsActive)` | `An_active_holder_wins_over_an_ended_one_carrying_the_same_register_id` only |
| re-read guard: put `\|\| !engagement.IsActive` back | all 3 service-tier tests |
| `correctableLink: linked` (ended not withdrawable) | the panel stranded test + the util withdrawable test |
| `correctableLink: endedLink \|\| linked` (wrong order) | the panel LIVE-one test + the util ACTIVE-holder test |

Restored, rebuilt, re-run: backend 26/26 targeted and 4397/0/12 full; frontend 56/56 targeted and
2296/2296 full.

## The two traps the brief named

- **Refusal read from the body, not the status.** `WorkforceStaffResults.Problem` asserts the `code`
  extension out of the `ProblemDetails`. At the wire tier the new
  `A_correction_for_an_operator_no_engagement_holds_is_the_modules_opaque_404_not_a_challenge` asserts
  `404` + `application/problem+json` + `workforce.not-found` from the body for an authenticated
  module caller, and places the anonymous call to the same route beside it (401 with an EMPTY body).
  The two cannot be confused. `AlreadyImported` is likewise read out of the item's `outcome` - that
  answer is a 200 like any other, so the status proves nothing there either.
- **No harness precondition hiding the path.** The stranded row is produced by `PATCH /staff/{id}` at
  both tiers - the service tier through the real controller, the wire tier over HTTP with a quoted
  `If-Match` (HttpClient rejects a bare token as an ETag; `TryAddWithoutValidation` is required, and
  getting that wrong throws client-side before the route is reached - it did, once).

## The one row that IS seeded, and why

`An_active_holder_wins_over_an_ended_one_carrying_the_same_register_id` writes the SECOND engagement
directly. The state is reachable in production today - nothing enforces one engagement per
`(StoreId, OperatorId)`, so two concurrent imports can both pass the per-item pre-check and both bind
the id (each creates its own Invited person, so the one-active-engagement filtered index does not fire
either), after which endpoint 5 ends one of them. It is written rather than raced because the pre-check
refuses a SEQUENTIAL second import, and what is under test is the tie-break, not the race. The ENDED
row is created first on purpose: SQLite returns unordered rows in rowid order, so it is what a holder
query without the tie-break picks - which is why the mutation reds.

**Merge note for `L-WF-OPERATOR-UNIQUE`:** once a unique index on `(StoreId, OperatorId)` lands, that
state becomes impossible and the seed will throw on a model-built SQLite database. That test should be
retired with the index, not worked around. Said so in its own doc comment.

## Observations outside this lane, not fixed here

- Re-importing an operator with NO login after a withdrawal creates a SECOND `WorkforcePerson` named
  after the operator (the import creates an Invited person whenever the login resolves to none). The
  ended engagement keeps the first. Pre-existing import behaviour, unchanged here; worth a look if a
  venue cycles register ids.
- `GET /staff` carries no `operatorId`, so the panel's link map is still N detail reads. A summary
  field would remove them.

## Not done

- C5: nobody has walked this in a browser. The control is reachable (roster page -> import panel ->
  ended-link row) and the page already re-probes links and candidates after a correction, but the
  acceptance is Sven's, not a suite's.
