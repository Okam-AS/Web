# L-MEALS-PRETICK-NEVER-WALKED — the branch the feature was built for is now the one the journey takes

**Fix:** `lane/fe-meals-pretick-walked` @ `9fbed80`, off `lane/fe-meals-journey-locator` `d320105`
(itself off `lane/meals-enrol-pretick` `2e3f39d`). Two files, 285 insertions, nothing deleted.
Worktree `/Users/svendaneel/okam/web-mpretick`. Nothing pushed, no shared branch touched, no
container started, port 4010's foreign `api-server.js` never touched.

| run | arm | shape | note |
|---|---|---|---|
| `R0-baseline` | — | **PASS** | `d320105` unchanged in THIS worktree — the harness is sound before anything of mine ran |
| `R1-answered` | answered | **PASS** | the pretick is walked; artifact step 8 = `enrolled mem-2, preticked after a fresh read` |
| `R2-unrouted` | unrouted | **PASS** | the withheld branch is walked; the walk still completes |
| `M1-read-stops-answering` | answered | **FAIL-ASSERT** | spec:207 `toHaveCount(0)` on `enrol-unread` — expected 0, received 1 |
| `M2-pretick-never-ticks` | answered | **FAIL-ASSERT** | spec:253 `toBeChecked` — expected checked, received unchecked |
| `M3-withheld-arm-answered` | unrouted | **FAIL-ASSERT** | spec:266 `toHaveCount(1)` on `enrol-unread` — expected 1, received 0 |
| `R3-restored-answered` | answered | **PASS** | restore green |
| `R4-restored-unrouted` | unrouted | **PASS** | restore green |
| `R5-prose-answered` | answered | **PASS** | after the comment-grammar correction below |
| `R6-prose-unrouted` | unrouted | **PASS** | both arms green on the final tree |
| `R7-final-answered` | answered | **PASS** | the resting state; `runs/artifact-answered.json` taken here |

Receipts in `runs/`. Runner `run-journey.sh`. **Eleven runs, every one PASS or FAIL-ASSERT — no
harness-shape failure in this lane**, so every red above is a statement about the product and not
about a server.

---

## What was dark, and how the change is proved to have lit it

`L-MEALS-ENROL-JOURNEY-LOCATOR` recorded the gap and refused to close it in passing: the fixture
served no `GET /v1/meals/programs/{id}/members`, so `ListProgramMembers` never answered, the panel
took its `enrolledUnknown` branch on **every run this journey has ever had**, and the preselection
`lane/meals-enrol-pretick` exists to provide was exercised by nobody. The journey named
`meals.program.members.set` in its capability list throughout.

**A green walk is not the evidence. The element that renders BECAUSE the read failed is.** The
`enrol-unread` / `enrol-unread-refusal` pair is gated on `enrolledUnknown` (`v-else-if` in the panel),
so it is on screen if and only if that read did not answer. The locator lane's probe caught both of
them in real mounted DOM at `2e3f39d` (`../L-MEALS-ENROL-JOURNEY-LOCATOR/runs/R1-probe.txt`,
`PROBE-2` and `PROBE-3`). The answered arm now asserts **`toHaveCount(0)` on both**, which is a claim
about which branch executed and not about whether the page loaded.

The two arms and what each proves:

- **answered** — `enrol-unread` and `enrol-unread-refusal` are gone; `enrol-known` says «Påmeldt nå:
  0»; exactly one candidate box, unticked. Then the box is ticked, `enrol-submit` clicked, and the
  count becomes 1 in both the note and the programmes table's own «Påmeldt» cell. **Then the
  programme selection is taken away and put back** — the whole `v-if="selectedProgram"` block
  unmounts (asserted: `[data-test="enrol"]` count 0) and remounts, so every box on screen afterwards
  was built from scratch by `resetEnrolSelection` out of what `ListProgramMembers` answered and out of
  nothing else. That is what separates *preticked from the read* from *the box I clicked is still
  clicked*, which is all a post-write check would have shown.
