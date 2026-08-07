# L-THE-GUEST-EXIT-IS-FINISHED — the inherited article 7(3) lane, checked rather than believed

verdict: **built** — the journey the killed lane left behind **does** pass, reproduced from scratch, and the
one clause of the exit criterion it cannot meet is named below with what it would take. Four claims in the
inherited write-up are corrected, one of them materially.

## 0. What was inherited, and what state it was actually in

`lane/fe-a-guest-can-leave-a-mailing-list` @ **`2719fbe`** and `lane/a-guest-can-leave-a-mailing-list` @
**`27b32737c`**, committed by a session-exit rescue with the note *"Never finished, never reviewed, and not
known to pass."* Its self-assessment is
`lanes/L-A-GUEST-CAN-LEAVE-A-MAILING-LIST/evidence.md`, and this document treats every sentence of it as a
claim to check, not a fact to repeat.

**Nothing was inherited on trust.** Two FRESH worktrees were cut at those two commits —
`/Users/svendaneel/okam/Web-modules-wt/L-THE-GUEST-EXIT-IS-FINISHED` (detached `2719fbe`, `core` pinned to
`9626a561`) and `/Users/svendaneel/okam/OkamAPI-modules-wt/L-THE-GUEST-EXIT-IS-FINISHED` (detached
`27b32737c`, built clean, 0 errors) — so nothing here rests on the dead lane's build output, its
`node_modules`, or its leftover run directory.

## 1. It passes. That was the open question and it is now closed.

```
OKAM_API_REPO=/Users/svendaneel/okam/OkamAPI-modules-wt/L-THE-GUEST-EXIT-IS-FINISHED \
  test/e2e/scripts/growth-guest-exit-world.sh          -> exit 0
  1 passed (3.3s)   == no artifact carries the token
```

`runs/journey-run-1.txt`, `runs/journey-run-2.txt`; artifact `journey/growth-guest-exit-cross-origin.playwright.json`,
`"status": "passed"`, `backendServed: 2`, `backendSubjectServed: 2`, `foreignSubjectServed: 0`,
`consoleErrors: []`, `failedRequests: []`. The artifact's `backendBuild.id` reads
`L-THE-GUEST-EXIT-IS-FINISHED@27b32737c…` — this worktree, not the dead lane's.

All nine steps green, including the two that carry the weight:

* **step 4** — `POST https://127.0.0.1:5943/v1/growth/unsubscribe -> 200`, from a page on
  `https://localhost:3943`. Different host **and** different port, so the browser had to consult a CORS
  policy to make that request at all. That is blocker (b), enforced by a browser rather than argued from a
  config file.
* **step 7** — `suppressions 1, next campaign — leaver Suppressed, control recipient ProviderAccepted`. The
  control is what makes the line worth reading: a 7-day frequency cap alone also produces `Suppressed`, so a
  world with one recipient would pass against a withdrawal that did nothing.

Screenshot `journey/screenshots/01-…png` was opened and read, not merely filed: the done card says
**"Du er meldt av"**, with the plain-Norwegian body and no confirmation step.

**The link is copied, never constructed.** `GrowthGuestExitWorld.ExtractExitUri:490-503` searches the body
`GrowthFakeMailProvider` actually received for `{base}#token=` and substrings the real URI out of it,
failing with *"The message body carries no session-free unsubscribe link on …"* if it is absent. Read and
confirmed at source; the world holds no builder for that URL.

## 2. C7, measured on this run rather than reasoned about

The token is a credential, and every sink this run could reach was searched for the exact 46-character
value:

| sink | hits |
| --- | --- |
| `world/world.log` — the API's own log, full pipeline at Information | **0** |
| `world/nuxt.log`, `world/tls.log` | **0** |
| `world/outcome.json` — the file the journey reads back | **0** |
| `artifacts/**` (the harness's own sweep) | **0** |
| everything git tracks (`git grep -F` over `HEAD`) | **0** |
| this lane's directory | **0** |

**Why the API log is clean, stated as a mechanism rather than as luck.** The page's withdrawal is
`POST /v1/growth/unsubscribe` with a **JSON body** — `utils/growth/growth-guest-client.js:156-158`,
`{ body: { token } }` — so the request line Kestrel logs
(`Request starting HTTP/2 POST https://127.0.0.1:5943/v1/growth/unsubscribe - application/json 58`) carries
no credential at all. The same client sends `credentials: 'include'` on every *session* method (`:118`,
`:126`, `:145`, `:175`) and **deliberately not on `Unsubscribe`**, which is exactly why this one surface
works under `AllowAnyOrigin()` without credentials while the preference centre cannot.

`outcome.json` holds `{suppressionCount, leaverNextCampaign, stayerNextCampaign, observedAtUtc}` — a count
and two enum values, no address, no token.

**Run-directory containment verified independently**: `lanes/…/world/.gitignore` is **tracked**, its body is
`*` plus `!.gitignore`, and `git check-ignore` was run against every one of the eight files the run
produced — all eight ignored.

## 3. `Growth:Enabled` stayed host-only, which was the non-negotiable condition

The only setter anywhere in the change's reach is `WebApi.Tests/Wire/WireHost.cs:262`,
`WireConfigurationOverride.Set("Growth:Enabled", "true")` — an **in-memory configuration entry**, the host
switch a deployment sets, which `GrowthGuestExitWorld` inherits by deriving from `WireHost`.
`git diff 9fb057d00 HEAD -- appsettings.json appsettings.Development.json` is **empty**, and the diff
contains no store-row or DB-backed feature-flag write. The committed posture is untouched:
`appsettings.json:176-182` still reads `"Enabled": false, "MailProvider": "Fake"`.

**What the Fake provider means for the exit, since the brief asked rather than assumed.** It is not a
weakening and it is not a blocker: it is the *recorder* the link is copied out of. The property under test —
whether a browser on one origin is permitted to complete a session-free withdrawal against another — is
decided by the composition root, the CORS registration, TLS and two origins. A real SMTP hop would put a
mailbox between the dispatcher and the browser and change none of those, while requiring a live mail
credential and a real recipient. The Fake provider is what lets the exit be proved **without** touching
`Growth:MailProvider` or `Growth:Enabled` at all.

## 4. C3 — reachability, checked as a property of the diff

| wire | where |
| --- | --- |
| production dispatch emits the page link | `Services/Growth/GrowthDispatchService.cs:490`, spent at `:522-523` |
| production route for the long-press | `Controllers/GrowthPreferenceController.cs:199`, `[HttpGet("unsubscribe")]` |
| every call site of the changed footer signature | `GrowthNewsletterService.cs:303-304` (test-send, `null,null`) and `GrowthDispatchService.cs:522-523` — grep over the whole tree returns exactly these four |

For a guest surface **the mail is the navigation entry**, and this run is the evidence that the entry
reaches the surface: the link came out of a dispatched body and a browser opened it.

## 5. Four corrections to the inherited write-up

**(A) One cited artifact did not exist.** Its §9 says *"backend tier — see `suites/backend-tier.txt`"* and
no such file was ever written. That was the single unbacked claim in the document. It is produced here:
`suites/backend-tier.txt`.

**(B) §5's OPTIONS probe does not discriminate, and was read as though it did.** The inherited probe reads
the deployed `204 / access-control-allow-origin: *` as *"the DEPLOYED API already permits exactly this
cross-origin POST … its answer is byte-for-byte the answer the local world gave."* Two controls run here
(`deployed-origins/probe.txt`) show the same 204 is returned for **a route that certainly does not exist**
(`/v1/this-route-does-not-exist-okam-probe`) and for **an origin nobody would allow**
(`Origin: https://evil.example`). The deployed CORS middleware answers the preflight **before routing**. The
*conclusion* survives untouched — blocker (b) is a claim about CORS posture, and the posture is confirmed
`AllowAnyOrigin()` without credentials — but the probe cannot see whether the endpoint exists, and the
sentence claims that it can.

**(C) The remaining obstacle is materially larger than the inherited document says, and this is the
correction that matters.** §5 names one thing — `okam.no/preferences/unsubscribe` is a 404 — and calls the
consumer half "the cheap one". Measured from the deploy branches themselves rather than over HTTP:

```
frontend  origin/main    : `git ls-tree origin/main pages/preferences`        -> 0 entries
backend   origin/master  : `git ls-tree origin/master Services/Growth`        -> 0 entries
backend   origin/test    : `git ls-tree origin/test  Services/Growth`         -> 0 entries
          and no Growth controller on any of the three
```

**The entire Growth module is absent from every deploy branch of both repos.** So it is not that the page is
missing from a deployment that otherwise has the exit: `POST /v1/growth/unsubscribe` — the endpoint the page
spends its token against, the one the flag calls "already correct" — **is not deployed either**. The 404s
this lane measured on the deployed API are consistent with that and cannot distinguish it from a POST-only
route (every path tested, including `/v1/nothing-at-all`, answers 404).

**(D) The controller's "KNOWN RESIDUAL" is real in code and neutralised by the committed configuration.**
`GrowthPreferenceController.cs:206-211` warns that Kestrel logs the request URL at Information and that RFC
8058 forces the token into the query on the machine path. True as written — and `appsettings.json:187-201`
sets the Application Insights sink **and** the default sink to `Warning` for `Microsoft` and `Default`,
while `Microsoft.AspNetCore.Hosting.Diagnostics` writes at Information. So on the committed configuration
that token does **not** reach App Insights. `appsettings.Development.json:47-55` raises `Microsoft` to
Information, so the residual is a **console-in-development** exposure, not a retained-telemetry one. Worth
recording because the comment as written invites a rotation panic the configuration does not justify.

**(E) Reproduced exactly, so it is not a one-off:** the screenshots filed under
`artifacts/journeys/growth-guest-exit-cross-origin/live-5943-**unidentified**/` while the artifact's own key
reads `live-5943-27b3273`. `test/e2e/support/journey.js`'s `backendKeyFor` destructures `build` where `meta`
carries `backendBuild`. The inherited finding is correct and is a shared instrument's defect, not this
lane's.

## 5b. Four changes made on top of the inherited work

An independent adversarial review read both diffs against C1–C7 and returned **APPROVE-WITH-CONDITIONS**. Its
conditions were acted on rather than recorded. Full detail and every mutation in `mutations/mutation-log.md`.

| # | change | why it is not cosmetic |
| --- | --- | --- |
| A | `GrowthUnsubscribePageLink.BuildRedirectTarget` gains the `https://` refusal `BuildUri` already had, plus a 3-row `[Theory]` driven through the controller action | the composer fails while a message is being *written*; this one runs when a token **already in a mailbox** comes back, so a base that later became non-https would 302 a **live credential in the fragment** at that origin |
| B | `Assert.Equal(2, provider.Submissions.Count)` ahead of three `foreach (var submission in …)` loops | a `foreach` over an empty collection asserts nothing and reports green; two sibling arms already had the guard and three did not |
| C | a positive control ahead of the C7 log sweep in `GrowthOneClickUnsubscribeWireTests` | "no `WebApi.*` category logged the token" is equally true of a recorder that captured nothing |
| D | `trace: 'retain-on-failure'` → `'off'` in `playwright.growth-guest-exit.config.js` | the journey navigates to a URL whose fragment **is** the credential, and the harness sweep is a `grep` that cannot read a zip |

**Each was made to red under a mutation actually applied, and three carry a discriminator run** — the mutation
with the new assertion removed, showing the suite goes green. B's is the sharpest: with the dispatch made to
reach nobody, the suite is **5 red / 3 green** with the guards and **2 red / 6 green** without them.

D was demonstrated rather than argued: two files planted under `artifacts/` carrying one value, one plain and
one zipped. `grep -rlF` finds the plain one and misses the zip; `unzip -p | grep -c` proves the zip carries it.
A sweep that cannot fail is worse than no sweep, because its all-clear is read as a result.

**One review finding was deliberately not acted on**: the `backendKeyFor` `build`/`backendBuild` destructure
in `test/e2e/support/journey.js`. It is a shared instrument several lanes are editing and the citation is
still sound — only the directory name is wrong. §5(E).

## 6. Integration state, since landing is what turns this into a cleared flag

| | tip | lane merges onto it? |
| --- | --- | --- |
| frontend trunk | `8db65dd` | **clean** (`git merge-tree --write-tree` → tree, no conflicts) |
| backend trunk | `81d06c10a` | **clean** (auto-merging `Services/Growth/GrowthNewsletterService.cs`) |

Neither sibling remedy is landed: `lane/gr-exit-wire-the-mail` @ `54a8bb51b` is **not** an ancestor of
`81d06c10a`, and `lane/fe-gr-exit-wire-the-mail` @ `814f04d` is **not** an ancestor of `8db65dd`. The
backend half of this lane already carries that remedy with trunk `9fb057d00` merged in; the frontend half's
only product edit is `pages/preferences/unsubscribe.vue`, whose two now-false sentences it deletes, and that
file is byte-identical to the sibling's version (`git diff 814f04d 2719fbe -- pages/preferences/unsubscribe.vue`
is empty).

