# Enum mirror census — every frontend mirror against its backend enum, member by member

Lane `L-MIRROR-HOLDS-ONLY-REAL-MEMBERS` · brief `38f74149` · class `analysis` (nothing changed; no fix, no
suite, no container).

---

## 0. Refs — all read by object with `git show` / `git grep <ref>`, never a working tree

| Side | Repo | Ref named | SHA | Denominator |
|---|---|---|---|---|
| Backend | `/Users/svendaneel/okam/OkamAPI-modules` | `feature/restaurant-modules` (integration tip) | **`8e2b57de`** | 2,723 `.cs` files → **177 enum declarations**, 177 distinct names |
| Frontend shared | `/Users/svendaneel/okam/Web-modules/core` (submodule) | pin | **`1bcab0b6`** | 253 `.ts` files → **40 enum declarations** (all in `enums/`) + **4 union-type mirrors** |
| Frontend app | `/Users/svendaneel/okam/Web-modules` | `feature/restaurant-modules` (FE integration tip) | **`e34977ac`** | 573 `.ts/.js/.vue` files → **0** own enum declarations; 42 switch ladders, 50 object maps |
| Frontend app (cross-check) | same | `candidate/fe-compose-2026-08-05` | **`9f7d8dfc`** | same sweep re-run; extras set identical |

**The backend checkout sits on `lane/meals-grace-pins` (`34c6c103`) and was not read.** Everything backend
below is `git show 8e2b57de:<path>` or `git grep <pattern> 8e2b57de`.

The `core` pin is **the same object `1bcab0b6` at all three frontend refs** — FE integration tip `e34977ac`,
working HEAD `8ac6f636`, and candidate `9f7d8dfc` (`git ls-tree <ref> core` on each). So no core ambiguity
exists and no census answer depends on which frontend ref is chosen. The Web-modules working tree is dirty
(≈40 modified files); none of it was read.

### Instrument notes (both traps in the brief were hit, and caught)

- `git grep -E "enum +OrderStatus\b"` matched **nothing** — POSIX ERE has no `\b`. Re-run with `-P` and a
  `\K` lookbehind it returns 201 names, of which 24 are ordinary English words following the word "enum"
  **in a comment** ("the enum value…", "the enum has…"). Comment-stripped extraction gives 177, and
  `201 − 24 = 177` is the cross-check that the extractor missed nothing.
- Set-matching a ladder to its enum picks the wrong parent. `paymentTypeLabel` scored higher against
  `PaymentTypeFilter` (j=0.83) than against `PaymentType` (j=0.59), so the automatic answer was wrong;
  reading the call sites (`paymentTypeLabel(order.paymentType)`, six of them) settles it as `PaymentType`.
  Every ladder row below was re-read at its call site for this reason.
- Extractor validated on the known positive before use: `PaymentType` = 16 frontend / 17 backend members,
  short exactly `CompanyAccount`, matching the recorded fact.

---

## 1. The two directions, kept apart

| | Definition | Count found | Symptom |
|---|---|---|---|
| **SHORT** | backend has a member the frontend lacks | **8** enum-level + **1** union-level + **5** ladder-level that survive site reading (of 17 screened — see §3.2) | renders the `default:` string — `Ukjent` / `Ikke satt` — for something real. Already the recorded direction. |
| **EXTRA** | frontend has a member the backend cannot send | **2**, total, in the whole frontend | renders nothing, because nothing ever selects it. Invisible to every test, review and walk. |

They are listed in separate sections and are never summed.

---

## 2. EXTRAS — the frontend holding members the backend cannot send

There are **exactly two** across all four mirror shapes (core enums, core union types, switch ladders,
object maps), at both the FE integration tip and the candidate.

### E1 · `'GroupedHomeDelivery'` — `plugins/global-mixin.js:101` (case at ladder head `:98`)

