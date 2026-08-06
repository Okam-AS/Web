# L-LIVE-WALK-WORKFORCE — evidence

**NO RUN CLAIMED.** No container started, no container touched, **no port bound**. 4010 / 4971 / 4973
never touched (all three held by foreign `node` pids 73160 / 96439 / 7406 — observed, not disturbed).
Read-only throughout.

Trees read:

| tree | commit | dirty |
|---|---|---|
| web (my worktree, clean detached) `/Users/svendaneel/okam/Web-modules-wt/L-LIVE-WALK-WORKFORCE` | `8ac6f63` | 0 tracked (only my own `lanes/` dir) |
| web (primary checkout, READ ONLY) `/Users/svendaneel/okam/Web-modules` | `8ac6f63` | 363 paths |
| api `/Users/svendaneel/okam/OkamAPI-grdelrec` (= `feature/restaurant-modules` tip) | `8e2b57de` | 0 |
| api lane `/Users/svendaneel/okam/OkamAPI-ackreload` (`lane/ack-receipt-inbox-column`) | `6dfbb74b` | read for §3a only |

**A wrong-tree correction, recorded because it nearly poisoned this return.**
`/Users/svendaneel/okam/OkamAPI` — the obvious path, and the one I reached for first — is on
**`feature/swiss` @ `597192ef`, dirty, last committed 2026-07-07**, and contains **no restaurant
modules at all**: no Workforce, Margin, Meals, Growth or Events. `grep -ri workforce` over it returns
zero hits. Every line number I read there was worthless and two of them differed from the real tree
by ~50 lines, which is exactly the kind of citation that survives review by looking plausible. The
tree the sibling lanes read is `8e2b57de`, held clean by the `OkamAPI-grdelrec` worktree, pinned
independently by `docs/plan/log.md:1861` and by the `Program.cs:1160 AddMarginModule()` marker the
Margin lane left. All backend citations below are at `8e2b57de`.

Worktree created with `git worktree add --detach`, `core` submodule initialised with
`-c protocol.file.allow=always`. Nothing written outside my lane directory. Nothing committed,
nothing pushed, no branch touched.

---

## 0. The headline

**The Workforce module is the "clean" flag shape — and it is still the module whose walk cannot be
completed live, for reasons that have nothing to do with flags.**

Workforce is not Events (absent master), not Growth (no resolver, master ANDs), not Meals (no
resolver, three flags withheld). It is Margin's shape or better: a registered resolver, a gate that
opens for a store with **no override row at all**, and a lever the walk already pulls successfully
against a live server. That is worth stating as plainly as a defect, and it is why the block below
is *not* a flag block.

What stops `workforce-week-run` from running live is **five wires**. The first is the one the brief
predicted — a place the fixture was lying — and it is the only one that would still have bitten after
everything else was fixed:

1. **THE FIXTURE LIE: the walk flips one flag and the product needs two.** The walk turns on
   `workforce.publication` and nothing else. The worker's acknowledge write is gated on a *different*
   stage flag, `workforce.selfservice`, default **false** (`WorkforceSelfService.cs:326`). On a live
   world — which `live-world.sh` deliberately seeds with **zero flag overrides** — the worker's press
   of *Bekreft mottatt* answers **409 `workforce.flag-disabled-read-only`**, not the `200` the walk
   asserts at `week-run.spec.js:265`. The fixture models no gate on that route, so it cannot produce
   the refusal. **And the read is ungated**, so the notice renders and the button is clickable — the
   walk goes green right up to the act. (§6a)
2. **The walk is not on the branch.** `test/e2e/journeys/workforce-week-run.spec.js` does not exist
   at HEAD `8ac6f63`. It exists only on the unmerged lane branch `lane/ack-receipt-survives-reload`,
   last touched at `ce6892a`, which is **not an ancestor of HEAD** (`git merge-base --is-ancestor` →
   NO; merge-base is `e34977a`, i.e. HEAD~1). Its backend half is a *second* unmerged lane,
   `lane/ack-receipt-inbox-column`, on the API repo (§6c).
3. **And it would red at HEAD even in fixture mode**, because three of the product repairs it asserts
   are on that same unmerged commit (§3).
