# L-TENDER-WIRE-MERGE-IS-SAFE — measurements

All SHAs are **OkamAPI** unless the repo is named. `8e2b57de` = OkamAPI `feature/restaurant-modules`
(the integration tip). Web-modules SHAs are named as such. No container, no SQL, no push, no
shared-branch commit, no migration. Throwaway worktree `/Users/svendaneel/okam/wt-tendermerge`
and refs `throwaway/*` created and removed.

## 1. The true merge (exit criterion)

Family base = `fb522bdd` — "merge: base for L-UTLKVIT-REPRINT-KIND = sale-row (1854f594) +
replay-source (3a509b68)". It carries the consolidated predicate.

    git merge --no-ff fb522bdd <- lane/meals-pos-tender-wire (32fd5a86)
    => d5033c40   Merge made by the 'ort' strategy.   ZERO conflicts.
       8 files changed, 662 insertions(+), 2 deletions(-)

Files in the merge:

    Enums/Meals/MealsTenderAuthorizationOutcome.cs
    Services/Kassa/PosSettlementService.cs
    Services/Meals/DenyClosedMealsFundingAuthority.cs
    Services/Meals/Interfaces/IMealsFundingAuthority.cs
    Services/Meals/MealsFundingAuthority.cs
    Services/Meals/MealsTenderAuthorizationResult.cs
    WebApi.Tests/Meals/MealsFundingTestKit.cs
    WebApi.Tests/Meals/MealsPosCreditTenderReachabilityTests.cs

`FinalizeService.cs`, `PosReceiptService.cs`, `KassaCreditSale.cs` and both
`SaftCashRegisterExportService.*` files are **not** in the lane's diff. Its merge-base with the
family is `1a03bc6c` (`lane/meals-utlkvit`) — the lane branched off the family, so the family's
deletion of the private predicate is on its own first-parent line and simply survives.

Merge onto the current tip: `git merge 32fd5a86` into `8e2b57de` => **Already up to date.**
`lane/meals-pos-tender-wire` is 0 ahead / 61 behind — an **ancestor**.

## 2. Credit-sale predicate count at the result

At `d5033c40` (the merge) and at `8e2b57de` (the tip): **exactly one definition.**

    Services/Kassa/KassaCreditSale.cs:25   public static bool IsCreditSale(JournalEntry entry)

Six call sites, every one passing a **JournalEntry**, not a request payment list:

    Services/Kassa/FinalizeService.cs:237                          entry          (which document to hand over)
    Services/Kassa/FinalizeService.cs:304                          receiptEntry   (§ 2-8-7 handover present?)
    Services/Kassa/PosReceiptService.cs:131                        entry
    Services/Kassa/PosReceiptService.cs:386                        original       (reprint)
    Services/Kassa/SaftCashRegisterExportService.MasterData.cs:112 entry          (11002 basic-type row)
    Services/Kassa/SaftCashRegisterExportService.Transactions.cs:251 entry        (transType 11002)

The seventh twin is gone. At `32fd5a86` it was
`FinalizeService.cs:237  var isCreditSale = payments != null && payments.Any(p => p.PaymentType.IsCompanyAccount());`
— classifying off the **request** list. It exists on **zero** live heads that are not already
ancestors of the tip (tree scan of all 216 non-ancestor branches: 0 hits).

**The one site that reads a request is not a twin.** `PosSettlementService.cs:392`
`else if (request.PaymentType.IsCompanyAccount())` is the allocation branch — it decides which
tender path to take and then *writes* `PaymentType = PaymentType.CompanyAccount` into the
OrderPayment that becomes the journal payment line. It is the upstream cause of the predicate
being true, not a competing classifier of an entry.

## 3. Landing already happened, by merge

`21f79514` (2026-08-04) `Merge lane/meals-pos-tender-wire: the till can register a company tender`,
parents `9888178f 32fd5a86` — a real two-parent merge, 8 files, no conflicts. Its own message
records the same check I made independently. **The lane is landed; it should not be held.**

Reachability confirmed: at `fb522bdd` `PosSettlementService.cs:380` threw
`"Unsupported payment type for a settlement allocation."` for a company account. At `8e2b57de`
line 392 the branch exists and calls `_mealsFundingAuthority.AuthorizePointOfSaleTenderAsync(...)`.
Under C5 this is still a suite fact — no person has walked a credit sale at a till.

## 4. C4 — what the predicate decides on the money path

`FinalizeService.cs:237` gates `PosReceiptService.BuildDeliveryEntry(entry, operatorId, operatorName)`.
A true answer appends a **second actor-stamped append-only journal row** (UTLEVREC, the
utleveringskvittering required by kassasystemforskrifta § 2-8-7) inside the sale's own transaction,
chained off the sale's signature. So the predicate decides whether an operator-attributed evidence
row exists for a sale at all. Two definitions of it are an attribution question, not a duplication
smell.

The two bodies are **not** identical. The private copy lacks the `entry != null` guard:

    private  (lane/meals-w3-fiscal)   return entry.EventType != KassaEventType.RETREC && ...
    shared   (tip KassaCreditSale.cs) return entry != null && entry.EventType != KassaEventType.RETREC && ...

`FinalizeService.cs:304` applies the shared predicate to `receiptEntry`, which the null guard covers.
Re-landing the private copy reinstates the pre-guard definition under a name nobody watching the
shared one can find.

## 5. Who actually still carries it — not two lanes, eleven

Simulated **every** outstanding landing: 215 non-ancestor branches, `git merge-tree --write-tree`
onto `8e2b57de`, then counted definition files in the result tree.

    111 merge clean  -> 1 definition, Services/Kassa/KassaCreditSale.cs, in all 111
    104 conflict
    ----
    204 results hold 1 definition
     11 results hold 2

