# L-WF-INVITE-LIST-REVOKE — what was verified, what was built, what was proven

No container started, none touched (the two foreign SQL containers `okam-lvsp-sql` / `okam-lwr-sql` were
left alone). No migration authored. All backend work in my own worktree
`/Users/svendaneel/okam/wt-wfinvlist`, branch `lane/wf-invite-list-revoke`, forked from the integration tip
`8e2b57de`. Nothing pushed. The shared `OkamAPI-modules` checkout (on `lane/meals-grace-pins`) was never
written to.

Landed commit: **`68f2472c`** — 9 files, +727 lines, no deletions.

---

## 1. The brief's three absence claims, checked before a line was written

| claim | verdict |
|---|---|
| `WorkforceStaffController` binds **issue and nothing else** | **TRUE.** 13 actions; invitations appear exactly once, `[HttpPost("staff/{staffMemberId:guid}/invitations")]` at `Controllers/WorkforceStaffController.cs:156`. |
| There is **no list route and no revoke route** | **TRUE.** No route in the estate matched. `IWorkforceInvitationService` declared exactly two members, `IssueAsync` and `ClaimAsync`. |
| `WorkforceInvitationState.Revoked` is **written by no code path at all** | **TRUE**, and confirmed exhaustively rather than by absence of a grep hit: every `WorkforceInvitationState.` reference in the whole repo (14 sites, prod + tests) names only `Pending` or `Claimed`. `Revoked` existed solely in prose. |

### A fourth absence the brief did not name, found by the same sweep

**`WorkforceInvitationState.Expired` is also written by no code path.** Expiry is decided at *read* time by
comparing `ExpiresAtUtc` (`WorkforceInvitationService.ClaimAsync`), so an invitation that lapsed a month ago
still sits at `Pending` in the row.

This is not a footnote — it is a trap directly on this lane's path. A "pending invitations" list filtered on
`State == Pending` and reporting the stored state would have told a manager that a dead code is still
outstanding, i.e. answered this surface's *entire question* backwards, while looking correct. Handled by
putting a derived `isLive` on the wire alongside the stored `state`, computed with the same comparison the
claim path makes, so the list agrees with what the claim endpoint would actually do with the code.

---

## 2. The anti-oracle — the trap the brief flagged, and how the property is kept

`WorkforceInvitationTests.cs:493` (`Invalid_expired_and_used_tokens_are_indistinguishable_anti_oracle`) pins
that invalid / expired / used tokens answer an identical `404 workforce.invitation-invalid` with no
discriminating field. The brief warned that making a revoked code answer "this invitation was revoked" would
break it.

**It is kept structurally, not by a matching error string.** `ClaimAsync` was not modified at all. Its guard
is `invitation.State != WorkforceInvitationState.Pending`, so revoking drops the invitation into the single
opaque refusal *without the claim path learning that revocation exists*. There is no revoked branch to keep
in sync with the invalid branch, because there is no revoked branch.

New pin: `A_revoked_code_is_indistinguishable_from_a_fabricated_one`. It compares a revoked token's refusal
against a made-up token's on `Status`, `Title`, `Detail`, `Type` **and the full extension member list**
(`ExtensionMembers`, the existing helper), so a later "better error message" cannot slip a discriminating
field in beside a matching code.

The two new problem codes live on the **manager** surface and are unreachable from the claim endpoint. That
is stated as a declared-for-review interpretation in the `WorkforceInvitationProblems` XML docs, following
the file's existing convention for `PersonAttachRefused`.

---

## 3. What was built

**Routes** (`Controllers/WorkforceStaffController.cs`)

- `GET  /workforce/stores/{storeId}/invitations` — read, `WorkforceManager`, no Idempotency-Key.
- `POST /workforce/stores/{storeId}/invitations/{invitationId}/revoke` — mutation, `WorkforceManager` +
  `workforce.setup` stage gate, Idempotency-Key required, no If-Match (matching the sibling issue action,
  which documents the invitation as a child resource guarded by the filtered unique active-claim index
  rather than an optimistic-concurrency aggregate).

`POST .../revoke` rather than `DELETE .../{id}`: the row is **not** removed, and a DELETE verb would
advertise the opposite of what happens (C1).