- **unrouted** — the withheld pair is present, and the control is **withheld, not offered empty**:
  `enrol-known`, the candidate boxes and `enrol-submit` are all asserted **absent**. The refusal
  sentence is the same one the locator lane's probe recorded, byte for byte: «Denne serveren svarte
  ikke som Company Meals. Vi vet ikke om modulen finnes her.»

## The withheld world is not a fixture artefact — it is a shipped backend

**`GET /v1/meals/programs/{programId}/members` does not exist on `feature/restaurant-modules`.** Read
by object, never from a working tree (`git show refs/heads/…`, per the standing warning about the
backend checkout being 63 commits behind on `lane/meals-grace-pins`):

- `Controllers/Meals/MealsProgramController.cs` on `feature/restaurant-modules` carries endpoint 12
  `[HttpPost("programs/{programId:guid}/members")]` and **no `[HttpGet]` counterpart**.
- `Services/Meals/Interfaces/IMealsProgramService.cs` there declares endpoints 9–12 and **no
  `ListProgramMembersAsync`**. `git grep ListProgramMembers refs/heads/feature/restaurant-modules`
  returns nothing.
- Endpoint 12R exists on exactly one ref in the api repo: **`lane/meals-members-read`** — the branch
  `L-MEALS-ENROL-PRETICK` recorded building against (`086ac34f`), still unmerged.

So the two arms are not "the real world and a simulated failure". **They are the two backends that
exist today**, and the surface an operator on the merge candidate would see is the withheld one. That
is why closing this could not mean deleting the withheld branch: doing so would have swapped which
one is dark. It is also why **only the GET moves between arms** — endpoint 12 is present on both
branches, so a knob that darkened the write too would model a backend nobody has.

**This is a Flag for whoever sequences the merge, not a defect in this lane** — see the RETURN's
`spec_gap`. `lane/meals-enrol-pretick` and everything above it deletes the on-screen note that said
no route reads the enrolled set back. Landed onto a backend without 12R, the panel is correct but
permanently withheld, and this journey's default arm reds. The frontend lane and the api lane have to
land together, or the frontend one lands into a surface that can never offer its control.

## The arm is DECLARED, never discovered

`E2E_MEALS_PROGRAM_MEMBERS_READ` (unset ⇒ `answered`) is read by `test/e2e/fixture/meals.js` and by
the spec. A step that instead read the DOM and asserted whichever branch it found would be green
under both — **including on the day the read silently stops answering, which is this defect exactly**.
M1 is that scenario run deliberately, and the journey reds.

