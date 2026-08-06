# L-PAYMENT-LABEL-UKJENT — a cash sale stops reading «Ukjent»

**Verdict: `built`.** Commit `4465d02` on `lane/payment-label-ukjent`, worktree
`/Users/svendaneel/okam/web-paylabel`, branched from `e34977a` (`feature/restaurant-modules`). Nothing
pushed, no shared branch touched, no submodule pin moved, no container started.

| what | where |
|---|---|
| the fix | `plugins/global-mixin.js` (+64/−13), `translations/{no,en,de}.ts` (+5 each) |
| the proof | `test/payment-type-label.test.js`, 132 assertions, all green |
| the same test against the prior switch | `negative-control.txt` — **75 failed, 57 passed** |
| the suite before / after | `full-suite-before.txt` 2581/2583 · `full-suite-after.txt` 2713/2715 |
| the two reds in both, with this lane's work entirely absent | `basename-tax-baseline.txt` |
| re-runnable measurement | `measure.py` → `measured.json` (`measure-err.txt` empty) |

---

## 1. The population, and why it was not taken from the switch

`measure.py` reads the backend enum **by object** — `git show 8e2b57de:Enums/PaymentType.cs` in
`/Users/svendaneel/okam/OkamAPI` — with comments stripped before parsing, so the prose paragraph that
names `CompanyAccount` cannot manufacture a member. **Seventeen.** It then reads the switch **from the
base revision** rather than from memory: `git show e34977a:plugins/global-mixin.js`. **Ten cases, and
`default: return 'Ukjent'`.**

Neither population was read from the other. Taking the switch's own cases as the denominator is what
let this stand for as long as it did — it passes by construction, and it is the nearest of the twenty
measured wrong answers to this lane.

```
backend (17)   NotSet Giftcard PayInStore Cash Stripe Vipps Dintero DinteroVipps DinteroBillie
               DinteroKlarna DinteroKravia DinteroTerminal WoltMarketplace Surfboard SurfboardVipps
               SurfboardTerminal CompanyAccount
switch  (10)   PayInStore Stripe Vipps Giftcard Dintero DinteroVipps DinteroBillie DinteroKlarna
               DinteroKravia WoltMarketplace
fell to 'Ukjent' (7)  NotSet · Cash · DinteroTerminal · Surfboard · SurfboardVipps ·
                      SurfboardTerminal · CompanyAccount
```

The brief's seven are the seven. The mirror at `core/enums/payment-type.ts` was never read by this
lane and never needed to be: the switch compares **raw string literals**, so no correction to the
enum mirror could have reached it. That is the finding L-PAYMENTTYPE-COMPANYACCOUNT ended on, and it
holds.

## 2. The live defect, traced end to end rather than asserted

`components/admin/pos/PaymentScreen.vue` allocates settlement parts with `paymentType: 'Cash'`
(line 771) and `'SurfboardTerminal'` (lines 665, 739); `SplitBillModal.vue:359` does the same for
cash. On the backend, `Services/Kassa/PosSettlementService.cs:726` sets
`order.PaymentType = DominantPaymentType(confirmed)` — the confirmed part with the largest amount
(`:974`). A card sale on the counter terminal lands the same way through
`Services/Kassa/TerminalPaymentOrchestrator.cs:1112` (`order.PaymentType = tx.PaymentType`).

That order is then read back on `pages/admin/orders.vue` and `pages/admin/ongoing.vue`, whose four
components all render `paymentTypeLabel(order.paymentType)`. **So a POS cash sale said «Ukjent».** No
Meals order, no company account, no unusual tender — this is the ordinary sale a venue makes all day.

## 3. Each of the seven checked for whether an operator can ever see it

The brief asked for this per value, because a label for a value no screen reaches is dead code with a
translation cost. **None of the seven turned out to be unlabelable.**

| member | can an operator meet it? | evidence |
|---|---|---|
| `Cash` (110) | **yes, written by this repo's POS** | `PaymentScreen.vue:771` → `DominantPaymentType` |
| `SurfboardTerminal` (650) | **yes, written by this repo's POS** | `PaymentScreen.vue:665,739` → same |
| `DinteroTerminal` (450) | yes | `DinteroTerminalService.Initiate.cs:73,228`; `TerminalPaymentOrchestrator.cs:1112` |
| `Surfboard` (600) | yes | `SurfboardController.cs:106` — online Surfboard checkout |
| `SurfboardVipps` (610) | yes | `SurfboardController.cs:104-105`; offered by `PaymentService.cs:206` |
| `NotSet` (0) | yes, and it is a *state*, not a gap | `CheckSplitService.BuildPartOrder:473` creates every split part as an `OpenCheck` order with `PaymentType.NotSet` |
| `CompanyAccount` (120) | yes — **and the earlier reading of this one was too narrow** | below |

