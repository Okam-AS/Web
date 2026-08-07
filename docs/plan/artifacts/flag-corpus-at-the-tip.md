# The flag corpus, measured at the current tips

**Frontend `d4c308e` · backend `057c390ad` · 2026-08-07 · lane L-EVERY-FLAG-IS-RE-MEASURED-AT-THE-CURRENT-TIP**

This is a **partial** census and says so in every count. It carries what was measured, the method that
measured it, and — the part worth reading first — **a measured demonstration that the obvious way to
scale this does not work.**

## The headline

Seven flags were measured by hand against the two tips. **Six of the seven are already fixed.**

That is a small and deliberately biased sample — these are flags whose claims are sharp enough to
settle with a read — so it is not a rate to extrapolate to the corpus. But it is the same direction as
the three ghosts that dispatched lanes tonight, measured independently, and it is enough to say that
**the corpus should be treated as stale until re-measured, not as a work list.**

## Verdict classes

| verdict | means |
|---|---|
| `fixed` | **Observed**: the construct the flag names is gone or replaced at the tip. |
| `reproduces` | **Observed**: the construct is still present *and still has the property complained of*. |
| `unmeasurable` | No instrument that was run settles it. A legitimate verdict, counted as its own class. |

Two rules govern every row. **Name the instrument** — a row without one is `unmeasurable`. And
**prefer the instrument over the inference**: where a verdict would turn on "the database would reject
this" or "that path is unreachable", the verdict is `unmeasurable` unless it was observed. A lane
tonight statically read a UNIQUE index, concluded SQL Server would reject a transfer, and was refuted
by running it — EF's one-to-one fixup meant the index never fired.

## Counts

| class | count | of 384 open flags |
|---|---|---|
| `fixed` | 6 | measured by hand |
| `reproduces` | 1 | measured by hand |
| `unmeasurable` | 0 | none of the seven needed it |
| **not yet measured** | **377** | **the lane is `blocked` on this remainder** |

Corpus shape at the tip: **384 open flags** — 154 blocker, 212 warn, 18 info (`plan render --view flags`,
parsed from `docs/plan/render/FLAGS.md`; 8 further entries are already `cleared`).

## The measured rows

| flag | verdict | instrument | fixing commit |
|---|---|---|---|
| `F-CLOCKOUT-ANSWERS-OPEN` | **fixed** | `git -C OkamAPI-modules show 057c390ad:Models/Workforce/WorkforcePosModels.cs` → `SessionStateOf` (:208-241) switches on `result.Outcome` and returns `AttendanceException` when `!result.ClockSessionId.HasValue`. Not derived from `closedUtc` alone. | `4d103ca8a` (confirmed ancestor of `057c390ad`) |
| `F-MIXIN-LABELS-CANNOT-TRANSLATE` | **fixed** | `git grep -n "return this.\$i(key)" d4c308e -- plugins/global-mixin.js` → `:210 :219 :253`. All three label functions resolve a dictionary key. | `811818c` (ancestor of `d4c308e`) |
| `F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM` | **fixed** | `git -C OkamAPI-modules grep -n CompanyAccount 057c390ad -- Services/PaymentTenderLabels.cs` → `:79 :135`; `EscPosReceiptBuilder.cs:156` calls `PaymentTenderLabels.Tender(...)`. | `bcc8bd179` |
| `F-MARGIN-WASTE-PANEL-CALLS-NOTHING` | **fixed** | `grep -rn '\[Route("margin/waste")\]' be/Controllers/MarginWasteController.cs` → `:31`. The flag's "zero backend handlers" was measured at `8e2b57de`; the controller exists at `057c390ad`. | `034ec87a1` |
| `F-SURFBOARD-SAVE-CLEARS-TIPS` | **fixed** | `grep -n tipsEnabled fe/pages/admin/surfboard.vue` → `:1303` sends `tipsEnabled: this.config.tipsEnabled` in the save payload. The flag's claim was that every save omits it. | `11be859` |
| `F-GROWTHAUDIT-MISSING-AT-THE-MERGE-TIP` | **fixed** | `grep -rln GrowthAuditEvents be/Migrations/` → `20260806125642_Growth_AuditLedger.cs`. The flag's claim was that no migration creates the table. | `93a52938e` |
| `F-MEALS-ENROLMENT-HAS-NO-CALLER` | **reproduces** | `grep -rn "/members'" fe/utils/` → only `admin-client.js:181`, a **GET** on `/companies/{id}/members`; `POST /programs/{id}/members` appears only as a comment at `:48`. The one component naming enrolment, `MealsProgramPanel.vue`, renders a count at `:59` and offers no action. | — |

