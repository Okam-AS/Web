RETURN: L-EF-DECLARES-EVERY-TRIGGER
brief: 5525f60e
verdict: built
evidence: /private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/evidence.md
log:
25 CREATE TRIGGER swept from Migrations/** Up() bodies only; table taken from each ON clause, not the name. 25 triggers, 25 tables, 1:1, none dropped later.
Measured: ALL 25 refuse an EF UPDATE with error 334, not just the reported one. 334 is decided at statement compile, so a zero-row update is refused like a real one.
Measured: INSERT is NOT exposed on any of the 25. My identity-key hypothesis (8 tables) was wrong; the flag's INSERT claim is correct.
LIVE 2 - TrainingCourseVersions (draft edit :278, publish :327, retire :376 all tracked-mutate via FindVersionTrackedAsync :413) and MealsStatementLines (RemoveRange, MealsStatementService.cs:168, re-draft).
LATENT 23 - the discriminator is layer 1, not INSERT/UPDATE: GuardAppendOnly throws in-process for exactly those 23 CLR types before EF emits SQL. The two with a CONDITIONAL guard are the two that are live.
Fix: ModuleTriggerBuilder in ApplicationDbContext declares all 25 with ToTable(t => t.HasTrigger(...)), behind the file's existing Database.IsSqlServer() branch. No migration; no schema change.
HasPendingModelChanges() asserted false, so no migration is owed - and asserted on the FAST tier, needing no container.
SQL arm red 27F/25P/0S/52 -> green 0F/52P/0S/52. Fast tier 4357P/0F/12S -> 4359P/0F/12S. Fast drift gate mutation-checked: 1F/1P with the declaration removed.
Anti-drift: theory cases come from replaying the migration chain (not the model, which would collapse to zero cases and pass); truth read from sys.triggers; model compared both directions; TriggerRefusal pins refusals to the trigger's own THROW.
BLOCKED ON WORKSPACE: the harness pinned this lane to a Web (Nuxt) worktree, not the backend. OkamAPI-modules is unwritable to me, so the change lives in a verified working copy and ships as a patch.
Patch (applies -p1 to OkamAPI-modules, dry-run clean): scratchpad/L-EF-DECLARES-EVERY-TRIGGER.patch. 5 files, 729 lines.
Stopped my own broad SQL regression run at 135MB free to protect the owner's live okam-lwtwo-sql; killed by my own pid, stopped only containers matched by ID from my own log. Headroom polled 7 min, never recovered.
Residual: multi-row batched INSERT unprobed. I wrote it, could not run it in the slot, and removed it rather than ship an unmeasured assertion. Five-minute follow-up.
Nothing disabled: no trigger dropped, no guard removed, no migration added, no --no-build measurement.
END RETURN
