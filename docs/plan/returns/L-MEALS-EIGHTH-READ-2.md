```
RETURN: L-MEALS-EIGHTH-READ
brief: 05ee3134
verdict: built
evidence: /Users/svendaneel/okam/wt-meals-eighth-read/lanes/L-MEALS-EIGHTH-READ/evidence-2.md
log: RE-SCOPED AS RULED; return 1 intact. Read via git show at 8e2b57de = feature/restaurant-modules: two decrement sites (FundingAuthority.cs:453, Worker.cs:132), pin 9fe599c6 not an ancestor.
NOT SELF-CARRYING: six branches contain release d5483cb3, only three contain the pin. The three without it are the release lane, meals-fourway-tier 702d9481, meals-supersede-sql 7dafec47.
So the decision's reopen_when is FALSE, measured. Only lane/meals-quote-retry 92d45967 carries release+pin+SQL twin, and it is no drop-in — it adds its own production retry change.
The SQL twin does not cover it either: MealsRequoteSupersedeSqlServerTests at 7dafec47 is [Trait(Database,SqlServer)], so it never executes in the container-free tier this program runs.
DID NOT STOP AT READING. Trial merge in MY worktree: checkout -b trial/meals-eighth-read-tipmerge 8e2b57de + merge 9fe599c6 = zero conflicts, a7d07559; one merge brings release AND pin.
Same clamp as return 1 (ReservedMinor = 0, floor dropped) at MealsQuoteService.cs:767, AT THE MERGED TIP: clean 10/0; clamp FAILED 4; pre-pin fixture 39cec9c3 + same clamp PASSED 9/0; restored 10/0.
Run 3 IS the hazard: at today's tip a release landed from any of the three unpinned branches leaves a clamped fourth site green on every test it carries.
FULL TIER at the merged state: 4648 passed, 0 failed, 12 skipped, 12m21s, trx committed — first full tier on a tree carrying both today's tip and the release. Green there is what run 3 produces.
SOLE SUPPLIER re-measured, not inherited: the token is the 3rd positional arg of MealsFundingTestKit.QuoteRequest; all 11 three-arg call sites are in MealsRequoteSupersedeTests.cs.
FOUR SITES / THREE STATEMENTS: the tip's ReleaseSupersededAsync:335 is the EXPLICIT owner release, not the re-quote's; the re-quote adds a private supersede that bypasses the authority.
C4 reported not created: 249612ac stamps the authority members and the sweep (System/null); ActorKind count in d5483cb3's MealsQuoteService is 0. Three-of-four = F-MEALS-ACTOR-WORKLIST-STALE.
NOT MEASURED, not substituted: no SQL tier — no slot, none taken, no container started; all runs SQLite under Database!=SqlServer. F-MEALS-NO-SQL-ON-REQUOTE stands. No walk, so nothing meets C5.
RECOMMEND one gate for the merger: git merge-base --is-ancestor 9fe599c6 <merge-commit>. Landing 9fe599c6 satisfies it in one conflict-free merge; restate the flag's clears_when as that predicate.
OPS: the full tier rewrites tracked artifacts/journeys/ev-dietary/run-sheet.{json,md} with today's date, so git add -A after a tier run sweeps it. Restored by explicit pathspec.
FOOTPRINT: trial/meals-eighth-read-tipmerge and lane/meals-eighth-read @ 1995fb7f are local only, never pushed; pathspec commits; no stash; no shared branch, no container touched.
END RETURN
```
