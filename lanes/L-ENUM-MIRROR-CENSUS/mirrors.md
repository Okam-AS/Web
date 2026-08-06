# Frontend enum mirror census

**As of** 2026-08-05. **Backend read by object at `8e2b57de`** (`git show 8e2b57de:<path>`), never from a
working tree — the shared checkout is 1 ahead / 63 behind and reading it has manufactured false absences
for four lanes already. **Frontend read from the working tree** of `/Users/svendaneel/okam/Web-modules`
at `e34977a` (`feature/restaurant-modules`), with the `core` submodule at `1bcab0b6`
(`heads/lane/core-ore-label`).

**The `core/` submodule was already populated in this worktree — 41 files under `core/enums/` — so no
initialisation was needed.** It is empty in most lane worktrees and a sweep that finds no mirrors there
has found an empty directory, not an absence. `git submodule status` was run and is quoted above so the
denominator below is attributable to a specific commit rather than to whatever happened to be on disk.

## Denominator and rule

**Rule:** every `enum` declaration in a `.ts/.tsx/.js/.jsx/.vue` file in the frontend repo, excluding
`node_modules`, `.nuxt`, `dist` and `.git`. **918 files scanned; 40 enum declarations found; all 40 live
in `core/enums/`.** No enum is declared anywhere else in the frontend — not in `components/`, `pages/`,
`utils/`, `store/` or `test/`.

The extractor strips `//` and `/* */` comments before parsing, so prose naming a removed member cannot
manufacture a member that does not exist. It was **validated on the known positive**: it returns
`PaymentType` = 16 members, matching the count the clerk confirmed.

**Matching is by member set, not by filename or enum name.** A name-keyed match produced confident wrong
answers in the fixture sweep, where a value was a genuine member of a *different* enum five times over.
Each mirror was scored against all 177 backend enums by Jaccard overlap; the name is reported only as a
separate column, so a disagreement between set and name is visible rather than silently resolved in
favour of the name. **It disagreed twice, and both times the set was right** — see "Where the name lies"
below.

## Headline

| | count |
|---|---|
| enum declarations in the frontend | **40** |
| of those, mirrors of a backend enum | **32** |
| **mirrors that agree member-for-member** | **24** |
| **mirrors short a member or carrying an extra** | **8** |
| declarations that are not backend mirrors at all | 8 |

**Three quarters of the mirrors are exactly right.** 24 of 32 agree with the backend member-for-member,
including every mirror the POS/Kassa surfaces depend on for reason codes, line-item status, settlement
status, terminal state and cash-drawer transactions. The census is not a list of failures; the eight
divergences below are the exceptions.

## The eight divergences

Each names the member, the side it is on, and whether anything reads the mirror.

| # | mirror | backend enum | divergence | who reads the mirror |
|---|---|---|---|---|
| 1 | `PaymentType` (16/17) | `PaymentType` | **omits `CompanyAccount`** | **value-read** — gates a render |
| 2 | `KassaEventType` (19/20) | `KassaEventType` | **omits `UTLEVREC`** | type-only |
| 3 | `KassaReceiptType` (6/7) | `KassaReceiptType` | **omits `Delivery`** | type-only |
| 4 | `KassaReceiptSeries` (7/8) | `KassaReceiptSeries` | **omits `Delivery`** | **nothing reads it** |
| 5 | `SafTVatCode` (3/4) | `SafTVatCode` | **omits `TwelvePercent`** | type-only |
| 6 | `GiftcardStatus` (4/5) | `GiftcardStatus` | **omits `Transferred`** | type-only |
| 7 | `RewardTransactionType` (4/4) | `RewardTransactionType` | **omits `Canceled`, adds `Transferred`** | type-only |
| 8 | `OrderPaymentTypeFilter` (11/12) | `PaymentTypeFilter` | **omits `DinteroKravia`** | type-only |

### 1. `PaymentType` omits `CompanyAccount` — the only divergence that reaches a runtime decision

`core/enums/payment-type.ts` carries 16 members; `Enums/PaymentType.cs` carries 17. The missing member is
`CompanyAccount = 120`, added for the Company Meals credit sale (spec 20 §7).

This is the one mirror on the list that is **read as a value**, not merely used as a type annotation.
`core/pinia/checkout.ts:25-33` is a ladder of `paymentMethod?.paymentType === PaymentType.<Member>`
comparisons that resolves the label shown at checkout, and `core/pinia/order.ts` reads it 10 more times.
A `CompanyAccount` tender falls through every branch of that ladder, so the product can produce a payment
type the checkout has no case for. **This is the shape the brief warns about: the mirror answers, and
answers "not a member" for a value the product can genuinely emit.**