**`CompanyAccount` is not consumer-checkout-only.** The prior lane established that it never comes
back from `GetPaymentMethods` and that ConsumerWeb hides the rails entirely while the company pays —
both true, and both about the *checkout*. But `Services/Kassa/PosSettlementService.cs:445` builds an
`OrderPayment` with `PaymentType = PaymentType.CompanyAccount` for a Meals-authorized settlement, and
line 726 then stamps the order with it. An admin reading that order back is on the surface this lane
fixed. This repository's POS cannot *send* such an allocation today (nothing here posts
`'CompanyAccount'`), so it is not yet reachable end-to-end **from this client** — but the order list
renders whatever the backend returns, from any client, and the label costs one dictionary key.

**`NotSet` is the one that deserved a thought rather than a label.** «Ukjent» means *this client did
not recognise the value*. `NotSet` means *nobody has paid yet*. Those are different facts and an
operator staring at an open check is entitled to the second one, so it now reads **«Ingen betaling
registrert»** and the unknown fallback keeps its own, narrower meaning.

## 4. The locale question — answered, not deferred, and not a relocation

**The labels already belong in `translations/`, and nine of them were already there.**

`translations/{no,en,de}.ts` carry `orders_paymentBillie`, `…Card`, `…Dintero`, `…Giftcard`,
`…Klarna`, `…Kravia`, `…PayInStore`, `…Vipps`, `…Wolt` — in all three languages — and
`pages/admin/orders.vue:572-581` already renders them as the payment-type **filter** on the very page
whose order rows this lane fixes. The Norwegian values are byte-identical to the literals the switch
returned. So the switch was a **duplicate** of a dictionary three components away, and the divergence
had a visible consequence: on the CH build, which serves only German, the filter said
*Zahlungsarten / Mit Karte bezahlt* while the row beside it said *Betalt med kort*.

This change therefore **moves no string**. It points the mixin at keys that already existed and adds
five new ones (`orders_paymentCash`, `…CompanyAccount`, `…NotSet`, `…Terminal`, `…Unknown`) in all
three dictionaries. Nothing an operator reads in Norwegian changes for the ten that already worked —
the test asserts the exact words, not merely that they are not «Ukjent».

Two consequences worth naming rather than burying:

- **All ten previously-working labels were also wrong on the Swiss build.** They are fixed by the
  same change, and the German arm of the test covers all seventeen for that reason, not only the seven.
- **`pages/admin/orders.vue`'s filter still offers only ten of the seventeen.** That is the census's
  own separate finding and is **not** touched here: a filter that offers a subset is a choice, while a
  label that answers «Ukjent» is a wrong answer. Recorded for whoever takes it.

## 5. The default was not widened

`default:` still resolves `orders_paymentUnknown`, which is still **«Ukjent»** in Norwegian. A
fallback that invents something readable for every unknown value is exactly how seven accumulated
unseen. The lookup is guarded with `hasOwnProperty`, so `constructor` and `toString` answer the
fallback rather than an inherited function — both are in the test's negative arm.
`measured.json.after_widened_default` is `false`.

## 6. The assertion is over the rendered word, on the mounted surface

`test/payment-type-label.test.js` imports `~/plugins/global-mixin` and `~/plugins/i18n` **for their
`Vue.mixin` side effect**, so what renders is the shipped `paymentTypeLabel` and the shipped `$i`
resolving a real dictionary against a real `adminLocale` — not a stand-in. Per member it mounts the
component, finds the row whose own label is the payment label, and reads the word beside it.

- **17 members × Norwegian × 3 surfaces**, asserted against the exact expected word (a table written
  out longhand, so a *wrong* arm and a *missing* arm are distinguishable — deriving the expectation
  through the same map would have made every input agree).
- **17 members × German**, likewise, each additionally asserted to differ from its Norwegian text.
- **8 non-payment-types** (`'Twint'`, `'cash'`, `constructor`, `toString`, `''`, `null`, `undefined`,
  `110`) still answering «Ukjent» / «Unbekannt», on every surface.
