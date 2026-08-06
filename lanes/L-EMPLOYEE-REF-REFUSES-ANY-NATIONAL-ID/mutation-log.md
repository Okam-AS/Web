# L-EMPLOYEE-REF-REFUSES-ANY-NATIONAL-ID — mutation log and decision

Read at the tip: `git show 8e2b57de:<path>` (`8e2b57de` = tip of `feature/restaurant-modules`; the
`OkamAPI-modules` checkout sits on `lane/meals-grace-pins`, which is why nothing here was read from the
working directory).

Work committed at **`27de8b21`** on `lane/empref-natid`, worktree `/Users/svendaneel/okam/wt-empref-natid`,
branched off `8e2b57de`. Not pushed. Two files, by explicit pathspec.

## The exit met: refuse

The brief offered two honest exits — refuse the broader shape, or record the acceptance as deliberate with
what makes it safe on a frozen line. **I took refuse, and the ground is that nothing makes it safe.**

`MealsStatementController` states the read scope itself: *"a statement's company admin OR its store billing
may read/export it"*. So the value is not merely recorded — it is **disclosed to the restaurant, a third
party to the employment relationship**, in the CSV export. C1 then forbids the repair: the line is frozen by
`TR_MealsStatementLines_FinalizedImmutable` and the module's own §3 invariant is *archive/revoke instead of
delete*. A disclosure to a third party with no route to undo it is not a data-quality question, and the
"what makes it safe" that exit B requires does not exist. That is what ruled exit B out — not preference.

## What is refused, exactly

