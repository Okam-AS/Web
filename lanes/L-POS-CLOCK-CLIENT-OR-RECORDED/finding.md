# L-POS-CLOCK-CLIENT-OR-RECORDED — finding

Brief `460ab709`. Class **analysis**: this lane censuses and reports. **Nothing was built, nothing
committed, nothing pushed, no container started.**

## Where every fact below was read from

| world | ref read | tip |
|---|---|---|
| backend `../OkamAPI-modules` | **integration tip** `feature/restaurant-modules` | `8e2b57de` (2026-08-04) |
| backend, the wire-changing lane | `lane/clockout-state-is-not-open` | `a74a6fd2` / `4d103ca8` (2026-08-05) — **not an ancestor of `8e2b57de`** |
| frontend 1 `.` (Web-modules) | `feature/restaurant-modules` | `e34977a` (2026-08-04) |
| frontend 1, composition candidate | `candidate/fe-compose-2026-08-05` | `f40fdf3` |
| frontend 2 `../ConsumerWeb` | all 8 refs | `feature/swiss` @ `0abcb389` |
| out-of-world, named because it changes the answer | `../modul` (frontend-mono) `feature/restaurant-control-stage0` | `2758faa` (2026-07-22) |

The backend **checkout** sits on `lane/meals-grace-pins @ 34c6c103` — the world-doctor mismatch
`F-PROBE-ROOT-WRONG-WORLD` records. **Nothing here was read from that working directory.** Every backend
fact is `git show "${ref}:path"`, braced.

"Both frontend repositories" is resolved from the plan's own declared world, not guessed:
`F-PROBE-ROOT-WRONG-WORLD` (plan.md:19846-19885) names **Web-modules**, **OkamAPI-modules** and
**`../ConsumerWeb`** as the checkouts the facts are read from. So the two frontends are
**Web-modules** and **ConsumerWeb**.

---

## 1. The surface — every endpoint

`Controllers/WorkforcePosController.cs`, `[Authorize]`, `[Route("workforce/pos")]`. **Two endpoints.
That is the whole surface.** Both authenticate a **device JWT plus an `X-Operator-Session` header** —
never a manager's bearer token. There is no route `storeId`; the store is device-authoritative.

| # | endpoint | what it is | producer |
|---|---|---|---|
| 45 | `POST /workforce/pos/clock-events` | the punch (ClockIn / ClockOut / BreakStart / BreakEnd) | `WorkforcePosController:66-135` |
| 46 | `GET /workforce/pos/personnel-list` | the on-venue § 8-5-6 register read | `WorkforcePosController:145-…` |

**The "clock-state read" the flag's `clears_when` names is not a third endpoint.** It is the
`sessionState` field on endpoint 45's `PosClockEventResponse`. Frontend-mono's own contract file states
this in as many words: *"no state-read endpoint in 45/46, so the surface never CLAIMS a phase it has not
seen the server confirm."* Any client census that hunts for a third route finds nothing and concludes
wrongly.

**What the two lanes changed — named, not re-derived:**

- `lane/clockout-state-is-not-open @ 4d103ca8` (backend) — `WorkforcePosSessionState` gains a **third**
  member, `AttendanceException = 3`, and `PosClockEventResponse.SessionStateOf` reads the state off the
  fold's `Outcome` instead of `ClosedUtc`. Adds `docs/api/fixtures/workforce/pos-clock-event-response-no-session.json`.
  `a74a6fd2` is that lane's evidence commit. **Neither is on `8e2b57de`.**
- `lane/clock-client-reads-the-wire @ 0c6bca5` (frontend) — the client that ignored `sessionState`
  now switches on it; an untaught member reads `UNKNOWN` rather than inheriting "clocked in".

The endpoint set did **not** change: still 45 and 46.

---

## 2. Callers — frontend repository 1, Web-modules

### 2a. At the integration tip `e34977a`: **zero callers of either endpoint.**

`git grep -n "workforce/pos" feature/restaurant-modules` returns **exactly one line in the whole tree**:

