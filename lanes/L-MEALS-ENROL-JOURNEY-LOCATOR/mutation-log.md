# L-MEALS-ENROL-JOURNEY-LOCATOR — the journey completes, and the assertion still has teeth

**Fix:** `lane/fe-meals-journey-locator` @ `d320105`, off `lane/meals-enrol-pretick` tip `2e3f39d`.
Two files, 24 insertions. Worktree `/Users/svendaneel/okam/web-mjloc`. Nothing pushed, no shared
branch touched, no container started.

| run | tree | shape | note |
|---|---|---|---|
| `R0-baseline` | `2e3f39d` unfixed | **FAIL-ASSERT** | reproduces the bisect's `S6` — 4 elements, spec line 131 |
| `R1-probe` | `2e3f39d` + probe | **PASS** | the measurement below; also proves 131 is the walk's only blocker |
| `R2-fixed` | `2e3f39d` + fix | **PASS** | the walk completes |
| `M1-warning-deleted` | fix, warning deleted | **FAIL-ASSERT** | `toHaveCount` expected 1, received 0 (spec:145) |
| `M2-sentence-gone` | fix, hook kept, sentence swapped | **FAIL-ASSERT** | `toContainText('leser')` (spec:146) |
| `R3-restored` | `2e3f39d` + fix | **PASS** | restore green |
| `R4-candidate-tip` | `9f7d8df` (all 35 heads) + fix | **PASS** | the fix carries the whole candidate |

Receipts in `runs/`. Runner `run-journey.sh`. Every run is PASS or FAIL-ASSERT — **no harness-shape
failure in this lane**, so every red above is a statement about the product and not about a server.

---

## Which side was wrong — measured, not argued

The bisect named the collision. It did not rule which side of it to change, and the two readings have
opposite consequences: if the panel legitimately warns three times the assertion was always
under-specified; if the panel over-warns, loosening the locator hides a product defect.

So the four matched elements were dumped from real mounted DOM at the assertion's own point in the
walk, rather than reasoned about (`runs/R1-probe.txt`):

```
PROBE-COUNT 4
PROBE-0 data-test=null                 inEnrol=false saysLeser=true  :: Vi kan si hvilken versjon som er gjeldende, men ikke hva den sier: modulen har ingen rute …
PROBE-1 data-test=enrol-replaces       inEnrol=true  saysLeser=false :: Listen du sender inn er hele påmeldingen, ikke et tillegg: alle som ikke er huket av, blir…
PROBE-2 data-test=enrol-unread         inEnrol=true  saysLeser=false :: Vi fikk ikke lest hvem som står påmeldt nå, så kontrollen holdes tilbake. Å lagre en liste…
PROBE-3 data-test=enrol-unread-refusal inEnrol=true  saysLeser=false :: Denne serveren svarte ikke som Company Meals. Vi vet ikke om modulen finnes her.
PROBE-IF-READ-ANSWERED count=2 [null,"enrol-replaces"]
```

**Exactly one of the four expresses what the assertion's own comment says it means** — "the module
exposes no route that reads a policy version BACK". It is the only one that says `leser` and the only
one outside `.mls-enrol`, and it is the same element. The other three are the enrolment panel's and
none of them is about policy read-back.

**The panel is not over-warning.**
- `enrol-replaces` says the submitted list *is* the whole enrolment, so an unticked box un-enrols
  somebody who finds out at a checkout. Load-bearing, and unconditional by design.
- `enrol-unread` + `enrol-unread-refusal` are the withheld-control pair — what happened, and the
  server's cause — the same split `MealsWriteFailure` uses elsewhere on this surface. They render
  because `ListProgramMembers` genuinely did not answer (see the finding below). The panel is being
  honest about a read that failed, which is the behaviour `lane/meals-enrol-pretick` was built for.

