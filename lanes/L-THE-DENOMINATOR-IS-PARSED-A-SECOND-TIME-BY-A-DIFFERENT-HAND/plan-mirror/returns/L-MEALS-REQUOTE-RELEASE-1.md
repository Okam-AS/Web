```
RETURN: L-MEALS-REQUOTE-RELEASE
brief: 4e7c74cc
verdict: built
evidence: /Users/svendaneel/okam/wt-mealsrequote/lanes/L-MEALS-REQUOTE-RELEASE/evidence.md
log:
Finding verified (client path is ConsumerWeb/core/pinia/checkout.ts, not Web-modules'). HOME: the
server, but the caller NAMES the token. Inference is refuted by measurement — it breaks
Quote_over_the_period_allowance_is_denied (15000+10000 vs 20000 must refuse) and the AllowanceMinor/cap
winner count, because a re-quote and a second cart are the SAME request here. Client-only leaves other
clients and direct API callers double-holding. So: server releases, client names what it supersedes.
Optional SupersedesToken, released inside the quote txn BEFORE the compare-and-increment; Reserved +
owned + unexpired + same guard row only, every mismatch a silent no-op. NO MIGRATION (existing column).
Expired left to the sweep, Bound never taken — no second bound strand, so the grace pins are untouched.
Journey ALLOWANCE_MINOR 50000 -> 25000, run BOTH ways at 25000: with the fix it passes; with the client
naming nothing it FAILS (re-quote refused over allowance, no confirmation). Backend mutants: release
neutered = 3 red; release moved after the increment = money pin red. Green after each restore.
Four-way merge with floor-pins/grace-pins/degenerate-two: no conflict, all pins green, 51/51 SQLite.
No file overlap with L-MEALS-RELEASE-ACTOR; C4 here is attribution-by-invariant (owner AND token holder, no ambient route) — the actor COLUMN is still owed to that lane, and the code says so.
BREACH: a filter substring hit nested *SqlServerTests and started a container I had no slot for; removed
within a minute, other lane's untouched, rerun container-free. MealsFundingConcurrencyTests not run.
END RETURN
```
