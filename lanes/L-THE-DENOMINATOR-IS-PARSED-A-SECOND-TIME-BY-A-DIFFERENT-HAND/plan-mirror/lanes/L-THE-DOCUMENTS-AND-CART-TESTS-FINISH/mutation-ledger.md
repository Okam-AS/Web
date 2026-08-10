# L-THE-DOCUMENTS-AND-CART-TESTS-FINISH — mutation ledger

Every row below was **applied to the working tree, measured, and restored**. No row is a prediction.
The harnesses are `mutate.sh` / `mutate-be.sh` in this lane's scratchpad; each one refuses to run
unless its anchor string matches exactly once, and restores the file whether the run passes or fails.

Backend runs are always a **full `dotnet test`**, never `--no-build`, and restores rewrite the file
so its mtime moves — the repo's own `CLAUDE.md` records that a timestamp-preserving restore makes
MSBuild hand back the *previous* assembly and silently defeats exactly this procedure.

## Inherited state

| repo | commit | what it carried | state on arrival |
|---|---|---|---|
| frontend `Web-modules` | `4541e98` | 4 suites / 117 tests + one `evidence.js` repair | green |
| backend `OkamAPI-modules` | `6859bdaa6` | `CartValidateGateTests.cs`, 19 tests | green |

The brief expected the backend half to be the missing one ("now the backend cart test"). It was not
missing — it was written, complete and passing. Nothing was discarded; all five files were kept.

## Frontend mutations

| # | file | mutation | result |
|---|---|---|---|
| M1 | `utils/training/evidence.js` | completion stamp reads `completedAtStoreLocal` instead of the UTC twin | **1 failed** / 31 passed |
| M2 | `utils/training/evidence.js` | `integrityFinding` answers `false` — a clean bill — for an absent document | **3 failed** / 29 passed |
| M3 | `utils/meals/statement-client.js` | export path grows a trailing slash before the query | **2 failed** / 19 passed |
| M4 | `utils/meals/statement-client.js` | content hash re-derived locally instead of read off the server header | **3 failed** / 18 passed |
| M5 | `utils/meals/statement-client.js` | plain `filename=` beats the RFC 5987 extended form | **3 failed** / 18 passed |
| M6 | `core/services/cart-service.ts` | `Validate` sent as a POST — a read on the verb that creates | **1 failed** / 21 passed |
| M7 | `core/services/cart-service.ts` | a failed checkout resolves instead of throwing | **2 failed** / 20 passed |
| M8 | `core/models/cart/cart.ts` | `ignoreLegecyIsWaiterOrderBool` defaults to `false` — the money switch flips | **3 failed** / 19 passed |
| M9 | `store/index.js` | `SetLineItem` degrades from an upsert to an append — the double charge | **1 failed** / 41 passed |
| M10 | `store/index.js` | `Vue.delete` replaced by a raw `splice(index, 1)`, so `-1` takes the last line | **1 failed** / 41 passed |
| M11 | `store/index.js` | `parseInt(x, 10)` loses its radix | **DID NOT RED — see below** |
| M11b | `store/index.js` | the persisted value is kept as the string `localStorage` returned | **1 failed** / 41 passed |
| M12 | `store/index.js` | `SetCarts` accepts a non-array and blanks the basket | **1 failed** / 41 passed |
| M13 | `utils/workforce/api-client.js` (**shared**) | the RFC 5987 branch of the shared `fileNameFrom` is broken | **2 failed** / 19 passed |

M13 is the proof that the de-duplication landed: before it, `statement-client.js` had its own private
copy, so breaking the shared parser could not have reddened the meals suite at all.

## Backend mutations — `Services/CartService.cs`, `Validate(userId, cart, capturableAmount)`

| # | mutation | result |
|---|---|---|
| MB1 | the minimum-order floor reads `FinalAmount`, so a delivery fee carries a small basket over it | **1 failed** / 18 passed |
| MB2 | the capture-amount guard removed — a provider may capture more than the cart holds | **1 failed** / 18 passed |
| MB3 | a giftcard that only part-settles the bill is admitted | **1 failed** / 18 passed |
| MB4 | an unapproved venue is blocked from `PayInStore` too — cash over the counter refused | **1 failed** / 18 passed |
| MB5 | the twenty-minute buffer after opening shrinks to five | **1 failed** / 18 passed |
| MB6 | the `isUserBlocked` term is dropped from `response.StoreIsClosed` | **1 failed** / 18 passed |

MB6 only became a meaningful mutation after the repair described below; against the inherited file it
would have reddened too, but only by luck of `BlockedUsers.Ids` being non-empty on the day.

## Three defects found in the inherited tests, and what was done

### 1. An arm that claimed a guarantee it does not measure — `store/index.js` Load

The arm was titled *"the selected admin store is parsed BASE TEN — a leading zero is not an octal"*.
ES5 removed octal from radix-less `parseInt`, so `parseInt('08')` has answered `8` for the whole life
of this build. **M11 dropped the radix and the suite stayed green.** The `, 10` is defensive only.