**The assertion is the wrong side, and was wrong before the panel existed.** The last probe line is
the counterfactual: `enrol-unread` and `enrol-unread-refusal` are the only two gated on
`enrolledUnknown` (`v-else-if` in the panel), so if that read *had* answered the locator would still
match **two** — the policy note and `enrol-replaces`, which renders whenever a programme is selected,
i.e. whenever this assertion runs. `.meals-programs .mls-note--warn` can therefore never resolve to
one element again. It named a class every warn note in the panel carries while meaning one sentence,
and it passed only because the product happened to leave that sentence alone behind the class. That
is an accident of the product, never a property the assertion stated.

## The fix, and the fix it is instead of

`components/admin/meals/MealsProgramPanel.vue` — the note gets `data-test="policy-no-read"`, the
convention the enrolment panel already established in this same file. No behaviour change.

`test/e2e/journeys/meals-admin-setup.spec.js:144-146` — the assertion reads that name, asserts
`toHaveCount(1)` so a second copy of the hook cannot satisfy it silently, and keeps
`toContainText('leser')` so the sentence itself is still under test.

`.first()` / `.nth(0)` is what this is **instead of**. Both make the journey green while asserting
nothing about *which* of the four notes they read — under M1 below, `.first()` would have gone on
reading `enrol-replaces` and stayed green with the policy warning deleted.

## The mutations

Both were run against the fix, one at a time, and the fix restored and re-run green after
(`R3-restored`).

**M1 — the warning the assertion checks is removed** (the exit criterion). The `<p>` is commented out
of the panel; **the three enrolment warn notes are left in place**, so `.mls-note--warn` still matches
inside `.meals-programs`. A locator surviving on the class alone would stay green here.

```
Error: expect(locator).toHaveCount(expected) failed
Expected: 1
Received: 0
> 145 |       await expect(noReadNote).toHaveCount(1);
RESULT M1-warning-deleted 2e3f39d FAIL-ASSERT rc=1
```

**M2 — the hook stays, the sentence goes.** `$i('meals_policy_no_read_note')` swapped for
`meals_policy_immutable_note`, which never mentions reading a policy back. An assertion that only
checked the hook's presence stays green through this; this one does not.

```
Error: expect(locator).toContainText(expected) failed
> 146 |       await expect(noReadNote).toContainText('leser');
RESULT M2-sentence-gone 2e3f39d FAIL-ASSERT rc=1
```

## Two facts the composition lane should have

1. **Line 131 was the candidate's only blocker for this journey.** `R4-candidate-tip` cherry-picked
   the fix onto `9f7d8df` — the candidate tip, all 35 heads composed — in this lane's own detached
   worktree, and the walk **completes end to end**. The candidate branch itself was not touched.
   The `R1-probe` run at `2e3f39d` says the same from the other side: with the assertion replaced by
   a non-asserting probe, every later step passed.
2. **The e2e fixture serves no `GET /v1/meals/programs/{programId}/members`.** `test/e2e/fixture/meals.js`
   has the company-scoped `/members` and the programme-scoped `/policies`, but not this one, so the
   journey always walks the **unknown-read** branch and never exercises the pretick the panel was
   built for. That is why two of the four warn notes are on screen at all. **Not fixed here** — adding
   the route changes what this journey walks, and that is its own lane.

## Harness

Inherited wholesale from `lanes/L-JOURNEY-REGRESSION-BISECT/run-step.sh`, which was already proved on
this journey. `CI=1` so `reuseExistingServer: !CI` is false and no surviving fixture from another lane
can be reused; this lane's own ports **3778/4778** (the bisect held 3777/4777), asserted free before
each run; **port 4010 is a foreign `api-server.js` from another checkout and was never touched**;
`E2E_API_BASE_URL` deliberately unset, since setting it grep-inverts `@fixture` and would run nothing
while reporting success; `.nuxt` cleared per run and the shared `node_modules/.cache` left alone;
`core/` pre-populated so `ensureCore()` mutates no other checkout.

Also green on the change: `npx eslint` on both files (clean), and
`meals-admin-components` / `meals-enrolment-journey` / `meals-companies-page` / `meals-admin-view`
(4 suites, 108 tests). Per C5 these are not acceptance — the acceptance claim here is that the walk
completes, and a person opening the surface remains the gate.