`CI=1` in the runner is load-bearing twice over: it stops a foreign server being reused (port 4010 is
another checkout's `api-server.js` and was never touched), and it is *why the knob works at all* —
with `reuseExistingServer` off, every run starts a fresh fixture process that reads the variable
anew. Under a reused server the second arm would silently walk the first arm's world.

The artifact's capability list is **conditional on the arm**: `meals.program.members.set` is claimed
in the answered arm and dropped in the withheld one, because a passing run is evidence *for* what it
names. Both artifacts are kept — `runs/artifact-answered.json`, `runs/artifact-unrouted.json` — and
the capability line differs between them.

## The mutations

Each was applied alone, run, and reverted; both arms re-run green afterwards (`R3`/`R4`).

**M1 — the read stops answering while the arm still claims it does** (the regression this lane exists
to prevent). The fixture's knob is pinned to `unrouted`; the spec still walks the answered arm.

```
Error: expect(locator).toHaveCount(expected) failed
Expected: 0
Received: 1
> 207 |         await expect(enrol.locator('[data-test="enrol-unread"]')).toHaveCount(0);
RESULT M1-read-stops-answering arm=answered d320105 FAIL-ASSERT rc=1
```

**M2 — the read is consulted for the COUNT but never for the ticks.** `resetEnrolSelection` is made to
write `false` for every candidate. `enrol-known` still reads «Påmeldt nå: 1» — that count comes from
`enrolledMembershipIds`, i.e. from the read — so a step that asserted only the sentence stays green
through this. The failure is at the tick, after the count assertion passed.

```
Error: expect(locator).toBeChecked() failed
Expected: checked
Received: unchecked
> 253 |         await expect(reread).toBeChecked({ timeout: 15000 });
RESULT M2-pretick-never-ticks arm=answered d320105 FAIL-ASSERT rc=1
```

**M3 — the withheld arm's own teeth.** The fixture's knob is pinned to `answered` while the spec walks
the withheld arm. Without this the second arm could be a step that asserts nothing an offered control
would violate.

```
Error: expect(locator).toHaveCount(expected) failed
Expected: 1
Received: 0
> 266 |         await expect(enrol.locator('[data-test="enrol-unread"]')).toHaveCount(1);
RESULT M3-withheld-arm-answered arm=unrouted d320105 FAIL-ASSERT rc=1
```

## The fixture answers what the backend answers, and no more

Every shape below was read from `refs/heads/lane/meals-members-read` **by object**.

- **12R** answers `{ programId, revision, members: [{ programMemberId, membershipId, state,
  createdAtUtc }] }`, `Enrolled` rows only — the service's own `Where(… State == Enrolled)`. A
  `Removed` row answered back re-ticks somebody an admin deliberately removed and the next whole-set
  submit puts them back, so the fixture keeps those rows and filters them out rather than deleting
  them. An absent programme is an opaque 404, the same answer a cross-company one gets.
- **The revision is the PROGRAMME's own and is deliberately the SAME string the programmes list
  carries** (`MealsRevision.Encode(program.ConcurrencyVersion)` there, `program.revision` here). The
  client must take it from this read rather than from the list, but in a quiet world the two are equal
  and **no browser walk can see the difference**. Making them differ here to let the walk "prove" it
  would be the fixture inventing a backend; that property is proved instead by
  `test/meals-enrolment-journey.test.js` over a world built so they disagree.
- **12** compare-and-swaps on that revision (409 `meals.stale-revision`), refuses a revoked membership
  409 `meals.membership-revoked`, answers an unknown or cross-company membership an opaque 404,
  validates the whole desired set **before** writing anything, **flips a `Removed` row back rather
  than minting a second row** (so `programMemberId` is stable across a re-enrol), advances the
  programme's revision and updates `enrolledMemberCount`.
- **Two real refusals it does not give are stated in prose, not as `@backend-unmodelled`
  declarations** — that grammar belongs with a route anchor (`fixture-divergence.js`), and neither of
  these routes is anchored. `fixture/events.js:392` sets the same precedent for the same reason. They
  are unanchored because 12R is absent from `feature/restaurant-modules`: an anchor would red the
  divergence check for every lane pointing at that branch, which is a true signal that belongs in the
  Flag above rather than in everybody else's guard. `npm run test:e2e:fixture-divergence -- --prove`
  is **7/7 green** on this tree, and the fixture's anchored-route set is unchanged.

## Harness

Runner `run-journey.sh`, inherited from `L-MEALS-ENROL-JOURNEY-LOCATOR` (and it from
`L-JOURNEY-REGRESSION-BISECT`). This lane's own ports **3779/4779**, asserted free before every run;
`CI=1`; `E2E_API_BASE_URL` deliberately unset, since setting it grep-inverts `@fixture` and would run
nothing while reporting success; `.nuxt` cleared per run and the shared `node_modules/.cache` left
alone; `node_modules` symlinked to the shared checkout's and `core/` pre-populated so `ensureCore()`
mutates no other tree.

**No `journey.shot` was added.** Screenshots are numbered by position, so one inserted mid-walk
renumbers every later file, orphans the old names in `artifacts/journeys/`, and would make the two
arms disagree about which number means which screen. The evidence for the new steps is their
assertions and `runs/artifact-answered.json`.

Also green on this tree: `npx eslint` on both changed files (clean), and
`meals-enrolment-journey` / `meals-admin-components` / `meals-companies-page` / `meals-admin-view` /
`meals-admin-client` — **5 suites, 130 tests**. Per C5 none of that is acceptance: the claim here is
that the walk exercises the pretick, and a person opening the surface remains the gate.
