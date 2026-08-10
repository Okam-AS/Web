```
RETURN: L-EV-ACCEPT-RECEIPT
brief: 595c35eb
verdict: built
evidence: fact:ev.accept.receipt (Enums/Events/EventsNotificationKind.cs contains AcceptanceReceipt) + ../wt-ev-accept/artifacts/journeys/ev-accept-receipt/acceptance-receipt.html · lane/ev-accept-receipt 9f161e9e, 8ef3ce74 off feature/restaurant-modules a2897738, not pushed
log:
- NOT already built: the outbox had two link kinds and acceptance staged nothing. Landed a third
  kind, a document renderer, a DB-backed composer, a venue-address resolver, staging in BOTH accept
  paths (T5 and the T17 amendment), and the DI registration. No migration (C2): the new value rides
  the existing nvarchar(32) Kind column; nothing in OnModelCreating moved.
- WHAT THE HASH COVERS, and what the document prints as covered: currencyCode, totalMinor,
  minimumSpendMinor, roomFeeMinor, depositRequiredMinor, termsText, expiresAtUtc, lineCount and per
  line lineNo/kind/description/quantity/unitPriceMinor/amountMinor/vatRate. It prints ONLY those as
  covered — EventsProposalContentHash now exposes the canonical rendering as named fields and takes
  the digest over that same list, so the document is a projection of the hash's inputs, not a second
  pass over the entity. A golden vector pins that naming them moved no byte.
- What it prints and labels as NOT covered: the acceptance facts (name, e-mail, moment, version no —
  bound instead by the append-only receipt row) and the event title/date/party size (mutable booking
  state). It says "ikke en signatur" in its own words, names no statute (C6), and carries no token.
- If the version stops hashing to what the acceptance recorded, NO document is rendered and the
  delivery fails as AcceptanceReceiptUnavailable rather than publishing a false proof.
- WOULD IT SEND IF THE FLAG WERE FLIPPED? Yes. Events:DispatchEnabled=false is the only thing
  stopping it — the receipt needs no PublicBaseUrl (deliberately exempted; it has no link), and it
  rides the same IEmailService every other message ships from. Nothing in this lane claims delivery:
  the drain test turns the switch on explicitly beside the shipped-off control, the wire test asserts
  the flag is false and the mailer holds no receipt, and the artifact says so on its face.
- DEFECT CAUGHT BY THE RED: the venue command first coalesced a null venue address to the guest's,
  so an unconfigured venue silently got a second guest copy that reported success. Removed; the
  target is now always stated by the caller and an unconfigured venue is a row with no target that
  dead-letters visibly on the existing "needs you" surface.
- Red-then-green, six mutations, each with the real message captured under the lane scratch dir: no
  venue row, stage-after-commit, skip the hash re-verify, print an uncovered amount, drop the receipt
  branch in the delivery, restore the guest coalesce. The stage-after-commit mutation PASSED the
  first crash pin, so a second pin was added (8ef3ce74) that only trips on a save carrying the
  documents without the receipt beside them; it now throws under the reordering.
- Suites (evidence that code behaves, never that the capability exists — C5): full fast tier
  4370/0/12-skipped, incl. the 18 new tests. I hold no sql slot, so the SQL tier did not run and no
  SQL-Server lineage/trigger suite was exercised.
- FLAGS. (1) The server does not require a typed name or e-mail on accept — only the guest page does
  — so a receipt can name nobody; it prints "Ikke oppgitt" rather than a blank, but the gate is
  client-side only. (2) Store.ContactEmails has no operator lever anywhere in this estate, so the
  venue copy falls back to SendInvoiceToEmails (the only venue address with a writer) and otherwise
  dead-letters. (3) Amounts render invariant-culture (12,345.67 NOK) beside Norwegian copy; there is
  no locale plumbing in Events to derive anything else from.
- WHAT A PERSON STILL HAS TO WALK: there is no screen for this. Open
  artifacts/journeys/ev-accept-receipt/acceptance-receipt.html in a browser — that is the document,
  from a real run through the real pipeline, and it is what Sven's acceptance should be against.
END RETURN
```
