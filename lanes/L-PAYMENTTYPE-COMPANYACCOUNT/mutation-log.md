# L-PAYMENTTYPE-COMPANYACCOUNT — measurement, and why there is no mutation to log

**Verdict: `fail-spec`.** This file is named by the lane's exit criterion, so it exists at that path. It
records a measurement and a refusal to mutate, not a mutation set. Nothing in this repository or in the
`core` submodule was edited, committed or pinned by this lane.

**Read this way:** the lane's premise is that a `CompanyAccount` tender falls through
`core/pinia/checkout.ts`'s label ladder and renders nothing at checkout. Half of that is true — the mirror
really is short the member — and the other half is false in every repository where it could matter. The
ladder is not reachable from here, and in the client where it *is* reachable the tender is deliberately
routed around it.

## What was measured, and against what

| side | read from | at |
|---|---|---|
| backend `PaymentType` | `git show 8e2b57de:Enums/PaymentType.cs` in `/Users/svendaneel/okam/OkamAPI` — **by object**, never a working tree | `8e2b57de` |
| this repo's mirror | `core/enums/payment-type.ts` | submodule pin `1bcab0b6`, `heads/lane/core-ore-label` |
| this repo's app layer | working tree of `/Users/svendaneel/okam/Web-modules` | `e34977a`, `feature/restaurant-modules` |
| ConsumerWeb's mirror | `ConsumerWeb/core/enums/payment-type.ts` | pin `c0d70a4`, `heads/feature/swiss` |
| ConsumerApp's mirror | `ConsumerApp/core/enums/payment-type.ts` | pin `a1ce983`, `heads/feature/swiss` |

Scripts and raw output: `measure.py` → `measured.json`, `reach.py` → `reach.json`. Both are re-runnable and
print only what they parsed. The member extractor strips `//` and `/* */` comments before parsing, so the
prose paragraph that *names* `CompanyAccount` inside `Enums/PaymentType.cs` cannot manufacture a member —
and the same stripping is why the mirror is not credited with the member its ConsumerWeb sibling has.

**Validated on the known positive named in the operating notes:** `PaymentType` in this repo's mirror
returns **16** members. It does.

## Finding 1 — the omission is real, confirmed by object

Backend carries **17**; this repo's mirror carries **16**; the single difference is `CompanyAccount`, and
there is **no extra member on the mirror side**.

```
backend  : NotSet Giftcard PayInStore Cash Stripe Vipps Dintero DinteroVipps DinteroBillie
           DinteroKlarna DinteroKravia DinteroTerminal WoltMarketplace Surfboard SurfboardVipps
           SurfboardTerminal CompanyAccount        (17)
mirror   : the same, minus CompanyAccount           (16)
missing  : ["CompanyAccount"]      extra: []
```

`CompanyAccount = 120` in the backend enum, with a comment binding it to the Company Meals credit sale
(spec 20 §7). The census row is correct.

## Finding 2 — the ladder *does* have a default branch, and it was not read

The brief says the clerk read nine lines and asked to be told if there was a tenth. There is.
`core/pinia/checkout.ts` lines 22–35: nine `if (paymentMethod?.paymentType === PaymentType.X) return …`
branches, then **line 34 is `return "";`**.

So the failure mode is not "matches no branch and throws" — it is **an empty string**, which is the
quietest possible wrong answer and exactly the shape the brief warns about. Recorded because the brief
asked for it explicitly, not because it changes the verdict.

## Finding 3 — neither the mirror nor the ladder is reachable from this repository

`reach.py` swept **630** app-layer files (everything but `node_modules`, `.nuxt`, `dist`, `.git`,
`artifacts`, `lanes/` and `core/` itself):

- **`imports_PaymentType`: 0.** Not one file outside `core/` imports `PaymentType` from `core/enums`.
  The only enums this repo imports from the mirror barrel at all are `KeyAccountManagerStatus`
  (`pages/admin/overview.vue:428`) and `MutationName`/`ActionName` (`store/index.js:2`) — which is the
  census's own "only two files" observation, confirmed independently.
