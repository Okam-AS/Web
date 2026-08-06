# Evidence — L-MEALS-CLAIM-RECEIPT

brief `ff75fe32` · exit: *when the claim response carries an employee reference the receipt prints it
as the statement reference, falling back to the membership id only when absent, asserted for both
wire shapes*

## 0. Where this ran, and at what

| | |
|---|---|
| repo | `Web-modules` (frontend). The dispatch said "Backend"; the objective, the page, the copy in three languages and the wire it discards are all frontend. Nothing backend was edited. |
| base | `feature/restaurant-modules` @ **`4b5c5c2`** — *"The settlement journey stops counting down to a date…"* |
| worktree | `/Users/svendaneel/okam/web-meals-claim-receipt` on new branch `lane/fe-meals-claim-receipt` — created clean (`git status` empty at creation). Nothing was done in `/Users/svendaneel/okam/Web-modules`. |
| commit | **`d833d19`** (local only; nothing pushed, no shared ref moved) |
| backend read for truth | `/Users/svendaneel/okam/OkamAPI-modules`, branch **`feature/restaurant-modules` @ `569887a5`** — the tip the brief named, and still the tip when measured. Read-only; that checkout's working tree is on `lane/meals-grace-pins` @ `34c6c103` and was never touched. |
| containers | **none started, none stopped, none touched.** No `dotnet`, no SQL tier. `npx jest` only. |
| migrations | none authored. No schema needed. |

## 1. Verify-before-building: the defect was real at the tip

Not a phantom. Read at `4b5c5c2`, `pages/meals/join.vue` line 55:

```
{{ claimed.membershipId || dash }}
```

— the claim response's `employeeReference` reached the page and was discarded.

**The unmerged Meals lane branches were checked too, per the brief.** Not one of them had built it:

| branch | merged into integration? | receipt line |
|---|---|---|
| `lane/meals-reachable-web` | **no** | `{{ claimed.membershipId \|\| dash }}` |
| `lane/fe-meals-claim` | yes (already an ancestor) | `{{ claimed.membershipId \|\| dash }}` |
| `lane/fe-meals-write` | yes (already an ancestor) | file does not exist at that point |
| `feature/restaurant-modules` | — | `{{ claimed.membershipId \|\| dash }}` |

## 2. What the wire actually carries (verified in the backend, not assumed)

- `Models/Meals/MealsMembershipModels.cs:116` — `MealsMemberModel.EmployeeReference` **exists** and is
  documented as *"copied from the invitation at claim (decision D-MEALS-EMPREF)"*.
- `Services/Meals/MealsMembershipService.cs:424` `ClaimAsync` — the new `MealsMembership` and the
  returned `MealsMemberModel` both take `EmployeeReference = invitation.EmployeeReference`.
- `Controllers/Meals/MealsMembershipController.cs:179` — `return Ok(model)`, i.e. through MVC, i.e.
  camelCase (`WebApi.Tests/Meals/MealsContractFixtureTests.cs` pins the casing law).
- `Services/Meals/MealsStatementService.cs:513` — the rule the receipt must mirror, **by value**:

```csharp
return employeeReferences.TryGetValue(membershipId, out var reference) && !string.IsNullOrWhiteSpace(reference)
    ? reference
    : membershipId.ToString();
```

  `IsNullOrWhiteSpace`, so **whitespace is absence** on the bill. The receipt now agrees; the
  concierge table previously did not (its `text()` accepted `'   '`).

### why both spellings are read

