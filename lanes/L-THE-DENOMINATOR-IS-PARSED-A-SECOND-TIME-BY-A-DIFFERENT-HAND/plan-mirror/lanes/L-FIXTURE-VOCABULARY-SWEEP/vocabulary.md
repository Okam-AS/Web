# L-FIXTURE-VOCABULARY-SWEEP — every word the e2e fixture puts in an operator's mouth

Baseline: `lane/consent-reason-vocabulary` at `038612f`, worktree `/Users/svendaneel/okam/web-vocabsweep`
(read-only; nothing changed). Backend read **by object** at `8e2b57de` in
`/Users/svendaneel/okam/OkamAPI-modules` — never from its working tree, which is on
`lane/meals-grace-pins`, 1-ahead/63-behind, and has manufactured false absences for four lanes.

Prior lane's three divergences are taken as given and NOT re-derived: see
`lanes/L-CONSENT-REASON-VOCABULARY/vocabulary.md` for `SpamComplaint`→`Complaint`,
`ManualSuppression`→`AdminBlock` (both fixed at `038612f`), `PendingConfirmation`→`Unverified`
(recorded, unfixed), and for the C1/`EnumToStringConverter` argument that settles which side moves.

No suite was run. No container. Nothing edited.

---

## 0. The denominator, before any finding

**All ten fixture files were swept**, not the four named as the floor. The four
(`api-server.js`, `consumer-api-server.js`, `growth.js`, `training.js`) are included; the other six
(`consumer-world.js`, `events.js`, `growth-newsletter.js`, `margin.js`, `meals.js`, `world.js`) turned
out to carry **eight of the twelve** divergences, `world.js` alone five.

| | |
|---|---|
| fixture files swept | **10 of 10** (`test/e2e/fixture/*.js`), 6,655 lines |
| string literals, comments stripped first | 1,556 |
| enum-shaped literals (`^[A-Z][A-Za-z0-9]{2,}$`, HTTP verbs removed) | 343 |
| enum-shaped **object keys** (breakdown dictionaries) | 17 |
| rows carried into the check | **360** |
| **bound to a backend enum and correct** | **260** |
| **bound to a backend enum with no member behind it** | **12** |
| bound to a field the backend types `string`, or not a vocabulary field at all | 86 |
| unresolved after tracing | **0** (2 started untraced; both resolved — §5) |
| distinct backend enums exercised | **47** of the 177 declared at `8e2b57de` |

**So the fixture is 260-for-272 on enum vocabulary — 95.6% right.** `events.js` (74 enum-bound values),
`margin.js` (43), `meals.js` (17), `training.js` (11) and `consumer-world.js` (4) are **clean, all of
them**. `events.js` in particular carries the whole Events state machine — five enums, 74 values — and
does not get one word wrong. The drift is not general; it is concentrated, and §4 says where.

Method, in one line: strip comments first (string-aware, so a `//` inside a URL is not eaten), extract
every literal and every PascalCase object key, then bind each **field** to an enum **by the backend code
that reads or writes it**, never by name — and check the value against *that* enum's membership.

**Why binding by name would have produced confident wrong answers here:** 5 of the 12 failures carry a
value that IS a member of some other enum. `Capture` is a real `MealsAllocationKind`. `Superseded` is a
real `EventsProposalVersionStatus`, `MarginRecipeVersionState`, `EventsRunSheetStatus` and
`MealsReleaseCause`. `Pending`, `Received` and `Sent` are members of five enums between them. A
union-membership check — the obvious cheap version of this sweep — passes **five of the twelve** silently.

---

## 1. The twelve, in one table

`R?` = does anything render it to a human. Full evidence per row in §2–§3.

