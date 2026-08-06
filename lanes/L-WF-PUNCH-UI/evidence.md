# L-WF-PUNCH-UI — evidence

Brief `e0d00c0d`. Baseline taken by this lane, not inherited:

| repo | branch | tip |
|---|---|---|
| frontend `/Users/svendaneel/okam/Web-modules` | `feature/restaurant-modules` | `e34977ac` (206 dirty files from other lanes) |
| backend `/Users/svendaneel/okam/OkamAPI-modules` | `lane/meals-grace-pins` — **not** the integration branch | `34c6c103` |
| backend, contract read at | integration | `8e2b57de` (every fact below via `git show 8e2b57de:…`) |

## The exit criterion

`artifacts/journeys/workforce-pos-punch.playwright.json` — **status `passed`**, 13 steps, `backend: fixture`,
`baseUrl 127.0.0.1:3021`, `apiBaseUrl 127.0.0.1:4021`, `backendServed 70`, `foreignSubjectServed 0`,
`commit e34977ac`. Copied (artifacts/ is gitignored) to `lanes/L-WF-PUNCH-UI/evidence/`, with the six
screenshots under `evidence/shots/fixture/`.

Ports 4021/3021 were bound by this lane. The orphaned fixture on 4010 (PID 73160) was checked with
`lsof` before and after and is **still listening** — never adopted, never killed. `foreignSubjectServed: 0`
and the recorded `apiBaseUrl` are the proof the run was served by a fresh process on my own port.

Driven at **1280×800** by clicking. Every control is reached with `getByRole` / a real class selector and
Playwright's actionability check, so a button that a neighbour covered would fail rather than pass.

The 13 steps, in order:

1. sign in, register boots to operator sign-in
2. operator signs in on the PIN pad (digit by digit)
3. **the clock is reached by pressing "Stempling" in the register's own top bar**
4. nothing known yet — both halves offered, register empty
5. first press REFUSED: `Stempling er slått av for dette stedet. Skriv ned tiden, og si fra til leder.`
6. a manager pulls the real lever on `/admin/feature-flags` (`workforce.clock` → På)
7. clocks in → `Stemplet inn 22:20.`
8. **on the personnel list**: `Kari Nordmann · Ansatt · 22:20 · På jobb`
9. having clocked in, clock-in is disabled and clock-out offered
10. clocking in twice REFUSED: `Du er allerede stemplet inn…` — and the refusal teaches the screen the state
11. clocks out → the window carries **both** times, `0 på jobb nå`
12. **clocking out with nothing open never reads as clocked in**
13. an unlinked operator REFUSED: `Denne operatøren er ikke koblet til en ansatt…`

## What the premise checks actually found

**"The POS page and every component under it contain zero workforce references." TRUE in substance.**
`pages/admin/pos.vue` is 40 lines with zero hits. The POS tree had no workforce import and no workforce
API call. (Strictly, six comments and a shipped `/admin/employees` link in `pos-settings/OperatorsTab.vue`
mention staff, and `AdminPage` → `AdminPageHeader` carries the workforce nav — but `pos.vue` passes
`:chromeless="true"` so that header never renders. No functional coupling: the claim holds.)

**"The demo inserts punch rows by SQL." TRUE, but not in this repo.** There is no workforce demo script
here at all. It is `Scripts/workforce-demo/seed-workforce-demo.sh` in the **backend**, which inserts
`WorkforceClockEvents` and `WorkforceClockSessions` directly and says why in a comment: the POS clock
endpoint needs "an entire second product surface that this demo does not stand up". It calls the
**manager** surface, not the operator one.

**"No screen in this repo calls it." TRUE — and it was the whole gap.** Every read was already built:
7 workforce admin pages, 25 modules under `utils/workforce*`, 44 Jest suites. `utils/workforce/roster.js:257`
even reasons about "the POS clock path" guarding clock-out — a path with no caller.

### A fourth absence the brief did not name
**The e2e fixture served ZERO POS endpoints** — no cash point, no operator, no operator session, no
trading day, no board. `/admin/pos` could not be opened by a browser journey at all, whatever the clock
did. Standing the register up (`test/e2e/fixture/workforce-punch.js`) was a precondition of this lane.

## The defect this lane existed to avoid

`WorkforceClockProjection.StageClockOutAsync` returns `MissingPunchException` — `ClockSessionId`,
`OpenedUtc`, `ClosedUtc` all null — when a clock-out finds no open session. The raw punch is retained
(§3.4: raw truth is accepted, never rejected). `PosClockEventResponse.From` then derives

    SessionState = result.ClosedUtc.HasValue ? Closed : Open

so **clocking out with nothing open answers `200`, `accepted: true`, `clockSessionId: null`,
`sessionState: "Open"`.** A register bound to `sessionState` — the obvious reading, and the field named
for exactly this — flips to "clocked in" the moment a worker presses *Stemple ut*. They walk away
believing they clocked out and the register carries no end time, which is the one thing it exists to record.

`utils/workforce/pos-clock-state.js` holds the rule once: **`clockSessionId` is authoritative, never
`sessionState`.** Proven at three levels — unit (`stateFromClockEvent` returns `exception`, not `open`),
component (state chip is not "Stemplet inn"), and browser (step 12, screenshot 05: chip reads
`Til gjennomgang`, amber notice, no error, personnel list unchanged).

## Refusal matrix — verified in backend code, not assumed