`Services/Meals/MealsIdempotentMutation.cs:65` stores a replay answer with a **bare
`JsonConvert.SerializeObject(response)`** — PascalCase, no camelCase resolver near it — and line 48
reads it back with `DeserializeObject<T>`. So the wire stays camelCase on a replay only because of
that round trip through the typed model, not because of anything about the field. **This page's retry
path is the replay path.** Accepting either spelling costs one `||`; the estate precedent is
`utils/margin/statement-view.js` (`receipt.Currency || receipt.currency`, "rather than pinning the one
that happens to be true today").

## 3. What was built

| file | what |
|---|---|
| `utils/meals/statement-reference.js` | **new.** The one rule: `employeeReferenceOf`, `membershipIdOf`, `statementReference`. Trims; treats blank as absent; reads both spellings. |
| `utils/meals/admin-view.js` | `memberRow` now *uses* that rule instead of restating it — so the concierge table and the invitee receipt cannot answer differently about the same bill line. Fixes the whitespace divergence as a side effect. |
| `pages/meals/join.vue` | receipt prints `statementRef`; new `refFromCompany` computed; `data-test="statement-ref"` added (the `.mj-ref` class the journey reads is kept). **Both stale comment blocks rewritten** — the template's MIG-17 note and the component's `MIG-17: WHAT THE CLAIMANT IS TOLD` section, which asserted *"`MealsMembership.EmployeeReference` does not exist … a bare GUID … permanently"*. |
| `translations/{no,en,de}.ts` | one added key `meals_claim_ref_from_company`, rendered **only** when the company supplied the string. The absent case deliberately gets no extra sentence (the page's own timing decision: do not alarm about the one thing nobody can act on). |
| `test/meals-claim-page.test.js` | +8 tests, `describe('the reference the statement will actually name')`. |
| `test/e2e/journeys/meals-guest-claim.spec.js` | **comment only.** Its MIG-17 block asserted the same falsehood. Its own assertion (`expect(reference).not.toBe('—')`) is left as-is and now says in as many words that it is weak and why — see finding F2. |

## 4. The exit criterion, asserted by value, in both directions, for both shapes

Every assertion reads `wrapper.find('[data-test="statement-ref"]').text()` and compares it to a
literal. **Never non-emptiness** — a reference is `'ANS-2287'`, an id with a prefix on it, and
`not.toBe('—')` is satisfied by either branch.

| # | wire shape | reference | asserted |
|---|---|---|---|
| 1 | camelCase `employeeReference` | `'ANS-2287'` | `=== 'ANS-2287'` **and** `!== membershipId` |
| 2 | camelCase `employeeReference` | `null` | `=== membershipId` **and** `!== 'ANS-2287'` |
| 3 | PascalCase `EmployeeReference` | `'ANS-2287'` | `=== 'ANS-2287'` **and** `!== membershipId` |
| 4 | PascalCase, key **omitted entirely** | absent | `=== membershipId` **and** `!== 'ANS-2287'` |
| 5 | camelCase | `'   '` | `=== membershipId` (matches the backend's `IsNullOrWhiteSpace`) |
| 6 | neither field present | — | `=== '—'`, no invented string |
| 7 | both branches | — | the "your employer supplied this" sentence renders in 1 and **not** in 2 |
| 8 | — | — | `meals_claim_ref_label` / `_body` / `_from_company` are non-empty strings in `no`, `en`, `de` |

## 5. Non-vacuity — four states, all watched

Driver: `mutation-proof.py` (this directory) · full transcript: `mutation-proof.txt`.
Each arm edits `pages/meals/join.vue` for real, runs jest with `--no-cache` so the mutated SFC is what
executes (never `--no-build`), prints **every** test's verdict by name, and restores.

| state | mutation | result |
|---|---|---|
| **1 BASELINE** | none | **all 46 green** |
| **2 IGNORE-REFERENCE** | `statementRef` → `membershipIdOf(this.claimed)`, `refFromCompany` → `false` (i.e. the receipt this lane replaced) | **3 RED**, and they are exactly the present-case pins |
| **3 IGNORE-FALLBACK** | `statementRef` → `employeeReferenceOf(this.claimed)` (never falls back) | **4 RED**, exactly the absent-case pins |
| **4 RESTORED** | none; file byte-identical to 1 (`IDENTICAL AFTER RESTORE: True`) | **all 46 green** |

Arm 2 red:
```
camelCase, reference present: the receipt prints the COMPANY reference, not the membership id
PascalCase, reference present: the receipt prints the COMPANY reference
only a company-supplied reference is described as the employer's own
```
Arm 3 red:
```
claiming the membership is shown, with the reference the company statements will name them by
camelCase, reference null: the receipt falls back to the membership id
PascalCase, reference absent from the document entirely: the membership id
a whitespace-only reference is absence, exactly as the statement treats it
```

**This is the point the brief made, demonstrated rather than asserted.** Under arm 2 every
*absent*-case pin stayed green — a receipt that never reads the employee reference passes an
absent-only suite. Under arm 3 every *present*-case pin stayed green. Only both arms together pin the
discrimination.

## 6. Suites

Container-free. `npx jest` in the lane worktree.

| run | result |
|---|---|
| baseline at `4b5c5c2` (my edits stashed) | **2581 passed / 2 failed / 2583**, 111 of 112 suites |
| with the lane's changes | **2589 passed / 2 failed / 2591**, 111 of 112 suites |
| delta | **+8 tests, 0 new failures** |
| meals only | `test/meals*` — **217 passed / 10 suites**, all green |
| eslint on all 8 changed files | **0 errors.** 3 `indent` warnings, all at `translations/*.ts` line ~698/715 (`nav_group_modules`), ~4200 lines away from my edits — pre-existing |

### the 2 failures, named — pre-existing and environmental

`test/journey-artifact-store.test.js`:
- `backend identity › asks whoever is holding the port what directory they are running from`
- `backend identity › the world stamp › names the checkout the world script recorded, not the one holding the port`

`test/journey-artifact-store.test.js:457` is `expect(store.buildFromListeningProcess(origin).id).toMatch(/^Web-modules@/)`
— it pins the **checkout's directory name**. Received: `"web-meals-claim-receipt@4b5c5c2…"`. **Measured
on the stashed baseline too**, identically, so it is not this lane's. See finding F1.

### two environment notes, so a re-run reproduces

- `node_modules` is a symlink to `/Users/svendaneel/okam/Web-modules/node_modules` (no install run).
- The `core` submodule could **not** be initialised: its pinned commit `1bcab0b6` lives only on the
  local branch `lane/core-ore-label` and the remote refuses it (`upload-pack: not our ref`). Copied
  from the main checkout instead. A **symlink is not sufficient** — `test/core-request-path-shape.js`
  walks the tree and finds nothing through one (4 spurious reds); a real copy is green. Both figures
  above were taken with the copy in place, so the two runs are comparable.

## 7. Constraints

- **C4 (money-path writes name their actor).** Not engaged: this is a **rendering**, off a response.
  No write, no service, no actor resolution touched.
- **C1 (append-only).** No UPDATE/DELETE, no migration, no EF entity.
- **C2 (one migration author).** No migration authored.
- **C3 (reachability).** `/meals/join` is already routed and already the page the concierge's copy
  button names; nothing new needed a wire.
- **C6 (statutory claims).** No statute, forskrift or § named in any string added.
- **C7 (secrets).** No log or telemetry call added. `Services/OkamFunctionsDocumentRenderer.cs` was
  never opened, read, greped, copied or quoted.
- Guard-after-mutation hazard: none — nothing here throws, and nothing mutates a tracked entity.

## 8. Findings for other lanes (not fixed here — fixing them would duplicate or would be unrunnable)

- **F1 — `journey-artifact-store.test.js` cannot be green in a lane worktree.** Line 457 hardcodes
  `/^Web-modules@/`, the directory name of the main checkout. Since every lane is required to work in
  its own worktree, this suite reds for every lane, permanently, and will train reviewers to ignore
  it. It belongs to L-ARTIFACT-PROVENANCE (`94fa256`). Its intent — *don't take the answer the port
  gives* — survives a fix that reads the expected name from the checkout instead of literalising it.
- **F2 — `test/e2e/fixture/meals.js` has drifted from the model and cannot exercise this branch.**
  Neither `invitationModel()` nor the claim response carries `employeeReference`, and neither seeded
  invitation in `test/e2e/fixture/world.js` (`MEALS_INVITATIONS`, `inv-1`/`inv-2`) has one. So the
  guest-claim journey can only ever render the fallback, and its assertion is
  `expect(reference).not.toBe('—')`, which cannot tell the two branches apart anyway. Left alone
  deliberately: I cannot run Playwright here, and an assertion I did not watch fail is not a pin.
  This is L-FIXTURE-DIVERGENCE / the journeys lane's, and the fixture is the cheap half.
- **F3 — divergence closed in passing.** `utils/meals/admin-view.js` used a non-trimming `text()`, so
  a member whose reference was `'   '` read as *having* one on the concierge screen while the bill
  printed the membership id. Now shares the rule and agrees.

## 9. Merge surface

Not pushed. `lane/fe-meals-claim-receipt` @ `d833d19`, 8 files.

- `pages/meals/join.vue`, `utils/meals/admin-view.js`, `test/meals-claim-page.test.js`,
  `test/e2e/journeys/meals-guest-claim.spec.js` — **no unmerged branch has its own commits on any of
  them.** (`lane/fe-journeys` and `lane/fe-training-meals-surfaces` show deltas on the first and last,
  but the delta is the `_service` computed fix that is already in integration.)
- `translations/{no,en,de}.ts` — touched by ~28 unmerged branches, which is normal here: every lane
  appends keys. Mine is 3 added lines at a stable anchor (`meals_claim_ref_body`). The only unmerged
  branch whose *own* commits change `translations/no.ts` near anything of mine is
  `lane/meals-reachable-web`, and it edits `ff_withheld_note` / adds `ff_withheld_deployment_note` —
  no key collision.
- `utils/meals/statement-reference.js` is new; nothing can conflict with it.
- **Sibling `L-MEALS-VIOLATION-EXACT` is on `MealsDbViolations.cs` in the backend.** No file of mine
  is in that repo at all, so there is no overlap to reconcile.

## 10. Not done

**C5.** Sven has not walked invite → claim → receipt in a browser. Eight green pins are evidence the
code behaves; they are not evidence the capability exists. The reachable walk is: concierge panel →
issue an invitation *with* a reference → `/meals/join` → paste → claim → read the reference on the
receipt, then repeat with the reference left blank and read the membership id.