**Wire shape** — `WorkforceInvitationSummary`: `invitationId`, `storeId`, `staffMemberId`, `displayName`,
`state`, `isLive`, `expiresAtUtc`, `createdAtUtc`. **There is no token member and no hash member**, so C7 is
satisfied structurally rather than by a line somebody must remember not to write. Committed as a golden wire
fixture (`docs/api/fixtures/workforce/invitation-summary.json` + manifest entry), which makes the *absence*
of a token field a contract fact: a fixture regenerated with one on it fails review as a visible diff.

**Semantics**

- List returns `Pending` rows only. `Claimed`/`Revoked` are spent, and listing them would turn "what is
  outstanding" into a directory of who has and has not signed in yet.
- Revoke of an absent or cross-store invitation → the module's opaque `NotFound`.
- Revoke of an already-revoked invitation → idempotent success, **no second audit event** (an audit row for
  a write that did not happen is a lie an inspector reads as a real second act).
- Revoke of an **already-claimed** invitation → refused, `409 workforce.invitation-not-revocable`. This is
  the one place a silent 200 would be dangerous: the manager's reason for revoking is almost always that the
  code went to the wrong person, and if that person already redeemed it, success tells them they are safe at
  the exact moment they are not. Withdrawal cannot undo a link; the refusal sends them to the operator path.
- `409 workforce.invitation-revoke-conflict` on `DbUpdateConcurrencyException` (a concurrent claim or
  reissue). **Stated honestly and not claimed as tested**: it needs a real DB-generated rowversion, so it is
  a SQL Server answer; SQLite never generates `ConcurrencyVersion` and the fast tier cannot reach it.

**Constraints**

- **C1** — `Pending → Revoked` state transition. No DELETE, no backfill. `WorkforceInvitations` carries no
  append-only deny-trigger and no `GuardAppendOnly` entry (verified); the entity documents claim/revoke/
  expire as its mutation contract. The row survives and keeps its `TokenHash`, so it still names the
  credential it retired — asserted in the exit-criterion test.
- **C4** — the audit entry's `ActorReference` is the manager's **resolved engagement** from the capability
  check, not the raw login and not an ambient actor. Pinned by `Revoke_names_the_manager_who_caused_it`,
  which resolves the expected engagement id from the world rather than hard-coding it.
- **C7** — no token, hash or secret on the wire, in the ledger, or in any log call. No logging call was
  added anywhere in this diff.
- **C2** — no migration authored. No `OnModelCreating` index/constraint added.
- **C3** — both actions bind the already-DI-registered `IWorkforceInvitationService`; nothing was added that
  no route reaches. (Frontend reachability: see §6.)

---

## 4. Proof

**Suite, container-free tier.** `dotnet test --filter "Database!=SqlServer"` (the correct filter — *not*
`FullyQualifiedName!~SqlServer`, which misses SqlServer-traited classes and starts a container):

> **Passed: 4652 · Failed: 0 · Skipped: 12 · Total: 4664 · 4 m 59 s**

`WorkforceInvitationTests` alone: **38/38**, of which 14 are new.

**Non-vacuity, by red-then-green mutation.** Both load-bearing tests were proven to actually detect their
defect, restored with a content-writing copy plus `touch` and a real rebuild each time (the stale-`--no-build`
trap in `CLAUDE.md` is exactly what defeats this procedure otherwise — verified 0 errors and `grep -c MUTANT`
= 0 after restore):

| mutation | expected to red | result |
|---|---|---|
| `ClaimAsync` gains a branch answering `404 workforce.invitation-revoked` for a revoked token — i.e. the "better error message" this lane must never ship | the anti-oracle pin | **2 FAILED** — `A_revoked_code_is_indistinguishable_from_a_fabricated_one` **and** `Revoke_withdraws_the_code_and_the_claim_is_then_refused` |
| `RevokeAsync` reports success without performing the transition | the exit-criterion test | **3 FAILED** — the two above plus `Revoke_of_an_already_revoked_invitation_is_an_idempotent_no_op` |

Restored → **38/38 green**, then the full tier above.