```
utils/workforce/personnel-list-client.js:9:
  // `GET /workforce/pos/personnel-list` (endpoint 46) is the on-venue read, and it authenticates a
  //  DEVICE JWT plus an `X-Operator-Session` header rather than a manager's bearer token […]
  //  binding it here would be a method that can only ever answer 403. It is the register's own
  //  screen on the till, not this one.
```

That is the brief's premise, confirmed verbatim: **one workforce client, the manager route
(endpoint 30, `GET /workforce/stores/{storeId}/personnel-list`), whose header explicitly documents that
it does not bind the till route.**

Corroborating at the same tip: `components/admin/pos/PosShell.vue` offers four modes
(`sell` / `board` / `day` / `receipts`) and no `clock`; `PosTopBar.vue` carries no clock entry;
`ClockScreen.vue`, `pos-clock-client.js` and `pos-clock-state.js` do not exist. The **composition
candidate `candidate/fe-compose-2026-08-05 @ f40fdf3` is identical on every one of those points** — it
carries neither till screen nor client.

### 2b. But a complete, reachable caller exists on **6 of 163 refs**.

| ref | tip | client module | key family |
|---|---|---|---|
| `refs/heads/lane/fe-pos-clock` | `7c3a1e1` | `pos-clock-client.js` + `pos-clock.js` | `wfclock_` |
| `refs/heads/lane/fe-wf-oplink` | `3e811b2` | same | `wfclock_` |
| `refs/heads/lane/fe-wf-blind-bind-name` | `c67df92` | same | `wfclock_` |
| `refs/heads/lane/fe-wf-link-deadend` | `bed932e` | same | `wfclock_` |
| `refs/heads/lane/clock-client-reads-the-wire` | `0c6bca5` | `pos-clock-client.js` + `pos-clock-state.js` | `posclk_` |
| `refs/lanes/preservation-snapshot-unreferenced-work` | `054e140` | same | `posclk_` |

**On every one of the six the full C3 chain is present**, not a fragment:

- **service** — `utils/workforce/pos-clock-client.js` binds **both** endpoints:
  `_mutate('POST', '/workforce/pos/clock-events', …)` and `_request('GET', '/workforce/pos/personnel-list', …)`
- **consumer** — `components/admin/pos/ClockScreen.vue` calls `svc().ClockEvent(…)` (45) and
  `svc().GetPersonnelList()` (46)
- **mount** — `components/admin/pos/PosShell.vue:29` — `<ClockScreen v-else-if="mode === 'clock'" />`
- **navigation entry** — `components/admin/pos/PosTopBar.vue:93` —
  `{ key: 'clock', label: this.$i('pos_mode_clock'), icon: ICON_CLOCK }`

Two families, and the difference matters:

- the four `wfclock_` branches descend from `L-FE-POS-CLOCK` and read the session **id**;
- the two `posclk_` refs are `L-WF-PUNCH-UI`'s screen. **Only `lane/clock-client-reads-the-wire @ 0c6bca5`
  reads `sessionState` and understands `AttendanceException`** — the preservation snapshot still
  carries the id-inference workaround, so it is stale against `4d103ca8`'s wire.

**Shared checkout working tree** (`git status --porcelain -uall`): `ClockScreen.vue`,
`pos-clock-client.js`, `pos-clock-state.js` are `??` untracked and `PosShell.vue` is ` M`. That is the
`posclk_` pair the preservation snapshot preserved — i.e. **the pre-repair client**, not `0c6bca5`'s.

### 2c. So, per endpoint, for Web-modules

| endpoint | consumed at the integration tip? | consumed anywhere? |
|---|---|---|
| 45 `POST /workforce/pos/clock-events` | **No.** Zero callers on `e34977a` and on the candidate. | **Yes** — `ClockScreen.vue` on all 6 refs above. |
| 46 `GET /workforce/pos/personnel-list` | **No**, and deliberately: `personnel-list-client.js:9` records the refusal and binds endpoint 30 instead. | **Yes** — `ClockScreen.vue` on all 6 refs above. |

