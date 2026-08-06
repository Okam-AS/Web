# L-MARGIN-WASTE-SURFACE-IS-HONEST — evidence

Worktree `/Users/svendaneel/okam/Web/.claude/worktrees/agent-a14e83ac504f04840`, branch
`lane/margin-waste-surface-is-honest`, cut from `8ac6f636` (`lane/focustrap-teardown`, the tip the
repo owner's checkout is on). Nothing pushed, no shared ref moved, no migration.

Ports used: web `3925`, fixture `4925`. The owner's `3971`/`5971` and the containers
`okam-lwtwo-sql` / `okam-lwtwo-redis` were never bound, stopped or touched. `node_modules` was
**copied** (rsync, minus `.cache`) rather than symlinked to his checkout, so my webpack cache could
not collide with the dev server he is compiling against. No process was killed by pattern; none was
killed at all.

---

## 1. The routes really are absent — swept, not assumed

`route-sweep.txt` — live sweep of the API the owner is running on `:5971`, GET only:

```
  /margin/status                   -> 401     (exists, wants a bearer)
  /margin/coverage                 -> 401
  /margin/statements               -> 401
  /margin/recipes                  -> 401
  /margin/ingredients              -> 401
  /margin/suppliers                -> 401
  /margin/price-imports            -> 401
  /margin/waste                    -> 404     <-- no handler
  /margin/definitely-not-a-route   -> 404     <-- control row
```

`/margin/waste` is indistinguishable from a path nobody ever wrote. Every other Margin route the
frontend calls is registered. ASP.NET registers a controller's actions together, so the GET's 404 is
all four routes' 404: there is no `MarginWasteController` to register any of them.

Corroborated four independent ways: this sweep; `test/e2e/fixture/` containing the string `waste`
**zero** times (the harness reproduces production without being arranged to); the Margin demoplan's
grep of `Controllers/ Services/ Models/ Enums/ Helpers/` at `8e2b57de` returning zero Margin hits;
and `L-MRG-WASTE-2`'s return, which records the backend as existing only on the unmerged
`lane/margin-waste`.

---

## 2. Which ending, and why

The blocker `F-MARGIN-WASTE-PANEL-CALLS-NOTHING` clears when *"every route the waste client calls has
a handler on the shipped branch, **or** the panel stops offering a capability the server does not
have."* I took the second, implemented as **runtime capability detection** rather than deletion.

**Not "build the backend", because it was already built and is not mine to land.** `L-MRG-WASTE`
returned `built`: MIG-23, `TR_MarginWasteEntries_FrozenWeekImmutable`, entity/service/controller,
proven at layer 2 on a chain-built database (568 SQL-tier tests parsed element by element). It is
unmerged on `lane/margin-waste`. Landing it is not a merge — `plan.md:18056` records that merging it
lands **ten** schema changes because `lane/wf-w5-timesheet` was cut from its tip; the SQL tier needs
`D-DOCKER-VM`; C2 gives the migration slot to one author at a time and my brief forbids me a
migration; and the §2 spec departure is still owed Sven's ratification. Rebuilding it would duplicate
MIG-23 and violate C2.

**Not deletion, because the capability is real and imminent.** Deleting the panel would discard
proven work and have to be re-added. A runtime check un-withdraws itself the day the controller
ships — the 404 stops arriving, the flag goes false, and the data states are exactly what they were,
with nothing to take back out.

**And it is the estate's own established pattern for a planned-but-unbuilt capability**, not an
invention: `WorkforceEngagementPanel.vue:133` (*"a revoke button would be a control that does
nothing"*), `MealsProgramPanel.vue:106`, `MealsCompanyPicker.vue:81`, and
`TrainingDisclosurePanel.vue:34` (*"'Nobody has looked' and 'you may not ask' are different facts,
and only one of them is reassuring"*). Every one renders the surface, names the missing route in
prose, and omits the control with no handler. None hides behind a flag; the Margin spec explicitly
rejects a fourth `Margin.*` flag (`50-food-margin-spec.md:186`).

---

## 3. What a person reads — before and after, in a browser

Fresh compiler per arm (`.nuxt` deleted between them), same fixture, same ports, same script.
The fixture 404s `/margin/waste` because it serves no waste route — the same router 404 the live API
gives.

### BEFORE (`8ac6f636`) — `BEFORE-observation.txt`, `BEFORE-waste-panel.png`, `BEFORE-coverage-panel.png`

```
GET /margin/waste statuses seen by the browser: NO REQUEST WAS MADE

waste panel:      "Vi fikk ikke hentet svinnet. Det er ukjent — det betyr ikke at ingenting er kastet."
                  ...followed by a complete recording form.
coverage panel:   "Ingenting er registrert som svinn i dette vinduet."

recording controls offered: 6 of 8
```

Two separate false claims on one screen, and a third fact behind them:

- the waste panel reports **a fetch that failed** for a capability that does not exist — and, on the
  create path, **without having sent a request at all**. `createStatement` loaded coverage alone while
  rendering both panels. So the sentence "we could not fetch the waste" was printed about a request
  that was never made. That is the brief's thesis in its most literal form: an instrument that cannot
  tell absence from silence, reporting a failure it did not observe.
- the coverage panel reports **a measurement nobody made**, under the week's reconciled food-cost
  figures.
- **6 of 8 recording controls are offered**, including the `Registrer` button, whose only possible
  outcome is to post a counted loss into a route that does not exist.

### AFTER — `AFTER-observation.txt`, `AFTER-waste-panel.png`, `AFTER-coverage-panel.png`

```
GET /margin/waste statuses seen by the browser: 404

waste panel:      "Svinnregistrering er ikke tilgjengelig her ennå. Det er ingenting å vise og
                   ingenting å registrere — og tallene over er upåvirket uansett, for svinn inngår
                   aldri i dem."
coverage panel:   "Svinnregistrering er ikke tilgjengelig her ennå, så det finnes ingen svinntall for
                   dette vinduet. Tallene over er upåvirket uansett — svinn inngår aldri i dekket
                   eller udekket omsetning."

recording controls offered: 0 of 8
```

The request is now genuinely made and genuinely refused (404 recorded), and both panels say the same
true thing about the same absence.

---

## 4. The assertions discriminate

`test/e2e/journeys/margin-waste-absent.spec.js` — a real browser journey.

- **RED at `8ac6f636`**: `[data-test="waste-absent"]` not found (`BEFORE-screenshot.png`).
- **GREEN on this branch**: 1 passed.

Its last step is a falsification: it refuses to pass unless the browser actually issued a request to
`/margin/waste` and every response was 404. Without it the walk would pass equally against a page
that renders an absent state because no read was ever attempted — which is the same defect class it
exists to remove.

---

## 5. The coverage half was two layers deep, and a green test was holding the lower one up

The panel was only the symptom. `utils/margin/statement-view.js:readWasteSummary` **manufactured** the
zeros:

```js
const block = waste && typeof waste === 'object' ? waste : {};
return { valuedMinor: longOrNull(block.valuedMinor) || 0,
         entryCount:  longOrNull(block.entryCount)  || 0, ... };
```

with a doc comment justifying it: *"An absent block reads as 'nothing recorded' … the server always
sends it."* **The server never sends it** — `MarginCoverageResponse` has no waste field at all. So the
reader converted a total silence into a counted zero, and the panel printed it.

It now returns `null` for an absent or unreadable block and coerces no field, and the panel tells four
states apart: **not served** / **not stated** / **a counted zero** / **a real breakdown**. Absence
outranks unknown only when the sibling 404 says so (`wasteAbsent && coverage.waste === null`), so a
server that *does* send waste totals still has them rendered — the new state cannot swallow a
measurement that arrived.

**The test that blessed the fabrication is FLIPPED, not deleted:**

```js
test('an absent summary block reads as nothing recorded rather than as unknown', () => {
  expect(readWasteSummary(undefined).entryCount).toBe(0)   // <-- was green
```

That green assertion is *why* the defect survived review: every later reader was told on good
authority that "nobody said anything about waste" and "the kitchen threw nothing away" were the same
fact. It is kept, inverted, so the behaviour cannot come back quietly. Three further cases were added
around it — an unreadable block, a block that arrived stating zero (which must stay a counted zero),
and a withheld field inside a block that arrived (which must stay null).

---

## 6. Suites

- `margin`: **23 suites / 458 tests, all passing** (was 21/433 at base; +2 suites, +25 tests, 0 removed).
- Full run: 111 suites pass. Four fail for environment reasons unrelated to this change and present
  at the base commit too — `core-request-path-shape`, `core-price-label` and `price-absence` cannot
  resolve `~/core/*` because `core/` is an empty submodule mount in every lane worktree (the dev
  server borrows it only at runtime), and `journey-artifact-store` asserts
  `/^Web-modules@[0-9a-f]{40}/` against the checkout's directory name, so it fails in any worktree not
  literally named `Web-modules`. It reported `agent-a14e83ac504f04840@8ac6f636…+dirty`, i.e. it read
  my tree correctly and the assertion is the thing that is wrong.
- `eslint`: clean on every changed and added file. Three pre-existing `indent` warnings remain at
  line 698/715 of the dictionaries, untouched by this change.

---

## 7. Findings this lane did not fix

1. **The two prior lanes' work was never landed.** `L-MRG-WASTE-PANEL-SAYS-ABSENT` and
   `L-MRG-COVERAGE-PANEL-SAYS-ABSENT` both returned `built` against
   `/Users/svendaneel/okam/web-wasteabsent` and `/Users/svendaneel/okam/web-mrgcovabsent`, and both
   are still `built-unverified`. The estate's failure here is a **landing** failure, not a build
   failure — the same shape as the backend sitting unmerged on `lane/margin-waste`.

2. **The owner's checkout is carrying an uncommitted fix nobody owns.**
   `/Users/svendaneel/okam/Web-modules` has `readWasteSummary` returning null and a three-state
   coverage panel **in the working tree only** — `L-MRG-COVERAGE-UNKNOWN`'s edits, left there
   deliberately ("copied out, not moved"). `HEAD` has neither. Anyone reading that checkout sees a
   module in a state no commit describes, and a `git checkout`/`clean` would silently discard it.
   **This is why the Margin demoplan and my brief disagree**: the demoplan read the dirty working tree
   and concluded the coverage panel was already honest; the brief read the committed branch and found
   the fabrication. Both were right about the tree they read.

3. **`MarginWasteService.UpdateWaste` (`waste-client.js:78`) is dead at both ends** — no UI caller and
   no backend. Left in place: it is route-for-route documentation of a controller that does exist on
   `lane/margin-waste`, and deleting it would be scope creep into that lane's merge.

4. **The `margin-statement-week` journey filters the evidence away.** Its console-noise filter is
   `/favicon|Download the Vue Devtools|status of 404/i` — so the waste route's 404 was discarded as
   noise on every green run of the walk that covers this exact page. An instrument that suppresses the
   signal it would need to see the defect.

5. **`journey-artifact-store.test.js` cannot pass in a lane worktree** (item 6 above). It hard-codes
   the checkout's directory name.

6. The plain-Playwright observer in this lane does not get the journey harness's per-test
   `/__fixture/reset`, so it must be run **alone**. Both arms were run alone; running it alongside the
   assertion journey fails on the second spec's inherited world, not on the product.
