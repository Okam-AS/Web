# L-THE-ACKNOWLEDGE-BUTTON-CANNOT-CONFIRM-THE-WRONG-WEEK — a second press stops confirming a week nobody looked at

brief 565a4cb1 · exit: *with two unread publications, pressing the acknowledge control twice cannot
acknowledge the second one, shown by a walk in a world that actually holds two unread publications*

## 1. The world came first, and it is the reason this was still open

No walk with **two** unread publications had ever run: the after-arm world of
L-A-WORKER-SEES-WHAT-SHE-CONFIRMED held one (`after.itemCount = 1`) and the week-run journey
publishes one. So the first thing built was the world, not the fix.

`build-world.py` in this directory is the manager doing what a manager does — for each week, four
calls with her own token: `POST …/schedules/drafts` → `PUT …/assignments:batch` (If-Match on the draft
ETag) → `POST …/validate` → `POST …/publish`. Each week rosters the **same** worker, so she is an
eligible recipient of both (`ResolveEligibleRecipientsAsync` takes the staff with live assignments)
and gets one inbox row per publication.

Two pairs were published into the live world (`OkamLiveTwoHumans`, API :5971), because the
reproduction consumes the pair it proves the defect on:

| arm | week | range | publication |
| --- | --- | --- | --- |
| before | A | 2026-08-24 → 08-31 | `74de15a1-67ed-4a49-9ae5-8d68b0a4fe28` |
| before | B | 2026-08-31 → 09-07 | `0dc2e2c3-fe7f-47c7-87d6-e770d4063f84` |
| after | C | 2026-09-07 → 09-14 | `fb618f71-4954-4a0e-99bd-8748c3d34626` |
| after | D | 2026-09-14 → 09-21 | `cf05ec7d-3ce0-4422-9895-c21c450945a0` |

The worker's inbox was confirmed to hold **two unread publication rows** before each arm.

## 2. It reproduces on current trunk — by state, not by call

`node walk.js before …` against `web-livewalk` @ **`6b98839`, clean** (the trunk the brief names),
web :3971. It presses the acknowledge control **at the top of the notice**, lets the screen settle,
and presses **the same place** again — the press of a person who thinks the first did not register.

    open.rows      = [{dot:true, receipt:null, ackButton:"Bekreft mottatt"},
                      {dot:true, receipt:null, ackButton:"Bekreft mottatt"}]
    press1.publicationId       = 0dc2e2c3…   press1.alreadyAcknowledged = false
    afterPress1.rows           = [{dot:true,  receipt:null,                ackButton:"Bekreft mottatt"},
                                  {dot:false, receipt:"Bekreftet mottatt", ackButton:"Bekreft mottatt"}]
    press2.publicationId       = 74de15a1…   press2.alreadyAcknowledged = FALSE
    afterPress2.errorToastCount = 0

The confirmed row went to the **bottom** and the other week rose into the place she had just pressed,
offering an identically-worded button. The second press was therefore a **first** acknowledgement of
a different week, answered `alreadyAcknowledged: false`, with no error and nothing on screen saying
the press had changed target.

**Proved by state.** Read back from the manager's own
`GET /workforce/stores/1/schedules/publications/{id}/recipients` — the recipient rows, which is what
a payroll or an inspector is shown — for this worker's staff member:

    state.beforeAnyPress    { 0dc2e2c3…: null,                        74de15a1…: null }
    state.afterBothPresses  { 0dc2e2c3…: 2026-08-07T16:02:28.188382,  74de15a1…: 2026-08-07T16:02:29.778514 }

**Two weeks confirmed by two presses the worker performed as one act.** Screenshots
`before-1..3-*.png`, raw `before-walk.json`.

## 3. What was wrong, and why the answer is RE-TARGET rather than REFUSE

From the code, not from the symptom: `publicationsForNotice` built the list as *unread first, then
what was just confirmed appended* — its own test pinned `['b', 'a']`. Read state and acknowledgement
state were being used **as the sort key**, and acknowledging is precisely the act that changes both.
So the act of confirming re-sorted the very list the next press would be aimed at. Every row keeps an
acknowledge control by design (the notice deliberately keeps a caller for the idempotent replay), so
the control that surfaced in the pressed position belonged to another week.

There was never a mis-delivered press: `v-for … :key="item.inboxItemId"` hands the handler the row's
own item. The **only** mechanism was the reorder, so a handler-level refusal would have been theatre.

**Refusal was rejected on the merits.** Dropping or disabling the control once something had been
confirmed would (a) take away the idempotent replay the previous lane had just made reachable, and
(b) stop a worker rostered on **both** weeks from confirming the second one at all. It prevents the
accident by preventing the act, and the act is legitimate — she is on that roster too.

**Re-target, in two halves.**

