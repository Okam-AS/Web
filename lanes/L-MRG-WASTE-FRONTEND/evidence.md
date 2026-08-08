# L-MRG-WASTE-FRONTEND — evidence

Worktree: `/Users/svendaneel/okam/web-mrgwastefe`, branch `lane/mrg-waste-frontend`, based on
`3cd2570` — the frontend integration tip the brief named, verified rather than assumed
(`git log --oneline -1` in the shared checkout reads `3cd2570 The script an operator runs stops
saying the reset does not exist`). No container was started. No shared ref was moved. No migration.

## 0. What the brief got wrong, and it matters

The brief says `L-MRG-COVERAGE-UNKNOWN` "landed on `lane/mrg-coverage-unknown`". **There is no such
branch and no such commit anywhere in the repository.**

    git branch -a --list '*coverage-unknown*'                    -> 0 lines
    git log --all --oneline -S"an absent summary block is UNKNOWN" -> 0 commits
    git log --all --oneline -S"coverage-waste-unknown"             -> 0 commits

That lane's work exists **only as uncommitted changes in the shared checkout**
`/Users/svendaneel/okam/Web-modules`, whose HEAD is still `3cd2570`:

    M components/admin/margin/MarginCoveragePanel.vue   (+30)
    M utils/margin/statement-view.js                    (+38/-16 region)
    M test/margin-waste.test.js                         (+53)
    M test/margin-statements-page.test.js               (+199)

Consequence to act on: **clause four is one `git checkout`/`git reset` away from evaporating.** It
is real work, it is correct, and nothing has recorded it.

## 1. The fourth clause is already built — returned, not re-flipped

The brief's fourth clause is D1 in `docs/plan/reviews/L-MRG-WASTE-REVIEW.md`: the absent-versus-empty
skew, pinned in both directions, so fixing it means flipping a test that asserts the defect.

The test the brief names, `'an absent summary block reads as nothing recorded rather than as
unknown'`, **has already been flipped** — it now reads `'an absent summary block is UNKNOWN, never an
empty summary'` (shared checkout, `test/margin-waste.test.js:88`), and `readWasteSummary` returns
`null` for an absent or non-object block. The middle world (a block that is PRESENT and zero) is
there too, so it is a distinction and not a relabelling.

**I did not touch it.** Two lanes rewriting one assertion is a conflict and a second pin for one
property. I own the other three clauses and nothing that lane holds:

| file | this lane | L-MRG-COVERAGE-UNKNOWN |
| --- | --- | --- |
| `pages/admin/margin-statements.vue` | yes | no |
| `components/admin/margin/MarginWastePanel.vue` | yes | no |
| `test/margin-waste-page.test.js` (new) | yes | no |
| `translations/{no,en,de}.ts` | yes, hand-edited | yes, hand-edited |
| `utils/margin/statement-view.js` | no | yes |
| `components/admin/margin/MarginCoveragePanel.vue` | no | yes |
| `test/margin-waste.test.js` | no | yes |
| `test/margin-statements-page.test.js` | no | yes |

My commit is **not** a descendant of that work — it is a sibling off `3cd2570`. I needed none of its
behaviour. The only overlap is the three dictionaries, and only by proximity: that lane adds
`mrgs_waste_coverage_unknown` after `mrgs_waste_coverage_none`; I edit `mrgs_waste_frozen` and insert
`mrgs_waste_err_quantity` after `mrgs_waste_value_hint_stated`, ~30 lines above. A merge may want a
hand there. **Do not resolve it with a regex.**

## 2. The three defects, verified against the backend source before a line was written

Read at `/Users/svendaneel/okam/wt-acctuidx` (one of the checkouts that carries
`Controllers/MarginWasteController.cs`; `feature/restaurant-modules` carries none).

**D2 — the form on an Open correction revision of a frozen week.**
`Services/Margin/MarginWasteService.cs:246-261`:

    .Where(s => s.StoreId == storeId
                && s.State == MarginStatementState.Finalized
                && s.PeriodStart <= to && s.PeriodEnd >= from)

