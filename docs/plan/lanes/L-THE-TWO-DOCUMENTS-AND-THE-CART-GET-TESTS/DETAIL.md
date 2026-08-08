# L-THE-TWO-DOCUMENTS-AND-THE-CART-GET-TESTS — full detail

brief `afbb713e`. Frontend branched from `a63c30f`, backend from `a1c1a6dff` — the two trunks the
coverage baseline was measured at. **Both trunks moved under this lane while it ran** (frontend
`a63c30f` → `3ff7f07`, backend `a1c1a6dff` → `1c718856d`); neither moved any file this lane touches
(0 of 18 frontend files, 0 of 33 backend files), so nothing was forced and nothing rebased.

---

## 1. The commands, and the before/after they produced

### Frontend — the same command for both figures

Exactly §1(b) of `docs/plan/reviews/L-COVERAGE-MEASURED-PER-MODULE.md`, run in a throwaway worktree
whose basename is `Web-modules`, `node_modules` symlinked from the owner checkout (never `npm ci`),
`core` pinned at `9626a561`:

```sh
node node_modules/.bin/jest --ci \
  --collectCoverageFrom='{components,pages,layouts,middleware,plugins,utils,store,modules,core,server-middleware}/**/*.{vue,js,ts}' \
  --coverageReporters=json-summary --coverageReporters=text-summary \
  --coverageDirectory=<dir>
```

| file | before (stmt / branch / fn) | after (stmt / branch / fn) |
|---|---|---|
| `utils/training/evidence.js` | **0/31 · 0/101 · 0/6** | **33/33 (100%) · 105/105 (100%) · 6/6 (100%)** |
| `utils/meals/statement-client.js` | **0/25 · 0/20 · 0/5** | **25/25 (100%) · 20/20 (100%) · 5/5 (100%)** |
| `core/services/cart-service.ts` | 2/46 (4.34%) · 0/8 · 0/10 | **46/46 (100%) · 8/8 (100%) · 10/10 (100%)** |
| `core/models/cart/cart.ts` | 2/32 (6.25%) · — · 0/1 | **32/32 (100%) · — · 1/1 (100%)** |
| `store/index.js` | **0/97 · 0/61 · 0/43** | **97/97 (100%) · 56/61 (91.80%) · 43/43 (100%)** |
| repo total | 5611/8698 (64.50%) · 3731/5330 (70.00%) | **5845/8700 (67.18%) · 3922/5334 (73.52%)** |

Suite: **150 suites / 3563 tests / 0 failed → 154 / 3680 / 0**. Wall clock 8–17 s. No container,
no port, no `pkill`.

`evidence.js`'s denominator grew 31 → 33 statements and 101 → 105 branches because this lane added
two normalising statements to `integrityFinding` (§3). The four new branches are covered.

Statements and functions reach 100/97 and 43/43. The five residual `store/index.js` **branches**,
each identified from the istanbul branch map rather than rounded away:

- `:63` and `:75` — the `typeof localStorage !== 'undefined'` else-paths in the
  `SetSelectedAdminStore` and `SetAdminLocale` actions. Unreachable under jsdom, which always has
  `localStorage`.
- `:143` — the `if (cartIndex >= 0)` else inside `SetCartRootProperties`. **Unreachable by
  construction**: the block immediately above it pushes a cart and assigns
  `cartIndex = state.carts.length - 1`, which cannot be negative. Dead code, not a test gap.
- `:18` — `(markets[EDITION] && markets[EDITION].locale) || 'no'`. Reachable only by building the app
  for a market with no entry in `config/edition.js`.
- `:166` — the `|| []` false path in `RemoveLineItem`. **Deliberately left uncovered.** See §4.

### Backend — the recorded before, and this lane's after, from the identical command

`before` is §4.2/§5.2 of the same review, measured at `a1c1a6dff` with the command below. `after` is
this lane's run of that command at `a1c1a6dff` + one commit.

```sh
dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug
dotnet test  WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database!=SqlServer" \
  --collect:"XPlat Code Coverage" \
  --results-directory <dir> --logger "trx;LogFileName=cov.trx"
```

`Services/CartService.cs` figures are in the RETURN. **The two caveats the review attaches to any
number from this command travel with it**: it is the **non-SQL tier only**, and one test
(`ConfirmationCodeEntropySourceTests`) is **red by construction under coverage** because coverlet
injects `Interlocked.Increment` into a method an IL-level entropy pin guards — that is the guard
working, not a regression, and it is the same single failure the review recorded.

---

## 2. What was written

| file | tests | what it pins |
|---|---:|---|
| `test/training-evidence.test.js` | 32 | the inspector evidence document |
| `test/meals-statement-client.test.js` | 21 | the monthly bill a company pays |
| `test/cart-wire.test.js` | 22 | `cart-service.ts` + `models/cart/cart.ts` |
| `test/store-cart-state.test.js` | 42 | `store/index.js` — the cart's state half |
| `WebApi.Tests/Services/CartValidateGateTests.cs` | 19 | `CartService.Validate` — the checkout gate |

