# L-A-MODULE-OFF-NAMES-THE-MODULE — detail

Actor `agent:L-A-MODULE-OFF-NAMES-THE-MODULE` · brief `88c5876c` · 2026-08-07.

Branched from frontend **`00d84d7`** and backend **`9fb057d00`**, the two tips the brief names. The
frontend trunk moved to `9d275dd` mid-lane (one Training lane, landed); `git merge-tree --write-tree
9d275dd lane/a-module-off-names-the-module` merges clean, so the lane still applies. Backend trunk is
still `9fb057d00`.

Nothing was pushed. `:3971`, `:5971`, `web-livewalk`, `wt-lwtwo-api` and every `okam-lwtwo-*`
container were never written to, restarted or killed.

---

## Defect one — the refusal blamed the person. Fixed, and shown in a browser.

### Reproduced first, on the owner's world

`walk-before.js` signs in on `:3971` as the manager, switches `workforce.module` off **by clicking
the board**, reads the roster, and switches it back. The decisive line is not the rendered text, it
is the raw 403 body:

```
403 /workforce/stores/1/context ::
  {"type":"https://okam.no/problems/workforce/module-disabled","title":"Forbidden","status":403,
   "detail":"The Workforce module is not enabled for this store.",
   "code":"workforce.module-disabled","traceId":"0HNNJTTMJ3H8A:00000009"}

roster printed: «Du har ikke bemanningstilgang i denne butikken.»
```

**The wire already carried the answer.** `WorkforceAuthorizationService.RequireAnyCapabilityAsync`
checks the caller's capability *first* and only then asks `_moduleGate.EnsureEnabledAsync`, so
`workforce.module-disabled` can only reach somebody who already holds an engagement in that store.
Nothing on the server had to move; the client was throwing the distinction away.

### The change