One self-inflicted red found and fixed along the way: the C7 wire assertion
`Assert.DoesNotContain("token", …)` failed because my own fixture display name was `Invitee create-notoken`.
The fixture key was renamed; the assertion was kept at full strength rather than weakened.

**The exit criterion**, `Revoke_withdraws_the_code_and_the_claim_is_then_refused`, drives the whole journey
through the real controllers: list shows the code live → revoke → the handed-out token is refused with the
opaque 404 → it is gone from the manager's list → the row is `Revoked` (not deleted, hash intact) → and the
person was **not** linked by the failed claim.

---

## 5. New tests (14)

`List_shows_the_outstanding_code_and_who_it_went_to` ·
`List_never_puts_the_token_or_its_hash_on_the_wire` ·
`List_reports_a_lapsed_code_as_not_live_though_the_row_still_says_pending` ·
`List_requires_manager_and_a_scheduler_is_forbidden` ·
`Revoke_withdraws_the_code_and_the_claim_is_then_refused` ·
`A_revoked_code_is_indistinguishable_from_a_fabricated_one` ·
`Revoke_names_the_manager_who_caused_it` ·
`Revoke_of_an_already_claimed_invitation_is_refused_not_silently_accepted` ·
`Revoke_of_an_already_revoked_invitation_is_an_idempotent_no_op` ·
`Revoke_replay_of_the_same_key_returns_the_stored_outcome` ·
`Revoke_requires_manager_and_a_scheduler_is_forbidden` ·
`Revoke_without_an_idempotency_key_is_a_400` ·
`Revoke_of_an_absent_invitation_is_the_opaque_404` ·
plus the `invitation-summary.json` wire-fixture case.

---

## 6. The brief premise that is STALE, and the follow-up it creates

The brief states the UI is "already landed at the integration tip" and that "what does not exist is
backend". The second half is true and is what I built. **The first half is not true for list/revoke**, and
this needs to be recorded because it changes an on-screen honesty claim.

Measured in `Web-modules`:

- `utils/workforce/roster-client.js:137` binds `IssueInvitation` and **nothing else**. There is no
  `ListInvitations` and no `RevokeInvitation` anywhere in the frontend. (Meals, by contrast, has all three
  at `utils/meals/admin-client.js:190/206/218` — the pattern exists in-repo.)
- `components/admin/workforce/WorkforceEngagementPanel.vue:133` renders `wfr_access_no_list`, whose copy in
  **three locales** (`translations/en.ts:2972`, `no.ts:3025`, `de.ts:2974`) says literally: *"We cannot show
  whether a code is live right now, when it expires, or withdraw one — **the API has no such routes**.
  Issuing a new code kills the previous one… that is the only way to stop a code that went to the wrong
  person."*
- `test/workforce-roster-components.test.js:412-419` **asserts that absence is stated on screen**, and
  `test/e2e/journeys/workforce-invitation-onboarding.spec.js:349-359` records the missing routes as a
  journey finding on every run.

That copy was honest when written. **The moment this backend commit merges, it becomes false**, and two
frontend tests actively pin the false statement. The frontend wiring is therefore a required follow-up, not
an optional polish.

**Why I did not do it in this lane rather than leaving it half-done:** the frontend files it needs are held
dirty by another lane *right now*. `/Users/svendaneel/okam/Web-modules` is a shared checkout on
`feature/restaurant-modules` with **204 uncommitted files**, and among them are exactly
`translations/en.ts`, `translations/no.ts`, `translations/de.ts` and `test/e2e/fixture/api-server.js` — the
four files the copy change and the fixture server need. Editing them in the shared checkout would corrupt
another lane's work; editing them in a worktree off the committed tip would guarantee a merge conflict on
all four. The panel, page and client are clean and could be branched safely, but the change is not coherent
without the copy.

The follow-up is small and fully specified: add `ListInvitations(storeId)` and
`RevokeInvitation(storeId, invitationId)` to `WorkforceRosterService` (it already mints a fresh
`Idempotency-Key` per call at `utils/workforce/api-client.js:169`, which is exactly what the revoke
conflict answers want), surface live-code state + a withdraw control in the panel, replace
`wfr_access_no_list` in three locales, add the two handlers to the e2e fixture server, and retire the two
tests that pin the absence.