1. **One ordering, applied to the whole set** (`utils/workforce-me/inbox-filter.js`). Read state and
   acknowledgement state now decide only **which** rows are on screen; `noticeOrder` decides the
   order, from `createdAtUtc` (newest first, the same rule the server's own
   `OrderByDescending(i => i.CreatedAtUtc)` uses) with `inboxItemId` breaking a tie. Position is a
   function of the row set alone. The tie-break and the client-side sort are not decoration: the page
   re-reads the inbox after **every** press, a SQL `ORDER BY` with equal keys has no defined order,
   and a row carried over from a press is not in the server's list at all — so an order taken on
   trust could move a row for a reason nobody performed. `arrivedAt` reads a bare stamp as UTC,
   because a carried row and a response row must be compared under one rule.
2. **The control says which of the two acts it is** (`WorkforcePublicationNotice.vue`). A row this
   session holds a receipt for now reads **`Bekreft på nytt`**; a row it does not still reads
   `Bekreft mottatt`. While both said the same word, the control that writes a **first**
   acknowledgement of a week and the one that only replays an old one were indistinguishable before
   they were pressed. Keyed on the session receipt, never on `isRead` — marking read does not mean
   acknowledged, and this component may only say "bekreftet" about a receipt it was handed.

## 4. The walk that closes the exit criterion

The five changed source files were copied into `web-livewalk` and picked up by HMR — **no restart, no
port bound, no container touched** — and `node walk.js after …` ran against the second pair.

    open.rows      = [{dot:true, receipt:null, ackButton:"Bekreft mottatt"},
                      {dot:true, receipt:null, ackButton:"Bekreft mottatt"}]
    press1.publicationId = cf05ec7d…   press1.alreadyAcknowledged = false
    afterPress1.rows     = [{dot:false, receipt:"Bekreftet mottatt 7. aug., 18:09.", ackButton:"Bekreft på nytt"},
                            {dot:true,  receipt:null,                               ackButton:"Bekreft mottatt"}]
    press2.buttonText    = "Bekreft på nytt"
    press2.publicationId = cf05ec7d…   press2.alreadyAcknowledged = TRUE
    afterPress2.rows     = [{dot:false, receipt:"Allerede bekreftet 7. aug., 18:09.", ackButton:"Bekreft på nytt"},
                            {dot:true,  receipt:null,                                ackButton:"Bekreft mottatt"}]
    pressedTheSamePublicationTwice = true      afterPress2.errorToastCount = 0
    acknowledgementPostsMade = 2

**The state, which is the assertion that matters:**

    state.beforeAnyPress    { cf05ec7d…: null,                       fb618f71…: null }
    state.afterBothPresses  { cf05ec7d…: 2026-08-07T16:09:40.292264, fb618f71…: null }
    state.publicationsThisWalkAcknowledged        = [cf05ec7d…]
    state.theWeekTheWorkerNeverLookedAtIsUnconfirmed = true

Two presses, **one** acknowledgement in the world. The week she never opened carries no
`acknowledgedAtUtc` and still shows its unread dot and its own untouched `Bekreft mottatt`, so
confirming it remains possible — the accident was removed without removing the act. Screenshots
`after-1..3-*.png` (`after-2-after-first-press.png` is the screen the criterion asks for), raw
`after-walk.json`.

## 5. Tier and delta

`TZ=Europe/Oslo npx jest` in the lane worktree: **166 suites / 3950 tests / 0 failed**, exit 0,
166 `PASS` / 0 `FAIL`, no abort line anywhere above the summary (`grep` for
abort/segfault/killed/out-of-memory/worker-failed/force-exiting is empty). Trunk is **166 / 3939 / 0**,
so the delta is **+11 tests and no new suite**. `npx eslint` clean on all four touched source/test
files.

Eleven new tests, one existing expectation inverted:

- `test/workforce-me-inbox-filter.test.js` — *confirming one week never moves another under the
  worker's finger*: the control at the top addresses the same publication before and after a press ·
  a second press at the top would replay, because that row is the one already confirmed · confirming
  a row in the MIDDLE moves neither the row above it nor the one below · the order does not depend on
  the order the inbox happened to answer in · two rows that arrived in the same instant are still
  ordered the same way twice · newest first, and a bare stamp is read as UTC rather than as local ·
  rows carried over from a press are ordered too, not left in object order · an unreadable arrival
  instant sorts last instead of taking the notice off screen.
- **Inverted**: *the kept row is appended once, after what is still unread* pinned `['b', 'a']` — the
  defect itself. It is now *the kept row is carried once, and stays where it was*, `['a', 'b']`.
- `test/workforce-me-components.test.js` — the control on a confirmed row says it would confirm
  again, not confirm · with one week confirmed and one not, exactly one control offers a first
  confirmation · the wording follows the receipt, never the row's read state. The landed *the
  acknowledge button stays, so the idempotent replay has a caller* keeps its count assertion and
  hands its wording assertion to the new cases.

## 6. Every new test red under a mutation actually applied

Eight mutations written into the source, run, and restored from byte copies. **All twelve
new-or-changed tests are covered**; the pristine suites re-ran 53/53 afterwards and `git diff` carries
no mutation residue.

