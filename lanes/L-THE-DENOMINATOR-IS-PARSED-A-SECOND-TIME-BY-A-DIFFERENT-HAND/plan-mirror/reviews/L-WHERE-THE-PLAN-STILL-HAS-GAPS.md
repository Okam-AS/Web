# L-WHERE-THE-PLAN-STILL-HAS-GAPS — the six Features scored against what the landed trunks demonstrably do

Actor: `agent:L-WHERE-THE-PLAN-STILL-HAS-GAPS` · brief `6cb2b8ae` · measured 2026-08-07 · read-only
(no suite, no container, no browser; every claim below is a wire-read at a pinned SHA).

**Pinned against:** frontend `feature/restaurant-modules` @ **`a63c30f`** (Web-modules), backend
`feature/restaurant-modules` @ **`a1c1a6dff`** (OkamAPI). Both verified to exist and to be the branch
tips. These are 23 and 29 commits **past** the SHAs the prior reviews pinned (`ff497c0`, `118f92fb9`),
so every inherited claim was re-measured at the new tips before being repeated. Sources consumed:
`docs/plan/intent.md`, plan.md `## Features` (lines 70–661), `L-WHICH-JOURNEYS-ARE-REAL.md`,
`L-THE-FLAG-BACKLOG-IS-A-WORK-LIST.md`, `L-READ-THE-TRUNK-AS-LANDED.md`,
`L-READ-THE-BACKEND-TRUNK-AS-LANDED.md`, `L-WHAT-THE-TRUNK-WILL-STILL-BE-MISSING.md`.

**The one-line answer:** the code gap has mostly closed — five of six Features have every screen,
route, nav entry and service wire present at the trunk pair (C3 satisfied) — and the remaining gaps
have moved **outward**: to configuration that no operator can flip (four module masters dark in every
deployment), to doors that were ruled or deferred out of this wave (quiz, funded order, kodeoversikt
UI, real mail), and to evidence (**zero browser evidence of any kind exists against this exact trunk
pair** — the newest live passes ran against binaries 48+ commits older, and 0 of 415 lanes is
`accepted`).

## The table — one largest gap per Feature

