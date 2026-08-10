# L-WHICH-JOURNEYS-ARE-REAL — the journey census, and the six walks the next wave should be

Read-only derivation, 2026-08-06. Sources: `test/e2e/journeys/**` (33 admin + 6 consumer specs, read in
full), `artifacts/journeys/` (40 canonical records + `runs/` history + `runs/ledger.jsonl`, 316 lines),
`test/e2e/support/journey-assertions.js`, `playwright.config.js`, `docs/plan/plan.md` features
FT-WORKFORCE…FT-GROWTH, `docs/plan/walks/`, the lane returns that claim journey evidence, and
`/Users/svendaneel/okam/web-livewalk/artifacts/journeys/WALK-RECORD.md`.

## Ground rules the table rests on

- **"Ever passed live" is read off the run ledger, not off prose.** A run is live only when its ledger
  line says `backend: "live"` and its key names the origin (`live-<port>-<sha>`). The canonical-slot
  overwrite defect (L-LIVE-HARNESS-REVIEW) is closed: `runs/` keeps fixture and live records side by
  side, and `canonicalHeldBy` stops a fixture rerun from replacing live evidence.
- **The complete live-pass history is four journeys.** From `runs/ledger.jsonl`:
  `workforce-flag-lever` (2026-08-02, `wt-lwr-api@3579bbb` — a **lane** world), `workforce-schedule-publish`
  (2026-08-02, build **unidentified**), `events-deposit-precondition` (2026-08-02, build unidentified,
  1.8 s, read-only), `workforce-week-run-two-humans` (2026-08-06 14:32, `wt-lwtwo-api@8e2b57de8` — the
  **old** trunk binary, 48 commits behind). **No harness journey has ever passed against the current
  binary `118f92fb9`.** The only evidence against it is the clerk's four walk scripts
  (`web-livewalk/artifacts/journeys/walk*.js`, WALK-RECORD, 7 journeys, zero failed requests, zero
  console errors) — which file no ledger entries and assert far less than the specs do.
- **Live selection is by absence of `@fixture`** (`playwright.config.js:142`,
  `grepInvert: LIVE_API ? /@fixture/`). 13 spec files carry `@fixture` and are excluded from live mode;
  `@fixture` is defined as "depends on state only the fixture has" and the default tag
  (`support/journey.js:836-837`). The tag is therefore a *claim*, and for at least one journey
  (`events-guest-proposal-accept`) the claim is wrong in the conservative direction — see Events.
- **"Could it fail" was answered per assertion, not per suite**, by two full-spec read-throughs
  calibrated on the four historical vacuities documented in `journey-assertions.js:5-27`. Where a
  journey was actually *made* to fail — mutation flips, live MUTANT probes — that is recorded, because
  a proven red is stronger than any reading.

Verdict words: **proven** = has been made to go red (mutation/live probe evidence named);
**strong** = the core assertion would red on regression per line-level reading; **holes** = strong core
with named lines that cannot fail or pass on wrong output; **weak** = the core claim itself tolerates a
wrong answer; **orphan** = artifact without a runnable spec.

---

## FT-WORKFORCE — 9 runnable journeys, 1 orphan; 3 of 4 estate live passes live here

