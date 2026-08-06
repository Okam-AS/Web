# L-WF-BLIND-BIND-NAME - detail

## 1. The blind case was still reachable (verified before building)

Measured at `feature/restaurant-modules @ 3579bbbc` (backend) and `lane/fe-wf-oplink @ 3e811b2`
(the only branch anywhere carrying the operator surface):

- `Services/Workforce/WorkforceOperatorImportService.cs:191` was the ONLY assignment to
  `WorkforceStaffMember.OperatorId` in the whole repository (`git grep "OperatorId ="` over
  `Services/` + `Controllers/`, excluding tests, returns reads everywhere else).
- `UpdateWorkforceStaffRequest` (`Models/Workforce/WorkforceStaffModels.cs:93`) carries no
  `OperatorId`, so `PATCH /staff/{id}` cannot clear it. No DELETE is bound on any staff resource.
- No read on any surface maps an `ApplicationUserId` to a `WorkforcePerson`. The frontend therefore
  had `personName: row.hasLogin ? null : row.displayName`
  (`utils/workforce/operator-import.js`), and the panel rendered `wfoi_person_unknown` for the
  login-carrying side.

So: irreversible, and invisible. Both halves confirmed present, not stale.

## 2. What was built

### Backend - worktree `~/okam/wt-wfblindbind`, branch `lane/wf-blind-bind-name`, commit `3b593fef`
Base `feature/restaurant-modules @ 3579bbbc` (the stated integration tip; `OkamAPI-modules` is on
`lane/meals-grace-pins` and hosts a live WebApi process, and was not used). NOT pushed.