**The C6 ordering hazard the inherited document raised is right and gets sharper under correction (C).**
`GrowthSettings.UnsubscribePageBaseUrl` defaults to `https://okam.no/preferences/unsubscribe` and the footer
prints it in **every** send. Landing the footer link into anything that dispatches, before the consumer page
is served at that address, converts a missing feature into a **broken art. 7(3) promise on every message**.
Today that is inert — `Growth:Enabled` is `false` and `MailProvider` is `Fake` on the committed
configuration — but it is one configuration key away from mattering, which is the same one key the flag
already names.

## 7. The exit criterion, clause by clause

*a guest holding no session* — asserted, not assumed: `context.cookies(apiOrigin)` empty before and after,
and `growth_pref_session` absent from the whole jar. **met**
*reaches an unsubscribe surface from a dispatched message* — link copied out of the body the provider
received, opened in Chromium. **met**
*and completes a withdrawal* — 200 across the origin boundary, and durable: suppression row written, next
campaign `Suppressed` for the leaver against a `ProviderAccepted` control. **met**
*shown by a journey capture* — `journey/growth-guest-exit-cross-origin.playwright.json`. **met**
*against the deployed origins* — **NOT met, and not meetable by any lane.**

### What it would take, exactly

Not a code change and not a merge of one page. **Deploying the `feature/restaurant-modules` integration
branch** — the Growth module in its entirety is absent from `origin/main`, `origin/master` and
`origin/test`, so there is nothing Growth-shaped on the deployed origins for a guest to walk. That is
`D-PREFCENTRE-DEPLOY` (ruled `deploy-the-branch`) executed by `L-PREFCENTRE-DEPLOY-EXEC`, and it is
**owner-only**. Once both halves are served, the walk is the probe already written down: dispatch to a
consented test contact, copy the link **out of the captured body**, open it, watch the done card, dispatch
again and confirm `Suppressed`.

