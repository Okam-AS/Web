RETURN: L-ONE-CREDIT-SALE-PREDICATE-AT-THE-TRUNK
brief: 3cc448cc
verdict: built
evidence: docs/plan/reviews/L-ONE-CREDIT-SALE-PREDICATE-AT-THE-TRUNK.md
log: invariant HOLDS at the composed landing tree fafd58b72: git grep -lE names only Services/Kassa/KassaCreditSale.cs; six call sites; shared body keeps the entry!=null guard the private copy lacks
merge-tree composition, every step clean: trunk 8e2b57de8 ⊂ patched 2ba9229fa; +growthaudit (base 7f8945dc6); +triggers ead8869ee (base 2ba9229fa); +planned-minutes (base de1e5c5e9)
order-independence probed: composing planned-minutes before the trigger lane yields the identical tree fafd58b72
planned-minutes carries the PRIVATE predicate at MasterData.cs:195 yet does not re-add it: base de1e5c5e9 also carries it, so the trunk extraction applies as a clean deletion — probed, not assumed
all eleven heads exist; merge-base with the landing side is 2431883da for every one; every tree holds the private predicate at MasterData.cs:195 and none holds KassaCreditSale.cs
eight of eleven (a1..a6, b1..b3) are one commit e88af7964, each 0 ahead — unadvanced pointers created from it; one merge probe covers all eight
probes vs the result tree: all four distinct heads re-add the private definition auto-merged at MasterData.cs:199 outside any marker; only the :112 call-site line shows a conflict
scale correction to the flag: vs today's composed tree none of the eleven merges is conflict-free overall (313-420 conflicted files each); the predicate re-add stays silent inside a noisy merge
git cherry vs the patched tip: 336/343/292/289 commits per distinct head, zero patch-equivalent upstream — ported by content, contained by nothing that will land
classification: all eleven must-be-reduced-before-landing; none retired, none already-reduced; only feature/restaurant-control-stage0 also exists at origin
object-scan trap respected: 3 of 8 MasterData.cs blob versions reachable in landing-input history hold the private definition; every absence claim is tree-scoped at a named revision
ruled: land the five queued inputs; land none of the eleven as-is; reduction = delete MasterData.cs:195-201, retarget :112 to KassaCreditSale.IsCreditSale, take KassaCreditSale.cs from trunk
never whole-blob-resolve SaftCashRegisterExportService.MasterData.cs in any merge touching these heads — the 2026-08-05 f1d177f habit defeats the merge geometry
trigger lane not yet finished: probed today's tip ead8869ee; re-run the one-line grep at the tip the landing actually produces
read-only held throughout: no commit, merge, rebase, push or branch deletion; no suite; no container touched
END RETURN