`utils/workforce/context-refusal.js` — `contextRefusalKey(error, { noCapability, failed })`, keyed on
the stable `code` extension and using the bare status only as the stripped-body fallback. This is the
rule `classifyDecisionFailure` (requests inbox), `classifySelfFailure` (worker's own page) and
`ClockScreen.refusalMessage` already followed; the admin pages were the outlier.

`wf_module_off` added to `no` / `en` / `de`. It names the module and the switch and states outright
that it says nothing about the reader's access.

**All nine admin pages, not one.** The defect was nine copies of one branch
(`delivery`, `personnel-list`, `publications`, `rates`, `requests`, `roles`, `roster`, `schedule`,
`timesheets`). Only the module-off sentence is shared; each page keeps its own `*_no_capability` and
`*_context_failed`, because those are about that page's own surface.

The template-level `v-else-if="!canManage"` refusals on `delivery`, `personnel-list` and `rates` were
left alone — they fire on a context that SUCCEEDED and are genuinely about the person.

### Browser proof — one dark window, two servers

`walk-after.js` runs a **second** Nuxt dev server on `:3979`, from this lane's worktree, pointed at
the same `API_BASE_URL=http://127.0.0.1:5971`. `workforce.module` is switched off once, and while it
is off both rosters are read:

```
:3971 (old code)  Du har ikke bemanningstilgang i denne butikken.
:3979 (fixed)     Bemanningsmodulen er ikke slått på for denne butikken. Det er en bryter per
                  butikk (workforce.module), og den står av her — det sier ingenting om hvilke
                  tilganger du har.
:3979 schedule    (the same sentence — the sibling sweep, same window)
```

Same store, same flag, same 403 body, one instant apart. The only difference between the two servers
is this diff. Screenshots: `after-roster-dark-3971-old.png`, `after-roster-dark-3979-fixed.png`,
`after-schedule-dark-3979-fixed.png`, `after-roster-relit.png`.

### Tests

`test/workforce-context-refusal.test.js` (new, 11 tests) and one added to
`test/workforce-roster-page.test.js`. The census in the new file is over all nine page files, so a
page that reverts reds even while its own suite is green.

Three mutations, each applied and each red, each restored to green:

| mutation | result |
|---|---|
| `git checkout pages/admin/workforce-roster.vue` (revert one page) | 3 failed / 28 passed |
| `contextRefusalKey` returns `keys.noCapability` for the module code | 3 failed / 28 passed |
| `wf_module_off` renamed to `wf_module_offX` in `no.ts` | 2 failed / 9 passed |

Frontend tier **165 suites / 3886 passed / 0 failed**, against the brief's baseline **164 / 3874 / 0**
measured on this same worktree before the change (`tier-baseline.txt`). Delta +1 suite, +12 tests —
exactly the 11 new plus the 1 added. ESLint clean on every changed file; the one `indent` warning in
each translation file is at line ~699 and pre-exists at trunk (checked by stashing).

---

## Defect two — the exit criterion is wrong, and the bootstrap is the side that was wrong

The brief asked which side is wrong before changing either. It is the bootstrap, on four independent
pieces of evidence:

1. **Measured live, through the app's own client.** The board offers eight `workforce.*` rows and not
   this one. `PUT /stores/1/feature-flags {flagKey:"workforce.personnel-list"}` answers
   **400 `{"message":"Unknown feature flag: workforce.personnel-list"}`**, and the same route with an
   advertised key one call later answers **200**. The route is not broken; the catalog does not carry
   the key.
2. **The withholding is statutory, not stylistic.** `WorkforceFeatureFlags.Withheld[PersonnelList]`:
   both personalliste reads (endpoints 30 and 46) *and* the § 8-5-6 correction — its one write — are
   obligations no switch may pause, because bokføringsforskriften § 8-5-6 makes producing the
   register and recording who corrected it part of the same duty.
3. **It is measured, not asserted.** `WorkforceFlagConsumptionTests` runs a behavioural census over
   the probed surface, including the § 8-5-6 correction route, and pins that this flag gates
   **nothing** — plus `Assert.Equal(new[]{ PersonnelList }, Withheld.Keys)`. Offering the flag would
   red that test beside the withholding it invalidates.
4. **No production code reads the constant.** At `9fb057d00`, `WorkforceFeatureFlags.PersonnelList`
   appears only in two test files.

**So `workforce.personnel-list` is offered by the switchboard` is not achievable without shipping a
lever that moves nothing** — the exact defect `Withheld` was written to end, and the shape C3 names.
That half of the exit is refused, and this lane's verdict is `fail-spec` because of it.

### What was fixed instead

`Scripts/demo/seed-workforce-demo.sh` INSERTs its flag rows straight into `StoreFeatureFlags`,
because the bootstrap runs before there is anything to talk to. It is the one write path in the
estate that does not pass `StoreFeatureFlagsController`'s deny-closed check, and it seeded
`workforce.personnel-list` — a row nothing reads, written past the guard that exists to refuse it,
into the table the operator's own screen reads back. The key is gone from the loop and the reported
count is 7.

`WebApi.Tests/Workforce/WorkforceDemoSeedFlagTests.cs` (new, 3 tests) parses the script's own loop
out of the source and pins it against `WorkforceFeatureFlags.Describe()` minus the module master, in
**both** directions: a withheld key put back reds, and a flag that LEAVES `Withheld` — as
`workforce.export` did when W5 landed — reds until the seed picks it up. The third test pins the
count the script prints against the number it writes.

Mutations, each applied and red, each restored and green:

| mutation | result |
|---|---|
| `workforce.personnel-list` re-added to the loop | 3 failed / 0 passed |
| `Withheld` entry for `PersonnelList` deleted (C# — rebuilt, assembly mtime checked) | 2 failed / 1 passed |

Backend non-SQL tier **4883 passed / 0 failed / 10 skipped**, against the brief's baseline
**4880 / 0 / 10**. Delta +3 — exactly the three added. Run from `WebApi.Tests/`, and the log carries a
real `Passed: 4883, Total: 4893` line rather than the root no-op the brief warns about. The first
attempt aborted with `Test host process crashed` at 277 tests while three other agents were running
the same tier on this host; the rerun is the number above.

Why the seed was not rewritten to read `GET /feature-flags/catalog` instead: nothing in this lane can
run it (it needs a Docker SQL container and the demo API on `:5091`, neither of which this brief
grants), and an unrun `jq` parse that silently yields an empty list is a worse failure than the one
being fixed. The pinning test gives the same non-drift guarantee and does run.

---

## The world

`board-final.js` is a read-only close-out: **19 rows, 19 `På`, 0 not**, and
`offers workforce.personnel-list: false`. Both walks restore in a `finally`; each dark window is one
module wide.

One disclosed side effect: the live-world probe sent `PUT workforce.setup=true` as a control, to
prove the 400 above was about the key and not about the route. That row was already
`Overstyrt for butikken` / `Faktisk: på` before and reads identically after
(`walk-before.json` → `steps.board` vs `steps.boardFinal`); only `UpdatedAtUtc`/`UpdatedByReference`
moved on a row that already existed.

## Constraints

* **C1** — no UPDATE or DELETE against any append-only table. The only SQL touched is an INSERT loop
  in a demo seed, and the change removes one INSERT.
* **C2** — no migration, no `OnModelCreating` edit.
* **C3** — no new flag, service, route or page. The lane's second half is the reverse: it removes a
  write for a flag that has no enforcement point, rather than giving one a lever it must not have.
* **C4** — nothing on a money path.
* **C5** — met for defect one: a person's screen is the evidence, and the fixed sentence is in a
  browser against the live API. Defect two's evidence is also a browser: the board and the 400.
* **C6** — no statutory claim added or moved. § 8-5-6 is cited in a code comment as the *reason a
  flag is withheld*, which is a claim about the code, not a claim printed to a user.
* **C7** — no logging call added anywhere. The walk that sends a `PUT` reads the bearer *inside the
  browser context* and returns only status and body, so no token crosses into Node, a file or a log.
  The lane directory greps clean for bearers and JWTs. The three scripts carry the demo manager's
  phone and the demo verification code as constants, exactly as the sibling walk lane's scripts do
  and as this brief itself publishes them; they are `AppSettings.DemoPhoneNumber` /
  `DemoVerificationCode` on a local world, not a credential.

## Artifacts

All under `lanes/L-A-MODULE-OFF-NAMES-THE-MODULE/`:

```
walk-before.js / .json / .log        the two defects on :3971, before anything
roster-dark-before.png               the person-blaming refusal, live
walk-after.js / .json / .log         one dark window, :3971 old vs :3979 fixed
after-roster-dark-3971-old.png       what the served tree prints
after-roster-dark-3979-fixed.png     what this lane's tree prints, same instant
after-schedule-dark-3979-fixed.png   the sibling sweep
after-roster-lit.png / -relit.png    before and after the dark window
board-final.js / .json / .png        19/19 På, read-only close-out
tier-baseline.txt / tier-after.txt   164/3874/0 -> 165/3886/0
be-tier.txt / be-tier-workforce.txt  4883/0/10, and the Workforce subset 748/0/1
devserver.log                        this lane's own :3979 dev server
```

Branches, neither pushed. **Backend lands first** — the frontend half needs no backend change at all,
but the seed fix is independent and the two never have to travel together:

* `OkamAPI-modules` `lane/a-module-off-names-the-module-be` @ `8357c8a33`, off `9fb057d00`
* `Web-modules` `lane/a-module-off-names-the-module` @ `2ce83f6`, off `00d84d7`

Worktrees `/Users/svendaneel/okam/wt-modoff` and `/Users/svendaneel/okam/api-modoff` were created and
**removed** (`rm -rf` after verifying clean, then `git worktree prune` in both repos — `git worktree
remove` refuses a Web-modules worktree because of the submodule). The `node_modules` symlink was
unlinked first and the owner's `node_modules` and `core/` are intact. The `:3979` dev server was
stopped by PID; `:3971` still holds its listener. No `npm install` and no `npm ci` was run.
