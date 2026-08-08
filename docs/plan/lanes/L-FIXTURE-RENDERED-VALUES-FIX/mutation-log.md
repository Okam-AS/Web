# L-FIXTURE-RENDERED-VALUES-FIX — the words an operator reads, corrected where they are read

Worktree `/Users/svendaneel/okam/web-fixrendered`, branch `lane/fixture-rendered-values` off
`lane/consent-reason-vocabulary` at `038612f`. `node_modules` symlinked from `Web-modules`; `core`
copied in at `1bcab0b6` (the pinned gitlink) because the submodule cannot be cloned over `file://`
here. No container, no port, nothing pushed.

Sweep taken as given from
`/Users/svendaneel/okam/web-vocabsweep/lanes/L-FIXTURE-VOCABULARY-SWEEP/vocabulary.md` — but **every
value this lane changed was re-verified against `OkamAPI-modules` by object at `8e2b57de`**, never
from its working tree. §5 records the two places the sweep does not survive that re-check.

---

## 1. The suite baseline, before the first edit

A suite total is a property of a tree, so it was measured in this one.

| | before | after |
|---|---|---|
| test files | 112 | **113** |
| tests | 2 583 | **2 603** (+20, all in the one new file) |
| failed | **2** | **2** |

Both reds are `test/journey-artifact-store.test.js:295` and `:457` — the checkout-basename
assertions, which read `Web-modules@` and get this worktree's basename. Pre-existing, not this
lane's, fix on `lane/worktree-basename-pin`. Same two before and after, by file and line.

Lint was measured the same way: `npx eslint` on the three fixture files at `038612f` reports **23
errors**; the same three plus the new test file report **23** now. `world.js` had none and has none.
The four I introduced on the first pass (a `.indexOf` existence check, two `object-curly-newline`,
one `arrow-parens`) were removed before the final run.

---

## 2. Prediction, written before the edits

The prior lane established the method: find the readers first, write down what you expect to red,
then change it. The readers were enumerated by grep over `test/ utils/ components/ pages/ stores/`
and over `test/e2e/journeys/`:

| value | tests that read it | predicted reds |
|---|---|---|
| `Staff` (`actorKind`) | none — the string occurs twice in the estate, both in `world.js` | 0 |
| `Capture` (receipt kind) | none — one occurrence, `world.js` | 0 |
| `PendingConfirmation` | none — two occurrences, both `growth-newsletter.js` (one a comment) | 0 |
| `Sent` (test-send status) | none. `growth-newsletter-page.test.js:33` already mocks `'Accepted'`; `fixture-divergence.js:254` is its own stand-in world | 0 |
| `Received` (order status) | none. `api-server.js:270` and `growth-privacy-*` are a different field's real member | 0 |

**Observed: 0.** No Playwright journey asserts any of the five either; the single grep hit,
`events-enquiry-to-settlement.spec.js:501` `toContainText('Unverified')`, is a settlement line's
verification status driven by `events.js`, a different module from the Growth breakdown key.

---

## 3. The seven sites, one row each

`R` = what the operator reads after this change. Every row is proven by a **mounted** assertion in
`test/fixture-rendered-vocabulary.test.js`; §4 shows each one reds on the pre-fix word.

| # | render site | fixture | was | now | R |
|---|---|---|---|---|---|
| 1 | `EventsJourney.vue:340` | `world.js` transitions ×2 | `Staff` | **`Admin`** | `Admin`, twice |
| 2 | `EventsJourney.vue:167` | `world.js` deposit receipt | `Capture` | **`ProviderConfirmed`** | `ProviderConfirmed` |
| 3 | `GrowthAudiencePanel.vue:51` | `growth-newsletter.js:116` key | `PendingConfirmation` | **`Unverified`** | `Unverified` |
| 4 | `growth-newsletter.vue:561` | `growth-newsletter.js` test-send | `Sent` | **`Accepted`** | the banner sentence |
| 5 | `OrderModal.vue:52` | `consumer-api-server.js` created order | `Received` | **`Accepted`** | «Forespurt» — it rendered «Ikke satt» |
| 6 | `EventsJourney.vue:136` | `world.js` deposit rail | `Card` | **left** | `Card`, raw |
| 7 | `EventsJourney.vue:258` | `world.js` run-sheet section | `Kitchen` | **left** | `Kitchen`, raw |

### Every membership and every intended member, re-read from the backend by object

Not from the sweep, and not from `core/enums` — `core/enums/payment-type.ts` carries 16 members and
the backend `PaymentType` carries 17, so the frontend mirror is a source that would have been wrong.