| journey | exists (spec@trunk) | ever passed live | asserts something that could fail |
|---|---|---|---|
| workforce-schedule-publish | yes | **yes** — 2026-08-02, build unidentified | **strong**: `assertRulePackResults` two-way set equality on the 11-rule pack, `assertPricedWage`, `assertFirstRevision` (all three repaired historical vacuities). Hole: the "no plan" badge text is read and never compared (:114-118) |
| workforce-flag-lever | yes | **yes** — 2026-08-02, `wt-lwr-api@3579bbb` (lane world, not trunk) | **strong, with two live issues**: (a) it transcribes 18 catalog keys while `fixture/world.js:337` serves 19 (`workforce.export`) — **it reds in ordinary fixture runs today**, which is the transcription doing its job and a drift nobody has reconciled; (b) :221 still carries `toContainText('Revisjon')`, historical vacuity #4, fixed in the sibling and not here |
| workforce-week-run-two-humans | yes (live-only: `test.skip(!LIVE)`) | **yes** — 2026-08-06 14:32, **old binary** `8e2b57de8` | **proven**: two live MUTANT probes (`MUTANT-noflag-publication`, `MUTANT-noflag-selfservice`, ledger 14:34-14:37) went red against the live world. Strongest single assert: publisher-id ≠ acknowledger-id, both read off the API's own answers (:361). Holes: :446 implied by :445; four bare `toHaveCount(0)` in one step |
| workforce-timesheet-export | yes | no — fixture only | **strong with holes**: CSV cell `''` (not `0`) for MISSING_PUNCH read off downloaded bytes (:319). Holes: approver expectation imported from the same fixture module that serves it (:209, the CATALOG_KEYS self-agreement shape); :212 negative compares a GUID against `'staff-1'` — can never be equal |
| workforce-publication-receipts | yes | no — fixture only | **strong**: publish-toast count vs roster panel count, two independent server answers (:183). Hole: :233 asserts absence of a phrase this surface never renders |
| workforce-role-catalogue | yes | no — fixture-hard (store 44 exists in no live world) | **strong**: network-log proof of exactly one role write (:210) + exact option-set equality both sides of the change. Hole: :212-214 tautological by slice construction — every element is a GET because the slice was cut at the first non-GET |
| workforce-invitation-onboarding | yes | no — fixture only | **strong**: pasted token survives in-place sign-in with no navigation (:236). Holes: `history.length` read, never asserted (:207); code length > 8 and the word `utløper` are the only claims on the credential |
| workforce-pos-punch | yes | no — fixture-only POS world | **strong**: two `HH:MM` cells on the row (:216). Hole: :243 `.not.toHaveText` passes when the locator matches nothing |
| workforce-delivery-failures | yes | no — fixture only (needs a bouncing mailbox + rejecting gateway) | **strong**: gave-up rows = count chip AND waiting rows = waiting chip, tier separation (:186-187). Hole: :183 `expect(locator).not.toBe(null)` is dead — a Locator is never null |
| workforce-punch-correction | **no — orphan.** Canonical artifact `passed/fixture` sits in `artifacts/journeys/`, spec exists only on a candidate branch (L-CANDIDATE-JOURNEYS-ON-ARRIVAL) | no | **cannot go red: nothing to run.** Reads as coverage in the artifact directory and is not |

Also in flight, not on trunk: `workforce-invitation-list-revoke` and `workforce-invitation-revoke-claimed`
passed fixture in the `web-livewalk` worktree at 18:10 today — a lane's evidence, not the trunk's.
The three authored human walks in `docs/plan/walks/` (correction path, blind bind, contact) target
**unlanded lane pairs** — the trunk's `workforce-personnel-list.vue` has no `Rett` control — so none of
them can be the next wave's walk against this live world.

## FT-TRAINING — 2 journeys; the live walk covered publish+assign, never grading

| journey | exists | ever passed live | asserts something that could fail |
|---|---|---|---|
| training-course-to-evidence | yes | no (fixture-bound: types `world.STAFF[0].workforcePersonId` and `UNKNOWN_PERSON_REF` into product forms). Clerk's walk covered publish+assign live, in the browser, 21:30 | **proven** (fixture): flag-flip mutation reds it (L-JOURNEY-COVERAGE-THREE mutation-proof.txt); the 1280px overflow fix was A/B-mutation-proved. Core: server-graded `Ikke bestått` with no client pass control (:358), both ledger rows surviving (:382). Holes: `55%`/`90%` are values the spec typed — cannot tell stored from echoed |
| training-evidence-document | yes | no — fixture-hard: the disclosure ledger is read from `/__fixture/training-disclosures`, a control route **no live backend has**; run live-as-written it is meaningless | **strong core, one empty step**: out-of-band disclosure counts 0→1→2 (:214, :342, :357) are real. But the "DEFECT CHECK" step :222-244 **contains no expect at all** — `blocked` only feeds `journey.finding()` — and it carries the exact `!!covering &&` null-scores-as-clear bug its sibling documents fixing (`training-course-to-evidence.spec.js:226-230`). :334 asserts absence of a row the document excludes by design |

## FT-MARGIN — 4 journeys, none ever live; the strongest fixture specs in the estate, one money hole

