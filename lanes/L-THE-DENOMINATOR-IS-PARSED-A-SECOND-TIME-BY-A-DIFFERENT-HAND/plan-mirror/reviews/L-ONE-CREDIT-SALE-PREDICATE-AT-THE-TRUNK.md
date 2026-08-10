# L-ONE-CREDIT-SALE-PREDICATE-AT-THE-TRUNK — evidence

Lane: L-ONE-CREDIT-SALE-PREDICATE-AT-THE-TRUNK · brief 3cc448cc · 2026-08-06
Repo measured: /Users/svendaneel/okam/OkamAPI-modules · read-only throughout (`git merge-tree --write-tree`, `git grep`, `git cherry`, `git cat-file` only; no commit, merge, rebase, push, or branch deletion; no suite, no container).

## Verdict in one line

The invariant HOLDS at the tree the backend landing will produce — exactly one `IsCreditSale` definition, at `Services/Kassa/KassaCreditSale.cs` — and all eleven pre-fork heads still exist, all still carry the private predicate, none is reduced and none is retired: **all eleven classify as must-be-reduced-before-landing** (or retired instead of landed).

## 1. The landing result tree, composed without touching anything

Inputs, exactly what `L-LAND-THE-BACKEND-ON-THE-TRUNK` is gated on (its needs list in plan.md):

| input | ref | head | relation |
|---|---|---|---|
| trunk | `feature/restaurant-modules` | `8e2b57de8` | base; has not moved |
| composed stack | `integration/mig-stack-merge` | `7f8945dc6` | ancestor of patched tip |
| patched tip | `lane/backend-patches-composed` | `2ba9229fa` | trunk is its ancestor → that step is fast-forward-shaped |
| growthaudit | `lane/growthaudit-migration` | `93a52938e` | based at the stack tip `7f8945dc6` |
| trigger declarations | `lane/trigger-declarations-refreshed` | `ead8869ee` | based at the patched tip `2ba9229fa` (lane still running; tip as of today) |
| planned minutes | `lane/planned-minutes-honour-lineage` | `589056dfb` | git merge-base with trunk AND patched tip is `de1e5c5e9` (single base at git level; the "two-base" note resolves to this — its line runs `de1e5c5e9 → 34c6c103 → e956337ed` (rescue snapshot) `→ 5243c06a7 → 589056dfb`, never through the stack) |

Composition, every step `git merge-tree --write-tree` with the measured base, every step exit 0 (clean):

1. trunk + patched tip → tree of `2ba9229fa` (ancestor relation, no merge needed)
2. `merge-tree lane/backend-patches-composed lane/growthaudit-migration` → `67e92c52b…` clean
3. `merge-tree --merge-base=2ba9229fa 67e92c52b… lane/trigger-declarations-refreshed^{tree}` → `97efbc10a…` clean
4. `merge-tree --merge-base=de1e5c5e9 97efbc10a… lane/planned-minutes-honour-lineage^{tree}` → **`fafd58b72ba96a9364c5b792876dceeaeed8a3dc`** clean

Order-independence probed: composing planned-minutes before the trigger lane produces the **identical** tree `fafd58b72…`.

### Invariant at the result tree

```
$ git grep -lE 'bool +IsCreditSale *\(' fafd58b72ba96a9364c5b792876dceeaeed8a3dc -- '*.cs'
Services/Kassa/KassaCreditSale.cs
```

Exactly one definition. `MasterData.cs:112` calls `KassaCreditSale.IsCreditSale(entry)`. Six call sites: `FinalizeService.cs:237,:304`, `PosReceiptService.cs:131,:386`, `SaftCashRegisterExportService.MasterData.cs:112`, `SaftCashRegisterExportService.Transactions.cs:251`. The shared body carries the `entry != null` guard the private copy lacks.

### Why planned-minutes does NOT re-add it, despite carrying the private predicate

`lane/planned-minutes-honour-lineage`'s tree holds the **private** predicate at `MasterData.cs:195` and no `KassaCreditSale.cs` — but its merge base `de1e5c5e9` (2026-08-01, post-fork trunk line) **also holds it**, so the trunk side's extraction is a clean deletion the merge applies. Probed, not assumed: step 4 was clean and the result holds one definition. This is the exact inverse of the eleven's geometry and the reason base position, not tree content, decides the hazard.

### Caveat

`L-TRIGGER-DECLARATIONS-REFRESHED` is still running; I probed its tip as of today (`ead8869ee`, holds only the shared predicate). If its tip moves before the landing, re-running step 3–4 and the grep is two commands.

## 2. The eleven pre-fork heads, classified

Fork base `2431883da` (2026-07-17) holds **no** `IsCreditSale` at all — confirmed by tree grep. All eleven share it as merge base with the landing side. All eleven trees hold `private static bool IsCreditSale(JournalEntry entry)` at `Services/Kassa/SaftCashRegisterExportService.MasterData.cs:195` and **no** `Services/Kassa/KassaCreditSale.cs`. The private body lacks the `entry != null` guard (C4-relevant: it gates `BuildDeliveryEntry`, the operator-stamped UTLEVREC row).

