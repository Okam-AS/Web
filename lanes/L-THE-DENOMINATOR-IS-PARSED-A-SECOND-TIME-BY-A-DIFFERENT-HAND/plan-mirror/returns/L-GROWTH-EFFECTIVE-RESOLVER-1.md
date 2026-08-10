```
RETURN: L-GROWTH-EFFECTIVE-RESOLVER
brief: e266d1af
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-growthres/lanes/L-GROWTH-EFFECTIVE-RESOLVER/mutation-receipt.md
log:
Verified at the tip 8e2b57de, not assumed: Growth ANDs Growth:Enabled (ships false) over the row and registers no resolver. Events is its exact twin and has none either.
MEALS IS NOT IN THE SAME POSITION: its row wins in BOTH directions and the config gate is only its fallback, so it diverges the OTHER way - a config-enabled store with no row read effective:false.
One shape closes both directions, so it is applied to Growth, Meals and Events rather than to Growth alone.
NOT a fourth answer: the shape existed unmerged 63 behind at lane/flags-effective-resolvers e45ec4c1 plus the flag-keyed guard at lane/flags-excuse-byflag 6ae0b8db.
Neither is an ancestor of any integration ref, which is why the clerk read the tip correctly. Cherry-picked clean onto 8e2b57de; the two sibling trx blobs dropped.
THE LEVER ITSELF WAS NEVER BROKEN. At the tip GrowthFeatureFlagGateTests.Turning_the_row_on_lets_the_capture_reach_the_module_for_that_store_only already passes with Growth:Enabled on.
What was broken is the operator's only signal: the board computed row-or-default, so the frontend's overruled warning (row on AND effective off) could never fire. No frontend change needed.
M3, the effective resolution itself removed from StoreFeatureFlagsController.EffectiveAsync: RED 11/23, including all three Growth dark cases. That is the pin the exit asks for.
M1 drop the Growth DI line: RED, wire guard naming growth.module+growth.dispatch. M2 resolver stops quoting the gate: RED, deployed-case guard. M4 Handles hardcoded: RED 3.
Every green arm checked for equivalence: M1's service-tier tests cannot see DI; M2 is observationally equal on the dark inputs; M3's deployed guard agrees with the naive arithmetic by construction.
M5 negative result: letting the row override Growth:Enabled reds A_dark_outer_switch_is_never_refined_on_by_a_store_row. That switch is the crypto gate, so the honest repair is the report.
Residual gap - no operator can see or set Growth:Enabled at all - is the already-open F-MODULE-MASTERS-ARE-UNDECLARED-AND-INVISIBLE, not this flag.
Tier Database!=SqlServer 4657/0/12 vs measured baseline 4638/0/12 at 8e2b57de; delta +19 = exactly the 19 new tests. 0 SqlServerTests ran; no container started or stopped.
Commit 107ca70e on lane/growth-effective-resolver, worktree /Users/svendaneel/okam/OkamAPI-growthres. Not pushed. No migration, no schema, no money-path write, no log call.
C5 NOT met: this is suite evidence. Nobody has walked /admin/feature-flags; acceptance is still owed.
END RETURN
```