The eleven, all with merge-base `2431883d` (2026-07-17), which contains **no** credit-sale
predicate at all:

    feature/restaurant-control-stage0   lane/a5-events-w4      lane/b2-wf-exchange
    lane/a1-store-country               lane/a6-meals-minors   lane/b3-wf-timesheets
    lane/a2-growth-flake                lane/b1-training-w3    lane/meals-w3-fiscal
    lane/a3-tx-gate                                            prep/meals-w3-landing

**The corrected mechanism in the flag is itself incomplete.** For these eleven a plain
`git merge` reintroduces the private definition with no human involved and no marker shown:

    Services/Kassa/SaftCashRegisterExportService.MasterData.cs
      line 112   CONFLICT   KassaCreditSale.IsCreditSale(entry)  vs  IsCreditSale(entry)
      line 199   AUTO-MERGED-IN   private static bool IsCreditSale(JournalEntry entry)

Because the merge-base predates the predicate, the tip's *deletion* is not a deletion relative to
that base — the branch's *addition* is new content, and git keeps additions. Verified
`AUTO-MERGED-IN` for all eleven. So the human is prompted only at line 112 and is never shown the
definition that arrived at line 199.

`git cherry 8e2b57de lane/meals-w3-fiscal` reports every commit as `+` (not upstream). These are
pre-fork heads; their credit-sale work reached `feature/restaurant-modules` by a **port**, not by
ancestry. Merging one now is not landing new work — it is re-adding an older second copy.

Tree-keyed count, for contrast: **95** non-ancestor branches hold `private static bool IsCreditSale`
somewhere in their tree. That number answers the wrong question, which is why the merge simulation
is the measurement that counts.

**The family is growing correctly on the other side.** Three post-consolidation lanes extend
`KassaCreditSale.cs` itself rather than forking a twin: `lane/xz-credit-fields` (9bdfc267),
`lane/xz-printed-defects` (6c394057), `lane/eod-credit-split` (f028c0a8). All three contain
`9bdfc267`, so landing all three separately would land it three times.
`lane/paymenttype-defined-tender` (bd77cd6b) touches `FinalizeService.cs` and keeps the single
shared definition.

## 6. Which unsafe landing shape this estate actually uses

**The whole-file / whole-blob conflict resolution.** Not hypothetical — one day before this lane ran,
on a money path:

- **Web-modules `f1d177f`** (2026-08-05) `Reconcile the price-bypass twin pair: take c4a4fa44's side
  on the invoice page`. Its own message: *"Taken from c4a4fa44 (twin B), whole-blob"*. Three files
  including `pages/admin/kravia-invoice.vue` and a money-gate test. **`c4a4fa44` is not an ancestor
  of the candidate tip** — the content arrived without the commit. That is the port shape exactly.
- **Web-modules `9f7d8df`** (2026-08-05) is the correction to that reconciliation.
- **Web-modules `d320105`** was **cherry-picked** onto candidate tip `9f7d8df` in a detached
  worktree (plan.md:19672); it is an ancestor of `f40fdf36`.

Landing-shape rates, first-parent, last seven days:

    OkamAPI  feature/restaurant-modules      110 commits,  79 merges,  31 non-merge
    Web-modules candidate/fe-compose-...     123 commits,  54 merges,  69 non-merge

The frontend integration branch takes **more than half** its first-parent commits as hand-authored
reconciliations rather than merges. That is the habit the flag should be written against.

For the eleven branches above, git **cannot** auto-resolve `MasterData.cs:112` — a human must pick a
side. The estate's demonstrated answer to that prompt, one day ago, on an invoice amount, was to take
one side whole-blob.

## 7. Exact replacement `clears_when`

Replace:

    clears_when: the POS tender-wire lane classifies a credit sale off the appended journal entry and reads the one shared predicate, or it is rebased onto the lanes that closed those defects

With:

    clears_when: every landing onto feature/restaurant-modules leaves exactly one credit-sale predicate — `git grep -lE 'bool +IsCreditSale *\(' <result-tree> -- '*.cs'` naming only Services/Kassa/KassaCreditSale.cs — and the eleven pre-fork heads based at 2431883d, for which a plain merge silently re-adds the private one, are retired unlanded or reduced to the shared predicate before any of them is landed

Body sentences the clerk may add, since the `clears_when` cannot hold the list:

> The eleven are `feature/restaurant-control-stage0`, `lane/a1-store-country`, `lane/a2-growth-flake`,
> `lane/a3-tx-gate`, `lane/a5-events-w4`, `lane/a6-meals-minors`, `lane/b1-training-w3`,
> `lane/b2-wf-exchange`, `lane/b3-wf-timesheets`, `lane/meals-w3-fiscal`, `prep/meals-w3-landing` —
> all OkamAPI, all based at `2431883d`. For them the "merge is safe" correction does **not** hold: the
> private definition arrives **auto-merged, outside any conflict marker**, because their merge-base
> predates the predicate, so the tip's deletion has nothing to apply to. The only conflict git shows is
> the one-line call site, and resolving that is not enough.

## Reproduce

    bash docs/plan/lanes/L-TENDER-WIRE-MERGE-IS-SAFE/survey.sh       # tree-keyed carriage, all branches
    bash docs/plan/lanes/L-TENDER-WIRE-MERGE-IS-SAFE/mergesim.sh     # clean-merge results
    bash docs/plan/lanes/L-TENDER-WIRE-MERGE-IS-SAFE/conflictsim.sh  # conflicted-merge results
    bash docs/plan/lanes/L-TENDER-WIRE-MERGE-IS-SAFE/eleven.sh       # the eleven, auto-merged-in proof