| journey | exists | ever passed live | asserts something that could fail |
|---|---|---|---|
| margin-week-freeze | yes | no | **strong — cleanest arm structure in the estate**: whole-sentence refusal `toHaveText(REFUSAL)` (:198), refusal count +1 proving the request left (:205), ARM 3 accepting the identical edit via the correction (:253). Header admits a live backend ordering If-Match first would red it legitimately |
| margin-supplier-to-plate | yes | no | **strong**: the trap arm — batch cost still `'—'` after supplier+article+price all exist because packSize is missing (:279), then exact plate figures, then a price rise moves every figure; plus `expect(journey.failedRequests).toEqual([])` (:394). Header names the mutation that reds :279 |
| margin-recipe-to-margin | yes | no | **proven** (fixture): flag-flip mutation reds it. Exact whole-string money per line and both VAT bases (:162-174, :268-275). No vacuity found |
| margin-statement-week | yes | no | **strong frame, one money hole**: the 9-control absence block on a frozen week plus the frozen line still rendered (:245-258) is real. But :193 `[data-test="gap"]` `toContainText('5,00')` **passes on 15,00, 25,00, 35,00 and -5,00** — the one place in Margin a wrong figure survives, on the module whose purpose is that figures agree; :200/:233 `not.toHaveText('—')` accept any non-dash garbage |

The clerk's live walk read one plate cost (kr 41,82, honest rounding note). **No Margin write of any
kind has ever hit a live world**, and F-MRG-FINALIZE-LAG (freeze while the projector is behind) is
invisible by construction in fixture mode — "the fixture has no projector to lag" (plan.md, FT-MARGIN).

## FT-EVENTS — 5 journeys; the only live pass is read-only, and the money is never compared to anything

| journey | exists | ever passed live | asserts something that could fail |
|---|---|---|---|
| events-deposit-precondition | yes (`@live`) | **yes** — 2026-08-02, build unidentified, 1.8 s; also one live FAIL whose record misnames the frontend tree as the backend build | **strong but narrow**: real boundingBox geometry — the disclosure sits above the switch (:110). It arms and clears a flag; **it never moves money**. Holes: :124 `rows > 1` unfalsifiable; :121-122 subsumed by the global count at :120 |
| events-enquiry-to-settlement | yes | no | **strong gate, weak money**: exactly one refused guest `POST …/accept` across the off/on flip (:560) is sharp. But `Linjesum 35800,00` (:524) is the amount **the journey itself typed** at :491 — an echo; and reconcile (:505-515) asserts the words `Reconciled`/`Matched` **with no figure compared against the reconciled truth**. Positional `dd` reads (:414, :521-526) silently re-target on column reorder |
| events-guest-proposal-accept (`events-guest-proposal.spec.js`) | yes | no — tagged `@fixture` by default, **but its construction is live-ready**: discovers store, token, version and hash from the product and refuses fallbacks (:132-145) | **strong transport, no arithmetic**: receipt bound to the content hash read before the click (:423). But there is **no absolute money figure anywhere** — guest screen vs venue screen equality passes whatever the server priced 40 × 895 at. :351 `no-currency` count-0 is admitted in-line to be unreachable |
| events-runsheet-onboarding | yes | no | **strong**: first text line of the produced PDF is `Kjøreplan` (:260), after three on-screen controls. No dangerous vacuity |
| events-runsheet-print | yes | no | **strong pairing, one silent downgrade**: dietary line present AND deposit token/guest address absent from print, with the on-screen positive control (:204-212). But the PDF read-back is conditional on `pdftotext` (:259-266) — on a machine without it the step **passes having asserted nothing about the bytes**; the sibling made it a hard requirement, this one did not |

The clerk's live walk read one settled enquiry. The coordinator's stage actions — intake, proposal,
deposit, service, settlement, reconcile, close — remain what plan.md calls **the widest gap in this
plan between "built" and "shown working"**: driven only against the fixture, never live, never by a person.

## FT-MEALS — 3 admin + 6 consumer journeys, none ever live; the monthly bill asserts no amount