4. **The live world has no worker who can sign in.** Exactly one usable no-SMS credential exists and
   the seed already spends it on the manager; the second is the PowerUser bypass whose phone number is
   deliberately written down nowhere, and a third no-SMS path is a lock-out, not a bypass (§4).
5. **The live world has no claimed engagement and no `Ola Ansatt`.** The walk staffs the shift *by
   that name* and then asserts the worker's own page is not the "no engagement" blocker (§5).

Only the **manager's half** of the walk is live-capable today. That half is already covered by
`workforce-schedule-publish`, which is `@live` and passed. The half `workforce-week-run` exists to
add — the worker's — is the half that cannot be walked.

---

## 1. What the objective actually names

Brief objective: *"the week run runs against the real backend, not a fixture."*
Brief exit: *"a journey artifact for **a manager plans** records backend live and status passed."*

That names exactly one journey. `artifacts/journeys/workforce-week-run.playwright.json`:

```
"journey": "workforce-week-run",
"title":   "A manager plans and publishes a week; the worker sees it and confirms it",
"status":  "passed",
"backend": "fixture",
"commit":  "69003ede03c402259a088e0d170d9bf62ddb0bf1",
"backendBuild": { "id": "fixture@69003ede…", "source": "fixture:test/e2e/fixture/api-server.js" }
```

So the fixture capture exists and passed — at commit `69003ede`, which is neither HEAD nor the lane
tip. The artifact is on disk in the primary checkout; **the spec that produced it is not.**

