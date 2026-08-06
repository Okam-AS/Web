```
RETURN: L-WF-BOOTSTRAP
brief: eea2a749
verdict: built
evidence: OkamAPI lane/wf-bootstrap @ 9d1719df (worktree ../wt-wfboot, off feature/restaurant-modules 3579bbbc); fast tier 4374 passed / 0 failed / 12 skipped vs BASE 4369 / 0 / 12 from a clean checkout of 3579bbbc, `dotnet test --filter "Database!=SqlServer"`, assembly mtime 11:17:43 > newest source 11:13:16. Web-modules lane/fe-wf-bootstrap @ 9264904 (worktree ../web-wfboot, off 89c2c1f); jest 109 suites / 2469 passed / 1 failed (journey-artifact-store asserts the checkout is named Web-modules; this is a worktree).
log: |
  CIRCLE CONFIRMED, not assumed: exactly three production writers of CapabilityGrants exist -
  WorkforceStaffService Create/Update and WorkforceOperatorImportService.Import - all requiring
  WorkforceManager + workforce.setup. WorkforceInvitationService writes NO engagement; no seeder,
  hosted service or dev endpoint touches the table. The set was closed.
  DOOR: POST /workforce/stores/{id}/bootstrap on its own controller, gated on IStoreAdminAccess
  AND a genuine StoreAdmins row (the shared policy passes a PowerUser everywhere, which would be
  Workforce's largest exception to its own rule), then module gate, then setup. Any existing
  engagement, active or not, is 409 already-bootstrapped, so the door shuts for good. Grants
  Self|Scheduler|Manager, NOT PayrollApprover - wage visibility stays a second audited decision.
  CROSS-TENANT PIN with a positive control in one world: AdminA refused at store 4106 while it is
  EMPTY (only tenancy can cause that), then AdminB opens 4106 with the same body in the same run.
  NON-VACUITY: removing the staff Add reds 2 of 4 facts (mtime 11:08:05->11:09:00); cp-restore plus
  forced rebuild (->11:09:40) greens them. C4: the audit-actor census refused my first version
  correctly; ActorReferenceFor now throws on a blank login and is provenance 4 with its own pin.
  SEED loses all four INSERTs and walks the door; C3 closed in the roster page. Detail below fence.
END RETURN
```

---

Detail below is not part of the return block.

## What the seed lost

All four INSERTs are gone: `WorkforceStaffMembers`, `WorkforcePersons`,
`WorkforceLegalEmployers`, `StoreFeatureFlags`. Two SQL rows remain, `Stores` and
`StoreAdmins`, because neither has an endpoint. Flags now go through
`PUT /stores/{id}/feature-flags`; `workforce.personnel-list` and `workforce.export` are
dropped rather than flipped, being WITHHELD from the operator catalog and gating nothing.
The manager's PayrollApprover is now a visible `PATCH /staff/{id}` (step 2d) instead of the
number 15 in an INSERT.

## C3 in the frontend

`pages/admin/workforce-roster.vue` answered its own administrator `wfr_no_capability` and
nothing else. A 403 on the context read now sets `needsBootstrap` and offers the three fields
the server requires. The page guesses and the server decides: `already-bootstrapped` restores
the old dead end with the old message, `module-disabled` names the feature-flags lever,
a bare 403 is "not your store". Six tests; the page is at 100% statement coverage.

## Open, needs a migration this lane could not author

Nothing in the schema makes "one first engagement per store" a constraint, so two simultaneous
calls both pass the precondition read. The common case is caught - both calls belong to the same
admin, so the one-person-per-login unique index makes the loser a typed 409 rather than a 500 -
but a caller who ALREADY has a `WorkforcePerson` can double-submit into two engagements for the
same person at two legal employers. Recorded as a KNOWN GAP in `IWorkforceBootstrapService`.

## Ordering decision worth a reviewer's eye

The already-bootstrapped precondition runs PRE-reserve, following the module's own rule, so it
pre-empts the replay branch: a retry of the call that succeeded answers `already-bootstrapped`
rather than replaying its stored outcome. Nothing is lost - `GET /staff` carries
`legalEmployerId` and the grant just issued authorizes it - and the alternative strands a
Reserved row whose retry answers `idempotency-in-progress` with `retryable:true`, which is a lie
about a call that can never succeed again. Pinned in the wire test.

## Housekeeping

No container started; the tier was selected by the `Database!=SqlServer` trait only. No migration
authored, no schema touched. Two local commits, nothing pushed. `../web-wfboot` has a copy of the
`core` submodule taken from the main checkout so its jest suite runs; git reports it clean.
