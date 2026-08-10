# L-READ-THE-DAYS-BUILDS-REDO — four builds read by someone who wrote none of them

brief 45388709 · reviewer `agent:L-READ-THE-DAYS-BUILDS-REDO` · 2026-08-07

Pinned reading: backend `81d06c10a` (contains `cf78471b3` and `44e6dd923`; verified: zero drift in the
Events and Growth files between each lane's landing and the tip), frontend trunk `8db65dd`
(contains `bee8377`/`21d0d53`; the only later change to the touched files is another lane's training
keys in `translations/*.ts`), and the acknowledgement lane at `48c0462` exactly as the brief names it.
Worktrees: `scratchpad/redo-be` (backend @ 81d06c10a), `scratchpad/redo-fe` (FE @ 8db65dd),
`scratchpad/redo-ack` (FE @ 48c0462, `core` pinned to `9626a561`). All read-only; every mutation
below was applied, run, and restored; `git diff` clean at teardown.

RUN RESULTS — filled in below per item.

## 1. The Events dispatch lever — backend `cf78471b3`, frontend `bee8377`/`21d0d53`

### The one-gate claim HOLDS, structurally, not by agreement

The claim is that one method serves the drain, the health read and the resolver. Verified as one
method: `IEventsModuleGate.IsStoreFlagEnabledAsync` (`Services/Events/EventsModuleGate.cs`), whose
composition is `Events:Enabled AND flagStore.IsEnabledAsync(storeId, flag)`, where the production
flag store `StoreBackedEventsFeatureFlagStore` resolves `row ?? Events:DispatchEnabled` for this one
key. The three consumers each call that method and none re-derives the composition:

- drain: `EventsNotificationDrainService.cs:116` — per due store, before the batch;
- health: `EventsNotificationHealthService.cs:54` (GetHealth) and `:144` (requeue, resolved once and
  used for both the log line and the view);
- resolver: `EventsDispatchFlagEffectiveResolver.cs:46`, registered in `Program.cs`, consumed by
  `StoreFeatureFlagsController.EffectiveAsync` which asks resolvers FIRST for keys they `Handles`.

The load-bearing negative: `git grep DispatchEnabled` at the tip shows **no production reader of
`EventsSettings.DispatchEnabled` outside the fallback branch inside the gate's own flag store**
(`StoreBackedEventsFeatureFlagStore.cs:80`). So there is no second copy of the arithmetic left to
drift. `IEventsModuleGate` is a DI singleton; all three consumers get the same instance.

### The starvation repair HOLDS — the two-query shape is real and its test bites

The drain resolves the switch over the DISTINCT due-store set first, then draws the batch
`WHERE dueStores ∈ dispatchable` — a withheld store's rows are never selected, so they cannot fill
the page. The world the brief demands exists:
`EventsDispatchStoreLeverTests.A_dark_stores_backlog_does_not_starve_a_store_that_is_switched_on`
— dark store with 8 OLDER rows (enqueued first, so they win the `(NextAttemptUtc, CreatedAtUtc)`
ordering), live store 1 row, batchSize 3 < 8, asserts Delivered=1 and the dark 8 untouched.

Mutation applied and restored: the drain rewritten to the filter-after-batch shape
(`WorkforceNotificationDispatcher`'s). Result recorded below.

Withheld-pass byte-identity is pinned by `A_withheld_pass_leaves_the_row_exactly_as_found` (five
passes because five is the attempt budget). Both directions of the row are pinned
(`A_promoted_fleet_keeps_dispatching_and_a_store_can_still_switch_itself_off`), the dark outer
module is never refined on, and the resolver's two-directions test uses the gate, not the row.

### Findings (none blocking)

- `EventsDrainOutcome.DispatchDisabled` changed meaning: it used to be true whenever the config key
  was off (even with an empty queue); it is now true only when rows were due and every due store is
  withheld. Documented in the XML doc; only the hosted service logs it; no consumer breaks. Named
  because it is a semantics change a caller of the interface must read the doc to learn.
- The per-store gate resolution is a scope + one query per due store per pass (fleet-sized, as the
  comment says). Not a defect at this fleet size; would be one at thousands of stores.
- FE: the lever row draws itself from the catalogue; the two disclosures (release-the-backlog,
  off-holds-not-discards) are content-asserted in all three locales, above the control, and
  independent of the store's current value. `21d0d53` only corrects a comment to cite the two-query
  drain correctly. Clean.

## 2. The newsletter inspection — `44e6dd923`

### The reader claim HOLDS at the tip

`git grep ContentJson` at both `44e6dd923` and `81d06c10a` (IDENTICAL sets, non-test): the entity,
migrations/designers, the two request models, and exactly two reader FUNCTIONS —
`GrowthDispatchKeys.ContentHash` (hashes the string; call sites in `GrowthNewsletterService.cs:134/202`)
and `GrowthMarketingFooter.AppendHtml` (concatenates unescaped into `HtmlBody`; call sites
`GrowthDispatchService.cs:509` (dispatch) and `GrowthNewsletterService.cs:300` (test-send, which
deliberately renders through the same appender)). **No third reader; nothing parses it as JSON**, in
backend or frontend (`pages/admin/growth-newsletter.vue` treats it as a textarea string; the e2e
fixture hashes it). The accept/refuse line sits in `RequireContent`, called from both write paths
(create `:112`, edit `:171`) — ahead of every reader.

### The refuse-every-body mutant reproduced

Mutation: `GrowthNewsletterBody.Inspect` made to refuse every non-blank body (result below), then
restored. This is the arm that proves the accept arms assert acceptance rather than passing
vacuously.

## 3. The If-Match discovery — `81d06c10a`

The discrimination is `MarginContractSupport.GuardIfMatch` (`:201`): byte-equality against the row's
`ConcurrencyVersion`, `StaleRevision()` (409) on mismatch. The discovery suite runs on SQLite by
asserting its own premise (the provider hands out no revision) and then injecting a synthetic
8-byte rowversion via raw SQL with the affected-count asserted — so the arm is decidable on the
fast tier and not vacuous. The impostor arm is
`MarginProductLinkPreconditionDiscoveryTests.A_caller_retries_from_the_refusal_alone_and_that_write_lands`:
refusal → impostor token 409 `margin.stale-revision` → the advertised token 200, ETag echoed.
Reproduced (result below), plus a mutation dropping the mismatch throw in `GuardIfMatch` to show
the arm reds when discrimination is removed.

Scope notes, honest in the code itself: the five master-data routes still refuse in untyped prose
(named as "the remaining half of the same silence"), and the shared refusal detail still names an
ETag other Margin resources do not emit — already flagged as
F-MARGIN-TELLS-CALLERS-TO-READ-AN-ETAG-IT-DOES-NOT-EMIT. `GetRecipeRevisionAsync` is consulted only
on the refusal path and never throws, so an unknown recipe keeps its 400 (pinned).

## 4. The acknowledgement receipt — `48c0462`

### The fix closes the missing receipt. It does NOT close the different-week second press. The flag is right.

What the fix does: `publicationsForNotice(items, acknowledged)` keeps a row this session
acknowledged (server copy preferred, pressed copy as fallback), the notice stops calling the row
new, and the idempotent replay has a caller again. The receipt renders on the row; the journey step
is inverted rather than deleted and the replay is walked as its own step. All verified in the diff
and the tests.

Why the two-unread hazard survives, from the fix's own code:

- `publicationsForNotice` orders "unread first, then what was just confirmed" — its own test pins
  `['b', 'a']` for exactly the two-publication world (`test/workforce-me-inbox-filter.test.js`,
  "the kept row is appended once, after what is still unread"). So after the first press the OTHER
  week's row — with an identically-labelled `Bekreft mottatt` button — moves INTO the top position
  the worker just pressed.
- Every row keeps an acknowledge button by design ("the acknowledge button stays, so the idempotent
  replay has a caller"), so a second press at the top of the notice acknowledges week B, not a
  replay of week A.
- What the fix DOES change in that world: the mistake is now visible (row A stays with its receipt,
  the heading drops to "Ny vaktplan publisert" for the remaining unread one, and B's acknowledgement
  would render its own receipt) — before the fix both writes were invisible. Visible-after-the-fact
  is not prevented; F-THE-ACKNOWLEDGE-BUTTON-CAN-CONFIRM-THE-NEXT-WEEK (blocker) stands, and its
  clears_when (a walk with two unread publications) has not been performed: the lane's after-arm
  account (Astrid) had itemCount = 1, and the journey world publishes one week.
- The reload gap is separately and correctly flagged
  (F-THE-ACKNOWLEDGEMENT-RECEIPT-IS-ONLY-PAGE-STATE); the journey records it as a `gap` finding
  rather than asserting it away.

Nothing in the change reaches past the lane's exit: three source files, one key in three locales,
the journey inversion, and 15 unit tests. `web-livewalk` carries the diff deliberately (owner walk)
and was not touched by this review.

## Run log

All backend runs from `redo-be/WebApi.Tests/`; every log checked for an abort line above the summary
(none present) and totals compared against known suite sizes.

| run | result |
| --- | --- |
| baseline fast tier @ 81d06c10a (`--filter "Database!=SqlServer"`) | **Passed! 4937 / 0 / 10, Total 4947, 5m38s** — matches the clerk's trunk number; log `scratchpad/redo-tier-be-baseline.log` |
| MUT-1: drain rewritten to filter-after-batch (the Workforce shape) | `EventsDispatchStoreLeverTests`: **1 red / 8 green** — exactly `A_dark_stores_backlog_does_not_starve_a_store_that_is_switched_on` (Delivered expected 1, actual 0). The two-query shape is the load-bearing difference and its pin bites. Restored. |
| MUT-2: `GrowthNewsletterBody.Inspect` refuses every non-blank body | `GrowthNewsletterBodyTests`: **30 red / 9 green of 39 — all 22 accept arms red** (2 renderable facts, 10 shipped-product rows, 10 accepted tokenizer rows), plus 8 refusal arms whose specific code/message my mutant flavour garbles. Greens: 7 code-only unclosed-markup rows, the blank-body fact (refused before Inspect), the appender fact (no Inspect call). Lane's own M4 recorded 32/7 — different mutant flavour, same load-bearing property: no accept arm is vacuous. Restored. |
| MUT-3a: `GuardIfMatch` mismatch throw removed (pre-check only) | `MarginProductLinkPreconditionDiscoveryTests`: **7/7 still green.** The impostor's 409 is produced by the second, independent layer — `ApplyConcurrencyToken` arms the UPDATE's `WHERE ConcurrencyVersion = submitted`, 0 rows → `DbUpdateConcurrencyException` → 409. Defense in depth, documented in the code as intentional. |
| MUT-3b: both layers disarmed (`ApplyConcurrencyToken` neutralised too) | **exactly the impostor arm red** — `A_caller_retries_from_the_refusal_alone_and_that_write_lands`: impostor PUT answered **200 OK instead of 409**. The arm observes the discrimination itself. Restored. |
| MUT-3a rerun over the whole fast-tier Margin namespace | **1 red / 495 green** — `MarginRevisionGuardConvergenceTests.A_stale_but_wellformed_precondition_keeps_the_retryable_409`. So the pre-check's own throw IS separately pinned; **no discrimination layer is unobserved** and no mutation-that-would-not-red remains for item 3. Restored. |
| pristine re-run of all touched classes after restores | **76/76 green** |
| FE @ 8db65dd: `npx jest test/feature-flags-page.test.js` | **56/56** (incl. the 8 dispatch-row tests and the 6 locale-content obligations) |
| FE @ 48c0462: `npx jest test/workforce-me-inbox-filter.test.js test/workforce-me-components.test.js` | **42/42** (incl. the 15 new ack tests; `core` pinned to `9626a561`, no module-resolution failures) |

Item 3's impostor arm is thereby REPRODUCED (green pristine, red only when discrimination is removed
at both layers), and the one surprise found is in the build's favour: the acceptance is discriminating
twice, each layer independently observed by a different suite.

Note: the FE trunk moved to `6b98839` (the acknowledgement landing) while this review ran. My item-4
reading is pinned to `48c0462` as the brief names it; items 1–3 are pinned to `8db65dd`/`81d06c10a`.
Nothing in this review depends on `6b98839`.

## Verdict

**Clean on all four, with one standing blocker correctly attributed to a sibling flag.**

1. Events lever: claims hold — one gate method, not three that agree; the starvation repair is real
   and pinned. No blocking finding; the `DispatchDisabled` semantics change is documented but is a
   contract change a caller must read the XML doc to learn.
2. Newsletter inspection: the reader claim holds at the tip (two reader functions, no third, no JSON
   parse anywhere incl. frontend); the accept/refuse line sits ahead of both readers on both write
   paths; the refuse-every-body mutant proves the accept arms.
3. If-Match discovery: the impostor arm holds and is doubly enforced; both layers observed.
4. Acknowledgement receipt: the fix closes exactly what its flag says — the missing receipt (and the
   replay's reachability). The two-unread different-week press is NOT closed:
   `publicationsForNotice` reorders unread-first (its own test pins `['b','a']`), every row keeps an
   acknowledge button, and no walk with two unread publications has been performed with the fix
   applied. F-THE-ACKNOWLEDGE-BUTTON-CAN-CONFIRM-THE-NEXT-WEEK (blocker) stands; its clears_when is
   the right one.

No change in any of the four reaches further than its lane's exit. The husky hook fired its known
broken-path noise on worktree creation; nothing else on the host was touched — no container, no port,
no push, no branch move, `web-livewalk` and `web-ackseen` untouched.

## Teardown

Worktrees created and removed by this review: `scratchpad/redo-be` (OkamAPI-modules @ 81d06c10a),
`scratchpad/redo-fe` (Web-modules @ 8db65dd), `scratchpad/redo-ack` (Web-modules @ 48c0462).
Teardown per the trap list: verified no source residue (`redo-be` carried only a suite-written
`artifacts/journeys/ev-dietary/run-sheet.json`), then `rm -rf` + `git worktree prune` in both repos.
No `submodule deinit`, no `pkill`, no `npm install`.