The parent framing ("a manager plans, publishes, a worker punches, a request is decided, and the
personalliste opens") is broader than this journey. `workforce-week-run` covers *plans → publishes →
worker sees → worker confirms*. The punch, the decided request and the personalliste live in other
specs (`workforce-pos-punch.spec.js`, `workforce-punch-correction`, …), **all of which are untracked
working-tree files in the primary checkout** — `git status` shows five untracked `workforce-*.spec.js`
under `test/e2e/journeys/`. None of them is on the branch either.

---

## 2. Where the walk lives

```
$ git ls-tree -r --name-only HEAD test/e2e/journeys/ | grep workforce
test/e2e/journeys/workforce-flag-lever.spec.js
test/e2e/journeys/workforce-invitation-onboarding.spec.js
test/e2e/journeys/workforce-schedule-publish.spec.js

$ git log --all --oneline -- test/e2e/journeys/workforce-week-run.spec.js
ce6892a The worker's confirmation is still there after a refresh
8539b3f The worker who confirms a published week is shown the receipt
4ef0d00 Journey: a manager runs a week and a worker confirms it

$ git branch -a --contains ce6892a
+ lane/ack-receipt-survives-reload

$ git merge-base --is-ancestor ce6892a HEAD  →  NO
```

A copy of the spec is preserved read-only at
`lanes/L-LIVE-WALK-WORKFORCE/week-run.spec.js` (432 lines, `git show ce6892a:…`).

---

## 3. The walk asserts three repairs that are not at HEAD

`ce6892a` and its parents changed `WorkforcePublicationNotice.vue`, `pages/admin/workforce-me.vue`
and `utils/workforce-me/inbox-filter.js` so that (a) the acknowledged row survives instead of being
`v-if`'d away, and (b) `acknowledgedAtUtc` comes back from `GET /workforce/me/inbox` so the receipt
survives a reload. At HEAD none of that is present:

| what the walk asserts | HEAD state | file:line at HEAD |
|---|---|---|
| the row survives acknowledgement and the receipt renders (`week-run.spec.js:296-317`) | page still feeds the notice `unreadPublicationItems`, so the acknowledged row is dropped | `pages/admin/workforce-me.vue:42,437-438`; `utils/workforce-me/inbox-filter.js` exports only `publicationCount, unreadPublications` (imported at `workforce-me.vue:288`) |
| the receipt survives a reload (`week-run.spec.js:363-393`) | receipts are session state only (`ackReceipts`), written at ack and never re-read | `pages/admin/workforce-me.vue:348, 756`; `WorkforcePublicationNotice.vue:17-18, 66-67` (`receipts` prop = "returned during this session") |
| the inbox row carries an acknowledgement instant | HEAD's own comment says it does not | `utils/workforce-me/inbox-filter.js:110-111` — *"It does NOT tell us whether the worker acknowledged … the inbox row carries no acknowledgement field."* |

So "the fixture-backed walk already exists and passes" is true of `ce6892a` and **false of the commit
I was told to work from**. Landing it live is a merge first, a world second.

---

## 4. The second sign-in — the wire that stops the worker's half

`workforce-week-run` signs in **two people** on one page:

```js
const MANAGER = { phone: '99999999', code: 'AppSettings__DemoVerificationCode__REDACTED' };   // week-run.spec.js:58
const WORKER  = { phone: '90000001', code: 'AppSettings__DemoVerificationCode__REDACTED' };   // week-run.spec.js:63
```

The manager is real against a live backend: `+4799999999 / AppSettings__DemoVerificationCode__REDACTED` is
`AppSettings.DemoPhoneNumber` / `DemoVerificationCode`, and `live-world.sh` signs in on exactly that
pair (`test/e2e/scripts/live-world.sh` step 5, `MANAGER_PHONE`/`MANAGER_CODE`).

`90000001` is **fixture-only**: `test/e2e/fixture/world.js:22` `const WORKER_PHONE = '+4790000001'`.
There is no such account on a live world and no route creates one.

**Measured at `8e2b57de`, not inferred.** There are three no-SMS-shaped predicates, all at
`Services/UserService.cs:631-636`, and **only one of them is a usable credential**:

| path | predicate | usable by a journey? |
|---|---|---|
| A — demo | `IsDemoPhoneNumber` `:631` + `IsDemoVerificationCode` `:632`; short-circuited at `Controllers/UserController.cs:178-180` and `OAuthLoginController.cs:118-120` | **yes** — `+4799999999` / `AppSettings__DemoVerificationCode__REDACTED`, `appsettings.json:18-19`. **This is the manager the seed already uses.** |
| B — power user | `IsPowerUserPhoneNumber` `:634` + `IsPowerUserVerificationCode` `:635` | **only if configured.** `appsettings.json:13` ships the *phone* as the literal string `"Set in Azure. For development, set in User Secrets"`, so out of the box it can never match. The *code* `AppSettings__PowerUserVerificationCode__REDACTED` is committed at `appsettings.json:20`. |
| C — `IsNoSmsPhoneNumber` `:636` | hardcoded `40053272` / `98332280` | **NO — and it is a trap.** `SendVerificationTokenAsync` (`:560-570`) generates the token, `:565-566` returns before sending it, and nothing returns it to the caller. `UserController.Login:178-180` knows only A and B, so these numbers still have to satisfy `VerifyTokenAsync` (`:572`) with a code nobody can read. The source comment says they belong to an "etisk hacker": this is an anti-abuse **lock-out**, not a bypass. |

`DemoPhoneNumber` is a **single scalar**, not a list. Environment binding
(`Program.cs:44-52`) can repoint it — but it can name the manager **or** the worker, never both.
There is no fake/dev `ISmsService`: a plain new number goes through `GetOrCreateAsync:533-558`, whose
`:540-545` calls the real `_smsSender.ValidateNumberAsync` and returns null if the provider does not
confirm it.

(I first read these predicates in the `feature/swiss` tree, where the same helpers sit at `:578-583`
and carry an extra `_backdoorsOn` gate. Those line numbers are **not** valid for this branch. See the
wrong-tree note at the top.)

The estate has already met this exact wall and written down the only answer. From the *uncommitted*
`admin-refusal-worker.spec.js` in the primary checkout (lines 40-72, 77-84):

- the only other no-SMS sign-in is the PowerUser bypass, `AppSettings:AdminUserPhoneNumber` +
  `AppSettings:PowerUserVerificationCode` (`Services/UserService.cs:601` →
  `PowerUserRoleSeed.EnsureConfiguredAdminHoldsRoleAsync`);
- `appsettings.json` ships the *number* as the string `"Set in Azure. For development, set in User
  Secrets"`, and Identity's account-name charset is narrowed to `+0123456789`
  (`Helpers/ServiceCollectionExtensions.cs:182`), so the bypass is **inert out of the box**;
- the number is therefore handed to the API process as `AppSettings__AdminUserPhoneNumber=+47…`, and
  *"no value for it is written down anywhere, here or in the estate, and none should be."*

That file's fix is the pattern this lane would have to adopt: `E2E_WORKER_PHONE` / `E2E_WORKER_CODE`,
with the `@fixture` tag coming off **only** when the env var is set
(`tag: process.env.E2E_WORKER_PHONE ? ['@live'] : ['@fixture']`). It is uncommitted, so it is not on
the branch either.

**But the substitution does not carry to `workforce-week-run`**, and this is the sharper half:
`admin-refusal-worker`'s subject is a person who administers nothing, which a PowerUser satisfies.
`workforce-week-run`'s worker must be **a person the manager rostered and who holds a claimed
engagement at this store** — see §5. A PowerUser with no engagement lands on the blocker.

---

## 5. Nobody in the live world can be the worker

`test/e2e/scripts/live-world.sh` step 5b seeds the roster as: **Astrid Vik** (`+4790000101`,
ANS-002), **Ingrid Moen** (the manager, `+4799999999`), **Jonas Lie** (`+4790000102`, ANS-003).
The banner prints exactly that list. There is **no `Ola Ansatt`** — that name is
`test/e2e/fixture/world.js:166`, fixture only. The walk staffs the shift **by that name**:

```js
const row = page.locator('.wf-grid__row', { hasText: 'Ola Ansatt' });   // week-run.spec.js:166
```

and says why: *"BY NAME, because the last three steps of this journey are about what OLA sees."*
Renaming the target is not cosmetic — it is the join between the manager's publish and the worker's
screen, and the walk is explicit that a shift on "whichever row happened to be first" would leave
the worker's screen proving nothing.

Worse, the two colleagues are **unclaimed**. `workforce-invitation-onboarding.spec.js:3-5` states it
and `live-world.sh` never closes it: *"`POST /staff` creates a WorkforcePerson with no
`ApplicationUserId`, and endpoint 32 (`POST /workforce/me/invitations/claim`) is the ONLY route in
the module that ever sets one."* The seed creates both colleagues through `POST /staff` and issues no
invitation and no claim.

So on a freshly seeded live world, `selfMemberships` is empty for every account that can sign in, and
`pages/admin/workforce-me.vue:36` renders `.wfme__blocker` with the whole notice section inside the
`v-else`. The walk asserts the opposite twice:

```js
await expect(page.locator('.wfme__blocker')).toHaveCount(0);   // week-run.spec.js:220
await expect(notice).toBeVisible();                            // week-run.spec.js:236
```

**Four of the walk's six declared capabilities** (`workforce.me.schedule`, `workforce.me.inbox`,
`workforce.me.publication-acknowledge`, plus R3's worker refusal) sit behind that blocker.

---

## 6. The flag shape — Workforce is clean, and the walk pulls its own lever

Stated because four siblings found four different defects here and a clean answer is worth as much:

- `workforce.publication` is deny-closed and gates all four schedule writes. The walk pulls it
  **through the operator page**, not a backdoor: `week-run.spec.js:147` `turnOn(page, PUBLICATION_FLAG)`
  → `test/e2e/support/flags.js` presses `[data-flag-on=…]` on `/admin/feature-flags` and re-reads the
  badge from the write **response**.
- That lever is already proven live: `workforce-flag-lever.spec.js` carries `tag: ['@live']`
  (line 61) and its artifact records `"backend": "live"`, `apiBaseUrl http://127.0.0.1:5961`,
  `backendBuild.id "wt-lwr-api@3579bbbc…"`, `status passed`, 80 backend calls.
- `workforce.module` needs **no override row at all**. `live-world.sh`'s header states the mechanism —
  the gate falls back to a data probe ("does this store already have an engagement") *"precisely so
  that turning a gate on cannot dark a store that is already using the module"* — and 5b's comment
  repeats it: the bootstrap engagement *"is also what opens `workforce.module` for this store through
  the gate's grandfather probe, with no override row."* `workforce.setup` ships ON
  (`WorkforceFeatureFlags.DefaultOn`).
- Consequently **`live-world.sh` needs no module switch added for Workforce** — unlike Events
  (`Events__Enabled=true` on the launch line) and Meals (`Features__Meals__Module=true`). Its step 4
  comment is correct for this module.
- The seed also asserts the board starts honest: `OVERRIDES` must be `0`, so the R2 refusal the walk
  provokes is the state a real venue is in.

The one nuance: **the effective resolver is not visible from `Program.cs` alone.** Margin's lane
learned this the hard way (`MarginModuleFlagEffectiveResolver` is registered inside
`MarginModuleServiceCollectionExtensions.cs:35`, one call away from `Program.cs:1160`). I swept the
extension files rather than the composition root for the same reason.

---

## 6a. THE FIXTURE LIE — the walk flips one flag and the product needs two

This is the finding the brief predicted, and it is invisible until something real answers.

`workforce-week-run` turns on **exactly one** flag, and says so:

```js
const PUBLICATION_FLAG = 'workforce.publication';   // week-run.spec.js:65
await turnOn(page, PUBLICATION_FLAG);               // week-run.spec.js:147
```

That is enough for the manager's half. It is **not** enough for the worker's. The acknowledge write
is gated on a *different* stage flag:

```
Services/Workforce/WorkforceSelfService.cs:326
    await _moduleGate.EnsureStageWriteEnabledAsync(
        engagement.StoreId, WorkforceFeatureFlags.SelfService, ct);
```

`workforce.selfservice` is declared at `Services/Workforce/WorkforceFeatureFlags.cs:51` (const) /
`:84` (default table) with default **false**, and it is *advertised* in the operator catalogue — so
it has a lever, it is simply never pulled. `POST /workforce/me/inbox/{itemId}/read` is gated the same
way (`WorkforceSelfService.cs:259`).

So on a live world seeded by `live-world.sh` — which deliberately writes **zero flag overrides** and
asserts it (`OVERRIDES` must be `0`) — the worker's press of **Bekreft mottatt** answers
**409 `workforce.flag-disabled-read-only`**, not the `200` the walk asserts:

```js
expect(response.status()).toBe(200);               // week-run.spec.js:265
expect(receipt.alreadyAcknowledged).toBe(false);   // week-run.spec.js:269
```

The fixture cannot produce that refusal — it models no gate on that route at all — which is the same
shape `test/e2e/support/flags.js` already records for `workforce-schedule-publish`: *"green for a week
while every one of its four writes would have answered 409 on a real venue."* This is that defect
again, one module over, on the one journey nobody has run live.

**The asymmetry is the trap.** The read the walk depends on is *ungated* —
`GET /workforce/me/inbox` (`Controllers/WorkforceMeController.cs:153`) is one of the five routes the
module flag does not refuse; it *filters* module-off stores and returns `200`
(`Services/Workforce/WorkforceSelfService.cs:445-476`). So the notice would render, the button would
be on screen and clickable, and only the POST would refuse. A walk that checked "can the worker see
it?" would go green right up to the act.

---

## 6b. Workforce is a FIFTH flag shape, and the cleanest of the five

Not Events' absent key, not Growth's AND, not Margin's allow-list, not Meals' withheld trio:

| | master key | in config? | combinator | resolver | registered in |
|---|---|---|---|---|---|
| Events | `Events:Enabled` | **neither file** | — | none | — (controller-wide `IActionFilter`) |
| Growth | `Growth:Enabled` | yes, false | **AND** | **none** | — |
| Margin | `Margin:EnabledStoreIds: []` | yes, `[]` | coalesce | `MarginModuleFlagEffectiveResolver` | module extension `Helpers/Margin/MarginModuleServiceCollectionExtensions.cs:35` |
| Meals | `Features:Meals:*` | yes, all false | coalesce | **none** | — |
| **Workforce** | **`workforce.module` — a code const, no config key** | **no `Workforce` section in either file** | **3-tier ladder** | **`WorkforceModuleFlagEffectiveResolver`** | **`Program.cs:783` — the composition root** |

`Services/Workforce/WorkforceModuleGate.cs:33-57` is the ladder, and the order is the point:

1. `:39-43` an explicit override row wins **in both directions** — checked first *"so that setting the
   flag to false really darkens a store that has engagements — otherwise the grandfather probe below
   would swallow the kill-switch"* (the comment names the Events.Deposits defect as the reason);
2. `:45-48` the compile-time default (`false` for `workforce.module`, `WorkforceFeatureFlags.cs:81`);
3. `:55-56` **a data probe** — `WorkforceStaffMembers.AsNoTracking().AnyAsync(s => s.StoreId == storeId)`.

**`live-world.sh`'s claim is VERIFIED, not refuted**: the seed's bootstrap engagement is what opens
`workforce.module`, with no override row. Pinned both ways at
`WebApi.Tests/Workforce/WorkforceModuleGateTests.cs:185` and `:207`.

The resolver at `Program.cs:783` is what stops the board lying about it — its own comment says so:
*"without it the endpoint would answer `effective:false` for a grandfathered store, and the admin
client renders the module from exactly that field."* So Workforce is the **only** one of the five that
can turn itself on with zero config and zero rows, and the only one whose board tells the truth about
it. **`live-world.sh` therefore needs no Workforce switch added** — unlike Events (`Events__Enabled`)
and Meals (`Features__Meals__Module`). Worth stating as plainly as a defect.

Family: **9 flags** (`WorkforceFeatureFlags.cs:79-90`), **2 withheld** from the catalogue
(`workforce.personnel-list`, `workforce.export`, reasons recorded at `:113-129`) — not Meals' 3-of-4.
`workforce.setup` is the one that ships **on** (`:82`, `DefaultOn` at `:135-144`).

**48 of 53 routes confirmed**, and the mechanism is neither Events' filter nor an attribute: it is an
in-service check at `Services/Workforce/WorkforceAuthorizationService.cs:89` and `:115`
(`EnsureEnabledAsync`), reached by every store-scoped route. The five that survive are the invitation
claim (`WorkforceMeController.cs:66` — gating it would be circular), the three cross-store `/me` reads
which filter rather than refuse (`WorkforceSelfService.cs:445-476`), and
`GET /workforce/pos/personnel-list` (`WorkforcePosController.cs:145`), exempted on statutory grounds —
*"an operator switching `workforce.module` off must not be able to make a register that was already
written unproducible"* (`:153-160`, pinned at `WorkforceModuleGateTests.cs:265`). That last one is C6
being honoured in code, and it is worth knowing before anyone "simplifies" the gate.

---

## 6c. The second unmerged lane — the backend half

§3 established the frontend repairs are unmerged. The **backend** column the walk's reload step needs
is unmerged too, on a *different* branch:

- At `8e2b57de`, `WorkforceInboxItemModel` (`Models/Workforce/WorkforceSelfServiceModels.cs:73-85`)
  carries `IsRead` and `ReadAtUtc` and **no acknowledgement field**.
- `lane/ack-receipt-inbox-column` (`/Users/svendaneel/okam/OkamAPI-ackreload` @ `6dfbb74b`) adds
  `public DateTime? AcknowledgedAtUtc { get; set; }`. Its whole diff against `8e2b57de` is three
  files, +79/−6: `WorkforceSelfServiceModels.cs`, `WorkforceSelfService.cs`,
  `WorkforceSelfServiceTests.cs`.
- **It carries no entity change and no migration**, because the column already exists at base:
  `Entities/Workforce/WorkforceSchedulePublicationRecipient.cs:36`. The lane is purely a *projection*
  change — the read was simply not carrying a column the table already had. That makes it C2-clean
  and cheap to land, which is worth knowing before anyone schedules it behind a migration author.

So the walk's last two steps (`week-run.spec.js:363-393`, "the confirmation is still there after a
refresh") need **two unmerged lanes landed on two repositories** — `lane/ack-receipt-survives-reload`
on web and `lane/ack-receipt-inbox-column` on api — before a live run could go green.

The flag this pins, `F-WF-ACKNOWLEDGE-SHOWS-NOTHING`, is **still open** (`plan.md:22350`), and its
clearing condition is *"pinned by the workforce week-run journey rather than by a component test"* —
i.e. by the exact artifact this lane was asked to produce.

---

## 7. Untagged journeys are NOT a live-mode hazard — checked, and refuted

I expected to find one and did not, so it is recorded as a non-finding. `playwright.config.js`
sets `grepInvert: LIVE_API ? /@fixture/ : undefined`, so an untagged journey would be *included* in
live mode. At HEAD only three specs write a literal `tag:` (`events-deposit-precondition:73`,
`workforce-schedule-publish:67`, `workforce-flag-lever:61`) — every other journey is untagged. But
`test/e2e/support/journey.js:721,725` defaults it:

```js
function journeyDetails ({ journey, capabilities, surface, tag, underTest }) {
  … tag: tag || ['@fixture'],
```

So the nineteen untagged journeys are excluded from live mode correctly. `workforce-week-run` is
untagged and would therefore be excluded too — **which is itself the last wire**: even fully merged
and fully seeded, the spec needs `tag: ['@live']` (or the `E2E_WORKER_PHONE` ternary) before a live
selection would pick it up at all.

---

## 8. Resources — measured, not assumed

The block is **the slot grant, not memory**, and not the container either.

```
$ docker info --format '{{.MemTotal}}'          → 8217473024   (7.653 GiB)
$ docker stats --no-stream
  mystifying_gates                        3.134GiB / 7.653GiB
  testcontainers-ryuk-29cdcd1e-…            11.46MiB / 7.653GiB
```

≈ **4.5 GiB free**. `plan tick` reported `CLASS node 4/6 · suite 1/4 · sql 1/2 CAP-OK` — a sql slot
is *numerically* free, but my class is `node · pts 1` and my brief grants no sql slot, and the
boundary is explicit: *"Never start a container unless your brief grants the slot."*

Nor is there one to borrow. `live-world.sh` **borrows** a running mssql container
(`docker exec -i "$SQL_CONTAINER" … sqlcmd`) and dies at line ~237 unless one is running. The only
running mssql is `mystifying_gates` (up minutes, alongside a live `testcontainers-ryuk` container):
it is a Testcontainers-owned container belonging to another lane's suite. Borrowing it would be
touching a container I did not create **and** would put a ~3-minute world build behind a reaper that
can drop it mid-run. The three `okam-lws-*` / `zen_pasteur` mssql containers are `Exited (0)` 41
hours; none is mine to restart.

---

## 9. What the next lane needs, in order

1. **Merge two lanes on two repos**: `lane/ack-receipt-survives-reload` (`ce6892a`, web — the spec
   *and* the three product repairs it asserts) and `lane/ack-receipt-inbox-column` (`6dfbb74b`, api —
   the `AcknowledgedAtUtc` projection). Until then there is nothing at HEAD to run, and the reload
   step has no column to read.
1b. **Turn on `workforce.selfservice` too** — through the operator page, the way the walk already
   pulls `workforce.publication` (one more `turnOn` call, not a seeded row). Without it the
   acknowledge POST is a 409 and the walk's central act cannot happen. See §6a; this is the wire the
   fixture was hiding and it is a one-line change to the walk.
2. **A sql slot** plus a SQL container the lane owns, then `live-world.sh` + `live-world-reset.sh
   snapshot`.
3. **A second no-SMS sign-in for the API process**: `AppSettings__AdminUserPhoneNumber=+47…` on the
   launch line in `live-world.sh` step 4, mirrored into `E2E_WORKER_PHONE` / `E2E_WORKER_CODE` the
   way the uncommitted `admin-refusal-worker.spec.js` already does. The number is an operator's own
   and must not be written into this repo or into an artifact (that file writes the *source*,
   `env:E2E_WORKER_PHONE`, not the value — C7-shaped, and right).
4. **A claimed engagement in the seed.** `live-world.sh` 5b must additionally issue an invitation for
   one colleague and claim it as that account (`POST /workforce/me/invitations/claim`, endpoint 32) —
   otherwise `selfMemberships` is empty and the worker's half has no DOM. This is a real extension of
   the seed, and the seed's own header says the next journey to go live extends it rather than
   reinventing the plumbing.
5. **Rename the walk's target**, `Ola Ansatt` → the claimed colleague (`Astrid Vik`), *and say so in
   the header* — the by-name join is load-bearing and the rename must not be silent.
6. **Tag it** `@live` (or the env-var ternary), or live selection skips it.

Steps 3-5 are the "difference the fixture was hiding": the fixture can mint a second human and a
claimed engagement for free; the product cannot, and has exactly one endpoint that ever links a
person to an account.