| # | file:line | field | value | enum behind the field | intended member | R? |
|---|---|---|---|---|---|---|
| 1 | `world.js:460`, `:461` | `actorKind` | `Staff` | `EventsActorKind` | **`Admin`** | **yes, raw** |
| 2 | `world.js:470` | `paymentType` | `Card` | `PaymentType` | **unknown** (Dintero family) | **yes, raw** |
| 3 | `world.js:479` | `kind` (deposit receipt) | `Capture` | `EventsPaymentReceiptKind` | **`ProviderConfirmed`** | **yes, raw** |
| 4 | `world.js:498` | `section` | `Kitchen` | `EventsRunSheetSection` | **unknown** (§3) | **yes, raw** |
| 5 | `growth-newsletter.js:116` | `exclusionReasonBreakdown` **key** | `PendingConfirmation` | `GrowthConsentDenyReason` | **`Unverified`** | **yes, raw** |
| 6 | `growth-newsletter.js:488` | `status` (test-send) | `Sent` | `GrowthMailSubmissionStatusDto` | **`Accepted`** | **yes, in a banner** |
| 7 | `growth-newsletter.js:541` | `newsletter.state` | `Dispatched` | `GrowthNewsletterState` | **`Dispatching`** | no |
| 8 | `api-server.js:472` | `state` (shift assignment) | `Planned` | `WorkforceShiftAssignmentState` | **`Draft`** | no |
| 9 | `api-server.js:1202` | `invitation.state` | `Superseded` | `WorkforceInvitationState` | **none — the state does not exist** | no (unobservable) |
| 10 | `consumer-api-server.js:352` | `status` (created order) | `Received` | `OrderStatus` | **`Accepted`** | **yes, as «Ikke satt»** |
| 11 | `consumer-api-server.js:334` | `status` (pre-bind order) | `Pending` | `OrderStatus` | **`Accepted`** | no (unobservable) |

Eleven rows above, twelve counted — `Staff` occupies two lines of the same array.

---

## 2. The six that reach a screen

### 1. `Staff` — `world.js:460,461`, `actorKind`

`EventsActorKind` (`Enums/Events/EventsActorKind.cs`) is `Admin`, `Guest`, `System`. Nothing else, and
`Staff` is a member of **no enum in the estate**.

The binding is by code, not by name: `Services/Events/EventsViewMapper.cs:110` builds the transition view
with `ActorKind = row.ActorKind.ToString()`, and `row.ActorKind` is
`EventsStateTransition.ActorKind`, typed `EventsActorKind` (`Entities/Events/EventsStateTransition.cs:33`).
The wire value is therefore the member name verbatim. `EventsProposalViews.cs:66` declares the view
property as `string` — which is exactly why a name-keyed match would have shrugged at it.

**Intended: `Admin`, corroborated twice.** Every admin-side call into
`EventsStateMachine.Transition(...)` passes `EventsActorKind.Admin` (e.g. `EventsProposalService.cs:137`,
`EventsSettlementService.cs:73`), and **the fixture's own other half already writes `'Admin'` for these
same two transitions** — `events.js:744` (`'Proposing', 'Admin'`) and `:788` (`'ProposalSent', 'Admin'`).
The third row of the same array, `actorKind: 'Guest'` for the acceptance, is right and matches
`events.js:515`.

**Rendered raw.** `components/admin/events/EventsJourney.vue:340` prints
`{{ row.actorKind || unknownMark }}` — no label map, no i18n key. A journey walking the events activity
list shows a Norwegian venue manager the word «Staff» for an act the product records as `Admin`.

### 2. `Card` — `world.js:470`, deposit `paymentType`

`Models/Events/EventsDepositModels.cs:50` declares `EventsDepositView.PaymentType` as the `PaymentType`
enum. With the global `StringEnumConverter` (`Helpers/ServiceCollectionExtensions.cs:170`, wired at
`Program.cs:113`) an enum-typed property serialises as its **member name**. `PaymentType` has seventeen
members — `NotSet Giftcard PayInStore Cash Stripe Vipps Dintero DinteroVipps DinteroBillie DinteroKlarna
DinteroKravia DinteroTerminal WoltMarketplace Surfboard SurfboardVipps SurfboardTerminal CompanyAccount`
— and **`Card` is not one of them**. The module's own DTO doc says the v1 rails are "Stripe / Vipps / a
Dintero online method".

**Intended: unknown, and I am not going to invent it.** The sibling receipt on the same object carries
`providerReference: 'dintero-cap-77120'`, which narrows it to the Dintero family, but the enum offers
`Dintero`, `DinteroVipps`, `DinteroBillie`, `DinteroKlarna`, `DinteroKravia` and `DinteroTerminal` and
nothing in the repo says which of the six this seeded deposit stood for. Whoever owns the Events deposit
seed picks it.

**Rendered raw, and this one is worth a second look.** `EventsJourney.vue:136` prints
`{{ deposit.paymentType || unknownMark }}` — it does **not** route through `paymentTypeLabel()`
(`plugins/global-mixin.js:82`), which every consumer-facing surface uses and which would have answered
«Ukjent» for an unknown rail. So the admin deposit panel prints the raw wire token for *every* deposit,
correct or not; the fixture's «Card» merely makes that visible.

