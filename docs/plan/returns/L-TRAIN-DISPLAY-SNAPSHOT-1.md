```
RETURN: L-TRAIN-DISPLAY-SNAPSHOT
brief: bf8748fd
verdict: blocked
evidence: lanes/L-TRAIN-DISPLAY-SNAPSHOT/{handover.md,probe-output.txt,probe.cs,base-training.trx}
needs: +L-MIG-TRAIN-DISPLAY-SNAPSHOT, +D-TRAIN-ERASURE
log:
FINDING CONFIRMED, executed not argued. TrainingEvidenceService.cs:105-113 resolves the name live on every read; no Training entity stores one. Spec requires it twice: 60-training-internkontroll-spec.md:80 and :307, both "opaque identity reference + display snapshot".
PROOF: probe-output.txt writes a completion as "Kari Nordmann", edits the roster to "Kari Hansen", re-reads. The two packs are byte-identical EXCEPT the subject line. The append-only rows did not move; the pack reprinted them under a name that did not exist when they were written.
OVERSTATED: "wrong the day somebody leaves" is NOT reachable. The leaver path (WorkforceInvitationService.cs:311) sets Archived and keeps DisplayName, and the lookup has no State predicate, so a leaver still resolves. No production path removes a person row. The reachable failure is RENAME. Removal is latent only.
UNDERSTATED 1: the live lookup has NO store predicate (EVID-LAND OPEN 1, still open) - a snapshot narrows it, since the pack could name the subject from its own store-scoped rows.
UNDERSTATED 2: it is not one column. Spec :307 names assignments, certificates and W3 deviations too; scoping to completions leaves the certificate in the same document naming nobody.
UNDERSTATED 3: the identifier-printing half is LIVE on the frontend - TrainingCompletionPanel.vue:214 returns the raw Guid when the live directory misses. Backend already prints <unavailable>, never the id, and pins it.
NO EXISTING COLUMN CAN CARRY IT. TrainingAuditEvent.PayloadSnapshotJson is write-time and append-only so the freeze would work, but TrainingAuditAllowlist is fail-closed BY DESIGN to keep values out (spec 3.5-11, 13.4), the pack renders payloads verbatim, and it is the SAME table the disclosure log reads - the lane that refused to name actors there would be reopened by the back door.
The personalliste already does this shape one module over (WorkforcePersonnelListEntry.ParticipantDisplayName) but cannot be borrowed: written per shift, frozen at the shift's instant, and in another module's retention-locked register.
NEEDED: PersonDisplayNameSnapshot nvarchar(256) NULL on TrainingCompletions (+Certificates, +Assignments), written where TrainingPersonBinding already loads the person and throws the row away. NO new THROW number - no trigger is added; that trap does not bite here.
C1 CONSEQUENCE: existing rows stay NULL forever (backfill refused by THROW 50050 and GuardAppendOnly), so the pack needs THREE states. Falling back to the live roster on null makes the freeze a lie that only shows on old rows.
CORRECTION - DECIDED, no ruling needed: the frozen value is not correctable, matching the personalliste's own answer (supersede, never edit). Art.16 is satisfied against the roster. The pack must print BOTH frozen and current-when-different, or the payroll mismatch arrives from the other direction.
ERASURE - RULING NEEDED, the sentence is spec 13.5 "personal free-text in deviations can be anonymized in place on an erasure request". That is the module's only erasure mechanism and it CANNOT run on TrainingCompletions: THROW 50050 plus GuardAppendOnly refuse it. The column creates personal data with no permitted erasure path and, unlike the personalliste, no RetainUntilUtc horizon.
NOT THE DISCLOSURE LANE'S CASE: that refused a third party's name to a data subject; this is the subject's own name on the subject's own record, to someone already holding the file.
CHAIN MEASURED, not inherited: tip is 133 migrations (Workforce_TimesheetExportSingleSucceeded) on two UNMERGED lanes; this base and feature/restaurant-modules are both 127; the gap is SIX not five; neither is an ancestor of the tip. Authoring at the tip means a branch with no Training evidence read to pin against.
NOTHING BUILT, nothing committed, no file touched in either repo. Base measured: Training 218/0/0 at 06b8b582, Database!=SqlServer, no container started or touched. Worktree and branch removed clean. Did not touch TrainingCompletionPanel.vue - L-TRAIN-EVIDENCE-NAMES-COURSE has it open.
END RETURN
```