| mutation | applied to | reds |
|---|---|---|
| M1 the defect restored: unread-first, confirmed appended | inbox-filter.js | 8 |
| M2 no client ordering — whatever order the response came back in | inbox-filter.js | 4 |
| M3 the tie-break removed | inbox-filter.js | 1 |
| M4 a bare stamp read as browser-local instead of as UTC | inbox-filter.js | 1 |
| M5 an unreadable instant sorts first instead of last | inbox-filter.js | 1 |
| M6 rows carried over from a press left in object order | inbox-filter.js | 1 |
| M7 every control reads the same again | Notice.vue | 2 |
| M8 the wording keyed on `isRead` instead of on the receipt | Notice.vue | 1 |

M1 is the load-bearing one: it is the trunk behaviour, and it reds every ordering case including the
two that state the exit criterion directly. The **journey-level** mutation is ARM `before` in §2 —
the identical selectors and presses against the identical code path with this change absent, writing
two acknowledgements where the after arm writes one.

## 7. Constraints

- **C1** — no UPDATE or DELETE against an append-only table; no acknowledgement was removed or
  rewritten. Everything written here went through `POST /workforce/me/publications/{id}/acknowledgements`,
  the documented append path, by the recipient herself. **This lane's reproduction wrote two** (weeks
  A and B, `16:02:28` / `16:02:29`) — that is the negative control and it cannot be performed without
  them — and the after arm wrote **one** (week D). They join the two the original negative control
  left on `0d8ef70d` and stay where they are.
- **C2** — no migration, no `OnModelCreating` change, no backend change at all.
- **C3** — the change is on a page the sidebar already links to, wired through the page's own
  `noticePublicationItems`, and was reached in a browser by the worker's own account.
- **C4** — no money-path write was added. The acknowledgement's actor is unchanged: #44 resolves the
  recipient from the caller's token and the walks wrote as the worker herself, which is what the
  recipient rows in §2 and §4 record.
- **C5** — the exit is a person completing the journey. Both arms were walked in a browser against
  the live world; the suite result is reported as a tier, never as the reason the capability exists.
  The change is **left applied in `web-livewalk`** so Sven can walk it himself (§8).
- **C6** — no statutory claim added or changed. The `Bekreftelsen er ikke en godkjenning av vaktene`
  disclaimer is untouched and still on screen with the receipt.
- **C7** — no credential, token or code appears in any file in this directory, in either walk JSON,
  or in any screenshot. Credentials were passed to the walk through the environment and the manager
  token through a file outside the repository; a grep of this directory for either code, either
  phone number, or a JWT prefix returns nothing.

## 8. State the owner's world was left in

`web-livewalk` (detached at `6b98839`) **carries this lane's diff, applied via HMR, unrestarted** —
five files: `utils/workforce-me/inbox-filter.js`,
`components/admin/workforce-me/WorkforcePublicationNotice.vue`, and one inserted line in each of
`translations/{no,en,de}.ts`. It was clean before this lane touched it, so the whole undo is:

    git -C ~/okam/web-livewalk checkout -- utils/workforce-me components/admin/workforce-me translations

The live world now holds, for this worker: weeks A, B and D acknowledged; **week C
(`fb618f71…`, 2026-09-07) deliberately left unread and unconfirmed** — it is the row the after arm's
proof rests on, and it is also the row that makes a second two-press walk possible without publishing
anything new.

Nothing else was touched: `:3971` and `:5971` were never bound, nothing was restarted or killed, no
container was started or stopped, no `npm install` was run (the lane worktree symlinked the owner's
`node_modules`), and nothing was pushed.

## 9. Left open, honestly

- **The section lede is imprecise in the mixed list.** With one row confirmed and one still unread the
  heading correctly counts the unread one (`Ny vaktplan publisert`) but the lede *"Du har ikke åpnet
  denne ennå"* sits at the top of the section, immediately above the row the worker has just
  confirmed, and reads as a claim about it. Visible in `after-2-after-first-press.png`. It cannot
  cause a wrong acknowledgement — the wrong-week press is closed — but it is a claim placed where it
  is not true, and moving it onto the rows it is about is a change to the notice's shape that this
  lane did not take.
- **The journey still publishes one week.** `test/e2e/journeys/workforce-week-run-two-humans.spec.js`
  is untouched. Turning it into a two-publication world means the manager publishing a second week
  before the worker ever signs in, which re-writes its acknowledgement steps — and that spec cannot
  be run from here without standing a world up, which would restart servers this brief forbids.
  Shipping an unrun rewrite of the estate's e2e pin would be worse than the walk above, which is
  live, recorded, and asserted against the recipient rows. The regression pin is the eight ordering
  cases plus M1.
- **The reload gap is still a sibling's.** `F-THE-ACKNOWLEDGEMENT-RECEIPT-IS-ONLY-PAGE-STATE` stands:
  after a reload the receipt is gone, so both controls read `Bekreft mottatt` again. That does not
  reopen this defect — the order no longer moves under a press either way — but the second half of
  §3, the label, is session-scoped for exactly the reason that flag names.