### 3. `Capture` — `world.js:479`, deposit receipt `kind`

`Models/Events/EventsDepositModels.cs:33` declares `EventsPaymentReceiptView.Kind` as
`EventsPaymentReceiptKind`, whose membership is `Initiated LinkIssued ProviderConfirmed RefundIssued
ProviderRefundConfirmed Forfeited Failed Expired`. **`Capture` is not there.**

This is the clearest false-pass in the set: `Capture` *is* a real member — of `MealsAllocationKind`
(`Capture`, `Reversal`). A union check reports green.

**Intended: `ProviderConfirmed`, corroborated by the enum's own documentation.** The XML doc on
`EventsPaymentReceiptKind` says «`ProviderConfirmed` records the completion promotion (T9) with the
provider-truth paid amount», and the row sits on a deposit the fixture marks `status: 'Paid'` with
`paidAtUtc` and `amountMinor` equal to the deposit amount. That is the completion promotion.

**Rendered raw.** `EventsJourney.vue:167`, `{{ receipt.kind || unknownMark }}`.

### 4. `Kitchen` — `world.js:498`, run-sheet item `section`

`EventsRunSheetService.cs:205` maps `Section = i.Section.ToString()` where `i.Section` is
`EventsRunSheetItem.Section`, typed `EventsRunSheetSection` (`Entities/Events/EventsRunSheetItem.cs:21`).
The view property is a `string` (`Models/Events/EventsRunSheetModels.cs:14`) — another field a name-keyed
match cannot classify. The enum is `Timeline Space Menu Dietary Staffing Contacts`. **No `Kitchen`.**

**Intended: unknown, and the reason is itself the finding.** `EventsRunSheetComposer` is the only producer
of these items, and it emits `Timeline` items **with a `timeLabel` and no quantity** (`:52-60`) and `Menu`
items **with a `quantityLabel` and no time** (`:80-83`). The fixture's item carries **both**
(`timeLabel: '19:00'`, `quantityLabel: '40 kuvert'`). So the fixture did not merely mis-spell a section —
it modelled a run-sheet line the composer cannot produce at all, and there is no member that makes the row
correct without also changing its shape. Events owner's call.

The three sibling items on the same sheet — `Dietary`, `Timeline`, `Timeline` — are right.

**Rendered raw.** `EventsJourney.vue:258`, `{{ item.section || unknownMark }}`, inside the printable
run-sheet section.

### 5. `PendingConfirmation` — `growth-newsletter.js:116`, `exclusionReasonBreakdown` key

Recorded by the prior lane at its old line 89 and left unfixed by design; carried here because the sweep
must not silently drop it, and because **one fact about it was not on record: it is printed.**

The prior lane established the binding (`Services/Growth/GrowthSegmentService.cs:203` sets each member's
reason from `eligibility.DenyReason.ToString()`, `:234-238` groups it) and the corroborated target
(`Unverified` — `test/growth-send-gate.test.js:256` and `test/growth-components.test.js:150` both already
write it). Both re-confirmed at `8e2b57de`; not re-derived further.

**New here — the render path.** `utils/growth/send-gate.js:173-183` (`readAudience`) turns
`Object.keys(breakdown)` into `exclusions: [{ reason, count }]` untouched, and
`components/admin/growth/GrowthAudiencePanel.vue:51` prints `{{ entry.reason }}` **raw** — no label map,
no i18n key. That is the *second* raw-reason render in Growth, the twin of
`GrowthConsentStanding.vue:54`. So this string is not bookkeeping either: a walked audience panel shows an
operator «PendingConfirmation», a word the product cannot print.

This shape — an enum member on the wire as a dictionary **key** rather than as a value — is also why a
value-only sweep is structurally blind to it. 17 such keys exist across the fixtures; the other 16 are
correct (5 `MarginBaseUnit` × 2 tables at `margin.js:68,70` — the complete membership, twice; 3
`GrowthSuppressionReason` at `:92`; `Suppressed` at `:116`; and 2 DTO property names at `:666`, §5).

### 6. `Sent` — `growth-newsletter.js:488`, test-send `status`

`Models/Growth/GrowthNewsletterModels.cs:86` declares `GrowthTestSendResponse.Status` as
`GrowthMailSubmissionStatusDto`, an enum whose whole membership is `Accepted`, `Rejected`, `Duplicate`
(`:195-200`). **`Sent` is not a member.**

