# L-MEALS-PROJECTION-LAG-VISIBLE — evidence

Brief: `28f398c7` · verdict: **built**

**Exit criterion.** *A venue reading the settlement surface can see the projection lag that gates it,
or the surface says why it cannot.*

**Both branches are taken, on one surface, keyed on whether the figure could be established.** When
the status read answers, the lag is rendered by value. When it does not, the panel says it could not
be established and names what would have to change. There is no state in which it renders a zero it
did not read.

**Landed at** `lane/mrg-lag-visible @ b2aa72e`, parent `3cd25709` (= the frontend integration tip the
brief named). Built in the worktree `/Users/svendaneel/okam/wt-mrglagvis`.

---

## 0. The brief is garbled; what was executed

`docs/plan/briefs/L-MEALS-PROJECTION-LAG-VISIBLE.md` lines 13–83 splice in fragments of two other
briefs (`L-CONFIRM-CHAIN-REVIEW` and `L-MONEYPATH-PAIR-REVIEW`), mid-sentence, twice. The Objective
(line 7), the two paragraphs before the splice (lines 9–13) and the Exit criteria (line 85) are
legible and mutually consistent, and are what was executed. Reported, not improvised around.

**The lane is named `MEALS`; the subject is `MARGIN`.** The objective's own words —
"a venue cannot see the projection lag its own settlement is computed from", "the finalize path
already refuses while the projector is behind, and the rebuild control is elevated-role only" —
match one finding in the estate exactly, and it is in the Margin module. Named here so nobody later
reads the lane id as evidence a Meals surface was meant.

## 1. Tip state as actually observed (the brief said to verify, not to trust)

| claim in brief | observed | verdict |
| --- | --- | --- |
| frontend integration `3cd2570` | `3cd25709ec6af4806e4683e666f44814ff8e441a` on `feature/restaurant-modules` | **correct** |
| backend `8e2b57de` | `8e2b57de L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing`, in `/Users/svendaneel/okam/OkamAPI-modules` | **correct** |
| "the finalize path already refuses while the projector is behind" | `ac0f2f30 Refuse to finalize a margin statement while the projector is behind`; `git merge-base --is-ancestor ac0f2f30 8e2b57de` → **yes** | **correct** |
| "the rebuild control is elevated-role only" | `pages/admin/margin-statements.vue:100` at HEAD — `<section v-if="isPowerUser">`, and `MarginProjectionController` is PowerUser | **correct** |
| the venue cannot see the lag | same line: the lag `<p data-test="projection-lag">` was INSIDE that `v-if`, so it was gated with the button | **correct** |

**Not `fail-spec`.** The capability did not exist at HEAD and exists on no branch: a
`git log --oneline <branch> -- pages/admin/margin-statements.vue` over all 57 local branches returns
`7b99f2a` or `c1f34c4` for every branch that has the file at all, and both are ancestors of HEAD. The
newest of them is HEAD's own. Nothing unmerged touches this page.

### Unmerged Meals branches checked (the brief asked)

| branch | tip | merged into HEAD | touches this surface |
| --- | --- | --- | --- |
| `lane/meals-enrol-ui` | `802041a` | **no** (1 ahead of `3cd2570`) | no |
| `lane/fe-meals-docsync` | `7ac2f92` | **no** | no |
| `lane/fe-meals-claim-receipt` | `d833d19` | **no** | no |
| `lane/meals-reachable-web` | `f65595d` | **no** | no |

None of the four has a commit touching `pages/admin/margin-statements.vue`, `utils/margin/**` or the
three dictionaries' `mrgs_projection_*` block. No collision with a live sibling.

## 2. The backend truth this was built against (`8e2b57de`)

The whole change rests on one asymmetry, and it was read out of the backend rather than assumed:

- `Controllers/MarginStatusController.cs` — `[Authorize]`, `EnsureModuleAccessibleAsync(storeId)`:
  **404** when the module is off or the store is out of scope, **403 when the caller is not a
  StoreAdmin of the store.** There is no PowerUser requirement. **The venue's own manager was always
  entitled to this read.**
- `Services/Margin/MarginProjectionStatusContributor.cs` fills
  `MarginStatusResponse.Projection` = `{ WatermarkJournalEntryId, LatestJournalEntryId, LagEntries,
  LastProcessedAtUtc }`.
- `Services/Margin/MarginStatementService.cs:326-334` — finalize refuses when `status.LagEntries > 0`,
  via `MarginProblemException.ProjectionBehind(lag, watermark, head)`.
- `Helpers/Margin/MarginProblemException.cs:105-121` — **409**, code `margin.projection-behind`,
  extensions `conflictKind`, `retryable: true`, `lagEntries`, `projectionWatermark`,
  `journalHeadEntryId`.
- `Helpers/Margin/MarginProblemDetails.cs:43-47` — extensions are flattened onto the problem
  document root, so `error.problem.lagEntries` is on the wire.
- `Controllers/MarginProjectionController.cs` (rebuild) really is PowerUser-only.

**So the gate on the lag figure was the client's own, not a server rule.** The reading is un-gated;
the repair is left exactly where it was.

## 3. What changed

