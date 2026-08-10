```
RETURN: L-EV-EXTDEP
brief: 47846ca8
verdict: built
evidence: fact:ev.deposit.external (Services/Events/EventsDepositService.cs contains ExternalRecorded) + ../OkamAPI-ev-extdep/artifacts/lanes/L-EV-EXTDEP/EVIDENCE.md · lane/ev-extdep b10fc8a7, 7e9c38bf off feature/restaurant-modules d458e1cf, not pushed
log:
- POST .../deposits/external records a rail-less deposit: created Paid, T7+T9 in one transaction,
  paid-truth = ONE ExternalRecorded receipt naming the recorder and the bank/terminal reference.
  Two PaymentTypes (BankTransfer/ExternalTerminal), gated on Events.Deposits like issue.
- NOT a carve-out, a PARTITION: EventsPaymentLedger (single writer) refuses an attestation kind on
  any rail deposit and every provider-truth kind on an external one (Forfeited is common ground),
  so no deposit holds both. The row carries none of the 7 IPayable refs -> no callback resolves it.
- EXIT PROVEN at the wire: record -> start-service -> close -> DepositApplied line carries
  EnteredByUserId = the recorder, asserted on the persisted row. 450_00 recorded against a 500_00
  requirement, so the attested figure cannot be the version's copied over.
- Refund honest: no port call, no RefundIssued/ProviderRefundConfirmed pair (both would claim a rail
  acted), one ExternalReturned receipt. Event cancel-with-refund reuses it, so invariant 5 keeps a
  resolution path for a Stripe/Dintero venue.
- BRIEF CORRECTION: EventsDeposits.PaymentType is nvarchar(32) via EnumToStringConverter, NOT an int
  column. Conclusion holds and I confirmed it directly: `dotnet ef migrations
  has-pending-model-changes` = "No changes have been made to the model". No migration, tip untouched.
- Red-then-green: 10 mutations, all red with real messages (table + mutations.log in EVIDENCE.md).
  No test rests on a fake provider state — the port double THROWS on every member, so "zero provider
  interactions" is a claim about production code.
- M9 FOUND A WEAK TEST OF MY OWN: the sink pin stayed green with a provider ref present (a Paid
  deposit no-ops via idempotent replay, not via non-resolution). Fixed to assert the four reference
  columns; now red. Recorded rather than quietly patched.
- Honest gap: RequireActor here is not independently falsifiable — the state machine and the ledger
  refuse a blank Admin actor identically; M8 removes all three at once. Kept anyway.
- Suites: whole backend non-SQL 4316/0 (10 skipped); Events+Wire+Modules 768/0 with trx. NO SQL TIER
  — no slot held, no container started or touched. The single-active index is proven reached and
  typed here; EventsConcurrencyTests owns the index itself on SQL Server.
- Amended docs/plans/modules/40-events-spec.md, which said "Stripe/Vipps/Dintero members only in v1"
  and is now false: added the route, 2 receipt kinds + actor columns, EnteredByUserId, and a note
  stating the partition. Reversible if that spec is meant to be frozen — flagging it either way.
- NOT WALKED BY A PERSON (C5): no admin UI and no Core TS client method for the route.
  L-EV-EXTDEP-UI adds the lever; until then it is reachable over HTTP and by nothing a coordinator
  can click.
END RETURN
```