| enum | read at | membership |
|---|---|---|
| `EventsActorKind` | `8e2b57de:Enums/Events/EventsActorKind.cs` | Admin, Guest, System — **no `Staff`** |
| `EventsPaymentReceiptKind` | `…/EventsPaymentReceiptKind.cs` | Initiated, LinkIssued, ProviderConfirmed, RefundIssued, ProviderRefundConfirmed, Forfeited, Failed, Expired — **no `Capture`** |
| `EventsRunSheetSection` | `…/EventsRunSheetSection.cs` | Timeline, Space, Menu, Dietary, Staffing, Contacts — **no `Kitchen`** |
| `GrowthConsentDenyReason` | `Enums/Growth/GrowthConsentDenyReason.cs` | None…**Unverified = 4**…ChannelUnsupported — **no `PendingConfirmation`** |
| `GrowthMailSubmissionStatusDto` | `Models/Growth/GrowthNewsletterModels.cs:195-200` | Accepted, Rejected, Duplicate — **no `Sent`** |
| `OrderStatus` | `Enums/OrderStatus.cs` | OpenCheck, Accepted, Processing, ReadyForPickup, ReadyForDriver, DriverPickedUp, Served, Completed, Canceled — **no `Received`** |

The writers that make the intended member the intended member, each opened and read:

* `Admin` — `Services/Events/EventsProposalService.cs:137` and `EventsSettlementService.cs:73` both
  pass `EventsActorKind.Admin` into `EventsStateMachine.Transition(...)`; and the fixture's own other
  half already writes `'Admin'` for these two transitions (`events.js:744`, `:788`).
* `ProviderConfirmed` — the enum's own XML doc: «`ProviderConfirmed` records the completion promotion
  (T9) with the provider-truth paid amount». The row sits on a deposit marked `Paid` with a
  `paidAtUtc` and an `amountMinor` equal to the deposit.
* `Unverified` — `Services/Growth/GrowthSegmentService.cs:203` sets the reason from
  `eligibility.DenyReason.ToString()`; two existing tests already write `Unverified`.
* `Accepted` (submission) — the DTO's own doc: «The provider's submission status (Accepted /
  Rejected / Duplicate) — never a delivery state».
* `Accepted` (order) — `Services/CartService.cs:632` writes `Status = OrderStatus.Accepted` on the
  exact route being modelled, and `world.js` `ONGOING_ORDERS` already writes it.

### The bindings, which are by reading code and never by name

Three of these wire properties are declared `string`, which is why a name-keyed check shrugs at all
of them: `EventsViewMapper.cs:110` (`ActorKind = row.ActorKind.ToString()`),
`EventsRunSheetService.cs:205` (`Section = i.Section.ToString()`), `EventsProposalViews.cs:66`.
`EventsDepositModels.cs:33`/`:50` are enum-typed and reach the wire as member names through the
global `StringEnumConverter`.

### The two left alone

**`Card`.** `PaymentType` has no such member. The sibling receipt's `dintero-cap-77120` narrows it to
the Dintero family; that family has six members and nothing in either repo says which. Guessing would
replace a visibly wrong answer with a confident one.

**`Kitchen`.** `EventsRunSheetSection` has no such member — and no member repairs the row, because its
*shape* is not one the composer emits. `EventsRunSheetComposer` is the only producer:
Timeline carries a `timeLabel` and no quantity, Menu a `quantityLabel` and no time, Space a capacity
and no time (verified by reading `:45-90` at `8e2b57de`). This row carries a time **and** a quantity.
Renaming the section would leave a line the composer still cannot produce.

Both are recorded in code, not only here: `world.js` now routes them through `unresolved(enum, value,
why)`, and the exemption list is exported and asserted **whole**, so a third value quietly joining it
reds (arm 6).

---

## 4. Fix the seed, not only the value

`events.js` is 74-for-74 because it *derives* every status by running the machine. `world.js`
hand-types, and owned five of the twelve — all inside the Events objects `events.js` serves but does
not build. A hand-typed constant corrected today drifts again next month, so the values are no longer
bare strings:

```
actorKind: member('EventsActorKind', 'Admin')
```

`member()` throws **at require time** on anything the backend enum does not declare. Proven by
negative control before the tests were written:

```
world.js: "Staff" is not a member of EventsActorKind (Admin, Guest, System).
The fixture would print a word the product cannot produce.
```

Memberships are copied from the three enum files named above, with the file cited in the code beside
them. `PaymentType` is deliberately **not** transcribed: the only value it governs here is the
unresolved `Card`, and copying a 17-member enum I can only cross-check against a 16-member frontend
mirror would have added a second source of error for nothing.

---

## 5. Two things the sweep says that this re-check does not support

Recorded rather than quietly repaired, because both change what the evidence means.

**(a) Row 10's reader is not a guest, and the guest-side fallback is not «Ikke satt».**
The sweep says the `Received` order status is read by `components/organisms/OrderModal.vue:52` and
shows «a guest» the word «Ikke satt». Two things about that do not survive checking.

