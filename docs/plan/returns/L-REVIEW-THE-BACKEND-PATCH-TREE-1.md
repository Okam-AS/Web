RETURN: L-REVIEW-THE-BACKEND-PATCH-TREE
brief: 5ad8277e
verdict: built
evidence: docs/plan/reviews/L-REVIEW-THE-BACKEND-PATCH-TREE.md
log: Read all four commits between 7f8945dc6 and 2ba9229fa in full; ruled the three patches, excluded 2ba9229fa (evidence-only, per clerk correction) with the reason stated in the review.
d8c98c200 company-account return: LAND-AS-IS. Route PosController.cs:760, guards :697/:795; five candidate findings raised and each dissolved against code, with cites.
Key dissolutions: company tender refuses split (PosSettlementService.cs:409-415) so the Any()-guard is exact; claimed Meals reversal control is real (MealsJournalProjectionSource.cs:100,139).
f3817eed9 Tripletex claim window: LAND-AS-IS. Window enforced by CancelAfter (TripletexVoucherPoster.cs:149-152), stale threshold derived (:62,:126), Retry-After capped (TripletexClient.cs:427).
Two non-blocking observations recorded: O1 per-call budget undercounts worst case (TripletexSettings.cs:57, safe direction, exact tightening named); O2 stale recovery lengthens 10min to ~24.3min.
ea66353f9 open-shifts lineage: LAND-AS-IS. Extraction byte-identical at both prior sites (WorkforceScheduleSupport.cs:307-312,:359,:436); new site WorkforceShiftExchangeService.cs:78 is the fix.
Predicate exactness proven against the publish path, not assumed: a successor always belongs to a different revision (WorkforceSchedulePublishService.cs:242).
Constraint sweep per commit: C1 clean (append path via AppendSignedEntryAsync; only UPDATE is the pre-existing TripletexVoucherLogs re-claim, unguarded table; commit 3 read-side only).
C4 clean (PIN-resolved operator stamped on the RETREC, PosController.cs:782); C7 clean (no credential-bearing log call added anywhere in the diff).
Verified independently, agreeing with the sibling: git diff 7f8945dc6..2ba9229fa over Migrations/, ApplicationDbContext.cs, Entities/ is empty; 23 code/test files + 11 artifact files.
No suite run, no container touched, no file edited in OkamAPI-modules; the author's 4703-to-4728 triple was treated as his claim and cross-checked against evidence.md, not re-measured.
END RETURN
