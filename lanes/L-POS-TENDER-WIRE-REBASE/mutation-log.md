# L-POS-TENDER-WIRE-REBASE — mutation log

Baseline commit: **`8e2b57de`** (the integration tip named by the orchestrator), measured in a private
worktree `/Users/svendaneel/okam/wt-postender-rebase` created detached at that commit. The shared
`OkamAPI-modules` checkout (which has `lane/meals-grace-pins` out at `34c6c103`) was never touched.

**Submodule state:** the backend repo has **no `.gitmodules` and no `core` directory** — the census §5.1
`F-CORE-PIN-ON-NO-REMOTE` caveat is a *frontend* concern and does not qualify any backend receipt here.
Recording this because §5.1 requires every post-merge receipt to state it.

**Container state:** every run below is **container-free** (`Database!=SqlServer`). No container was
started; the SQL tier is out of scope and is named as a scope limit, not as a pass.

---

## 1. The premise, tested first

The brief asserts the branch "carries a seventh twin" that must be rebased. **The branch needs no rebase:**

| claim | measured | verdict |
|---|---|---|
| `lane/meals-pos-tender-wire` is in the merge set | `git merge-base --is-ancestor lane/meals-pos-tender-wire 8e2b57de` → **true**; `rev-list --left-right --count` → **61 / 0** | **false** — already an ancestor; merging is a literal no-op |
| it carries a seventh twin | true **at `32fd5a86`**: `FinalizeService.cs:237` was `var isCreditSale = payments != null && payments.Any(p => p.PaymentType.IsCompanyAccount());` | **was true, now moot** |
| two other lanes carry the original private predicate | **~130** live branches carry `private static bool IsCreditSale` in `SaftCashRegisterExportService.MasterData.cs` | **false — off by ~65x**, and the number is meaningless (below) |

The census (`lanes/L-COMPOSE-CENSUS/compose.md:447`) already classifies this branch under
**"Contained (ancestor) — merge is a no-op, do not merge"**. The brief and the census disagree; the census
is right.

### Definitions, not files — before and after

| | at branch tip `32fd5a86` | at integration tip `8e2b57de` |
|---|---:|---:|
| `KassaCreditSale.IsCreditSale` (shared, takes `JournalEntry`) | 0 | **1** |
| `SaftCashRegisterExportService.MasterData` private static | 1 | 0 |
| `PosReceiptService` internal static | 0 | 0 |
| inline `payments.Any(...)` in `FinalizeService` | 1 | 0 |
| **total definitions** | **2** | **1** |
| call sites reading the one definition | — | **6** |

The consolidation landed via `3a509b68` (replay-source) and `1854f594` (sale-row), composed at `fb522bdd`.

### The ~130-branch number is noise — merging cannot resurrect the twin

Counting *files* that still contain the old private predicate says nothing, because those branches never
*modified* it: git's 3-way merge takes the tip's deletion. Proved by simulating every merge rather than
grepping — `git merge-tree --write-tree 8e2b57de <branch>`, then counting definitions **in the resulting
tree**:

> **111 of 111** outstanding (not-contained, non-stale-epoch) branches yield **exactly 1** definition.
> **Zero** yield 2. Raw data: `merge-sim.tsv`.

This includes `lane/wf-bootstrap-one-engagement`, the census's B1 and the first real merge in the order.

---

## 2. The classification-source proof

Both sources answer identically in the ordinary case, so the tests must be built on a world where they
**disagree**. A replay is that world: on the idempotency short-circuit the append never runs, so the
request's payment list describes nothing that was registered. Those tests already exist at the tip
(`WebApi.Tests/Kassa/DeliveryReceiptComplianceTests.cs:194,222`), pinned in both directions.

Mutations reintroduce the **request-payment-list** shape and confirm each direction reds.

| # | mutation | expectation | result |
|---|---|---|---|
| baseline | none | green | **18/18 pass** (routing + compliance); wide scope **1209 pass / 0 fail / 3 skip** |
| **M1** | `FinalizeService:304` classifies off `payments` instead of `receiptEntry` | mirror drift reds | **RED ×1** — `ReplayingACashSaleWithADriftedPaymentList_StillHandsOverTheSalesReceipt_AndJournalsNoDeliveryDocument` |
| **M2** | handover lookup gated on `payments` instead of read from the journal | forward drift reds | **RED ×1** — `ReplayingACreditSaleWithADriftedPaymentList_StillHandsOverTheUtleveringskvittering` |
| **M3** | delete the `EventType != RETREC` guard from the shared predicate | ? | **GREEN — nothing reds** (see finding) |
| **M4** | `IsCreditSale` always returns `false` (vacuity control) | many red | **RED ×15**, incl. `CompanyAccount_sale_journals_as_transType_11002_creditSale`, `Mixed_window_declares_both_cash_and_credit_transaction_codes` |
| restore | — | back to baseline | **1209 pass / 0 fail / 3 skip** ✔ |

**Two distinct mechanisms hold the two directions**, which is why one mutation could not have proved both:
the *mirror* direction is held by the predicate at `:304` reading `receiptEntry` (the entry a *previous*
finalize committed), and the *forward* direction is held by the handover lookup reading `UTLEVREC` from the
journal by `OrderId`. M1 alone leaves the forward test green; M2 alone leaves the mirror test green.

M4 is the control that makes M3's green interpretable: the scope genuinely exercises the predicate.

### Stale-build trap, hit and caught

The first wide baseline reported 1 failure against *restored* source. Cause: `--no-build` measured the
previous binary, still containing M2 — the exact trap `CLAUDE.md` documents. Every mutation result above
was taken from a run that **compiled**, verified by assembly mtime moving
(`1785881848 → 1785881942 → 1785882219 → 1785882896`).

---

## 3. Finding: the RETREC guard is a dead branch

`Services/Kassa/KassaCreditSale.cs:28` — `&& entry.EventType != KassaEventType.RETREC`. Deleting it reds
**nothing** across 1209 container-free Kassa+Meals tests, while M4 proves the same scope reds 15 tests when
the predicate is broken. The guard's own comment concedes the case "does not arise".

**Not removed.** It is a defensive guard on a money path, it landed under a Sven ruling, and it is outside
this lane's exit criteria — the owner's call. Scope limit: unpinned by the container-free tier; a SQL-tier
test could still depend on it, and no container was started to check.

## 4. Constraints

- **C1** (append-only) — held: the replay path *reads* `UTLEVREC` (`AsNoTracking`, `FirstOrDefaultAsync`)
  and never repairs it; the mirror-drift test asserts **0** `UTLEVREC` rows are written for a kontantsalg.
- **C4** (actor) — held at this site: `PosReceiptService.BuildDeliveryEntry(entry, operatorId, operatorName)`
  carries the resolved operator; no ambient or hard-coded system actor.
- **C3** (reachability) — the brief's stated reason for not dropping the branch is **also already resolved
  at the tip**. `PosSettlementService.cs:392` now handles the company-account allocation (its own comment:
  "Until this branch existed the register could not register the tender at all"), and the real
  `IMealsFundingAuthority` is DI-registered at `Program.cs:875`, replacing the W1 `DenyClosed` default — so
  the seam is not a deny-closed null. Service + registration are present. **Route/navigation and an operator
  actually completing the journey were not checked by this lane** (C5 — no person has walked it).
- **C5** — nothing here is acceptance. No person has walked the till journey. These are suite facts only.

## Artifacts

`merge-sim.tsv` · `baseline-wide.trx` · `mut-01.trx` · `mut-02.trx` · `mut-03-retrec.trx` ·
`mut-04-vacuity.trx` · `restore-final.trx`
