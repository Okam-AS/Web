# L-WF-ADJUST-ADDRESS — declined again: which clause is unshown, and where the work actually is

**Reason shape: (5) one half of a two-part exit**, and on measuring it, something stronger — **neither half
is on any trunk**. The capability is built, in two repositories, on two unpushed branches, and verifying it
would put `verified` on a surface no trunk carries. **This lane needs a landing, not a citation.**

## The evidence line as the lane recorded it, preserved before anything overwrites it

```
evidence: OkamAPI-wfadjust f3887f9a + web-wf-adjust e9ba89e
```

Two bare SHAs. No artifact was ever written: `find /Users/svendaneel/okam -name "*WF-ADJUST-ADDRESS*"`
returns only this lane's brief and RETURN (and a copy of the RETURN in `plan-backup-2026-08-03`). There is
**no `lanes/L-WF-ADJUST-ADDRESS/` directory in any repo or worktree** — including the one the brief itself
specified as the lane's workdir — **no `.trx`, no `RUN.md`, no `detail.md`**. `OkamAPI-wfadjust/artifacts/tests/`
holds seven fast-tier trx for other SHAs and none for `f3887f9a`, and no wire-tier trx at all.

## The exit, clause by clause

> **a manager-reachable read exposes the clock session identifier** and **the rates page offers the
> correction it currently refuses to fake**, **pinned by a wire test**

| clause | state | where |
|---|---|---|
| a manager-reachable read exposes the clock session identifier | **SHOWN — and by a wire test** | `lane/wf-adjust-address` `f3887f9a1`, backend |
| the rates page offers the correction it currently refuses to fake | **BUILT — pinned by jest, not by a wire test** | `lane/wf-adjust-address` `e9ba89e2`, frontend |
| …pinned by a wire test (over both) | **UNSHOWN** | no single test, and no single repo, covers both |

**The unshown clause is the conjunction.** The read half is genuinely wire-pinned. The rates-page half has
no wire-level pin at all — and cannot have one from the backend repo, because it is a page.

## Clause 1 — genuinely shown, on a branch

Backend `f3887f9a1` *"The attendance grid names the punch a correction addresses"* — 6 files, +482/−8. It
adds the read DTO `WorkforceAttendanceDaySession` in `Models/Workforce/WorkforceAttendanceModels.cs`, hung
off the attendance row as `Sessions`, carrying **`ClockSessionId`** (wire: `rows[].sessions[].clockSessionId`)
beside `OpenedUtc`, `ClosedUtc`, `IsOpen`, `WorkedMinutes`, `PaidBreakMinutes`, `UnpaidBreakMinutes` and the
pending/approved/rejected adjustment counts. The read is `GET workforce/stores/{storeId:int}/attendance` on
a class-level `[Authorize]` controller with authorization resolved through `IWorkforceAuthorizationService`
— manager-reachable, not `WorkforceSelf`.

`WebApi.Tests/Wire/WorkforceAttendanceCorrectionWireTests.cs` holds four facts:

1. `The_manager_attendance_grid_names_the_clock_session_a_correction_addresses` — **this is clause 1**: GET
   as `AdminA` → 200, one row, one session, `clockSessionId` parses as a Guid, `!= Guid.Empty`, equals the
   seeded session, with `isOpen`, `workedMinutes == 450` and the break split asserted alongside.
2. `A_manager_corrects_the_punch_by_the_identifier_the_grid_handed_them` — takes the id **out of the HTTP
   response**, POSTs `/attendance/adjustments`, and asserts `approvedByActorReference` by value (C4).
3. `The_correction_appends_and_leaves_the_raw_punch_exactly_where_it_was` — C1 over the database: the raw
   `WorkforceClockSessions` and both `WorkforceClockEvents` are untouched by the correction.
4. `A_correction_addressed_at_a_session_this_store_does_not_hold_is_the_opaque_404`.

Facts 2-4 pin the **backend** correction over HTTP. **None of them touches the rates page.**

One honest wrinkle: the class docstring claims *"no assertion here may name the seeded id directly"*, yet
fact 1 asserts `Assert.Equal(WireHostFixture.AttendanceSessionInStoreA, id)`. The claim holds for the three
correction tests; it does not hold for the read test.

## Clause 2 — built, and it is a real control, but pinned only by jest