## 3. Callers — frontend repository 2, ConsumerWeb

**Zero, on all 8 refs.** A sweep of every ref in `../ConsumerWeb` for `workforce|clock-events` returns
**0 refs with any hit**. There is no workforce client, no till screen and no reference to either
endpoint anywhere in that repository. Neither endpoint is consumed; nothing there is a candidate to
consume them.

## 4. Correction to the flag's world statement — the register screen **does** exist elsewhere

`F-POS-CLOCK-NO-CLIENT` states *"The till register screen does not exist in any repo."* True of the two
declared frontends. **False as an estate statement**, and the exception is a fully wired one.

`../modul` (frontend-mono, the redesign frontend) at `feature/restaurant-control-stage0 @ 2758faa`
carries a routed React till clock:

- `apps/admin-web/src/views/pos/PosClock.tsx` — the surface
- `apps/admin-web/src/app/router.tsx:268-281` — `createRoute({ path: '/pos/clock' })`, and
  **registered** in `authedRoute.addChildren([… posClockRoute …])` at `:719`
- `tools/gate/routes.mjs:56` — `/pos/clock` is in the gate's asserted route list
- `apps/admin-web/src/views/pos/data/clockLiveAdapter.ts` — `submitClockEvent` (45) and
  `getPersonnelList` → `getPosPersonnelList` (46), bound over the operator's `X-Operator-Session`
- `packages/api-client/src/endpoints/workforce.ts:1179-1191` — `POST /workforce/pos/clock-events`,
  plus typed problem codes for all six POS refusals (`posOperatorNotLinked`, `posOperatorSessionInvalid`, …)
- `PosClock.browser.test.tsx` (real-browser) and `m-pos-clock.test.tsx` (jsdom)

Two qualifications, so this is not overstated:

1. **That repo is not this plan's declared world.** The plan reads Web-modules, OkamAPI-modules and
   ConsumerWeb. `feature/restaurant-control-stage0` is what plan.md:10494 calls an *old parallel stack*.
   It is 2026-07-22 — two weeks stale — and its `useClockPort` defaults to an **in-memory dev port**
   unless the app is in live mode with a resolved operator session.
2. Its `phaseFromResponse` reads only `Open`/`Closed` and returns `'unknown'` for anything else — so
   `AttendanceException` degrades to *unknown*, which is honest rather than wrong, and its own comment
   says why: *"the surface never CLAIMS a phase it has not seen the server confirm."*

## 5. Which exit is honest

**The first, not the second.** The brief allows that recording *"the till screen is not shipping in this
edition"* may be the answer. **It is not the answer, and the plan already contains the evidence that it
is not:**

- `L-WF-PUNCH-UI` (2026-08-04) built precisely what `clears_when` asks for — a *Stempling* mode inside
  the POS shell reached from the register's own top bar — and captured a **13-step browser journey**
  including a clock-in, a clock-out, a kill-switch refusal and an unlinked-operator refusal.
- `L-CLOCK-CLIENT-READS-THE-WIRE` (2026-08-05) then repaired that client against `4d103ca8`'s new wire.
- The surface **had exactly one possible home**: endpoint 45 needs a device JWT plus
  `X-Operator-Session`, and the POS shell is the only place in the app that holds one. An admin page
  binding it *"can only ever answer 403"* — the tip's own client says so.

So there is no open product question to rule. **What is missing is a landing, not a build and not a
decision.** Every one of the six refs is unmerged; the integration tip and the composition candidate
carry none of it; and the shared checkout's copy is untracked.

`F-POS-CLOCK-NO-CLIENT` should therefore be **restated as a landing item** — *the built client is on
`lane/clock-client-reads-the-wire @ 0c6bca5` and on no integration tip* — rather than left as a
build-or-rule blocker whose second arm nothing can take. Its own 2026-08-04 note already reached that
conclusion for the earlier `fe-wf-oplink` sighting; this census extends it to the repaired client.

