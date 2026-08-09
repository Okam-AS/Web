# L-GROWTH-NEWSLETTER-WIRE — detail

worktree `/Users/svendaneel/okam/wt-gr-nlwire`, branch `lane/growth-newsletter-wire`
off `feature/restaurant-modules` @ `de1e5c5e`.

Suite added: `WebApi.Tests/Wire/GrowthNewsletterAuthoringWireTests.cs` (6 facts). No production code changed.

---

## 1. The gap, corrected and then measured

The brief says the four authoring writes have no routed coverage and that "delete an `[Authorize]` and the
suite stays green". Half of that is wrong and the wrong half matters:

* The **class-level `[Authorize]` was already covered** — `GrowthPlatformSurfacesWireTests` drives
  `GET /v1/growth/stores/{id}/newsletters` anonymously, and the attribute is class-level, so deleting it
  reds that suite.
* Deleting the **`AuthorizeStoreAsync` guard** from Create/Detail/Edit/Approve reds exactly one
  pre-existing test — `WebApi.Tests.Modules.ModuleGateOrderingTests`. That test is a **source-text scan**:
  it reads `Controllers/GrowthNewslettersController.cs` and requires one of
  `AuthorizeStoreAsync(` / `ResolveStoreAdminAsync(` / `IsEnabledAsync(` to appear before the action's
  first refusal. It reasons about the file, never about what a request receives.

So the brief's claim needed a mutation a text scan cannot see. Replacing

```csharp
if (!await AuthorizeStoreAsync(storeId)) { return GrowthError(GrowthApiException.NotFound()); }
```

with

```csharp
await AuthorizeStoreAsync(storeId);
```

in all four actions — the gate still called, still first, its answer discarded — is a realistic refactor
slip. Result, with the new suite excluded:

```
dotnet test --filter "Database!=SqlServer&FullyQualifiedName!~GrowthNewsletterAuthoringWireTests"
Passed!  - Failed: 0, Passed: 4357, Skipped: 12, Total: 4369
```

**Entirely green.** In that state a genuine, non-PowerUser admin of one venue can read, edit and APPROVE
another venue's newsletter by naming that venue's id in the URL. The same mutation reds four of the six new
facts (`Expected: NotFound / Actual: OK`, four times).

Why nothing caught it: every cross-tenant fact in `GrowthTenantIsolationTests` passes the intruder's OWN
store as the route store, where `GrowthNewsletterService.LoadOwnedNewsletterAsync` conceals on its own. The
controller's guard is only load-bearing when the route store is one the caller does not hold, and no test
made that request.

## 2. Red-then-green, every pin