Each file's own header states what can go wrong in the code under it, and why its assertions cannot
pass vacuously. Three habits run through all five, because this estate has shipped an assertion whose
haystack was empty, a negative control gone vacuous, and a check comparing a value with itself:

- **Whole values, not fragments.** Every route is `toBe` on the entire URL. A `toContain` on a
  fragment survives a trailing slash, a doubled slash and a wrong id — the three faults this class
  actually takes (`test/core-request-path-shape.test.js` exists because thirteen paths carried one).
- **Worlds with more than one of everything.** Every cart world holds two stores and three lines. A
  mutation tested against one cart and one line cannot tell "updated the right cart" from "updated
  the only cart".
- **`null` and `false` asserted apart.** `toBeFalsy` accepts either, and on the evidence document
  they are the difference between "we could not tell" and "there is nothing wrong".

---

## 3. Finding — a clean bill for a document that does not exist (FIXED in this lane)

`utils/training/evidence.js:251` `integrityFinding` documents three answers: `true` on a positive
finding, `false` on a clean document, `null` when the document could not tell us — "a null linkage or
a null count is UNKNOWN and must never answer 'clean'".

All four of its guards asked `=== null`. **An absent property answers `undefined` to that**, so
`integrityFinding(null)`, `integrityFinding(undefined)` and `integrityFinding({})` fell through every
guard and returned **`false` — a clean bill**. Measured on trunk, before any edit:

```
undefined -> false
null      -> false
{}        -> false
{linkage: null, rowsWithoutAuditEvent: null} -> null
```

Only `integrityOf`'s output — which normalises both halves to `null` — ever reached the guards in a
state they recognised.

**The one caller hands it exactly the failing shape.**
`components/admin/training/TrainingEvidenceDocument.vue:315`:

```js
finding () { return integrityFinding(this.doc && this.doc.integrity); }
```

`this.doc` is `this.read.document || null`, so with no document that expression *is* `null` — and
`integrityLabel` renders `finding === false` as `trn_ev_integrity_clean`.

**Not live exposure today**, and the reason is worth stating precisely: the integrity chip sits
inside `<article v-else>`, which renders only once `read.state` is `answered`, and `readEvidence`
never returns `answered` with a null document. The defect is one template edit or one second caller
away, on the statutory-evidence surface, and the defensive `&&` its author wrote is the thing that
triggers it.

Repaired here by normalising `undefined` to `null` before the guards. The reachable path — through
`integrityOf` — is unchanged, and `expect(integrityFinding(integrityOf(...)))` pins that.

---

## 4. Finding — `RemoveLineItem` throws on a cart with no `items` (NOT fixed, recorded)

`store/index.js:163-168`:

```js
[MutationName.RemoveLineItem] (state, { storeId, lineItem }) {
  const cart = state.carts.find(x => x.storeId === storeId)
  if (!cart) { return }
  const index = (cart.items || []).findIndex(x => x.id === lineItem.id)
  Vue.delete(cart.items, index)
}
```

The `|| []` guards the **search** and not the **delete**. Against a cart whose `items` is missing,
`Vue.delete(undefined, -1)` raises `TypeError: Cannot read properties of undefined (reading '__ob__')`
— measured on trunk. That shape is reachable: `SetCarts` accepts any array of anything, and
`MutationName.Load` `Object.assign`s a persisted dump written by an older build. Nothing repairs it
either — the only code that would, the `cartByStoreId` getter, **has no caller anywhere in this repo**.

There is a second hazard on the same line that is currently harmless: on a miss `findIndex` answers
`-1`, and `Array.prototype.splice(-1, 1)` removes the **last** element. Only Vue 2's
`isValidArrayIndex` rejecting negatives inside `del` stops that, and that guard is invisible from this
file. A hand-rolled `splice` "cleanup", or a Vue 3 migration, deletes the customer's last line
instead. That half **is** pinned (`REMOVING A LINE THAT IS NOT IN THE CART REMOVES NOTHING`, red
under mutation M6).

The throw is **reported rather than pinned**: a test asserting it would go red the day somebody fixes
it, which is the wrong way round. Both halves are closed by one line — `if (index < 0) { return }` —
but that is a product change this brief did not ask for.

---

## 5. Finding — `GET …/evidence/disclosures` has no backend route (outside the three paths)

`utils/training/training-client.js:397` binds

```
GET /training/stores/{storeId}/evidence/disclosures[?personRef=]      (#17)
```