## THE NEGATIVE FINDING: this cannot be scaled by a script

The obvious way to measure 384 flags is to extract the code each one quotes and check it against the
tip. **That was built and it fails calibration.** It was tested against the three ghosts, whose true
verdict (`fixed`) was known independently.

| attempt | instrument | result against the 3 ghosts |
|---|---|---|
| 1. quoted-token presence across the whole tree | substring index over every file at both tips | **0 / 3.** All three read as "evidence still present" — the matches were inside `lanes/*.md` **evidence files quoting the flag's own claim**, and inside tests. Circular. |
| 2. same, product code only (`lanes/`, `docs/`, `test/`, `WebApi.Tests/` excluded) | substring index over 537 fe + 2358 be files | **1 / 3.** Two ghosts still read as live, because the "quotes" being matched were **file paths** (`plugins/global-mixin.js`, `utils/workforce/pos-clock-state.js`) — which naturally persist as import paths long after the claim about them dies. |
| 3. `file:line` citation staleness | resolve every `path.ext:NNN` in every body at the tip | **not discriminating.** 124 of 128 citations still resolve; only 4 point at files absent from these two repos (they name `ConsumerWeb`, `ConsumerApp` and a `core/` path, none of which are in either tip). |

The reason is structural, and it is worth stating plainly: **the claims are semantic.** "derived from
`closedUtc` alone", "no `$i` anywhere in them", "has no `CompanyAccount` arm" — each needs the named
code read and the claim judged. A filename surviving proves nothing; `EscPosReceiptBuilder.cs` is
still there at the tip and its flag is `fixed`, because the fix moved the labels into a new file the
builder now routes through.

**Anyone resuming this should not re-attempt the scripted sweep.** It produces exactly the artifact
the brief warned against: one that reads authoritative and is not. The measurement is one flag at a
time, and it wants parallel agents, not a better regex.

## Groundwork that is done, so a resumed lane does not redo it

Under the lane directory, machine-readable:

- `flags.json` — all 392 flag entries parsed (id, severity, state, `plan.md` line, full body).
- `refs.json` — every file path referenced by every flag, resolved against both tips. **126 flags carry
  at least one file reference; 258 carry none.**
- `citations.json` — all 128 `file:line` citations with the line's *current* content at the tip.
- `quotes-product.json` — strong code quotes per flag, located in product code only.
- `packets/batch-{1,2,3}.md` — the 384 open flags split into three adjudication packets, each carrying
  its body plus its resolved references and token counts. **These are ready to hand to three agents.**

The two tips are also extracted read-only for fast searching (`git archive`), which is how every
measurement above was made without a checkout:
`scratchpad/flagsweep/fe` = frontend `d4c308e`, `scratchpad/flagsweep/be` = backend `057c390ad`.
Note `core/` is a submodule and is **not** in the frontend extract; a flag turning on a `core/` file is
`unmeasurable` by this instrument.

## Why this file is tracked despite `.gitignore`

`.gitignore:119` is a bare `artifacts/`, meant for Playwright output, and it catches
`docs/plan/artifacts/` at any depth. A plain `git add` of this file silently does nothing. It was
added with **`git add -f`** and confirmed with `git ls-files --error-unmatch`. The same is true of
`pos-uncovered-twenty.md` beside it. One negation line in `.gitignore` would fix the class; that file
is shared and is not this lane's to edit.