| # | ref | head | exists | reachable from landing set | merge re-adds private predicate | classification |
|---|---|---|---|---|---|---|
| 1 | `feature/restaurant-control-stage0` | `903b70d14` | yes (local + origin) | no | YES (probe `ac651f0a1…`) | must-be-reduced-before-landing |
| 2 | `prep/meals-w3-landing` | `2345f12c1` | yes (local only) | no | YES (probe `e73106433…`) | must-be-reduced-before-landing |
| 3 | `lane/meals-w3-fiscal` | `edb2fcf68` | yes (local only) | no | YES (probe `629faa018…`) | must-be-reduced-before-landing |
| 4 | `lane/a1-store-country` | `e88af7964` | yes (local only) | no | YES (probe `ccee9c48f…`) | must-be-reduced-before-landing |
| 5 | `lane/a2-growth-flake` | `e88af7964` | yes (local only) | no | YES (same probe) | must-be-reduced-before-landing |
| 6 | `lane/a3-tx-gate` | `e88af7964` | yes (local only) | no | YES (same probe) | must-be-reduced-before-landing |
| 7 | `lane/a5-events-w4` | `e88af7964` | yes (local only) | no | YES (same probe) | must-be-reduced-before-landing |
| 8 | `lane/a6-meals-minors` | `e88af7964` | yes (local only) | no | YES (same probe) | must-be-reduced-before-landing |
| 9 | `lane/b1-training-w3` | `e88af7964` | yes (local only) | no | YES (same probe) | must-be-reduced-before-landing |
| 10 | `lane/b2-wf-exchange` | `e88af7964` | yes (local only) | no | YES (same probe) | must-be-reduced-before-landing |
| 11 | `lane/b3-wf-timesheets` | `e88af7964` | yes (local only) | no | YES (same probe) | must-be-reduced-before-landing |

Notes that sharpen the table:

- **Eight of the eleven are one head.** `lane/a1…a6, b1…b3` were each *created from* `e88af7964` (reflog: "branch: Created from e88af796") and are **0 commits ahead** of it — unadvanced pointers to a single pre-fork commit (2026-07-22, "Claude (margin-landing)"). One merge probe covers all eight; retiring seven of the eight loses nothing the others don't hold.
- **`git cherry` against the patched tip (limit `2431883da`)**: `e88af7964` 336 commits, `903b70d14` 343, `2345f12c1` 292, `edb2fcf68` 289 — **zero patch-equivalent upstream** in every case. The flag's "ported" is by content, not by commit; nothing about these heads is contained in what will land.
- None is retired (all refs live), none is already-reduced (all still private-only) — so the three-way classification collapses to the third bucket for all eleven.

### The silent shape, reproduced exactly

Probe merge of any head against the landing result tree (`--merge-base=2431883da`): the **only** conflict in `MasterData.cs` is the one-line call site —

```
<<<<<<< fafd58b72…
                    else if (KassaCreditSale.IsCreditSale(entry))
=======
                    else if (IsCreditSale(entry))
>>>>>>> <head>^{tree}
```

— while the private definition arrives **auto-merged at `MasterData.cs:199`, outside any marker**. Resolving the visible line to "ours" still leaves the private definition in the file. That is the flag's measured mechanism, confirmed against today's composed result tree.

One correction of scale against the flag's older measurement: against **today's fully-composed result tree** none of the eleven merges is conflict-free overall (313–420 conflicted files each, from the queued lanes' breadth). The predicate re-add itself is still silent; the merge around it no longer is. The hazard is unchanged — a resolver grinding through 400 conflicts will not see the one file that auto-merged wrong.

## 3. The measured trap, respected

Tree greps at the five landing tips show the private predicate only on planned-minutes' line — but an **object-level scan** of landing-input history finds 8 distinct blob versions of `MasterData.cs`, of which **3 carry the private definition** (reachable via `de1e5c5e9`, the rescue snapshot `e956337ed`, `5243c06a7`). History retains it; merges consume trees. Every absence claim above is tree-scoped at a named revision or probe tree, never a cross-ref content claim.

## 4. Ruled changes (named, not made — this lane edits nothing)

1. **`L-LAND-THE-BACKEND-ON-THE-TRUNK` may land its five queued inputs as composed** — the result tree `fafd58b72…` satisfies the one-predicate invariant. Re-run the two-line grep at the actual produced tip, since the trigger lane may still move: `git grep -lE 'bool +IsCreditSale *\(' <tip> -- '*.cs'` must name only `Services/Kassa/KassaCreditSale.cs`.
2. **Land none of the eleven refs as they stand.** For any that is ever to land, reduce first, on the head itself: delete the `private static bool IsCreditSale` block at `Services/Kassa/SaftCashRegisterExportService.MasterData.cs:195–201`, change `:112` to `KassaCreditSale.IsCreditSale(entry)`, and bring in `Services/Kassa/KassaCreditSale.cs` from the trunk. Heads not worth that work: retire the ref (owner action — this lane may not delete branches).
3. **Never resolve `SaftCashRegisterExportService.MasterData.cs` by whole-file/whole-blob take in any merge involving these heads** — the estate used that move on a money path on 2026-08-05 (`f1d177f`, Web-modules), and it is exactly the move that defeats the merge geometry protecting the shared predicate.
4. The eight unadvanced pointers (`a1…a6, b1…b3` @ `e88af7964`) are seven-ways redundant; a single retire-or-reduce decision on `e88af7964` disposes of all eight.
