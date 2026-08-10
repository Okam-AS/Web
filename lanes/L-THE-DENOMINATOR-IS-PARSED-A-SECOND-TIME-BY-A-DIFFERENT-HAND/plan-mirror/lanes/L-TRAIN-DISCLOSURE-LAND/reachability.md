# Is one merge still not enough? Measured against today's refs — yes.

The brief says the backend merge gives the log with no pack surface, and the frontend composition
gives the pack read without the log entry that read appends. **Both halves of that still hold on
2026-08-06.** Here is which half is missing in each intermediate state and what a person sees.

## The two halves

| half | ref | shape |
|---|---|---|
| backend | `lane/train-disclosure` `06b8b582` → OkamAPI `feature/restaurant-modules` `8e2b57de` | **real merge**, 59/1 divergence, prepared as `f4407595` |
| frontend | Web-modules `feature/restaurant-modules` `e34977ac` → `candidate/fe-compose-2026-08-05` `f40fdf36` | **fast-forward**, 0/105, tip is a strict ancestor |

## State A — today. Neither half.

- **Missing:** the disclosure route *and* the pack-read surface.
- A manager on `/admin/training-courses` sees section *"7. Who has seen this"*, types a person id,
  presses **Look up**, and reads **"The lookup did not answer."** A worker on `/admin/workforce-me`
  presses the equivalent button and reads the same. Nothing errors; nothing is logged as broken.
- There is no `/admin/training-evidence` page and no `GetEvidence` client method at all on this
  branch, so no browser path performs a pack read either.
- `L-JOURNEY-TRAINING`'s exit — *a manager opens an evidence pack and reads the disclosure log entry
  their own read created* — fails at both steps.

## State B — backend merged, frontend left at `e34977ac`. **The pack surface is the missing half.**

- **Missing:** the pack-read surface.
- The two disclosure panels now answer. A manager looks up a person and gets a real table — but the
  only rows in it are `disclosure-log.read`: **their own lookups, and nothing else.** The
  `evidence.read` rows the panel exists to display can only be created by a pack read, and on this
  frontend no button performs one.
- What that reads as on screen: either the empty note (`trn_disclosure_empty`) on a person nobody has
  ever looked at, or a table listing the manager looking at themselves looking. Honest, and useless
  as the journey's evidence.
- **The backend has been appending the rows the whole time regardless** —
  `TrainingEvidenceService.RecordDisclosureAsync` is at `8e2b57de` already — so any pack read from a
  non-browser caller does populate the log. The gap is a surface, not a fact.

## State C — frontend composed, backend left at `8e2b57de`. **The route is the missing half.**

- **Missing:** the disclosure-log route.
- A manager reaches **Training evidence** from the admin nav
  (`AdminPageHeader.vue:391`, `isNew: true`), names a person, presses *hent* — the deliberate verb,
  because *"One press, one read, one permanent ledger row."* The pack renders and the server
  **silently appends the `evidence.read` disclosure**.
- The manager then opens *"7. Who has seen this"* to read back the row they just caused, and gets
  **"The lookup did not answer."**
- This is the exact defect `L-TRAIN-DISCLOSURE` was opened to fix — *the fact is captured and
  unreadable, including by its subject* — reproduced one layer out, and made **worse** than state A,
  because now the product is actively writing rows about people that nobody can be shown.

## State D — both. Walkable.

The manager opens the pack, the row is appended, the panel returns it, and the entry they read is the
one their own read created. That is `L-JOURNEY-TRAINING`'s exit, and it needs **both** refs advanced.

## Why the 404 has stayed invisible

`readDisclosures` → `stateOfError` returns `refused` only for an error carrying a `training.*` code
and `unknown` otherwise. A 404 from a route the server does not publish carries no such code, so both
mounts render the neutral `unknown` note rather than an error. The three-state discipline that keeps
*"nobody looked"* separate from *"you may not ask"* is also what has kept a missing endpoint looking
like a quiet afternoon. **It is behaving correctly and it is why nobody filed this.**
