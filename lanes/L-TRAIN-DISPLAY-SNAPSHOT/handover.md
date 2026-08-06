# L-TRAIN-DISPLAY-SNAPSHOT — handover

**Verdict: blocked.** The snapshot is a column, and this branch cannot author one. Nothing was
built, no production file was touched, no commit was made in either repo. What follows is the
work that would otherwise have to be redone by whoever holds the migration slot.

Base: `OkamAPI-modules` `lane/train-disclosure` **06b8b582** (the freshest branch carrying both the
evidence read and the disclosure log). Worktree `~/okam/OkamAPI-traindisp`, branch
`lane/train-display-snapshot`, **zero commits** — safe to delete.
Base measured, not inherited: `WebApi.Tests.Training` **218 passed / 0 failed / 0 skipped**
(`base-training.trx`), trait filter `Database!=SqlServer`, no container started or touched.

---

## 1. The finding, verified

**Confirmed exactly.** `TrainingEvidenceService.GetEvidenceAsync` (`Services/Training/TrainingEvidenceService.cs:105-113`)
resolves the subject's name **live** on every read:

```csharp
var person = await _context.WorkforcePersons.AsNoTracking()
    .FirstOrDefaultAsync(p => p.WorkforcePersonId == personRef, ct);
...
DisplayName = person == null ? null : person.DisplayName,
```

No `Training*` entity stores a name. `grep` for `DisplayNameSnapshot|PersonDisplayName|DisplaySnapshot`
across the whole backend returns nothing.

**The spec does require it**, in two places, and it is not a reading:
- `docs/plans/modules/60-training-internkontroll-spec.md:80` — "Person, engagement, and role are
  referenced **by value** (opaque identity references **+ a display snapshot**) — never by FK into `Workforce*`."
- same file `:307` — "`PersonRef` … on assignments, completions, certificates, onboarding runs,
  deviations | **by value only** — opaque identity reference **+ display snapshot**".

`probe-output.txt` executes it: a completion is written while the roster says *Kari Nordmann*, the
roster is edited to *Kari Hansen*, the pack is read again, and the two documents are byte-identical
**except the subject line**. The append-only rows did not move — the trigger and `GuardAppendOnly`
saw to that. The content hash froze what was learned; nothing froze who learned it.

### Where the brief is *understated*

1. **The live lookup carries no store predicate** — `FirstOrDefaultAsync(p => p.WorkforcePersonId == personRef)`.
   This is `L-TRAIN-EVID-LAND`'s OPEN 1, still open: any store admin holding a `PersonRef` can turn it
   into a person's name, for a person of a store they do not hold. A snapshot **narrows** this: the
   pack would name the subject from its own store-scoped completion rows and reach the roster only when
   there are none. It does not close it, because `PersonOnFile` still needs the unscoped read.
2. **It is not one column.** Spec `:307` names assignments, completions, certificates, onboarding runs
   and deviations. `TrainingAssignment.PersonRef`, `TrainingCompletion.PersonRef` and
   `TrainingCertificate.PersonRef` all lack it today, and `20260801113131_Training_W3_ChecklistsAndDeviations`
   (on `lane/review-residuals-rezone`, **not** on this base) adds `AssigneeRef` with the same shape.
   Scoping the migration to completions alone leaves the certificate — which an inspector reads in the
   same document — still naming nobody.
3. **The frontend has the identifier-printing half of the exit criteria, live.**
   `Web-modules/components/admin/training/TrainingCompletionPanel.vue:212-215`:
   `return match ? match.label : (personRef || this.dash);` — a live directory lookup that falls back
   to printing the raw Guid. That is "an inspection document keyed by an identifier", on screen, today.

### Where the brief is *overstated*

**"the wrong name the day somebody … leaves" is not reachable today.** The leaver path is
`Services/Workforce/WorkforceInvitationService.cs:311`, which sets `State = Archived` and leaves
`DisplayName` standing; the evidence lookup carries no `State` predicate, so an archived leaver still
resolves correctly (probe 2: `archived displayName=Kari Nordmann personOnFile=True`). **No production
path removes a `WorkforcePerson` row at all.** If one were ever removed the pack renders two passed
completions and a valid certificate under `displayName=<unavailable>` — so the failure is real but
**latent**, and adding an erasure path would make it live. The reachable failure today is **rename**.

Also: the second half of the exit criterion — "a pack for a person whose name is unknown says so
rather than printing an identifier" — **already holds on the backend**. The pack prints
`displayName=<unavailable>`, never the Guid, and `TrainingInspectorEvidencePackTests` line 209 pins it.
The gap is the frontend (point 3 above) and the freeze.

---

## 2. Why no existing column can carry it

Three candidates were considered and each is ruled out on evidence, not preference.