No "latest revision" filter. So once **any** revision of a week is Finalized, that week refuses every
waste write **for good**, and an Open revision 2 of it is still frozen. The page bound
`:frozen="statementFinalized"`, which reads only the selected revision. Form renders, every
submission refused.

Consequence the review did not name: `mrgs_waste_frozen` told the venue to "open the next revision of
the week", which is (a) what it is already looking at on revision 2 and (b) something that does not
reopen the waste at all, ever. That sentence is corrected in all three dictionaries.

**D3 — four coded refusals, none in the error map.** `Services/Margin/MarginWasteProblems.cs:14-17`:

    margin.waste-input-invalid | margin.waste-reason-unknown
    margin.waste-value-negative | margin.waste-week-frozen

and its own class comment: *"a stable code per business refusal, because the admin client keys its
rendering on codes and never on sentences."* The page's `ERROR_KEYS` held none of them, and
`isUncodedRefusal` is false for a coded error, so all four fell to `mrgs_err_generic`.

`margin.waste-input-invalid` is **one code with three server sentences** (names neither ingredient nor
description / quantity not greater than zero / quantity with no ingredient — `MarginWasteService.cs`
lines 290-313). A single paraphrase would drop the only thing naming the field to fix, so that one
code renders as a translated frame around the server's own sentence.

**D4 — the unvalidated quantity.** Measured, not assumed. With the fix reverted, a typed `2,5 kg`
driven through the real panel emitted:

    EMITTED quantity = NaN | Number.isNaN = true | JSON = {"quantity":null}