Frontend `e9ba89e2` *"The rates page offers the punch correction it used to refuse to fake"* — 11 files,
+825/−61. What it removed is the honest refusal the lane body describes, verbatim from the diff:

```
- wfrt_att_no_correction_ui: 'Corrections cannot be made from here: the endpoint names a clock session,
-   and no read a manager can reach returns a session id. …'
```

What it adds is not a message change. `components/admin/workforce-rates/WorkforceAttendanceTable.vue`
(+294) renders a per-punch sub-row over `row.sessions` with a real `<button v-if="session.clockSessionId"
@click="openCorrection(row, session)">` and a real `<form @submit.prevent="submitCorrection">` — a closed
`<select>` over `SessionStart | SessionEnd | BreakMinutes`, original/corrected inputs, a required reason, a
`workerVisible` checkbox. `pages/admin/workforce-rates.vue` (+73) calls
`this._rosterService.CreateAttendanceAdjustment(this.storeId, request)`, and
`utils/workforce/roster-client.js` gains that binding onto
`POST /workforce/stores/{storeId}/attendance/adjustments`, guarded by `assertAdjustmentRequest`, which
throws on an empty `clockSessionId`, `adjustedField` or `reason`. **C3 is satisfied within that commit:**
service, client binding, control and page all land together.

It adds **23 jest cases across four files** (`workforce-rates-attendance.test.js`,
`workforce-rates-components.test.js`, `workforce-rates-page.test.js`, `workforce-roster-client.test.js`) —
including that the emitted correction is addressed with the id the read supplied, that the request carries
no actor (C4), that a refusal is surfaced and the grid is *not* re-read, and that a second in-flight submit
is ignored. **Not one of them is a wire test**, and none could be: they run against stubs in a different
repository from the API.

## Why this cannot be closed by naming a file

**Neither half is on any trunk. Measured:**

| commit | repo | ancestor of its trunk? |
|---|---|---|
| `f3887f9a1` | backend | **NO** — `git merge-base --is-ancestor f3887f9a1 6d5328004` → exit 1 |
| `e9ba89e2` | frontend | **NO** — not an ancestor of `feature/restaurant-modules` (`5296dca8`) nor of the session branch |

Both branches are named `lane/wf-adjust-address`, **both with no upstream**, and **no remote branch contains
either commit**. At the backend trunk, `WebApi.Tests/Wire/WorkforceAttendanceCorrectionWireTests.cs` is
**absent** and `WorkforceAttendanceDaySession` **does not exist** — `ClockSessionId` at the trunk lives only
on the *write* request DTO and on internal service rows, never on a read. **So at the trunk the adjustment
endpoint is still exactly what the lane body says it was: live, and undrivable by a person.**

This is independently corroborated inside the plan itself: `docs/plan/log.md:1066` (2026-08-04,
`L-JOURNEY-WORKFORCE`) — *"THE CORRECTION SURFACE IS NOT ON THIS BRANCH. e9ba89e (lane/wf-adjust-address) is
not an ancestor of 5…"*.

Citing the wire test would repeat the error the prior pass named for `L-WF-CLOCK-WIRE`: putting `verified`
on a route no trunk carries.

## What is owed

1. **Two landings, in two repositories** — the backend read DTO + wire test, and the frontend correction
   surface. They are separable but the exit is not: it is one sentence about one capability.
2. **An artifact recording the runs.** The RETURN's counts are all bare numbers with no file behind them:
   backend container-free **4373 / 0 / 12**, backend wire **202 / 0 / 2**, frontend jest **2436 of 2437**
   (the one failure being `journey-artifact-store`, which asserts the checkout is named `Web-modules` and
   therefore reds in any lane worktree), and a non-vacuity claim that **withholding `ClockSessionId` reds 3
   of the 4 wire cases** — the fourth addresses a random Guid, so its staying green is correct. None of that
   is reproducible from anything committed. The SQL tier was left unrun by instruction, the change adding
   no DDL.
3. **A ruling on the exit's last clause.** "Pinned by a wire test" cannot be true of a Vue page from the
   backend suite. Either the exit means the wire test pins the *read* (in which case it is already met and
   the page half needs its own instrument), or it means something no repository in this estate can produce.
   **Rewriting it here to fit the jest suite would be exactly the rewrite this program forbids.**

**C5 is untouched.** Nobody has opened the rates page and corrected a punch. The lane's whole subject is a
manager doing that, and the RETURN claims no acceptance.
