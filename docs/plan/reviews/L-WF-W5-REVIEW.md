# Fable review — L-WF-W5-TIMESHEET (2026-08-02)

Read-only review of `lane/wf-w5-timesheet` @ `9e82b286`. No file edited, no suite run. Cross-checked against
every branch in the repo, the committed artifacts, and both trx files.

## 1. Verdict — sound-with-conditions

**A genuinely well-built lane whose hardest claims all verify against the artifacts.**

**The FK-before-trigger masking is closed the way the sibling lane closed it** — asserted from the system
catalogs, both directions, **plus an executed drop-trigger falsification.** The flag enforcement is real and
the withheld-set removal is **exactly what the deleted entry's own text demanded.** The provisional
test-side seam is genuinely superseded and deleted. The 26-test scope **is the right scope for the exit.**
C3 and C4 hold. And every structural claim in the brief — five migrations behind, mutual non-ancestry, the
THROW bands — **checks out to the digit.**

The conditions are one unmapped race, one unguarded duplicate window, one tautological assertion, and the
honest fact that the mutation runs and the full tier are process claims without artifacts.

## 2. Defects, most severe first

**D1 — the loser of a concurrent approve race gets a 500, not a refusal.** Two approvals of the same range
with *different* idempotency keys both pass the precondition, both stage a period with the **same derived
primary key**, and the loser's save throws — which **nothing maps**: the service has no catch and the
controller catches only two other types. **The estate has both the law and the pattern for this** — a
commit whose message says *the loser of a release race is owed a refusal, not a 500*, and a sibling service
that catches exactly this. **It is a sibling of the very 500-shape this lane fixed for over-wide ranges: it
found one and missed the other.**

**D2 — concurrent distinct-key exports produce duplicate full batches with no database-level guard.** The
last-succeeded read happens pre-commit, so two callers with different keys both see nothing and both write.
The only unique index is on the per-request key, **so it cannot refuse the second.** This is the
`AccountingSummaries` double-post shape. **The mitigation is real** — the payloads are byte-identical and
provably deterministic, so the accountant gets an obvious duplicate rather than two conflicting months — but
**the ledger's rationale addresses a different question entirely** and nowhere acknowledges this window. The
same window exists on the adjustment path. Constrain it or record it as an accepted residual.

**D3 — one assertion cannot fail, and it is in the lane that reported finding one in itself.** A digest
comparison compares a value **with itself** whenever the file name is present. It reads as *the served bytes
match the recorded digest* and verifies nothing of the sort. The real check exists elsewhere for the
full-export path, so no property is actually unguarded — but this is **the seventeenth unfalsifiable
assertion of the estate's hunt.**

**D4 — the executed falsification covers one trigger of four.** The other three rest on THROW-number
pinning, definition content and proven foreign-key absence — strong, and one rung below an executed proof.

**D5 — wire reachability is inferred, never exercised.** No test touches the routes; every test hand-builds
the controller and service, **bypassing routing, JSON model binding and the production DI graph.** The
registrations exist and every dependency is registered for sibling services, so the risk is low — but
*reachable over HTTP* is convention here, not artifact.

**D6 — minor.** The determinism test compares two back-to-back renders, so a coarse-granularity varying
value would pass it. Another lane's journey artifact was rewritten twice with only timestamps moving. And
the evidence says the sibling tip was three migrations ahead; **it is four.**

## 3. Claims the artifacts do not support

- **The eight mutation runs.** The table is self-reported; the script is committed and **correctly
  implements the stale-build countermeasure**, but per-run outputs went to a temporary path and were
  overwritten. Reading the named tests makes each claimed red *plausible* — **and plausible is not proven.**
- The aborted first attempt's partial count, and the no-foreign-container claim — no artifact either way.
- **The fast-tier number.** The committed console log says exactly what the lane claims; **the trx says a
  different total and is from an earlier run.** Both trx files are **gitignored and uncommitted**, so on push
  neither receipt travels. The evidence is candid that no clean-checkout receipt exists — **that candour is
  to its credit** — but the artifact status is: console log yes, trx no.
- **"Three estate guards fired"** is unverifiable as a process event. What *is* verifiable: the artifacts
  each guard would demand exist, and **none is a workaround** — the census probe drives the real endpoint
  behaviourally, the audit writer refuses a blank actor, the market entries carry a provable coverage
  argument, and the allowlist additions are shape-only keys at the documented fail-closed extension point,
  **not a denylist dodge.**

**Every claim in the review prompt itself is true** — including, worth stating since two clerk briefs
recently asserted phantoms, that the pre-state really did contain the provisional seam with its replace-me
header and the two skipped journey gaps.

## 5. The migration verdict

**MIG-24 is safe where it sits.** Its THROW band collides with nothing on any branch. Its down-migration
drops triggers before tables. The round-trip and the pending-model-changes check both passed **on the
chain-built catalog at this content — confirmed in the trx, not merely claimed.** No foreign keys, no
rowversion; and the SQL tests exercised **production-service inserts** against the triggered tables, so the
error-334 reasoning is proven rather than asserted.

**Landing it requires four things.** Accepting that merging this branch **adopts the whole detached
five-migration chain** — two Margin, one Workforce and one Training migration from other unmerged lanes ride
in front of it, and **this branch is now the true chain tip everything else must converge on.** Serializing
the merge on the shared anchors, all of them four-lane-contested. Re-running the round-trip, both lineage
exact-set suites and the **full** SQL tier on the merged model, **since every number here predates any
merge.** And cutting clean-checkout receipts at the landing commit, which this lane explicitly did not
produce.

## 6. What could not be determined

Whether the full SQL tier passes at this content — only the 26-test scope ran, and the host-contention
account is plausible against the estate's container cap. Whether the mutation runs happened as recorded.
The actual HTTP-serving behaviour of the five endpoints. And the aborted attempt's partial count.

**The lane's account is accurate with the exceptions named, including its own limitations, which it states
rather than buries.** The defects that matter are the two concurrency gaps; both have established estate
patterns for the fix, and **neither undermines the immutability or flag-enforcement proofs, which are the
strongest seen on this estate for a new table family.**