- **the named journey**: a POS cash sale reads «Betalt kontant» and its card leg «Betalt med terminal»,
  on every surface.
- **the map declares exactly the backend's seventeen**, and every key it names exists in each of the
  three dictionaries *in its own right* — `translate` falls back `no → en → de`, so a key present only
  in Norwegian would render Norwegian on the German build and look translated.

Two traps the writing of it walked into, both now guarded:

- The payment row on `OrderCard.vue` sits behind `v-if="isExpanded"` (line 32). The first draft
  mounted the card **collapsed**, and `findAll` returned nothing — with a looser reader that is a
  green suite over an empty page. `readRow` now throws unless it finds **exactly one** matching row.
- The negative control is not a claim. `negative-control.txt` is this test file run against the
  unmodified `plugins/global-mixin.js`: **75 failed**, naming `NotSet`, `Cash`, `CompanyAccount`,
  `DinteroTerminal`, `Surfboard`, `SurfboardVipps`, `SurfboardTerminal` and every German arm.

## 7. Three surfaces mounted, one that this repository cannot mount

`ReceiptModal.vue` is the fourth component that renders the label, and it **cannot be mounted by this
repo's test toolchain at all**: its template uses optional chaining (`order.user?.phoneNumber`, lines
51 and 55), vue-jest compiles the render function through `vue-template-es2015-compiler` (buble), and
buble cannot parse `?.` — importing it fails the suite before an assertion runs. Pre-existing, not
introduced here. The file carries two source-level checks over it that are **explicitly labelled as
not mounted assertions**: that it renders the same expression, and that the blocker is still present
(so the check reds when the surface becomes mountable and should join the other three).

`components/molecules/OrderModal.vue` mounts with `atoms/Modal.vue` stubbed, slot preserved. The
reason is a real defect found on the way: **`components/molecules/FocusTrap.vue` declares its
teardown in `unmounted()` — a Vue 3 hook this Vue 2 application never calls** — while deferring
`activateTrap` onto a `setImmediate`, so the trap outlives the test and dereferences `document` after
jsdom is gone, killing the worker. In the browser the same stale hook means a closed modal is never
removed from the trap's `instances` list and never returns focus. Recorded, not fixed.

## 8. Adjacent findings, named and left alone

1. **`components/molecules/OrderModal.vue` labels its rows with hardcoded Norwegian** — `<dt>Betaling</dt>`,
   `<dt>Leveringsmetode</dt>` — with no `$i` anywhere in the component. The row *value* is now
   translated; the row *label* beside it is not, so on the CH build that component reads
   "Betaling: Mit Karte bezahlt".
2. **`FocusTrap.vue`'s `unmounted()`** — see §7.
3. **`pages/admin/orders.vue`'s payment filter offers ten of seventeen** — see §4.
4. **The backend's own receipt label has the same shape of hole.** `Services/ReceiptService.cs:152`
   returns `string.Empty` by default, so `Cash`, `PayInStore`, `Giftcard`, `DinteroTerminal`,
   `WoltMarketplace` and `NotSet` print a **blank payer line** on a generated receipt. Backend-owned;
   named here because this lane had the enumeration in hand.
5. **A merge hazard, not a defect.** The shared checkout at `/Users/svendaneel/okam/Web-modules` has
   ~1,140 uncommitted lines across `translations/{no,en,de}.ts` from another lane, and an
   uncommitted comment-only edit to `plugins/global-mixin.js` in `wholeAmount`/`fractionAmount` —
   a different method, no textual overlap with this change. This lane branched from `e34977a` and
   never wrote to that tree. The five new keys are placed in alphabetical order inside the existing
   `orders_payment*` block, so the merge is mechanical.

## 9. Constraints

C1 no append-only table touched (no SQL at all). C2 no migration, no `OnModelCreating`. C3 nothing new
to reach — the method already had four callers on two live pages, and both the map and its keys are
consumed by them. C4 no money-path write added; this change is read-side only, and the point of it is
that the actor-bearing fact a settlement recorded is now legible instead of «Ukjent». C5 the exit is
evidenced by mounted renders of the word an operator reads, and this lane does not move anything to
accepted — Sven's reading of the screen is still the gate. C6 no statutory claim printed. C7 no log or
telemetry call added anywhere.