- `GET  /workforce/stores/{storeId}/staff/pos-operator-candidates` (7a, WorkforceManager, read - no
  stage flag, per the authorization interface's own rule that reads use `RequireCapabilityAsync`).
  One row per operator of the route store: `operatorDisplayName`, `hasLogin`, `resolution`
  (`NewPerson` / `ExistingPerson` / `AlreadyLinked` / `StoreAdminSkipped`), `personName`,
  `linkedStaffMemberId`, `linkedEngagementIsActive`.
  `personName` is populated for every resolution a binding can be made under and is null ONLY for
  `StoreAdminSkipped`, where nothing is bound - so a blank means "nobody", never "unknown".
  It resolves the login through the same predicate the import resolves by, so the name reviewed and
  the person bound cannot diverge. It never discloses WHERE a person is engaged: the opaque
  `HiddenConflict` is unchanged, and a person engaged in an invisible store reports the same shape
  as one engaged nowhere.
- `POST /workforce/stores/{storeId}/staff/pos-operator-link-corrections` (7b, WorkforceManager,
  write - `workforce.setup` stage flag + `Idempotency-Key`). Body `{ operatorId,
  expectedStaffMemberId }`. Withdraws the link from the engagement holding it; the engagement, its
  roles, terms, rates and recorded hours all survive. Refusals: opaque 404 when no ACTIVE link
  exists for that operator here (a cross-store operator answers identically), and 409
  `workforce.operator-link-moved` carrying `holdingStaffMemberId` when the named engagement is not
  the holder. One audit row, `operator.link.correct`, `ActorReference = caller.StaffMemberId`.
- Two committed wire fixtures + two manifest cases.

### Frontend - worktree `~/okam/web-blindbind`, branch `lane/fe-wf-blind-bind-name`, commit `c67df92`
Base `lane/fe-wf-oplink @ 3e811b2` - NOT `feature/restaurant-modules`, because the operator surface
exists on no other branch (L-WF-OPLINK is `built-unverified` and unmerged). NOT pushed.

- `roster-client.js`: `GetPosOperatorCandidates`, `CorrectPosOperatorLink`.
- `operator-import.js`: `buildCandidateIndex` (unknown vs known, never unknown-as-empty),
  `buildLinkCorrectionRequest`, and `buildOperatorChoices(operators, links, candidates)` overlays
  `personName` / `personResolution`. Additive - the third argument is optional and all 49
  pre-existing operator-import tests passed unchanged before any test file was touched.
- Panel: names the person for BOTH sides; a linked row offers a withdrawal, two-step, naming who it
  unbinds; `sideText` distinguishes "attaches to this existing person" from "we got no answer".
- Roster page: reads the candidates alongside the operator list, and `correctOperatorLink` re-reads
  the roster + both maps after a correction.
- Translations edited BY HAND in all three files. New keys `wfoi_side_existing_person`,
  `wfoi_correct`, `wfoi_correct_confirm`, `wfoi_correct_yes`, `wfoi_correct_done`; changed
  `wfoi_side_existing_login`, `wfoi_person_unknown`, `wfoi_review_permanence` (which asserted the
  link "cannot be removed or moved afterwards" - now false in half).

## 3. Two design decisions a reviewer should challenge deliberately

### 3a. The correction is a narrow field write plus an appended audit row, not a superseding engagement row.

The brief's C1 governs APPEND-ONLY tables ("a diff contains an UPDATE or DELETE against a table
carrying an append-only deny-trigger or the GuardAppendOnly guard"). `WorkforceStaffMembers` is not
one: it carries a rowversion, `PATCH /staff/{id}` writes it, and no guard or trigger covers it. The
append in this change is the immutable `WorkforceAuditEvent`, which is where the actor is named.

The alternative - retire the mis-bound engagement and append a superseding one - was rejected on
evidence, not taste:

- It collides with the D1 filtered unique index `UX_WorkforceStaffMembers_ActiveEngagement`, which
  exists ONLY in the migration chain and NOT in `OnModelCreating`. The SQLite fast tier builds from
  the model, so it cannot see that index at all: a retire-then-append whose statement order EF does
  not guarantee would pass every runnable tier and fail on SQL Server. That is precisely the
  model-vs-chain masking shape the estate has already been bitten by twice.
- It orphans the person's children. Roles, employment terms, rate versions, clock sessions and
  personnel-list entries all key on `StaffMemberId`; a new row leaves them on the retired one.
- The person on the far side of a mis-map is usually a real employee. Retiring their engagement to
  undo a till binding removes them from the roster; withdrawing the binding does exactly and only
  what was wrong.

If a reviewer wants the LINK itself to be append-only, the shape is a new table - not a column:
`WorkforceOperatorLinks (LinkId, StoreId, OperatorId, StaffMemberId, EffectiveFromUtc,
SupersedesLinkId NULL, ActorReference, CreatedAtUtc)` with a filtered unique index on
`(StoreId, OperatorId) WHERE SupersededAtUtc IS NULL`, `WorkforcePosOperatorResolver` reading the
non-superseded row, and `WorkforceStaffMember.OperatorId` demoted to a projection. That is a
migration and a resolver change, so it is a lane of its own; this lane did not author one.

### 3b. The reservation is taken BEFORE the domain refusals, unlike endpoint 7.

Written the other way round first, and a test caught it: the correction is the one call that
destroys its own precondition, so a client retrying a timed-out correction with the same key found
no link and got the opaque 404 - told the undo never happened. Reserving first makes the replay
answer the stored receipt. The cost is that a REFUSED correction leaves the key reserved and its
retry needs a fresh `Idempotency-Key`, which is what endpoint 7's race backstop already documents
and what `_mutate` already does (a fresh key per call).

Every refusal is still decided before any tracked entity is loaded or mutated, so no guard throws
after a staged write.

## 4. Evidence

### Backend, container-free tier (`dotnet test --filter "Database!=SqlServer"`)
- Baseline, measured in this worktree at a clean `3579bbbc` BEFORE any edit:
  `Failed: 0, Passed: 4369, Skipped: 12, Total: 4381`.
- With the change: `Failed: 0, Passed: 4392, Skipped: 12, Total: 4404`.
- Delta +23 = 16 (`WorkforceOperatorLinkReviewTests`) + 5 (`WorkforceOperatorLinkWireTests`) + 2
  (the two new `WorkforceContractFixtureTests` theory cases). Zero regressions.
- No container was started. No migration was authored or run.

### Non-vacuity (mutation, with `touch` so MSBuild actually recompiled)
- `candidate.PersonName = personName` -> `= null` in the `ExistingPerson` branch: exactly two tests
  red, both naming tests; everything else stayed green. Restored with `cp` (content write, fresh
  mtime), 16/16 green again.
- That mutation plus deleting `engagement.OperatorId = null`: 5 red.

### The pairs the brief asked for
- Naming, one call, one variable: `Plain One` (no login) resolves `NewPerson` / personName
  `"Plain One"` BESIDE `Visible Conflict Op` (login) resolving `ExistingPerson` / personName
  `"Kari Claimed"`. The second name is asserted NOT equal to the operator's own display name, which
  a fixed or echoed string cannot satisfy. Same pair at the wire tier (`Wire Spare Register` beside
  `Wire Shared Register` -> `Tore Toresen`).
- Correction, accepted beside refused: an accepted withdrawal, and a refusal naming the wrong
  engagement that returns 409 with `holdingStaffMemberId` AND leaves the link and the ledger
  untouched. Plus the opaque 404 for an operator with no live link, proven equal to the cross-store
  answer.
- Actor by value: two DIFFERENT managers correct two DIFFERENT operators in one test; each audit
  row's `ActorReference` is asserted equal to that manager's own `StaffMemberId` and unequal to the
  other's. At the wire tier the actor is asserted equal to `AdminAStaffMemberId` and unequal to the
  login, the subject engagement id and the operator id - each a non-blank value the row could have
  carried instead.
- The undo is real, not cosmetic: after a correction the operator resolves at the till BEFORE and is
  refused `workforce.pos-operator-not-linked` AFTER (both halves asserted), and it can be imported
  again onto a new engagement.

### Response bodies, not status codes
Every wire assertion parses the body. The 403 case asserts `code == workforce.forbidden` from the
problem+json body for an AUTHENTICATED caller, and puts the anonymous 401 (empty body, the
authentication challenge) beside it as the different answer it is - so the refusal cannot be
satisfied by a challenge that never reached the module.

### Frontend
- Jest full suite: `Tests: 2278 passed, 0 failed` across 99 suites; 1 suite fails to RUN
  (`core-price-label.test.js` needs the `core/` git submodule, absent in any fresh worktree). The
  pristine parent `lane/fe-wf-oplink` measures `2268 passed, 0 failed` with the same one suite
  failing to run, so the delta is +10 tests and zero regressions.
- ESLint clean on every changed file. `tsc --noEmit` clean on all three translation files. All five
  new keys verified present exactly once and non-empty in `no.ts`, `en.ts` and `de.ts`.

## 5. Hygiene
- The wire tier dirties `artifacts/journeys/ev-dietary/run-sheet.json` and `run-sheet.md`; restored
  with `git checkout --` after every run, never committed. Both worktrees are clean at their commit.
- Commits are by pathspec. Neither branch is pushed. `docs/plan/**` untouched except this lane's
  directory and its RETURN.
- A `node_modules` symlink was created in `~/okam/web-blindbind` (gitignored) and a temporary one in
  `~/okam/web-wf-oplink` for the baseline measurement, which was removed afterwards.

## 6. Still open after this lane
- Nothing points an operator at a DIFFERENT engagement in one step. The path is withdraw, then
  import, and the copy says so. A single-step re-link needs the link table in 3a.
- Naming a person whose engagement is in a store the caller cannot see discloses that the login
  belongs to a known person. That is the ruling (`name-the-person-and-allow-correction`) and the
  store is still never disclosed, but it is a deliberate widening of what the manager can learn and
  is recorded here rather than buried in a docstring.
- The e2e fixture world has no login-carrying operator, so the browser journey cannot walk the
  existing-person branch. Left unfaked, the way endpoint 7's fixture leaves Conflict unfaked.
- C5: no person has walked this. The UI is on `lane/fe-wf-blind-bind-name` and needs the backend
  branch running behind it for Sven to accept it.