- **`imports_core_pinia`: 2, both prose.** `test/e2e/journeys/consumer/meals-funded-checkout.spec.js:114`
  and `meals-stale-token-requote.spec.js:3` mention `core/pinia/checkout.ts` inside comment text. Likewise
  the two `PaymentType.` hits are comment/narrative text at `meals-funded-checkout.spec.js:108` and
  `meals-funded-over-allowance.spec.js:5`. **Nothing in this repo imports `core/pinia`, calls `useCheckout`,
  or calls `paymentLabel`/`payedLabel` from the store.** `calls_payedLabel` is empty.
- **This repo has no checkout.** `pages/webshop/checkout.vue` is thirteen lines and renders
  `RedirectToNewStore`. The consumer checkout lives in ConsumerWeb.

`PaymentType` is read as a value **only inside the submodule**: `core/pinia/checkout.ts` (12 occurrences),
`core/pinia/order.ts` (9), `core/models/cart/cart.ts` (1, a default), `core/models/surfboard/
surfboard-online-models.ts` (2, comments). The census's "value-read — gates a render" is true of the enum,
but every one of those readers is core-internal and **this repo mounts none of them**.

**Consequence for the exit criterion.** "A checkout paid by company account renders a label … shown by a
mounted assertion" has nothing to mount in this worktree. Any mounted test written here would have to
construct core's pinia store itself — which is asserting over a store no surface in this repo renders, i.e.
green over a capability the shipping client does not have. That is the trap L-CORE-ORE-LABEL named, in the
same submodule, five days ago.

## Finding 4 — in the client that *has* the checkout, the tender is routed around the ladder

`ConsumerWeb` (`feature/swiss`, `0abcb38`, core pin `c0d70a4`) is where `paymentLabel` renders —
`components/organisms/CheckoutPayment.vue:37`, `:text="_checkout.paymentLabel(paymentMethod)"`.

1. **Its mirror is not short the member.** `ConsumerWeb/core/enums/payment-type.ts:23` already declares
   `CompanyAccount = "CompanyAccount"`, with a comment giving the 120 mapping. The divergence this lane
   exists for **does not exist in the consumer client**. It exists in *this* repo's core, which is a
   different Core history (`lane/core-ore-label`, off `feature/POS`) that never received the Meals work.
2. **`paymentLabel` is a payment-*method* label, and `CompanyAccount` is never a payment method.** The
   enum's own comment states it: *"Never offer it from GetPaymentMethods — the backend does not return it
   there."* The tender is put on the cart by `chooseCompanyAccount()`
   (`ConsumerWeb/core/pinia/checkout.ts:666`), not by selecting a rail.
3. **The rails are hidden outright while the company pays.** `CheckoutPayment.vue:9` wraps the entire
   method list in `v-if="!_checkout.companyAccountSelected"`, with a comment explaining that showing a
   ticked card radio under a company-funded order "is a lie about who pays". The company tab's own label
   is rendered by `CheckoutMeals.vue`.

So the sentence the exit criterion asks to falsify — a company-account checkout falling through to an
empty label — **cannot be produced in the client that has the checkout**, and the ladder's `return ""` is
not reached by this tender there.

`ConsumerApp` (core pin `a1ce983`, `feature/swiss`) contains **no occurrence of `CompanyAccount` at all**,
in core or app: it has no Meals funding surface, so no such tender can arise there either.

## Finding 5 — the submodule question, settled

`core/` here is a full clone of `https://github.com/Okam-AS/Core.git`. The pin `1bcab0b6` sits on local
branch **`lane/core-ore-label`, which exists on no remote** — `origin` has `lane/core-consolidated` but not
this one. So the pin already points at unpushed lane work, and a commit here is *technically* possible;
L-CORE-ORE-LABEL set that precedent and moved this very pin.

It is nonetheless not this lane's to make, for a reason already ruled rather than a formality:

> **@sven ruled `D-CORE-PIN = consumer-only` on 2026-08-03** — fix the clients that show the defect and
> leave the others pinned; the estate knowingly keeps Cores that disagree.
> (`docs/plan/plan.md:13102`, `docs/plan/log.md:510`)