| journey | exists | ever passed live | asserts something that could fail |
|---|---|---|---|
| meals-guest-claim | yes | no | **strong**: the wrong-account refusal leaks none of the withheld contacts, with the refusal detail proven visible so the non-leak is falsifiable (:191-198). Holes: :122 `not.toHaveText('Du er ikke logget inn lenger')` passes on any other heading including a broken one; the permanent membership reference accepts any non-dash string (:252-253) |
| meals-admin-setup | yes | no | **weak spots in a real walk**: token shown once, list names contact and never plaintext (:197-198) is strong. But policy v1 is proven by `toContainText('1')` on the first row (:138) — passes on `120,00`, on any date; the **kr 120,00 per-period allowance is typed and never read back**; `Gjelder fra 2026-08-03` is already past — inert in fixture, a refusal time bomb live. **Zero data-test hooks on the whole surface** (the spec files this as its own finding) |
| meals-statement-month | yes | no | **strong reference, no money**: employee references read by value off downloaded CSV bytes (:207-208). But :186-187 compare **two literals known at import** — cannot fail; and this is a **monthly bill journey that asserts no amount, no total, no currency anywhere**. A statement exporting entirely wrong figures with correct references passes |
| consumer/meals-funded-checkout | yes | no — consumer stack only (`playwright.consumer.config.js`, fixture :4020, sibling ConsumerWeb checkout) | **strong total, presence-only token**: `order-total` exact `188,–` (:80); reservation token asserted `toBeTruthy()` only (:88) — the guard sibling supplies the falsification. Allowance-after re-derives the fixture's own subtraction (:100). **Nothing asserts the guest's card was not also charged** |
| consumer/meals-funded-guard | yes | no | **strong — best negative control in the consumer set**: proves the token was actually stripped on the wire AND the reservation stayed `Reserved` (:57, :68). Hole: the refusal message itself is returned, never asserted |
| consumer/meals-funded-over-allowance | yes | no | **weak**: the step named "the shortfall is stated" asserts only `toBeVisible()` (:45) — a notice quoting a wrong shortfall passes; the only money figure asserted in the file is `0` |
| consumer/meals-stale-token-refused | yes | no | **strong landing-site**: no order row created at all (:84-85). Hole: the refusal **reason** is never checked — any error renders the same green |
| consumer/meals-stale-token-requote | yes | no | **strong — the best money assertions in the whole estate**: one lunch costs the allowance once (:146), superseded hold released with the named reason (:142), bound cap = tipped total (:121) |
| consumer/meals-module-dark | yes | no | **strong distinction** (refused vs stopped-asking, :113/:118). :100 `meals-error` count-0 sits inside the `v-if` that is already false — cannot fail, and says so |

Funded ordering is ruled out of this repo (`D-SPEC-L-MEALS-FUNDED` → ConsumerWeb), so no funded walk
can be named against this live world. The claim page `/meals/join` was **dead at the branch tip for
weeks while its suite was green** (token read in `created()` before session restore); the fix is on
trunk (`pages/meals/join.vue:382-388` documents it) and **no person has verified it anywhere**.

## FT-GROWTH — 5 specs, 4 with artifacts; nothing downstream of the send gate shown to work in any world

| journey | exists | ever passed live | asserts something that could fail |
|---|---|---|---|
| growth-guest-consent | yes | no — **and no artifact exists in any world**: the plan's own 2026-08-04 correction withdrew its `driven`; the canonical directory has no record for it today. Shape 2 in its purest form | **strong on paper**: unticked submit fires **zero requests**, counted from the browser's own log (:149); consent sentence byte-for-byte vs version (:113-119). Unwitnessed — a reading, not a run |
| growth-guest-lifecycle | yes | no — fixture-hard: `mailbox()` reads `/__fixture/growth-links`, which no live backend serves | **strong**: full ordered 8-route POST log with an admin session live and zero Authorization on any of them (:382-392); token rotation on supersede (:216). No vacuity found |
| growth-newsletter-send-gate | yes | no — fixture (audience literals `214/18/7/5`, watermark, `post.fixturekafe.test`). One earlier run **failed** (login timeout, `backendServed: 0`) and was at first recorded as merely stale — plan.md carries the correction | **proven** (fixture): flag-flip mutation reds the gate. Whole-list equality on the gate's reasons at three points (:231, :301, :363) — a reason silently vanishing is exactly what reds |
| growth-privacy-queue | yes | no — fixture (request ids 9101/9102/9100/9900; guest-side filing is CORS-blocked, so the seed is the only door) | **strong ordering**: overdue-first proven non-trivial because the world seeds the overdue row second (:116-117). Hole: :210 asserts absence of a sentence that appears **nowhere in the repo** — cannot fail |
| growth-testsend-refusal | yes | no — fixture-hard (`/__fixture/confirmation-code`) | **strong two-arm**: same address refused before confirmation, accepted after, nothing else changed (:206 → :258). Hole: :220 `not.toContain('@')` against a static server sentence |

`growth-doi-postmark-sandbox.json` is a real Postmark-sandbox submission record — provider-level API
evidence for L-GROWTH-MAIL, not a browser journey. The clerk's live walk computed the audience
(**Vil motta 5, Utelatt 0**, signed) and stopped, deliberately, in front of an approved, unsent
newsletter — the exact state a dispatch walk needs.

## Core (outside the six, walked shallowly live)

