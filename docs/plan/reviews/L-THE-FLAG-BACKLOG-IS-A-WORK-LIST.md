# L-THE-FLAG-BACKLOG-IS-A-WORK-LIST — every open flag, sorted

<!-- lane L-THE-FLAG-BACKLOG-IS-A-WORK-LIST · brief 05c05fae · read-only · no flag raised, cleared or edited -->

**310 open flags. 197 agent-closable, 60 sven-only, 53 already-satisfied-but-unclearable.**

Every open Flag in `docs/plan/plan.md` appears exactly once below, with a bucket and a reason. The
agent-closable ones are ranked by what a person would notice, not by the severity recorded at raise
time — severity in this plan has drifted, and the ranking says so where the two disagree.

## What this was measured against, and why it matters

**The world moved between the raising of most of these flags and this reading, and I read the world**
**rather than the flag bodies.** Both trunks landed today:

| | at the raise | at this reading |
|---|---|---|
| frontend `web-livewalk` | `e34977a` | `42a44de5` — 30 commits |
| backend `wt-lwtwo-api` | `8e2b57de8` | `118f92fb9` — 48 commits |
| `HasTrigger` in `ApplicationDbContext.cs` | 0 | **33** |
| journeys walked in a browser | 0 | 7 (`web-livewalk/artifacts/journeys/WALK-RECORD.md`) |

That is what produced 53 already-satisfied rows rather than the one the brief knew about. Every `C`
row below names the commit or the measured object that satisfies it. Where I could not measure a
claim myself I wrote **VERIFY** into the row rather than asserting it — two rows carry that, both of
them the shared-census derivation, and `F-CENSUS-IS-A-THREE-WAY` clears with its sibling.

**Three flags were measured live during this reading and are NOT stale, against appearances:**
`F-CONSUMER-MENU-EMPTY-WITHOUT-CATEGORY-IMAGES` (`CategoryModelBuilder.cs:49` still drops the
category), `F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED` (`catch (DbUpdateException)` still untyped at
two sites), and `F-MRG-FINALIZE-LAG` (the lag panel is still `v-if="isPowerUser"` at the frontend tip).
Each of the three sits beside work that DID land, which is exactly how a stale-looking flag hides a
live one.

## The trap, recorded so nobody re-picks it

**`F-AZURE-FUNCKEY` is sven-only and explicitly not work.** Sven ruled it on 2026-08-04 —
*"this is fine disregard"* — and the flag body itself says it is not blocking any lane and no lane
should spend time on it. It is in the sven-only bucket under *rotation (deferred by ruling)*, and it
should stay there rather than being re-picked because it reads as an urgent blocker.

