```
RETURN: L-MRG-WASTE
brief: 7c7906dc
verdict: built
evidence: /Users/svendaneel/okam/wt-mrgwaste/artifacts/tests/50b85657/RUN.md
log:
- EXIT CRITERIA MET ON A CHAIN-BUILT DATABASE. SQL tier 568/568/0 skipped at 50b85657, fast tier 4342/0/9 at the SAME SHA, both from a clean detached worktree with the tree asserted EMPTY before each run. Diffed set-against-set on test names: SQL +11/-0, fast +29/-0. Every one of the 568 outcomes was read individually out of the .trx, not inferred from the summary.
- CHAIN TIP RE-CHECKED BEFORE APPLYING ANYTHING, as instructed: `lane/margin-waste` is still the ONLY branch carrying a 2026-08-01 migration, 20260801113131_Training_W3_ChecklistsAndDeviations is still my Designer's parent, and the two earlier August migrations still sit on detached heads (4231715a, 47be7e77). Nothing moved.
- THE FALSIFICATION IS EXECUTED, NOT DESCRIBED. Dropping_the_trigger_lets_the_frozen_week_be_rewritten drops TR_MarginWasteEntries_FrozenWeekImmutable on the harness's own throwaway catalog, watches the identical INSERT be ACCEPTED, and re-creates it. That is the only evidence the refusals measure this trigger.
- THROW 50062 pinned by NUMBER on raw insert/update/delete/cross-week-move, each paired with an open-week CONTROL asserted to succeed. The DELETE proof first asserts from sys.foreign_keys that NOTHING references the table — SQL Server evaluates FKs before an AFTER trigger, so without that it would certify the foreign key and pass with the trigger dropped.
- THE LAST DAY OF THE FROZEN WEEK is exercised explicitly, because that is the boundary the `date` column exists for: against datetime2 a row stamped midday on the period's last day exceeds a midnight PeriodEnd, and the final day of every frozen week would stay writable while the trigger read present and enabled.
- ERROR 334 DID NOT BITE. This table carries a rowversion AND a trigger; the ordinary create/update/delete through the service passes, which is what proves the model's HasTrigger declaration is carrying its weight. Without it every waste write fails on SQL Server while the whole SQLite suite stays green.
- ROUND TRIP GREEN: empty -> apply -> rollback -> re-apply, asserting the trigger present/gone/present and WasteDate's `date` type in all three phases. Both exact-full-Margin-set lineage assertions carry the table.
- NOTHING UNEXPECTED CAME BACK, and I looked for it rather than assuming: 0 failed, 0 skipped, 0 removed tests, no flake, no retry, and no change to the migration was needed.
- TWO CORRECTIONS TO MY OWN EARLIER REPORTING. (1) I said TEN trigger tests were owed; there are ELEVEN — the class also carries the error-334 regression. The count now comes from the .trx. (2) The disk correction from last time stands and is why the remedy changed: Docker's image was the symptom, the estate's working set was the cause.
- THE KILLED FIRST ATTEMPT EARNED ITS KEEP: before the VM went read-only it found a real defect — MarginW2MigrationLineageTests holds a SECOND exact-full-Margin-set assertion that the fast tier cannot see. Fixed in 13217cfd. The 13217cfd receipt row stays in the README; a superseded run is still the honest record of that hour.
- CONTAINERS: one SQL Server container, created by this run and reaped by its own Ryuk (zealous_roentgen). A container named amazing_banzai was present at the end and was LEFT ALONE — not mine, attributed by name and not by count. Build output deleted immediately after the runs; host went 88 -> 195 GiB free.
- STILL OWED, AND NEITHER IS MINE TO CLOSE: Sven must ratify the §2 spec departure (50-food-margin-spec.md defers "Reason-coded waste events" to M3; a narrow slice landed and the spec records exactly what did and did not), and NOBODY HAS WALKED THE UI — a green suite is not acceptance.
- NOTHING PUSHED. 9 commits on lane/margin-waste (afcfddbc), 1 on feature/restaurant-modules in Web-modules (7b99f2a). Detail: lanes/L-MRG-WASTE/DETAIL.md.
END RETURN
```