Seven files, all reads or surface. **No money-path write is added, moved or re-actored** — C4 is not
engaged: the only write on this page (`RebuildProjection`) is untouched in route, role and caller,
and the finalize call site is unchanged except for how its *refusal* is rendered.

| file | change |
| --- | --- |
| `pages/admin/margin-statements.vue` | panel un-gated; `projection-gate` note added; `finiteNumber` guard; `margin.projection-behind` intercepted in `finalize()`; `refreshProjection()` extracted and reused by `rebuildProjection()` |
| `utils/margin/api-client.js` | `MARGIN_PROJECTION_BEHIND` exported and documented |
| `translations/{no,en,de}.ts` | 5 new keys each, **hand-edited, no regex, no bulk operation** |
| `test/margin-statements-page.test.js` | +8 tests |
| `test/e2e/journeys/margin-statement-week.spec.js` | absence step restated; finding replaced; one shot added |

### The three states, and why there is no fourth

`projectionGateLabel` keys on `projectionLag`, which is `{lag, watermark}` or **null**:

- **behind** → `mrgs_projection_gate_behind` — names the refusal and that it clears itself;
- **level** → `mrgs_projection_gate_current` — says the projection is not what is holding the freeze;
- **not established** → `mrgs_projection_gate_unknown` — says the page cannot tell whether the week
  can be frozen, and that **the module status read is what has to answer** before the figure can be
  shown. It deliberately does **not** say the freeze is clear.

### A real defect the test found, not the review

The first guard used `Number(projection.lagEntries)`. **`Number(null)` is `0`**, so a status read
that answered with a projection carrying no lag rendered as *"0 poster står igjen"* — a fabricated
zero presented as a reading, which is precisely the failure this lane exists over. Caught by the
`lagEntries: null` world on the first run (`Expected: "mrgs_projection_unknown"`,
`Received: "mrgs_projection_lag:{"lag":0,...}"`). Replaced with `finiteNumber`, which accepts only a
JSON number. The same coercion was live on the refusal path and is fixed there too — a refusal
saying "0 entries behind" contradicts itself.

## 4. Instrument 1 — the page tier

`npx jest test/margin-statements-page.test.js --coverage=false` → **40 passed, 40 total.**
`npx jest test/margin test/journey --coverage=false` → **24 suites, 569 passed, 569 total.**

Both run in `/Users/svendaneel/okam/Web-modules`. `test/journey-artifact-store.test.js` — which the
brief warned reds in a differently-named worktree — **passes** there, because that is the correctly
named checkout. It was not run in the throwaway worktree and no failure of it was observed.

**Non-vacuity: one session, one variable.** Every world in the new describe block is the same store
admin (`isPowerUser: false`) and the only thing that moves is the projection the status read answers
with. Asserted by rendered value, never by presence:

| world (`lagEntries`, `watermark`) | `projection-lag` renders | `projection-gate` renders | repair |
| --- | --- | --- | --- |
| `41`, `8771` | `mrgs_projection_lag:{"lag":41,"watermark":8771}` | `mrgs_projection_gate_behind:{"lag":41}` | absent |
| `0`, `8812` | `mrgs_projection_lag:{"lag":0,"watermark":8812}` | `mrgs_projection_gate_current` | absent |
| no `projection` at all | `mrgs_projection_unknown` | `mrgs_projection_gate_unknown` | absent |
| `null`, `8812` | `mrgs_projection_unknown` | `mrgs_projection_gate_unknown` | absent |

The last two additionally assert the rendered text **does not contain `"lag"`** — the withheld state
cannot be satisfied by a zero.

**The refusal test is driven through the page**, not by calling the handler: the period row is
clicked and `[data-test="finalize"]` is clicked. Its world moves the fixture's lag from 0 to 41 at
the moment of the refusal, so it asserts the two things a stale panel gets wrong:

- `[data-test="failure"]` → `mrgs_err_projection_behind:{"lag":41}` (the size the **refusal** carried,
  not a re-read);
- `[data-test="projection-lag"]` → `{"lag":41,"watermark":8771}` — the panel stops contradicting the
  refusal it just caused.

## 5. Instrument 2 — mutation proof

`lanes/L-MEALS-PROJECTION-LAG-VISIBLE/mutation-proof.py`, output in `mutation-proof.txt`.

**One tree is mutated and the same tree is measured.** The script uses `TREE` for the edit, for a
`git diff --numstat` that proves the edit landed, and as the jest cwd. It is an isolated worktree,
not the shared checkout, because three sibling lanes are live in `/Users/svendaneel/okam/Web-modules`
and a mutation applied there for the seconds a jest run takes would have redded **their** suites.

| mutant | result |
| --- | --- |
| re-gate the whole panel behind `isPowerUser` (the defect this lane removes) | DIED |
| unbind the gate note from its computed (a constant in its place) | DIED |
| make the gate always read "caught up" (kill the behind branch) | DIED |
| coerce instead of withholding — `Number(null) === 0` | DIED |
| drop the status re-read after a lag refusal | DIED |
| stop intercepting `margin.projection-behind` | DIED |
| size the refusal from the panel's re-read instead of the refusal's own extension | DIED |
| delete one new key from the Norwegian dictionary only | DIED |
| **POSITIVE CONTROL** — a no-op edit inside the suite | **GREEN, as required** |

