# L-WF-CONTACT-IMPORTED — detail

## Verification that the gap was still real

- HEAD `feature/restaurant-modules @ 3579bbbc`: the ONLY writes of
  `WorkforcePerson.ContactEmail/ContactPhone` in the whole backend were
  `WorkforceStaffService.cs:195-196` (the create path). `:829-830` is a read for the detail
  projection. Nothing else wrote them.
- Swept **every local branch** in `OkamAPI-modules` (109 branches):
  - no branch had more than 2 `ContactEmail` occurrences in `Services/Workforce/WorkforceStaffService.cs`
    (HEAD's count, i.e. the create pair);
  - no branch's `UpdateWorkforceStaffRequest` carried a `Contact*` field;
  - no `Controllers/Workforce*.cs` on any branch mentioned "contact".
- Swept every local branch in the `Web` repo: no `WorkforceEngagementPanel.vue` on any branch
  contained `save-contact`, `draftContactEmail` or a contact form.
- The demo lane's own return (`docs/plan/returns/L-WF-DEMO-PRESENCE-1.md`) states the gap in the same
  terms and confirms `WorkforcePersons` "carries no guard".

Conclusion: real, unbuilt, not duplicated anywhere.

## The design question — why the create route refuses "the field"

**The refused field is `OperatorId`, not contact.** The brief's paraphrase compresses two facts.
`CreateWorkforceStaffRequest` refuses a POS `OperatorId` by design (an operator session must never
silently become an engagement, spec §3.1), which is why the import is the only path — and why the
demo's two people had to become imported.

`POST /staff` *does* accept `ContactEmail`/`ContactPhone`. But look at
`WorkforceStaffService.CreateStaffAsync`: those fields are read **only on the branch that constructs
a new `WorkforcePerson`**. When `WorkforcePersonId` is supplied (the second-engagement path), they
are silently ignored. So create has never been able to *edit* a contact detail — only to populate one
at a person's birth. An operator-imported engagement has no such birth: the import copies
`op.DisplayName` and nothing else.

**Where the truth lives.** `ContactEmail`/`ContactPhone` are columns on `WorkforcePerson`, which is
*not* store-scoped — one human, one record, across every venue. `WorkforceStaffMember` (the
engagement) is store-scoped. `PATCH /staff/{id}` edits the engagement, and the panel's own comment
says so: "The panel edits an ENGAGEMENT, never a person."

So adding `ContactEmail`/`ContactPhone` to `UpdateWorkforceStaffRequest` **would have been the second
place the truth lives**: the same person engaged at two venues would have two routes each claiming to
own the one field, and a reader would have no way to tell which answer was current.

**The fix therefore lands on the person.** Route:
`PATCH /workforce/stores/{storeId}/staff/{staffMemberId}/person/contact`. The engagement is in the
path because Workforce authorization is store-scoped and resolves *only* from an active engagement in
the route store — it is the caller's proof of access, never the thing edited. The path segment says
`person` so the resource is never misread as an engagement field.

## Existing contact surface — searched for, not found

- `WorkforceMeController` (self-service) binds 16 routes; none touches contact or a profile.
- `WorkforceSelfService` reads `DisplayName` for projections and writes nothing on the person.
- The only other contact-shaped surfaces in the estate are other modules' own entities
  (`MarginSupplier`, `MealsCompany`, `EventsInquiry`) — different aggregates, correctly separate.

## Decisions worth a reviewer's eye

1. **No `If-Match`.** The revision `GET /staff/{id}` returns is the *engagement's* rowversion and does
   not move when the person changes, so requiring it would be a precondition structurally incapable of
   detecting the conflict it existed for. The person carries its own rowversion (added in W2
   carry-forward #3 precisely because "claim, archive and relink mutate a person"); the person is
   loaded **tracked**, so EF puts that rowversion in the UPDATE's WHERE clause and a concurrent writer
   still becomes a typed `workforce.stale-revision` 409 rather than a silent overwrite. SQL Server
   only, the same limit the engagement PATCH documents. `Idempotency-Key` is required as for every
   mutation on this surface.
2. **Audit key is `contactChannels`, not `contactEmail`/`contactPhone`.** Those two names are pinned
   as permanently banned by `WorkforceAuditWriterTests.Sensitive_fields_are_not_on_the_allowlist`
   (`[InlineData("contactEmail")] [InlineData("contactPhone")]`) — adding either would have red that
   test. `contactChannels` holds a shape word per channel (`"email:set,phone:cleared"`), so the ledger
   records that somebody changed how a worker is reached without recording how they are reached.
3. **Replace-whole, blank clears.** A manager who could only add would have no way to withdraw an
   address that has become wrong — worse, for a field that decides who is notified about a shift, than
   the blank it replaced. The panel warns on screen when a save would clear a stored value.
4. **Email is shape-checked; phone is not.** The email rule is the weakest that still excludes a value
   nothing could deliver to (one `@`, something either side, a dot inside the domain, no whitespace) —
   deliberately not RFC 5322, which rejects addresses that work. Phone shape belongs to the store's
   market (market-authority law), so it is trimmed and length-bounded and never pattern-matched; a
   wire test pins that with a Swiss number.
5. **Column bounds mirrored in the service** (256/64) so an over-long value is a 400 at the boundary
   rather than a `DbUpdateException` after the reservation was taken. **No migration authored.**
6. **Guard-before-mutate.** Both channels are normalised and judged *before* the staff/person rows are
   loaded tracked and before the idempotency reservation, so a refused request leaves neither a stuck
   reservation nor a mutated entity behind a rolled-back transaction.

## Mutation ledger (each restored with `cp` + full rebuild, per the stale-assembly rule)

| # | Mutation | Result |
| --- | --- | --- |
| M1 | the two `person.Contact* = ` assignments deleted | 4 of 7 wire tests red — this is the exit criterion's "reds if the write is removed" |
| M2 | the email shape rule disabled (`if (false)`) | only `..._is_refused_and_the_stored_contact_is_untouched` red |
| M3 | `ActorReference` = `"manager:" + caller.StaffMemberId` (never blank, names nobody) | the by-value ledger assertion red AND `WorkforceAuditActorCallSiteTests` red |
| M4 | audit delta carries the values instead of the shape words | only the ledger's privacy assertion red |
| F1 | client PATCHes the engagement path instead of `/person/contact` | the route test red |
| F2 | `@save-contact` unbound on the page | **initially red NOTHING** — the page tests called the handler directly. Added `the panel's save reaches the page`, which now reds. This is the "route with no caller" shape, caught by mutation rather than by review. |
| F3 | page passes `canManage && canPatch` as `can-edit-contact` | **initially red nothing** (the page test's default revision is non-null). Added `offers the contact write where no revision exists`, which now reds. |

F2 and F3 are recorded because both were holes in my own tests that the mutation pass found; the two
tests that close them exist only because of it.

## Evidence

- Backend: `OkamAPI-wfcontact` on `lane/wf-contact-imported @ 833fd2f1`, cut from
  `feature/restaurant-modules @ 3579bbbc`. Local, not pushed.
  - container-free tier (`--filter "Database!=SqlServer"`): **4376 passed / 0 failed / 12 skipped**
  - post-commit wire+workforce re-run: **859 passed / 0 failed / 5 skipped**
- Frontend: `web-wf-contact` on `lane/fe-wf-contact-imported @ 61b053b`, cut from
  `feature/restaurant-modules @ a1a1ec8`. Local, not pushed.
  - jest: **2493 passed / 1 failed / 111 suites**. The one failure is
    `journey-artifact-store.test.js`, which asserts
    `expect(build.id).toMatch(/^Web-modules@[0-9a-f]{40}(\+dirty)?$/)` — the literal checkout basename.
    It fails in **any** worktree and is unrelated to this change.
  - `node_modules` and `core` were borrowed from the main checkout to run the suite and REMOVED
    afterwards; both worktrees end clean.

## Housekeeping

- The wire tier dirtied `artifacts/journeys/ev-dietary/run-sheet.{json,md}` as the brief warned;
  restored with `git checkout --`, never committed.
- No container was started; no foreign container touched.
- No migration authored. Both new columns already exist.
- All three translation files edited by hand; all 7 new keys asserted defined and non-empty in
  `no`/`en`/`de`.

## Open / handoff

- **C5 is NOT met.** Nobody has walked this in a browser. The suite proves the code behaves and the
  wiring test proves the button reaches the route, but Sven's acceptance is the gate.
- **Merge collision, declared:** unmerged `lane/fe-wf-oplink` (L-WF-OPLINK, `3e811b2`) touches
  `pages/admin/workforce-roster.vue`, `utils/workforce/roster-client.js` and all three translation
  files. Different capability, no duplication — but the same four files, so whoever merges second
  resolves by hand.
- `WireHostFixture.cs` gained two `Operator` rows and made `WireLegalEmployerId` public; it is a
  shared file across wire suites, so a backend lane touching it will conflict textually.