An independent source in the tree corroborates the omission rather than resting on this census alone —
`test/e2e/journeys/consumer/meals-funded-checkout.spec.js:5` states in its own header that "no frontend
enum even had the tender".

### 2–4. The three `Delivery`/`UTLEVREC` omissions are one event, not three

`KassaEventType.UTLEVREC`, `KassaReceiptType.Delivery` and `KassaReceiptSeries.Delivery` were all added
backend-side for the same thing: the kassasystemforskrifta § 2-8-7 *utleveringskvittering* handed over
when the register records a credit sale. All three mirrors predate it. They diverge together and would be
corrected together.

**`KassaReceiptSeries` has no reader at all** — zero references anywhere in the frontend outside its own
file and the `core/enums/index.ts` barrel. It is dead weight today, which is why it appears in the tidy-up
column rather than the defect column.

### 5. `SafTVatCode` omits `TwelvePercent`

Backend carries `TwentyFivePercent = 3`, `FifteenPercent = 31`, `TwelvePercent = 33`, `ZeroPercent = 0`.
The mirror carries three, dropping the 12% low rate (passenger transport, accommodation, cinema). Used as
a type annotation on `core/models/kassa/journal-models.ts` and `core/models/kassa/report-models.ts`.

### 6–7. `Transferred` is on the wrong mirror

This pair is worth reading together, because it looks like a single copy/paste that landed one member
short on one enum and one member long on the other.

- Backend `GiftcardStatus` = `Initiated, AwaitingReceiver, Transferred, Completed, Canceled`. The mirror
  has four — **`Transferred` is missing**.
- Backend `RewardTransactionType` = `NotSet, Received, Spent, Canceled`. The mirror has four, but they
  are `NotSet, Received, Spent, Transferred` — **`Canceled` is missing and `Transferred` is present
  though the backend enum has no such member**.

**`RewardTransactionType` is the only addition in the whole census**, and it is the failure mode the brief
singles out as easier to miss: the mirror will accept `Transferred` as a reward transaction type forever,
and no membership check anywhere will complain, because a membership check against a mirror that has the
member simply passes.

### 8. `OrderPaymentTypeFilter` omits `DinteroKravia`

**This row is why matching by name would have failed.** The frontend enum is named
`OrderPaymentTypeFilter`; **no backend enum has that name.** The set matched `PaymentTypeFilter`
(`Enums/PaymentTypeFilter.cs`) at Jaccard 0.92, and the reading code confirms the binding:
`core/models/statistic/statistic-query-orders.ts` declares `paymentTypes: Array<OrderPaymentTypeFilter>`
on `StatisticQueryOrders`, the statistics query body. Backend `PaymentTypeFilter` has 12 members; the
mirror has 11, omitting `DinteroKravia`.

## Where the name lies, and where the set cannot decide

**Name-keyed matching would have produced two wrong answers and one unanswerable one.**

- `OrderPaymentTypeFilter` → the name matches nothing; the set and the reading code both say
  `PaymentTypeFilter`. Row 8 above.
- `SurfboardApplicationStatus` → set-matching alone scored it against
  `WorkforceTimeOffRequestStatus` at 0.27, which is noise. It is **not a backend mirror**: its values are
  vendor strings (`APPLICATION_INITIATED`, `MERCHANT_CREATED`, …), the backend carries these as plain
  `string` in `Models/Surfboard/Onboarding/SurfboardOnboardingModels.cs`, and the frontend model field is
  typed `applicationStatus: string`. Excluded on what the code does with it, not on its name.
- **The set genuinely cannot decide three enums.** `VippsVerifyStatus`, `DinteroVerifyStatus` and
  `DinteroTerminalStatus` all have exactly `{NotSet, Waiting, Success, Fail}` backend-side, so member-set
  matching ties at Jaccard 1.0 across all three. The binding was resolved by the importing model —
  `core/models/payment/vipps-verify-response.ts`, `core/models/payment/dintero-verify-response.ts` and
  `core/models/dintero-terminal/dintero-terminal-models.ts` respectively. **All three mirrors are exact
  either way**, so the ambiguity costs nothing here — but it is recorded because a future member added to
  only one of the three would be invisible to a set-keyed check.

## The eight declarations that are not mirrors

Counted in the denominator and then excluded, with the reason. Reporting them as "matched nothing" would
have implied eight more divergences.