| provocation | HTTP | code | proven |
|---|---|---|---|
| clock in twice | 409 | `workforce.open-session-exists` | step 10 + unit |
| **clock out, nothing open** | **200** | not a refusal — `clockSessionId: null` | step 12 + unit + component |
| operator not linked | 403 | `workforce.pos-operator-not-linked` | step 13 + unit |
| `workforce.clock` off | 409 | `workforce.flag-disabled-read-only` | step 5 + unit |
| dead operator session | **401**, plain `{message}`, **no problem code** | — | component test |
| module off | 403 | `workforce.module-disabled` | mapped, unit |
| verification failed | 403 | `workforce.pos-verification-failed` (retryable) | mapped, unit |
| DST ambiguous / nonexistent | 409 | `workforce.dst-*` | mapped |

`workforce.clock` defaults **false** with **no grandfather probe**, so out of the box every punch is a 409.
The journey turns it on through `/admin/feature-flags` — the product's only caller of that route — rather
than through a fixture helper, so what is proven is that an operator can pull the lever.

## Two product defects found by clicking

1. **The register's top bar was unreachable whenever the trading day was closed.** `BeginDayModal` is
   `position: absolute; inset: 0; z-index: 850` and the top bar had no stacking context, so the modal
   covered the navigation as well as the body it means to block. `needsDay` has always exempted `day` and
   `receipts` — but there was no way to REACH either, so the exemption described a mode you could only be
   in already. It matters most here: arriving at work happens **before** the day opens, so the first
   person in would have had to open a trading day (a fiscal event) to record that they showed up, and the
   last one out could not clock out after it closed. Fixed with `position: relative; z-index: 860` on
   `.pos-topbar` — the body stays blocked, only navigation stays live. **A test that called `setMode('clock')`
   would have passed; the click did not.**

2. **A fifth mode over-subscribed the bar at 1280.** The `ctrl-label` collapse was tuned at 1100px for
   four modes; at 1280 with five, the left block was squeezed until the cash point name and the
   trading-day badge overlapped the bar's own edge. Raised to 1300px, plus `flex-shrink: 0` on the nav and
   the day badge and `overflow: hidden` on the left block. Caught only by looking at the screenshot — the
   journey was green while the bar was visibly broken.

Also fixed: the fixture's CORS allow-list omitted `X-Operator-Session`, which is not a CORS-simple header,
so the browser failed the **preflight** and the call never reached a handler — "Failed to fetch" with no
status, which reads exactly like a dead endpoint. The real API allows it via `AllowAnyHeader()`
(`Program.cs:102`); the fixture had simply been narrower, and no POS endpoint existed here to notice.

## Suites

- `npx jest` → **2841 passed, 0 failed**, 120 suites passed. 5 suites fail to LOAD: all are other lanes'
  Playwright probe specs under `lanes/` that Jest cannot run (`L-TRAIN-*`, `L-WF-PIVOT-DEFECTS`,
  `L-JOURNEY-PORT-HARDCODED`). Pre-existing, none reference this lane's files.
- `test/workforce-pos-clock.test.js` (new) → **21 passed**, covering the state rule, the wire, and the
  screen in all three shipped languages (`$i` throws on an untranslated key).
- Neighbouring journeys: `workforce-flag-lever` and `workforce-invitation-onboarding` **pass**.
  `workforce-schedule-publish` **fails, and was already failing**: another lane has
  `test/e2e/support/journey-assertions.js` modified (uncommitted) to require an 11-rule validation pack
  while the committed fixture serves 2 (`workforce.rest-period`, `workforce.weekly-hours`). Not this lane's
  files and not this lane's area; it fails identically when run alone.

## Files — NOTHING COMMITTED

The brief forbids committing to a shared branch, and `feature/restaurant-modules` is shared. All work is
left in the working tree for the orchestrator to land.

Mine alone (safe to land by pathspec):

    components/admin/pos/ClockScreen.vue            new
    components/admin/pos/PosShell.vue               modified — +10/-1, all mine
    components/admin/pos/PosTopBar.vue              modified — all mine
    utils/workforce/pos-clock-client.js             new
    utils/workforce/pos-clock-state.js              new
    test/workforce-pos-clock.test.js                new
    test/e2e/fixture/workforce-punch.js             new
    test/e2e/journeys/workforce-pos-punch.spec.js   new

**Shared-dirty — DO NOT land by whole file:**

    test/e2e/fixture/api-server.js   also carries another lane's workforce-publications fixture and
                                     Growth mailbox work. My edits are 4 surgical spots: the require,
                                     the state entry, the delegation, and X-Operator-Session in the
                                     CORS allow-list.
    translations/{no,en,de}.ts       each already carried ~232 additions and one ff_page_intro reword
                                     from another lane. Mine are 27 pure key additions per file
                                     (`pos_mode_clock`, `posclk_*`), inserted after `pos_mode_receipts`.
                                     Never bulk-edited.

## Not done / carried

- **OD-2 verification is a pending Sven decision** (due 2026-10-01). The client sends the assertion as an
  opaque field and interprets nothing; the shipped backend impl is accept-all (`dev-accept`). Built against
  the seam as instructed. When a real mechanism lands the screen will need a prompt before the punch.
- **A cross-engagement punch is indistinguishable on the wire.** A second open session under a DIFFERENT
  legal employer answers 200 carrying the OTHER employer's `clockSessionId` and `sessionState: "Open"`;
  the `outcome` enum is not on the POS wire shape, so no client can tell it from a real clock-in. Not
  fixable from this side — recorded as a spec gap.
- No `§` reference and no statute name was added to any UI string. The register is labelled with the plain
  product noun `Personalliste` / `Personnel list` / `Personalliste`, which the repo already uses.
- Break punches (`BreakStart`/`BreakEnd`) are in the client's enum but have no control on the screen, and
  raise no personalliste presence server-side. Out of scope for "a person can clock in".