Web-modules is not a client that shows a checkout. Under that ruling the surface to fix would be
ConsumerWeb — where the mirror is already correct and the ladder is already bypassed. A commit to
`Web-modules/core` would change no rendered pixel in any repository, and would move a shared submodule pin
under nine other lanes working in this checkout, for a file this repo does not import.

## Finding 6 — the reachable defect this lane *found*, named and not fixed

The brief asked what else ladders on payment type. Three more do, and one of them is live here.

| # | ladder | reads the mirror? | branches | fallback |
|---|---|---|---|---|
| A | `core/pinia/checkout.ts:22` `paymentLabel` | yes | 9 | `return ""` (line 34) |
| B | `core/pinia/order.ts:113` `payedLabel` | yes | 10 | `$i("paymentType_unknown")` |
| C | **`plugins/global-mixin.js:82` `paymentTypeLabel`** | **no — raw strings** | 10 | **`return 'Ukjent'`** |
| D | `components/admin/pos/{XReportView,PosReceiptView}.vue` | no — raw strings | 3 | `return type` (echoes the member name) |

**C is the one that renders in this repository.** It is a `switch` on raw string literals — it never
touches the mirror, so no mirror correction can reach it — and it is mounted in four components that live
admin pages render:

- `components/molecules/OrderCard.vue:112`, `components/molecules/OrderModal.vue:49`,
  `components/organisms/OrderModal.vue:87`, `components/molecules/ReceiptModal.vue:59`
- reached from `pages/admin/ongoing.vue` and `pages/admin/orders.vue`

**Seven of the backend's seventeen members render `Ukjent`:** `NotSet`, `Cash`, `DinteroTerminal`,
`Surfboard`, `SurfboardVipps`, `SurfboardTerminal`, `CompanyAccount`.

And this is not a latent Meals-only gap. **`Cash` and `SurfboardTerminal` are tenders this repo's own POS
writes today** — `components/admin/pos/PaymentScreen.vue:665,771` set `paymentType: 'Cash'` and
`'SurfboardTerminal'` on split parts. So a POS cash sale, read back by an operator in the admin order list,
already reads **"Ukjent"**, with no company account involved. That is a live, reachable, in-scope defect —
but it is **a different defect from the one this lane was briefed on**, it is not a mirror divergence, and
the brief's standing instruction is to stop rather than improvise, so it is reported rather than fixed.

Ladder D's `return type` is worth one line: a tender it does not know prints its raw member name
(`CompanyAccount`) on an X-report or POS receipt. No CompanyAccount order can reach POS today, so this is
recorded for the next reader, not claimed as exposure.

## Finding 7 — corroborating the census's adjacent note

The census's raw-string finding at `pages/admin/orders.vue:433` / `pages/admin/statistics.vue:507` stands.
Ladder C above is the same failure class in the same repo — the app layer re-enumerating a backend
vocabulary as literals — and it is the more consequential instance, because a filter that offers a subset
is a choice while a label that answers "Ukjent" is a wrong answer.

## What would make this lane buildable

Restated so the next brief does not repeat the round trip. Two separable pieces:

1. **In Web-modules (reachable, cheap, mountable today):** make `plugins/global-mixin.js:82` name every
   member the backend declares, driven from the backend list rather than the mirror, and prove it with a
   mounted assertion over `OrderCard.vue` for all 17 — plus a negative control that reds when a member is
   deleted from the template, not just from a constant. Exit would be "an admin reads back a funded order",
   not "a checkout".
2. **In ConsumerWeb (where the checkout is):** the mirror is already correct and the ladder is already
   bypassed; if anything is owed there it is a rendered label for the company tab in `CheckoutMeals.vue`,
   which is a different question and needs its own measurement.

## Constraints

No file edited, no commit, no pin moved, no push. No container started or touched. No SQL tier, no
migration. `docs/plan/**` untouched except this lane's RETURN. C1–C7 not engaged: nothing was written.