```js
deliveryTypeLabel (deliveryTypeEnum) {
  switch (deliveryTypeEnum) {
  ...
  case 'GroupedHomeDelivery': return 'Hjemlevering'
```

**Can anything produce it? No. Nothing anywhere can.**

- `git grep GroupedHomeDelivery 8e2b57de -- .` over the whole backend → **0 hits**. Not an enum member, not
  a string, not a fixture, not a migration.
- `git grep GroupedHomeDelivery 1bcab0b6 -- .` over all of `core` → **0 hits**.
- `git grep GroupedHomeDelivery <ref> -- .` over all of Web-modules at `e34977ac` **and** `9f7d8dfc` → the
  **one** hit above, and nothing else. No assignment, no fixture, no test.
- **Provenance, from history rather than supposition:** it *was* a real backend member.
  `git log -S GroupedHomeDelivery --all` in OkamAPI names four commits; reading them,
  `2c816730` (2021-05-05, "DeliveryType") **added** `GroupedHomeDelivery = 300` to `Enums/DeliveryType.cs`,
  and `fc12eb8f` (2024-08-17, "More DineHome integration stuff") **deleted** it. The frontend case survived
  the deletion by ~11 months of backend time. It is not a typo or an anticipated feature — it is an orphan.
- **The one residual channel, and what I could and could not determine:** a legacy row could still hold the
  integer `300` in `Orders.DeliveryType` / `Carts.DeliveryType`. The API serialises enums with **Newtonsoft's
  `StringEnumConverter`** (`Helpers/ServiceCollectionExtensions.cs:170`), which writes a *name* only for a
  defined value; `300` is no longer defined, so the wire carries the numeric form, which falls to the
  ladder's `default: 'Ikke satt'`. **I did not execute the serializer to confirm this**, and I ran no SQL, so
  I cannot state whether any such row exists. What is certain without either: no code path in either repo at
  the named refs emits the *string* `GroupedHomeDelivery`, and that string is the only thing this case can
  match.

**Verdict: dead code wearing a domain name.** Not deleted — removing it is a change with a blast radius and
is not this lane's. Note the same ladder is *also* short `NotSet` (§3.2), which is harmless only by accident:
the `default:` happens to be `'Ikke satt'`.

No test names `deliveryTypeLabel` anywhere in the tree (`git grep -l deliveryTypeLabel 9f7d8dfc` returns nine
files, all of them components or the mixin itself, none under `test/`). This is the brief's claim confirmed
by measurement: an extra survives every test because nothing ever selects it.

### E2 · `RewardTransactionType.Transferred` — `core/enums/reward-transaction-type.ts:5`

| core `RewardTransactionType` | backend `Enums/RewardTransactionType.cs` |
|---|---|
| `NotSet` | `NotSet = 0` |
| `Received` | `Received = 10` |
| `Spent` | `Spent = 20` |
| **`Transferred`** ← extra | — |
| — | **`Canceled = 40`** ← short |

**Can anything produce it? No.**

- Backend at `8e2b57de` has no `Transferred` in this enum. `git log -S Transferred -- Enums/RewardTransactionType.cs`
  names two commits (`63e4397b`, `f3978087`, both "WIP … Reward"); the member is absent at the tip, so unlike
  E1 there is no clean "added then removed" story — it never reached the shipped backend enum.
- In `core`, the only occurrences of the *name* are the declaration and the `enums/index.ts` re-export. The
  sole consumer is the **type annotation** `rewardTransaction.rewardTransactionType: RewardTransactionType`
  (`models/reward/reward-transaction.ts:8`) — a type-level use that never selects a member.
- In Web-modules, `RewardTransactionType` appears in **0 files** at `e34977ac`. Nothing reads it, nothing
  compares against it, nothing sets it locally.
- The neighbouring name `Transferred` **does** exist on the backend, twice — `GiftcardStatus.Transferred = 50`
  and `GiftcardTransactionType.Transferred = 5`, both genuinely produced by `Services/GiftcardService.cs`.
  That is the likeliest origin of the copy, and it is why the member reads as plausible.