**Intended: `Accepted`, corroborated by the DTO itself** — its doc comment on the property reads «The
provider's submission status (Accepted / Rejected / Duplicate) — never a delivery state», and the response
carries a sibling `bool Accepted` the fixture omits.

The irony is exact: the fixture's own comment at `:486` says *"`status` IS A SUBMISSION STATUS AND NOT A
DELIVERY … the provider answering "Sent" means it accepted the handoff"* — it argues the right
distinction and then writes the delivery-sounding word the enum deliberately does not contain.

**Rendered, and interpolated into a banner.** `pages/admin/growth-newsletter.vue:561`:
`this.notify(this.$i('growth_test_result', { status: result.status }))`. The raw token goes straight into
the operator's notification.

---

## 3. The five that no one sees — and why that is still worth the row

### 7. `Dispatched` — `growth-newsletter.js:541`, `newsletter.state`

`GrowthNewsletterDetailResponse.State` is typed `GrowthNewsletterState`
(`Models/Growth/GrowthNewsletterModels.cs:116`), whose membership is `Draft Approved Dispatching Completed
ReconciliationRequired`.

**Intended: `Dispatching`**, corroborated by the only writer: `Services/Growth/GrowthDispatchService.cs:301-303`
sets `newsletterRow.State = GrowthNewsletterState.Dispatching` when a run starts; `:613`/`:619` later move
it to `ReconciliationRequired` or `Completed`. The fixture's neighbouring writes are right — `Draft` at
`:367`, `Approved` at `:400`/`:519` — and the dispatch run it creates two lines later uses
`state: 'InProgress'`, a correct `GrowthDispatchRunState`. One word out of step inside a correct paragraph,
which is the same signature the prior lane found.

**Nothing renders it.** `Dispatched` and `Dispatching` do not occur anywhere in `components/`, `utils/`,
`pages/`, `stores/` or `test/` outside this line. The newsletter detail's top-level `state` has no reader:
the page's gate is built entirely from `approval`, `boundSnapshot`, `run` and the flags
(`utils/growth/send-gate.js`).

### 8. `Planned` — `api-server.js:472`, shift assignment `state`

`Models/Workforce/WorkforceScheduleModels.cs:75` declares `WorkforceShiftAssignmentModel.State` as
`WorkforceShiftAssignmentState` — `Draft`, `Published`, `Cancelled`. **`Planned` is a member of nothing.**

**Intended: `Draft`**, corroborated by the create path: `Services/Workforce/WorkforceScheduleService.cs:577`
writes `State = WorkforceShiftAssignmentState.Draft` on creation and `:657` on edit;
`WorkforceSchedulePublishService.cs:208` is the only thing that promotes to `Published`. The fixture builds
this assignment into a revision it has just created as `state: 'Draft'` (`:1253`) — so the revision's own
state is right and its assignments' is not.

**Nothing renders it, but it is read.** `'Planned'` occurs **exactly once in the entire repository — this
line**. `utils/workforce/week-grid.js:261` carries `state: assignment.state` into every grid shift, and
`utils/workforce/requests-inbox.js:188` branches on `assignment.state === 'Cancelled'`. A `Planned` shift
therefore takes the not-cancelled branch — the right outcome, reached for the wrong reason, and a fixture
that ever needed to model a cancelled shift would have no vocabulary that agrees with the one it uses here.

### 9. `Superseded` — `api-server.js:1202`, workforce `invitation.state`

`WorkforceInvitationState` is `Pending Claimed Revoked Expired`.

**Intended: no member — the state does not exist, and neither does the row.**
`Services/Workforce/WorkforceInvitationService.cs:115-129` says it out loud: *"Reissue supersedes in place:
reuse the single Pending row so at most one Pending ever exists (the filtered unique index) and the previous
token dies immediately"* — it mutates `TokenHash`, `ExpiresAtUtc` and `CreatedAtUtc` on the existing
`Pending` row and never writes a second row or a fourth state. The correct fixture behaviour is to leave
the state alone, not to rename it.

**Unobservable as well as unrendered.** The very next line is
`delete state.invitations[superseded]`, so the mutated object is dropped from the only map any route reads.
The write cannot be seen by any request. `'Superseded'` elsewhere in the repo is a different field's real
member (`utils/events/guest.js:116`, proposal status).

### 10. `Received` — `consumer-api-server.js:352`, created order `status`

`Models/Order/OrderModel.cs:31` declares `Status` as `OrderStatus`: `OpenCheck Accepted Processing
ReadyForPickup ReadyForDriver DriverPickedUp Served Completed Canceled`. **No `Received`.**