| journey | exists | ever passed live | asserts something that could fail |
|---|---|---|---|
| ongoing-board-live-statuses | yes | no | **strong sent-vs-drawn** set equality (:168) — but both subject statuses (`DriverPickedUp`, `OpenCheck`) are **injected by the spec at the wire**; no evidence exists that a real backend emits them to this route. Zero data hooks — this is the locator family that produced both of the walk's false alarms |
| account-email-confirm | yes | no — fixture-hard (`/__fixture/confirmation-code`) | **strong ordered pair** (refused → confirmed → accepted, one thing changed). Holes: :215 compares a fixture counter to itself two reads apart; :138-139 `not.toContain('@')` on a static sentence |
| admin-refusal-worker | yes (tag flips to `@live` only if `E2E_WORKER_PHONE` is set) | no live run on record | **strong premise**: `adminIn === 0` read off persisted state with `null` refused (:122). Locators are substring-on-nav-text — a label rename inverts the meaning |
| modal-scroll-lock / modal-estate-scroll-lock | yes ×2 | no | **strong, no vacuity** — real wheel gestures with a same-run both-directions control. Risk is locators: geometric button-picking, hard-coded card index, Vue-internals writes |

---

## The classification, totalled

- **Shape 1 — no journey at all**: the Events coordinator stage actions (live or fixture — the
  fixture spec exists; no *person* and no live world has ever driven a stage write); Workforce
  personalliste correction (walk authored, code unlanded); Training quiz-taking (no surface, by
  ruling); Growth DOI confirm + preference centre (no door until the mail promotion + origin rulings);
  Meals funded path from this repo (ruled to ConsumerWeb); Growth dispatch/run outcome (nothing
  downstream of the gate, any world).
- **Shape 2 — exists, never passed a live world**: 35 of 39 runnable journeys. Only 4 ever passed
  live; **zero against the current binary**. Special cases: `growth-guest-consent` (no artifact in any
  world — a spec whose green has never been witnessed); `workforce-punch-correction` (the inverse — an
  artifact whose spec is not on trunk; cannot go red).
- **Shape 3 — asserts nothing that could fail** (lines inside otherwise-passing journeys):
  `training-evidence-document:222-244` (a whole step with no expect, carrying the exact null-check bug
  its sibling fixed); `workforce-delivery-failures:183` (`not.toBe(null)` on a Locator);
  `workforce-role-catalogue:212-214` (tautological slice); `workforce-flag-lever:221` (the surviving
  `Revisjon` substring); `margin-statement-week:193` (`toContainText('5,00')` admits 15,00/-5,00);
  `meals-statement-month:186-187` (two import-time literals); `growth-privacy-queue:210` (sentence
  absent from the repo); `events-guest-proposal:351` (state no world can produce, admitted);
  `events-runsheet-print:259-266` (missing `pdftotext` silently skips the byte check and stays green);
  `meals-module-dark:100` (testid inside the already-false `v-if`); `account-email-confirm:215`
  (counter vs itself). Money-tolerant: Events reconcile asserts the word `Matched` with no figure;
  the Meals monthly bill asserts no amount at all.
- **Locator fragility as a finding shape** (the walk's own false-alarm class): zero hooks on
  `meals-admin-setup`, `ongoing-board-live-statuses`, `workforce-pos-punch`, the modal pair, and the
  Growth newsletter admin surface (WALK-RECORD §3); geometric and index-based selectors in the modal
  specs; positional `select.nth(1)` in three Workforce specs; positional `dd` reads in Events.

## The six walks — one per module, for the clerk to author

**FT-WORKFORCE — republish the week and read the payroll twice.** A person publishes a week, notes
planned minutes and exports the payroll file, edits one shift, **republishes**, re-reads both.
Today's worst live defect (480 → 960 planned minutes on republish; payroll CSV no longer
byte-identical — L-PLANNED-MINUTES-HONOUR-LINEAGE, red-first at API level 17:28) walked straight
through every green suite **and** through `workforce-week-run-two-humans`' live pass, because that
journey publishes once and never republishes. The fix is lane-side; whether `118f92fb9` carries it is
exactly what this walk answers. Chosen over: week-run-two-humans rerun (already live-passed and
mutation-proven — cheap, but it re-proves what is proven); the § 8-5-6 correction walk (no `Rett`
control on trunk — shape 1, not walkable); invitation revoke (lane in flight, fixture-proven twice today).