Until then what exists is the deployment's **shape** — https both sides, two origins, two sites, no cookie,
the real composition root and its real CORS registration — plus a read-only measurement showing the deployed
CORS posture would not refuse it. That is the strongest statement available without an owner action, and it
is offered as that rather than as the criterion.

## 8. What this evidence still cannot see

1. **Hostnames are loopback**, not `okam.no` / `okamapi.azurewebsites.net`. §7 is why.
2. **No SQL tier, no container.** In-memory SQLite; the suppression and delivery behaviour proved here is
   EF-level, not trigger-level.
3. **The GET long-press leg has no browser leg**, only wire-tier coverage.
4. **One store, one locale, two recipients** — `GrowthWorld`'s fixed snapshot.
5. **Whether `POST /v1/growth/unsubscribe` answers on the deployed API is unknown and was left unknown.**
   Finding out means POSTing a token at production; this lane did not, and no read-only probe can.

## 9. Suites

| tier | result |
| --- | --- |
| journey `growth-guest-exit-cross-origin` | **1 passed**, twice — `runs/journey-run-1.txt` (inherited tips), `runs/journey-run-2.txt` (after §5b) |
| backend non-SQL, from `WebApi.Tests/` with `--filter "Database!=SqlServer"` | see `suites/backend-tier.txt` |
| frontend jest | **164 suites / 3874 passed / 0 failed** — `suites/frontend-jest.txt` |

**Test delta, named rather than netted.** The inherited work added one backend `[SkippableFact]`
(`GrowthGuestExitWorldTests.The_guest_exit_world_serves_…`, which SKIPs unless
`GROWTH_GUEST_EXIT_WORLD_DIR` is set, so it never binds a port in a tier run — it appears in the skip list)
and no jest test. **This lane adds three** — the three `[InlineData]` rows of
`The_landing_redirect_refuses_a_base_that_is_not_https_rather_than_sending_the_credential_there`. The two
Growth exit suites go **24 → 27**. No test was deleted or weakened; changes B and C **tightened** four
existing assertions.

The frontend figure is `164 / 3874`, identical to the lane's base `00d84d7` and to the inherited claim — this
lane's only frontend edit is a Playwright config, which jest does not run.

Every log was read for an abort line **above** the summary, not only for the summary — one run in this
estate printed `Passed!` after a host crash. The two `Unhandled exception` lines in the backend tier log are
`WireEgressBlockedException` — the wire host's egress quarantine refusing `IVippsService.Initiate` and
`IStripeService.GetConnectedAccounts` inside tests that expect it, not a host fault.

## 10. Constraints

* **C1** — no `UPDATE`/`DELETE` against an append-only table. The world's seed-before-boot ordering exists
  precisely so that no row on `GrowthConsentTextVersions` (which carries
  `TR_GrowthConsentTextVersions_AppendOnly`) has to be removed to make room.
* **C2** — no migration added; the world runs `EnsureCreated` over the model, as the wire tier does.
* **C3** — §4.
* **C4** — no money-path write is reachable from anything in this change.
* **C5** — **nothing is marked verified or accepted here.** The capture, the screenshots and
  `GUEST_EXIT_KEEP=1` exist so Sven can walk it; his acceptance is the gate, and a green suite is not
  offered as one.
* **C6** — no statutory string added or changed. §6 states the ordering hazard the default
  `UnsubscribePageBaseUrl` creates.
* **C7** — §2, measured on this run. Two of the four changes in §5b exist only because of it: the landing
  redirect now refuses to send a live credential to a non-https origin, and the journey no longer writes
  traces the sweep cannot read. No log or telemetry call was added anywhere by this lane or the one it
  inherits.

## 11. Hygiene

Nothing pushed. No container started or touched. No `npm ci`/`npm install` — `node_modules` symlinked from
the shared checkout. No process killed by pattern; ports `3971`/`5971` never bound (the harness refuses them
by name and they were held by another lane throughout). `web-livewalk` untouched. `docs/plan/**` untouched
except this lane's RETURN.