**Intended: `Accepted`, corroborated twice.** `Services/CartService.cs:632` sets `Status =
OrderStatus.Accepted` when a cart is promoted to an order — this is the exact response being modelled
(`POST /carts/complete/{id}`) — and **`world.js:781` already writes `status: 'Accepted'`** for the ongoing
orders on the sibling admin surface. Same estate, same field, two different words.

**Rendered — as a lie of omission.** `components/organisms/OrderModal.vue:52` prints
`orderStatusLabel(order.status)`, and `plugins/global-mixin.js:134-145` has no `Received` case, so it falls
through to **`default: return 'Ikke satt'`**. A guest who has just placed an order and opens it is told the
status is «Ikke satt» — not set. The product would have said «Forespurt». Listed here rather than in §2
because what is rendered is the fallback, not the token; the divergence is invisible on screen and wrong
anyway, which is the worse of the two failure modes.

### 11. `Pending` — `consumer-api-server.js:334`, pre-bind order `status`

Same field, same enum, same intended `Accepted` (the backend saves the order at `CartService.cs:632`
*before* attempting the funding bind, and cancels it at `:717` if the bind is refused).

**Unobservable.** On success the row is replaced wholesale at `:371`; on refusal it becomes `Canceled` at
`:342`, and `GET /orders` (`:317`) filters `Canceled` out. No response ever carries it.

---

## 4. Where the drift is, which is not where it was expected

| file | enum-bound values | wrong |
|---|---|---|
| `events.js` | 74 | **0** |
| `world.js` | 54 | **5** |
| `margin.js` | 43 | **0** |
| `api-server.js` | 34 | **2** |
| `growth-newsletter.js` | 23 | **3** |
| `meals.js` | 17 | **0** |
| `consumer-api-server.js` | 12 | **2** |
| `training.js` | 11 | **0** |
| `consumer-world.js` | 4 | **0** |
| `growth.js` | 0 | — |

The split is not per-module and not per-author. It is **seeded data versus simulated behaviour**:

- `events.js` builds its world by *running the machine* — every status it writes is written next to the
  transition that causes it, against a state table copied from `EventsStateMachine`. 74 values, none wrong.
- `world.js` is a hand-typed standing world — objects written once so a page has something to open. 54
  values, **5 wrong, and all five sit in the Events objects `events.js` serves but does not construct**
  (`ADMIN_EVENT_DETAIL.transitions`, `ADMIN_DEPOSITS`, `ADMIN_RUN_SHEET`, served at `events.js:648,653,654`).

So the same module is simultaneously the cleanest file and the source of the largest cluster, and the
dividing line is whether a value was *derived by simulating the product* or *typed in by hand*. That is a
sharper account than "this fixture drifted": it says which kind of fixture code drifts.

The second cluster, Growth's three, is the one the prior lane already characterised — one word out of step
inside a paragraph that is otherwise correct, three times, in three different fields.

---

## 5. What could not be traced to an enum, reported as its own finding

**Zero rows remain unresolved.** Two started that way and both resolved:
`margin.js:666` emits `JSON.stringify({ Currency: …, TheoreticalCostComplete: … })`. These are **DTO
property names**, not enum members — `Models/Margin/MarginStatementModels.cs:90,135` declare both, and
`Services/Margin/MarginStatementService.cs:594` serialises the receipt with a bare
`JsonConvert.SerializeObject`, outside the MVC pipeline, which is why PascalCase survives inside an
otherwise camelCased document. The fixture's comment at `:661-664` says exactly this and is correct.

**Nine fields are backed by a `string` the backend hand-builds rather than by an enum.** They are outside
this lane's exit criterion, and four of them are divergent anyway. Recorded so the next sweep does not
re-derive them, and flagged because *three of the four are rendered*:

| file:line | field | fixture says | product says | evidence | R? |
|---|---|---|---|---|---|
| `world.js:460-462` | `action` | `Create`, `SendProposal`, `Accept` | `T1`…`T17`, or `AmendmentOpened/Accepted/Declined/Expired` | `EventsStateMachine.cs:254` (`Action = action ?? transitionId`); `EventsAmendmentService.cs:19-22` | **yes, raw** — `EventsJourney.vue:338` |
| `events.js:798,807,898` | `permittedActions[]` | `Cancel`, `StartService`, `Close` | transition ids — `PermittedTransitions` returns `t.Id` | `EventsStateMachine.cs:118-121`, `EventsProblemException.cs:131` | **yes** — `pages/admin/events-pipeline.vue:29` joins them into the refusal line |
| `training.js:205` | `capabilities[]` | `TrainingManager` | `manage` | `Services/Training/TrainingContextService.cs:57`; **`test/training-page.test.js:74` already writes `['manage']`** | **yes, raw** — `TrainingContextPanel.vue:18` (`capabilities.join(', ')`) |
| `growth.js:90` | `status` (subscribe ack) | `accepted` | `pending_confirmation` | `Models/Growth/GrowthCaptureModels.cs:29` (`GrowthSubscribeAck.Status = "pending_confirmation"`); **`test/growth-guest-pages.test.js:127,145` already write it** | no — `pages/subscribe/_store.vue` never reads `status` |
| `growth-newsletter.js:425` | `approval.state` | `Superseded` | only `Live` or `None` | `Services/Growth/GrowthNewsletterService.cs:463` (`State = liveApproval != null ? "Live" : "None"`) | no, but see below |

Two of these deserve a sentence more.

**`world.js` `action` versus `events.js` `action`.** The fixture disagrees with *itself* on one field:
`world.js` writes `Create`/`SendProposal`/`Accept`, `events.js` writes `'T11'`/`'T12'`/`'T13'` — and
`events.js` is the one that matches the product. Both feed the same `EventsJourney.vue:338` chip. The
seeded world and the simulated world print two different vocabularies into the same column.

**`approval.state: 'Superseded'` changes which branch the journey walks.**
`utils/growth/send-gate.js:203` reads `if (approval.state !== 'Live')` and returns `APPROVAL_NONE`; the
frontend's own `superseded` verdict is *derived* at `:209` from a version-id mismatch and never read off
the wire. So the fixture's third value is silently collapsed to NONE, and the gate pushes
`BLOCK_NOT_APPROVED` (`:400`) where the fixture plainly intended `BLOCK_APPROVAL_SUPERSEDED` (`:398`). Not
a word on a screen — a walked branch that is not the branch the fixture was written to walk.

The remaining five string-typed fields are **correct**: `consumer-api-server.js:344` `eventName:
'MealsFundingRefused'` matches `Services/CartService.cs:61` exactly; `world.js` `module:` matches all six
`FeatureFlagDescriptor` module names; `world.js:783` `platform: 'Web'` is free text
(`CartService.GetPlatformInfo()`); `events.js` `T11/T12/T13` are transition ids; `world.js:200`
`station: 'Bar'` is free text (its sibling is «Kjøkken»).

**One more absence, deliberately checked.** A PascalCase filter would miss a lowercase value dropped into
an enum-backed field. Every literal in every field bound to an enum was re-tested without the PascalCase
constraint: **0 non-PascalCase values**. The failure mode exists (`growth.js:90` is exactly it, in a
string-typed field) but does not occur in the enum-backed set.

---

## 6. Why the existing check sees none of this, restated with the new evidence

`npm run test:e2e:fixture-divergence` compares refusal **shapes** — `(status, code)` pairs — on 12 of 642
anchored routes. **Every one of the twelve findings lives in a 200 response body**, and the check's own
`--prove` output lists *"a field added to the 200"* among its **green benign controls**. It is not a gap in
coverage; it is the property the check was built with.

This sweep adds a number to that: on the eleven-twelfths the check never anchors, and on the anchored
twelfth's bodies, **272 enum-bound strings were unmeasured, of which 12 were wrong and 6 were being printed
to an operator.**

**And a union-membership check would not have closed it either** — 5 of the 12 carry a value that is a real
member of a *different* enum (§0). The only check that finds these is one that binds the field to its enum
by the reading code. That is 118 (file, field) pairs to bind, 89 of them enum-backed, 47 distinct enums —
which is small enough to be worth automating and too large to re-derive by eye each time.

---

## 7. Reproduction

All under this directory; all read-only; all reading the backend by object at `8e2b57de`.

```
python3 extract-enums.py 8e2b57de > enums-8e2b57de.json   # 177 enums, 741 members
python3 extract-all-literals.py <repo> 038612f <10 files> > literals.json
python3 extract-keys.py        <repo> 038612f <10 files> > keys.json
python3 classify.py                                       # the table in §0, the list in §1
```

`classify.py` carries the field→enum binding table with the `OkamAPI-modules` file:line that establishes
each binding. It is the artefact worth keeping: re-running it after any fixture edit re-checks all 360
rows, and adding a field means adding one line with its evidence.