**FT-MARGIN — freeze a real week and open its correction, live.** Open `/admin/margin-statements` on
the live world, enter spend, recalculate, **read the actual figures** (the suite's gap assertion
admits 15,00 for 5,00 — only a person catches a wrong figure), finalise, watch every mutating control
disappear, open the correction naming revision 1. Chosen over recipe/supplier authoring (plate cost
already read live by the walk; both specs mutation-proven or trap-armed in fixture) because **no
Margin write has ever hit a live world**, the freeze is the module's C1/C4 evidence, F-MRG-FINALIZE-LAG
is observable **only** live (the fixture has no projector to lag), and the first screen doubles as the
C3 answer to whether `Margin:Statements` is even on for store 1 — unknown as of the walk record.

**FT-EVENTS — a coordinator drives one enquiry stage-to-stage to a settled statement, live.**
Intake → proposal version → send (dispatch is off: relay the guest link by hand) → guest accepts at
`/events/proposal/:token` → service → settlement lines → reconcile → close — **reading the reconcile
figures against the lines entered**, because the suite reconciles on the word `Matched` with no amount
compared and the guest journey carries no absolute figure anywhere. This is the plan's own "widest gap
between built and shown working", every stage write is a C4 money-path row, and the walk record only
*read* a pre-seeded settled enquiry. Chosen over: the guest-accept half (fixture-strong, hash-bound,
and its construction is already live-ready — promote its tag instead of walking it); runsheet print
(narrow, PDF path fixture-proven); deposit-precondition (the one live pass — 1.8 s of read-only geometry).

**FT-MEALS — an invited employee claims their code at `/meals/join`, live.** Concierge issues an
invitation on `/admin/meals-companies` (token shown once), then the employee walks the refusal ladder
— unknown code, spent code, wrong account with the contact **withheld** — and claims. This page was
dead at the branch tip for weeks while its suite stayed green (the `created()`/session-restore 401);
the fix is on trunk and no person has verified it in any world. It is the pilot's front door and a
security boundary whose value is its refusals — which is also why a human, not a locator, should read
them. Chosen over: statement-month (its gate is host config with no live lever, and the suite asserts
no amount — a walk would rubber-stamp an empty screen); the funded path (no door from this repo, by ruling).

**FT-TRAINING — a failing score is graded by the server and the ledger keeps both rows, live.**
Continue from the walk's own assignment: file 55 against the frozen threshold of 80 → the row returns
**Ikke bestått with no client control that could have decided it** → retake 90 → both rows survive →
holdings shows possession, never a verdict. The completion INSERT lands on an append-only, triggered
table — the exact class the error-334 defect lived in, and the one Training write this live world has
never taken (the walk stopped at publish + assign). Chosen over: evidence-document (its disclosure
ledger is a fixture-only control route — live-as-written it proves nothing — and its layout step
asserts nothing at all); re-walking publish (proven live at 21:30, in the browser, on the rebuilt binary).

**FT-GROWTH — newsletter #1 goes to exactly the five who consented, live.** The world is parked one
step short by design: audience computed (**Vil motta 5, Utelatt 0**, signed), newsletter #1 approved
and unsent. Dispatch it and read the run outcome: five sends, zero to the one awaiting confirmation,
zero to anyone withdrawn — and **who or what the run says caused it**, because F-GR-DISPATCH-UNATTRIBUTED
is open and only a live run can show it. Nothing downstream of the send gate has ever been shown to
work in any world (L-JOURNEY-COVERAGE-THREE's own return). The surface has no data-test hooks — the
one module a browser test cannot address by hook is the one where the walker must be a person. Chosen
over: the DOI subscribe → confirm loop (no door until the Postmark promotion lands; the sandbox
artifact already covers the provider half at API level); privacy-queue (fixture-only ids, and its
guest-side filing is CORS-blocked from any real origin).

**Core (seventh, outside the six):** advance one live order with **Neste** through the board's columns
and watch `/admin/orders` agree — the fixture journey's subject statuses are self-injected at the
wire, so no evidence exists that a real backend's statuses all land on the board; the walk only read it.

## What the next wave should *not* spend a person on

`workforce-week-run-two-humans` (live-passed + live-mutation-proven), `margin-recipe-to-margin`,
`training-course-to-evidence` publish half, `growth-newsletter-send-gate`'s gate half (all
mutation-proven in fixture), the modal pair, and `events-guest-proposal-accept` — whose correct next
step is a tag promotion and a live harness run, not a walk: it is the one journey built to discover
everything from the world it lands in.
