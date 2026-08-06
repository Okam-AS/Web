# The retention period: three candidate groundings, all measured, all fail

Lane L-MIG-TRAIN-DISPLAY-SNAPSHOT. Base `lane/mig-train-display-snapshot` @ `32c56fa4`
(off `lane/mig-company-receivable`). Everything below is a file read, not an argument.

The brief permitted exactly three sources for the period: the personalliste's own period, a statute,
or a spec line. It required a STOP if none grounds it. All three were measured.

---

## 1. The spec line — refuses to name a period, and forbids naming one

`docs/plans/modules/60-training-internkontroll-spec.md` §13.5, verbatim:

> Training-record retention is a documented **product policy** (default: retain, exportable), not a
> marketed legal duration — the module never claims a specific statutory retention period it has not
> confirmed with counsel.

This is not silence that a lane may fill. It is a written refusal. The default is **retain**, and the
sentence explicitly forbids the module from asserting a statutory duration absent counsel. A
`RetainUntilUtc` stamped on a Training row is exactly such an assertion, printed into an evidence pack
handed to an inspector.

## 2. The personalliste's period — a different statute, for a different class of document

`Services/Workforce/WorkforcePersonnelListRetention.cs` grounds its horizon precisely:

> The statutory retention horizon of the personalliste family (spec §13.3;
> **bokforingsforskriften § 8-5-6**): three years and six months after the end of the accounting year.

Bokforingsforskriften is the **bookkeeping** regulation, and § 8-5-6 governs the personalliste as a
bookkeeping document. Training records are IK-mat, IK-alkohol and HMS records — spec §13.2 maps them to
matloven / internkontrollforskriften / alkoholloven. Different statutory family, different document
class, different duty-holder. Carrying 3y6m across is not borrowing a period; it is inventing one and
attributing it to a statute that does not say it.

## 3. The Events/Growth erasure treatment — request-driven, carries no period at all

§13.5 says Training mirrors "the Events erasure treatment". The shipped erasure workflow
(`Services/Growth/GrowthPrivacyRequestService.cs`, `GrowthErasureShred`) is triggered by a **data-subject
request** and crypto-shreds the address on receipt. It has no horizon and no period to copy.

---

## The deeper problem: the shape the ruling points at does the OPPOSITE of what the ruling wants

The ruling's recorded pro is:

> the pack is stable and **the personal data dies on a schedule**, which is the answer the personalliste
> already gives one module over

The personalliste does not give that answer. Measured:

- `WorkforcePersonnelListEntry.RetainUntilUtc` is a retention **LOCK** — a keep-until MINIMUM. The entity
  doc calls it "the statutory lock", and the physical enforcement is append-only immutability.
- `WebApi.Tests/Workforce/PersonnelListRetentionLockTests.cs` is named
  `The_retention_horizon_is_set_and_cannot_be_shortened`, and asserts that
  `UPDATE ... SET RetainUntilUtc = SYSUTCDATETIME()` is **refused** by a trigger. The horizon can only be
  respected, never brought forward.
- **There is no sweep.** `RetainUntilUtc` is referenced by exactly four non-test source files
  (`WorkforcePersonnelListRetention`, `WorkforcePersonnelListProjection`, `WorkforcePersonnelListService`,
  `WorkforceIdentityCodeRegisterService`) — all writers and projections. Nothing reads it to delete
  anything. `ParticipantDisplayName` is never erased by any code path.

So the personalliste horizon keeps personal data **alive** until a date and then does nothing. Copying
that shape onto `TrainingCompletions` yields a frozen name with a date next to it and still no erasure
path — the exact defect D-TRAIN-ERASURE was raised to close, now carrying a column that misleadingly
looks like it closes it.

The ruling's own `con:` anticipated the second half of this: a sweep that deleted from an append-only
table would be a **new exception to C1**, not an application of it. That remains true, and it is why the
personalliste never built one.

---

## What must be ruled

Not "pick 3y6m". The two questions the horizon presupposes, neither of which any document answers:

1. **What period, on what authority**, given §13.5 forbids the module from asserting a statutory duration
   without counsel? If the answer is "a product-policy period", §13.5 must be amended to permit it, and
   the number becomes a product decision with a named owner — not a lane's choice.
2. **What does the horizon DO when it expires?** A lock (personalliste semantics — no erasure, and the
   defect stands) or a delete (which needs an explicit C1 exception ruling, since the sweep must remove
   rows from an append-only table two triggers and `GuardAppendOnly` currently protect).

Until both are answered the column cannot be authored honestly. **MIG-28 is the next free number** and was
deliberately NOT written into the ledger — nothing was authored, so nothing was claimed, and the number
stays available to the next lane. Nothing committed in either repo; the lane worktree and branch were
removed clean and the migration-author slot is released.