A **German Sozialversicherungsnummer** (Rentenversicherung's Versicherungsnummer, DEÜV format). Twelve
characters: two-digit Bereichsnummer, birth date `DDMMYY`, the birth-surname initial as a letter, two-digit
serial, check digit. **Three independent conditions must all hold**:

1. that exact character shape (letter ninth, digits elsewhere; upper or lower case);
2. the birth date names a real calendar day;
3. the official check digit — letter expanded to its two-digit alphabet ordinal (A=01…Z=26), first twelve
   digits weighted `2,1,2,5,7,1,2,1,2,1,2,1`, **digit sums** of the products (the Quersumme step) summed
   modulo ten.

Verified against the published worked example `65170839J003`. An arbitrary value already of that shape is
refused about 1 time in 274 — a lower false-positive rate than the fødselsnummer arm beside it (1 in 121).

**Not a shape heuristic, deliberately.** A rule keyed on "looks like an identifier" would refuse the payroll
numbers and cost-centre codes this field exists to take, and would be switched off the first week a company
could not enter its own reference.

**The Bereichsnummer is deliberately not constrained.** Its issued values are a gapped list that moves as the
issuing institutions merge, and a stale allowlist would make the guard *accept* a real number — the failure
direction C1 punishes.

## What is deliberately still accepted

**Every national identity number whose format is not named**: Swedish personnummer, Danish CPR-nummer, Swiss
AHV-Nummer, and the rest. Pinned by `A_national_number_of_a_format_this_guard_does_not_name_is_accepted`
with two checksum-valid vectors (`7561234567897` Swiss EAN-13, `8501011236` Swedish Luhn) so that adding a
format stays a decision somebody takes rather than a gap somebody discovers.

**The Swiss AHV-Nummer is the one worth taking next** — the estate already runs a Swiss venture, and its
EAN-13 check digit makes it as checkable as these two. Not taken here: it is outside this lane's exit and
adding it unasked would be the guessing the brief forbids.

## Mutation proof — 14 mutants, all red

Baseline `MealsEmployeeReferenceTests` 39/39 green. Each mutant: rebuild, run
`--filter "FullyQualifiedName~MealsEmployeeReferenceTests&Database!=SqlServer"`, restore, rebuild.
(The repo's stale-build trap was avoided: restore via `cp` + `touch`, and the rebuilt assembly's mtime was
checked before trusting any `--no-build` number.)

| # | mutation | killed | killed by |
|---|---|---|---|
| M1 | guard matches nothing | 8 | all 6 refusal cases + both endpoint arms |
| M2 | drop check-digit verification | 2 | `65170839J000`, `20260101A001` |
| M3 | drop date check | 6 | all six date-boundary vectors |
| M4 | weight `7`→`6` at position 4 | 1 | `07311299X991` |
| M5 | sum products, not their digit sums | 9 | 6 refusals + 2 endpoints + `20260101A001` |
| M6 | letter index 8→7 | 8 | all 6 refusals + both endpoints |
| M7 | reject lower-case letter | 1 | `65170839j003` |
| M8 | February 29→28 | 1 | `44290271D508` |
| M9 | drop `day < 1` | 1 | `65000680K015` |
| M10 | drop `month < 1` | 1 | `65150080K018` |
| M11 | month bound `>12`→`>13` | 1 | `65151380K018` |
| M12 | short months get 31 days | 1 | `65310480K014` |
| M13 | February 29→30 | 1 | `65300280K017` |
| M14 | length 12→11 | 8 | all 6 refusals + both endpoints |

### The two places I kept looking after a mutant went red

**M4 killed only 1 of 6 valid numbers — I checked whether it was an equivalent mutant.** It is not. Weight
position 4 multiplies the **month's tens digit**, which is zero for every month before October, so the
mutation is arithmetically invisible for five of the six. A sweep of `weight[i] += 1` at all twelve
positions confirmed **no position survives the whole corpus** (kill counts 1–5 of 5). `07311299X991` is the
only December-born case and the only thing catching position 4; a comment in the test says so, because it
otherwise reads as a duplicate somebody would delete.

**The first date corpus was genuinely weak, and the mutants found it.** The original two "impossible date"
vectors (`65321380K016`, `65323880K017`) each had **both** an invalid day and an invalid month, so neither
could isolate either rule — M11 (month bound `>12`→`>13`) **survived them**, because month 13 then passed the
month check and the value was still refused on its day. Replaced with six vectors that each carry a valid
check digit and break exactly one part of the date rule; M9–M13 then each died to exactly its own vector.
This is the only real defect the mutation pass found in my own tests, and it is why M3's kill count went
from 2 to 6.

## Reachability (C3)

Both production callers of `Normalize` are pinned at the endpoint, not only in the helper:

- `MealsMembershipService.cs:209` — `Issuing_an_invitation_with_a_sozialversicherungsnummer_is_a_400_and_writes_no_invitation`
- `MealsCompanyService.cs:117` — `Creating_a_company_whose_founding_admin_reference_is_a_sozialversicherungsnummer_is_a_400`

The invitation is the only door: no endpoint sets a reference afterwards, so a number the endpoint accepts
is one a statement line eventually freezes.

## Constraints

- **C1** — no UPDATE/DELETE against an append-only table; the change is validation-only, and refusing at the
  door is precisely the alternative to the repair C1 forbids.
- **C2** — no migration; no `OnModelCreating` index/constraint added.
- **C3** — both callers reachable and pinned (above).
- **C4, C7** — no money-path write, no log or telemetry call added.
- **C6** — no statutory claim printed.

## Suites

- `MealsEmployeeReferenceTests`: **39 passed / 0 failed**, filter
  `FullyQualifiedName~MealsEmployeeReferenceTests&Database!=SqlServer`.
- Full fast tier: **4658 passed / 0 failed / 12 skipped** (total 4670), filter `Database!=SqlServer`, 6m12s.
  The 12 skips match the historical count in `docs/plan/log.md` — nothing newly skipped.
- **No SQL tier run and no container started.** `MealsEmployeeReferenceSqlServerTests` carries
  `[Trait("Database", "SqlServer")]` and was excluded by the explicit filter; `docker ps` was empty before
  and after. No container was created or touched.

## Residues for whoever picks this up

1. **The German UI string is now true where it was false.** `translations/de.ts:4074`
   (`meals_field_employee_ref_hint`) says *"Nie eine Sozialversicherungsnummer; der Server weist sie ab"* —
   it claimed a control that did not exist, and now it does. Deliberately not edited: strings are another
   lane's territory (L-GERMAN-IDENTIFIER-LABELS explicitly deferred this one) and there is a live
   translations-collision flag.
2. **EN and NO now understate the guard.** `en.ts:4069` and `no.ts:4125` name only fødselsnummer. Not false,
   but no longer the whole rule. Same reason for leaving them.
3. **Swiss AHV-Nummer** is the next format worth naming (see above).