*Who reads it.* In this repository that component is imported by `pages/admin/orders.vue` and by
nothing else, and all three live `orderStatusLabel` call sites (`organisms/OrderModal.vue:52`,
`molecules/ReceiptModal.vue:92`, `pages/admin/orders.vue:296`) are **admin** surfaces;
`molecules/OrderModal.vue` has no importer at all. «Ikke satt» is what the **venue** would read.

*What the guest reads instead.* `consumer-api-server.js` serves a **sibling repo** —
`test/e2e/support/consumer-guest.js:14` resolves `E2E_CONSUMER_ROOT` to `../ConsumerWeb`. That app
has its own `orderStatusLabel` (`core/helpers/tools.ts:79-93`), and it is a **different function**
from this repo's: its map ends `default: ""`, and it is applied to the fixed steps of
`progressFlow`, never to the order's own status. The order's status goes through
`orderStatusHeading` (`core/helpers/tools.ts:95-109`), which also returns `""` for a member it does
not know, and through `progressFlow` (`core/pinia/order.ts:127-145`), where an unrecognised status
matches no step and leaves the flow with **no current step**. The string «Ikke satt» does not occur
anywhere in ConsumerWeb. So the guest saw an **empty heading and a stalled progress bar**, not «not
set».

None of this changes the correction — `Received` is a member of nothing and `CartService.cs:632`
writes `Accepted` — and both readers were worse off with the wrong word, one blank and one lying.
But the sweep's render attribution for this row is wrong on both counts, and this lane's row 5
assertion is explicit about which component it mounts and which app that component belongs to.

**(b) The `Kitchen` row is not the only run-sheet item with a shape the composer cannot emit.** Its
sibling `{ section: 'Timeline', timeLabel: '18:00', …, quantityLabel: '40 stk' }` carries both fields
too, and its section IS a member, so the sweep's enum-membership criterion cannot see it. Left
untouched — outside this lane's criterion — and named so the Events owner rules on one finding rather
than two.

Five string-typed fields (`action`, `permittedActions[]`, `capabilities[]`, subscribe `status`,
`approval.state`) are untouched, as the brief requires. `approval.state: 'Superseded'` makes the
newsletter journey walk `BLOCK_NOT_APPROVED` where it meant `BLOCK_APPROVAL_SUPERSEDED`; that is its
own lane and its own decision.

---

## 6. The mutation proof

Full transcript: `mutation-arms.txt`; script: `mutate.sh`. Each arm restores the pre-fix word (or
breaks the render), runs only the new file, and is restored before the next.

| arm | mutation | reds | the arm's point |
|---|---|---|---|
| 0 | none | **0 / 20** | positive control |
| 1 | `actorKind` → `Staff` | 2 | the corrected word is what is rendered |
| 2 | receipt `kind` → `Capture` | 1 | ditto |
| 3 | key → `PendingConfirmation` | 2 | ditto |
| 4 | test-send → `Sent` | 2 | ditto |
| 5 | order → `Received` | 2 | ditto |
| 6 | a third value joins the exemption list | 2 | the two left alone cannot silently become three |
| 7 | **the `actorKind` chip deleted from the template** | 3 | **the assertions read the SCREEN, not the constant** |
| final | restored | **0 / 20** | the tree measured is the tree shipped |

Arm 7 is the one that matters most. A test asserting `world.ADMIN_EVENT_DETAIL.transitions[0]
.actorKind === 'Admin'` survives deleting the render line; these do not.

Every corrected site also carries a **fallback arm** — a genuinely unknown value must still produce
`—` (Events, three sites), still be printed rather than swallowed (Growth audience), or still say
«Ikke satt» (order status). Without them a fix that replaced one wrong answer with a narrower one
would look identical to a fix that worked. Row 5 additionally carries the arm the brief names: it
rendered *as* the fallback before, so it needs proof the word **appears at all**, which
`expect(badge.text()).toBe('Forespurt')` gives and a before/after on «Ikke satt» would not.

---

## 7. How the two servers were driven without a port

Both Growth assertions and the order assertion drive the fixture's own code rather than importing a
constant out of it.

* `growth-newsletter.js` exports `route(ctx)` over a plain context, so the snapshot, the draft and the
  test-send are three real calls through the real guards.
* `consumer-api-server.js` calls `server.listen` on require, which is why nothing had ever asserted
  anything about it from a unit suite. `jest.mock('http')` replaces **only** `createServer`, handing
  the file's real handler to the test with no socket, no child process and no port that could collide
  with another lane. `POST /carts/complete/{id}` is then driven with a fake `req`/`res`, and the
  order document the modal is mounted with is the one the route actually produced.

## 8. Constraints

C1 no append-only write of any kind (fixture data only). C2 no migration, no `OnModelCreating`.
C3 no new service, route, page or flag. C4 no money-path write. C6 no statutory claim added.
C7 no log or telemetry call added anywhere. **C5: nothing here is marked verified or accepted — the
suite is evidence that the words changed on the screens, and Sven walking the surfaces is the gate.**