Two other bodies carry rulings that invert what their titles say, and both are in the C bucket for it:
`F-TRIPLETEX-PROMISES-IDEMPOTENCE-IT-LACKS` was **retracted by its own author** (*"I raised this and
every part of it was wrong"*), and `F-EV-CALLBACK` says clearing it would be as wrong as leaving it,
because two of its three clauses are true **by design** under the ruling.

## The ranking — the twenty a person would notice first

Severity at raise time and consequence today have come apart, and this ranking is the consequence.
`F-CONSUMER-MENU-EMPTY-WITHOUT-CATEGORY-IMAGES` outranks every recorded blocker about migrations,
receipts and instruments, because it is the one where a paying guest opens the shop and sees nothing
while the admin screens show a complete menu.

1. **`F-CONSUMER-MENU-EMPTY-WITHOUT-CATEGORY-IMAGES`** — A guest opens the shop and sees nothing. Measured live at the backend trunk today.
2. **`F-NEGATIVE-SALE-REFUNDS-THE-LISTED-PRICE`** — Money leaves the till that never entered it. Fixed and pinned on a ref no branch reaches.
3. **`F-MIXIN-LABELS-CANNOT-TRANSLATE`** — The fiscal receipt reads Norwegian to a Swiss customer, and no translation can ever reach it.
4. **`F-RECEIPT-BLANK-PAYER-LINE`** — Six tenders print a blank where the payer belongs, one of them on a completed journalled sale.
5. **`F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM`** — A Norwegian fiscal receipt prints the programmer's word instead of the reader's.
6. **`F-CLOCKOUT-ANSWERS-OPEN`** — A worker is shown the opposite of what happened, and payroll, attendance and the personalliste follow.
7. **`F-XZ-CREDIT-UNSPEC`** — A § 2-8-2 obligation the product does not meet — zero code hits at the trunk today.
8. **`F-WF-NOCORRECTION`** — The statutory register an inspector reads cannot be corrected by anyone.
9. **`F-ORE-PADDING-IN-TWO-CLIENTS`** — Four øre prints as zero on a screen an operator reads — knowingly, in two shipping clients.
10. **`F-COERCION-MAKES-A-ZERO`** — "We did not measure" rendered as a measured zero, against a standing ruling to withhold.
11. **`F-MARGIN-SETUP-DAY-RECONCILES-TO-ZERO`** — The module lies on the one day a venue is most likely to look, and heals overnight.
12. **`F-SEND-KODE-BEFORE-HYDRATION-SENDS-NOTHING`** — Sign-in looks exactly like a dead backend. Walked today.
13. **`F-GROWTH-MODULE-LEVER-CANNOT-TURN-ON`** — An operator flips a switch, the board agrees, and the product stays dark with no signal.
14. **`F-MODULE-MASTERS-ARE-UNDECLARED-AND-INVISIBLE`** — A module ships dark with no setting saying so, and the flag board draws its rows anyway.
15. **`F-GR-NO-EXIT-FROM-A-LIST`** — Art. 7(3): as deployed a guest cannot leave a mailing list.
16. **`F-WF-ACKNOWLEDGE-SHOWS-NOTHING`** — A worker presses Bekreft and is shown nothing. Only a walk could have found it.
17. **`F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED`** — A 409 inviting an operator to retry something that can never succeed. Measured untyped today.
18. **`F-EV-ACCEPT-UNNAMED`** — The evidence row that answers "who agreed to this" can name nobody.
19. **`F-MEALS-REFUSAL-NAMES-THE-INVITEE`** — A refusal hands back the person it is protecting.
20. **`F-EXCHANGE-AWARD-BLOCKED-BY-A-STALE-ROW`** — She is refused a shift because of her own superseded self. Measured at the trunk today.

Two notes on the ranking itself. **The four flags mined by hand today all land in the top half** —
the øre padding, the unnamed acceptor, the worktree-bound test and the eleven branches re-adding the
credit-sale predicate — which is evidence the seam is real rather than evidence the picking was good.
And **five of the twenty are one landing away, not one build away**: the work exists on a branch or a
lane ref and nothing is scheduled to merge it.

---

## A · agent-closable — 197

The work is engineering. No ruling, no rotation, no threshold, no legal call. Where a flag needs a
scarce resource — the one migration-author slot, a SQL container, a browser — the row says so.

### Tier 1 — a person reads something false, on money or on a document somebody may have to produce — 48

- **`F-CLOCKOUT-ANSWERS-OPEN`** — A register bound to sessionState flips to "clocked in" at the moment a worker presses Stemple ut. They leave believing they clocked out and the register carries no end time — so payroll, attendance and the § 8-5-6 personalliste are all wrong the same way. The client half is closed; THE WIRE STILL ANSWERS THE LIE.
  <br>*a clock-out that closed nothing reports the worker as clocked in*
- **`F-COERCION-MAKES-A-ZERO`** — Three formatters turn "we did not measure" into a measured zero, against a standing ruling to withhold. The fix is `=== null` (never truthiness) and three worlds: present, genuinely zero, absent.
  <br>*three formatters turn "we did not measure" into a measured zero*
- **`F-CONSENT-SUMMARY-REASONS-NOT-IN-THE-ENUM`** — Settled by C1 rather than taste: the enum cannot move because the member name is the stored string in an append-only table, so the FIXTURE moves. Every journey against it printed two words to a Norwegian operator that the product can never print, rendered raw with no label map.
  <br>*a body the divergence check cannot see is wrong*
- **`F-CONSUMER-MENU-EMPTY-WITHOUT-CATEGORY-IMAGES`** — MEASURED TODAY at the backend trunk: CategoryModelBuilder.cs:49 still returns null for any category with no image whenever searchOptions is present, and the consumer web ALWAYS sends them. The shop renders an empty menu over a fully published catalogue — four categories, fifteen products, every one published — and NOTHING TELLS THE OPERATOR, because the admin pages show a complete menu. Gated behind D-CATEGORY-IMAGE-CLIENT-GATE and the landing order in F-CONSUMER-READS-CATEGORY-IMAGE-UNGUARDED.
  <br>*a category with no picture is dropped from the shop*
- **`F-CONSUMER-READS-CATEGORY-IMAGE-UNGUARDED`** — Two consumer surfaces dereference category.image.imageUrl unguarded and have never thrown ONLY because the backend guaranteed an image — by dropping every category that lacked one, which is the defect being fixed. Guards first, or both together, never the backend alone. A third surface renders a chip that becomes false after the change.
  <br>*two consumer surfaces throw the moment a category has none*
- **`F-EV-ACCEPT-UNNAMED`** — The server accepts a proposal from nobody: the evidence row that answers "who agreed to this" can be written with no name and no contact, and the receipt prints "not stated". The only thing enforcing it today is a form.
  <br>*the server accepts a proposal from nobody*
- **`F-EVENTS-VIPPS-REFUSAL-IS-UNTYPED`** — All the money rules held and only the client-facing error type is wrong: the page cannot key its toast on EVENTS_PAYMENT_PROVIDER for THE ONE RAIL THAT IS ACTUALLY WIRED, so the operator gets a raw 500 where the product was designed to show a refusal.
  <br>*the page cannot key its toast on the error it was built for*
- **`F-EXCHANGE-AWARD-BLOCKED-BY-A-STALE-ROW`** — MEASURED TODAY: RevalidateAwardAsync at the backend trunk still filters `State != Cancelled` with no lineage filter. She asks for the shift back and gets 200, and the award always 409s "the candidate already works an overlapping shift" — the overlapping shift being HER OWN ROW IN THE SUPERSEDED REVISION. Deliberately left out of the lineage sweep because it changes award admission semantics and deserves its own red-first proof.
  <br>*she is refused a shift because of her own superseded self*
- **`F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM`** — MEASURED TODAY: EscPosReceiptBuilder has no CompanyAccount arm at the backend trunk and its default returns the enum name, so a company credit sale prints the raw English `CompanyAccount` on a Norwegian fiscal receipt. On the journal-backed document, not the emailed PDF.
  <br>*a Norwegian fiscal receipt prints the code's own word for it*
- **`F-FLAG-PAGE-PROMISED-ONE-BEHAVIOUR-FOR-SIX`** — The switchboard an operator reaches for DURING AN INCIDENT promised one behaviour for six modules and is false for at least one — Events darks its reads. Four modules were never checked; reading four gates and writing four true rows is engineering.
  <br>*a switchboard described six gates as if they agreed*
- **`F-FRONTEND-ENUM-MIRROR-SHORT-A-MEMBER`** — One defect out of 40 declarations censused: `PaymentType` omits `CompanyAccount` and core/pinia/checkout.ts resolves the label through an EQUALITY LADDER, so a company-account tender falls through every branch. A ladder with a missing arm and one with a wrong arm are indistinguishable on every input either handles — a green suite is not weak evidence here, it is no evidence at all.
  <br>*a copy of a backend enum that is missing one*
- **`F-GR-DISPATCH-UNATTRIBUTED`** — MEASURED TODAY: no actor column reaches GrowthDispatchService at the backend trunk. C4 on the path that mails the whole audience; the only name reachable today is the approver's.
  <br>*a mass send has no attributable trigger*
- **`F-GR-HEALTH-DEAF`** — Ruled withhold-rather-than-zero; delivered, step two owed. An operator is told bounce rate 0.0 and complaint rate 0.0 as fact, on a pipeline that cannot hear.
  <br>*the delivery health endpoint reports perfect health on a deaf pipeline*
- **`F-GR-NO-EXIT-FROM-A-LIST`** — ART. 7(3): as deployed a guest cannot leave a mailing list. Half (a) — zero product-code references to the unsubscribe page — is engineering, and the remedy was committed 37 hours before the lane that chased it. Half (b) is the deploy question under F-PROD-CORS-WILDCARD.
  <br>*as deployed a guest cannot leave a mailing list*
- **`F-GROWTH-MODULE-LEVER-CANNOT-TURN-ON`** — An operator flips the switch, the board says on, and the surface stays dark — with NO SIGNAL that anything is wrong. Growth registers no effective resolver; Margin is the working precedent the interface documentation names, and it coalesces rather than ANDs.
  <br>*an operator flips the switch, the board says on, the surface stays dark*
- **`F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED`** — MEASURED TODAY: `catch (DbUpdateException)` is still untyped at GrowthConsentTextService.cs:247 and GrowthDispatchService.cs:311 on the backend trunk. A 409 telling an operator another version was published concurrently, inviting a retry that can never succeed — and the defect OUTLIVES the missing table it was found beside.
  <br>*a 409 telling an operator to retry something that can never succeed*
- **`F-KRAVIA-MESSAGE-NULLED-BY-EVERY-DINTERO-SAVE`** — The destructive half is closed and the field STILL HAS NO INPUT on the page, so a venue cannot set or correct its Kravia invoice message from anywhere. Third instance of one shape in one page, and the only one found by enumerating what the form posts against what the endpoint accepts.
  <br>*a third field, wiped since before anyone looked*
- **`F-MARGIN-CSV-TIMESTAMP-IS-TWO-HOURS-EARLY`** — The CSV writes calculationTimestampUtc two hours early — Oslo wall-clock converted to UTC a second time — while the JSON is correct, so the two artifacts for one statement disagree. On a bokføring-adjacent export where a timestamp is part of what the document asserts.
  <br>*the export converts Oslo time to UTC twice*
- **`F-MARGIN-SETUP-DAY-RECONCILES-TO-ZERO`** — A venue that switches Margin on and trades the same day sees theoretical 0,0 % beside a real actual — the module's own anti-pattern, produced by the module. Recipe versions CANNOT be backdated over HTTP at all, and the operator's own screen cannot perform the repair. IT CORRECTS ITSELF THE NEXT DAY, which is what makes it dangerous. The fix is named at two files.
  <br>*effective dates are compared against midnight, not the sale*
- **`F-MEALS-BOARD-SAYS-OFF-OVER-A-LIVE-MODULE`** — Growth's defect run backwards: the board reports Meals off over a module that is serving. The resolver is the fix and Margin is the named precedent. It becomes real the moment anyone stands up the first live Meals world.
  <br>*Growth's defect, run backwards*
- **`F-MEALS-LEVER-OPAQUE`** — The operator surface reports the module effective while 25 of 29 routes stay dark and refuse with a deliberately opaque 404. The flag's own review says treat as blocker at pilot. The cheap fix is having the surface read the real gate and render "disabled at deployment".
  <br>*the operator lever reports enabled while 25 of 29 routes stay dark*
- **`F-MEALS-REFUSAL-NAMES-THE-INVITEE`** — A refusal body hands back "intendedContact" — the email of the person whose invitation is being refused — to whoever asked. Proved over HTTP. The walk stays green because it reads rendered page text and the leak lives where no Vue renders.
  <br>*a refusal can hand back the person it is protecting*
- **`F-MIXIN-LABELS-CANNOT-TRANSLATE`** — Three receipt labels are switch statements returning hardcoded Norwegian with no dictionary lookup AT ALL — not a missing key, not a fallback. Three of six values on the SWISS receipt read Ukjent, Hent selv and Forespurt, on a document the product prints as a fiscal artifact.
  <br>*three receipt labels no translation can reach in any language*
- **`F-MODULE-MASTERS-ARE-UNDECLARED-AND-INVISIBLE`** — Events' master key is declared in NEITHER settings file, so it defaults false and a controller-wide filter 404s every route before any action body runs. The board and the switch agree with each other and disagree with the product.
  <br>*a module ships dark with no setting saying so*
- **`F-MRG-FINALIZE-LAG`** — MEASURED TODAY at the frontend tip: the lag panel is still `v-if="isPowerUser"`, so the person freezing the week still cannot see what they are freezing. Clause one is on the trunk; clause two is not. The venue was always entitled to the number and the surface withheld it.
  <br>*a statement can be frozen while the projector is behind*
- **`F-MRG-INGREDIENT-FACTOR-ZERO`** — A withheld conversion factor prints as "1 pack = 0 grams". The reader cannot tell an unmeasured factor from a measured zero, and the confident form is the more misleading of the two.
  <br>*a withheld conversion factor renders as a confident zero*
- **`F-MRG-STATEMENT-UNATTRIBUTED`** — C4 on the artifact an accountant books from: the statement and its spend entries carry no actor column and the controller resolves no user on any action. Ruled resolve-and-record-the-actor.
  <br>*the weekly figure an accountant books from names nobody*
- **`F-NATIVE-ADMIN-CARRIES-THE-SAME-ORE-FLOOR`** — The third admin client, unfixed: the same invisible-øre display and the same cannot-remove-an-øre-component behaviour. The backend has exactly one writer with no rounding and no validation, so the value arrives by hand and the honest fix is a field that shows what the column holds.
  <br>*a second admin client, unfixed*
- **`F-NEGATIVE-SALE-REFUNDS-THE-LISTED-PRICE`** — AN UNSTATED DISCOUNT HANDS THE CUSTOMER BACK MONEY THE SHOP NEVER TOOK. Fixed and pinned on refs/lanes/L-CHECK-DISCOUNT-SUM-COUPLED @ c8f26d5 and on NO shared branch. The highest-consequence unlanded money fix in the set.
  <br>*an unstated discount handed the customer money the shop never took*
- **`F-NEWSLETTER-DISPATCH-DEAD-ON-CHAIN`** — HALF SATISFIED and half open. MIG-29 landed, so dispatch no longer fails on a chain-built database. The REPORTING conjunct is still open, measured today at GrowthDispatchService.cs:311 — and landing the table alone makes the misreporting invisible again and it will mask the next absent table exactly the same way.
  <br>*dispatch fails on every chain-built database and calls it a race*
- **`F-NORWEGIAN-ONLY-KEYS-RENDER-NORWEGIAN-TO-EVERYONE`** — no.ts holds 35 more keys than en.ts and de.ts on the branch, TWENTY OF THEM VAT-FACING including one warning that a rate change re-prices future sales. An English or German operator reads Norwegian at those points.
  <br>*the baseline already degrades silently*
- **`F-OFFER-MIXED-CANNOT-SAY-NOT-APPLICABLE`** — A monthly total reads unknown where it should read nothing, and both readings are wrong in different directions. The two upstream fixes are both named and both engineering: write an explicit 0, or send the catalogue flags alongside the line.
  <br>*a monthly total reads unknown where it should read nothing*
- **`F-ORE-PADDING-IN-TWO-CLIENTS`** — FOUR ØRE PRINTS AS ZERO on a screen an operator reads, knowingly left in two shipping clients. One of them additionally carries hand-written duplicates of the formatter, so bumping the shared pin alone would not fix its own copy.
  <br>*an operator screen can print four ore as zero*
- **`F-PERSONALLISTE-PRINT`** — The § 8-5-6 sheet an inspector is handed has an inert print path — a body class vue-meta wipes, measured twice. Ruled adopt-scoped-css; delivered, step two owed.
  <br>*the statutory sheet's print stylesheet is inert, measured*
- **`F-RECEIPT-BLANK-PAYER-LINE`** — SIX payment types print a blank payer line, and the sixth is the sharpest: a 100%-comped order settles with no tender and stays NotSet, so that is a completed, journalled sale whose receipt line is blank permanently. The same physical card sale prints "Betalt med kort" on a Surfboard terminal and NOTHING on a Dintero one. Located at Services/ReceiptService.cs:152.
  <br>*a fiscal document with an empty line where the payer belongs*
- **`F-REWARDS-STATS-DIVIDES-BY-ZERO`** — The panel 500s when the non-member order count is zero, and NO AMOUNT OF SEEDING REPAIRS IT — that is the ordinary state of a venue whose first loyalty member is its first regular.
  <br>*the panel 500s and no data can fix it*
- **`F-SEND-KODE-BEFORE-HYDRATION-SENDS-NOTHING`** — WALKED TODAY: clicking Send kode against a half-hydrated modal binds no handler, sends no request and renders no OTP boxes — INDISTINGUISHABLE FROM A DEAD BACKEND. Same neighbourhood as the recorded defect where LoginModal.getCode sets smsSent = true in a .then that never inspects the result, so the modal cannot report a send that did not happen.
  <br>*clicking Send kode before hydration sends nothing and renders no OTP boxes, looking exactly like a dead backend*
- **`F-SV-NUMBER-PASSES-THE-FODSELSNUMMER-GUARD`** — The guard refuses a fødselsnummer SPECIFICALLY, so a twelve-character German Sozialversicherungsnummer passes and lands on append-only statement lines. C1 forbids the repair that situation would call for. The lane's exit was REFUSE and the refusal is the fix — land it.
  <br>*the German label named the one value the server does not refuse*
- **`F-TRANSLATION-STALE-BUT-PRESENT`** — Exactly one key out of 4,782 — `posset_goods_hint` — carries Norwegian meaning the others lack, so an English operator is NEVER TOLD that goods groups set the tax. Plus a German receipt printing `USt-IdNr.` over a Norwegian organisasjonsnummer. The `wfpl_business_mixed` bokføringsplikt asymmetry is the one residual that needs a person.
  <br>*a key in all three locales saying three different things*
- **`F-WF-ACKNOWLEDGE-SHOWS-NOTHING`** — A worker presses Bekreft and is shown NOTHING. The receipt renderer needs an item both unread and acknowledged, and no such item can exist. No component test could have caught it; the finding lane asserted the defect in its journey so the fix will red the walk — invert, do not delete.
  <br>*a worker confirms a published week and sees no receipt*
- **`F-WF-BLIND-BIND`** — Ruled name-the-person-and-allow-correction. One mis-mapped login at a pilot venue is unfixable wrong pay attribution and no endpoint can undo it.
  <br>*a login-carrying operator is bound to a person nobody saw*
- **`F-WF-CATEGORY`** — The personalliste sheet has columns for three statutory categories the product cannot record — one production site hardcodes Employee. Either they become recordable or they leave the sheet. C6 shape.
  <br>*three of the four statutory personalliste categories cannot be produced*
- **`F-WF-CLOCK-LIES`** — A punch that recorded nothing answers as a success. The register surface refuses to print an outcome it cannot know; the next client to read sessionState will not.
  <br>*a punch that recorded nothing answers as a success*
- **`F-WF-NOCORRECTION`** — Ruled build-the-correction-path. § 8-5-6 requires who corrected and when; both entry writes pass a null correction actor and the controller has no write action.
  <br>*a personalliste entry cannot be corrected by anyone*
- **`F-WF-NODEPARTURE`** — A worker who forgets to clock out leaves a row nobody can fix, on the document an inspector reads. A correction is a counter-entry, not an edit, and there is no way to make one.
  <br>*a missing departure can never be corrected*
- **`F-WF-PUSH-SILENT`** — A worker who was never told is recorded as notified, on the record that answers "what did each worker see, and when" in a dispute — turning that record into evidence AGAINST the venue. Note the ruling line on this flag is not its ruling: it clears on an OUTCOME, not on an actor.
  <br>*a worker who was never told is recorded as notified*
- **`F-WF-WORKER-CANNOT-SEE-HER-OWN-REQUESTS`** — A worker submits availability and time-off and after a reload sees NEITHER — the read answers 405 and the store-scoped one is 403 for her. The frontend already says so in its own source: a submission is visible for as long as the page is open and no longer.
  <br>*submitted and then invisible on reload*
- **`F-XZ-CREDIT-UNSPEC`** — MEASURED TODAY: `CreditSalesAmount` and `CreditSalesCount` have ZERO hits on the backend trunk. § 2-8-2 requires the count and amount of utleveringskvitteringar and a specified count and amount of kredittsal, and the delivery-receipt lane made both obligations live.
  <br>*creating credit sales made two X/Z obligations live and unbuilt*

### Tier 2 — a capability a person needs does not exist, or nothing can reach it (C3) — 25

- **`F-ADMINPAGE-IGNORES-ITS-RELOAD`** — 47 admin pages share the shell and 45 still discard the answer to a session reload they asked for. The symptom is handled by the duplicate-modal close; the cause is not.
  <br>*the shared admin shell discards the answer it asked for*
- **`F-CONFIRM-BRUTEFORCE`** — The rate limiter must cover the GUESS entry point, not only the address write. If it covers only the send route the § 15 claim does not hold.
  <br>*the proof the § 15 guard rests on can be guessed*
- **`F-CORE-ADMIN-DEAD-SURFACES`** — Three reachability gaps in one survey: Refund has ZERO callers in pages or components — refunds exist nowhere in the order history a venue would actually look at; /admin/dinehome is an orphan with zero links repo-wide; and the order export is a dead end above 20 pages, so the largest result sets cannot be exported at all.
  <br>*refunds, a report and an export that cannot be reached*
- **`F-EVENTS-SPACE-CANNOT-BE-ATTACHED`** — spaceId is settable only on the manual-create request, and there is no event-update route at all — so the spaces settings screen is write-only decoration for every event that arrives the way real events arrive. Ten seeded events, ten run sheets, every one reading "No space assigned."
  <br>*every run sheet says "no space assigned"*
- **`F-GR-PROVIDER-ACCOUNT-UNGATED`** — Delivered. Step two is owed — and note F-GR-PROVIDER-GATE-PIN-VACUOUS: the pin that caught it goes green again if the actor line is removed alongside the gate.
  <br>*a store-addressable route with no store gate*
- **`F-GR-UNCONFIRMED-EMAIL`** — L-CONFIRM-FAMILY-MERGE delivered. Step two is owed: prove the green discriminates by mutating the suite both ways, the way the callback lane did.
  <br>*the § 15 guard binds to an address the caller can choose*
- **`F-ISPOWERUSER-IS-A-COLUMN-NOTHING-WRITES`** — MEASURED TODAY: the only `IsPowerUser =` on the backend trunk is a response-model field, not a column write. Two pages hard-redirect for a user whose JWT genuinely carries the role. AND A HAND-WRITTEN ROW IS STANDING IN THE OWNER'S DATABASE — the revert statement is recorded and is the owner's to run.
  <br>*two pages gate on a flag the product cannot set*
- **`F-JOURNAL-FINALIZE-INDEX-DROPPED`** — An index nobody chose to drop is missing from EVERY deployed database — produced by a one-word omission upstream whose migration diff reads as routine. Needs a migration slot.
  <br>*an index nobody chose to drop is missing from every deployed database*
- **`F-MARGIN-MODEL-DRIFTS-FROM-ITS-CHAIN`** — C2-shaped drift found by a lane whose own diff cannot contain it. Needs a SQL slot to confirm against the base — and the stack landing plus the trigger-declaration work may already have moved it, which is one measurement away.
  <br>*a lineage test reds on drift nobody's diff contains*
- **`F-MEALS-ENROLMENT-HAS-NO-CALLER`** — C3 exactly: the write the whole module depends on has no page, no button and no client binding, and MealsQuoteService hard-requires membership — so the funded checkout's COMPANY TAB SILENTLY NEVER APPEARS. Not an error, not a refusal. 30 built-unverified lanes sit behind it.
  <br>*the write the whole module depends on is bound by nothing*
- **`F-MEMCACHE-IN-TRYCATCH`** — The registration was moved out of the conditional. What is owed is a test that reds if it moves back — this is exactly the shape a well-meaning tidy reintroduces.
  <br>*an unrelated config failure would delete every rate limiter*
- **`F-MIG17-WIDTH-HALF-THE-SPEC`** — nvarchar(64) where both ledger copies specify 128, on a company-supplied value immutable after claim — so a longer reference is truncated and UNREPAIRABLE, and C1 forbids the repair. Widen it before any pilot data exists; the ruling arm is the alternative, not the default.
  <br>*a column built at 64 where the spec says 128, on a value that cannot be repaired*
- **`F-MRG-ONBOARD-16`** — D-MRG-CURATION-CONTENT is already ruled fill-the-csv. Sixteen starter items against roughly a hundred and fifty specified, in the module whose own spec names onboarding as its kill risk.
  <br>*a venue types its own ingredient library*
- **`F-MRG-YIELD-NOWHERE`** — A default yield on the ingredient (a migration) plus a recipe-line control that pre-fills from it. Worth knowing before 150 rows are authored by hand.
  <br>*a curated yield has nowhere to land and would cost nothing*
- **`F-POS-CLOCK-NO-CLIENT`** — The till screen exists at L-WF-PUNCH-UI, unmerged — a Stempling mode inside the POS shell, which is the only place holding a device JWT plus an operator session. A merge plus one live re-capture, not a build. Complicated by F-CLOCKSCREEN-FOUR-BRANCHES-NO-KEYS.
  <br>*the whole POS clock surface has no client anywhere*
- **`F-RUNBOOK-CANNOT-START-A-COLD-MACHINE`** — The commands to create the SQL and Redis containers exist NOWHERE in either repository, and everything downstream assumes they are up. Plus a stale checkout name and a stale claim about Features:Meals that matters because the flag-board divergence turns on that key.
  <br>*the documented path assumes containers nobody documents*
- **`F-SIGN-IN-IGNORES-THE-REDIRECT-ITS-OWN-GUARD-WROTE`** — WALKED TODAY and reproduced on every run: the route guard sends an unauthenticated manager to /admin?redirect=%2Fadmin%2Foverview and after the code is accepted the app lands on /admin?storeId=1, never honouring the redirect it wrote. Cosmetic for a walk, a papercut for an operator who bookmarked a page.
  <br>*after sign-in the app lands on the dashboard and never honours the redirect its route guard put on the URL*
- **`F-TRAIN-DISCLOSURE-UNREADABLE`** — C3 in its purest form: a client method, two call sites — one of them the worker's OWN page — a documented route number, and no handler behind any of it. An access log nobody can read is a control that exists for the operator and not for the person it is about.
  <br>*the access ledger is written and nobody can read it*
- **`F-TRAIN-NO-EVIDENCE`** — Restated: the route landed, and the live gap is the inverse — a CALLER gap. The pack is served and nothing in the product calls it.
  <br>*the inspector evidence pack has a full test suite and no endpoint*
- **`F-TWO-FINALIZE-CONTROLS`** — One surface owns the irreversible freeze. The surface that names its blocker is already built; the other must yield or argue.
  <br>*two surfaces bind one irreversible freeze*
- **`F-WF-ACK-DUP`** — Confirmed at the SQL tier: two acknowledgements, two permanent receipts, on the record that answers who saw a schedule in a dispute. Needs the filtered unique index and a migration slot; the MIG number is F-MIG22-CLAIMED-TWICE's problem.
  <br>*two acknowledgements of one schedule both stick, and neither can be removed*
- **`F-WF-CLOCK-UNLINKED`** — L-WF-OPLINK delivered. Step two is owed plus a journey capture; the four-weeks-of-POS-clocking market gate cannot start until it clears.
  <br>*a POS operator cannot become a clockable person*
- **`F-WF-EXCHANGE-STALE-GRID`** — An award-to-published-awardee capture under artifacts/journeys/. A walk, not a build.
  <br>*an awarded swap leaves the old person on the published grid*
- **`F-WF-NO-INVITE`** — Ruled build-the-invite-surface and the pair landed on the frontend trunk (cec420a). What is owed is the browser journey — which is gated behind F-LIVE-WORLD-ONE-HUMAN, a Sven act.
  <br>*no worker can enter Workforce through any shipped surface*
- **`F-WF-TWO-ADMINS-TWO-ENGAGEMENTS`** — A database constraint that refuses the second first engagement. Needs the one migration-author slot; no ruling.
  <br>*two administrators can each open Workforce for one store*

### Tier 3 — it bites at a landing: work lost, or a closed defect silently re-added — 33

- **`F-BY-SIDE-CONFLICT-RESOLUTION-HAS-NOW-COST-FOUR-TIMES`** — Name `git merge-file` or an equivalent hunk-level resolution in every landing brief for any file with content on both sides. Four losses on record.
  <br>*resolving a conflict by side has silently destroyed content four times in this estate*
- **`F-CLOCKSCREEN-FOUR-BRANCHES-NO-KEYS`** — Measured FALSE for the missing keys — all 47 and all 25-26 are defined on the same ref as the component that uses them, on all six refs carrying the screen. What survives is the overwrite hazard: the working pair is untracked, so a merge or a `git clean` takes it and nothing conflicts.
  <br>*four branches carry a till screen whose translation keys exist nowhere*
- **`F-CORE-DISCOVERY-PREFERS-THE-SHARED-CHECKOUT`** — Core discovery prefers the calling worktree's own copy. Deliberately deferred to a quiet window because it touches every lane at once — it is the one of its family that would corrupt a BUILD rather than a measurement.
  <br>*a lane editing core can be served somebody else's copy*
- **`F-CORS-EXPOSURE-REVERT`** — Use BrowserReadableHeaders.All on the default policy inside AddOkamCors. The named guest policy is a separate, small choice.
  <br>*landing the CORS lane silently narrows the download headers*
- **`F-DOCSYNC-WROTE-A-STALE-TRUTH`** — Reconcile the two lanes' edits to utils/meals/admin-client.js in one merge; the conflict is the good outcome.
  <br>*a doc lane recorded a gap that a live sibling was closing*
- **`F-EV-GUESTLINK-FORK`** — Already ruled by the closing lane on measurement: land 9e3a607b not fc09be1d, the helper survives and keeps `throw`, and the sweep-exemption union already exists byte-identical on lane/ev-vipps-fallback. Lift it; do not re-derive it.
  <br>*two composers for one guest address, and git cannot see it*
- **`F-EVENTS-ACCEPTOR-CODE-IS-A-PINNED-PUBLIC-CONTRACT`** — Either Core's events-service.ts carries EVENTS_ACCEPTOR_REQUIRED or the registry records that clients need not pin it. A new problem code entered a registry Core clients pin with no downstream owner; both arms are authorable.
  <br>*a new problem code entered a registry Core clients pin, with no downstream owner*
- **`F-EVENTS-OUTBOX-FOURTH-ANSWER`** — Measure equivalence and record superseded-or-lost, the way the flags-effective-resolvers pair was ruled by blob identity. It also touches an outbox test file another lane rewrote, so it is a second collision axis.
  <br>*a month-old unmerged lane answers the guest-origin question again*
- **`F-EXCHANGE-GATE-MERGE`** — The resolution is named: keep BOTH gates, Exchange first, one merged comment block. Whichever of the two lanes lands second applies it.
  <br>*two lanes add a different flag gate to the same award, at the same anchor*
- **`F-FINISHED-WORK-ON-NO-REF`** — Preserved at 054e140 — 30 paths, three loss classes, transitive require closure resolved against the snapshot tree itself (20 modules, 0 missing). Preservation is not landing: the delivery-failures feature, the money-path clock guard and a five-arm-proven backend fix still need branches.
  <br>*a whole feature, a money-path guard and a proven backend fix, none of them on a ref*
- **`F-FLAGS-FALSE-GUARANTEE`** — Land lane/flags-resolvers-cover-three @ 0f29a898. The two superseded branches were ruled equivalent by blob identity on review 2026-08-06.
  <br>*the switchboard promises a reliability it does not have for Meals*
- **`F-INVOICE-PRICELABEL-STILL-SHADOWS`** — Settled by a third reader: the correct change is a RENAME, not a removal — deleting the local method would restyle every invoice figure. Already assigned to the lane that owns the file and whose pin must flip with it.
  <br>*a page satisfies the money rule while standing off the seam*
- **`F-LAND-OUTBOX-FLAKE-NOT-GUID`** — The pick is ruled on evidence (the digit inventory catches `2 000,00`). Land one, cherry-pick the rival's additive cases.
  <br>*of the two rival fixes, one catches a leak the other misses*
- **`F-LANE-COMMITS-CARRY-SIBLING-HUNKS`** — Take paths, not files. A file-level merge of two branches cut from the shared checkout either duplicates a sibling's change or silently drops it, and it is the CLEAN merge that does the damage.
  <br>*a lane branch is a snapshot, not a merge candidate*
- **`F-MEALS-ACTOR-WORKLIST-STALE`** — Amend the worklist to four sites. The actor KIND for an ordering member is F-MEALS-FUNDING-AUTHORITY-COLLISION's ruling, not this flag's.
  <br>*the blocked fix would land three sites of four*
- **`F-MEALS-CORS-DOUBLE-LAND`** — Land the helper version, drop the inline one, and drop the wire test deliberately written to red until the lever fork was ruled — the fork is ruled now.
  <br>*two commits make the same fix in different places*
- **`F-MEALS-EIGHTH-READ`** — MEASURED TODAY: pin 9fe599c6 is NOT an ancestor of the backend trunk. With the pre-pin fixture and an identical clamp the suite is green on nine and the defect is invisible.
  <br>*the fix for seven degenerate reads introduced an eighth*
- **`F-MEALS-SUPERSEDE-BYPASSES-AUTHORITY`** — The supersede release never calls the funding authority, so on merge the attribution lands three of four and the fourth stays unaudited WHILE LOOKING COVERED. No compile collision; git catches the harmless half.
  <br>*one release site is not the authority the attribution guards*
- **`F-MERGE-BREAKS-BUILD`** — Merge-brief rule: build the merge commit before running any tier, never `--no-build`. No ruling needed.
  <br>*a clean merge of two green lanes did not compile*
- **`F-MIG22-CLAIMED-TWICE`** — The census exists (5 collisions, not 1; MIG-21 is the only case where two real migration files claim one number, and the second Up() fails hard). The stack landing resolves part of it — re-derive from the branches and record where both authors read.
  <br>*one migration number, two lanes, neither able to see the other*
- **`F-NPM-INSTALL-CANNOT-SUCCEED`** — `npm install` and `npm ci` fail repository-wide on an unresolvable edge-channel dependency. A fresh clone is unbuildable, and the estate has been running on one surviving node_modules without knowing it.
  <br>*the dependency install is broken for every worktree at once*
- **`F-OUTBOX-FLAKE-FIXED-TWICE`** — Land lane/ev-outbox-flake, retire the twin. The pick is already ruled on evidence by F-LAND-OUTBOX-FLAKE-NOT-GUID.
  <br>*one defect, two fixes, two branches; landing both collides*
- **`F-OWNERS-CHECKOUT-HOLDS-UNOWNED-WORK`** — Six files modified in the owner's working tree only, with HEAD carrying none of them and the lane that made them gone. It has ALREADY produced two contradictory measurements of the same subject, and both were right about the tree they read.
  <br>*a fix exists only in a working tree and a checkout would erase it*
- **`F-POS-TENDER-WIRE-REINTRODUCES-TWO`** — Eleven pre-fork heads sharing merge-base 2431883d silently re-add the private credit-sale predicate under a PLAIN merge, auto-merged and outside any marker, at line 199 unshown. C4: the predicate gates the operator-stamped UTLEVREC row for § 2-8-7, and the private copy lacks the null guard.
  <br>*eleven pre-fork heads silently re-add the credit-sale predicate*
- **`F-REGISTRABLE-DOMAIN-TWICE`** — One registrable-domain helper, both origin checks read it. Merge order is already named in the return.
  <br>*two lanes, one answer to "are these the same site"*
- **`F-ROLLBACK-LEAVES-TRACKED-STATE`** — One site is fixed by staging the audit row before the mutation. The CLASS has no sweep: anywhere a guard throws after touching a tracked entity, the transaction is honest and the in-memory graph is not.
  <br>*a rolled-back transaction leaves the mutation in memory*
- **`F-SHARED-CHECKOUT-DIRT-IS-UNRECORDED-WORK`** — 133 in-scope paths, 66 dirty in more than one lane's interest, and the three translation files claimed by 46 lanes with 43 rival variants. Each needs attributing, superseding or discarding.
  <br>*270 dirty files, some of them earlier drafts of landed work*
- **`F-SHARED-REF-CLOBBER`** — Put `git update-ref <ref> <new> <old>` in every merge brief. The primitive that turns a silent clobber into a refusal is already known.
  <br>*two landers moved the integration ref and one merge was discarded*
- **`F-SHIPPED-BRANCH-IS-NOT-WHAT-THE-CHECKOUT-SHOWS`** — The second wave landed — 30 frontend and 48 backend commits — which is exactly the remedy this flag asks for. What is owed is a re-measure of the residue, because nothing in the repository tells a reader which capabilities are shipped and which are uncommitted lane work.
  <br>*the tree carries ~370 uncommitted paths of lane work*
- **`F-THE-CONFLICT-IS-A-DECOY`** — A landing lane's review checks the AUTO-MERGED files, not only the conflicted ones. Proven: the naive resolution reds 13 of 42 wire assertions and would silently make every download filename `download`.
  <br>*the damaging half of a merge is the half that merges cleanly*
- **`F-TRANSLATION-MERGE-DUPLICATES-A-KEY-SILENTLY`** — Nine of 87 simulated merges leave a key twice with no conflict, and JavaScript takes the later entry. TWO ARE MONEY KEYS whose variants say opposite things — was not frozen versus is a floor short by an unknown amount — and they resolve in OPPOSITE directions, so no rule of thumb exists.
  <br>*nine merges that leave the same key twice, and two of them are money*
- **`F-TWO-BACKEND-COMMITS-LEFT-OFF-THE-TRUNK-BY-NAME`** — Raised today and NOT stale. Triage 34c6c1031 (meals expiry pins) and e956337ed file by file — the latter carries a settings hook config and a stale WORLD.json, so it must not be taken whole. The landing NAMED them rather than dropping them quietly, which is why this is cheap.
  <br>*the backend landing deliberately omitted two commits and named them rather than dropping them quietly*
- **`F-XZ-CREDIT-DOUBLE-LAND`** — Retire lane/meals-xz-credit or rebase it onto the credit work that landed after it. Branch hygiene with a named hazard.
  <br>*an older credit lane would reintroduce the predicate collision*

### Tier 4 — the instrument lies: a green that means nothing, or evidence that cannot be trusted — 60

- **`F-401-UNREACHABLE-OVER-HTTP`** — Either the refusal is reachable over HTTP at both money doors, or the plan records that authentication forecloses it and the controller tier is the standard. Recording is the clerk's act.
  <br>*an unattributed-actor refusal cannot be reached by any real request*
- **`F-A-RERUN-TAKES-THE-CANONICAL-SLOT`** — Same-lineage returns true before rank is consulted, and the record is written with status "running" BEFORE the browser opens — so a crashed run replaces the estate's evidence with a stub. The obvious remedy is unsafe: it repoints committed JSON at ignored files and none of it shows in a diff.
  <br>*the record of a walk is overwritten by the next walk*
- **`F-A-SUITE-RUN-REWRITES-COMMITTED-ARTIFACTS`** — A wire test rewrites two committed artifacts on every run, so the act of measuring alters the artifact the measurement is about. Deliberate regeneration is fine; incidental regeneration is a leak.
  <br>*running the tests changes the evidence*
- **`F-A-VERIFIED-LANE-RESTS-ON-A-FAILED-RUN`** — One of the two failed captures resolved as a false red — re-run unchanged at the same commit, 17 of 17. ONE remains, on the training walk, and it also blocks its module's exit. A false green is worse than a red because every priority was priced against it.
  <br>*one row on the board is false, and it was found by census*
- **`F-ARTIFACT-STORE-OVERWRITES`** — Displacement ranking and preservation are closed. Clause (b) remains: nineteen fixture artifacts need one re-run each and two live ones need a live world — and a live world now exists.
  <br>*the canonical journey artifacts are the wrong runs, right now*
- **`F-ARTIFACTS-FROM-A-HARNESS-THE-BRANCH-LACKS`** — 19 of 65 committed receipts carry a field the tree holding them cannot name, across two families two days apart. Five were fixed by accident when the composition landed the producing commit; ten have not been reached.
  <br>*nineteen receipts the tree holding them cannot have produced*
- **`F-ASSERT-NOT-PROD-IS-UNWIRED`** — Raised today and NOT stale. A guard script that would refuse a production target is invoked by nothing. Wire it before a migration or a deploy, or delete it and record the reason — the estate's own catalogue calls this the enabled-and-wired-into-nothing shape.
  <br>*a guard script that would refuse a production target is not wired to anything*
- **`F-BACKEND-CHECKOUT-IS-A-LANE-BRANCH`** — A brief naming a working tree names the branch and commit it was verified at, and a lane confirms HEAD before taking a baseline from a tree it does not own.
  <br>*the shared backend tree is not on the branch people assume*
- **`F-BACKEND-FACTS-OFF-BRANCH`** — Same family as F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH. The pins landed; the two journey facts are still journey-kind probes reading a hand-written manifest and both exits are conjunctions the fact only half-measures.
  <br>*the only two admissible facts read a checkout four commits behind*
- **`F-BARE-PATHSPEC-PROVES-A-FALSE-ZERO`** — Three named corrections in lanes/L-BARE-PATHSPEC-SWEEP/pathspecs.md. The corpus is sounder than feared — 7 of 8 executable searches are sound — and the one defect published a two-file check as a whole-repository claim.
  <br>*one bad search in the corpus, and it published a two-file check as a whole-repository claim*
- **`F-BE-TESTS-AMBIGUOUS`** — The probe must resolve to exactly one receipt and that receipt must name the branch tip. The plan's own instrument carrying the defect the plan exists to catch.
  <br>*the backend suite fact can report a number belonging to no commit*
- **`F-BOTH-PROBES-GATING-THE-PREF-FLAG-ARE-MISAIMED`** — A flawless deploy would leave the flag exactly as open as today. Repoint the first probe now; the second cannot be repointed until the cookie-mode retirement is ruled, which is genuinely half blocked and worth saying so.
  <br>*a flag that would stay open after a perfect deploy*
- **`F-BRIEF-QUOTES-UNMERGED-STATE`** — Every brief names the commit a quote was read at. Five instances, all the clerk's; the clerk is an agent.
  <br>*the clerk has twice described an unmerged branch as if it were the tip*
- **`F-CLERK-EXITS-NAME-NO-INSTRUMENT`** — Forward-only: every exit authored from here names a fact key or a repo path. No exit is rewritten backwards.
  <br>*the clerk is still authoring unverifiable lanes*
- **`F-COMMIT-CITES-WHAT-IT-LACKS`** — Forward-only and cheap: commit the baseline before correcting it, commit the script beside the figure, and where a path is genuinely gitignored say so in the return.
  <br>*evidence named in a commit that the branch does not carry*
- **`F-COMMIT-TREE-LEAVES-NO-REF`** — Measured end to end over 1987 citations: 524 of 527 commit ids sit on a ref and exactly one is dangling, with its work not lost. Repoint that one citation and put the ref update into the recipe as its required second step.
  <br>*lanes are building commits that no ref reaches*
- **`F-CROSS-REPO-EVIDENCE-UNVERIFIABLE`** — Forward-only: a backend lane's exit names its evidence relative to the plan root, the way the backend probes already do. The clerk-resolves arm is the tool's.
  <br>*a backend lane's evidence cannot satisfy its own exit*
- **`F-DEAD-WORLD-ANSWERS-HEALTHY`** — A health endpoint that reports healthy without touching its database answers a question nobody asked it. This defeats the very check that was supposed to catch the stale-fixture trap.
  <br>*a health probe passes against a world whose database is gone*
- **`F-DEV-SERVER-REUSE-PASSES-A-MUTANT`** — A sleep is not a barrier. Nothing checks that any other browser arm in the estate restarts its compiler, and a mutation arm that cannot fail is worth less than no arm because it reads as proof.
  <br>*a browser arm agreed with itself across a mutation*
- **`F-EF-UNNAMED-INDEX-REPLACES`** — A check that reds when an entity adds an index by columns alone where one already exists. Nothing sweeps for it today.
  <br>*an unnamed index silently reconfigures its neighbour*
- **`F-EMPTY-GREP-READS-AS-ABSENCE`** — Run any absence pattern against a known-present instance first and record that it matched. Zero hits from a pattern that cannot match is indistinguishable from zero hits from a clean file.
  <br>*a search that cannot match reports zero, and zero reads as proof*
- **`F-EV-CONCURRENCY-GUARD-UNTESTED`** — A SQL tier has now run at the merge tip. Prove the settlement mutation refuses a stale revision there — the guard that stops two operators overwriting one money document has never been pressed.
  <br>*the settlement's optimistic concurrency check is inert at the only tier that runs*
- **`F-EV-FAKE-DRIFT`** — One contract suite passed by both the fake port and the real adapter, plus a pin refusing any provider state the real adapter cannot emit. The same shape already shipped once as a defect.
  <br>*the Events deposit fake cannot represent a provider-refunded state*
- **`F-EVIDENCE-GITIGNORED`** — A check that reds when an evidence pointer names a gitignored path. The receipt-that-does-not-exist shape arrived at by accident rather than by claim.
  <br>*a landed lane's cited receipt was never committed*
- **`F-EVIDENCE-IN-THE-TREE-DIRTIES-ITS-OWN-BUILD-ID`** — Decided by measurement and built: exclude UNTRACKED paths under lanes/ and docs/plan/, nothing else, with the ignored count printed on the artifact so an unexamined clean id says so on its own face.
  <br>*a lane's own receipts make its build unverifiable*
- **`F-FIXTURE-BEHIND-BACKEND`** — The divergence check exists, is gated 8/8, and is RED on a real defect: GrowthNewsletterService throws 409 growth.test_address_suppressed and the fixture answers no such refusal. Close the divergence.
  <br>*the e2e fixture can be a release behind what it stands in for*
- **`F-FIXTURE-PRINTS-WORDS-THE-PRODUCT-CANNOT-SAY`** — Twelve wrong enum-backed values and SIX PRINT TO AN OPERATOR, two confirmed by object. One names a state that does not exist at all, and one is silently collapsed so a journey walks the wrong branch. A union-membership check would pass 5 of the 12 — only binding each field to the enum its reading code uses finds them.
  <br>*six of twelve wrong values reach a screen*
- **`F-FLAG-CONDITIONS-ARE-NOT-TESTABLE`** — THE META-LANE FOR THIS WHOLE BACKLOG. Corrected on measurement: only 16 of 60 blockers need a person; 44 are testable with a probe that can be written. Most of Sven's queue is authorable work, and the hazard count cannot fall until the conditions can be measured.
  <br>*the hazard count cannot fall no matter what lands*
- **`F-GR-NEWSLETTER-CROSS`** — Restated: a PROOF gap, not a live defect. The guard is called and honoured at five sites; it is protected by nothing, and the isolation suite is 15/15 green against the mutated build. The proof is one test-only commit with a pre-validated merge already prepared.
  <br>*the newsletter store guard is load-bearing and unproven*
- **`F-GR-PROVIDER-GATE-PIN-VACUOUS`** — Make the pin red on the reversion somebody would actually make. It is not vacuous today; it is vacuous against the specific reversion that matters.
  <br>*the gate pin passes again if the actor line goes with it*
- **`F-GR-SEND-GATE-JOURNEY-RED`** — Proved pre-existing at the tip — the app shell never settles and the walk times out, so it reads as the module's fault when it is not.
  <br>*a newsletter journey fails at the branch tip, before any newsletter route*
- **`F-GUARD-PROOF-COULD-NOT-EXECUTE`** — Nothing forces a harness to distinguish "arms ran and failed" from "arms could not run". Those two states look identical from outside and mean opposite things.
  <br>*a proof that died on load still printed a table and still failed*
- **`F-I18N-FALLBACK-MASKS-A-MISSING-KEY`** — A correction to the plan's own premise: a missing key renders Norwegian to an English operator, not a raw key. Clerk edit plus grading any key-presence test by the severity that occurs.
  <br>*a missing translation shows the wrong language, not a raw key*
- **`F-JOURNEY-FILTER-DISCARDS-A-404`** — The walk that covers the waste panel filtered `status of 404` as noise, so every green run silently discarded the evidence that four routes had no handler. favicon and Vue Devtools are noise; a 404 is a finding.
  <br>*the walk that covers this page throws the evidence away*
- **`F-JOURNEY-GUARD-DECORATIVE`** — The re-throw landed weeks ago; what was owed was a re-runnable proof, and that harness was itself dead. Repaired at 7030c00 on lane/guard-repair-lands — land it.
  <br>*a live-labelled run against a fixture passed and exited zero*
- **`F-JOURNEY-GUARD-WAS-DEAD`** — Of 41 committed journey receipts, ZERO were ever witnessed — the guard died at 94fa256 by something else being fixed, and its one "passing" arm was reporting the other nine's module-load death. Repaired 10/10 at 7030c00 on lane/guard-repair-lands; landing it is a MERGE, not a copy.
  <br>*the guard the evidence standard rests on had no working test*
- **`F-JOURNEY-LEAVES-LEVERS-ON`** — A journey restores the lever it pulled. Two consecutive runs against one world is the proof.
  <br>*a journey run changes the world it ran against*
- **`F-JOURNEY-RECEIPT-DOES-NOT-NAME-ITS-FIXTURE`** — A receipt must record WHAT ANSWERED, not the port the run was given. A private port is necessary and not sufficient — one hardcoded expression defeated it while the artifact stated a different port.
  <br>*a walk that may have been served by another lane's world*
- **`F-LINT-IS-ENABLED-AND-WIRED-INTO-NOTHING`** — The rule that catches the duplicate-key hazard is already `error` and finds it in under a second, and nothing invokes it. The lane put the check inside the test suite, where a config nobody runs cannot disable it. The shared hook directory behind ~90 worktrees is deliberately untouched and is the owner's.
  <br>*the rule that catches it is already an error and never runs*
- **`F-MEALS-NO-SQL-ON-REQUOTE`** — A SQL tier has now run at the merge tip (7f8945dc6). One check from satisfied: confirm the measured tree carries the re-quote release and commit the trx.
  <br>*no SQL tier has run on any re-quote-bearing tree, by anyone*
- **`F-MRG-EPOCH-CAVEAT`** — Confirm the journal-epoch defect the Margin statement rests on is resolved. A read against MarginBusinessDateEpochSwitchTests, not a build.
  <br>*a statement rests on an epoch defect nobody has confirmed closed*
- **`F-MY-LIVENESS-CHECK-NEVER-MEASURED-ANYTHING`** — `pgrep -c` does not exist on this platform, so the check printed a constant zero three times and three reviewers were told to abandon live runs. The working form is recorded; applying it is the clerk's.
  <br>*a count that was a hardcoded zero, three times acted on*
- **`F-PENDING-MODEL-CHECK-HAS-A-BLIND-SPOT`** — It diffs the model against the snapshot, never against the migrations' operations — so it is a tripwire at the moment of introduction and goes silent at the next unrelated snapshot regeneration. The instrument with no blind spot is a different one.
  <br>*it diffs the snapshot, not the migration operations*
- **`F-PREF-UNREACHABLE`** — Both gating facts are misaimed (see F-BOTH-PROBES-GATING-THE-PREF-FLAG-ARE-MISAIMED). Repoint the first; the second waits on the cookie-mode retirement.
  <br>*the preference centre cannot open a session from the deployed origins*
- **`F-PRIVATE-INDEX-COMMIT-CAN-BUILD-AN-UNRUN-TREE`** — A synthetic HEAD+mine tree is a tree nobody has run, so the branch's green was measured somewhere else. At landing time take paths and RE-RUN; never trust a branch's recorded green.
  <br>*the clerk's own commit recipe has a failure mode*
- **`F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH`** — The git-bookkeeping pin landed and caught both trees on its first run. A probe-owned checkout is authorable; moving a sibling lane's worktree onto the declared ref is not a lane's act.
  <br>*the backend probes read whatever branch a sibling last checked out*
- **`F-PROBE-ROOT-WRONG-WORLD`** — Superseded in practice by the git-bookkeeping pins that landed 2026-08-06. Moving the backend tree onto the declared ref is not a lane's act — it is another lane's worktree — but a probe-owned checkout is.
  <br>*the checkouts the facts are read from are not the world the plan declares*
- **`F-PUBLISH-DOUBLE-OUTBOX`** — Downgraded on measurement: the product is correct, two channels, and driving it to one row would delete the e-mail — the only channel that reaches an invited worker who has not claimed. The assertion must name the channel set, and the fix at 3bb9c039 has never run on SQL Server.
  <br>*the second outbox row is a sibling, and the assertion was stale*
- **`F-RETREC-GUARD-IS-DEAD`** — Either a test reds when the RETREC guard goes — in which case it is load-bearing and this was a false alarm — or the guard goes with the SQL tier run first. A SQL tier has now run, which unblocks the second arm.
  <br>*a guard on a money path that no test misses*
- **`F-SHELL-FALLBACK-MASQUERADES-AS-THE-FIRST-BRANCH`** — The instrument catalogue, now at fifteen-plus instances. The transferable remedy is one line: assert the mutation landed before trusting any result of it.
  <br>*the eighth way a check answered confidently and wrongly*
- **`F-SQL-SLOT-GATE-IS-ONLY-A-START-CONDITION`** — Cap `max server memory` inside your OWN container. Two conditions from review before it becomes general practice: derive the session id POSITIVELY from the lane's own Testcontainers process, never by elimination, and prefer a builder-time hard limit to a watchdog.
  <br>*the memory floor admits a run that then starves the host*
- **`F-SURVIVING-FIXTURE-SERVES-STALE-CODE`** — A harness refuses a fixture it did not start, or asserts the served build against the working tree. The positive detection method is already recorded: the `[fixture] listening on` line appears only when a fresh process binds.
  <br>*a restart that silently fails to bind proves the old code*
- **`F-SYMLINKED-MODULES-COMPILE-THE-OTHER-TREE`** — Symlinking node_modules makes webpack compile the SHARED checkout's components. It failed loudly only by luck; where the trees agree it is undetectable. The fix is cheap — an APFS clone — and the work is re-measuring what was produced under it.
  <br>*a worktree build silently compiles the shared checkout*
- **`F-THE-SUITE-IS-RED-ON-A-FAITHFUL-CLONE`** — The two basename assertions are CLOSED at the frontend tip (measured today). The residual is the fifth failure — the journey configuration excluding a tag in one mode and nothing in the other — and core-checkout.js:74-76 still ranking a directory named Web-modules first.
  <br>*two tests pin the directory the repository is not named*
- **`F-TRAIN-INVISIBLE-ON-A-FRESH-STORE`** — The walk asserts a regime a fresh venue cannot be in, and the amendment is SHORTER than what is there. It must not be closed by seeding a training row — that would manufacture a store no venue can be.
  <br>*the walk asserts a regime a new venue cannot be in*
- **`F-VIPPS-REDACT-OPEN`** — Closed and measured, corrected in both directions (405 has the same shape as 404; the percent-encoding half was not reproducible). One non-vacuity check from satisfied.
  <br>*a malformed guest deposit link publishes its own credential*
- **`F-WIRE-TIER-DIRTIES-ARTIFACTS`** — A tier run leaves committed artifacts it does not own byte-identical, or they are not committed. Same family as F-A-SUITE-RUN-REWRITES-COMMITTED-ARTIFACTS.
  <br>*running the wire tier rewrites another module's committed artifacts*
- **`F-WORKTREE-WITHOUT-MODULES-FAILS-SILENTLY`** — The preflight is built, wired into pretest AND the config's own module load, and it corrected three figures the clerk had been putting in every brief. Land it.
  <br>*fifteen worktrees where a test run cannot say it did not run*
- **`F-WORLD-FACTS-ARE-GREEN-IN-THE-WRONG-DIRECTION`** — The new pins read git's own bookkeeping instead of an artifact a collector can forget to run, and caught both trees on their first run. What remains is retiring the WORLD.json-derived facts that are false in the GREEN direction.
  <br>*the hub asserts a branch it is not on*
- **`F-WRONG-CLOCK-DEMOTES-A-TRUE-FINDING`** — Reverse the L-DOWNLOAD-HEADERS demotion in absences.md: the two timestamps were on different clocks and the brief existed sixteen minutes before the return said it never had.
  <br>*a UTC stamp compared against a local mtime, inside the audit of false conclusions*

### Tier 5 — conventions, ledgers and harness warts — 31

- **`F-ACTORKIND-CONVERGENCE-NOT-FORK`** — Write the per-module actor-kind convention where a reviewer will read it before merging two of them. The obvious tidy-up would break both modules.
  <br>*two actor-kind enums that must not be collapsed*
- **`F-AGENT-KILLED-THE-OWNERS-DEV-SERVER`** — The rule the estate has for containers, extended to processes: a lane resolves every kill from its own port or its own pid, never from a pattern that could match a sibling or a person. `pkill -f` is the specific hazard.
  <br>*a pattern kill reached outside the lane that issued it*
- **`F-CAP-COUNTS-LANES`** — Ruled count-standing-worlds. Teardown commands are already recorded in each lane's return and nothing reads them; the reader is the work.
  <br>*the SQL cap counts lanes, and the danger is containers*
- **`F-DEMO-ACT5-CLAIM-NO-LONGER-REPRODUCES`** — Measure a claim that reproduces against `plan render --html`, or retire the act with the reason recorded. A demo asserting a drift the current renderer does not produce is a demo that will fail for the wrong reason.
  <br>*the demo's fifth act asserts a drift that the current renderer does not produce*
- **`F-DEV-SERVERS-SHARE-BUILD`** — Per-run build directories. Loud today (zero served, non-zero exit), which is why it is a warn.
  <br>*three dev servers share one build directory*
- **`F-DUP-DISPATCH`** — The second arm — per-lane worktree naming — closes it without touching the tool. The startable-while-alive half is the clerk's own discipline.
  <br>*one lane ran twice at once and the twin deleted the live worktree*
- **`F-EV-REFUND-LINE-UNREACHABLE`** — Reachable through a route or removed from the enum. An enum naming a state the product cannot reach reads to the next author as a supported case.
  <br>*a settlement line kind no request can create*
- **`F-FILTER-NOT-CONTAINERFREE`** — Derive a trait from what a test uses rather than from its name. One of three flags naming the same trait.
  <br>*the suite filter everyone uses still starts SQL containers*
- **`F-FIXTURE-BACKUP-STALE`** — Restore by pathspec commit, not by file copy. The backup habit developed the failure it was invented to prevent.
  <br>*a restore-from-backup would now drop another lane's work*
- **`F-FRONTEND-DECLARES-STATES-THE-SERVER-CANNOT-SEND`** — Half refuted on measurement (OrderStatus mirrors exactly). Two dead members remain, and the same mirror is SHORT in the other direction at the same time — an audit of either direction alone finds half of it.
  <br>*a mirror that invented two members*
- **`F-GIT-ADD-SWALLOW`** — Commit by pathspec. A standing rule in every brief rather than a lesson each lane learns once.
  <br>*a concurrent stage swallowed another lane's files*
- **`F-IDENTICAL-EXPRESSION-DIVERGENT-MEANING`** — Review convention: record which row each identifier resolves to, per call site.
  <br>*two call sites read the same and mean different things*
- **`F-INT-LEDGER-CEILING-SIX-LOW`** — MIG-23 to 28 exist only in the stack copy, so an author following the integration copy takes a number already held on 14 refs. The MIG-12 five-way clash set up to repeat, minus the thing that made the first survivable.
  <br>*the next free MIG number on the integration branch is already held*
- **`F-MEALS-STATEMENT-CLIENT-CLAIMS-A-PAGE-THAT-IS-NOT-HERE`** — A client header documents a component that is on an unmerged lane, so a reader concludes the surface exists. Small, and the same species as the two large ones this week.
  <br>*a client header names an unmerged component*
- **`F-MIG-LEDGER-THROW-NUMBER-WRONG`** — Reconcile the ledger's stated THROW ceiling with what the integration branch contains. Nothing breaks today, which is exactly why the next collision will be found by a failing migration rather than by reading.
  <br>*the ledger names a trigger number that is not the highest*
- **`F-OVERBROAD-TEST-FILTER`** — One filter spelling. Sweep briefs, scripts and receipts for `FullyQualifiedName!~SqlServer`.
  <br>*one filter spelling starts a container the other does not*
- **`F-PROOF-HARNESS-NOT-THE-GUARD`** — Convention, already demonstrated once: diagnose the harness before touching the guard.
  <br>*a failing proof is not evidence the guard is wrong*
- **`F-REVIEWERS-LOSE-THE-RUNS-THEY-WAIT-ON`** — A reviewer measures what it can hold in one turn; a long tier run belongs to the lane. Where a reviewer must re-derive one, the instruction that works is to state the gap and rule anyway.
  <br>*three verdicts today stalled on a process that died with them*
- **`F-REVIEWS-CANNOT-BE-JOINED-TO-LANES`** — One log line per review, written when it is fired, naming the lane id. It costs nothing and it is the difference between a backlog and a rumour.
  <br>*the review record and the lane record do not meet*
- **`F-SCROLLLOCK-FLAKE`** — Wait for layout to settle rather than racing it. It fails FAST, so it bites hardest on the runs nobody is watching and is attributed to whichever lane is running.
  <br>*a modal test reds on timing and will red somebody else's run*
- **`F-STALE-HUSKY-HOOK-BLOCKS-EVERY-COMMIT`** — MEASURED TODAY: /Users/svendaneel/okam/Web/.git/hooks/husky.local.sh exists. Removing or repairing it touches ~90 worktrees at once, so it wants a deliberate quiet-window act rather than a side effect — but it is engineering, and every commit paying --no-verify is a gate nobody is running.
  <br>*a stale husky hook cds into a path that exists in no checkout, so every commit needs --no-verify*
- **`F-STALE-SECURITY-ARTIFACT`** — Record the resolution beside the finding rather than in place of it. Editing another lane's dated evidence is correctly refused.
  <br>*a closed hazard is still recorded as open*
- **`F-STASH-IS-SHARED-ACROSS-WORKTREES`** — `git stash` is one shared stack across ~124 worktrees. The safe practice is a second worktree or a copy, and no lane should be told to take a baseline any other way.
  <br>*a pop in one tree reaches another branch's week-old work*
- **`F-THE-DEFAULT-TEST-FILTER-CLAIMS-A-CONTAINER-SLOT`** — Third flag naming one trait. The safe form is the longer one, so a lane that does not know to add it finds out by watching a container appear — and it costs the MEASUREMENT as well as the slot.
  <br>*two lanes started databases they had no grant for*
- **`F-THE-FIX-REPRODUCED-THE-DEFECT`** — Convention: a success criterion never aggregates over a set wider than the thing it claims succeeded.
  <br>*a lane's own count made the same mistake it was fixing*
- **`F-THROW-50018-ALREADY-SPENT`** — The integration ledger copy still tells an author 50018 is free while a migration on the branch consumes it. The correction exists on the forked side; the stack landing may now make it reachable.
  <br>*the ledger tells the next author to take a number that is taken*
- **`F-TRIPLETEX-CALL-BUDGET-UNDERCOUNTS-THE-WORST-CASE`** — Raised today and NOT stale. The error is in the safe direction — the claim window closes early rather than late — and the reviewer named the exact tightening, recorded beside a land-as-is ruling so it cannot be lost between a landing and the next author.
  <br>*the Tripletex per-call budget undercounts the worst case*
- **`F-TRIPLETEX-STALE-RECOVERY-IS-LONGER-THAN-ITS-STATED-TEN-MINUTES`** — Raised today and NOT stale. Nothing is lost and nothing is double-claimed; a claim simply stays held ~24.3 minutes against a stated 10. Change the number or the path — both arms are engineering.
  <br>*the Tripletex stale recovery is longer than its stated ten minutes*
- **`F-WOLT-DEAD`** — Register the hosted service or delete the class. Either arm is engineering; a background service registered in no commit in history is dead either way.
  <br>*a background service never registered in any commit in history*
- **`F-WT-THREE-LANES`** — A brief that grants a worktree names who else holds it. Clerk dispatch discipline; it has already cost one run.
  <br>*three lanes share one worktree and none was told*
- **`F-ZSH-WORD-SPLIT`** — Do list work in Python; show per-item output in receipts rather than a count. Brief and receipt discipline.
  <br>*a shell loop over a variable silently checks nothing*

---

## B · sven-only — 60

**"Ask Sven" is not a category.** Each row names WHICH kind of owner act it needs. Grouped, because
several of these are one act that closes many rows.

### Rotations and credentials — the owner acts, and consolidation is not rotation — 10

- **`F-ADMINAPP-KEYSTORE-PASSWORD-IN-A-COMMITTED-SCRIPT`** *(rotation)* — Raised today and NOT stale. An Android keystore password in cleartext in a committed npm script; the committed value must be rotated, which is the owner's.
  <br>*an Android keystore password sits in cleartext in a committed npm script*
- **`F-AZURE-FUNCKEY`** *(rotation (DEFERRED BY RULING))* — Sven ruled 2026-08-04 "this is fine disregard". The flag itself says it is not blocking any lane and no lane should spend time on it. Recorded so nobody re-picks it.
  <br>*a live Azure Functions host key is committed, and a red test prints it*
- **`F-JWT-SIGNING-KEY-COMMITTED`** *(rotation)* — THE LARGEST OF THE CREDENTIAL SET AND THE ONE TO RULE FIRST. A committed HMAC key means forging a PowerUserRole token needs NO LOGIN AT ALL — no phone, no code, none of the chain the power-user flag describes — and that role is StoreAdmin of every store on tokens that never expire. Committed since 2020-04-08, with no fail-fast guard, in an estate that demonstrably knows how to write one.
  <br>*the token signing key is in the repository, and forging needs no login at all*
- **`F-LIVE-WORLD-ONE-HUMAN`** *(credential-issue)* — "A second human needs a credential, and issuing one is an owner act." Every module whose value is two people talking is unwalkable live: Workforce needs a manager and a worker, Meals a concierge and an invitee.
  <br>*the live world can only be one person at a time*
- **`F-LOGIN-CENTURY-TOKEN`** *(product-ruling + rotation)* — A hundred-year JWT with no revocation path — OnTokenValidated fails only when the user row is gone. What the lifetime SHOULD be is a security-policy call. The SMS companion's missing rate limit is agent-closable today, and UseRateLimiter() is never called anywhere on master.
  <br>*the login route mints a hundred-year token into a body any origin can read*
- **`F-PLAN-SNAPSHOT-CARRIES-A-CREDENTIAL`** *(owner-act)* — The PUSH ref is closed and verified clean at 6c4305e across 451 objects, so the one-command push is safe to run. refs/lanes/plan-snapshot cannot be made clean here — 133 demo-code occurrences live in PRODUCT ancestry 309 commits deep — and should be DELETED rather than kept, which is an owner act alongside the rotations.
  <br>*the docs-in-git push would publish a live value*
- **`F-POWERUSER-CODE-IS-COMMITTED`** *(rotation)* — A real, usable six-digit value, introduced 2023-11-26 — two years and eight months old, which makes rotation more urgent not less. Three doors, and the role it opens is StoreAdmin of EVERY store with no scoping, on tokens that never expire. It is in OkamAPI appsettings AND two committed demo scripts AND seven untracked files here, so a rotation that changes only appsettings.json is not a rotation.
  <br>*one half of the platform-admin sign-in is in the repository*
- **`F-PROD-BEARER-COMMITTED-IN-BRUNO`** *(rotation)* — A production PowerUserRole bearer token in a committed .bru file. The token expired 2026-06-22 and the key that signs a fresh one has NOT been rotated and is itself committed — so the expiry buys nothing. Found only because a fifth copy of another credential turned up in the same directory: a .cs/.json/.sh sweep walks straight past .bru.
  <br>*a production admin token is in the repository*
- **`F-PROD-BEARER-IS-SCRIPT-READABLE`** *(deploy + rotation)* — THE MOST SERIOUS LIVE FINDING IN THE SET. AllowAnyHeader() ECHOES the requested headers, defeating the Fetch spec carve-out by name, so three header-borne credentials are script-readable from any origin on the DEPLOYED API today. The condition names the deployed host checked from outside this machine. NOTE: the code narrowing itself is authorable now and must land on master AND the integration branch — neither is an ancestor of the other.
  <br>*the wildcard is safe for cookies and unsafe for headers*
- **`F-PROD-STORES-APIKEY-HARDCODED`** *(rotation)* — A GUID literal in the source is the SOLE guard on anonymous order reads for four real stores. The owner action is rotation; consolidating or hiding it is not, and the estate paid that lesson on 2026-07-30.
  <br>*a GUID API key is compiled into the source and guards anonymous order reads*

### Deploy and deployed-environment checks — no agent can read a host it cannot reach — 6

- **`F-CORS-ORIGINS-BY-INDEX`** *(deploy-check)* — The condition is deliberately written against the RESOLVED options object in a DEPLOYED environment. Only the owner can read one.
  <br>*the allowed-origin list is overridden by position, not by value*
- **`F-DEPLOY-NEEDS-FOUR-APP-SETTINGS-FIRST`** *(deploy)* — A config-before-deploy dependency created deliberately, and it must not be discovered at deploy time. The App Service refuses to start without all four, which IS the point; nothing breaks today.
  <br>*the App Service will refuse to start without them*
- **`F-DEV-EXCEPTION-PAGE-ECHOES-THE-BEARER`** *(deploy-check)* — A 500 body returns the caller's own Authorization header. It is Development behaviour, so the question that decides the severity — WHICH DEPLOYED ENVIRONMENTS RUN WITH THAT PAGE ON — is the owner's to check.
  <br>*a 500 body returns the caller's own token*
- **`F-LIMITERS-PER-PROCESS`** *(deployment-constraint)* — Ruled record-single-replica-as-a-constraint. Every budget multiplies by the replica count and a statutory § 15 claim rests on it; recording a deployment constraint is the owner's.
  <br>*the marketing-law proof rests on limits that do not survive a second replica*
- **`F-PROD-CORS-WILDCARD`** *(deploy)* — Measured against the LIVE host, not a branch. Its only route to being fixed runs through a deploy nothing has ever performed. Nothing an agent can do closes a production defect on a host nobody deploys to.
  <br>*the live API answers every origin*
- **`F-TRAIN-TRUNCATE`** *(deployment-posture)* — TRUNCATE does not fire AFTER triggers, so it empties an append-only history while every catalog pin stays green. The remedy is denying the application principal a permission, which is a deploy act.
  <br>*the deviation history can be emptied without firing its trigger*

### Pushes — a day of work is protected by one disk — 3

- **`F-CORE-PIN-ON-NO-REMOTE`** *(push)* — "This is Sven's because the remedy is a push." A fresh clone cannot check out its own dependency, and the object is one `git gc` from unrecoverable.
  <br>*a fresh clone cannot check out its own dependency*
- **`F-PLAN-NOT-IN-GIT`** *(push)* — The durable answer is tracking the directory, which is a commit to a shared branch and therefore the owner's. plan/docs-20260806 @ 6c4305e is prepared, scrubbed and verified clean — one command. 812 files are on one disk today.
  <br>*the plan, every return and every review exist only in one working tree*
- **`F-THE-BRANCH-EXISTS-ON-NO-REMOTE`** *(push)* — "It is one push per repository." 135 frontend and 507 backend commits, the pinned submodule object and the entire plan directory are on one laptop; a real clone stops at `pathspec did not match`.
  <br>*a clone cannot check out the branch this whole program is on*

### Statutory and legal calls — 3

- **`F-EV-HEALTHDATA`** *(legal)* — A dietary or allergen statement is special-category personal data the moment it names a condition, and it lives in three places. The verbatim-disclosure ruling is explicitly owed.
  <br>*a guest's health statement persists in three places with no anonymisation*
- **`F-RF1313-CREDIT-SALE-CLAIM-UNBACKED`** *(legal)* — MEASURED TODAY: zero code hits for the credit-sale specification at the trunk while the systembeskrivelse asserts it. Which remedy — land the columns or withdraw the sentence — AND whether the § 6 notification obligation applies, are both named as Sven's. C6.
  <br>*the systembeskrivelse says the X/Z report describes credit sales, and no code produces it*
- **`F-WF-NOREG`** *(legal)* — The § 8-5-6 duty is discharged by a person keeping a register, which no probe can see. Owner-judged prose by construction. RESTORE BLOCKER if lane/wf-idreg is never merged — the severity drop rests half on a frontend lever that is not on the branch.
  <br>*personalliste codes have no register, which is what makes the substitution lawful*

### Product and contract rulings — what the product SHOULD do, not how — 18

- **`F-APPEND-ONLY-RECEIPTS-HAVE-NO-READER`** *(product-ruling)* — "Recording it as deliberate would be a perfectly good answer" — an audit store queried only by an inspector with database access is a legitimate design, but it should be a decision somebody made.
  <br>*a table written by one path and read by nothing*
- **`F-C5-NOT-WALKABLE`** *(policy-ruling)* — Whether C5 carves out primitives no surface exposes. Two reviewers found instances independently and both refused to invent a walk. The flag says the ruling is Sven's in as many words.
  <br>*some work has no journey a person can walk, and owing one is dishonest*
- **`F-CAPABILITY-URL-BLINDSPOT`** *(design-ruling)* — The deposit token in the path is deliberate and cites spec §5. What wants ruling is its LOGGING treatment, not the design.
  <br>*the route-shape guard is a rule about names, and a bearer token has no name*
- **`F-CH-COOKIE-WITHHELD`** *(market-ruling)* — Neither origin ruling covers a second edition. The lane deliberately did not invent the symmetric hostname, which was right — a plausible configuration value turns one broken surface into all of them.
  <br>*the Swiss edition's session cookie cannot attach under the ruled origin*
- **`F-COMPANYACCOUNT-BLOCKED-BY-THE-APPROVAL-GATE`** *(product-ruling)* — A company tender never touches a payment rail, so the approval check that protects card and wallet flows refuses something it has no reason to. A venue piloting Company Meals before approval completes is exactly the case the module is for.
  <br>*a tender that touches no rail is refused like one that does*
- **`F-CREDITNOTE-BEFORE-RENDER`** *(product-ruling)* — Whether a credit note exists before the document that evidences it does. Pinned as it behaves rather than changed, which was right — this is not a lane's call.
  <br>*a renderer outage leaves a real credit note behind a refusal*
- **`F-EV-INQUIRY-UNGATED`** *(product-ruling)* — Refusing the public enquiry may close the front door that sells the module. The flag was deliberately left for a ruling rather than fixed, which was the right call.
  <br>*a guest can create an event for a venue that cannot see it*
- **`F-GR-NEWSLETTER-SELF-APPROVE`** *(policy-ruling)* — Whoever writes a newsletter can approve their own send to the whole audience. A test pins that equality deliberately in both directions, so it should change on a ruling rather than because somebody finds it inconvenient.
  <br>*the author of a newsletter can approve it*
- **`F-GR-SWEEP-ACTORLESS`** *(design-ruling)* — The omission is reasoned and the alternative is worse — an append-per-pass grows without bound into a table C1 forbids purging. Precisely the shape that needs a ruling rather than a lane.
  <br>*the dispatch sweep records no actor, on purpose, and that wants review*
- **`F-GROWTH-NO-LIVE-CONFIRM-LINK`** *(product-ruling)* — "The one module whose C5 exit may be unreachable by construction rather than by effort, and that is worth ruling rather than retrying." Only the token hash is persisted, by correct design; no transport is both live and safe. Three honest options are named.
  <br>*the consent journey cannot be walked live at all*
- **`F-INVITATION-CLAIM-IGNORES-THE-MODULE`** *(product-ruling)* — Half is deliberate and correctly on record — gating claiming on a capability the person cannot yet hold would be circular. The MODULE half is the open question: what bounds claiming for a store with Workforce explicitly off.
  <br>*a Workforce-off store can still have invitations claimed*
- **`F-MEALS-FUNDING-AUTHORITY-COLLISION`** *(vocabulary-ruling)* — "There is no value to pass. Adding one is a change to what the system says an actor IS." Confirmed on a merge actually performed rather than reasoned about.
  <br>*two lanes change one interface and cannot see each other*
- **`F-MEALS-MONEY-FLAGS-HAVE-NO-LEVER`** *(product-ruling)* — "This is a product decision rather than a defect." A venue cannot be given Meals and cannot be taken off it: three of four flags are settable only by environment variables on the launch line, and the ordering, projection and statement paths have no per-store control at all.
  <br>*three of four flags are settable only by restarting the process*
- **`F-PARTNER-FEED-DROPS-IMAGELESS-CATEGORIES-TOO`** *(contract-ruling)* — A second, independent copy of the same drop on the API-KEY PARTNER FEED. Partners have integrated against the current shape, and changing what a paying integrator receives is not the same decision as fixing our own shop. D-CATEGORY-IMAGE-CLIENT-GATE does not cover it and should not be stretched to.
  <br>*the partner feed drops image-less categories too, under its own published contract*
- **`F-POS-403-UNREACHABLE`** *(contract-ruling)* — Which is correct — the coded 403 the contract promises or the bare 401 that arrives — is a contract ruling, not a fix.
  <br>*a refusal code that no request can produce*
- **`F-TRAIN-IK`** *(scope)* — The claim is off the UI, which is the mitigation. Building the internal-control surface is H-TRAIN-IK, whose gate is "a venue's internal-control obligation is what a pilot is buying" — scope, not engineering.
  <br>*Training carries no internal-control surface, so the word cannot be printed*
- **`F-TRAIN-PERSONREF-LEAK`** *(product-ruling)* — The cross-store resolution is deliberate and pinned, so it is a choice rather than an oversight. Whether any store admin may turn a person reference into a real name is the ruling.
  <br>*a person reference resolves to a name with no store predicate*
- **`F-WF-PAYROLL-REKEY`** *(vendor-choice)* — The condition names "the ruled vendor's import validator". No export can be validated against an importer nobody has chosen.
  <br>*an accountant re-keys every period by hand*

### A number or a window nobody has set — 1

- **`F-GR-CONFIRM-AGELESS`** *(threshold)* — A staleness window nobody has ruled. The lane refused to author a column that nothing would read, which was right — an unruled window makes it dead weight.
  <br>*a mailbox that changed hands quietly still authorises a send*

### One CI call that closes four flags — 3

- **`F-FE-CI-UNGATED`** *(ci-policy)* — Same single call as F-NOTHING-RUNS-A-SUITE-IN-CI.
  <br>*no CI job runs the frontend suite*
- **`F-GUARD-PROOF-NOT-IN-CI`** *(ci-policy)* — Waits on the same single call as F-NOTHING-RUNS-A-SUITE-IN-CI: do suites run in CI on this host, or is local-only recorded as deliberate.
  <br>*the evidence guard exists and nothing runs it*
- **`F-NOTHING-RUNS-A-SUITE-IN-CI`** *(ci-policy)* — "Stated as a flag rather than a lane because the choice is real." Suites that take minutes, a host that has stalled twice this week, ~130 in-flight worktrees. What is not defensible is leaving it unstated while the plan speaks of gates. THIS IS ONE CALL THAT CLOSES FOUR FLAGS.
  <br>*every gate in this plan is one somebody chooses to run*

### Acceptance — the gate that is doing exactly what it was built to do — 2

- **`F-ACCEPTANCE-IS-THE-CHOKE`** *(acceptance)* — cleared_by is literally "none — only the owner can clear this". The walk or a recorded policy about which dependencies need no acceptance.
  <br>*sixteen lanes wait on work that is finished but unaccepted*
- **`F-EVERY-LANE-DEPENDENCY-ENDS-AT-SVEN`** *(acceptance)* — Structural: satisfied() treats a lane dependency as met only when the target is `accepted`, and the tool refuses `accepted` whenever PLAN_ACTOR is set. 0 accepted, 64 open lanes, none unblocked. The gate is doing exactly what it was built to do.
  <br>*sixty-four open lanes, none of them ready, by construction*

### The machine — containers and processes nobody else may stop — 5

- **`F-DISK-PRESSURE`** *(host)* — Free space on the owner's working volume, and something that reclaims it without a person remembering.
  <br>*the estate is one large build from a lane dying mid-run*
- **`F-HOST-VM-EATS-THE-CEILING`** *(host)* — Sven already acted once ("raise this or fix it"). The residual is structural: the ceiling counts lanes and a lane is not a process — four lanes became seventy-three workers — and the cpu budget is derived by the tool, not set in this document.
  <br>*a three-day VM makes the load ceiling unreachable*
- **`F-LIVE-WORLD-5961-DIRTY`** *(host)* — The restore works by docker exec into a container the lane did not create. Teardown belongs to whoever owns okam-lwr-sql.
  <br>*the live workforce world is left published and needs a restore before reuse*
- **`F-SQL-CONTAINERS-FROM-EARLIER-SESSIONS-STILL-HOLD-THE-HOST`** *(host)* — "Reaping them is the owner's call precisely because the rule that protects them is a good one." A lane guessing which containers are abandoned eventually kills a colleague's fixture mid-run.
  <br>*three left running, two of them for days*
- **`F-SQL-HEADROOM`** *(host)* — Five containers belong to other lanes and hold worlds open for the walks C5 asks for. None is the clerk's to stop.
  <br>*the host cannot start another database container, and swap is what proves it*

### `bin/plan` itself — outside this repository — 7

- **`F-CONDITIONS-HAVE-NO-RETURN-PATH`** *(tool)* — Whether the clerk accepts a second return, or models conditions as a successor lane, is a change to the tool. The interim convention is adopted so nothing stalls.
  <br>*an applied review condition has nowhere legal to land*
- **`F-EXISTENCE-CHECKS-REPORT-PRESENT-FILES-ABSENT`** *(tool)* — "The remedy is one line and it is not the clerk's to make" — bin/plan:8721, refusing a decorated evidence string as not-a-bare-path rather than as a missing file. Outside this repository.
  <br>*diagnosed: the checker treats the whole decorated evidence line as a filename*
- **`F-EXIT-PREFIX-IS-A-STAMP`** *(tool)* — The prefix match is in bin/plan — Sven's own tool, outside this repository — and it is bidirectional, so no exit in this plan pins exactly one file. Un-verifying the six directory-stamped lanes is also the owner's call.
  <br>*an exit naming a directory is satisfied by any file in it*
- **`F-FAILSPEC-DOES-NOT-HOLD-ITS-LANE`** *(tool)* — `blocks:` is a rendering field and holds nothing; making the tool write `needs: D-SPEC-<lane>` at fail-spec merge time changes the clerk and is Sven's. The per-lane remedy is applied and forward-only.
  <br>*a refuted spec is re-dispatched in the same cycle*
- **`F-FLAG-PROBES-CANNOT-COMPARE-A-VALUE`** *(tool)* — `flag_condition_met` never compares a fact's value — it checks status ok and non-empty content. That is bin/plan. It makes the instrument capable of clearing a live defect on a false reading.
  <br>*the one fact-backed blocker clears on a filename*
- **`F-NEEDS-PLACEHOLDER-REFUSES-A-GOOD-RETURN`** *(tool)* — "Both are the tool's, and are Sven's to rule." Five instances, one with an explicit warning in its own brief — so the prose fix is measured not to work — and two are now unrecoverable because the author's session ended.
  <br>*three lanes refused for filling in a field they should omit*
- **`F-SCHED-DEAD-CLASS`** *(tool)* — The plan has no vocabulary for "this class has no machine today". That is the scheduler in bin/plan, outside this repository.
  <br>*unrunnable lanes are soaking the dispatch budget*

### The plan's own intent — only the owner amends it — 1

- **`F-C2-EXAMPLE-NO-LONGER-REPRODUCES`** *(intent)* — "Amending intent is Sven's alone, which is why this is a flag and not an edit." The cheap correction is marking the Orders.TableId case historical with the commit at which it stopped, not removing it.
  <br>*a constraint's cited evidence did not happen at the commit measured*

### Process conventions the owner owns — 1

- **`F-TRANSLATIONS-ARE-A-CHOKE`** *(process-ruling)* — A way through exists (per-hunk extraction against the committed blob, proven once and reversible in one command). Whether it becomes the convention is stated as Sven's.
  <br>*three shared files nobody can safely commit*

---

## C · already-satisfied-but-unclearable — 53

The world has moved and the flag is stale. Each row names the evidence. **A stale flag costs attention
every time it is read**, and 53 of them is a third of what a reader wades through to find the 48 Tier-1
rows above.

Almost all of these will refuse `plan flag clear` for the same structural reason the brief names: the
`clears_when` is prose and names no `fact:` key, so the tool cannot test it and wants
`--override --by @sven`. That refusal is right and should not be worked around by rewriting conditions
to fit — `F-FLAG-CONDITIONS-ARE-NOT-TESTABLE` is the agent-closable lane that fixes the class, and it
measured that **44 of 60 blockers are testable with a probe that can be written**.

- **`F-ACCT-DUP`**
  <br>*AccountingSummaries has no unique index in the migration chain*
  <br>**satisfied by:** 20260803093235_Kassa_AccountingSummaryDayUniqueIndex on the backend trunk
  <br>The live production double-post. The index is in the chain, landed as link 7/7 with the SQL tier run. Caveat recorded by F-FLAG-PROBES-CANNOT-COMPARE-A-VALUE: acct.uidx is an `exists` glob, so the tool would clear this on a filename — but the world is genuinely right now.
- **`F-ADMIN-LOGOUT-LANDS-ON-A-BLANK-PAGE`**
  <br>*signing out of the admin drops you on the storefront*
  <br>**satisfied by:** 0cbbd99 on the frontend trunk
  <br>FOUND BY THE OWNER IN THE FIRST MINUTE OF WALKING A LIVE WORLD, which is the whole argument for opening one. Signing out dropped an operator on the consumer storefront root as a blank white screen, via a hard window.location.href that left the SPA entirely.
- **`F-AI-REQUEST-BODY`**
  <br>*a registered middleware is one line from publishing every payload*
  <br>**satisfied by:** the middleware is deleted, proven across four builds
  <br>Ruled delete-it and closed 2026-08-03. The replacement instrument is assembly-derived: it reds for a differently-named reimplementation and while that reimplementation is still dormant.
- **`F-ARCHIVED-TEST-INFLATES-THE-GREEN`**
  <br>*a superseded test still runs and still passes*
  <br>**satisfied by:** jest.config.js at the frontend tip ignores <rootDir>/lanes/, measured today
  <br>A runnable jest copy of a live test was putting 29 superseded assertions back into the green count. The anchored directory exclusion is on the trunk.
- **`F-ARTIFACT-STORE-TEST-CHECKOUT-BOUND`**
  <br>*a test asserts the directory it is checked out in*
  <br>**satisfied by:** the literal `^Web-modules@` is gone at the frontend tip; the file derives SELF = path.basename(...)
  <br>THE BRIEF'S NAMED CASE, and it is genuinely satisfied. 7 adversarial checkouts, 7 greens, 2 falsifications on record; 38/38 in a foreign-named worktree AND 38/38 in one named Web-modules, so nothing was dropped to reach green. clears_when names no fact: key, so the tool refuses and wants --override --by @sven.
- **`F-CENSUS-FLOORS-SILENTLY-INVALIDATED`**
  <br>*a merge can void a coverage census without conflicting*
  <br>**satisfied by:** L-CENSUS-DERIVES-ITS-FLOOR replaced carried floors with a derivation
  <br>The floors now recompute rather than being carried, and the derivation was proven to red on both a missing and an added site. VERIFY the derivation is on the trunk before clearing.
- **`F-CENSUS-IS-A-THREE-WAY`**
  <br>*the actor census file is edited by three lanes, not two*
  <br>**satisfied by:** same derivation as F-CENSUS-FLOORS-SILENTLY-INVALIDATED
  <br>Its own condition is the recomputing census, and the correction inside it (two lanes, not three) is already recorded. Clears with its sibling.
- **`F-CH-BUILD-COPY-HAS-NO-DOM-GUARD`**
  <br>*the Swiss market's only locale is asserted by nothing*
  <br>**satisfied by:** two CH journeys landed that drive the locale and assert rendered German on fiscal surfaces
  <br>Both were falsified rather than merely written: the receipt walk corrupts a German key and reds with the DOM quoted, then corrupts the Norwegian one and stays green at `ch` while reding at `no` over byte-identical trees. "The flag can clear on its own words" — the two German defects beneath it stand on their own.
- **`F-COMPANY-REFUND-BOOKS-A-CASH-PAYOUT`**
  <br>*the drawer says cash went out for a sale no cash came in for*
  <br>**satisfied by:** d8c98c200 on the backend trunk; the route exists at PosController.cs:760, measured today
  <br>The drawer said cash went out for a sale no cash came in for. Red proven on unmodified code 6 of 6, and SAF-T follows for free — the return exports 12006 CUSTACCT rather than 12001 CASH. C3 IS NOT CLOSED AND CANNOT BE FROM THERE: there is no Core pos-service method and no POS control, so the operator still has no button. That residual deserves its own flag rather than living inside a satisfied one.
- **`F-CONFIRM-MERGE-RECEIPT-TRAP`**
  <br>*two lanes recorded different runs at one receipt path*
  <br>**satisfied by:** both receipts renamed, blobs byte-identical, each evidence file repointed
  <br>Ruled rename-both and resolved correctly: the two runs were genuinely different (two minutes apart, different run ids), so taking either side would have deleted a real measurement.
- **`F-DELIVERY-TOGGLES-FAIL-SILENTLY`**
  <br>*four call sites announced success over a refusal*
  <br>**satisfied by:** delivery.vue landed on the frontend trunk with a throw on a falsy write plus a re-read
  <br>Four call sites, 12 of 21 arms red before. Both halves were needed — reporting the failure while leaving the switch flipped still leaves the screen lying. ONE RESIDUAL left open as a decision rather than defaulted: a store whose minimum genuinely holds øre displays floored kroner.
- **`F-DETACHED-MIGRATIONS`**
  <br>*two migrations exist on no branch*
  <br>**satisfied by:** 17d9746bf — "the two formerly-detached migrations plus Training W3"
  <br>Merge link 1/7 of the stack landing carried both detached commits onto the trunk. The chain tip is reachable from feature/restaurant-modules.
- **`F-DEV-BUILD-POINTS-AT-PRODUCTION`**
  <br>*a local dev server talks to the live API unless told otherwise*
  <br>**satisfied by:** nuxt.config.js at the frontend tip THROWS when a dev build has no API_BASE_URL
  <br>MEASURED TODAY, and the default fails closed exactly as the condition asks, with a written reason naming the destructive saves that made it dangerous. Deployed builds are unaffected.
- **`F-DINTERO-SAVE-WIPES-PAYMENT-CONFIG`**
  <br>*arriving and pressing Save destroys a venue's payment setup*
  <br>**satisfied by:** dintero.vue carries the immediate load at the tip; the core submodule pin moved 1bcab0b -> 9626a56
  <br>Reproduced on a live record: opening the page and pressing Save destroyed 14 of 17 stored fields; through the fixed code the same action is refused as not-loaded and zero fields change. Fixed at the SEAM inside StoreService, the one door both pages pass through, and a console.log printing the client secret was removed with it.
- **`F-EF-NEVER-DECLARES-A-TRIGGER`**
  <br>*25 triggers, zero declarations, and every EF update to them dies*
  <br>**satisfied by:** HasTrigger appears 33 times in ApplicationDbContext at the backend trunk where it appeared 0 times at 8e2b57de8
  <br>THE LARGEST MOVE OF THE DAY, and it was measured in a browser rather than a suite: publish answered 500 with SQL error 334 against the old binary and 200 against the rebuilt one, with 5 of 5 courses in store 1 now carrying a published version where 0 of 5 did. The stale 25-declaration patch was correctly REFUSED rather than forced; the trunk carries the full set.
- **`F-EV-ACCEPT-UNGATED`**
  <br>*a guest can accept or decline with the module switched off*
  <br>**satisfied by:** EventsProposalService takes IEventsModuleGate at the backend trunk
  <br>Closed 2026-08-03: three ungated writes not two, gated where the token resolves the store and before the status switch, with a wiring test that resolves from the real composition root.
- **`F-EV-CALLBACK`**
  <br>*one lost deposit callback releases the guest's authorized hold*
  <br>**satisfied by:** the sweep captures rather than releases, landed 2026-07-31, ancestor of the tip
  <br>Corrected rather than cleared: the sweep consults the rail and replays the missing delivery. Mutation-proven both ways (remove the consultation, 8 red; capture unconditionally, 2 red). The other two clauses are true BY DESIGN under the ruling — the sweep is the retry.
- **`F-EV-NO-GUEST-ORIGIN`**
  <br>*no configuration says where the guest deposit page lives*
  <br>**satisfied by:** a committed configuration, pinned as a relationship
  <br>Ruled decide-the-host-now and closed: the guest origin must share a registrable domain with the committed public base URL, with a second test resolving the settings from the live composition root.
- **`F-FIRST-AFFECTED-REVISION-CAN-BE-SUPERSEDED`**
  <br>*it points at a revision, and the pointer can be stale*
  <br>**satisfied by:** 726906fe5 fixed WorkforceRequestsService too and its commit message names this case explicitly
  <br>"The fourth is a wrong answer rather than a doubled count: the value is the anchor a manager spawns a successor revision from, and a frozen revision is not one." The flag insisted on being separated precisely so a doubling-scoped fix could not close it without touching it — and the fix that landed did touch it.
- **`F-FIXTURE-NO-GATES`**
  <br>*the e2e fixture modelled no flags, so gated journeys could not fail*
  <br>**satisfied by:** audit verdict 2026-08-03: already-fixed
  <br>The remedy is dated 08-01 — two days before the ruling that dispatched a lane at it — and it is at the world, not on a branch. One of eight stale blockers found that day.
- **`F-FOCUSTRAP-TEARDOWN-NEVER-RUNS`**
  <br>*a Vue 3 hook in a Vue 2 app*
  <br>**satisfied by:** 8ac6f63 on the frontend trunk, measured today
  <br>"The focus trap releases through a hook this Vue actually calls." Vue 2 never calls unmounted(); the release now runs.
- **`F-GR-FALSE-EVIDENCE`**
  <br>*Growth privacy resolutions record deliveries that never happened*
  <br>**satisfied by:** the ruling was already implemented at the integration tip
  <br>The phrase this flag rests on returns four hits, all past-tense comments, and zero code. The existing test was already the contract case and was proven to discriminate. C1 settled without anyone: the table has never been deployed. Open as bookkeeping, not as work.
- **`F-GROWTH-SQL-TIER-RED-BY-CONSTRUCTION`**
  <br>*a whole test tier that will red the day Docker comes back*
  <br>**satisfied by:** 20260806125642_Growth_AuditLedger on the backend trunk, measured today
  <br>The fixture builds from the CHAIN, which is why it was the only place in the estate that could have told anyone. MIG-29 is in the chain now, so the tier is no longer red by construction.
- **`F-GROWTHAUDIT-MISSING-AT-THE-MERGE-TIP`**
  <br>*the composed stack itself carries the model-chain breach*
  <br>**satisfied by:** MIG-29 landed and reached the trunk with the stack; the trigger is declared at ApplicationDbContext.cs:829
  <br>The AccountingSummaries shape a third time — green on every model-built test database, Invalid object name on every chain-built one — and it was sitting at the tip about to land on the trunk. The migration reached the trunk with it.
- **`F-GROWTHAUDIT-TABLE-MISSING-FROM-THE-GROWTH-MIGRATION`**
  <br>*19 Growth tables, and not the audit one*
  <br>**satisfied by:** 20260806125642_Growth_AuditLedger on the backend trunk; the live walk applied it and installed TR_GrowthAuditEvents_AppendOnly
  <br>19 Growth tables were created and not the audit one — one module's omission, not a pattern nobody followed. It is now in the chain.
- **`F-IN-PAGE-SIGN-IN-IS-DEAD-END-TO-END`**
  <br>*three lanes each fix a third, and the path stays broken*
  <br>**satisfied by:** 993f185 + 44115a2 + eef2450 all on the frontend trunk
  <br>Three lanes each held a third and each returned an honest `built` while a person still could not do the thing. All three compose, proven in a browser on shipped bytes: one modal, it closes, two /orders/ongoing calls seven seconds apart. The dangerous landing order — the modal removal WITHOUT the AdminPage change — was named and avoided.
- **`F-INTEGRATION-BRANCHES-UNCOMPOSED`**
  <br>*the two merged stacks have never been composed with each other*
  <br>**satisfied by:** 7f8945dc6 records both tiers at the merge tip; the stack then landed on the trunk
  <br>The composed pair was built and measured, and the receipts conflict was resolved by union rather than by side.
- **`F-INVOICE-RETRY-ANONYMOUS`**
  <br>*an unauthenticated route mails every unsent invoice in the database*
  <br>**satisfied by:** InvoicesController.cs:16 [Authorize] + PowerUserRole on the actions, measured today
  <br>Ruled fold-into-the-five and subsumed by F-INVOICE-ROUTES-ANONYMOUS. Proven on the wire in both directions: anonymous 401 with a bearer challenge, non-power-user 403 with no challenge, power user 200.
- **`F-INVOICE-ROUTES-ANONYMOUS`**
  <br>*four money routes that create and mail invoices take no caller identity*
  <br>**satisfied by:** InvoicesController class-level [Authorize] at :16, PowerUserRole on the actions, measured today
  <br>Ruled authorize-all-five and it is there. The wider finding it uncovered — 61 endpoints anonymous by omission and no fallback policy — is a separate question this condition does not carry, and it deserves its own flag rather than keeping this one open.
- **`F-JEST-COLLECTS-LANE-FILES`**
  <br>*lane working files run as tests on the shipped branch*
  <br>**satisfied by:** jest.config.js at 42a44de5 carries <rootDir>/lanes/, measured today
  <br>The exclusion that existed only on the composition candidate is now on the trunk.
- **`F-KITCHEN-CLOCK-FREEZES-AFTER-LOGIN`**
  <br>*a KDS whose ticket timers stop is a KDS with no purpose*
  <br>**satisfied by:** kitchen.vue at the tip restarts clockInterval; 993f185 and 894a3b9 landed
  <br>On a kitchen display the ageing tickets are the entire point of the screen; the clock now restarts on an in-page sign-in, as does the board's auto-refresh.
- **`F-LOGINMODAL-MOUNTED-TWICE`**
  <br>*twelve admin pages carry a second sign-in modal*
  <br>**satisfied by:** 0f88242 landed via 44115a2 on the frontend trunk
  <br>Eleven pages, not twelve — the count was corrected by the closing lane, and the duplicates were load-bearing rather than decorative, so the close adds AdminPage.openLogin() for the path they covered.
- **`F-LOGINMODAL-SUCCESS-SHOWS-A-BLOB`**
  <br>*a latent credential render, one call-site edit away*
  <br>**satisfied by:** fbcc03a on the frontend trunk
  <br>Inverted on measurement: the value was "true" and the box never painted, so it was neither a credential leak nor a visible defect. The assignment is removed outright because the line sat one call-site edit from serializing a non-revocable token, and the errorMessage reset moved to the top of the method.
- **`F-MARGIN-WASTE-PANEL-CALLS-NOTHING`**
  <br>*four client routes with no backend handler at all*
  <br>**satisfied by:** MarginWasteController exists on the backend trunk; 9044589 landed on the frontend trunk
  <br>MEASURED TODAY. The four client routes now have handlers, and the coverage panel stops fabricating a reassuring "no waste recorded" for an absence.
- **`F-MEALS-LEVER-INERT`**
  <br>*the switchboard offers a Meals switch that reaches no guest*
  <br>**satisfied by:** withheld with a written reason, both kinds named
  <br>The ruling was withhold-with-a-reason and the closing lane did exactly that, plus a disclosure that the money-path flags are deployment configuration. The residual C3 gap is stated rather than faked and belongs to F-MEALS-LEVER-OPAQUE.
- **`F-MIG-CHAIN-STACKED`**
  <br>*a second lane silently carries an unmerged migration as its own tail*
  <br>**satisfied by:** 7e7c0a3ec + 17d9746bf..1de069061 on the backend trunk
  <br>The nine-migration stack merged into feature/restaurant-modules as one authored merge, all seven links receipted. Every branch that carried another lane's migration as its tail now has it as an ancestor. Re-measure the fourteen and clear.
- **`F-MRG-WASTE-PANEL-CALLS-NOTHING`**
  <br>*an absent feature reads to the venue as a failed read*
  <br>**satisfied by:** MarginWasteController on the backend trunk + 9044589/da7759a on the frontend trunk
  <br>MEASURED TODAY: the four routes now have handlers and the panel stops presenting an absence as a failed read.
- **`F-ONGOING-HIDES-A-LIVE-STATUS`**
  <br>*an order in transit appears in no column on the live board*
  <br>**satisfied by:** ongoing.vue at the frontend tip buckets DriverPickedUp and OpenCheck, described in past tense in its own comment
  <br>The venue's real operating screen could lose an order: invisible on the board and un-completable from the screen the venue works from. The failure mode was silence.
- **`F-REPUBLISH-DOUBLES-PLANNED-MINUTES`**
  <br>*a payroll column inflates every time a week is republished*
  <br>**satisfied by:** 726906fe5 on the backend trunk, measured today
  <br>All four readers now compose WorkforceScheduleSupport.CurrentLineageOnly. A payroll column inflated 480 -> 960 minutes on an identical republish, feeding the hours-export CSV, the labour band and the planned side of every variance — with paid minutes unaffected, so the gap between plan and actual was the number a manager reads.
- **`F-RESERVATION-CONFLICT-IGNORES-EXTRA-TABLES`**
  <br>*the client's conflict rule disagrees with the server's*
  <br>**satisfied by:** reservations.vue at the tip carries the set intersection over every table a reservation holds
  <br>Downgraded on measurement: the SERVER does catch it, so this was never a double-booking path — the cost was a lost draft and a message that was not quite true. C5 remains open: no browser arm, because the e2e fixture has no reservation endpoints.
- **`F-SPLICE-RESIDUE-IN-BRIEFS`**
  <br>*the old splice damage is still generating garbled briefs*
  <br>**satisfied by:** repaired structurally, 13 seams split
  <br>The condition names the seams and the briefs, not the lost prose. The seams were split and the line count reconciled; the truncated prose is deliberately left truncated. One confirming sweep of plan.md closes it.
- **`F-SUITE-PINS-THE-CHECKOUT-NAME`**
  <br>*one suite is red in every lane worktree in the estate*
  <br>**satisfied by:** the literal is gone at the frontend tip; SELF = path.basename(...) is derived
  <br>Same fix as F-ARTIFACT-STORE-TEST-CHECKOUT-BOUND. The pin still BITES, proven by mutation on production code: dropping the checkout name from the build id reds 3, an absolute path reds 2, a null world stamp reds 6.
- **`F-SURFBOARD-SAVE-CLEARS-TIPS`**
  <br>*every save silently turns tipping off*
  <br>**satisfied by:** surfboard.vue at the tip carries tipsEnabled
  <br>Every save silently turned tipping off for the venue, with the money consequence landing on the staff rather than on the operator who pressed the button.
- **`F-TRAIN-DISCLOSURE-EVIDENCE-IS-AN-ABORT`**
  <br>*the receipt is the crash it should have reported*
  <br>**satisfied by:** L-TRAINWIRE-ABORT landed on the backend trunk
  <br>The cited artifact was an aborted run — ResultSummary Failed against Counters failed=0 — caused by the very defect the lane introduced, and then cited as proof the work was sound. The tier completes now.
- **`F-TRAIN-EVIDENCE-SERVICE-UNCENSUSED`**
  <br>*two audit-stamping services the census never named, in two modules*
  <br>**satisfied by:** the derivation was built and corrected to two modules, agreeing on all 21 rows across two scanners sharing no code
  <br>Both uncensused services are named (Training 11/5 against a floor of 10/4; Meals 15/7 against 14/6, and the Meals one is a C4 money-path attribution row). VERIFY the derivation is on the trunk before clearing.
- **`F-TRAINWIRE-TIER-ABORTS`**
  <br>*a failing assertion killed the host that was formatting its failure*
  <br>**satisfied by:** L-TRAINWIRE-ABORT landed; the tier completes at the disclosure merge 4650/0/12
  <br>An Assert.All whose own failure formatting threw took the host down and hid a second red. Mutation is the cleanest artifact: forcing ActorIsSubject true makes the same assertion fail and the run now NAMES it.
- **`F-TRIPLETEX-CLAIM-EXPIRES-MID-CALL`**
  <br>*a rate limit, not an operator, opens a double-voucher path*
  <br>**satisfied by:** f3817eed9 on the backend trunk
  <br>A rate limit, not an operator, opened a double-voucher path: 5 x 120s = exactly the 10-minute staleness threshold, per call, and there are two. The claim window is now derived from the budget the code enforces.
- **`F-TRIPLETEX-PROMISES-IDEMPOTENCE-IT-LACKS`**
  <br>*the label I said was unbacked is backed*
  <br>**satisfied by:** retracted by its own author on measurement
  <br>"I raised this and every part of it was wrong." Its clears_when literally reads: this record is read once by anyone who would otherwise re-raise it — the world it described does not exist. It should be retracted rather than carried.
- **`F-TRIPLETEX-REFUSAL-READS-AS-FAILURE`**
  <br>*the guarantee working is painted as an error*
  <br>**satisfied by:** 94f06c7 on the frontend trunk
  <br>The idempotence guarantee working was painted red as "Feil", and what a red row invites is pressing it again — which is precisely the door the claim-expiry defect left open. The two composed into a defect neither had alone.
- **`F-UTLKVIT-PREDICATE-COLLISION`**
  <br>*two lanes hoisted the same predicate to different homes*
  <br>**satisfied by:** one predicate, six references, verified by count on the trunk
  <br>Landed as a273e013. The rival internal static is deleted; the composed base count is the exact union of both parents, so the merge lost no pin and duplicated none.
- **`F-UTLKVIT-SALE-ROW`**
  <br>*a credit sale still prints and copies as a proof of purchase*
  <br>**satisfied by:** merge a273e013 on feature/restaurant-modules
  <br>Landed on Sven's instruction and measured at the merge commit: zero conflicts, 4387/0/12. Merged rather than ported, which is the distinction the family turned on.
- **`F-WASTE-PANEL-REPORTED-A-FAILURE-IT-NEVER-ATTEMPTED`**
  <br>*and a green test held the fabrication up*
  <br>**satisfied by:** 9044589 on the frontend trunk
  <br>The browser walk recorded NO REQUEST WAS MADE while the panel printed "we could not fetch the waste" — a failure reported without being observed, held up by a passing test asserting a fabricated zero. The lane flipped that test rather than deleting it.
- **`F-WF-OPEN-SHIFTS-IGNORE-SUPERSESSION`**
  <br>*a worker is offered a shift she already won*
  <br>**satisfied by:** ea66353f9 on the backend trunk, measured today
  <br>A worker was offered a shift she had already won, with alreadyRequested false so it read as re-biddable, and the manager's side had no matching duplication — so the two screens disagreed about what was open.

---

## The full index — 310 rows, plan order

| flag | plan.md | sev | bucket | rank/kind |
|---|---|---|---|---|
| `F-EXCHANGE-GATE-MERGE` | 6970 | warn | agent-closable | T3 |
| `F-SHARED-REF-CLOBBER` | 7286 | warn | agent-closable | T3 |
| `F-MERGE-BREAKS-BUILD` | 7310 | warn | agent-closable | T3 |
| `F-CORS-ORIGINS-BY-INDEX` | 7482 | warn | sven-only | deploy-check |
| `F-CORS-EXPOSURE-REVERT` | 7567 | warn | agent-closable | T3 |
| `F-C5-NOT-WALKABLE` | 7661 | info | sven-only | policy-ruling |
| `F-CAPABILITY-URL-BLINDSPOT` | 7703 | info | sven-only | design-ruling |
| `F-ZSH-WORD-SPLIT` | 7996 | warn | agent-closable | T5 |
| `F-IDENTICAL-EXPRESSION-DIVERGENT-MEANING` | 8026 | info | agent-closable | T5 |
| `F-BRIEF-QUOTES-UNMERGED-STATE` | 8159 | warn | agent-closable | T4 |
| `F-JOURNEY-LEAVES-LEVERS-ON` | 8313 | warn | agent-closable | T4 |
| `F-OVERBROAD-TEST-FILTER` | 8338 | warn | agent-closable | T5 |
| `F-PROOF-HARNESS-NOT-THE-GUARD` | 8541 | info | agent-closable | T5 |
| `F-CLERK-EXITS-NAME-NO-INSTRUMENT` | 8569 | warn | agent-closable | T4 |
| `F-XZ-CREDIT-DOUBLE-LAND` | 8993 | warn | agent-closable | T3 |
| `F-DOCSYNC-WROTE-A-STALE-TRUTH` | 9071 | warn | agent-closable | T3 |
| `F-SPLICE-RESIDUE-IN-BRIEFS` | 9166 | warn | already-satisfied | stale |
| `F-OUTBOX-FLAKE-FIXED-TWICE` | 9293 | warn | agent-closable | T3 |
| `F-TWO-FINALIZE-CONTROLS` | 9350 | warn | agent-closable | T2 |
| `F-COERCION-MAKES-A-ZERO` | 9423 | warn | agent-closable | T1 |
| `F-LAND-OUTBOX-FLAKE-NOT-GUID` | 9611 | warn | agent-closable | T3 |
| `F-TRANSLATIONS-ARE-A-CHOKE` | 9635 | warn | sven-only | process-ruling |
| `F-THE-FIX-REPRODUCED-THE-DEFECT` | 9785 | info | agent-closable | T5 |
| `F-MRG-YIELD-NOWHERE` | 18389 | warn | agent-closable | T2 |
| `F-DUP-DISPATCH` | 19119 | warn | agent-closable | T5 |
| `F-MIG-CHAIN-STACKED` | 19140 | blocker | already-satisfied | stale |
| `F-WF-TWO-ADMINS-TWO-ENGAGEMENTS` | 19267 | blocker | agent-closable | T2 |
| `F-EF-UNNAMED-INDEX-REPLACES` | 19285 | warn | agent-closable | T4 |
| `F-WF-NOCORRECTION` | 19302 | blocker | agent-closable | T1 |
| `F-AZURE-FUNCKEY` | 19322 | blocker | sven-only | rotation (DEFERRED BY RULING) |
| `F-FIXTURE-NO-GATES` | 19343 | blocker | already-satisfied | stale |
| `F-MEALS-LEVER-INERT` | 19374 | blocker | already-satisfied | stale |
| `F-EV-ACCEPT-UNGATED` | 19417 | blocker | already-satisfied | stale |
| `F-EV-INQUIRY-UNGATED` | 19454 | blocker | sven-only | product-ruling |
| `F-FLAGS-FALSE-GUARANTEE` | 19475 | blocker | agent-closable | T3 |
| `F-UTLKVIT-SALE-ROW` | 19512 | blocker | already-satisfied | stale |
| `F-XZ-CREDIT-UNSPEC` | 19546 | blocker | agent-closable | T1 |
| `F-FILTER-NOT-CONTAINERFREE` | 19581 | warn | agent-closable | T5 |
| `F-EV-NO-GUEST-ORIGIN` | 19603 | blocker | already-satisfied | stale |
| `F-GR-UNCONFIRMED-EMAIL` | 19653 | blocker | agent-closable | T2 |
| `F-GR-DISPATCH-UNATTRIBUTED` | 19681 | blocker | agent-closable | T1 |
| `F-GR-SWEEP-ACTORLESS` | 19719 | warn | sven-only | design-ruling |
| `F-WT-THREE-LANES` | 19736 | warn | agent-closable | T5 |
| `F-MEALS-EIGHTH-READ` | 19759 | blocker | agent-closable | T3 |
| `F-MEALS-ACTOR-WORKLIST-STALE` | 19804 | warn | agent-closable | T3 |
| `F-MEALS-NO-SQL-ON-REQUOTE` | 19820 | blocker | agent-closable | T4 |
| `F-CONFIRM-BRUTEFORCE` | 19848 | blocker | agent-closable | T2 |
| `F-JOURNEY-GUARD-DECORATIVE` | 19875 | blocker | agent-closable | T4 |
| `F-GUARD-PROOF-NOT-IN-CI` | 19912 | warn | sven-only | ci-policy |
| `F-GIT-ADD-SWALLOW` | 19926 | warn | agent-closable | T5 |
| `F-FIXTURE-BACKUP-STALE` | 19941 | warn | agent-closable | T5 |
| `F-MEMCACHE-IN-TRYCATCH` | 19958 | blocker | agent-closable | T2 |
| `F-FIXTURE-BEHIND-BACKEND` | 19993 | blocker | agent-closable | T4 |
| `F-CAP-COUNTS-LANES` | 20133 | warn | agent-closable | T5 |
| `F-GR-CONFIRM-AGELESS` | 20152 | warn | sven-only | threshold |
| `F-ACCEPTANCE-IS-THE-CHOKE` | 20169 | blocker | sven-only | acceptance |
| `F-MRG-STATEMENT-UNATTRIBUTED` | 20224 | blocker | agent-closable | T1 |
| `F-ARTIFACT-STORE-OVERWRITES` | 20242 | blocker | agent-closable | T4 |
| `F-INVOICE-RETRY-ANONYMOUS` | 20311 | blocker | already-satisfied | stale |
| `F-CREDITNOTE-BEFORE-RENDER` | 20347 | warn | sven-only | product-ruling |
| `F-DEV-SERVERS-SHARE-BUILD` | 20360 | warn | agent-closable | T5 |
| `F-MRG-EPOCH-CAVEAT` | 20377 | warn | agent-closable | T4 |
| `F-ACCT-DUP` | 22186 | blocker | already-satisfied | stale |
| `F-WF-NOREG` | 22213 | warn | sven-only | legal |
| `F-WF-CATEGORY` | 22237 | warn | agent-closable | T1 |
| `F-WF-NODEPARTURE` | 22248 | warn | agent-closable | T1 |
| `F-PREF-UNREACHABLE` | 22267 | warn | agent-closable | T4 |
| `F-WOLT-DEAD` | 22292 | warn | agent-closable | T5 |
| `F-TRAIN-IK` | 22313 | info | sven-only | scope |
| `F-FE-CI-UNGATED` | 22322 | info | sven-only | ci-policy |
| `F-EV-CALLBACK` | 22329 | blocker | already-satisfied | stale |
| `F-EV-FAKE-DRIFT` | 22361 | warn | agent-closable | T4 |
| `F-GR-FALSE-EVIDENCE` | 22372 | blocker | already-satisfied | stale |
| `F-WF-NO-INVITE` | 22407 | blocker | agent-closable | T2 |
| `F-TRAIN-NO-EVIDENCE` | 22420 | warn | agent-closable | T2 |
| `F-MRG-FINALIZE-LAG` | 22439 | warn | agent-closable | T1 |
| `F-MEALS-LEVER-OPAQUE` | 22473 | warn | agent-closable | T1 |
| `F-AI-REQUEST-BODY` | 22491 | blocker | already-satisfied | stale |
| `F-STALE-SECURITY-ARTIFACT` | 22529 | warn | agent-closable | T5 |
| `F-WF-ACK-DUP` | 22547 | warn | agent-closable | T2 |
| `F-WF-CLOCK-UNLINKED` | 22584 | blocker | agent-closable | T2 |
| `F-WF-EXCHANGE-STALE-GRID` | 22598 | warn | agent-closable | T2 |
| `F-WF-PAYROLL-REKEY` | 22605 | warn | sven-only | vendor-choice |
| `F-MRG-ONBOARD-16` | 22612 | warn | agent-closable | T2 |
| `F-EV-HEALTHDATA` | 22622 | warn | sven-only | legal |
| `F-GR-HEALTH-DEAF` | 22633 | blocker | agent-closable | T1 |
| `F-VIPPS-REDACT-OPEN` | 22650 | blocker | agent-closable | T4 |
| `F-WF-CLOCK-LIES` | 22682 | warn | agent-closable | T1 |
| `F-TRAIN-PERSONREF-LEAK` | 22693 | warn | sven-only | product-ruling |
| `F-WF-PUSH-SILENT` | 22705 | blocker | agent-closable | T1 |
| `F-PERSONALLISTE-PRINT` | 22742 | blocker | agent-closable | T1 |
| `F-BE-TESTS-AMBIGUOUS` | 22766 | warn | agent-closable | T4 |
| `F-EV-ACCEPT-UNNAMED` | 22780 | warn | agent-closable | T1 |
| `F-DETACHED-MIGRATIONS` | 22791 | blocker | already-satisfied | stale |
| `F-TRAIN-TRUNCATE` | 22817 | info | sven-only | deployment-posture |
| `F-DISK-PRESSURE` | 22829 | warn | sven-only | host |
| `F-WF-BLIND-BIND` | 22843 | blocker | agent-closable | T1 |
| `F-GR-NEWSLETTER-CROSS` | 22861 | blocker | agent-closable | T4 |
| `F-SCHED-DEAD-CLASS` | 22907 | warn | sven-only | tool |
| `F-PROBE-ROOT-WRONG-WORLD` | 22922 | blocker | agent-closable | T4 |
| `F-INVOICE-ROUTES-ANONYMOUS` | 22972 | blocker | already-satisfied | stale |
| `F-CONFIRM-MERGE-RECEIPT-TRAP` | 23028 | blocker | already-satisfied | stale |
| `F-LIMITERS-PER-PROCESS` | 23068 | warn | sven-only | deployment-constraint |
| `F-SQL-HEADROOM` | 23087 | warn | sven-only | host |
| `F-UTLKVIT-PREDICATE-COLLISION` | 23110 | blocker | already-satisfied | stale |
| `F-EVIDENCE-GITIGNORED` | 23156 | warn | agent-closable | T4 |
| `F-SCROLLLOCK-FLAKE` | 23176 | warn | agent-closable | T5 |
| `F-WIRE-TIER-DIRTIES-ARTIFACTS` | 23190 | warn | agent-closable | T4 |
| `F-ARTIFACT-STORE-TEST-CHECKOUT-BOUND` | 23208 | warn | already-satisfied | stale |
| `F-PROD-CORS-WILDCARD` | 23222 | blocker | sven-only | deploy |
| `F-POS-CLOCK-NO-CLIENT` | 23265 | blocker | agent-closable | T2 |
| `F-POS-403-UNREACHABLE` | 23313 | warn | sven-only | contract-ruling |
| `F-MEALS-CORS-DOUBLE-LAND` | 23330 | warn | agent-closable | T3 |
| `F-EV-GUESTLINK-FORK` | 23349 | blocker | agent-closable | T3 |
| `F-ACTORKIND-CONVERGENCE-NOT-FORK` | 23424 | warn | agent-closable | T5 |
| `F-GR-PROVIDER-ACCOUNT-UNGATED` | 23448 | blocker | agent-closable | T2 |
| `F-ROLLBACK-LEAVES-TRACKED-STATE` | 23464 | blocker | agent-closable | T3 |
| `F-CENSUS-FLOORS-SILENTLY-INVALIDATED` | 23484 | warn | already-satisfied | stale |
| `F-ORE-PADDING-IN-TWO-CLIENTS` | 23500 | warn | agent-closable | T1 |
| `F-POS-TENDER-WIRE-REINTRODUCES-TWO` | 23519 | blocker | agent-closable | T3 |
| `F-CH-COOKIE-WITHHELD` | 23564 | warn | sven-only | market-ruling |
| `F-REGISTRABLE-DOMAIN-TWICE` | 23580 | warn | agent-closable | T3 |
| `F-401-UNREACHABLE-OVER-HTTP` | 23593 | warn | agent-closable | T4 |
| `F-GR-PROVIDER-GATE-PIN-VACUOUS` | 23614 | warn | agent-closable | T4 |
| `F-GR-SEND-GATE-JOURNEY-RED` | 23628 | warn | agent-closable | T4 |
| `F-GR-NEWSLETTER-SELF-APPROVE` | 23644 | warn | sven-only | policy-ruling |
| `F-EXIT-PREFIX-IS-A-STAMP` | 23663 | blocker | sven-only | tool |
| `F-BACKEND-FACTS-OFF-BRANCH` | 23750 | blocker | agent-closable | T4 |
| `F-INTEGRATION-BRANCHES-UNCOMPOSED` | 23766 | blocker | already-satisfied | stale |
| `F-MEALS-FUNDING-AUTHORITY-COLLISION` | 23787 | blocker | sven-only | vocabulary-ruling |
| `F-CENSUS-IS-A-THREE-WAY` | 23814 | warn | already-satisfied | stale |
| `F-EVENTS-OUTBOX-FOURTH-ANSWER` | 23847 | warn | agent-closable | T3 |
| `F-PLAN-NOT-IN-GIT` | 23863 | blocker | sven-only | push |
| `F-MEALS-SUPERSEDE-BYPASSES-AUTHORITY` | 23932 | blocker | agent-closable | T3 |
| `F-MRG-WASTE-PANEL-CALLS-NOTHING` | 23951 | blocker | already-satisfied | stale |
| `F-EV-CONCURRENCY-GUARD-UNTESTED` | 23968 | blocker | agent-closable | T4 |
| `F-EV-REFUND-LINE-UNREACHABLE` | 23986 | warn | agent-closable | T5 |
| `F-JOURNAL-FINALIZE-INDEX-DROPPED` | 23999 | blocker | agent-closable | T2 |
| `F-TRAIN-EVIDENCE-SERVICE-UNCENSUSED` | 24023 | blocker | already-satisfied | stale |
| `F-FAILSPEC-DOES-NOT-HOLD-ITS-LANE` | 24060 | warn | sven-only | tool |
| `F-COMMIT-CITES-WHAT-IT-LACKS` | 24090 | warn | agent-closable | T4 |
| `F-MRG-INGREDIENT-FACTOR-ZERO` | 24122 | warn | agent-closable | T1 |
| `F-CONDITIONS-HAVE-NO-RETURN-PATH` | 24144 | warn | sven-only | tool |
| `F-GR-NO-EXIT-FROM-A-LIST` | 24181 | blocker | agent-closable | T1 |
| `F-MEALS-REFUSAL-NAMES-THE-INVITEE` | 24212 | warn | agent-closable | T1 |
| `F-GUARD-PROOF-COULD-NOT-EXECUTE` | 24236 | warn | agent-closable | T4 |
| `F-BACKEND-CHECKOUT-IS-A-LANE-BRANCH` | 24263 | warn | agent-closable | T4 |
| `F-EMPTY-GREP-READS-AS-ABSENCE` | 24283 | warn | agent-closable | T4 |
| `F-CROSS-REPO-EVIDENCE-UNVERIFIABLE` | 24309 | warn | agent-closable | T4 |
| `F-COMMIT-TREE-LEAVES-NO-REF` | 24332 | warn | agent-closable | T4 |
| `F-SUITE-PINS-THE-CHECKOUT-NAME` | 24381 | warn | already-satisfied | stale |
| `F-I18N-FALLBACK-MASKS-A-MISSING-KEY` | 24426 | info | agent-closable | T4 |
| `F-WF-ACKNOWLEDGE-SHOWS-NOTHING` | 24445 | warn | agent-closable | T1 |
| `F-INVOICE-PRICELABEL-STILL-SHADOWS` | 24472 | warn | agent-closable | T3 |
| `F-SURVIVING-FIXTURE-SERVES-STALE-CODE` | 24522 | warn | agent-closable | T4 |
| `F-OFFER-MIXED-CANNOT-SAY-NOT-APPLICABLE` | 24584 | warn | agent-closable | T1 |
| `F-HOST-VM-EATS-THE-CEILING` | 24606 | warn | sven-only | host |
| `F-CORE-PIN-ON-NO-REMOTE` | 24720 | blocker | sven-only | push |
| `F-FLAG-PAGE-PROMISED-ONE-BEHAVIOUR-FOR-SIX` | 24761 | warn | agent-closable | T1 |
| `F-TRAIN-DISCLOSURE-UNREADABLE` | 24792 | warn | agent-closable | T2 |
| `F-THE-CONFLICT-IS-A-DECOY` | 24820 | warn | agent-closable | T3 |
| `F-C2-EXAMPLE-NO-LONGER-REPRODUCES` | 24852 | info | sven-only | intent |
| `F-DEAD-WORLD-ANSWERS-HEALTHY` | 24897 | warn | agent-closable | T4 |
| `F-LIVE-WORLD-5961-DIRTY` | 24922 | warn | sven-only | host |
| `F-NEEDS-PLACEHOLDER-REFUSES-A-GOOD-RETURN` | 24953 | warn | sven-only | tool |
| `F-LANE-COMMITS-CARRY-SIBLING-HUNKS` | 25014 | warn | agent-closable | T3 |
| `F-CLOCKOUT-ANSWERS-OPEN` | 25045 | blocker | agent-closable | T1 |
| `F-CORE-DISCOVERY-PREFERS-THE-SHARED-CHECKOUT` | 25076 | warn | agent-closable | T3 |
| `F-PRIVATE-INDEX-COMMIT-CAN-BUILD-AN-UNRUN-TREE` | 25102 | warn | agent-closable | T4 |
| `F-ARCHIVED-TEST-INFLATES-THE-GREEN` | 25137 | warn | already-satisfied | stale |
| `F-RETREC-GUARD-IS-DEAD` | 25169 | warn | agent-closable | T4 |
| `F-FLAG-CONDITIONS-ARE-NOT-TESTABLE` | 25192 | warn | agent-closable | T4 |
| `F-REVIEWS-CANNOT-BE-JOINED-TO-LANES` | 25240 | warn | agent-closable | T5 |
| `F-EXISTENCE-CHECKS-REPORT-PRESENT-FILES-ABSENT` | 25266 | warn | sven-only | tool |
| `F-BARE-PATHSPEC-PROVES-A-FALSE-ZERO` | 25344 | warn | agent-closable | T4 |
| `F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED` | 25384 | blocker | agent-closable | T1 |
| `F-MIG-LEDGER-THROW-NUMBER-WRONG` | 25409 | warn | agent-closable | T5 |
| `F-FLAG-PROBES-CANNOT-COMPARE-A-VALUE` | 25425 | blocker | sven-only | tool |
| `F-WRONG-CLOCK-DEMOTES-A-TRUE-FINDING` | 25459 | warn | agent-closable | T4 |
| `F-RF1313-CREDIT-SALE-CLAIM-UNBACKED` | 25497 | blocker | sven-only | legal |
| `F-GROWTH-SQL-TIER-RED-BY-CONSTRUCTION` | 25530 | warn | already-satisfied | stale |
| `F-MIG22-CLAIMED-TWICE` | 25554 | blocker | agent-closable | T3 |
| `F-SHELL-FALLBACK-MASQUERADES-AS-THE-FIRST-BRANCH` | 25612 | info | agent-closable | T4 |
| `F-NEGATIVE-SALE-REFUNDS-THE-LISTED-PRICE` | 25650 | blocker | agent-closable | T1 |
| `F-JOURNEY-RECEIPT-DOES-NOT-NAME-ITS-FIXTURE` | 25673 | blocker | agent-closable | T4 |
| `F-MIG17-WIDTH-HALF-THE-SPEC` | 25736 | blocker | agent-closable | T2 |
| `F-THROW-50018-ALREADY-SPENT` | 25755 | blocker | agent-closable | T5 |
| `F-INT-LEDGER-CEILING-SIX-LOW` | 25778 | blocker | agent-closable | T5 |
| `F-CONSENT-SUMMARY-REASONS-NOT-IN-THE-ENUM` | 25798 | warn | agent-closable | T1 |
| `F-JOURNEY-GUARD-WAS-DEAD` | 25847 | blocker | agent-closable | T4 |
| `F-WORKTREE-WITHOUT-MODULES-FAILS-SILENTLY` | 25939 | blocker | agent-closable | T4 |
| `F-SHARED-CHECKOUT-DIRT-IS-UNRECORDED-WORK` | 26036 | warn | agent-closable | T3 |
| `F-EVIDENCE-IN-THE-TREE-DIRTIES-ITS-OWN-BUILD-ID` | 26078 | warn | agent-closable | T4 |
| `F-TRANSLATION-MERGE-DUPLICATES-A-KEY-SILENTLY` | 26135 | blocker | agent-closable | T3 |
| `F-NORWEGIAN-ONLY-KEYS-RENDER-NORWEGIAN-TO-EVERYONE` | 26158 | warn | agent-closable | T1 |
| `F-ARTIFACTS-FROM-A-HARNESS-THE-BRANCH-LACKS` | 26179 | blocker | agent-closable | T4 |
| `F-LINT-IS-ENABLED-AND-WIRED-INTO-NOTHING` | 26227 | warn | agent-closable | T4 |
| `F-TRANSLATION-STALE-BUT-PRESENT` | 26275 | warn | agent-closable | T1 |
| `F-FIXTURE-PRINTS-WORDS-THE-PRODUCT-CANNOT-SAY` | 26329 | blocker | agent-closable | T4 |
| `F-SV-NUMBER-PASSES-THE-FODSELSNUMMER-GUARD` | 26364 | blocker | agent-closable | T1 |
| `F-CLOCKSCREEN-FOUR-BRANCHES-NO-KEYS` | 26388 | blocker | agent-closable | T3 |
| `F-FRONTEND-ENUM-MIRROR-SHORT-A-MEMBER` | 26426 | warn | agent-closable | T1 |
| `F-CH-BUILD-COPY-HAS-NO-DOM-GUARD` | 26485 | blocker | already-satisfied | stale |
| `F-FINISHED-WORK-ON-NO-REF` | 26526 | blocker | agent-closable | T3 |
| `F-FOCUSTRAP-TEARDOWN-NEVER-RUNS` | 26665 | warn | already-satisfied | stale |
| `F-RECEIPT-BLANK-PAYER-LINE` | 26685 | warn | agent-closable | T1 |
| `F-MIXIN-LABELS-CANNOT-TRANSLATE` | 26733 | blocker | agent-closable | T1 |
| `F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM` | 26758 | warn | agent-closable | T1 |
| `F-EVERY-LANE-DEPENDENCY-ENDS-AT-SVEN` | 26779 | blocker | sven-only | acceptance |
| `F-SYMLINKED-MODULES-COMPILE-THE-OTHER-TREE` | 26811 | blocker | agent-closable | T4 |
| `F-A-SUITE-RUN-REWRITES-COMMITTED-ARTIFACTS` | 26841 | warn | agent-closable | T4 |
| `F-FRONTEND-DECLARES-STATES-THE-SERVER-CANNOT-SEND` | 26866 | warn | agent-closable | T5 |
| `F-A-RERUN-TAKES-THE-CANONICAL-SLOT` | 26906 | blocker | agent-closable | T4 |
| `F-NOTHING-RUNS-A-SUITE-IN-CI` | 26932 | blocker | sven-only | ci-policy |
| `F-APPEND-ONLY-RECEIPTS-HAVE-NO-READER` | 26961 | warn | sven-only | product-ruling |
| `F-NPM-INSTALL-CANNOT-SUCCEED` | 26984 | blocker | agent-closable | T3 |
| `F-BOTH-PROBES-GATING-THE-PREF-FLAG-ARE-MISAIMED` | 27009 | warn | agent-closable | T4 |
| `F-STASH-IS-SHARED-ACROSS-WORKTREES` | 27032 | warn | agent-closable | T5 |
| `F-MARGIN-MODEL-DRIFTS-FROM-ITS-CHAIN` | 27063 | warn | agent-closable | T2 |
| `F-SQL-CONTAINERS-FROM-EARLIER-SESSIONS-STILL-HOLD-THE-HOST` | 27084 | warn | sven-only | host |
| `F-THE-DEFAULT-TEST-FILTER-CLAIMS-A-CONTAINER-SLOT` | 27103 | warn | agent-closable | T5 |
| `F-REVIEWERS-LOSE-THE-RUNS-THEY-WAIT-ON` | 27126 | warn | agent-closable | T5 |
| `F-MY-LIVENESS-CHECK-NEVER-MEASURED-ANYTHING` | 27150 | warn | agent-closable | T4 |
| `F-A-VERIFIED-LANE-RESTS-ON-A-FAILED-RUN` | 27189 | blocker | agent-closable | T4 |
| `F-THE-BRANCH-EXISTS-ON-NO-REMOTE` | 27221 | blocker | sven-only | push |
| `F-THE-SUITE-IS-RED-ON-A-FAITHFUL-CLONE` | 27244 | warn | agent-closable | T4 |
| `F-GROWTH-NO-LIVE-CONFIRM-LINK` | 27263 | blocker | sven-only | product-ruling |
| `F-GROWTH-MODULE-LEVER-CANNOT-TURN-ON` | 27289 | blocker | agent-closable | T1 |
| `F-MODULE-MASTERS-ARE-UNDECLARED-AND-INVISIBLE` | 27327 | blocker | agent-closable | T1 |
| `F-MEALS-MONEY-FLAGS-HAVE-NO-LEVER` | 27355 | blocker | sven-only | product-ruling |
| `F-MEALS-BOARD-SAYS-OFF-OVER-A-LIVE-MODULE` | 27382 | warn | agent-closable | T1 |
| `F-TRAIN-INVISIBLE-ON-A-FRESH-STORE` | 27406 | blocker | agent-closable | T4 |
| `F-LIVE-WORLD-ONE-HUMAN` | 27429 | blocker | sven-only | credential-issue |
| `F-PROD-STORES-APIKEY-HARDCODED` | 27473 | blocker | sven-only | rotation |
| `F-PROD-BEARER-IS-SCRIPT-READABLE` | 27492 | blocker | sven-only | deploy + rotation |
| `F-LOGIN-CENTURY-TOKEN` | 27538 | blocker | sven-only | product-ruling + rotation |
| `F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH` | 27591 | blocker | agent-closable | T4 |
| `F-LOGINMODAL-MOUNTED-TWICE` | 27630 | warn | already-satisfied | stale |
| `F-LOGINMODAL-SUCCESS-SHOWS-A-BLOB` | 27659 | warn | already-satisfied | stale |
| `F-JEST-COLLECTS-LANE-FILES` | 27688 | warn | already-satisfied | stale |
| `F-TRAINWIRE-TIER-ABORTS` | 27704 | blocker | already-satisfied | stale |
| `F-POWERUSER-CODE-IS-COMMITTED` | 27744 | blocker | sven-only | rotation |
| `F-NEWSLETTER-DISPATCH-DEAD-ON-CHAIN` | 27790 | blocker | agent-closable | T1 |
| `F-PUBLISH-DOUBLE-OUTBOX` | 27827 | warn | agent-closable | T4 |
| `F-ADMINPAGE-IGNORES-ITS-RELOAD` | 27853 | warn | agent-closable | T2 |
| `F-DEV-SERVER-REUSE-PASSES-A-MUTANT` | 27867 | warn | agent-closable | T4 |
| `F-JWT-SIGNING-KEY-COMMITTED` | 27884 | blocker | sven-only | rotation |
| `F-PLAN-SNAPSHOT-CARRIES-A-CREDENTIAL` | 27910 | blocker | sven-only | owner-act |
| `F-INVITATION-CLAIM-IGNORES-THE-MODULE` | 27954 | warn | sven-only | product-ruling |
| `F-MEALS-ENROLMENT-HAS-NO-CALLER` | 28001 | blocker | agent-closable | T2 |
| `F-MEALS-STATEMENT-CLIENT-CLAIMS-A-PAGE-THAT-IS-NOT-HERE` | 28022 | warn | agent-closable | T5 |
| `F-RUNBOOK-CANNOT-START-A-COLD-MACHINE` | 28036 | warn | agent-closable | T2 |
| `F-MARGIN-WASTE-PANEL-CALLS-NOTHING` | 28055 | blocker | already-satisfied | stale |
| `F-SHIPPED-BRANCH-IS-NOT-WHAT-THE-CHECKOUT-SHOWS` | 28072 | blocker | agent-closable | T3 |
| `F-ONGOING-HIDES-A-LIVE-STATUS` | 28093 | blocker | already-satisfied | stale |
| `F-KITCHEN-CLOCK-FREEZES-AFTER-LOGIN` | 28111 | blocker | already-satisfied | stale |
| `F-DELIVERY-TOGGLES-FAIL-SILENTLY` | 28134 | blocker | already-satisfied | stale |
| `F-RESERVATION-CONFLICT-IGNORES-EXTRA-TABLES` | 28177 | warn | already-satisfied | stale |
| `F-CORE-ADMIN-DEAD-SURFACES` | 28207 | warn | agent-closable | T2 |
| `F-TRAIN-DISCLOSURE-EVIDENCE-IS-AN-ABORT` | 28229 | blocker | already-satisfied | stale |
| `F-DEV-BUILD-POINTS-AT-PRODUCTION` | 28256 | blocker | already-satisfied | stale |
| `F-DINTERO-SAVE-WIPES-PAYMENT-CONFIG` | 28273 | blocker | already-satisfied | stale |
| `F-SURFBOARD-SAVE-CLEARS-TIPS` | 28312 | blocker | already-satisfied | stale |
| `F-TRIPLETEX-PROMISES-IDEMPOTENCE-IT-LACKS` | 28328 | info | already-satisfied | stale |
| `F-WORLD-FACTS-ARE-GREEN-IN-THE-WRONG-DIRECTION` | 28352 | blocker | agent-closable | T4 |
| `F-SQL-SLOT-GATE-IS-ONLY-A-START-CONDITION` | 28382 | warn | agent-closable | T4 |
| `F-TRIPLETEX-CLAIM-EXPIRES-MID-CALL` | 28413 | blocker | already-satisfied | stale |
| `F-TRIPLETEX-REFUSAL-READS-AS-FAILURE` | 28444 | warn | already-satisfied | stale |
| `F-KRAVIA-MESSAGE-NULLED-BY-EVERY-DINTERO-SAVE` | 28465 | warn | agent-closable | T1 |
| `F-NATIVE-ADMIN-CARRIES-THE-SAME-ORE-FLOOR` | 28485 | warn | agent-closable | T1 |
| `F-ADMIN-LOGOUT-LANDS-ON-A-BLANK-PAGE` | 28504 | blocker | already-satisfied | stale |
| `F-IN-PAGE-SIGN-IN-IS-DEAD-END-TO-END` | 28557 | blocker | already-satisfied | stale |
| `F-PENDING-MODEL-CHECK-HAS-A-BLIND-SPOT` | 28611 | warn | agent-closable | T4 |
| `F-AGENT-KILLED-THE-OWNERS-DEV-SERVER` | 28634 | blocker | agent-closable | T5 |
| `F-EF-NEVER-DECLARES-A-TRIGGER` | 28660 | blocker | already-satisfied | stale |
| `F-DEV-EXCEPTION-PAGE-ECHOES-THE-BEARER` | 28754 | blocker | sven-only | deploy-check |
| `F-EVENTS-SPACE-CANNOT-BE-ATTACHED` | 28771 | warn | agent-closable | T2 |
| `F-EVENTS-VIPPS-REFUSAL-IS-UNTYPED` | 28785 | warn | agent-closable | T1 |
| `F-WF-OPEN-SHIFTS-IGNORE-SUPERSESSION` | 28805 | blocker | already-satisfied | stale |
| `F-WF-WORKER-CANNOT-SEE-HER-OWN-REQUESTS` | 28829 | warn | agent-closable | T1 |
| `F-MARGIN-SETUP-DAY-RECONCILES-TO-ZERO` | 28847 | blocker | agent-closable | T1 |
| `F-MARGIN-CSV-TIMESTAMP-IS-TWO-HOURS-EARLY` | 28874 | warn | agent-closable | T1 |
| `F-OWNERS-CHECKOUT-HOLDS-UNOWNED-WORK` | 28888 | blocker | agent-closable | T3 |
| `F-JOURNEY-FILTER-DISCARDS-A-404` | 28908 | warn | agent-closable | T4 |
| `F-WASTE-PANEL-REPORTED-A-FAILURE-IT-NEVER-ATTEMPTED` | 28922 | warn | already-satisfied | stale |
| `F-COMPANY-REFUND-BOOKS-A-CASH-PAYOUT` | 28940 | blocker | already-satisfied | stale |
| `F-COMPANYACCOUNT-BLOCKED-BY-THE-APPROVAL-GATE` | 28986 | warn | sven-only | product-ruling |
| `F-ISPOWERUSER-IS-A-COLUMN-NOTHING-WRITES` | 29002 | blocker | agent-closable | T2 |
| `F-GROWTHAUDIT-TABLE-MISSING-FROM-THE-GROWTH-MIGRATION` | 29019 | blocker | already-satisfied | stale |
| `F-CONSUMER-MENU-EMPTY-WITHOUT-CATEGORY-IMAGES` | 29041 | blocker | agent-closable | T1 |
| `F-REWARDS-STATS-DIVIDES-BY-ZERO` | 29056 | warn | agent-closable | T1 |
| `F-REPUBLISH-DOUBLES-PLANNED-MINUTES` | 29070 | blocker | already-satisfied | stale |
| `F-EXCHANGE-AWARD-BLOCKED-BY-A-STALE-ROW` | 29096 | warn | agent-closable | T1 |
| `F-FIRST-AFFECTED-REVISION-CAN-BE-SUPERSEDED` | 29114 | warn | already-satisfied | stale |
| `F-CONSUMER-READS-CATEGORY-IMAGE-UNGUARDED` | 29134 | blocker | agent-closable | T1 |
| `F-PROD-BEARER-COMMITTED-IN-BRUNO` | 29159 | blocker | sven-only | rotation |
| `F-DEPLOY-NEEDS-FOUR-APP-SETTINGS-FIRST` | 29175 | blocker | sven-only | deploy |
| `F-GROWTHAUDIT-MISSING-AT-THE-MERGE-TIP` | 29199 | blocker | already-satisfied | stale |
| `F-TRIPLETEX-CALL-BUDGET-UNDERCOUNTS-THE-WORST-CASE` | 29242 | warn | agent-closable | T5 |
| `F-TRIPLETEX-STALE-RECOVERY-IS-LONGER-THAN-ITS-STATED-TEN-MINUTES` | 29247 | warn | agent-closable | T5 |
| `F-BY-SIDE-CONFLICT-RESOLUTION-HAS-NOW-COST-FOUR-TIMES` | 29252 | warn | agent-closable | T3 |
| `F-STALE-HUSKY-HOOK-BLOCKS-EVERY-COMMIT` | 29257 | warn | agent-closable | T5 |
| `F-PARTNER-FEED-DROPS-IMAGELESS-CATEGORIES-TOO` | 29280 | warn | sven-only | contract-ruling |
| `F-ADMINAPP-KEYSTORE-PASSWORD-IN-A-COMMITTED-SCRIPT` | 29285 | blocker | sven-only | rotation |
| `F-EVENTS-ACCEPTOR-CODE-IS-A-PINNED-PUBLIC-CONTRACT` | 29290 | warn | agent-closable | T3 |
| `F-DEMO-ACT5-CLAIM-NO-LONGER-REPRODUCES` | 29295 | warn | agent-closable | T5 |
| `F-TWO-BACKEND-COMMITS-LEFT-OFF-THE-TRUNK-BY-NAME` | 29300 | warn | agent-closable | T3 |
| `F-ASSERT-NOT-PROD-IS-UNWIRED` | 29305 | warn | agent-closable | T4 |
| `F-SIGN-IN-IGNORES-THE-REDIRECT-ITS-OWN-GUARD-WROTE` | 29310 | warn | agent-closable | T2 |
| `F-SEND-KODE-BEFORE-HYDRATION-SENDS-NOTHING` | 29315 | warn | agent-closable | T1 |

---

## What this list says about the backlog

**156 of the 310 have an empty `cleared_by`** — I re-measured that rather than inheriting the brief's
137, which counted blockers and warnings only. Nothing in the plan is scheduled to close any of them.
After this sort that number stops being one problem: 53 need no lane at all because the world already
satisfies them, 60 are waiting on an owner act that no amount of dispatch will produce, and **197 are
work an agent can be sent at today**.

**Four owner acts close a disproportionate share.**

- **One CI call** — do suites run in CI on this host, or is local-only recorded as deliberate — closes
  three flags outright and settles the other half of the lint gate.
- **One push per repository** closes three and de-risks everything else on this laptop: 135 frontend
  commits, 507 backend commits, the pinned submodule object and the entire plan directory are on one
  disk, and a real clone stops at `pathspec did not match`.
- **One rotation sitting** closes the ten-row credential group. **`F-JWT-SIGNING-KEY-COMMITTED` is the
  one to rule first** — it is the only credential where forging a `PowerUserRole` token needs **no
  login at all**, and that role is StoreAdmin of every store on tokens that never expire.
- **One acceptance sitting** unblocks the lane graph, which is `0 accepted` against 64 open lanes with
  none unblocked. The gate is doing exactly what it was built to do, which is why no agent can help.

**The largest agent bucket is not the largest risk.** Tier 4 — instruments that lie — is 60 rows, the
biggest single tier, and Tier 1 is 48. But Tier 1 is where a person is told something false about money
or about a document an inspector may demand, and a plan that works Tier 4 first will keep producing
trustworthy measurements of a product that is wrong on screen.

**The one structural fix worth doing before the rest**: `F-FLAG-CONDITIONS-ARE-NOT-TESTABLE`. Until a
flag can be closed by measurement, this list has to be re-derived by hand every time somebody asks what
is left — which is the cost this lane exists to remove and cannot remove by itself.
