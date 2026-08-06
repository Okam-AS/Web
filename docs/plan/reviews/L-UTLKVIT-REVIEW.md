# Fable review — L-MEALS-UTLKVIT, the § 2-8-7 delivery receipt (2026-08-01)

Read-only review of `lane/meals-utlkvit` @ `1a03bc6c`. No file edited, no suite run.

## Verdict — sound-with-conditions

**The core artifact is real and well-built:** a genuine delivery-receipt journal event appended in the sale's
own transaction and chained on its signature, its own lazily-created counter, the marking wired through the
choke point, and a no-migration claim **verifiable statically, independent of any test run**.

But **the lane's compliance claim overreaches its build in three ways it did not disclose.** All three are
latent, because the feature is production-unreachable and that was verified — so they are conditions, not a
rejection.

## Defects, most severe first

1. **A credit sale's SALE row still renders and copies as a proof of purchase.** The delivery document keeps
   the sale's own journal id, and the plain receipt path has no forward resolution from the sale to the
   delivery receipt. So the print endpoint — **whose own comment says the first print of a sale is the
   original receipt** — the view endpoint, the SMS and the public page, when addressed at the id every
   existing client already uses, all produce a **salgskvittering with no marking, for a sale nobody paid.**
   Worse: the copy allowlist permits copying that row, minting a KOPI-marked apparent proof of purchase —
   **the precise forgery the lane's own refusal test exists to prevent, reachable by the other door.** The
   correct document prints only if a client knows to address the new id.
2. **Two § 2-8-2 obligations are now live and unimplemented.** The regulation requires the count and amount of
   delivery receipts, and a specified count and amount of credit sales. The report service has no case for
   either and the entity has no fields. **Before this lane those items were vacuous** — the regulation
   conditions them on the function existing. The lane created the function and left the report behind.
3. **The systembeskrivelse claims a description that does not exist** — it says the credit-sale specification
   *belongs to the X/Z report and is described there*, and that section contains no mention of it. **Same
   defect class as the RF-1313 trigger finding**, and invisible to the new guard, which parses only the
   receipt table.
4. **The X-report test pins the wrong statutory classification** — it asserts the credit sale inside the
   cash-sale totals, which the estate's own export comment contradicts in as many words. The double-count pin
   is right; the bucket it pins is not.
5. **Replay classification comes from the request, not the journal.** A caller replaying with drifted payments
   gets a sales receipt for a credit-sale order, silently. No production caller drifts today, so this is a
   defensive gap — deriving from the appended entry would close it.
6. Minor: delivery rows now increment an existing Z figure — consistent with that field's definition but an
   unpinned composition change. And a pre-existing contradiction, not in-lane: the systembeskrivelse says
   timestamps are UTC while the signing path says Oslo wall-clock.

## Claims the artifacts do not support

- **Both tier results and the five mutations are process claims with no artifact.** The estate has an in-repo
  convention for recording tier runs as a trx at the commit; this commit records nothing. The arithmetic is
  plausible against a known baseline, but **nothing witnesses any run.**
- **"Proven on SQL Server rather than assumed"** — the instrument is real, in-repo and decisive, but no
  artifact witnesses it executing. **The static half was verified independently, and it holds:** the unique
  index's filter names no receipt types, so the new series is covered by construction; the series column is a
  string; counters are created on first use. All five unique indexes on the table were enumerated, and the
  duplicate-insert pair really can only be refused by the target index. **The migration chain can stay
  untouched.**
- The SAF-T code is not verifiable in-repo — consistent with the neighbouring mappings leaving exactly that
  gap.

## Assertions that could pass against broken code

- The replay test **never asserts the document's lines** — a replay handing over a lineless document passes.
- The delivery-number assertion is **the one-number shape that cannot see a gap**. Gap-freedom and series
  independence live **solely** in the SQL tier's interleaved test, which is currently unwitnessed.
- The set-equality guard's parse accepts numeric strings, so a table row naming the event by number passes the
  mechanism-exists check.
- The marking test compares the constant to a literal duplicated in the test — belt only; the real cross-check
  is the regulation-derived test.
- **The copy-refusal test gives false comfort:** the equally forgeable route, copying the credit-sale SALE
  row, is open and untested. That is defect 1.

## Confirmed accurate

- **Exactly three marking assignment sites**, and the one remaining is the copy path, exactly as disclosed —
  and it is bounded, because deleting the copy arm of the choke point still reds the set-equality guard.
- **The guard is genuinely two-directional** — both directions assert and each fails independently — and the
  emittable side is **derived by an enum sweep through the real choke point**, not hand-maintained.
- **The C6 claim is true as written.** The systembeskrivelse states the limitation verbatim, and the
  settlement surface does refuse the medium; the web-order flow never touches the journal. The feature is
  unreachable in production from both surfaces.
- **This is not the Meals fabricated-row shape.** Every row in both tiers is written through the production
  append protocol, entering one layer below the refused surface via the same request type the settlement
  service itself builds. The projection kit is deliberately unused, and a harness change makes signature
  verification **real rather than tautological.**

## What could not be determined

Whether either tier actually ran green — no recorded artifact, and running one would need a container slot
this review should not take while foreign containers are active. Whether the SAF-T code is the standard's.
And whether a credit sale consuming a sale-series number while no sales receipt is ever issued is acceptable
fiscal practice — an interpretation question the systembeskrivelse describes and no authority in-repo settles.