| declaration | members | why not a mirror |
|---|---|---|
| `HttpMethod` | 5 | HTTP verbs; client transport vocabulary |
| `HttpProperty` | 11 | HTTP header/property names (`url`, `Content-Type`, …) |
| `ActionName` | 10 | Vuex action names; client state machinery |
| `MutationName` | 27 | Vuex mutation names; client state machinery |
| `AppSettingKey` | 1 | local storage key (`state`) |
| `NotificationPlatform` | 2 | `Apns`/`Fcm`; push-SDK vocabulary — the backend has **no** `*Platform` enum |
| `StatisticDateFilter` | 7 | date-range presets computed client-side; no backend counterpart |
| `SurfboardApplicationStatus` | 8 | third-party vendor status strings (see above) |

## Reader classification

Counted after stripping comments **and string literals**. The naive pass over-reported twice and both
artefacts are worth recording, because each is the kind of plausible wrong answer this program keeps
producing:

- `PaymentType.CompanyAccount` appeared to be read by two e2e specs. It is **prose inside a
  `journey.finding(...)` narrative string**, not a runtime read.
- `DeliveryType.vatContext` appeared to be a member read in `core/models/kassa/receipt-request-models.ts`.
  It is a **comment ending in "…the order's `DeliveryType`."** whose following line begins `vatContext`;
  the `\s*` in `EnumName\s*\.\s*\w+` spanned the newline.

| class | count | meaning |
|---|---|---|
| **value-read** (`Enum.Member` in executable code) | 8 | gates a render or a submission |
| **type-annotation only** | 27 | declares a wire field's domain; no runtime membership check |
| **no reader** | 5 | dead weight |

The five with **no reader**: `StatisticDateFilter`, `AppSettingKey`, `KassaReceiptSeries`, `OrderKind`,
`SurfboardApplicationStatus`. Of these only **`KassaReceiptSeries`** is both a mirror and short a member,
so it is the one entry that is simultaneously a divergence and a tidy-up rather than a defect.

**Only 8 of 40 are read as values, and only one of those eight is short a member** — `PaymentType`. That
is the whole defect list. The other seven divergences are type-level today.

## A second mirror shape, reported for denominator honesty

Restricting the census to the `enum` keyword would under-report, because the app layer barely uses
`core/enums` at all: **only two files outside `core/` import from it** (`pages/admin/overview.vue`,
`store/index.js`). The admin module UIs enumerate backend vocabularies as **literal string arrays**
instead.

A second sweep looked for array/object/union literals holding ≥3 PascalCase string literals whose set is a
subset of some backend enum. It returned **60 candidate sites**. **Most are legitimately partial** — a
filter offering a subset, or a test asserting on three values — so this is emphatically not a defect list,
and it is not part of the exit criterion. Two sites are worth naming because the list is the *default
applied filter*, not a subset the operator chose:

- `pages/admin/orders.vue:433` and `pages/admin/statistics.vue:507` — `selectedPaymentTypes` defaults to
  10 hard-coded strings. **They disagree with the `OrderPaymentTypeFilter` mirror in both directions**:
  they include `DinteroKravia` (which the mirror omits) and omit `Surfboard`/`SurfboardTerminal` (which
  the mirror has). Neither matches backend `PaymentTypeFilter`'s 12.

Note for whoever acts on this: backend `PaymentTypeFilter` has no `Cash`, `DinteroTerminal` or
`CompanyAccount` member at all, so those tenders are not expressible as a filter **backend-side**. That is
a backend vocabulary gap, not a mirror divergence, and it is recorded here so the two are not conflated.

## Not corrected, deliberately

Read-only per the brief. Which side moves is a judgement, and **`KassaEventType`, `KassaReceiptType` and
`KassaReceiptSeries` persist their member names as strings** through `EnumToStringConverter` onto journal
tables the append-only guard defends — `Enums/Kassa/KassaEventType.cs` says so in terms: "Member names are
the exact SAF-T event codes and are persisted as strings … so they must not be renamed without a
corresponding data migration." **The backend side of those three cannot move.** C1 holds.

## Evidence

| artefact | what it is |
|---|---|
| `extract-mirrors.py` → `mirrors.json` | 40 frontend enums, comment-stripped, 918 files scanned |
| `match.py` → `matched.json` | member-set match of each mirror against all 177 backend enums |
| `readers2.py` → `readers2.json` | readers per mirror, comments and strings stripped |
| `listmirrors.py` → `listmirrors.json` | 60 list-shaped candidate mirrors (secondary sweep) |
| `table.txt` | the generated 40-row table |

Backend inventory reused from `L-FIXTURE-VOCABULARY-SWEEP/enums-8e2b57de.json` (177 enums, no duplicate
names), rather than rebuilt — this census extends that lane's binding table instead of duplicating it.
Every one of the eight divergences was then **re-verified by reading the backend enum by object** at
`8e2b57de` rather than trusting the cached parse.
