```
RETURN: L-MEALS-IDEMPOTENCY-REFUSAL
brief: 01bfefcd
verdict: built
evidence: lanes/L-MEALS-IDEMPOTENCY-REFUSAL/mutation-log.md
log:
Base feature/restaurant-modules @ 569887a5 = the tip the brief names. mig-stack-land 4b37f81b is DIVERGED, not 34 ahead (34 its way, 54 the tip's); its 34 touch only Migrations/**, zero Services/Meals differ.
No discriminator at any integration ref, so not fail-spec. Worktree OkamAPI-mealsidemref, lane/meals-idempotency-refusal @ 54714dd6, not pushed, no shared ref moved, committed by pathspec, 16 files.
Container-free only, no container started: 4647/0/12 against my own 4629/0/12 baseline measured at clean 569887a5 in a separate worktree. Delta +18 = exactly the added tests.
No unreproducible failure to name: the baseline was clean on its only run and the lane clean on its only run after the two failures below were fixed.
Mutants 10/10 RED, 0 survivors, run twice. Verbatim: "Expected: meals.stale-revision / Actual: meals.idempotency-in-progress" - the instrument prints the defect itself.
Every proof reads the code out of the RESPONSE BODY; in-progress is a 409 too, so a status assertion would have discriminated nothing.
NO MIGRATION OWED, verified in the DDL rather than assumed: ResponseStatusCode int NULL and ResponseSnapshotJson nvarchar(max), no CHECK on either, no append-only trigger on the table.
An error status is therefore a VALUE in a column that already exists - the same shape the Workforce lane found. C1 not engaged.
Two real failures the full tier caught, both caused by me, both fixed. MealsAgreementWriterTests asserted the DEFECT, and named a stranding site the brief's list missed.
RowversionAssertionProviderTests correctly flagged 9 new tests; satisfied by its mechanism 3 (assert your own premise), not by the allowlist.
In-flight guard intact and pinned - only a recorded outcome moves in-progress, no fresh-key hint. Disclosure conditions and C4 verified to hold in Meals, not assumed.
TOUCHES SIBLING FILES: MealsMembershipService.cs and MealsCommandReceiptService.cs - L-MEALS-CLAIM-RECEIPT is live in this module and these are plausibly its files.
MealsDbViolations.cs NOT touched. The three test hosts gained an OVERLOAD, never an extra optional param - adminStoreIds is params int[] with ~40 positional callers.
NOT PROVEN: that SQL Server raises the backstop condition. The 8 backstops are reached container-free by an interceptor; the rowversion CAS stays the SQL tier's job, Docker down.
C5 owed: no person has walked this in the UI.
END RETURN
```