Driver: `dotnet test --filter "FullyQualifiedName~GrowthNewsletterAuthoringWireTests"`, each mutation
applied, built, run, then restored with `cp` + `touch` (CLAUDE.md's stale-`--no-build` trap).

| # | mutation | reds | observed |
|---|---|---|---|
| M1 | guard deleted from `Create` | `Creating_a_newsletter…` | `Expected: NotFound / Actual: OK` |
| M2 | guard deleted from `Detail` | `The_detail_read_conceals…` | `Expected: NotFound / Actual: OK` |
| M3 | guard deleted from `Edit` | `Editing_answers_on_PUT_alone…` | `Expected: NotFound / Actual: OK` |
| M4 | guard deleted from `Approve` | `Approval_is_refused…` | `Expected: NotFound / Actual: OK` |
| M5 | `newsletters` → `newsletter-drafts` on the create template | all 6 | `Expected: OK / Actual: MethodNotAllowed` |
| M6 | `EditDraftAsync` stops invalidating live approvals | `An_edit_after_approval…` | `Assert.NotNull() Failure` |
| M7 | class-level `[Authorize]` deleted | the 4 anonymous probes | `Expected: Unauthorized / Actual: NotFound` |
| M8 | `Edit` answers `[HttpPost]` instead of `[HttpPut]` | 2 | `Expected: MethodNotAllowed / Actual: OK` and the converse |
| A2 | the gate called, answer discarded (all four) | 4 | `Expected: NotFound / Actual: OK` |

M7 is the one worth reading twice: without the attribute the anonymous caller is not refused by the
authorization filter but by the action's own concealment 404 — two different security properties answering
with two different status codes, which is precisely what a service-tier test cannot tell apart.

## 3. What the facts pin

Every refusal below is a request that would otherwise **succeed**: the intruder binds the target store's own
segment snapshot and the target version's own content hash, so the drift and snapshot-ownership loads cannot
be what refuses him. Every refusal is paired with the same template answering a different principal in the
same run.

1. `Creating_a_newsletter_answers_on_its_own_route_and_a_foreign_store_is_refused_as_an_absent_one` —
   401 anonymous; foreign store ≡ absent store (status **and** `growth.not_found` code); no row written;
   then the owner is served and the row carries `CreatedByUserId = wire-admin-a` and the bound snapshot id,
   which proves the model binder carried the field and the actor resolved from the real bearer token.
2. `The_detail_read_conceals_another_stores_newsletter_exactly_as_an_absent_id` — two axes. Wrong **store**
   in the route (a real admin of another venue) ≡ absent store; wrong **newsletter** inside a store the
   caller genuinely holds ≡ absent id. The second axis's control is the same caller reading that very
   newsletter back under its own store's route, so only the route store varies.
3. `Editing_answers_on_PUT_alone_and_a_refused_edit_appends_no_version` — 405 on the collection for PUT and
   on the item for POST; 401 anonymous; foreign ≡ absent; the immutable version chain is still length 1 and
   holds no row with the intruder's subject; then the owner's identical edit appends version 2 with
   `CreatedByUserId` set.
4. `Approval_is_refused_to_a_caller_who_could_not_have_created_it_and_names_the_one_who_could` — the
   intruder's payload pins the correct version id, hash and snapshot, so a 409 would mean the guard let him
   in; it is a 404 identical to the absent store's, no approval row exists and the newsletter is still
   `Draft`; then the owner's approval lands with `ApproverUserId = wire-admin-a`.
5. `An_edit_after_approval_revokes_the_sign_off_rather_than_shipping_the_new_wording` — approval invalidated
   with `InvalidatedByUserId` naming the editor, no approval carried onto the new version, the detail read
   reports `Draft` + approval `None`, and replaying the original approval payload is
   `409 growth.approval_stale`.
6. `A_dark_stores_operator_can_still_author_and_approve_while_only_the_send_is_stopped` — see §4.

## 4. Judgment calls

**Approval carries no privilege of its own.** The exit criterion asks whether approval can be granted by
someone who could not have created it. It cannot, and neither can the converse: create and approve resolve
through the identical `ResolveStoreAdminAsync` load, so the two principal sets are the same set. There is no
four-eyes rule — the author can sign off their own newsletter — and `30-growth-spec.md` §5 asks for none
(endpoints 13 and 17 are both plain `StoreAdmin`). Pinned as the equality it is, in both directions, rather
than asserted as a separation that does not exist. **Not pinned, reported:** whether a venue's marketing mail
should require a second pair of eyes is a product ruling, not a defect.

**A dark store can still mint and sign off a newsletter.** `growth.module` gates only `test-sends` and
`dispatch`; create/detail/edit/approve are deliberately ungated so an operator can wind a switched-off module
down. Creating *new* sendable material and approving it is not winding down. Harmless only for as long as
both send paths stay gated, so fact 6 states the asymmetry as one fact — authoring answers, dispatch is
`404 growth.not_found` — asserted on the **code** as well as the status, because ungating dispatch would
yield `409 growth.unsubscribe_unconfigured` from inside `GrowthDispatchService` and a status-only assertion
would not notice.

**The detail read exposes nothing to a wrong-store admin** (it is a 404 with no subject in the body, asserted).
For the store's own admin the body is address-free by construction: internal ids, a content hash, aggregate
snapshot counts.

**Not pinned — an honesty gap in the detail read.** After an edit, `BuildDetailAsync` computes
`Approval.InvalidatedAt` against the *current* (new) version, which has no approval history, so the response
reports `state: "None", invalidatedAt: null` — the same document a newsletter that was never approved
returns. The revocation is recorded in the database (`InvalidatedAt`, `InvalidatedByUserId`) and is simply
not surfaced. `state: "Draft"` is the operative signal and fact 5 pins it, so this is a legibility question
for the composer UI rather than a security one. Flagged, not fixed: fixing it changes a response contract,
which is outside a coverage lane.

**Not pinned — second-approver idempotency.** `ApproveAsync` returns the *existing* approval when one is
live for the version, so a second admin pressing approve gets a 200 describing the first admin's sign-off,
and the response body names no approver. Documented behaviour (§5 endpoint 17 idempotency), not a defect,
but it means "I approved it" and "the record says I approved it" can differ.

## 5. Assertions that could not fail — checked

* Dropped from fact 6: `Assert.False(GrowthDispatchRuns.Any(...))` for the dark store. It cannot fail —
  this host sets no `Growth:PublicApiBaseUrl`, so `EnsureGuestControlLinksAreConfigured` refuses every
  dispatch before a run is created, gate or no gate. Replaced with the error-code assertion, which does
  distinguish the two.
* Every "nothing was written" check is a count of rows scoped to a subject **this test created**, taken
  immediately around the refused call, with the positive control in the same run — never a fold over an
  empty set.
* `Assert.Empty(GrowthNewsletterApprovals.Where(NewsletterVersionId == …))` in fact 4 is non-vacuous
  because the very next request creates the row it asserts is absent.
* No test double decides anything here. The wire host substitutes only egress seams (mail, SMS, Redis,
  payment rails, telemetry); `IAuthorizationService`, `StoreAdminAuthorizationHandler`, the JWT bearer
  handler and the tokens are the application's own, and `WireContainmentTests` proves the substitution set.
  The suite touches none of the quarantined seams.

## 6. World hazard hit and avoided

The first version created its second subject in `StoreB` over the production snapshot route. That reds
`GrowthPlatformSurfacesWireTests.Computing_a_snapshot_is_authenticated_and_a_refused_call_materialises_nothing`,
which asserts `StoreB` holds **no** `GrowthSegments` row — and computing a snapshot creates one. Tests in the
wire collection run serially in no defined order, so this was a real cross-suite defect, caught by the full
fast tier, not by the targeted run. The subject moved to `DarkStore` (which `AdminA` also administers, and
which no sibling asserts is Growth-empty), which additionally sharpens axis 2: only the route store varies.

## 7. Suite results

```
dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"
Passed!  - Failed: 0, Passed: 4363, Skipped: 12, Total: 4375, Duration: 4 m 59 s
```

Wire tier alone: 252 passed / 0 failed / 2 skipped.

**No SQL tier was run** — Docker's VM is down estate-wide. The new suite is SQLite-only by construction
(the wire host holds one in-memory SQLite connection) and adds no SQL-tier facts, so nothing here is waiting
on that tier.