**`TrainingAuditEvent.PayloadSnapshotJson`** — the obvious one, and wrong. It *is* write-time
(`TrainingCompletionService.cs:146` appends in the same transaction) and it *is* append-only, so the
freeze would work. It fails on privacy, three ways:
- `TrainingAuditAllowlist` is **fail-closed by construction** and its documented purpose (spec §3.5
  invariant 11, §13.4) is "records WHAT changed, never sensitive VALUES"; its assignment section says
  in terms "person/role are **opaque by-value refs**". Adding `personDisplayName` inverts the one
  control that exists to keep names out.
- The pack **renders the payload verbatim** — see `audit-chain:` in `probe-output.txt`:
  `payload={"completionSource":"ManagerRecorded","passed":"true","scorePercent":"90"}`.
- Decisively: the *same table* is the disclosure log. `TrainingDisclosureService` reads
  `TrainingAuditEvents` keyed by `personRef`, and `L-TRAIN-DISCLOSURE` **deliberately refused to
  resolve actor references into names** there. A name in a payload would be readable through that
  read, re-opening by the back door the thing that lane closed by the front.

**`WorkforcePersonnelListEntry.ParticipantDisplayName`** — the estate already snapshots a display name
at write time, one module over, on the §8-5-6 personalliste. It cannot be borrowed: it is written per
*shift*, so a person who completed a course and never clocked in has no entry; it freezes at the
shift's instant, not the completion's; and reading a name out of another module's retention-locked
statutory register into Training's pack is its own cross-module disclosure. **But it is the precedent
for the shape, and §4 below takes its answers.**

**`TrainingCompletion.VersionContentHash`** and every other column on the three entities — all
occupied and typed for something else. `TrainingCompletion` has exactly eight properties
(`Entities/Training/TrainingCompletion.cs`); none is a free string.

---

## 3. The column

```
Migrations/<ts>_Training_PersonDisplaySnapshot.cs
  ALTER TABLE TrainingCompletions  ADD PersonDisplayNameSnapshot nvarchar(256) NULL
  ALTER TABLE TrainingCertificates ADD PersonDisplayNameSnapshot nvarchar(256) NULL
  ALTER TABLE TrainingAssignments  ADD PersonDisplayNameSnapshot nvarchar(256) NULL   -- see §1.2
```

`nvarchar(256)` matches both `WorkforcePerson.DisplayName` and
`WorkforcePersonnelListEntry.ParticipantDisplayName` (`ApplicationDbContext.cs:2272`, `:2993`).

Four things the author must not discover the hard way:

1. **`NULL`, and permanently so on existing rows.** C1 forbids the backfill, and
   `TR_TrainingCompletions_AppendOnly` (THROW 50050) plus `GuardAppendOnly` refuse it physically.
   So the pack needs **three** states, not two: *frozen name*, *no snapshot because the row predates
   the column*, and *no snapshot because the person had no name*. Falling back to the live roster when
   the snapshot is null makes the freeze a lie that only shows up on old rows.
2. **No new THROW number, and this is the trap the brief warns about.** Nothing here adds a trigger —
   the three tables already carry theirs. Do not take a number.
3. **Write site**: `TrainingCompletionService.RecordCompletionAsync`, in the same read where
   `TrainingPersonBinding.RequireKnownPersonAsync` already loads the person to prove it exists
   (`Services/Training/TrainingPersonBinding.cs:34`). That lookup currently throws away the row it read;
   have it return the name. No extra query.
4. **C7**: the name is personal data. It must not enter a log or telemetry call at any level.

---

## 4. Correction and erasure — decided, and one ruling still needed

**Correction: decided, no ruling needed.** The frozen value is **not correctable**, deliberately, and
that already is this module's law — a completion is never repaired and a retake is a new row. The
personalliste answered the identical question the same way: "A correction is a NEW entry that
supersedes a prior one … the superseded row is retained, never edited"
(`Entities/Workforce/WorkforcePersonnelListEntry.cs:19-21`). GDPR art. 16 rectification is satisfied
against the **roster**, which stays the source of truth and stays correctable; the completion records
what was true when it was written, like a signed paper certificate.

**Consequence the author must build, not skip:** the pack must print **both** — the frozen name as the
record's own, and the current roster name **when it differs**. An inspector matching a payroll against
a name that no longer exists otherwise gets a mismatch with nothing to explain it, which is the exact
failure this lane exists to prevent, arriving from the other direction.

**Erasure: NEEDS A RULING. This is the sentence.**

> spec §13.5 — "personal free-text in deviations **can be anonymized in place** on an erasure request
> while the append-only event skeleton (kind, actor, timestamp) is retained as legitimate-interest
> evidence, mirroring the Events erasure treatment."

That is the module's **only** declared erasure mechanism, and it is granted to *deviations*. It cannot
be executed on `TrainingCompletions`: the table carries `TR_TrainingCompletions_AppendOnly`
(`AFTER UPDATE, DELETE` → `ROLLBACK` + `THROW 50050`) and the EF `GuardAppendOnly`. Anonymize-in-place
is refused at the database. So the column this brief asks for creates **personal data with no erasure
path the module's own controls permit** — and unlike the personalliste, `TrainingCompletion` carries no
`RetainUntilUtc`, so there is not even a declared horizon at which retention stops (§13.5 says
retention is "a documented **product policy** (default: retain, exportable)", which is not a horizon).

