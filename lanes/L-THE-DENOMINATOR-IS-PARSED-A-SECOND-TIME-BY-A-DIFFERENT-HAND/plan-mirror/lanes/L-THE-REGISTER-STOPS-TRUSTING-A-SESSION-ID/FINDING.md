# A session id is not evidence that this engagement is open

**Built.** The register no longer reads a cross-engagement clock-in as "clocked in". The rule is
corroboration between the two fields, the stale header that caused a wasted lane is corrected in the same
commit, and the distinction is reachable by a person standing at the till — traced, not assumed.

| | |
|---|---|
| Frontend | `lane/register-stops-trusting-a-session-id` @ `1c607fd`, off trunk `d4c308e` |
| Tier | `npx jest` — **168 suites / 4011 / 0**, exit 0, no `FAIL` line (trunk 168 / 4007 / 0; the +4 are this lane's) |
| Mutations | **5 applied, 5 red, restored 25/25 green** |
| Spec | backend `PosClockOutStateWireTests` at `057c390ad` |

Nothing was pushed, `web-livewalk` was not touched, no port was bound, no container was started, and no
package was installed — the worktree borrows the existing `node_modules` by symlink.

---

## The defect, in the one case that produces it

A worker with two legal employers. Engagement A is open; she clocks in on engagement B (§3.7). The backend
answers **`AttendanceException`** — nothing folded for B — **while carrying employer A's OPEN session id**,
because the adjustment references it. Pinned server-side by
`A_cross_engagement_clock_in_carries_a_session_id_and_still_does_not_report_this_engagement_open`, which
asserts `clockSessionId` is a String and `sessionState` is `"AttendanceException"`.

The client keyed on the id alone:

```js
if (!response.clockSessionId) { return SESSION_EXCEPTION; }
return response.closedUtc ? SESSION_CLOSED : SESSION_OPEN;
```

Id truthy, `closedUtc` null → **`SESSION_OPEN`**. And because the observation was never an exception,
`nextState`'s guard never fired. Three things followed on the screen: the badge read *Stemplet inn*,
`canClockIn(SESSION_OPEN)` is `false` so ***Stemple inn* was greyed out**, and `applyResponse` — which keyed
on the id too — printed **"Stemplet inn 09:00"** off the *other* employer's `openedUtc`. A start time she
never started, on an engagement with nothing open.

The backend had already written the warning: *"a fix that only mapped 'null id' to the third state would
answer `Open` here and be wrong in the same direction."* That is exactly what the client was.

## The rule, and why it is neither field alone

Each half has been the whole rule and each was wrong on its own, both times in the same direction — towards
telling a worker she is on the clock.

| response | old rule | now |
|---|---|---|
| cross-engagement (`AttendanceException`, id present, no `closedUtc`) | **OPEN** | EXCEPTION |
| nothing open, current backend (`AttendanceException`, id null) | EXCEPTION | EXCEPTION |
| nothing open, **pre-2026-08-05** backend (`Open`, id null) | EXCEPTION | EXCEPTION |
| real clock-in (`Open`, id present) | OPEN | OPEN |
| real clock-out (`Closed`, id present, `closedUtc`) | CLOSED | CLOSED |
| a state this client does not know | OPEN | **UNKNOWN** |

So: **no id at all is an exception whatever the label claims; a declared `AttendanceException` is an
exception; a definite Open/Closed needs both a folded session and the outcome that says which way;
everything else is UNKNOWN.**

Three deliberate calls inside that:

- **`closedUtc` is no longer consulted at all.** It is the field that could not tell "absent" from
  "running", which is the whole origin of this defect family. The state is what the fold did.
- **The no-id guard is kept even though the corrected wire no longer needs it.** This client and the API
  deploy independently, so a till can still meet a pre-`4d103ca8a` server, and that body is precisely
  `{ clockSessionId: null, sessionState: "Open" }`. Mutation 2 shows the guard is load-bearing: removing it
  reds the *pre-existing* screen test. One branch against a lost § 8-5-6 end time.
- **An unknown state is UNKNOWN, not a guess.** A fourth state added server-side lands with both buttons
  live and the server deciding on the next press, rather than inheriting whichever branch it falls through
  to — which is how the original defect was written. `nextState` now holds an unreadable answer to the same
  rule as an exception: it is not evidence that anything folded, so it may not overwrite a known state.

## The reachability question, answered rather than assumed (C3)

The previous lane measured that **nothing in the frontend read `sessionState` at all**. That is now false,
and the chain to a person is continuous:

```
PosTopBar.vue:93        nav entry  { key: 'clock', label: $i('pos_mode_clock') }
  → PosShell.vue:29     <ClockScreen v-else-if="mode === 'clock'" />
    → ClockScreen.vue   imports stateFromClockEvent / nextState / canClockIn / canClockOut
      → the badge       stateLabel → posclk_state_exception ("Til gjennomgang" / "Needs review")
      → the buttons     canIn / canOut
      → the sentence    applyResponse → posclk_note_no_session
```

**The distinction is reachable and visible in three places at once**, and the screen-level test asserts all
three on a mounted component rather than on the module. No new translation key was needed:
`posclk_note_no_session` — *"Stemplingen er registrert, men den åpnet ingen økt. Si fra til leder, som kan
rette det opp."* — already said the true thing for this case; nothing was reaching it.

Nothing further is needed for the register to see the distinction. **What is still owed is C5**: a person
walking the two-employer punch on the till. This branch has no browser-level framework, so a mounted-component
assertion is the closest instrument available and it is not acceptance.

## Mutations — five applied, five red

Each restores a specific decision rather than breaking the file generally. Restored with `cp` + `touch`
between every run.

| # | mutation | red |
|---|---|---|
| 1 | `stateFromClockEvent` reverted to the null-id rule verbatim | **5** — incl. both cross-engagement facts |
| 2 | the no-id guard removed, so `sessionState` decides alone | **2** — incl. the *pre-existing* screen test on the stale body |
| 3 | the unknown-state branch falls through to `SESSION_OPEN` | **2** |
| 4 | `nextState` stops holding an unreadable answer | **1** |
| 5 | `applyResponse` keys the notice on `clockSessionId` again | **1** |
| — | restored | **25 / 25 green**, no `MUTANT` string left in either file |

Mutation 1 is the one the brief names. Its headline failure is the defect stated back:
`a cross-engagement clock-in carries a session id and is still NOT read as clocked in`.

No test survived every mutation, so none was deleted.

## The stale comment, corrected in the same commit

The header asserted `SessionState = result.ClosedUtc.HasValue ? Closed : Open` as current backend behaviour
— false since 2026-08-05, and the recorded cause of a lane being dispatched at an already-fixed defect
(`F-LANES-ARE-BEING-AUTHORED-FROM-FLAG-BODIES-THAT-THE-TRUNK-HAS-OVERTAKEN`). It now records both halves of
the history, names the backend commit and the backend test that is this module's specification, and states
why each single-field rule failed. The test file carried the same staleness in a fixture comment and a test
title (*"the session id, not sessionState, decides open vs closed"*); both are corrected, and the old body is
kept as an explicitly-named `staleNothingOpenResponse` rather than silently deleted, because it is still
reachable from a till.

## Operational notes

The `core` submodule trap fired exactly as documented: `git submodule update --init core` ends with
*"fatal: remote error: upload-pack: not our ref 9626a561…"*, and the pinned local fetch is what supplies it.
`node_modules` is a symlink to the main checkout's — no install was run. Worktree
`/Users/svendaneel/okam/wm-registerid` is removed after the run; the branch keeps the commit.
