```
RETURN: L-MEALS-SUPERSEDE-SQL
brief: 77e42a48
verdict: built
evidence: /Users/svendaneel/okam/wt-mealssupsql/lanes/L-MEALS-SUPERSEDE-SQL/evidence.md (commit 7dafec47; trx supersede-sql-clean, mutant-clamp, mutant-repeat-decrement, mutant-no-detach, trait-guard)
log:
Base 702d9481 (four-way merged), not d5483cb3: it is a descendant of the re-quote commit AND the only tree carrying the strengthened grace pin the brief also asks for, so one container covers both.
MealsRequoteSupersedeSqlServerTests: 3 pins on a migrated catalog. supersede-sql-clean.trx = 18/18 passed, 0 failed, 51s — 3 new + concurrency 2 + strengthened grace SQL 2 + policy-pin 2 + the 9 SQLite twins.
THE DETACH PATH IS NOW PROVEN AND LOAD-BEARING. Transient failure injected at TransactionCommitting on an EnableRetryOnFailure context (production's config); the strategy re-runs the delegate and the release re-reads. Remove the detach: that ONE test reds, 16000 vs 11000 — cap freed never, row Reserved again. The other two SQL pins and all nine SQLite twins still pass with it removed, which measures the brief's claim rather than repeating it.
CLAMP REDS AT THE SQL TIER, first time in this module. Every guard read carries an uninvolved 6000 hold. Clamp: 3/3 red, money pin Expected 11000 Actual 5000. Repeat decrement: 3/3 red, money pin Actual 6000 — the residual, exactly as briefed.
BRIEF CORRECTED BY MEASUREMENT: a clamp reads 5000, not zero. Zero is unreachable for any pin that reads the guard after the re-quote's own increment lands — the clamped row is 0 and the new cap is added to it. 5000 vs 6000 still tells the two defects apart, which was the requirement.
MealsFundingConcurrencyTests RAN under the new code for the first time: both tests pass, so the 10-winner count is now a measured result and no longer an argument from source.
Expired_bound_reservation_release_and_exception_persist_on_real_sql_server: first execution anywhere. Passes.
NO PRODUCTION CODE CHANGED — MealsQuoteService.cs byte-identical to base after all mutation work (diffed against a pre-mutation copy). Test-only lane; the release already behaved, it had never been asked.
DEFECT FOUND, NOT FIXED: CreateQuoteAsync is not retry-safe against a transient failure raised INSIDE its SaveChanges — reservation+receipt stay Added across the retry, the receipt unique key collides, and the caller gets InvalidOperationException("...no receipt was found") instead of a quote. Pre-existing, older than the re-quote change; it is why the injection point here is the commit. Wants its own lane.
Did NOT collide with L-MEALS-EIGHTH-PIN: it is editing MealsRequoteSupersedeTests.cs uncommitted in wt-mealseighth; I added a new file and never touched that one. Its pin had not landed, so I could not run it; my SQL tests carry the same bystander remedy independently.
Containers: one, mine, started by the granted MealsSqlServerFixture slot and reaped by its own ryuk. okam-lws-sql (no testcontainers label, operator name, no ryuk) and zen_pasteur (session dc42565a, another lane's) untouched — attributed by LABEL, snapshotted before and after.
Filters were positive whitelists with a trailing dot; SqlServerContainerTraitTests 3/3 with zero testcontainers lines confirms the new class is excluded from the container-free tier by construction.
No --no-build anywhere; every mutant applied and restored by writing the file. Full fast tier not re-measured — measured at this same commit by L-MEALS-FOURWAY-TIER (4366/4378) and the new file is trait-excluded from it.
C2 Migrations/ untouched, no migration authored, no THROW number claimed. C4 every test drives the release as the resolved employee actor. C7 all six trx scanned for Password=/SA password/eyJ/Bearer/token: zero hits. No migration run against anything but a 127.0.0.1 Testcontainer.
C5: this is NOT acceptance. It is a suite result on a real database, not a person completing a journey. Local commits only; nothing pushed. Tree clean at the commit apart from lanes/.
END RETURN
```
