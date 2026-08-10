```
RETURN: L-ARM-RECEIPTS-RECAPTURE
brief: 0658b5c3
verdict: built
evidence: lanes/L-ARM-RECEIPTS-RECAPTURE/recaptured.md
log: Ruled respec-per-backend: the clause is rewritten, not satisfied. Contract recorded as recaptured.md §7. The ten of §2 untouched - all 10 sha256 re-verified identical to the §2 table.
CONTRACT: the identity channel is chosen by `backend`, not the capture. fixture -> servingFixture (health+lsof: pids, cwds, ports). live -> backendBuild (stamp>env>repo>port-holder>swagger>null).
Exhaustive over 182 *.playwright.json: fixture 138 = 114 field-absent + 24 health+lsof + 0 none; live 44 = 29 field-absent + 15 none + 0 resolved. ZERO counterexamples either direction.
So the old clause asked ten live receipts for a value no receipt of their family has ever held - not a capture defect, and not fixable by re-capturing.
Replacement for plan.md:11902 (verbatim in §7.4): live -> backendBuild resolved to a named build from a named source, id carrying no +dirty; fixture -> servingFixture whose identitySource is not none.
It GATES: as a predicate over the estate it refuses 17 of 44 live (7 no key + 7 null + 3 +dirty) and 114 of 138 fixture, admits all ten. 2 of the 3 +dirty refusals ARE census rows 18/39.
Provers re-measured today from clean worktree web-armrecapture at 7030c00, porcelain 0 before AND after each: guard-proof 10/10, serving-fixture-proof 10/10 (new), build-provenance 5/5 (return -1).
Both halves now have a live instrument at one ref, each load-proved by its own mutant arms flipping - which a dead-loader prover cannot fake. The brief's hazard was checked, not assumed.
Provenance: instruments at 7030c00 (porcelain 0); estate census is a filesystem scan of Web-modules at 8ac6f63 lane/focustrap-teardown, porcelain 341 - dirty by design, it must see untracked evidence.
I may not edit docs/plan/**, so plan.md:11902 still carries the old sentence; applying §7.4 is the orchestrator's act. No commit, push, shared branch or container; 4010 never bound; CI=1 throughout.
END RETURN
```
