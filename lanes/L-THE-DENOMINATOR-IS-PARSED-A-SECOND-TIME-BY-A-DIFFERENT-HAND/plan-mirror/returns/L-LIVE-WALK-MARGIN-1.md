```
RETURN: L-LIVE-WALK-MARGIN
brief: 31c10d91
verdict: blocked
evidence: lanes/L-LIVE-WALK-MARGIN/evidence.md
needs: +F-SQL-HEADROOM
log:
NO RUN CLAIMED. No container, no process, NO PORT BOUND — 4010/4971/4973 untouched, all foreign. Read-only at web 8ac6f63 / api 8e2b57de (clean). Nothing written outside my lane dir.
MARGIN HAS NEITHER SIBLING DEFECT — worth more than the capture. Resolver REGISTERED, master DECLARED, and the override BEATS the master, so the lever really works on a live world.
FLAG WRONG: F-GROWTH-MODULE-LEVER-CANNOT-TURN-ON says "just one is registered in the composition root". True of Program.cs, false of the app — Margin's is one call away, invisible to grep.
Program.cs:1160 AddMarginModule() -> MarginModuleServiceCollectionExtensions.cs:35 registers MarginModuleFlagEffectiveResolver. The §S0 fenced seam exists so four lanes never edit Program.cs.
THE MASTER IS A THIRD SHAPE, not Events' absent key nor Growth's boolean: appsettings.json:170-174 "Margin": {"EnabledStoreIds": []} — declared, shipped dark, no Development override.
AND IT COALESCES, NOT ANDS: MarginModuleGate.cs:36 `over ?? configDefault` vs Growth :46 "Dark => no store row can refine it on". A flip writes a row and the allow-list is never read.
FOUR JOINTS AGREE: the switch (PUT :132), the board (:55-66, resolver first), the routes (Statements :122, PriceImport :231 gate their STAGE flag) and the page (suppliers.vue:353 -> /margin/status).
GIVEN A SLOT, WHAT STOPS THE WALK IS FURNITURE, NOT PLUMBING: it asserts 2 pre-existing suppliers (world.js:833) then 3, and links to a product `Vaffel med rømme` priced on two bases.
live-world.sh step 5 seeds a store, a manager and 3 Workforce tables — zero Margin rows, zero products; that seed is L-LIVE-SEED-VIA-PRODUCT's file. Both specs are still @fixture.
UNLIKE THE SIBLINGS, MARGIN NEEDS NO SWITCH IN live-world.sh: the walk pulls its own lever at /admin/feature-flags and the gate honours it, so step 4 needs no change at all.
FIXTURE DIVERGENCE, FOUND UNRUN: ProductCatalogReadModel.cs:76-81 emits ALL THREE bases per product, MenuMarginService.cs:123 one row each — live renders 3 mm-rows per dish, not 2 and 1.
The closing mm-withheld toHaveCount(0) is page-wide, so a Delivery row is new. NOT GAPS: no __fixture route; supplier-client's 9 routes resolve; refusal verbatim at MarginStatementProblems.cs:61.
BLOCKED ON THE SLOT, MEASURED: sql cap 2 is full (L-WF-OPERATOR-UNIQUE, L-MIG-STACK-MERGE), my class is node; live-world.sh:237 dies unless a SQL container is RUNNING, and docker ps is EMPTY.
F-SQL-HEADROOM'S PREMISE EXPIRED: its 5 standing worlds are gone — 3 mssql containers Exited(0) 41h, none mine. docker info 7.65GiB; in-VM swap unmeasured. The block is the grant, not memory.
END RETURN
```