Today this is survivable because the roster name is equally un-erasable — there is no erasure path for
a `WorkforcePerson` at all, only `Archived`. The column **adds a second copy** that any future erasure
must reach and physically cannot. Someone with the authority to rule must say which:
(a) the frozen name is legitimate-interest evidence and is explicitly out of scope for erasure — then
§13.5 must be amended to say so, because it currently promises a mechanism that does not reach it; or
(b) `TrainingCompletions` gets a `RetainUntilUtc` in the **same** migration, as the personalliste has,
so the copy has a declared end.

Not decided here, and not improvised: this is a controller-facing data-protection commitment, and §6's
statutory posture means an unbacked one is worse than a missing feature.

---

## 5. Why this is not the disclosure lane's refusal

`L-TRAIN-DISCLOSURE` refused to resolve actor references into names, because that is *a disclosure
about the reader, made to the person the log is about, that nobody authorised*. This is the opposite
case on all three axes: the **subject's own** name, on the subject's **own** record, disclosed to a
store admin who is **already** entitled to the record the name merely labels — and to an inspector for
whom naming the subject is the document's purpose. The disclosure lane withheld a *third party* from a
*data subject*; this discloses the *subject* to a party already holding their file. Both rules point
the same way: a name is disclosed to whoever is entitled to the thing it names, and to nobody else.

---

## 6. The pin the successor must write

Not "write a record, read it back". The brief is right that a snapshot test where the roster never
changes proves nothing. It must be `probe.cs` with assertions:

1. Record a completion while the roster says A.
2. **Change the roster to B** and save.
3. Read the pack; assert the completion's name is still **A**.
4. Assert, in the same test, that the world can produce **B** through some other read (the roster read,
   or `PersonOnFile`/subject line) — otherwise the test cannot tell a frozen value from a broken lookup.
5. Mutation check: remove the snapshot write (or the projection that reads it), confirm the test reds,
   restore, confirm green. **Rebuild between the two** — `--no-build` measures the last assembly
   *compiled*, and mtime-preserving restores defeat exactly this procedure (`CLAUDE.md`).

Add a third state assertion for the null-snapshot row (§3.1), or the fallback question gets answered by
whatever the code happens to do.

---

## 7. Left for the sibling lane, deliberately untouched

`L-TRAIN-EVIDENCE-NAMES-COURSE` (`lane/trn-evidence-names`, same 127-migration base) owns the course
title and version on the completion row. **The backend pack already renders both** —
`title="Ansvarlig alkoholservering" versionNo=1` in `probe-output.txt` — so that lane's work is the
frontend row, and there is no collision: this lane touched no file, and its own change would be a new
field on `TrainingEvidenceCompletionModel` plus the `completions:` line of `TrainingEvidencePack.Render()`,
neither of which the sibling needs to move.

One thing that is **neither lane's** and is unowned: `recordedBy=<unknown>` and
`audit=NoAuditEventForThisRow` on the seeded quiz row in `probe-output.txt`. Every *production* write
does append an audit event (`TrainingCompletionService.cs:146`), so this is a fixture artifact, not a
defect — recorded here so the next reader does not re-find it as one.

---

## 8. The migration chain, measured on 2026-08-02

Measured across every branch in `OkamAPI-modules`, not inherited from the brief:

- Chain tip: `20260802103646_Workforce_TimesheetExportSingleSucceeded`, **133 migrations**, on
  `lane/wf-export-duplicate` and `lane/review-residuals-rezone` — both **unmerged lanes**.
- This base: **127**. `feature/restaurant-modules` (3579bbbc): **127**.
- The gap is **six**, not five: `Margin_PeriodStatementFinalizedImmutable`,
  `Workforce_PublicationReceiptUniqueness`, `Training_W3_ChecklistsAndDeviations`, `Margin_WasteEntries`,
  `Workforce_W5_Timesheets`, `Workforce_TimesheetExportSingleSucceeded`.
- `git merge-base --is-ancestor`: **neither** this base **nor** `feature/restaurant-modules` is an
  ancestor of the tip.

So authoring here produces a Designer snapshot whose parent is not the chain tip — C2's `violated_when`,
verbatim. Authoring at the tip instead means cutting from `lane/review-residuals-rezone`, which does
**not** carry the Training evidence read or the disclosure log, so the pin could not run there. Closing
that gap means merging two unmerged lanes to author one column: the stacking hazard `F-MIG-CHAIN-STACKED`
already records.

**What the successor needs:** the single migration-author slot, **plus** a chain tip that contains the
Training evidence work, **plus** the §4 erasure ruling. The third is the one that cannot be scheduled.
