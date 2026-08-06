```
RETURN: L-EMPLOYEE-REF-REFUSES-ANY-NATIONAL-ID
brief: ff02c8b2
verdict: built
evidence: lanes/L-EMPLOYEE-REF-REFUSES-ANY-NATIONAL-ID/mutation-log.md
log:
Exit met: REFUSE. Exit B was ruled out, not merely unpreferred - MealsStatementController states "company admin OR its store billing may read/export it",
so the number is DISCLOSED to the restaurant, a third party to the employment relationship, and C1 forbids the repair. A disclosure with no undo has no
"what makes it safe" to record.
Refused exactly: a German Sozialversicherungsnummer. Three conditions must ALL hold - 12-char shape (letter ninth, either case), a real calendar birth
date, and the official check digit (letter -> 2-digit ordinal, weights 2,1,2,5,7,1,2,1,2,1,2,1, QUERSUMME of the products, mod 10). Verified vs the
published example 65170839J003. ~1 in 274 false positives vs the fnr arm's 1 in 121. Not a shape rule. Bereichsnummer deliberately unconstrained: a stale
allowlist would make the guard ACCEPT a real number, the direction C1 punishes. Deliberately STILL ACCEPTED: every unnamed format - Swedish, Danish,
Swiss AHV - pinned by its own arm with checksum-valid vectors so adding one stays a decision. Swiss AHV is next worth naming; not taken unasked.
14 mutants all red, and I kept looking twice. M4 killed only 1/6 so I checked equivalence: weight[4] hits the month TENS digit, zero before October; a
12-position sweep proved no weight survives the corpus. The mutants also found a REAL defect in my own tests - both original impossible-date vectors
broke day AND month, so M11 (month>12 -> >13) SURVIVED; replaced by 6 vectors each breaking one date rule, M9-M13 now die to their own. Both Normalize
callers pinned at the endpoint, not helper-only.
Class 39/39; fast tier 4658 passed/0 failed/12 skipped, "Database!=SqlServer" explicit; NO SQL tier, no container started or touched. Committed 27de8b21
on lane/empref-natid off 8e2b57de (worktree /Users/svendaneel/okam/wt-empref-natid), 2 files by pathspec, not pushed. Residue: de.ts:4074 claimed this
control and was FALSE, now true; en.ts:4069 / no.ts:4125 understate it.
END RETURN
```
