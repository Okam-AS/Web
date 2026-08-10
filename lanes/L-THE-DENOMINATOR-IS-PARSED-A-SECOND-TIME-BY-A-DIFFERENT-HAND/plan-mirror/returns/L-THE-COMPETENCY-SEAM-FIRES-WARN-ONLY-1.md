```
RETURN: L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY
brief: (none - see spec_gap)
verdict: fail-spec
spec_gap: docs/plan/briefs/L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY.md does not exist - the newest briefs are the two SAFE-BENCHMARK-ROWS files at 11:19 - so there is no exit criterion, no constraint list and no warn-only wording to build against
log:
FAIL-SPEC: the brief was never generated. Third time tonight, and as before I built nothing rather than improvise against a dispatch message.
This one is a clerical block rather than a substantive one, and I can say that because I verified your premises instead of only reporting the absence. All three hold.
WorkforceRole carries RoleId, StoreId, Name, Station, Color, SortOrder, EffectiveFromUtc, EffectiveToUtc and CreatedAtUtc - and NO required-competency field. The honest limit you named is real.
WorkforceShiftAssignment.RoleId exists, so the anchor is there. Both services exist: Services/Workforce/WorkforceCompetencyProjection.cs and Services/Training/TrainingCompetencyService.cs.
ONE DETAIL THE BRIEF WILL NEED, which I found while checking: WorkforceShiftAssignment.RoleId is Guid? - NULLABLE.
So a staffed shift may carry no role at all, and the finding has a THIRD case beyond holds-evidence and holds-none: no role to check against.
It cannot be collapsed into holds-none without overclaiming. Holds-none says this person earned nothing for this role; no-role says nobody asked. Sven meets both, and they read differently.
Given your instruction that the wording must say plainly what a person will and will not see, that distinction belongs in the brief rather than in whatever an agent decides at build time.
I did NOT design the surface, choose the warn-only wording, or touch IWorkforceCompetencyProjection. Naming a third case is a measurement of the schema; deciding how it reads is the brief's job.
LOAD IS 66.34 AND RISING - it read 54.8 in your dispatch and 65.84 at my first command. Any exit criterion mentioning a tier is unreachable right now regardless of the brief.
So a re-dispatch wants both: the brief generated, and the host under the gate. Neither is mine to arrange.
WHAT A RE-DISPATCH NEED NOT REDO: the three premise checks above and the nullable-RoleId finding, recorded here so the next agent starts from the schema rather than the dispatch.
The demo API on :5091 was left alone - I never approached it. No money path touched, nothing built, nothing committed.
No ref created, deleted, moved or pushed. Backend trunk 6d5328004, 0 dirty.
END RETURN
```