Repaired to pin what it does measure — that the value comes back a *number*, not the string
`localStorage.getItem` always returns, which matters because `selectedAdminStore` is compared against
a numeric `store.id` across the admin surface and `'42' === 42` is false. M11b confirms it now reds.

### 2. A negative control that could go vacuous in silence — `CartValidateGateTests`

`A_blocked_customer_is_refused_whatever_else_is_in_order` borrowed an id from `BlockedUsers.Ids`, a
hardcoded static with no injection seam, and then wrapped its only assertion in `if (id != null)`.
That guard is false exactly when the list is empty — so the day anybody unblocks the one entry, the
whole negative control would disappear **without the suite going red**. The list is now asserted
non-empty first and the refusal driven unconditionally.

### 3. A duplicated header parser — `statement-client.js`

The file declared a private `fileNameFrom` character-identical to the one `api-client.js` already
exports and already uses in `_requestFile`. The inherited test held the two copies together by
comparing their outputs; that arm was correct *while there were two copies*, but the right fix is to
delete the copy, not to detect its drift. After the deletion that comparison would have been the
shared parser checked against itself — the vacuous shape this estate has shipped before — so it was
replaced by a stub-based arm that pins that `ExportCsv` routes through the export.

## Coverage, measured with the command in `L-COVERAGE-MEASURED-PER-MODULE.md`

The five named files, all at or near zero on trunk `a63c30f`:

| file | before | after (statements / branches) |
|---|---|---|
| `utils/training/evidence.js` | 0, 101 uncovered branches, loaded by no test | 100 / 100 |
| `utils/meals/statement-client.js` | 0 | 100 / 100 |
| `core/services/cart-service.ts` | 4.3 | 100 / 100 |
| `core/models/cart/cart.ts` | 6.3 | 100 / 100 |
| `store/index.js` | 0, imported by no test | 100 / 91.8 |

`store/index.js` is deliberately not at 100 on branches. `RemoveLineItem` writes
`(cart.items || []).findIndex(...)` and then `Vue.delete(cart.items, index)` — the `|| []` guards the
*search* and not the *delete*, so against a cart whose `items` is missing the second line throws.
That is a defect rather than a contract, so the inherited file reports it instead of pinning it: a
test asserting the throw would go red the day somebody fixes it. That judgement was reviewed and kept.

## C6 — can each document actually be produced?

### The meals statement (the monthly bill): **clean**

No statute, forskrift or `§` is printed anywhere on `pages/admin/meals-statements.vue` or in any
`mlst_*` key across `no.ts` / `en.ts` / `de.ts`. All three read routes exist and are reachable —
`Controllers/Meals/MealsStatementController.cs:93` (list), `:108` (get), `:123` (export). The CSV is
genuinely deterministic: a twelve-line `#` preamble at `Services/Meals/MealsStatementExportService.cs:70-81`,
and `CompareLines` sorting on `OrderOccurredAtUtc` then `AllocationId` applied on **both** the build
path and the read path (`MealsStatementService.cs:493` and `:712`), so the export is stable even for
rows loaded back from SQL with no `ORDER BY`. `X-Meals-Content-Hash` and `Content-Disposition` are
both stamped and both CORS-exposed (`Helpers/BrowserReadableHeaders.cs:29,35,38` → `Program.cs:102`).

### The training evidence document: **no statute named, but nothing can be handed over**

C6's letter is **not** violated, and deliberately so: `translations/no.ts:4744-4748` records that the
word *internkontroll* is banned from every user surface until TR8/TR-B6 ships (OD-6), because HACCP
hazard analysis, traceability and allergen information are not in the domain model and the
skjenkebevilling's internkontroll is a different regime entirely. The nav label is `Dokumentasjon`.
A grep for `§|forskrift|bokf|kassasystem|Mattilsynet|Arbeidstilsynet|personalliste|HACCP` across every
`trn_*` key in all three locales returns zero hits.

**But the document cannot leave the browser.** `trn_ev_page_intro` (`no.ts:4950`) promises one
person's training record *"slik den kan legges fram ved tilsyn"* — in the form it can be produced for
an inspection — and the source escalates that repeatedly (`utils/training/evidence.js:5-6`, `:203-205`
"a document that then leaves the building"). There is **no export of any kind**: no PDF, no CSV, no
Blob, no `download` attribute, and not even a `@media print` block — which the personalliste, a
genuinely statutory surface, does have at `pages/admin/workforce-personnel-list.vue:270-276`. The
backend serves exactly one evidence action, `Controllers/TrainingController.cs:383`, returning JSON.

A manager asked for this record on the day can show an inspector a browser tab and nothing else. Per
the brief, **this finding is reported rather than built** — closing it needs a renderer, a route and a
control, which is a C3-shaped change and not this lane's.

## Runs

- frontend full tier, post-rebase onto trunk `780d405`: **157 suites / 3711 tests / 0 failed**
- backend `CartValidateGateTests`: **19 / 19**, non-SQL tier, SQLite in memory, no container