8/8 killed. No mutant survived, so neither instrument trap the brief named applies; the tree was
verified byte-identical to its starting state afterwards.

## 6. Instrument 3 — a browser, the venue's own session

`E2E_WEB_PORT=3910 E2E_FIXTURE_PORT=4910 npx playwright test test/e2e/journeys/margin-statement-week.spec.js`
→ **1 passed (24.3s)**, log in `journey-run.txt`.

Run **in the isolated worktree on non-default ports**, so it could not reuse, disturb or be
disturbed by a sibling's dev server, and did not borrow the shared `core/`. No container was started;
the fixture is the in-repo Node server. Only this one journey was run — the suite was not re-run.

The world's projector stands **four entries behind** (`test/e2e/fixture/margin.js:107`,
`projectionLag: 4`) against watermark `918273`, and the session is a store admin (`isPowerUser` is
false for every store identity in this world). On screen, in the venue's own Norwegian:

> **Salgsprojeksjon**
> Journalen er lest til og med post 918273. 4 poster står igjen.
> Uken kan ikke fryses så lenge 4 poster står igjen: salgstallene ville da fryses som et gulv — ekte,
> men for lave med et ukjent beløp. Projeksjonen tar igjen av seg selv, vanligvis i løpet av et par
> minutter. Beregn på nytt og frys etterpå.

with **no rebuild control in that card.** Shot:
`lanes/L-MEALS-PROJECTION-LAG-VISIBLE/04-the-projection-the-venue-can-now-read.png`
(full set + receipt at `/Users/svendaneel/okam/wt-mrglagvis/artifacts/journeys/margin-statement-week/`;
the receipt records `commit 3cd25709…` and `fixture@3cd25709…+dirty`, not the worktree path).

**The journey's own step was restated rather than left to red.** It asserted BOTH the lag and the
repair as absences; half of that was right. The repair is still asserted absent (`toHaveCount(0)`);
the reading is now asserted **by value** (`toContainText('4 poster står igjen')`), which a panel
rendering a constant would fail. Artifacts are gitignored in this repo, so they are **not** in the
commit — only the seven source files are.

## 7. Findings, and what this does NOT close

**F-1 — this walk freezes a week the live backend would refuse to freeze.** The fixture's
`POST /margin/statements/{id}/finalize` freezes unconditionally, while `FinalizeAsync` refuses at
`LagEntries > 0` and this world stands at four. The journey's freeze and correction steps therefore
walk a path the real server would refuse. **Not fixed here**: closing it reds those steps, and their
only repair in this world is PowerUser-only, so the fixture change is a decision with a product
question inside it. Recorded as a `journey.finding('note', …)` in the spec, so the receipt carries it.
This is also why the refusal copy is proven at the page tier — **the fixture cannot produce it.**

**F-2 — `F-MRG-FINALIZE-LAG` is now half stale, in the safe direction.** Its body says "the statement
seam computes a floor and freezes it". That was true when written and is not true at `8e2b57de`:
`ac0f2f30` made finalize refuse. Its `clears_when` reads *"finalize refuses or stamps a caveat when
the projector lags, **and** the lag is visible to a store admin rather than to power users only"* —
the first clause was already met by the backend and the second is met by this lane. **I may not edit
`docs/plan/**`, so this is reported rather than actioned**; a reader should verify both clauses
before closing it, because the flag's prose contradicts its own `clears_when`.

**Not closed:** the live .NET backend was read, never driven — no wire-tier or SQL-tier evidence was
produced and none was claimed. Whether a real store admin's JWT resolves `isPowerUser: false` and a
StoreAdmin scope simultaneously is a live-world question this fixture cannot answer.

## 8. Files touched

In the commit (`lane/mrg-lag-visible @ b2aa72e`, parent `3cd25709`):

1. `pages/admin/margin-statements.vue`
2. `utils/margin/api-client.js`
3. `translations/no.ts`
4. `translations/en.ts`
5. `translations/de.ts`
6. `test/margin-statements-page.test.js`
7. `test/e2e/journeys/margin-statement-week.spec.js`

Untracked, in the shared checkout, mine: `lanes/L-MEALS-PROJECTION-LAG-VISIBLE/**` and
`docs/plan/returns/L-MEALS-PROJECTION-LAG-VISIBLE-1.md`.

**The shared checkout `/Users/svendaneel/okam/Web-modules` was returned to the state I found it in.**
The five files dirty when this lane started — `lanes/L-EV-JOURNEY-TIMEBOMB/mutation-proof.{py,txt}`,
`pages/preferences/communications.vue`, `test/e2e/journeys/admin-refusal-worker.spec.js`,
`utils/growth/growth-guest-client.js` — are siblings' and were neither read into nor cleaned.

`npx eslint` on all seven files: **0 errors.** Three `indent` warnings in the dictionaries are
pre-existing at HEAD (verified by linting `git show HEAD:translations/no.ts`; the offender is
`nav_group_modules` at line 715, far above every line this lane touched).