**Verdict: dead.** Simultaneously the same mirror is **short `Canceled`** — so a cancelled reward transaction
is the case the frontend cannot name, while the case it can name cannot occur. Not deleted.

### The legitimate case, checked and found empty

The brief's discriminator — *a member the client sets locally is legitimate* — was applied to both extras and
neither qualifies: neither is assigned anywhere in `core` or Web-modules, in source, fixture or test. **No
frontend mirror in this estate carries a legitimate client-only extra member.** Client-only *vocabularies*
exist (§4) but they are whole enums with no backend counterpart, not extra members inside a mirror.

---

## 3. SHORTS — recorded separately, not merged, not re-litigated

### 3.1 Enum-level (core `enums/*.ts` vs backend), 8 of 32 mirrors

| core enum | backend enum | match | members FE/BE | short |
|---|---|---|---|---|
| `GiftcardStatus` | `GiftcardStatus` | name | 4/5 | `Transferred` |
| `KassaEventType` | `KassaEventType` | name | 19/20 | `UTLEVREC` |
| `KassaReceiptSeries` | `KassaReceiptSeries` | name | 7/8 | `Delivery` |
| `KassaReceiptType` | `KassaReceiptType` | name | 6/7 | `Delivery` |
| `OrderPaymentTypeFilter` | `PaymentTypeFilter` | set/overlap 0.92 (names differ) | 11/12 | `DinteroKravia` |
| `PaymentType` | `PaymentType` | name | 16/17 | `CompanyAccount` — recorded, own open decision |
| `RewardTransactionType` | `RewardTransactionType` | name | 4/4 | `Canceled` (see E2) |
| `SafTVatCode` | `SafTVatCode` | name | 3/4 | `TwelvePercent` |

The other **24 of 32** mirrors are member-for-member exact. This reproduces the earlier
`L-ENUM-MIRROR-CENSUS` result independently, from a fresh extraction at the same two refs.

### 3.2 Ladder/map-level (Web-modules string mirrors vs backend)

**The automatic screen returned 17 short rows and I read every one at its call site. Five were artefacts of
set-matching and are struck below, and six more are deliberate.** That failure rate is worth stating plainly,
because the same screen returned **one** extra and it survived the same site reading — the extra direction is
the reliable half of this instrument, the short direction is not, and the shorts belong to the lane that owns
them in any case.

Real, and load-bearing — the five label ladders in `plugins/global-mixin.js`, all of which return a Norwegian
sentence to a screen:

| backend enum | site | short | what renders |
|---|---|---|---|
| `PaymentType` | `:83` `paymentTypeLabel` | `NotSet`, **`Cash`**, `DinteroTerminal`, `Surfboard`, `SurfboardVipps`, `SurfboardTerminal`, `CompanyAccount` | `'Ukjent'` |
| `OrderStatus` | `:135` `orderStatusLabel` | `OpenCheck` | `'Ikke satt'` |
| `WoltStatus` | `:120` `woltDeliveryStatusLabel` | `DropoffEtaUpdated`,`HandshakeDelivery`,`LocationUpdated`,`NotSet`,`PickupEtaUpdated` | `'Venter på sjåfør'` |
| `DineHomeStatus` | `:110` `dineHomeDeliveryStatusLabel` | `NotSet` | `'Venter aksept fra sjåfør'` |
| `DeliveryType` | `:98` `deliveryTypeLabel` | `NotSet` | `'Ikke satt'` — correct **by accident**; the fallback happens to be the right label |