`waste-client.js`'s `body()` passes `NaN` through (`input.quantity === undefined || input.quantity
=== '' ? null : input.quantity` — `NaN` is neither), `JSON.stringify` turns it into `null`, and
`MarginWasteService.Validate` only refuses `request.Quantity.HasValue && Value <= 0`. A `null`
quantity is accepted, and it is the exact value that asks the server to price the entry from the
price book. So the entry landed **with no quantity at all**, the loss could not be priced, and the
floor was understated — on the surface whose whole purpose is not understating.

## 3. The pins, driven through the page

`test/margin-waste-page.test.js`, 19 tests, **new file** so no sibling holds it. Every world mounts
`/admin/margin-statements`, lets the page do its own reads, and clicks the panel's own controls.
`MarginWastePanel` is mounted for real; the other three panels are stubbed so the file fails for one
reason only. No handler is called directly.

The dictionary is the **real** one, through the same `translate` the `$i` plugin calls, wrapped so an
undefined or empty `no` string **throws** instead of echoing the key. Assertions are on sentences:
e.g. `expect(notice).toContain('en ny revisjon åpner tallene, ikke svinnet')`.

Three worlds per clause, so a surface that answered one way to everything cannot pass:

- **D2** — frozen correction revision (pin) · ordinary open week keeps its form (control) ·
  finalized revision has no form (control, already true today) · a list that never answered does not
  invent a freeze (fourth shape).
- **D3** — four codes, four sentences, asserted by value · they are four *distinct* sentences · an
  unknown `margin.*` code still falls to the generic sentence (negative control).
- **D4** — `2,5 kg` refused and nothing reaches the server (pin) · `2,5` travels as `2.5` (control) ·
  a genuinely absent quantity is still legal and still `null` (the middle world; without it a panel
  that refused every quantity would pass).

### A fixture artefact I caught and had to fix

My first D2 "WORLD 3" control went red under the all-reverted arm, and **not for the defect's
reason**: `readStatement` reports `uncalculated` — never `finalized` — for a detail carrying no
`calculationTimestampUtc`, and my fixture carried none. So `statementFinalized` was false even for a
Finalized statement and the control was measuring the fixture. Corrected: every detail is calculated,
as every statement the server can finalize has been. After the correction the control is green today
and the pin still reds, which is the honest picture.

## 4. Mutation proof — discrimination, not liveness

`python3 lanes/L-MRG-WASTE-FRONTEND/mutation-proof.py` (exit 0, output in `mutation-proof.txt`).
Each fix is reverted to exactly the text `3cd2570` shipped, on its own:

    PASS baseline (every fix in place)                     red blocks: none
    PASS D2 reverted (binding)                             red blocks: [D2]
    PASS D2 copy reverted                                  red blocks: [D2]
    PASS D3 reverted (four codes leave the map)            red blocks: [D3]
    PASS D4 reverted (bare Number() again)                 red blocks: [D4]
    PASS all reverted — literally 3cd2570                  red blocks: [D2, D3, D4]

Per-test detail for the all-reverted arm is in `red-against-3cd2570.txt`: 9 red, 10 green. **The
greens are the controls** — the ordinary open week, the finalized revision, the unknown code falling
through to generic, `2,5` and the absent quantity. A mutation that reds everything proves the suite
runs; these red only what they pin.

That arm reverts CODE to `3cd2570` and keeps the new dictionary keys, deliberately: without the keys
the strict resolver throws and the block errors instead of asserting, which would prove less.

## 5. Suites and lint

- `npx jest test/margin --coverage=false` → **22 suites, 452/452**.
- `npx jest --coverage=false` (whole jest suite; the playwright journeys are `testPathIgnorePatterns`
  and were not run) → **113 suites, 2600 passed, 2 failed**.
- The 2 failures are `test/journey-artifact-store.test.js` — `backend identity › asks whoever is
  holding the port what directory they are running from` and `backend identity › the world stamp ›
  names the checkout the world script recorded, not the one holding the port`. Both assert
  `/^Web-modules@/` against a string built from the worktree directory name and received
  `web-mrgwastefe@3cd2570…+dirty`. **Pre-existing, exactly as the brief warned.** Confirmed here by
  stashing my source changes and re-running that suite alone: same 2 failures, 36 passed. Reported,
  not chased.
- `npx eslint` on my touched files → **0 errors**. The 3 `indent` warnings in the dictionaries are
  pre-existing: the same warning reproduces on `git show 3cd2570:translations/no.ts`.

## 6. Dictionary discipline

Hand-edited, never bulk-replaced. Five keys added and one corrected, in all three files:

    added:     mrgs_waste_err_quantity
               mrgs_err_waste_frozen
               mrgs_err_waste_reason
               mrgs_err_waste_value_negative
               mrgs_err_waste_input_invalid   (carries {detail})
    corrected: mrgs_waste_frozen

No key was removed, so nothing is orphaned. A test asserts each new key is a non-empty string in
`no`/`en`/`de`, that the four refusal sentences are four distinct sentences per locale and none of
them equals `mrgs_err_generic`, and that `mrgs_err_waste_input_invalid` keeps its `{detail}` slot in
every language — a frame that lost the slot would drop the only sentence naming the broken field.

## 7. Flags — found, not fixed, not mine

1. **The backend's own `WasteWeekFrozen` detail is wrong the same way the frontend copy was.** It
   reads "Correct it by creating a new revision of the week." Creating a new revision does not
   reopen a week's waste — `FrozenPeriodsAsync` matches the period forever. Backend-owned; the
   admin now renders its own coded sentence, so this text reaches an operator only through the
   `margin.waste-input-invalid` frame, which this refusal is not.
2. **`waste-client.js` `body()` still passes a `NaN` quantity through to the wire as `null`.** The
   panel guard closes the only caller that could produce one, but the client would not refuse a
   second caller that did. Left alone deliberately: fixing it there would make the D4 pin red for
   two reasons and stop discriminating.
3. **`data-test="waste-row"` is shared by `MarginWastePanel` and `MarginCoveragePanel`** and both
   render on this page. Independently observed here; already flagged by L-MRG-COVERAGE-UNKNOWN.
4. **C5 is not met and cannot be met by me.** Nobody has walked this UI. Three green blocks are
   evidence that code behaves, never that a venue can complete the journey.