One ordering constraint carries into that landing, already recorded at plan.md:7070-7082: the frontend
stack is three deep — `7b99f2a` → `438e719` (merges `lane/fe-pos-clock @ 7c3a1e1`) → `lane/fe-wf-oplink
@ 3e811b2` → `lane/fe-wf-blind-bind-name @ c67df92`. Landing blind-bind-name lands `fe-pos-clock`'s
`wfclock_` till wholesale, which is the **older, id-inferring** family — the one `0c6bca5` exists to
replace.

---

## 6. Secondary finding: `F-CLOCKSCREEN-FOUR-BRANCHES-NO-KEYS` is false as measured

That blocker states *"`wfclock_` appears **zero times** in `no.ts` — not on `e34977a`, not in the
working tree, nowhere"*, and concludes that landing any of the four branches gives *"a till screen whose
keys resolve to nothing."*

**Measured per ref, keys the component actually uses versus keys defined in `translations/no.ts` on the
same ref** (BEM class names `posclk__*` excluded — they are CSS, and counting them is what produces a
false 18):

| ref | keys used by `ClockScreen.vue` | missing from `translations/no.ts` on that ref |
|---|---|---|
| `lane/fe-pos-clock` | 47 | **0** |
| `lane/fe-wf-oplink` | 47 | **0** |
| `lane/fe-wf-blind-bind-name` | 47 | **0** |
| `lane/fe-wf-link-deadend` | 47 | **0** |
| `lane/clock-client-reads-the-wire` | 26 | **0** |
| `refs/lanes/preservation-snapshot-unreferenced-work` | 25 | **0** |

Every ref that carries the component carries its keys. The flag's measurement was taken **at the tip and
in the working tree** — the two places the component does not exist — so it could only ever have
answered zero. This is the same instrument-trap family as the braced-ref and `|| echo 0` traps: a
measurement at the wrong ref returning a plausible number.

**The real hazard the flag names still stands** and is untouched by this: landing any of the four would
overwrite the untracked working pair, and nothing would conflict. Only the *"keys resolve to nothing"*
premise is refuted.

---

## 7. Instrument note — a trap this lane hit and caught

The **first** ref census this lane ran reported *"no ref carries any of the three files"*, which was
wrong: six do. Cause: `for p in $PATHS` in **zsh**, which does **not** word-split an unquoted parameter,
so the loop tested one 100-character path that cannot exist. It failed as a **plausible empty answer** —
identical in shape to the unbraced-`${ref}` history-modifier trap the brief warns about, and to the
`|| echo 0` fallback. Re-run with explicit iteration and cross-checked against
`git ls-tree -r --name-only "${ref}"`, which is the measurement the tables above rest on.

## Evidence commands

All read-only, all from `/Users/svendaneel/okam/Web-modules` unless stated.

```
git show "feature/restaurant-modules:Controllers/WorkforcePosController.cs"      # ../OkamAPI-modules
git show "4d103ca8:Models/Workforce/WorkforcePosModels.cs"                       # ../OkamAPI-modules
git grep -n "workforce/pos" "feature/restaurant-modules" --                      # -> 1 line, the refusal comment
git grep -n "workforce/pos" "candidate/fe-compose-2026-08-05" --                 # -> same 1 line
git for-each-ref --format='%(refname)' | while read r; do \
  git cat-file -e "${r}:components/admin/pos/ClockScreen.vue" 2>/dev/null && echo "$r"; done   # -> 6 of 163
git grep -n "ClockScreen" "refs/lanes/preservation-snapshot-unreferenced-work" -- components   # mount
git grep -n "'clock'" "refs/lanes/preservation-snapshot-unreferenced-work" -- components/admin/pos/PosTopBar.vue
git status --porcelain -uall -- components/admin/pos/ClockScreen.vue utils/workforce/pos-clock-*.js
# ../ConsumerWeb: 0 of 8 refs match  workforce|clock-events
# ../modul:       git grep -n "posClockRoute" "refs/heads/feature/restaurant-control-stage0" --
```