`PaymentType`/**`Cash`** is the one that reads as a real defect rather than an accepted gap: a POS that takes
cash prints `Ukjent` for a cash sale. Recorded here, owned elsewhere.

Deliberate, verified at the site — CSS-class and count pickers with a sound fallback, partial by design:

- `components/organisms/OrderModal.vue:285` and `pages/admin/orders.vue:845`, both `getStatusClass`, both
  falling to `status-default`. `OpenCheck` gets the default class; nothing says `Ukjent`.
- `pages/admin/statistics.vue:795 / :822 / :858 / :885` — `getDeliveryTypeCount`, four lookups over the four
  delivery types the stats payload carries, `0` fallback.
- `components/molecules/OrderCard.vue:303` — same shape as the mixin's DineHome ladder.
- `utils/workforce-me/memberships.js:15` `CAPABILITY_BITS` — a **correct** mirror of the bit values in
  `Enums/Workforce/WorkforceCapability.cs` (the comment names that file); the zero sentinel `None` is
  excluded because a bitmask has no bit for it.

~~Struck — set-matching picked the wrong parent enum or the wrong object:~~

- ~~`EventsDepositStatus` / `utils/events/guest.js:134` / `Pending`,`Requested`~~ — the switch has no
  `default:`, but `depositStance` handles both **after** the switch (`view.status === 'Requested' ||
  view.status === 'Pending' ? DEPOSIT_NO_AFFORDANCE : DEPOSIT_UNKNOWN`). Complete, with a fallback.
- ~~`EventsProposalVersionStatus` / `utils/events/guest.js:94` / `Draft`~~ — `proposalStance` gates on
  `isActionable` first and ends at `STANCE_UNKNOWN`; a `Draft` version is never shown to a guest.
- ~~`MealsInvitationState` / `MealsPeoplePanel.vue:373`~~ — that ladder is `roleLabel`, a
  **`MealsCompanyRole`** ladder (`CompanyAdmin`/`Employee`, 2/2 exact) with a documented verbatim
  passthrough. Wrong parent.
- ~~`MealsInvitationState` / `utils/meals/refusal-copy.js:215`~~ — `CLAIM_CODE_REFUSALS`, keyed on `meals.*`
  error codes, not on an enum at all.
- ~~`WorkforceCapability` / `memberships.js:15` / `None`~~ — see above, deliberate.

### 3.3 Union-type level (core `models/tripletex/tripletex-admin-models.ts`), 1 of 4

| core union | backend enum | FE/BE | short |
|---|---|---|---|
| `TripletexTokenType` | `TripletexTokenType` | 2/2 | — |
| `TripletexVoucherKind` | `TripletexVoucherKind` | 3/3 | — |
| `TripletexVoucherStatus` | `TripletexVoucherStatus` | 4/5 | **`Pending`** |
| `AccountingExportTarget` | `AccountingExportTarget` | 2/2 | — |

Extras: none.

---

## 4. The 8 core enums that are not backend mirrors, and why each is not one

The matcher returned "no backend enum" for eight of the forty. Naively every member of these is an "extra";
none of them is, and the reason differs by row. Each was re-read rather than inferred.

| core enum | classification | evidence |
|---|---|---|
| `ActionName` (10), `MutationName` (27) | client-only — Vuex action/mutation names | values are camelCase dispatch strings, never on the wire |
| `AppSettingKey` (1) | client-only | single member `State = 'state'`, a `localStorage` key |
| `HttpMethod` (5), `HttpProperty` (11) | client-only — HTTP plumbing | values are `GET`/`Content-Type`/… |
| `NotificationPlatform` (2) | **mirror of a third-party enum, and correct** | the backend's own `NotificationPlatform` is `Microsoft.Azure.NotificationHubs`', not declared in the repo — which is why a repo-only sweep finds no declaration. `Services/NotificationService.cs:57-58` **rejects** anything but `Apns`/`Fcm`, so the frontend's two members are exactly the accepted set. Not short, not extra. |
| `SurfboardApplicationStatus` (8) | **mirror of a vendor contract, and correct** | member *values* are vendor strings (`APPLICATION_INITIATED`…), so a name-set match against okam enums cannot succeed. The backend passes them through as `string` (`Services/Surfboard/SurfboardOnboardingService.cs:136`) and `Models/Surfboard/Onboarding/SurfboardOnboardingModels.cs:166-168` documents exactly these eight. 8/8. |
| `StatisticDateFilter` (7) | client-only, and **entirely unread** | no backend counterpart (`git grep -E "LastSevenDays\|ThisMonth\|StatisticDateFilter" 8e2b57de` → 0 hits) and **no reader** in `core` beyond the `index.ts` re-export, nor in Web-modules at `e34977ac` (0 files). Dead, but dead as a whole enum — not an extra inside a mirror. |

---

## 5. Value-shape divergence — a third class, listed apart so it is not mistaken for either

`core/enums/offer-proposal-status.ts` numbers its members `Created = 0 … Cancelled = 6`, matching the
backend's implicit ordering. But the wire is **strings** (`StringEnumConverter`), and the one frontend site
that consumes this enum — `pages/admin/offers.vue:775/796` — switches on the **names**, correctly and 7/7.
So the core enum's numeric values match nothing that travels. Neither short nor extra; recorded because a
future reader comparing member *values* rather than *names* would otherwise re-derive it as a defect.

`SurfboardApplicationStatus` and `HttpProperty`/`AppSettingKey`/`MutationName` also carry values that differ
from their member names — by design in every case (§4).

---

## 6. What contradicts the brief

The brief's two seed examples: one is confirmed, one is refuted.

1. **Confirmed.** "`GroupedHomeDelivery` is a member of no enum anywhere" — true at both refs, and it is the
   only extra of its kind in the whole frontend (§E1).

2. **Refuted.** "`core` declares `OrderStatus.OpenCheck` where the backend does not" — **the backend declares
   it.** `git show 8e2b57de:Enums/OrderStatus.cs` contains, with two lines of comment above it:

   ```csharp
   // POS pre-sale working state: an open check/tab on a table before it is settled.
   // Set only by the POS flow; excluded from active online-order queries and statistics.
   OpenCheck = 10,
   ```

   `git grep -E "enum +OrderStatus" 8e2b57de` matches `Enums/OrderStatus.cs` and `Enums/OrderStatusFilter.cs`
   only, so there is exactly one declaration and no shadow. Backend `OrderStatus` has **9** members, not the
   8 the brief states; core `enums/order-status.ts` has the same 9; the mirror is **exact**.

   The real shape underneath the claim is a **short in the opposite place**: it is the *label ladders* —
   `plugins/global-mixin.js:135` and `pages/admin/orders.vue:845`, both 8 cases — that lack `OpenCheck`, so
   an open check renders `'Ikke satt'`. The brief's own known-context sentence describes those ladders
   ("`DeliveryType` has 7 … `OrderStatus` has 8 … fully mapped in the frontend label switches") but attributes
   their case counts to the backend enums, and "fully mapped" is false in both: the delivery ladder's 7 cases
   are not the backend's 7 (it carries `GroupedHomeDelivery` and lacks `NotSet`), and the order ladder's 8
   are the backend's 9 minus `OpenCheck`.

The exit criterion is unaffected — it asks for the census, and the census is what refutes the claim.

---

## 7. Ledger

- Frontend mirrors compared member by member: **40** core enums + **4** core union types + **34** ladders +
  **50** object maps.
- Backend enums read by object at `8e2b57de`: **177**. 32 have a `core` enum mirror; **145 have none** — most
  are surfaced only through a ladder or map, or not at all. That is a different question from either direction
  here and is not counted as a short.
- **Extras: 2. Both dead. Neither deleted.**
- Artefacts in this lane directory: `be.json` (177), `fe-core.json` (40), `rows.json` (Tier A matching),
  `ladders.json`, `maps.json`, and the three scripts `extract.py`, `match.py`, `ladders.py`, `maps.py`.
