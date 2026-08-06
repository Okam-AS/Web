# Fable review — L-MRG-WASTE (2026-08-01)

Read-only review. Nothing was executed; all backend execution evidence is the committed `.trx`, parsed
independently.

## 1. Verdict — sound-with-conditions

**The backend half is the strongest artifact reviewed on this branch.** The migration, trigger, layer-1
guard, service and DI are correct as far as can be determined. **Every headline number in the receipt
reproduces exactly from the committed `.trx`** — 568/568 with 0 skipped, fast 4342/0/9, +11/−0 and +29/−0
set-against-set, and skip-set identity. The drop-the-trigger falsification, the open-week controls, the
`sys.foreign_keys` pre-check and the correction-revision guard fix are all real code doing what the record
says.

**The conditions are on the frontend half and on one precision claim.** The merged frontend carries a cluster
of operator-facing defects; the frontend suite has no receipt; and the record repeatedly attributes to one
test a falsification power it does not have. **Nothing here requires reworking the migration.**

## 2. Defects, most severe first

**D1 — the absent-vs-empty skew is confirmed, live, and test-pinned.** `readWasteSummary` maps an absent
waste block to zeros on a comment — *the server always sends it* — that is false for every backend on the
integration branch, so the coverage panel prints *"Nothing has been recorded as waste in this window"*
against a server with no waste surface. Thirty lines below, `readWasteEntries` maps absent to null. **On
today's branch both fire on one screen**: the coverage panel claims nothing recorded while the entries panel
says it could not fetch. It does not resolve at backend merge, because web and API deploy independently —
and **both directions are pinned by tests**, so any fix must flip one.

**D2 — the waste form renders, permanently un-submittable, on an Open correction revision of a frozen week.**
The page consults only the selected revision's state. The backend rules — proven by *this lane's own test* —
that a week stays frozen once any revision is finalized. So the form renders and every submission is refused,
violating the panel's own stated law that a finalized week carries no form at all.

**D3 — all four coded waste refusals render as the generic error.** The page's error map contains none of
them, and the client quotes verbatim only *uncoded* refusals. The backend's own source says the codes exist
*because the admin client keys its rendering on codes and never on sentences* — **and the same lane's client
keys on none of them.** Waste refusals therefore render worse than the statement surface's uncoded ones,
which at least get quoted.

**D4 — the quantity input is unvalidated.** `Number(quantity.replace(',', '.'))` turns "2,5 kg" into NaN,
which serializes as null, which the server accepts — recording an **unvalued entry with no quantity**,
silently discarding what the operator typed and understating the floor, on the surface whose commit message
is about never understating. The value field, by contrast, goes through five coded errors.

**D5 — a foreign or nonexistent ingredient id is an unhandled 500.** The service never verifies the
ingredient exists in the store; the composite foreign key refuses at save and the controller does not catch
it. **Isolation itself holds** — the key carries the store id and the id is globally unique, so nothing
leaks — but the failure shape is the exact 500-on-operator-input the same file spends code avoiding.

**D6 — the last-day test does not exercise the trap the record cites it for.** It inserts a **date-only
literal**, which converts to midnight under either column type and is caught by the inclusive range either
way. The advertised failure — a row stamped midday on the period's last day — can only exist under the
regressed type, and **this test would pass against that regression.** The actual protection is the type pins,
which are real and sufficient. Three separate documents attribute the falsification to the wrong test.

**D7 — the timesheet-branch coupling is exactly as the lane stated, and the risk window is now.** Verified:
that branch sits at this lane's tip, byte-identical, with zero commits of its own, so its migration tail is
this unmerged migration. Today the coupling is free to undo. **The moment it authors its own migration, any
rework here — including a rollback if the scope departure is refused — invalidates its chain.** The tail it
inherited belongs to an unratified-scope migration.

**D8 — minor.** The falsification test hand-copies the trigger body, so amending the real trigger would
certify a stale copy. A migration comment justifies an explicit trigger drop with a failure mode SQL Server
does not have — dropping a table drops its triggers. Coverage hands raw dates to one reader and normalized
dates to another. No stale-token test on this surface at the SQL tier.

## 3. Claims the artifacts do not support

- **The five mutation checks are pure process claims.** No committed artifact records any red run; the trx
  shows only the final green. Plausible and consistent with the estate's build-staleness law, but
  untraceable.
- Tree-asserted-empty, chain-tip-rechecked, container attribution, host disk figures — all process claims,
  unverifiable now.
- **The frontend suite has no receipt at all.** The committed jest artifact predates the frontend commit.
  "Proven by 22 frontend tests" is backed by test *code* only, and the count matches no partition that can
  be reconstructed — 28 by one count, 40 backend-side by another.
- **The trx-to-commit binding is the receipt's word.** The trx corroborates the worktree paths and the
  timings, but a trx embeds no git SHA.
- **Everything else traces**, including the identity of the nine pre-existing skips across both runs, the
  THROW number being genuinely unclaimed, the Designer parent, the ledger entry, the spec amendment, and the
  eleven-not-ten self-correction.

## 4. Assertions that could pass against broken code

- The last-day test passes against the regression it is named for (D6).
- **The absent-summary frontend test is worse than unable-to-fail: it is a well-formed assertion pinning the
  defective behaviour** (D1).
- The page-level waste tests drive the methods directly, so the template's event bindings are unexercised —
  a broken binding passes the suite.
- One equality test would hold if both reads degenerated to zeros; it is protected only by sibling tests
  pinning non-zero constants. Acceptable, but not self-sufficient.
- **The translation mock returns the key**, so the frontend tests prove key *usage* and never that the three
  locales define the ~35 keys. A missing translation ships as a raw key with the suite green.
- **Affirmatively cleared after hunting all five shapes:** the tenant sweep's equality is *not* vacuous — a
  successful cross-tenant write fails a type assertion before any equality is compared; the guard message
  matches are specific and fail closed; the empty-fold returns zeros only where zeros are the asserted answer
  with a seeded non-empty control alongside; and the trigger-attribution test derives its scope from the
  migrations directory, so this migration is mechanically inside it.

## 5. What could not be determined

Nothing was executed. Whether the five mutation checks happened cannot be settled by any artifact. Whether
the frontend tests pass at that commit has no receipt. Whether every production statement writer stores the
period end at Sunday midnight — the trigger's last-day correctness depends on that convention, proven for
chain-built and world-seeded data but not audited in the pre-existing creation path.