| Feature | what the trunk pair demonstrably has (verified at the SHAs) | the single largest gap | exit walkable today? |
|---|---|---|---|
| **FT-WORKFORCE** | Genuinely the closest to met, and better than its own plan text: 14 workforce surfaces incl. `workforce-timesheets/-publications/-delivery/-roles`, all nav-linked; `pages/workforce/join.vue` **is on the trunk** (invite pair landed both halves 2026-08-07); invitation **list and revoke routes exist** (`WorkforceStaffController.cs:181,201`); the POS punch surface exists (`components/admin/pos/ClockScreen.vue` + `utils/workforce/pos-clock-client.js`); personalliste screen with print; no config gate to trip over. 3 of the estate's 4 live journey passes live here. | **The kodeoversikt half of this Feature's own exit is `no door`**: the backend route exists (`WorkforcePersonnelListController.cs:77`, `personnel-list/code-register`) and **zero frontend callers exist at `a63c30f`** — the UI sits on unlanded `lane/wf-kodeoversikt-ui`. Runner-up, statutory rather than exit-blocking: no `Rett` control on `workforce-personnel-list.vue` — the § 8-5-6 register still cannot be corrected by anyone (`F-WF-NOCORRECTION`; correction lane unlanded). | **All but one clause.** Plan → publish → punch → decide → open personalliste is walkable now; the exit's "AND the kodeoversikt can be produced" is not. One lane short. |
| **FT-MARGIN** | Capability complete in code: four screens, nav-linked, recipe→margin and statement freeze/correct both fixture-proven (`margin-recipe-to-margin` mutation-proven), setup-day reconcile fix landed (`f17248717`), waste honesty landed. | **The module is dark in every deployment and no operator can change that**: at `a1c1a6dff` `appsettings.json` has `Margin:EnabledStoreIds: []`, `Statements: false`, `PriceImport: false` — host config only, no operator lever, so the weekly settlement (the Feature's whole point) is unreachable by any action short of editing a config file and redeploying. Compounding: **no Margin write of any kind has ever hit a live world**, and the finalize-lag panel is still `v-if="isPowerUser"` (`margin-statements.vue:100`) so a store admin can freeze a week while the projector is behind with no warning. | **No.** Behind a config edit + restart; after that, per the fixture evidence, the whole exit is walkable. |
| **FT-EVENTS** | Guest half strong: 3 public pages, hash-bound acceptance, and the acceptance now **names somebody** (`lane/an-acceptance-names-somebody` landed `a6445ee0c` — `F-EV-ACCEPT-UNNAMED` premise gone at the tip). Pipeline page complete with every stage control; Vipps rail wired; runsheet prints the dietary line (fixture-proven). | **The money half of the exit — enquiry → PAID Vipps deposit → settled statement — has never been exercised in any world by anyone.** `Events:DispatchEnabled: false` means every guest link must be hand-relayed; the deposit page only hands off by link; `F-EV-CALLBACK` stands: one lost callback silently releases the guest's authorized hold and nothing retries. The coordinator's pipeline (the largest screen in the repo) remains the plan's own "widest gap between built and shown working" — driven only against the Node fixture. | **No.** Intake-to-settlement is walkable with hand-relayed links and manual reconcile, but the paid-deposit clause has no proven path. |
| **FT-MEALS** | The claim path is real: `/meals/join` **with the session-restore fix on the trunk** (`pages/meals/join.vue:382` documents it); the host gate **is now bound** (`services.AddMealsFeatureOptions()` at `Program.cs:887` — L-MEALS-GATE's premise is dead, a config flip now reaches the gate); `MealsMembership.EmployeeReference` exists (R4's permanently-unreferenced-member hazard closed at schema level); a third admin screen `meals-statements.vue` landed with its nav entry; the refusal no longer names the invitee (`864552bd3`). | **No employee can buy a funded lunch — the centre of this Feature's exit has no door**: `Features:Meals` is `Module/Ordering/Projection/Statements` all `false`, the funded checkout is ruled into ConsumerWeb (`D-SPEC-L-MEALS-FUNDED`) so it can never become reachable from this repo, and the reservation token is sent by nothing in the estate. Without a funded order there is no allocation and no statement line naming an employee — the exit's final clause is unreachable end-to-end. | **No.** Invite → claim is walkable after one host-config flip (and no person has ever verified the fixed join page in any world); funded order → statement is not. |
| **FT-TRAINING** | The biggest positive drift in the plan: the **inspector evidence surface landed both halves** (`pages/admin/training-evidence.vue` + nav entry + `TrainingController.cs` endpoint 16 — `F-TRAIN-NO-EVIDENCE`'s "only the endpoint does not exist" is now false in both directions); **certificate routes exist** (`certificates`, `certificates/expiring`); the 1280px overflow fix is on the trunk (`trn-table-scroll` across the training panels); the tip merge itself (`a63c30f` × `a1c1a6dff`) is the screen-stops-contradicting-the-data pair. | **Nobody can take a quiz.** The exit says "a worker passes the quiz"; `training-courses.vue:204` states in its own comment that the self-service surface where somebody takes a quiz **does not exist in this wave**. What exists is a manager filing a score the server grades. Runner-up: all seven per-store flags default off and 5 of 7 gate nothing, so the module is invisible until an operator flips flags whose board rows partly lie. | **No** as written — the quiz step has no door. Author → publish → assign → grade → evidence is walkable after flipping `training.setup`/`training.assignments` per store. |
| **FT-GROWTH** | More landed than the plan text admits: all four public pages **plus** `preferences/communications.vue` and `preferences/unsubscribe.vue` exist; `growth-privacy.vue` landed with nav; the **Postmark adapter and provider selection landed** (`GrowthPostmarkMailProvider`, `Program.cs:130-134,974-983` — "provably incapable, not a flag" is now false: it is a flag); the dispatch signature carries an actor (`DispatchAsync(..., string userId, ...)`); **the Art. 15/17 false-delivery defect is fixed** (`GrowthPrivacyRequestService.cs:252` — resolutions record only what the transport reported, requests stay open and retryable); publish-conflict honesty landed (`a29f9f576`). | **As shipped, no real mail can leave, so the exit's loop cannot close in any deployment**: `Growth:Enabled: false` and `MailProvider: "Fake"` at `a1c1a6dff`; no double-opt-in mail ever arrives, `/subscribe/confirm` is unreachable by a real guest, and no dispatch has ever been shown to work downstream of the send gate in any world. Compounding: Growth has **no module-flag effective resolver** (only Margin and Workforce exist under `Services/`) so the operator lever stays inert with no signal (`F-GROWTH-MODULE-LEVER-CANNOT-TURN-ON`), and `F-PREF-UNREACHABLE`/`D-PREF-ORIGIN` still hold the preference centre away from the deployed origins. | **No.** Subscribe stops honestly at the acknowledgment; confirm, dispatch and withdraw-from-a-real-list all wait on the provider promotion + origin ruling. |

## The acceptance hour, measured against C5

By the letter of the six exits: **0 of 6 could be accepted today.** Every exit carries at least one
clause with no door at the pinned pair — kodeoversikt (WF), any reachable store (MRG), a paid deposit
(EV), a funded order (MEALS), a quiz (TRAIN), a real mail (GROWTH).

What an hour actually buys, if the owner sat down against a live world on this pair: the **whole
Workforce exit minus its last clause** (the single best-evidenced walk in the estate); the **Meals
invite→claim ladder** (which no person has ever verified since the join-page fix, and which is the
pilot's front door); **Training author→assign→grade→evidence** (two per-store flag flips first); and
**Margin end-to-end** if the harness config enables a store. Events and Growth stop at money and mail
respectively regardless of the hour. So: substantial, acceptance-worthy middles of **4 of 6**
Features are walkable within an hour; complete exits: **none**.

And per C5 the evidence ledger is empty at this pair: 4 live journey passes ever, all against older
binaries; the 7-journey clerk walk ran against `118f92fb9`, which `a1c1a6dff` is 29 commits past;
415 lanes stand at built-unverified/verified and **0 at accepted**.

## What a paying venue could not do today, plainly

1. **Turn any of Margin, Meals, Growth, or Events dispatch on** — all four masters are host-config,
   `false`/empty in the shipped file, with no operator lever and (for Growth) no signal when the
   per-store lever is flipped over a dark host gate.
2. **Take a paid deposit** for a private booking with confidence — the rail is wired and untested in
   every world, and a lost callback releases the hold silently.
3. **Sell a funded lunch** — no door from any repo as ruled and configured.
4. **Send any real mail** — newsletter, double-opt-in, or privacy notices; the Fake provider is the
   shipped default and Growth is off.
5. **Correct the personalliste, or hand the inspector the kodeoversikt** from a browser — both
   backend-ready, both UI-unlanded.
6. **Have a worker take a quiz** — the Training record is manager-attested only.
7. (Outside the six, but the owner should know:) **a consumer shop still renders an empty menu over a
   fully published catalogue** when categories lack images — `CategoryModelBuilder.cs:51,58` still
   returns null at `a1c1a6dff`; the top-ranked flag in the flag review remains live.

## Where the plan under-reports — the Features prose is stale in the completeness direction

The brief warned this estate under-reports as readily as it over-reports; measured, that is now the
larger error. Eight load-bearing sentences in plan.md's Features section are **false at the pinned
pair**, all in the direction of claiming less than exists: "you cannot list or revoke invitation
codes" (both routes exist); "the invitation flow is not on the merged branch" (it is, both halves);
"`Configure<MealsFeatureSettings>` is called nowhere" (`Program.cs:887`); "a member is a bare
identifier permanently" (`EmployeeReference` exists); "no mail leaves the process, and this is not a
flag" (it is now a flag with a ruled provider adapter); "the inspector evidence pack has no route"
(route + page + nav all landed); "no certificate vault surface exists" (routes and panels exist);
"the publish button cannot be clicked" (fix on trunk). Meals has three admin screens, not two;
Workforce has ~10 admin surfaces, not six. A Features-prose refresh lane would stop the next reader
re-deriving all of this — and the same lane should fix FT-GROWTH's `needs:` line, which carries ~15
flags that have nothing to do with Growth (`F-PLAN-NOT-IN-GIT`, `F-MRG-WASTE-PANEL-CALLS-NOTHING`,
`F-POS-TENDER-WIRE-REINTRODUCES-TWO`…), burying the Feature's real dependencies.

One caution against over-correcting: the trunk is **not** the estate. 98 frontend and 121 backend
completed lanes still await landing (`L-WHAT-THE-TRUNK-WILL-STILL-BE-MISSING`), and several of this
table's named gaps (kodeoversikt UI, correction path, Growth resolver) already have built, unlanded
lanes. The gap between the trunk and the built estate is a landing queue; the gaps named in the
table above are the ones that survive even a complete landing of today's queue — quiz, funded order,
real mail, a paid deposit, and four dark module masters.