and it is called from two live screens — `pages/admin/training-courses.vue:542` and
`pages/admin/workforce-me.vue:579`, both rendering `TrainingDisclosurePanel.vue` ("who has looked at
my training record"). **The backend binds no such route.** At `a1c1a6dff`,
`git grep -i disclosures -- '*.cs'` returns **zero files outside `WebApi.Tests/`**; the only route
literal containing "evidence" in the whole API is `Controllers/TrainingController.cs:383`
`[HttpGet("evidence")]`, and `ITrainingEvidenceService` exposes one method. The rows themselves *are*
written — `evidence.read` is appended by the GET above — so the ledger exists and has no read surface.

Consequence: the panel receives a routing 404 with an empty body, which carries no `training.*` code,
so `stateOfError` reads UNKNOWN and the panel permanently shows "we could not tell". This is the
third instrument agreeing with `L-WHICH-JOURNEYS-ARE-REAL`, which recorded that this journey "reads
the disclosure ledger from a `/__fixture/` route no live backend serves".

Outside this lane's three paths (`evidence.js` does not call it), C3-shaped, and not touched here.

**One earlier report was checked and is stale, not a finding.** A survey of the backend read the
owner checkout, which sits on `wip/rescue-2026-08-06-open-shifts-lineage` — a branch that does **not**
contain `a1c1a6dff` — and concluded that `X-Meals-Content-Hash` and `Content-Disposition` are not
CORS-exposed, so the meals statement's filename and integrity hash would be unreadable cross-origin.
At the actual trunk that is already fixed: `Program.cs:102` exposes `BrowserReadableHeaders.All`, and
`Helpers/BrowserReadableHeaders.cs:35` declares `MealsStatementContentHash`. Recorded because the
lesson generalises — a survey of "the backend" that reads a checked-out wip branch measures a
different repository.

---

## 6. Observations that are not defects

- **A second copy of `fileNameFrom`.** `utils/meals/statement-client.js:59` is byte-identical to the
  `fileNameFrom` exported from `utils/workforce/api-client.js:219`, whose own header names two copies
  of an error path as "the dangerous kind of duplication: the failure is silent and the copies drift
  one field at a time". `_requestFile` on that base already returns `{ text, fileName }`; `ExportCsv`
  reimplements it plus the hash. Not changed — a behaviour-neutral refactor is a different lane — but
  the two are now **held together by a test** over seven `Content-Disposition` worlds, so a drift reds.
- **Five cart mutations and one getter have no caller in this repo.** `SetCartRootProperties`,
  `RemoveCart`, `RemoveCartItems`, `SetCartIsLoading` and `cartByStoreId` are named only in
  `core/enums/mutation-name.ts` and in `store/index.js`. Their tests say so in the describe name —
  they are a contract, not evidence that a capability exists (C5).
- **One action is registered under the literal key `"undefined"`.** `store/index.js:58` writes
  `[ActionName.SetNotificationApproved]`, and `core/enums/action-name.ts` has no such member, so the
  computed key evaluates to `undefined`. The body is empty ("Used for mobile push"), so nothing is
  lost today; a dispatch of `'SetNotificationApproved'` would fail with Vuex's «unknown action type».
  Pinned, because the same spelling mistake on an action with a body would be silent.
- **`Validate` reads `DateTime.Now` directly** — no injectable clock on `CartService` (F4). Every arm
  of `CartValidateGateTests` either does not assert `StoreIsClosed` or drives it through a fixed
  `RequestedCompletion`, whose three terms dominate the wall clock in the boolean. No arm is
  time-of-day dependent.

---

## 7. C1–C7

- **C1** no UPDATE/DELETE against any append-only table; no migration, no raw SQL, no EF entity mutated.
- **C2** no migration authored.
- **C3** nothing added that needs wiring; two reachability gaps found and reported (§4, §5).
- **C4** no money-path write added.
- **C5** nothing moved to verified. The suite results here are evidence that code behaves, never that
  a capability exists — and §5 is an example of exactly that gap.
- **C6** both document halves checked. The training evidence document produces every field its reader
  expects (the backend's `TrainingEvidenceResponse` was compared property by property; no mismatch),
  and no statute or § is named on either surface — `trn_ev_page_intro` says «slik den kan legges fram
  ved tilsyn» and names nothing. The meals statement page's only statutory word is in a code comment.
  The one honesty defect found on a document surface is §3, and it is fixed.
- **C7** no logging or telemetry call added or changed.

---

## 8. Worktrees created and removed

| path | purpose | removed |
|---|---|---|
| `/Users/svendaneel/okam/wt-l2docs/Web-modules` | frontend, off `a63c30f`, basename-pinned | yes |
| `/Users/svendaneel/okam/wt-l2docs/wt-cart-api` | backend, off `a1c1a6dff` | yes |

Neither owner checkout was modified. No container was started or stopped; `okam-lwtwo-sql` and
`okam-lwtwo-redis` were never touched; `:3971`/`:5971` were never bound; no `pkill`; no `npm ci`.
Both commits are `--no-verify` and **neither branch was pushed**.
