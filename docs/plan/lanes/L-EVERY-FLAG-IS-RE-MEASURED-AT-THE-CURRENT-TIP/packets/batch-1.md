

===== F-401-UNREACHABLE-OVER-HTTP  [Warn]
TITLE: an unattributed-actor refusal cannot be reached by any real request
plan.md loc: plan.md:27304
BODY:
- clears when: the unattributed-actor refusal is reachable over HTTP at both money doors, or the plan records that authentication forecloses it and the controller-tier proof is the standard
- owner: @sven

Found because **a wire test passed while proving nothing**, and the lane read the body instead of the
status code.
The test asserted a 401 and got one — **from the authentication challenge, never reaching the module at
all.** Underneath: token validation rejects any bearer whose identity is not an existing user, and the
actor claims fall back to that same identity. **So the unattributed-actor refusal is unreachable over HTTP
at both money doors.**
That is not a defect in the refusal; it is a statement about what can be proven where. **The lane recorded
it as the finding it is rather than deleting the test or faking the path**, and moved the actor-by-value
proof to the controller tier — across all four claim shapes, **each with a different id**, so a reference
built as a prefix plus an id fails rather than passing on non-nullness.
The generalisable part: **a status-code assertion cannot tell you which layer answered.** Read the body.


===== F-A-BACKEND-TIER-COMMAND-IN-CIRCULATION-MEASURES-NOTHING  [Blocker]
TITLE: dotnet test at the OkamAPI-modules root exits 0 having run zero tests, so any green cited from it measured nothing
plan.md loc: plan.md:33273
BODY:
- clears when: every recorded backend tier green names the project or solution it ran, and no evidence file cites a bare dotnet test at the repository root
- owner: @sven


===== F-A-COMMENT-THAT-OUTLIVED-ITS-CODE-DISPATCHED-A-LANE-AT-A-GHOST  [Warn]
TITLE: pos-clock-state.js documents a backend derivation that was replaced on 2026-08-05
plan.md loc: plan.md:33423
FILE REFS (resolved at the tips):
  utils/workforce/pos-clock-state.js                         fe-exact
  WorkforcePosModels.cs                                      be-suffix
BODY:
- clears when: the header of utils/workforce/pos-clock-state.js states the derivation the wire actually uses, checked against WorkforcePosModels.cs SessionStateOf
- owner: @sven


===== F-A-CONFIRMED-ROW-A-RE-READ-OMITS-IS-APPENDED-OUT-OF-ORDER  [Warn]
TITLE: the second ordering the acknowledge fix did not stabilise, with its exact change named
plan.md loc: plan.md:33383
BODY:
- clears when: publications a successful re-read omits are ordered with the rest rather than appended, shown by a probe that reds when newer and older are flipped
- owner: @sven


===== F-A-CONFIRMED-ROW-SITS-UNDER-A-LEDE-SAYING-UNOPENED  [Warn]
TITLE: the reorder moved a confirmed row under a heading that says she has not opened it
plan.md loc: plan.md:33373
BODY:
- clears when: no acknowledged publication renders beneath a lede asserting it is unopened, shown by a test that reds when a confirmed row is placed in the unopened section
- owner: @sven


===== F-A-CRASHED-TIER-CAN-PRINT-A-PASSED-LINE-AFTER-ABORTING  [Blocker]
TITLE: a tier printed Passed after the host process crashed, so a grep for Passed accepts a fifth of a suite
plan.md loc: plan.md:33323
BODY:
- clears when: every recorded tier green is checked for an abort line above it, or the recorded total is compared against the known suite size
- owner: @sven


===== F-A-FAILED-SMS-SHOWS-THE-GUEST-A-RAW-ENGLISH-EXCEPTION  [Warn]
TITLE: core's exception text is shown in place of the localised sentence sitting beside it
plan.md loc: plan.md:33413
BODY:
- clears when: no guest-facing surface renders an exception message thrown by core when a localised string exists for that failure, pinned by a test that reds when the localised string is bypassed
- owner: @sven


===== F-A-MISSING-PHONE-NUMBER-SHOWS-THE-GUEST-A-TYPEERROR  [Warn]
TITLE: an offer without clientPhoneNumber renders a JavaScript error message to the guest
plan.md loc: plan.md:33418
BODY:
- clears when: an offer with no clientPhoneNumber renders a sentence written for a reader rather than a TypeError, pinned by a test
- owner: @sven


===== F-A-MUTATION-RUNNER-IN-A-LANE-DIRECTORY-DELETES-THE-LANES-OWN-EDITS  [Blocker]
TITLE: mutate.js restores with git checkout -- file, which reverts to HEAD and destroys uncommitted work
plan.md loc: plan.md:33438
BODY:
- clears when: no mutation runner under docs/plan/lanes/ restores a mutated file with git checkout, checked by grep across every mutate script in the tree
- owner: @sven


===== F-A-NOTICE-ROW-NEVER-NAMES-THE-WEEK-IT-CONFIRMS  [Blocker]
TITLE: a worker confirms a schedule without being told which week she is confirming
plan.md loc: plan.md:33378
BODY:
- clears when: every acknowledgeable notice row names the period it confirms, shown by a test that reds when the period is removed from the row
- owner: @sven


===== F-A-RERUN-TAKES-THE-CANONICAL-SLOT  [Blocker]
TITLE: the record of a walk is overwritten by the next walk
plan.md loc: plan.md:30648
BODY:
- clears when: re-running a journey does not overwrite a committed capture or repoint it at ignored files, shown by a re-run that leaves the tracked artifact byte-identical
- cleared by: L-CANONICAL-SLOT-SURVIVES-A-RERUN
- owner: @sven

**The canonical check returns true on same-lineage before rank is ever consulted**, so a re-run of the same
journey against the same backend **always** takes the canonical slot. Worse, the run record is written **over
the committed one before the browser opens** — with `"status": "running"` — so a crashed or abandoned run
leaves the estate's evidence replaced by a stub.
**Ten of the sixteen tracked frontend artifacts are exposed to this**, and four are dirty in the working tree
as this is written, from a test run rather than from any lane's work.
**The obvious remedy is unsafe and that is the part to remember.** Six tracked pictures sit at the older path,
so a re-run does not overwrite them — it writes new ones under an ignored path and **rewrites the committed
JSON to point there.** The committed record then references files git does not keep, and the committed
pictures are orphaned. **None of that shows in a diff of the pictures**, so re-running and committing looks
clean and silently breaks the link.
**This is the plan's own evidence, not a product surface.** Every C5 claim in this program rests on a
committed capture; a capture the next run replaces records only the last thing that happened, and the estate
cannot tell the two apart.


===== F-A-REVIEW-BRIEF-CAN-APPROVE-WITHOUT-A-FALSIFIABILITY-CHECK  [Warn]
TITLE: a review brief asked for a reading and not a mutation, so an approval shipped without testing whether the tests can fail
plan.md loc: plan.md:33303
BODY:
- clears when: every review brief that clears work for landing requires at least one mutation applied and restored, and no approval is recorded without one
- owner: @sven


===== F-A-SECTION-LEDE-CLAIMS-UNOPENED-ABOVE-A-ROW-JUST-CONFIRMED  [Info]
TITLE: with one row confirmed and one unread, the lede saying you have not opened this sits above the row just confirmed
plan.md loc: plan.md:33363
BODY:
- clears when: the section lede does not claim unopened above a row carrying a receipt, shown in a browser with one confirmed and one unread
- owner: @sven


===== F-A-SERVER-SIGNED-EVIDENCE-EXPORT-IS-STILL-OWED  [Warn]
TITLE: the print path carries no content hash of its own; a server-rendered signed export is stronger and is backend work
plan.md loc: plan.md:33268
BODY:
- clears when: the training evidence record can be obtained as a server-produced file carrying its own signature, or the print path is recorded as sufficient with the reason
- owner: @sven


===== F-A-SOURCE-SCAN-GOES-QUIET-WHEN-THE-SHAPE-IT-READS-MOVES  [Warn]
TITLE: the front-door scan read the mounted hook text, so a fix that moves the bounce into a method makes it silently pass
plan.md loc: plan.md:33298
BODY:
- clears when: the front-door scan is proven to red against a page whose guard is deleted in the current one-starter shape, and carries a vacuity guard naming the pages it must reach
- owner: @sven


===== F-A-SPEEDUP-WAS-ASSERTED-NOT-EXPLAINED  [Info]
TITLE: a suite that got faster after adding instrumentation was reported without a mechanism
plan.md loc: plan.md:33228
BODY:
- clears when: the coverage evidence names why the run got faster, or records a cold-cache figure alongside the warm one
- owner: @sven


===== F-A-SUCCESSFUL-SEND-PRINTS-NOTHING-IN-THIS-WORLD  [Warn]
TITLE: the log level suppresses every EmailService information line, so mail evidence cannot come from the API log
plan.md loc: plan.md:33358
BODY:
- clears when: a delivery claim in this estate cites an outbox row or a sink capture rather than an API log line
- owner: @sven


===== F-A-SUITE-RUN-REWRITES-COMMITTED-ARTIFACTS  [Warn]
TITLE: running the tests changes the evidence
plan.md loc: plan.md:30583
QUOTED TOKENS (occurrence counts at the tips):
  artifacts/journeys/                            fe=51   be=24   ['playwright.consumer.config.js']
BODY:
- clears when: no test rewrites a file under artifacts/ as a side effect of running, or each such file is pinned and its rewrite asserted rather than incidental
- cleared by: L-TESTS-THAT-WRITE-ARTIFACTS
- owner: @sven

**Found by a lane that had to restore what a suite run had changed under it.** A wire test **rewrites two
files under `artifacts/journeys/` on every run**, unpinned — so the act of measuring alters the artifact the
measurement is about.
**This is the instrument class this plan has recorded twenty times, in its most direct form.** An artifact is
supposed to be the record that outlives the run; one the run overwrites records only the last thing that
happened to it. **A lane can be green, its artifact current, and the two facts unrelated.**
**It also makes a clean tree a moving target.** Every lane in this program checks `git status` before claiming
its work is isolated; a suite that dirties tracked files means that check reports another lane's test run as
this lane's mess. **The lane that found it restored the files and kept them out of its commit** — which is the
right handling and not a fix.
**Deliberate regeneration is fine; incidental regeneration is not.** The distinction is whether the rewrite is
asserted — a test that writes an artifact and then checks it, on purpose, is an instrument. One that writes as
a side effect is a leak.


===== F-A-TEST-TITLE-CLAIMS-A-GUARANTEE-IT-NO-LONGER-PINS  [Info]
TITLE: a describe title still credits a base-10 clause that ES5 made inert
plan.md loc: plan.md:33263
FILE REFS (resolved at the tips):
  test/store-cart-state.test.js                              fe-exact :436
BODY:
- clears when: test/store-cart-state.test.js:436 no longer claims the base-10 behaviour, since no assertion depends on it
- owner: @sven


===== F-A-VERIFIED-LANE-RESTS-ON-A-FAILED-RUN  [Blocker]
TITLE: one row on the board is false, and it was found by census
plan.md loc: plan.md:30931
QUOTED TOKENS (occurrence counts at the tips):
  verified                                       fe=67   be=165  ['playwright.config.js']
  failed                                         fe=355  be=363  ['jest.config.js']
BODY:
- clears when: no entity in a verified state rests on an artifact whose own status is not a pass, or each such case is recorded as deliberate with why
- cleared by: L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED
- owner: @sven

**A lane sits `verified` on evidence that records its own failure.** Its pointer is the bare journeys
directory, and **two of its three modules hold a run whose status reads `failed`** — confirmed by opening both
files. Its own return had named three specific artifacts; **the pointer was widened to the directory before
the lane was verified**, and the verification happened about six hours after one of those runs had already
gone red on disk.
**This is not the instrument being loose in general. It is one row that is wrong.** The census that found it
measured 338 path pointers never read and 284 entities promoted without the checker running at all — **but
exactly one verified row is demonstrably false**, and it is this one.
**A second, milder case sits beside it**: a lane whose evidence *text* claims nineteen steps passed, of a file
that reads failed at nine. The prose and the artifact disagree and nothing compares them.
**Raised as a blocker because a false green is worse than a red.** Every priority taken from this board was
priced against a row that says a walk completed, and the walk did not.
**One of the two failed captures is resolved 2026-08-06, and it was a false red rather than a defect.** The
walk was re-run unchanged at the commit the red artifact names and came back seventeen of seventeen — it had
**always been green there.** The artifact records that the browser never reached the API at all, so the
failure belonged to that run.
**One failed capture remains**, on the training walk, and it is the one that also blocks its module's exit.


===== F-ACCEPTANCE-IS-THE-CHOKE  [Blocker]
TITLE: sixteen lanes wait on work that is finished but unaccepted
plan.md loc: plan.md:23618
QUOTED TOKENS (occurrence counts at the tips):
  built-unverified                               fe=9    be=1    ['playwright.config.js']
  verified                                       fe=67   be=165  ['playwright.config.js']
  L-GUARD-DEMO                                   fe=0    be=0    []
  L-GUARD-W0                                     fe=0    be=0    []
  walk-and-accept-a-batch                        fe=0    be=0    []
  cleared_by                                     fe=0    be=1    ['lanes/L-INVOICE-AUTHORIZE-LAND/merge-receipt.md']
  L-LIVE-WORLD-RESTORE                           fe=5    be=0    ['test/e2e/scripts/live-world-banner-check.js']
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: the finished-but-unaccepted lanes other lanes depend on are walked and accepted, or the plan records which dependencies do not need acceptance
- cleared by: none — only the owner can clear this
- owner: @sven
- blocks: S-EVIDENCE

**Measured, not felt.** Twenty-eight open lanes are blocked by an unsatisfied dependency. **Sixteen of
them wait on a lane that is already built** — and one on a lane that is **verified**.
The rule is right and deliberate: a lane's dependency counts as satisfied **only when the target is
accepted**, and acceptance is the owner's alone. That is the standing law working exactly as written —
**a green suite is not evidence a person can use something.**
But it means the choke is no longer capacity, or the migration chain, or the host. **It is the walk.** **Three**
live worlds are standing at their ports right now, freshly rebuilt and left up on purpose, because C5 says
the walk is the gate — and until somebody walks them, sixteen lanes cannot start. One of the three now
**resets in nine seconds** rather than seventy, so the walk costs less than it did this morning.
The remaining twelve are ordinary: eight on open decisions, four on lanes still moving.
**Re-measured 2026-08-02, and it has grown.** **111 lanes sit at `built-unverified`** and exactly
**one** is `verified`. Twenty-two open lanes are gated on another lane; **eighteen of those are waiting
on work that is already built.** The queue is not short of code — it is short of a person walking it.
It now bites the guardrail work itself: `L-GUARD-DEMO` has run, its evidence is committed, and it cannot
record its own completion because it needs `L-GUARD-W0` **accepted**. The dependency is correct and the
lane is finished; the transition is the owner's.
**Ruled 2026-08-03 (Sven): `walk-and-accept-a-batch`.**
**`cleared_by` corrected 2026-08-03: `L-LIVE-WORLD-RESTORE` cannot clear this flag.** That lane cut a walk
from seventy seconds to nine — it makes the act **cheap**, it does not perform it. The `clears_when`
requires the walk itself, or a recorded policy about which dependencies need no acceptance.
Left as it was, this flag would have sat open forever with its clearing lane recorded as finished — a flag
waiting on a lane that was never going to satisfy it.
**Re-measured 2026-08-03 and my own number was wrong: 149 built-unverified, not 118.** The method was the
error — **sixteen are compact one-line items a state-field scan cannot see.** Measured instead by loading
the tool's own admissibility functions and calling them read-only against every entity, which is the 


===== F-ACCEPTING-AN-OFFER-CAN-BLANK-THE-PAGE-AFTER-THE-ORDER-IS-PLACED  [Blocker]
TITLE: a 200 with an empty body leaves the guest with no confirmation, no error and no way back
plan.md loc: plan.md:33403
BODY:
- clears when: acceptOffer refuses to overwrite offerProposal with a non-object response, pinned by a test that reds when the guard is removed
- owner: @sven


===== F-ACCT-DUP  [Blocker]
TITLE: AccountingSummaries has no unique index in the migration chain
plan.md loc: plan.md:25897
QUOTED TOKENS (occurrence counts at the tips):
  clears-with-the-index                          fe=0    be=0    []
BODY:
- clears when: fact:acct.uidx is present
- cleared by: L-ACCT-UIDX
- owner: @sven
- blocks: S-PILOT-SAFE

The service catches the concurrency violation the model's index would raise, so the backstop reads as
correct and is dead code on any database the chain built. Two concurrent runs both insert and both post
to the webhook, which has no receiver-side dedup.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `clears-with-the-index`.**


===== F-ACTORKIND-CONVERGENCE-NOT-FORK  [Warn]
TITLE: two actor-kind enums that must not be collapsed
plan.md loc: plan.md:27135
QUOTED TOKENS (occurrence counts at the tips):
  User                                           fe=309  be=920  ['nuxt.config.js']
  Admin                                          fe=236  be=609  ['Claude.md']
  Guest                                          fe=55   be=157  ['nuxt.config.js']
  F-EV-GUESTLINK-FORK                            fe=0    be=0    []
BODY:
- clears when: the per-module actor-kind convention is written down where a reviewer will read it before merging two of them
- owner: @sven

Both lanes working the actor-kind ruling defined an enum, and they were asked whether that was a fork.
**The answer is no, and the reasoning is worth keeping**, because the obvious tidy-up would break both
modules.
**The human kinds are deliberately incompatible.** Meals says `User`, because its human is often the
*member cancelling their own order*. Growth says `Admin`, and adds `Guest` for a data subject acting over
a link token — which Meals has no analogue for. **The coherence contract admits exactly one human kind**,
so a merged enum carrying both would be unusable by either module. The estate precedent is already
per-module.
This is the mirror image of `F-EV-GUESTLINK-FORK`, decided the same day and the other way, which is
precisely why it needs writing down: **two lanes independently defining a similar type is sometimes a fork
and sometimes convergence, and the difference is whether the shapes can be one shape.**
The genuinely shared surface is the module actor-stamp pin, where a sixth entry was added rather than
folding the new ledger into an existing one — folding would have judged three author columns as naming no
discriminator. Two textual collision points are named in the return for whoever merges second.


===== F-ADMIN-LOGOUT-LANDS-ON-A-BLANK-PAGE  [Blocker]
TITLE: signing out of the admin drops you on the storefront
plan.md loc: plan.md:32246
FILE REFS (resolved at the tips):
  AdminPageHeader.vue                                        fe-suffix :697
  pages/index.vue                                            fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  AdminPageHeader.vue:697-700                    fe=0    be=0    []
  Logout()                                       fe=7    be=1    ['test/admin-logout-destination.test.js']
  pages/index.vue                                fe=0    be=0    []
  /admin                                         fe=408  be=90   ['nuxt.config.js']
  window.location.href                           fe=8    be=0    ['test/admin-logout-destination.test.js']
BODY:
- clears when: signing out of the admin lands on a page that offers a way back in, shown by a walk that signs out and signs in again without typing a URL
- cleared by: L-ADMIN-LOGOUT-RETURNS-TO-SIGN-IN
- owner: @sven

**Found by the owner on 2026-08-06, in the first minute of walking a live world — which is the whole argument
for opening one.**
`AdminPageHeader.vue:697-700` calls `Logout()` then sets `window.location.href = '/'`. That is the **consumer
storefront root** (`pages/index.vue` — hero image, app-store banner), **not the admin sign-in.**
**Observed: a blank white screen.** The server renders the page (78 KB of HTML returns), so it fails
**client-side on hydration** in a world seeded for the admin surfaces rather than the storefront.
**Two defects here, and the second survives even when the first does not fire:**
- **There is no route back.** The storefront links nowhere to `/admin`, so an operator who signs out has to
  know to type the path. On a till or a tablet that is the end of the session.
- **It is a hard `window.location.href`**, leaving the SPA entirely and reloading everything, which turns a
  render failure on an unrelated page into a total one.
**No suite could have caught this**, and none did: the destination is a different page in a different half of
the product, and the assertion nobody writes is *"where does sign-out put me."*


===== F-ADMINAPP-KEYSTORE-PASSWORD-IN-A-COMMITTED-SCRIPT  [Blocker]
TITLE: an Android keystore password sits in cleartext in a committed npm script
plan.md loc: plan.md:33027
FILE REFS (resolved at the tips):
  package.json                                               fe-exact
BODY:
- clears when: AdminApp package.json line 50 reads the keystore password from the environment or a secret store, and the committed value is rotated
- owner: @sven


===== F-ADMINPAGE-IGNORES-ITS-RELOAD  [Warn]
TITLE: the shared admin shell discards the answer it asked for
plan.md loc: plan.md:31595
FILE REFS (resolved at the tips):
  AdminPage.vue                                              fe-suffix :103
QUOTED TOKENS (occurrence counts at the tips):
  AdminPage.initAuth                             fe=24   be=1    ['test/kitchen-and-board-resume-after-login.test.js']
  AdminPage.vue:103                              fe=1    be=0    ['lanes/L-LOGINMODAL-MOUNTED-ONCE/notes.md']
  _userService.Reload()                          fe=5    be=1    ['lanes/L-LOGINMODAL-MOUNTED-ONCE/notes.md']
  AdminPage.openLogin()                          fe=0    be=0    []
BODY:
- clears when: `AdminPage.initAuth` acts on the result of its session reload, or the plan records why discarding it is correct
- owner: @sven

`AdminPage.vue:103` calls `_userService.Reload()` and **ignores what it returns**. Two pages had grown their own
sign-in modal specifically to cover the case where that call answers false — which is how the duplicate-modal
defect got its foothold rather than being an accident of copy-paste.
**Found while removing the duplicates, and the removal had to preserve the behaviour**: the close routes that
path through a new `AdminPage.openLogin()` instead. So the symptom is handled and **the cause is not** — 47 admin
pages share this shell and the other 45 still discard the answer silently.


===== F-AGENT-KILLED-THE-OWNERS-DEV-SERVER  [Blocker]
TITLE: a pattern kill reached outside the lane that issued it
plan.md loc: plan.md:32376
QUOTED TOKENS (occurrence counts at the tips):
  /admin                                         fe=408  be=90   ['nuxt.config.js']
BODY:
- clears when: no lane can stop a process it did not start, shown by a brief rule and a lane that resolves every kill from its own port or pid
- owner: @sven

**A lane running in an isolated worktree stopped the repository owner's dev server while he was using it**, on
2026-08-06, with `pkill -f nuxt-ts` between its own arms. The worktree isolated its *files* and did nothing
about its *process namespace*.
**It disclosed this first, before its result** — restarted the server within about four minutes with the same
environment, confirmed a clean recompile and `/admin` answering 200, and resolved every kill after that by pid
from its own port. Nothing else was touched: API, SQL and Redis all survived. **That disclosure is the reason
this is recoverable rather than a mystery**, and the behaviour to keep.
**The estate already has this rule for containers** — *never stop a container you did not create* — written
after a reviewer killed a foreign one. **It was never extended to processes**, and a worktree looks like
enough isolation until a pattern kill crosses it.
**The rule that follows: a lane resolves every kill from its own port or its own pid, never from a pattern
that could match a sibling or a person.** `pkill -f` is the specific hazard, and it is already recorded as
matching more than people expect — an earlier instance in this estate matched the environment block rather
than the command.


===== F-AI-REQUEST-BODY  [Blocker]
TITLE: a registered middleware is one line from publishing every payload
plan.md loc: plan.md:26202
FILE REFS (resolved at the tips):
  appsettings.json                                           be-exact
QUOTED TOKENS (occurrence counts at the tips):
  Helpers/ApplicationInsightsLoggingMiddleware   fe=0    be=2    ['artifacts/security/L-VIPPS-LOG-mutation.md']
  UseMiddleware                                  fe=0    be=6    ['CLAUDE.md']
  L-VIPPS-LOG                                    fe=0    be=1    ['artifacts/security/L-VIPPS-LOG-mutation.md']
  ApplicationInsights:InstrumentationKey         fe=0    be=3    ['artifacts/security/L-VIPPS-LOG-mutation.md']
  appsettings.json                               fe=9    be=29   ['test/e2e/scripts/live-world.sh']
  delete-it                                      fe=1    be=0    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
BODY:
- clears when: the request-body capture is removed, bounded to non-sensitive routes, or the middleware is deleted, proven by a test that fails if it is wired back as it stands
- cleared by: L-AI-MIDDLEWARE-DELETE
- owner: @sven
- blocks: S-PILOT-SAFE

`Helpers/ApplicationInsightsLoggingMiddleware` attaches the whole request body — up to 8190
characters — to request telemetry, and it is DI-registered but never added to the pipeline with
`UseMiddleware`. One line restores it, and on that day every Vipps and Wolt payload goes to App
Insights, which retains what it is given and which nobody can edit afterwards. Found by
`L-VIPPS-LOG` while closing a different leak; it was not in that lane's scope and was left standing
rather than fixed in passing.
The same lane's caveat belongs here: `ApplicationInsights:InstrumentationKey` is committed in
`appsettings.json` with no Development override, so a developer running locally ships to the shared
resource. Whether anything has already reached it can only be answered inside App Insights.
**Ruled 2026-08-03 (Sven): `delete-it`.**
**Closed 2026-08-03, and the lane found a nineteenth non-failing assertion shape on the way — in its own
first attempt, then cut it rather than shipping it.**
The obvious test is to wire the middleware into the real pipeline and prove a body leaks. It **cannot
fail.** The wire host blanks the instrumentation key by design, and **with no key the telemetry SDK never
produces a request telemetry object at all** — so every capture path returns early and the test is green
in both worlds, leaky and clean alike. Measured by driving a real request with a marker body, not assumed.
What replaced it is assembly-derived and behavioural: **every** middleware of both shapes the framework
accepts, plus every telemetry initializer and processor, constructed from the live composition root and
run over a request carrying a synthetic marker. It reds for a differently-named reimplementation **and
while that reimplementation is still dormant** — which is the state the deleted type spent its entire life
in. It also fails if the derivation returns nothing, and fails **by name** on a participant it cannot
construct rather than skipping it.
Proven across four builds: red on the real type, green after deletion, red again on **two stand-ins
sharing no name, interface or property name with it**, green after removal.


===== F-AN-UNFILTERED-BACKEND-TIER-STARTS-A-CONTAINER-PER-FIXTURE  [Warn]
TITLE: running the backend tier without the Database filter starts a Testcontainers SQL Server per module fixture
plan.md loc: plan.md:33338
BODY:
- clears when: the brief boilerplate and every recorded tier command carry the Database!=SqlServer filter, or the fixtures share one container
- owner: @sven


===== F-APPEND-ONLY-RECEIPTS-HAVE-NO-READER  [Warn]
TITLE: a table written by one path and read by nothing
plan.md loc: plan.md:30703
BODY:
- clears when: some endpoint on some surface reads the publication receipts table, or the plan records that it is written purely as an audit store nobody queries
- owner: @sven

**Found while tracing why a worker's confirmation vanishes on reload.** The publication receipts table is
written on every confirm and — outside migrations, tests, and the write's own idempotency re-check — **is
read by no endpoint on any surface.**
**An append-only store nobody reads is a costly way to write to nowhere.** It carries the guard, the
migration and the immutability obligation of evidence, and delivers none of the benefit, because **no person
and no screen can currently see what it holds.**
**It is the reachability defect in its purest form**, and the opposite of the usual one: not a capability
with no wire, but a **record with no reader**. The estate has repeatedly found services no controller calls;
this is a table no query touches.
**Recording it as deliberate would be a perfectly good answer.** An audit store queried only by an inspector
with database access is a legitimate design — but it should be a decision somebody made, not a consequence
nobody noticed.


===== F-ARCHIVED-TEST-INFLATES-THE-GREEN  [Warn]
TITLE: a superseded test still runs and still passes
plan.md loc: plan.md:28865
FILE REFS (resolved at the tips):
  lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js ABSENT
  spec.js                                                    ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  L-JEST-COLLECTS-LANES                          fe=0    be=0    []
  lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-p fe=0    be=0    []
  .spec.js                                       fe=92   be=11   ['jest.config.js']
  '<rootDir>/lanes/'                             fe=1    be=0    ['jest.config.js']
  lanes                                          fe=118  be=76   ['jest.config.js']
  docs/plan/lanes/                               fe=1    be=0    ['jest.config.js']
BODY:
- clears when: no archived or superseded test file is collected by the suite, shown by a collected-path list that excludes them
- cleared by: L-COLLECTED-PATHS
- owner: @sven

**Found by `L-JEST-COLLECTS-LANES` while checking what an ignore pattern would catch — and it is the reason
the narrow fix would have been wrong.**
`lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js` is **not a Playwright probe**. It is a
runnable jest **copy of a live test**, archived to show what a fix replaced. **It does not red. It passes** —
putting **29 superseded assertions back into the green count**, beside the live test that replaced them.
**A `.spec.js`-only pattern would have cleared all five reds and left this one running.** The visible
problem was the noise; the invisible one was a **pass count inflated by a test whose whole point was that
it had been superseded.** That is the same family this program has spent the day removing, in its quietest
form yet: not an assertion that cannot fail, but **an assertion that should no longer be asked.**
**The remedy that was chosen because of it**: exclude the **directory**, anchored — `'<rootDir>/lanes/'`.
A bare `lanes` would also silence `docs/plan/lanes/` (14 real paths) and any test merely named for lanes.
**A diagnostic worth keeping estate-wide.** A collection artifact reports **failed suites with 0 failed
tests**; a real red reports **failed tests**. The one remaining red after this fix — the worktree-basename
pin — shows **2 failed tests**, which is exactly how the two are told apart at a glance.
**And a correction to the premise**: it was four lane directories and **five** suites, only **three** of
which are committed on any of 84 refs — two exist in no commit at all. **Growth was reproduced rather than
assumed**: failing suites went **1 → 2 → 6** as siblings' evidence landed in one tree while failed *tests*
stayed at exactly 2.


===== F-ARTIFACT-STORE-OVERWRITES  [Blocker]
TITLE: the canonical journey artifacts are the wrong runs, right now
plan.md loc: plan.md:23691
QUOTED TOKENS (occurrence counts at the tips):
  rank-and-key-by-backend                        fe=0    be=0    []
BODY:
- clears when: an artifact cannot be displaced by a weaker later run, and every artifact records which backend build answered it
- cleared by: L-ARTIFACT-RANK-KEY
- owner: @sven
- blocks: S-EVIDENCE

**Verified by direct check, not argued.** The three journeys that ran live have all been **displaced at
their canonical paths** by the lanes' own later verification runs. Today, a reader joining on those paths
finds **zero live evidence and one live failure** — because the canonical file for one journey is **the
deliberately-failed guard proof**, and the other two are **fixture** re-runs. The passing live artifacts
survive only inside the lanes' own directories.
**The strongest evidence a journey ever produced is silently replaced by the weakest.** The store is
last-writer-wins, the write happens only in teardown, and **nothing clears the directory at run start** —
so an interrupted run also leaves yesterday's live-and-passed file standing for today's broken world.
**And no artifact records which backend build answered it.** The health probe is unauthenticated and its
body is one word, so **any API satisfies it** — including a stale checkout. One lane's API was built from a
detached worktree and **the recorded commit is the frontend tree.** That is the fixture-version blocker
**transferred, not solved.**
This matters more than the sum of its parts because **acceptance is now the binding constraint on this
plan**, and these artifacts are what a walk is judged against.
**Half closed, 2026-08-02, and the half that remains is one line.** The canonical path is **no longer
whoever ran last** — it now holds **the strongest run on record**, ranked live over fixture, passed over
failed, and **identified over unidentified**, backed by a per-backend file and an append-only ledger. **The
displacement was run twice to prove it**: a fixture re-run left a standing live pass byte-identical, and
with the protection mutated away **the identical command overwrote it.** All three canonical slots now hold
live passes, verified directly.
**What remains is build identity on each artifact.** The mechanism exists and works unaided — it asks
whoever holds the port what directory it runs from and asks that checkout for its head, **which needed
nobody's cooperation** — but the three standing artifacts predate it and record no build. The lane named
the one line that closes it, in a script two other lanes own.
**And the clerk's account of the store's state was stale by the time it was read:** other lanes had
re-run all three journeys, so the paths already held live passes. **The mechanis


===== F-ARTIFACT-STORE-TEST-CHECKOUT-BOUND  [Warn]
TITLE: a test asserts the directory it is checked out in
plan.md loc: plan.md:26919
QUOTED TOKENS (occurrence counts at the tips):
  journey-artifact-store                         fe=28   be=0    ['test/e2e/support/artifact-store.js']
  Web-modules                                    fe=78   be=15   ['test/journey-artifact-store.test.js']
BODY:
- clears when: the journey-artifact-store test passes in any worktree, or it names why the checkout directory is load-bearing
- owner: @sven

`journey-artifact-store` asserts the checkout is named `Web-modules`, so **it reds in every lane worktree
and passes only in the canonical one.** Verified by the reporting lane: green at its base, red in its own
tree, with nothing about its subject changed.
That makes it a red that is **never about the code under test**, which is the worst kind — it teaches the
next agent that one failure is normal, and a suite where one failure is normal is a suite that has stopped
reporting.


===== F-ARTIFACTS-FROM-A-HARNESS-THE-BRANCH-LACKS  [Blocker]
TITLE: nineteen receipts the tree holding them cannot have produced
plan.md loc: plan.md:29921
FILE REFS (resolved at the tips):
  artifact-store.js                                          fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  proxiedSubjectServed                           fe=7    be=0    ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  proxiedSubjectSample                           fe=6    be=0    ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  refs/salvage/                                  fe=0    be=0    []
  backendBuild                                   fe=31   be=0    ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  canonicalHeldBy                                fe=21   be=0    ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  provisional                                    fe=29   be=23   ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  artifact-store.js                              fe=12   be=0    ['test/journey-assertions.test.js']
  artifact                                       fe=138  be=100  ['playwright.config.js']
  chain-*                                        fe=1    be=0    ['lanes/L-LIVE-WORLD-RESTORE/live-world-reset-run.txt']
  passed                                         fe=206  be=182  ['artifacts/journeys/modal-scroll-lock.playwright.json']
BODY:
- clears when: no committed journey artifact carries a field whose sole producer is absent from the branch it sits on, or each remaining one is recorded as knowingly filed from elsewhere
- owner: @sven

**Measured across 137 refs and 65 committed receipts: 19 carry a field the tree holding them cannot name.**
Forty-six are clean. **Two families, two producers, two days apart** — so this is not one night's accident.
**Family A — 15 artifacts** carrying `proxiedSubjectServed` and `proxiedSubjectSample`. Sole producer is one
commit on a lane branch, plus a **byte-identical dangling twin reachable only from `refs/salvage/`**. Only 5 of
137 refs can name those fields. **Ten of the fifteen were unknown, and four sit on live branch tips.**
**Four separate lanes filed receipts inside one twenty-minute band.** That is not an operator's slip — **it is a
shared dirty checkout**, and it is the same working tree the dirt census found holding 133 contested paths.
**Family B — 4 artifacts** carrying `backendBuild`, `canonicalHeldBy` and `provisional`. **Nobody in this plan
had named it.** Its sole producer is **the commit that created `artifact-store.js` itself**, dated two days
before family A.
**The discrimination is within a single commit, which is as sharp as this instrument gets.** One commit filed
three receipts from **one run recording the same run id** — one mismatches, two are clean and carry no
`artifact` key at all. Another filed eight, and **exactly the three `chain-*` files mismatch.** Siblings minutes
apart, **written by two harness generations**, with nothing but the field set separating them.
**Five have already been fixed and nobody decided to fix them.** The composition landed the producing commit as
a **side-effect**, so those arms are no longer mismatches on the three refs that contain it. **The remedy is
landing the producer — and it happened by accident.** It has not reached the other ten.
**One caveat the lane recorded rather than glossed:** `provisional` alone is not a unique fingerprint — there is
an unrelated hit in a Vue component since July. Family B rests on the other two fields, which have exactly one
producer in the repository.
**A sharper instance found 2026-08-05, and it is the same defect one turn tighter.** A training journey
artifact records `passed`, a fixture backend and a commit — **and its spec does not exist at that commit.**
The file lives only on the composition candidate. So the artifact is not merely produced by a harness the
branch lacks; **it is stamped to a tree that cannot contain the walk it claims.**
**Why that matters


===== F-ASPNETCORE-ENVIRONMENT-IS-UNKNOWN-OUTSIDE-GIT  [Blocker]
TITLE: whether a deployed host runs the developer exception page cannot be answered from the repository
plan.md loc: plan.md:33148
BODY:
- clears when: the ASPNETCORE_ENVIRONMENT value for okamapi and okamtest is read from Azure and recorded, so the severity of the header-echo leak is known rather than assumed
- owner: @sven


===== F-ASSERT-NOT-PROD-IS-UNWIRED  [Warn]
TITLE: a guard script that would refuse a production target is not wired to anything
plan.md loc: plan.md:33047
FILE REFS (resolved at the tips):
  assert-not-prod.sh                                         be-suffix
BODY:
- clears when: assert-not-prod.sh is invoked by a path that runs before a migration or deploy, or the script is deleted and the reason recorded
- owner: @sven


===== F-ASSIGNMENT-FORM-DENIES-VERSIONS-THAT-EXIST  [Warn]
TITLE: with no course selected the assignment form says no published version exists while five do
plan.md loc: plan.md:33084
BODY:
- clears when: the assignment and completion forms derive their lists from the store rather than from the current selection, shown in a browser with nothing selected
- owner: @sven


===== F-AWARD-TARGET-HAS-NO-LINEAGE-FILTER  [Warn]
TITLE: the award target is unfiltered by lineage, the mirror of the defect just fixed on the candidate side
plan.md loc: plan.md:33133
BODY:
- clears when: LoadAssignmentAsync filters the award target by current lineage, or the wider admission is recorded as deliberate with the reason
- owner: @sven


===== F-AZURE-FUNCKEY  [Blocker]
TITLE: a live Azure Functions host key is committed, and a red test prints it
plan.md loc: plan.md:22771
QUOTED TOKENS (occurrence counts at the tips):
  rotate-at-deploy                               fe=0    be=1    ['lanes/L-INVOICE-AUTHORIZE-LAND/merge-receipt.md']
BODY:
- clears when: the key is rotated and the new value lives in user-secrets or environment config, never in a committed file
- owner: @sven
- blocks: S-PILOT-SAFE

A **live** Azure Functions host key sits in the repository, shared by both document endpoints. The lane
that found it consolidated it to exactly one place so rotation is a one-line change — but consolidation
is not rotation, and only its owner can rotate it.
Second exposure, same key: the outbound-deny handler **echoes the whole request URI**, so a red wire run
prints the key into whatever reads that output.
**Deliberately not redacted.** The estate already paid this lesson on 2026-07-30 with the Wolt secret:
redacting the message without rotating the credential fixes nothing, and makes the exposure harder to
find later. The owner action is rotation.
**Ruled 2026-08-03 (Sven): `rotate-at-deploy`.**
> @sven · 2026-08-04 · F-AZURE-FUNCKEY — Sven, 2026-08-04: 'this is fine disregard'. Acknowledged and not treated as gating. The key remains committed and in history, so the flag stays open as a record rather than a task; it is not blocking any lane and no lane should spend time on it.


===== F-BACKEND-CHECKOUT-IS-A-LANE-BRANCH  [Warn]
TITLE: the shared backend tree is not on the branch people assume
plan.md loc: plan.md:27991
QUOTED TOKENS (occurrence counts at the tips):
  /Users/svendaneel/okam/OkamAPI-modules         fe=5    be=6    ['lanes/L-A-GUEST-CAN-LEAVE-A-MAILING-LIST/evidence.md']
  lane/meals-grace-pins                          fe=6    be=6    ['test/e2e/journeys/margin-week-freeze.spec.js']
  34c6c103                                       fe=3    be=2    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  F-BRIEF-QUOTES-UNMERGED-STATE                  fe=0    be=0    []
  HEAD                                           fe=54   be=30   ['test/reservations-combined-table-conflict.test.js']
BODY:
- clears when: no brief or lane names a branch for a working tree without the checkout being on it, and the shared backend checkout's HEAD is either the integration branch or documented as not being it
- owner: @sven

**Measured 2026-08-04 at 16:12.** `/Users/svendaneel/okam/OkamAPI-modules` — the checkout everyone treats
as the backend — has **`lane/meals-grace-pins` @ `34c6c103`** out, mid-work. `feature/restaurant-modules`
is `8e2b57de`. A lane taking its baseline from that working tree without running
`git rev-parse --abbrev-ref HEAD` reads **a lane's in-progress tree as the integration tip**.
**This is the mirror of `F-BRIEF-QUOTES-UNMERGED-STATE` and it bit me the same hour I raised that one
again.** I wrote "branch `feature/restaurant-modules`" into a live lane's operating notes for that exact
path; the correction went out within ten minutes, but only because a sibling lane had just reported reading
the API's own branch explicitly rather than trusting the checkout.
**The remedy is the same discipline, one step wider:** a brief naming a *working tree* names the branch and
commit it was verified at, and a lane confirms `HEAD` before taking a baseline from a tree it does not own.


===== F-BACKEND-FACTS-OFF-BRANCH  [Blocker]
TITLE: the only two admissible facts read a checkout four commits behind
plan.md loc: plan.md:27461
QUOTED TOKENS (occurrence counts at the tips):
  journey                                        fe=288  be=155  ['jest.config.js']
BODY:
- clears when: the checkout every backend probe reads stands on the branch the plan declares, and the two journey facts measure what their exits claim
- owner: @sven
- blocks: FT-GROWTH

Third independent confirmation of the wrong-world problem, and this one names the consequence precisely:
**the two journey facts are the only facts admissible as evidence today**, and they would verify two lanes
**right now** — off a checkout **four commits behind integration**.
I did not use them. Recorded so nobody else does either.
**Both are worse than stale.** They are `journey`-kind probes reading **a hand-written manifest asserting
that twelve journeys are green** — prose about a suite, wearing the one evidence kind the tool admits. And
both exits are conjunctions **the fact only half-measures.**


===== F-BACKEND-SQL-TIER-IS-HALF-UNMEASURED-AT-THE-TRUNK  [Blocker]
TITLE: roughly half the backend SQL tier has never completed at the current trunk
plan.md loc: plan.md:33128
BODY:
- clears when: one uninterrupted backend SQL tier run completes at the trunk tip with every failure accounted for against the recorded baseline
- owner: @sven


===== F-BARE-PATHSPEC-PROVES-A-FALSE-ZERO  [Warn]
TITLE: one bad search in the corpus, and it published a two-file check as a whole-repository claim
plan.md loc: plan.md:29072
FILE REFS (resolved at the tips):
  lanes/L-BARE-PATHSPEC-SWEEP/pathspecs.md                   ABSENT
  Program.cs                                                 be-exact
  MealsQuoteService.cs                                       be-suffix
  lanes/L-BLOCKER-RESTATE/verdicts.md                        ABSENT :423
  Services/Meals/MealsQuoteService.cs                        be-exact
  Services/CartService.cs                                    be-exact
  MealsAgreementService.cs                                   be-suffix :52
  MealsCompanyService.cs                                     be-suffix :47
  MealsReconciliationService.cs                              be-suffix :45
  verdicts.md                                                ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  docs/plan/**                                   fe=2    be=1    ['lanes/L-THE-GUEST-EXIT-IS-FINISHED/evidence.md']
  lanes/**                                       fe=1    be=0    ['lanes/L-LAND-THE-FRONTEND-ON-THE-TRUNK/evidence.md']
  Program.cs                                     fe=31   be=88   ['test/world-stamp-windows.test.js']
  MealsQuoteService.cs                           fe=1    be=0    ['lanes/L-CENSUS-CORRECTIONS/recheck-production-randomness.txt']
  lanes/L-BLOCKER-RESTATE/verdicts.md:423-424    fe=0    be=0    []
  3579bbbc                                       fe=2    be=3    ['lanes/L-LIVE-WORLD-RESTORE/live-world-reset-run.txt']
  Program.cs:788                                 fe=0    be=0    []
  MealsAgreementService.cs:52                    fe=0    be=0    []
  MealsCompanyService.cs:47                      fe=0    be=0    []
  MealsReconciliationService.cs:45               fe=0    be=0    []
  lanes/                                         fe=98   be=11   ['jest.config.js']
  5197056                                        fe=0    be=0    []
BODY:
- clears when: the three corrections named in lanes/L-BARE-PATHSPEC-SWEEP/pathspecs.md are applied, and no evidence document states an unrestricted absence on the strength of a restricted search
- owner: @sven

**Swept, and the corpus is sounder than the method that worried me: 7 of 8 executable searches are sound.**
The denominator was built rather than assumed — 222 git commands cited across `docs/plan/**` and `lanes/**`,
34 carrying a pathspec, 21 `-S`/`-G` occurrences of which **12 are prose mentions of the technique** with no
pattern, leaving **8 distinct executable searches**: five root-wide and sound by construction, two
root-relative that reproduce today, and one bare.
**The instrument was validated first, and the control changed the count.** Bare `Program.cs` returns 266
commits; bare `MealsQuoteService.cs` returns 0; its full path returns 16. And `-- '*.cs'` matches **2724 files,
2723 of them nested** — git pathspec wildcards cross `/`, so the five `'*.cs'` citations are **globs, not bare
filenames** and would have been miscounted as defects without that control.
**The one defect is worse than a free zero, and the corrected search is not what exposed it.** At
`lanes/L-BLOCKER-RESTATE/verdicts.md:423-424`, rewriting the pathspec to
`-- Services/Meals/MealsQuoteService.cs Services/CartService.cs` **still returns 0** — the narrow conclusion
survives, exactly as predicted. **Unrestricted, the same search returns 11 commits across 8 production files**,
and at that paragraph's own declared ref `3579bbbc` the interface is **DI-registered at `Program.cs:788` and
constructor-injected by `MealsAgreementService.cs:52`, `MealsCompanyService.cs:47` and
`MealsReconciliationService.cs:45`.** So *"no consumer reach on any branch"* is **false as written** — the bare
pathspec let a two-file check be published as a whole-repository claim with nothing in the sentence recording
the narrowing.
**That is the transferable lesson, and it is not the one this flag was opened on.** The danger was never the
zero. It was that a search restricted to two files answered a question asked about a repository, and the
restriction vanished between the command and the sentence.
**Four sound zeros have since gone stale** — true when written, overtaken by remedies that landed one to three
days later. Any zero worth citing needs its ref and its date beside it.
**And one hazard is the clerk's own doing.** `lanes/` is a tracked directory in both repositories, so root-wide
`-S`/`-G` searches now match the evidence documents themselves: `verdicts.md` matched its own search via commit
`5197


===== F-BE-TESTS-AMBIGUOUS  [Warn]
TITLE: the backend suite fact can report a number belonging to no commit
plan.md loc: plan.md:26477
QUOTED TOKENS (occurrence counts at the tips):
  fact:be.tests                                  fe=0    be=0    []
  artifacts/tests/*.trx                          fe=0    be=0    []
BODY:
- clears when: the probe resolves to exactly one receipt and that receipt names the branch tip
- owner: @sven

`fact:be.tests` globs `artifacts/tests/*.trx`, and there are now two committed receipts: a lane's own
run at a non-tip SHA, and the tip's. Both are zero-failure, so nothing looks wrong — but if the probe
picks the lane's, the cockpit prints a total measured on a commit that is not on the branch.
This is the plan's own instrument having the defect the plan exists to catch: a number that is true of
something, presented as true of the branch. Found by the lane that committed the second receipt, which
said so rather than leaving it.


===== F-BOTH-PROBES-GATING-THE-PREF-FLAG-ARE-MISAIMED  [Warn]
TITLE: a flag that would stay open after a perfect deploy
plan.md loc: plan.md:30751
BODY:
- clears when: each fact gating the preference-centre flag reads the file that carries the behaviour it names, or the flag records which of them is deliberately unsatisfiable
- owner: @sven

**Found by the lane that went looking for what would clear the flag after the deploy, and the answer is
nothing would.** Both facts gating it are aimed at the wrong place.
**The first reads the composition root for a credentials setting that is registered somewhere else
entirely** — the file it inspects contains neither string on the branch that produced it. **The second
demands a cross-site cookie mode that the lane deliberately does not use**, and that a recorded correction on
another decision recommends **retiring**; the code is deliberately strict.
**So a flawless deploy would leave the flag exactly as open as it is today.** That is the advertised-control
shape once more, in its least visible form: not a control that gates nothing, but **a clearance condition
that cannot be met by the thing it is asking for.**
**The second probe cannot be repointed until the cookie-mode retirement is ruled**, so this is genuinely half
blocked rather than merely unwritten — and saying which half matters, because a lane sent to fix "the probes"
would stall on it.


===== F-BRIEF-QUOTES-UNMERGED-STATE  [Warn]
TITLE: the clerk has twice described an unmerged branch as if it were the tip
plan.md loc: plan.md:8159
FILE REFS (resolved at the tips):
  MealsIdempotencyRefusalTests.cs                            ABSENT
  WebApi.Tests/Meals/MealsAgreementWriterTests.cs            be-exact :173
QUOTED TOKENS (occurrence counts at the tips):
  L-WF-IDEMPOTENCY-REFUSAL                       fe=0    be=0    []
  L-WF-TIMEOFF-DECIDE-GATE                       fe=0    be=0    []
  lane/wf-exchange-award-ungated                 fe=0    be=0    []
  b10eb11c                                       fe=0    be=1    ['lanes/L-VIOLATION-EXACT-LAND/merge-receipt.md']
  lane/dated-test-output                         fe=0    be=1    ['lanes/L-VIOLATION-EXACT-LAND/merge-receipt.md']
  L-XZ-CREDIT-FIELDS                             fe=0    be=0    []
  L-MEALS-AGREEMENT-PIN-INVERTS                  fe=0    be=0    []
  54714dd6                                       fe=0    be=0    []
  L-MEALS-DOCSYNC                                fe=0    be=0    []
  built                                          fe=212  be=285  ['playwright.config.js']
  L-REPLAY-PINS-CLOSE                            fe=0    be=0    []
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  MealsIdempotencyRefusalTests.cs                fe=0    be=0    []
  8e2b57de:WebApi.Tests/Meals/MealsAgreementWrit fe=0    be=0    []
BODY:
- clears when: every brief that quotes a file, line or symbol names the commit it was read at, and no lane reports the described code absent from that commit
- cleared by: L-WF-TIMEOFF-DECIDE-GATE
- owner: @sven

**Twice in one session, both mine, both caught by the lane rather than by me.**
1. `L-WF-IDEMPOTENCY-REFUSAL` was briefed against `POST /staff/pos-operator-link-corrections`. **That
   endpoint is not on the integration branch** — it lives only on an unmerged lane. The lane fixed the
   primitive and every composition that *is* on the branch, and said so.
2. `L-WF-TIMEOFF-DECIDE-GATE` was told the census comment reads *"keeps the inbox closable"*. At the tip
   it reads *"keeps open requests decidable"* — the **original** invented word. The *closable* wording
   exists only on `lane/wf-exchange-award-ungated`, which is not an ancestor of the tip. **I had quoted a
   fix as though it had landed.**
The second lane then did the thing that makes this recoverable: it **declined to write a true-only-on-an-
unmerged-lane sentence into the census**, because a fresh comment that is wrong at its own base is a new
defect, not a fix.
**Third instance, 2026-08-04, and it was caught by two lanes independently in the same hour.** I put
*"the tree now stays clean after a full run — a sibling fixed the dated-output writer and pinned it"* into
two briefs. **False at the integration tip.** The fix and its pin are `b10eb11c`, reachable only from
`lane/dated-test-output`; `git merge-base --is-ancestor b10eb11c feature/restaurant-modules` is **NO**.
Both lanes restored the files and reported the discrepancy rather than assuming their own run was odd.
**Note what makes this instance worse than the first two.** Those quoted a fix as landed. This one told
agents that a **dirty tree is now a finding** — so a lane that saw the expected dirt would have been
pushed toward treating normal behaviour as a defect, and the honest ones spent effort proving it was not.
A wrong fact about the tip does not just mislead; it inverts what an agent is supposed to be alarmed by.
**Fourth and fifth instances, both 2026-08-04, and the fifth is the sharpest because it was not in a
brief — it was in a mid-flight correction I sent to a running lane.**
Fourth: I told two more lanes the tree stays clean after a full run. `L-XZ-CREDIT-FIELDS` disproved it
**against an untouched baseline checkout of the same commit**, establishing it as the base's behaviour
rather than any lane's.
Fifth: I messaged `L-MEALS-AGREEMENT-PIN-INVERTS` that a defect-asserting test needed inverting, and
authored a whole


===== F-BY-SIDE-CONFLICT-RESOLUTION-HAS-NOW-COST-FOUR-TIMES  [Warn]
TITLE: resolving a conflict by side has silently destroyed content four times in this estate
plan.md loc: plan.md:32994
BODY:
- clears when: a landing lane's instructions name git merge-file or an equivalent hunk-level resolution as the required method for any file with content on both sides, and no landing after that date records a by-side loss
- owner: @sven


===== F-C2-EXAMPLE-NO-LONGER-REPRODUCES  [Info]
TITLE: a constraint's cited evidence did not happen at the commit measured
plan.md loc: plan.md:28580
FILE REFS (resolved at the tips):
  20260709231226_POSv1.cs                                    be-suffix
QUOTED TOKENS (occurrence counts at the tips):
  L-WF-ONBOARD-DEMO-RUN                          fe=0    be=0    []
  holds_because                                  fe=0    be=0    []
  Orders.TableId                                 fe=0    be=1    ['docs/plans/modules/01-foundations-spec.md']
  de0811f6                                       fe=0    be=0    []
  20260709231226_POSv1.cs                        fe=0    be=0    []
  AddColumn                                      fe=0    be=102  ['Migrations/20260714004948_GoodsGroupVatProfileAndTips.cs']
  AccountingSummaries                            fe=1    be=85   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  F-ACCT-DUP                                     fe=0    be=0    []
BODY:
- clears when: C2's holds_because cites only examples that reproduce, or records the Orders.TableId case as historical with the commit at which it stopped
- owner: @sven

**Measured by `L-WF-ONBOARD-DEMO-RUN`, which was warned to expect this failure and did not find it.**
C2's `holds_because` — copied verbatim into **every generated brief** — says the estate has been bitten
twice, one of them *"a chain that cannot replay from empty because two migrations both add
`Orders.TableId`"*. That lane migrated **from an empty catalog, twice**, at `de0811f6`: **127 migrations,
211 tables, 25 append-only triggers, identical on both runs, no `SqlException 2705`.**
**It established why rather than merely reporting the absence.** Only `20260709231226_POSv1.cs` names
`Orders.TableId`, and its two hits are the `AddColumn` in `Up` and the `DropColumn` in `Down` — **one
migration, not two.**
**The constraint is not in question and must not be repealed.** Its second cited example —
`AccountingSummaries`, whose unique index exists in the model and in every model-built test database but in
no migration — is separately recorded as a live production defect under `F-ACCT-DUP`. **C2 stands on that
alone.**
**What is stale is a piece of evidence, and it is load-bearing in an unusual way**: because constraints are
copied into every brief, **every lane dispatched is told about a failure that no longer reproduces at the
tip**. A lane warned to expect a hazard it cannot meet learns to discount the warnings.
**Amending intent is Sven's alone**, which is why this is a flag and not an edit. The cheap correction is to
mark the `Orders.TableId` case historical with the commit at which it stopped reproducing, rather than to
remove it — the estate was bitten, and that it healed is worth knowing too.
**Scope, tightened by the lane that measured it rather than by the clerk who recorded it.** It asked that
this be held **exactly at `de0811f6`** and not read as a general repeal, and it is right:
- What is established is that **the recorded two-migration collision does not exist on this commit**.
- It does **not** prove that no other branch in the estate carries it — and there are dozens of lane
  branches, several forked from older bases.
- **The original flag may well have been true where it was first seen.** A defect that healed on one line
  of history is not a defect that was never real.
So the honest correction is *"historical, and absent at `de0811f6`"* — **not** *"never happened"*. A lane
working from an older base should still expect it, which is another reason to mark the example rathe


===== F-C5-NOT-WALKABLE  [Info]
TITLE: some work has no journey a person can walk, and owing one is dishonest
plan.md loc: plan.md:7661
QUOTED TOKENS (occurrence counts at the tips):
  L-WF-IDEMPOTENCY-REFUSAL                       fe=0    be=0    []
  Refused                                        fe=15   be=77   ['test/training-page.test.js']
  L-WF-CORRECTION-PINS                           fe=0    be=0    []
BODY:
- clears when: the plan records, per item, either a walk a person can complete or a stated reason no walk can exist
- cleared by: L-WF-IDEMPOTENCY-REFUSAL-REST
- owner: @sven

**C5 says acceptance is a person completing the journey, never a suite reporting green. A reviewer has
now named the first item where that cannot be satisfied, and said so rather than inventing a walk.**
`L-WF-IDEMPOTENCY-REFUSAL` changed a primitive. Reaching its defect requires a refused first attempt
followed by a **same-key retry** — and every shipped client mints a fresh key per call, so no UI journey
can reach the stuck state. From a browser a replayed refusal is **pixel-identical** to a recomputed one.
So the honest evidence is the test pair plus the `Refused` row discriminator, and **owing a walk here
would be owing a ceremony that can prove nothing.** A walk performed on a state the product cannot reach
is worse than no walk: it produces an acceptance signature over a thing nobody saw.
This is not a softening of C5. C5 exists because this estate repeatedly shipped green suites over
unreachable features, and the remedy is that **a capability is accepted by a person**. The narrow
carve-out is for changes that are *not capabilities* — primitives whose behaviour no surface exposes.
The test is whether a person could in principle reach the state, not whether walking it is inconvenient.
Sven rules whether that carve-out exists. Until he does, the item stays C5-unmet rather than quietly
exempt.
**Second instance, from the Fable review of `L-WF-CORRECTION-PINS` — and this one is sharper, because a
walk here would not merely prove nothing, it would prove the wrong thing.**
Items 1-3 of that lane are test-tier guards. Item 4 surfaces only in an audit table no UI renders. And
item 5's refusal is **unreachable from the shipped UI**, because the client refuses the bad shape
*before the network* — so **a UI walk would demonstrate the client guard while the new server guard sat
untouched**, and produce an acceptance signature naming the wrong control.
The reviewer offered the honest alternative rather than a ceremony: a curl sequence against a live
backend, which needs the SQL stack. And it named the fallback plainly — if that stack cannot come up,
the wire tier's observed `Expected: BadRequest / Actual: OK` **is** the demonstration.
Two instances now, found independently, both by reviewers who looked for a walk first and said so when
there was none. That is the evidence for the carve-out, and it is still Sven's to rule.


===== F-CAP-COUNTS-LANES  [Warn]
TITLE: the SQL cap counts lanes, and the danger is containers
plan.md loc: plan.md:23582
QUOTED TOKENS (occurrence counts at the tips):
  count-standing-worlds                          fe=0    be=0    []
BODY:
- clears when: the container budget accounts for worlds left standing, not only for lanes currently running
- owner: @sven
- blocks: L-LIVE-WORLD-DISCOVER, L-LIVE-WORLD-ADMINCRED

The plan's SQL cap governs **lanes**, and the thing that has OOM-killed this host is **containers.** Those
stopped being the same number the moment lanes began **leaving live worlds up on purpose** — which is
exactly what C5 asked them to do, so a human can walk them.
A lane reported four database containers up with about **2.3 GiB of headroom**, against an estate law of
two to three. Two of those belong to finished lanes holding worlds open for a walk; **neither counts
against the cap, and both are doing the right thing.**
**So the cap can read 2 of 2 while the machine carries twice that.** The fix is accounting, not
discipline: teardown commands are recorded in each lane's return, and nothing reads them.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `count-standing-worlds`.**


===== F-CAPABILITY-URL-BLINDSPOT  [Info]
TITLE: the route-shape guard is a rule about names, and a bearer token has no name
plan.md loc: plan.md:7703
FILE REFS (resolved at the tips):
  Controllers/EventsDepositsController.cs                    be-exact :77
QUOTED TOKENS (occurrence counts at the tips):
  L-PHONE-IN-PATH                                fe=0    be=0    []
  {mobil}                                        fe=0    be=0    []
  {tlf}                                          fe=0    be=0    []
  {telefonnummer}                                fe=0    be=0    []
  {epost}                                        fe=0    be=0    []
  {phoneNumber}                                  fe=0    be=4    ['artifacts/security/L-VIPPS-LOG-mutation.md']
  phoneNumber                                    fe=41   be=46   ['test/payment-type-label.test.js']
  {value}                                        fe=4    be=0    ['components/atoms/PriceInput.vue']
  {token}                                        fe=11   be=19   ['utils/i18n.js']
  Controllers/EventsDepositsController.cs:77     fe=0    be=0    []
  {vippsOrderId}                                 fe=0    be=6    ['WebApi.Tests/Observability/CredentialCompositionSweepTests.cs']
BODY:
- clears when: the deposit token's path placement is either ruled deliberate in this plan with its logging treatment named, or the token moves out of the path
- cleared by: L-PHONE-IN-PATH
- owner: @sven

**`L-PHONE-IN-PATH` built a guard that reads route templates off the compiled controllers and reds on
personal-identifier names in **English and Norwegian** — `{mobil}`, `{tlf}`, `{telefonnummer}`,
`{epost}` fail exactly like `{phoneNumber}`. A check keyed to the literal `phoneNumber` would have
passed its own rename mutation. That guard is real.**
**It stated its own limit, and the limit is the interesting part: it is a rule about *names*, so a
credential bound as `{value}` or `{token}` is invisible to it.**
Verified live at the tip: `Controllers/EventsDepositsController.cs:77` is
`[AllowAnonymous] [HttpGet("deposits/{token:guid}")]`. **That GUID is not an identifier of a row the
caller already has access to — it is the only thing authorizing the request.** A bearer credential in a
URL path is seen by every intermediary, reverse proxy and access log on the way, which is precisely the
argument the phone lane made, applied to something that is literally an auth token.
The route is **deliberate** — the controller comment cites spec §5, public, no login. This is the
ordinary capability-URL tradeoff that magic links make everywhere, and naming it is not a claim that it
is wrong.
**What is worth ruling is the treatment, not the design:** whether that token is redacted at the log
sinks the way the phone numbers were, and whether the plan says so anywhere. Today it does not.
The second half of this flag is the durable part: **do not read the new guard as proof that no
credential travels in a path.** It proves no *named* personal identifier does. That distinction is the
same one that let a deposit token travel as `{vippsOrderId}` past earlier review.


===== F-CENSUS-FLOORS-SILENTLY-INVALIDATED  [Warn]
TITLE: a merge can void a coverage census without conflicting
plan.md loc: plan.md:27195
BODY:
- clears when: the module actor census recomputes its floors rather than carrying them, or a merge of two census-touching branches is proven to re-red on a missed site
- owner: @sven

Named by two lanes that coordinated rather than collided. Both added a module to the shared actor-stamp
census; the files overlap **by region rather than by line**, so git merges them cleanly.
**What a clean merge silently invalidates is the census floors** — the counts that make the census assert
coverage rather than merely enumerate it. Whoever lands second must re-run those tests, and nothing makes
them.
Same family as the receipt trap and the guest-link fork: **the half git catches is not the dangerous
half.** Third instance of that shape recorded today.


===== F-CENSUS-IS-A-THREE-WAY  [Warn]
TITLE: the actor census file is edited by three lanes, not two
plan.md loc: plan.md:27525
QUOTED TOKENS (occurrence counts at the tips):
  F-CENSUS-FLOORS-SILENTLY-INVALIDATED           fe=0    be=0    []
BODY:
- clears when: the module actor census recomputes its floors rather than carrying them
- owner: @sven

Correction to `F-CENSUS-FLOORS-SILENTLY-INVALIDATED`, which records *two lanes that coordinated*. Verified
by diff intersection: **three** lanes edit that file — one adds a sixth pin, one adds a known-file entry and
an integer, one raises a module floor from fourteen to sixteen.
**Every one of three landings silently invalidates the floors again**, and the two-lane framing understates
how often that will happen.
**Correction 2026-08-03: it is two lanes in that file, not three.** The dispatch-actor lane is **stacked on**
the audit-ledger lane rather than parallel to it — it already contains that commit. My *three-way* was
counting a branch and its own ancestor as two independent editors.
**And the lane that derived the floors made all three conflict in git on purpose**, which is the useful
outcome: before, they merged cleanly and left the floors stale; now each collides on one hunk. **The
resolution is mechanical and side-neutral** — keep each lane's own declarations, delete the four fields that
no longer exist. It **chose nothing** between the competing floor values or pin shapes, which is the correct
answer to this flag from inside one of the lanes.
**A residual it stated rather than hid.** Equality narrows both readings together, so the old floors
incidentally caught a *dropped* stamp and the new derivation does not, for one shape: a non-standard stamp
dropped from a multi-stamp module — today only one module qualifies. Three assertions replace most of that
cover. **It declined to close the last case**, because the available heuristics would each have been tuned
to make today's tree pass — **which is the shape this lane existed to remove.**
Counting is per file rather than per line: the two readings agree on every site today, but a sequence point
binds to the statement rather than the construction token, so a multi-line construction could differ by one.
Lines still name the offender.


===== F-CERTIFICATE-DELTAS-LACK-THE-TRAILING-Z  [Info]
TITLE: certificate.update deltas lack the trailing Z that register deltas carry, on screen and paper alike
plan.md loc: plan.md:33288
BODY:
- clears when: certificate deltas serialize the same instant shape as register deltas, or the difference is recorded as deliberate
- owner: @sven


===== F-CH-BUILD-COPY-HAS-NO-DOM-GUARD  [Blocker]
TITLE: the Swiss market's only locale is asserted by nothing
plan.md loc: plan.md:30227
FILE REFS (resolved at the tips):
  nuxt.config.js                                             fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  nuxt.config.js                                 fe=14   be=3    ['env.ts']
  ['de']                                         fe=3    be=0    ['nuxt.config.js']
  ['en','no']                                    fe=2    be=0    ['test/e2e/journeys/modal-estate-scroll-lock.spec.js']
  USt-IdNr                                       fe=2    be=0    ['test/e2e/journeys/modal-estate-scroll-lock.spec.js']
BODY:
- clears when: at least one journey drives the CH locale and asserts rendered German on a fiscal surface, or the plan records that the Swiss copy is deliberately unguarded
- owner: @sven

**Measured and confirmed by the clerk at `nuxt.config.js`: the CH build serves `['de']` and defaults to `de`.**
The Norwegian build serves `['en','no']`. So German is not a third locale — **it is the entire Swiss product.**
**And no journey asserts a German or English literal anywhere.** Not one, across the whole e2e tier. **So the
Swiss market's copy has no DOM-level guard in this repository at all.**
**That ceiling sits above every other copy finding tonight.** Two defects were found by hand in the last hour
and **both are German, both on fiscal surfaces**: a receipt printing `USt-IdNr.` over a Norwegian
organisasjonsnummer — **a German VAT identification number, on the Swiss build, over a number that is not a
VAT id anywhere** — and a supplier field labelled *Handelsregisternummer* under a heading reading
*Organisasjonsnummer*.
**Neither was caught by anything, and neither could have been.** The suites that mount those surfaces are
copy-blind, the journeys never run at `de`, and the one repo-level guard that exists compares key *sets*.
**Live exposure is not established here.** Whether a Swiss venue reads these today depends on the CH go-live
state, which this lane did not read and which the plan should not assume either way.
**The clearing condition now appears met, and it is the owner's to confirm.** Two journeys landed today that
drive the CH locale and assert rendered German on fiscal surfaces — one on the margin statement week, one on
the receipt itself — **and both were falsified rather than merely written.** The receipt walk corrupts a German
key and reds with the DOM quoted, then corrupts the Norwegian one and stays **green at `ch` while reding at
`no`** over byte-identical trees, which pins the German render to the German dictionary rather than to a
fallback.
**One honest limit on that, recorded by the floor's own author:** a literal floor reds on **drift**, not on a
string that was wrong when it was written. The two German defects found by hand are **well-formed German a
floor author would have copied verbatim**, and both are recorded as findings with the DOM quoted rather than
asserted — because pinning them would red when the correction lands.
**So the ceiling is lifted and the specific defects are not closed by it.** The flag can clear on its own
words; the findings beneath it stand on their own.


===== F-CH-COOKIE-WITHHELD  [Warn]
TITLE: the Swiss edition's session cookie cannot attach under the ruled origin
plan.md loc: plan.md:27275
QUOTED TOKENS (occurrence counts at the tips):
  api-subdomain                                  fe=0    be=2    ['WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs']
BODY:
- clears when: the Swiss edition serves its API from a host sharing its own registrable domain, or the plan records that edition as deliberately using the weaker cookie
- owner: @sven

Measured rather than noted in passing: the Swiss market serves from **a different registrable domain** than
the one committed API origin, so under the ruled `api-subdomain` answer **that build's session cookie is
still withheld.**
The lane found it and **deliberately did not invent the symmetric hostname** — it does not resolve, and
committing it would break every Swiss call rather than only this one. That restraint is the finding: a
plausible configuration value is the cheapest possible way to turn one broken surface into all of them.
Neither origin ruling covers a second edition. This is the gap, stated where a ruling can reach it.


===== F-CI-PINS-NODE-16-AGAINST-AN-ENGINES-FIELD-OF-22  [Warn]
TITLE: the workflow pins node 16 while package.json declares 22.x, and node 16 has no crypto global
plan.md loc: plan.md:33253
BODY:
- clears when: the CI node version satisfies the engines field, or a prerendered route is shown not to reach newGuid on the pinned version
- owner: @sven


===== F-CLAIMED-RUNS-WERE-NEVER-ARCHIVED  [Warn]
TITLE: a landing cited per-class dual-revision runs and a baseline attribution run whose artifacts do not exist
plan.md loc: plan.md:33173
BODY:
- clears when: every run a landing report cites is archived under its lane directory, or the report cites only runs whose output survives
- owner: @sven


===== F-CLERK-EXITS-NAME-NO-INSTRUMENT  [Warn]
TITLE: the clerk is still authoring unverifiable lanes
plan.md loc: plan.md:8569
QUOTED TOKENS (occurrence counts at the tips):
  built-unverified                               fe=9    be=1    ['playwright.config.js']
  lanes/<ID>/…                                   fe=0    be=0    []
  fact                                           fe=337  be=489  ['playwright.config.js']
BODY:
- clears when: every lane authored after this flag carries an exit naming a fact key or a repo path, and a verify sweep refuses none of them for the instrument rule
- cleared by: L-EXIT-INSTRUMENT-SWEEP
- owner: @sven

**This is a live defect in my own authoring, not a historical one, and it is measured.**
A sweep this session offered every `built-unverified` lane its own recorded evidence. **114 had a
resolvable candidate; 7 verified and 107 were refused.** A targeted re-run over the twelve lanes merged
since refused **all twelve**. The refusal is always the same sentence:
> exit: "…" does not name lanes/<ID>/<file>
The seven that verified are exactly the lanes whose exit says **"recorded in `lanes/<ID>/…`"**. Every
merge lane I authored says that. **Almost none of the build lanes do** — they say *"pinned by a test that
reds if X"*, which is a good exit in every respect except the one the tool checks.
`plan verify` requires the evidence to **be the instrument the exit named**. So a lane can be built, its
mutation watched red and green, its receipt written — and still be unverifiable **forever**, because the
sentence it was dispatched against never named where the proof would live.
**I am not rewriting those exits.** The exit is the contract a lane was dispatched against, and editing it
afterwards so the evidence fits is the same move as editing a test until it passes. Those lanes stay
`built-unverified` and honest.
**The correction is forward-only: every lane I author from here names its instrument** — a `fact:` key or
a repo path — *in addition to* the observable and the mutation. The plan-hub standard has required this
since v1.0 (*"observable + instrument… if you cannot name the instrument, the lane is not designed yet"*);
I have been meeting half of it and calling the other half a detail.
**The cost is not theoretical.** It is the difference between 49 verified and a 127-lane backlog that no
amount of good work can drain.


===== F-CLOCKOUT-ANSWERS-OPEN  [Blocker]
TITLE: a clock-out that closed nothing reports the worker as clocked in
plan.md loc: plan.md:28773
FILE REFS (resolved at the tips):
  utils/workforce/pos-clock-state.js                         fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  L-WF-PUNCH-UI                                  fe=0    be=0    []
  closedUtc                                      fe=6    be=12   ['test/workforce-pos-clock.test.js']
  sessionState                                   fe=5    be=8    ['test/workforce-pos-clock.test.js']
  utils/workforce/pos-clock-state.js             fe=2    be=2    ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/landing-receipt.md']
  clockSessionId                                 fe=7    be=10   ['test/workforce-pos-clock.test.js']
BODY:
- clears when: a clock-out with no open session is refused or reports a state that is not Open, shown by a wire assertion over the response
- cleared by: L-CLOCKOUT-STATE-IS-NOT-OPEN
- owner: @sven

**Found by `L-WF-PUNCH-UI` in the half its brief predicted would carry the defects, and only the client side
is fixed.** `POST /workforce/pos/clock-events` answers a clock-out with **no open session** as:
`200` · `accepted: true` · `clockSessionId: null` · **`sessionState: "Open"`**
**The field is derived from `closedUtc` alone**, so an absent session and an open one are indistinguishable.
**What that does to a person.** A register bound to `sessionState` **flips to "clocked in" at the moment a
worker presses *Stemple ut*.** They leave believing they clocked out, and **the register carries no end
time** — so the hour that reaches payroll, the attendance record and the § 8-5-6 personalliste are all
wrong in the same direction, and the worker has been shown the opposite of what happened.
**The client half is closed**: `utils/workforce/pos-clock-state.js` now makes `clockSessionId` authoritative
and states the rule once. **The wire still answers the lie**, so any other caller — a second client, a
partner integration, a future screen — inherits it.
**That is why this is a blocker rather than a fixed defect.** `accepted: true` on an act that accepted
nothing is the same shape as the assertions this program has spent the day removing, except it is on the
money path and a person reads it.
**Not assigned to a lane yet**: the fix is backend, and whether a no-op clock-out should be **refused** or
should **answer a truthful state** is a small product call rather than an obvious repair.


===== F-CLOCKOUT-FIXTURE-IS-A-STALE-DOUBLE  [Warn]
TITLE: the frontend fixture still hardcodes an Open session for the nothing-open case and still passes
plan.md loc: plan.md:33138
BODY:
- clears when: the e2e fixture reports the clock-out state the wire now reports, and reds if it is set back to the old hardcoded Open
- owner: @sven


===== F-CLOCKSCREEN-FOUR-BRANCHES-NO-KEYS  [Blocker]
TITLE: four branches carry a till screen whose translation keys exist nowhere
plan.md loc: plan.md:30130
FILE REFS (resolved at the tips):
  ClockScreen.vue                                            fe-suffix
  no.ts                                                      fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  ClockScreen.vue                                fe=7    be=0    ['test/pos-clock-reserved-key.test.js']
  wfclock_*                                      fe=0    be=0    []
  wfclock_                                       fe=0    be=0    []
  no.ts                                          fe=8    be=6    ['test/events-surface.test.js']
  e34977a                                        fe=13   be=1    ['test/order-label-dictionaries.test.js']
  posclk_*                                       fe=0    be=0    []
BODY:
- clears when: no branch adds a component whose translation keys are absent from every locale on every ref, or the working pair is committed so the merge has something to conflict with
- owner: @sven

**Four branches commit a `ClockScreen.vue` that uses `wfclock_*` keys, and the clerk measured where every
version of this actually lives.** `wfclock_` appears **zero times** in `no.ts` — not on `e34977a`, not in the
working tree, nowhere.
**And the working alternative is entirely uncommitted.** The on-disk `ClockScreen.vue` uses `posclk_*`, which
appears **25 times in the working tree's `no.ts` and zero times at `e34977a`.** So the component and its keys are
**both untracked**, a pair that exists only on this machine.
**That makes the hazard worse than "landing one replaces the fixed file".** Landing any of the four gives a
till screen whose keys resolve to nothing — **and the merge would overwrite an untracked file, so the working
pair goes with it and nothing conflicts.** A `git clean` would do the same for free.
**The lane that found it declined to commit the file**, correctly: four branches already add that path with
different content, and committing would manufacture an add/add conflict and land another lane's feature.
**So there is no safe unilateral act here.** Committing the working pair, landing one of the four, or doing
nothing each lose something, which is why this is a flag and not a fix.
**Measured false on 2026-08-06, and the clerk confirmed it after first measuring it wrong.** All 47 keys of
one prefix and all 25 to 26 of the other **are defined on the same ref as the component that uses them** —
across all six refs carrying the screen. **The flag measured the tip and the working tree, which are the two
places the component does not exist.**
**The clerk's own first check returned zeros on every ref**, because the reference was unbraced and the shell
applied a **history modifier** to the path — the fourth instance of that trap in two days, and this one landed
on the clerk while it was verifying a refutation of somebody else's instrument.
**What survives is the overwrite hazard**, not the missing keys: the pair remains untracked in the shared
checkout.


===== F-COERCION-MAKES-A-ZERO  [Warn]
TITLE: three formatters turn "we did not measure" into a measured zero
plan.md loc: plan.md:9423
QUOTED TOKENS (occurrence counts at the tips):
  Number(null)                                   fe=8    be=0    ['test/workforce-personnel-list.test.js']
  Intl.NumberFormat().format(null)               fe=2    be=0    ['test/margin-waste.test.js']
  readWasteEntries                               fe=4    be=0    ['test/margin-waste.test.js']
BODY:
- clears when: no render path coerces null or undefined to a number, and each of the three known coercions is pinned with null, undefined and empty-string asserted separately from a genuine zero
- cleared by: L-MRG-COVERAGE-UNKNOWN
- owner: @sven

**The estate's most-repeated defect has a single mechanical cause, and it is now named.**
Sven's standing ruling is **withhold rather than zero**: a number that cannot be established must say so.
Four lanes have now removed a violation of it — a delivery record flipped to *Delivered* regardless of push
outcome, an accounting export reporting a store count while no provider existed, and **two in one module in
one day**:
- `Number(null)` is **`0`** — an absent projection lag rendered as *"0 poster står igjen"*.
- `Intl.NumberFormat().format(null)` is the string **`"0"`** — a per-reason count the server **withheld**
  printed as a counted zero.
**Both were found by the lane's own test, not by review**, which is the part worth keeping: the coercion is
invisible at the call site and only appears when someone writes the absent case down.
**The distinction that closes it is `=== null`, not falsiness.** `!0` is `true`, so a truthiness guard
swallows the genuine zero — which is the case that must survive. A lane that fixes this by testing
truthiness has replaced one wrong answer with another.
**And the middle world is what proves it.** Three worlds are needed, not two: a value present, a value
**genuinely zero**, and the value absent. Without the middle one, a surface that always says *unknown*
passes — the relabelling that looks like a fix.
A third instance is already recorded and unfixed: `readWasteEntries` was verified, but the **backend half**
of that contract could not be checked from the frontend repo, so *"web and API deploy independently, the
absent-block window is permanent"* stands as an unverified claim rather than a confirmed one.


===== F-COMMIT-CITES-WHAT-IT-LACKS  [Warn]
TITLE: evidence named in a commit that the branch does not carry
plan.md loc: plan.md:27801
FILE REFS (resolved at the tips):
  lanes/L-DI-COLLECTION-SILENT/census.md                     fe-exact :101
QUOTED TOKENS (occurrence counts at the tips):
  L-CENSUS-CORRECTIONS                           fe=3    be=0    ['lanes/L-DI-COLLECTION-SILENT/census.md']
  5ad0ca0^                                       fe=0    be=0    []
  5ad0ca0                                        fe=0    be=0    []
  lanes/L-DI-COLLECTION-SILENT/census.md:101     fe=0    be=0    []
  :112-118                                       fe=0    be=0    []
  artifacts/                                     fe=64   be=35   ['playwright.config.js']
  *.log                                          fe=1    be=1    ['.gitignore']
  L-JOURNEY-GROWTH                               fe=2    be=0    ['.gitignore']
BODY:
- clears when: no committed document cites a baseline, script, dump or capture that is absent from the same branch without naming where it can be recovered
- owner: @sven

**Three shapes, one defect, all three measured on 2026-08-04.**
**1. A correction that destroys its own baseline.** `L-CENSUS-CORRECTIONS` rewrote two censuses in place and
claimed — truthfully — that no verdict, site, row or finding was removed. But **neither census existed at
`5ad0ca0^`**: both were untracked working-tree files, and `5ad0ca0` is their first commit. So the claim was
**structurally unfalsifiable from the repo it shipped in.** Its reviewer could only settle it by recovering
byte-exact baselines from session transcripts and diffing them (result: nothing removed — 19/19 rows,
12/12 entries). **That is the "assert, don't show" shape the lane itself was correcting, one layer up.**
**2. A commit citing scripts it does not contain.** The same commit cites a tool "by its own line numbers"
at `lanes/L-DI-COLLECTION-SILENT/census.md:101` and figures per a dump's EXT lines at `:112-118`, while
four cited artifacts stay untracked. The figures are right; the citation points at nothing a later reader
can open.
**3. Captures that land outside the clone.** `artifacts/` and `*.log` are gitignored, so a journey lane's
capture files — the named evidence of its exit — are not in the branch at all. `L-JOURNEY-GROWTH` said so
plainly, which is why it is rulable rather than hidden.
**Why this is worth a flag rather than three notes.** Each looks like bookkeeping and none is. The common
failure is that **a document's most load-bearing claim rests on something the reader cannot fetch**, so
verifying it costs forensics or is impossible — and the estate has already learned that uncommitted work is
its most fragile state. The cheap remedy is per-lane and forward-only: commit the baseline before
correcting it, commit the script beside the figure, and where a path is genuinely gitignored, **say so in
the return** and name where the file lives.


===== F-COMMIT-TREE-LEAVES-NO-REF  [Warn]
TITLE: lanes are building commits that no ref reaches
plan.md loc: plan.md:28060
QUOTED TOKENS (occurrence counts at the tips):
  L-JOURNEY-PROXY-BLINDSPOT                      fe=0    be=0    []
  L-JOURNEY-PORT-HARDCODED                       fe=0    be=0    []
  4772c131                                       fe=0    be=0    []
  commit-tree                                    fe=2    be=0    ['lanes/L-XZ-NEGATED-ABSENCE/mutation-log.md']
  update-ref                                     fe=1    be=3    ['lanes/L-XZ-NEGATED-ABSENCE/mutation-log.md']
  bff6a47b                                       fe=0    be=0    []
  1b324667                                       fe=0    be=0    []
  59f5fabf                                       fe=0    be=0    []
  6f7f155c                                       fe=0    be=0    []
  2b10e305                                       fe=0    be=0    []
  8550f5e0                                       fe=0    be=0    []
  097c3c9e                                       fe=0    be=0    []
  1890c9a3                                       fe=0    be=0    []
  refs/salvage/dangling-<sha>                    fe=0    be=0    []
BODY:
- clears when: no lane reports a commit that git fsck lists as dangling, and the commit-tree recipe in circulation names the ref update as a required second step
- cleared by: L-EVIDENCE-CITATIONS-RESOLVE
- owner: @sven

**Two lanes in one hour reported work "committed" that was reachable from nothing.**
`L-JOURNEY-PROXY-BLINDSPOT` advertised `lane/L-JOURNEY-PROXY-BLINDSPOT @ 9d4399a` — **that branch did not
exist**; `L-JOURNEY-PORT-HARDCODED` said plainly "dangling commit `4772c131`, no ref moved". Refs were
created for both.
**This is worse than uncommitted work, and that is the part to hold on to.** Uncommitted work shows up in
`git status`; **a dangling commit shows up nowhere** and is prunable by a `gc` nobody scheduled. The estate
already came within one `git checkout` of losing a lane's work today; this is the same loss with no
warning surface at all.
**The cause is mine, and it is a recipe I put in circulation.** After a lane used `git commit-tree` against
a private index to avoid moving the shared ref — which was the right idea and protected roughly twenty
lanes' dirty files — I repeated it in operating notes as the standard to match, **without naming its second
step**. `commit-tree` builds an object; `update-ref` is what makes it reachable. A recipe missing its
second half reads as complete.
**A sweep found eight such commits, not two**, spanning 08-01 to 08-04, none of whose trees matches any
branch tip: `bff6a47b`, `1b324667`, `59f5fabf`, `6f7f155c`, `2b10e305`, `8550f5e0`, `097c3c9e`,
`1890c9a3`. All eight are now held under `refs/salvage/dangling-<sha>` — **quarantine, not endorsement**:
at least three are known superseded, and the salvage namespace deliberately does not claim any of them is
canonical. The other twenty-seven dangling objects are stashes and are normal. Deciding which salvaged
commits matter belongs to their lanes.
**Measured end to end, 2026-08-05, over 1987 citations from 559 evidence lines.** Of **527 commit ids, 524
sit on a ref.** Exactly **one is dangling** — `f176db85` on `L-EV-SEED-DEPOSITS`, whose branch moved to
`caee6ae3` and whose identical commit message is on that branch as `7a6d9798`. **The citation is dead and the
work is not lost**, which are two findings and not one; that lane is `state: open` with a `fail-spec` verdict,
so the consequence is small.
**The instrument was validated in both directions before any zero was reported, and it needed five
corrections to get there.** The dominant error source was cross-repository: naive two-root checking scored
**238 paths absent when the true figure is 3.** The most


===== F-COMPANY-REFUND-BOOKS-A-CASH-PAYOUT  [Blocker]
TITLE: the drawer says cash went out for a sale no cash came in for
plan.md loc: plan.md:32682
FILE REFS (resolved at the tips):
  20-company-meals-spec.md                                   be-suffix :107
  pos-service.ts                                             ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  CompanyAccount                                 fe=16   be=58   ['test/payment-type-label.test.js']
  PaymentType.Cash                               fe=3    be=74   ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  20-company-meals-spec.md:107                   fe=0    be=0    []
  MealsJournalProjectionSource                   fe=1    be=27   ['lanes/L-DI-COLLECTION-SILENT/composition-root-dump.txt']
  :221                                           fe=1    be=0    ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/fe-jest-tip.txt']
  Cash                                           fe=52   be=441  ['test/payment-type-label.test.js']
  PayOut                                         fe=2    be=64   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  CashTotal                                      fe=0    be=13   ['WebApi.Tests/Meals/MealsCompanyAccountRefundJournalTests.cs']
  PosController                                  fe=6    be=40   ['test/e2e/fixture/workforce-punch.js']
  RefundCash                                     fe=1    be=10   ['components/admin/pos/RefundModal.vue']
  pos-service.ts                                 fe=0    be=3    ['docs/plans/surfboard-partial-payments-plan.md']
  F-MEALS-FUNDING-AUTHORITY-COLLISION            fe=0    be=0    []
BODY:
- clears when: a referenced return of a CompanyAccount receipt books against the company account rather than the cash drawer, shown at the fiscal journal
- cleared by: L-COMPANY-REFUND-IS-NOT-A-CASH-PAYOUT
- owner: @sven

**Found by seeding an ordinary refund on a funded lunch.** A referenced return of a `CompanyAccount` receipt
**works** — but only through `POST /pos/payment/cash/{journalEntryId}/refund`, which **hardcodes
`PaymentType.Cash`**, demands an open cash-drawer day, and books a **cash pay-out on the drawer ledger**.
**There is no `CompanyAccount` referenced-return path at all.**
So the fiscal record states that **cash was handed back for a sale that was never paid in cash** — the drawer
is short on paper by an amount that never left it, and the company's own account is not credited by that route.
**This is a C4 and a bokføring question at once**: the money path names an actor and a tender, and the tender it
names is false. An operator refunding a company lunch has no correct control to press.
**Fixed on a patch, and the fix was smaller than the defect suggested — the Meals limb already worked.**
**The spec had already answered the design question** (`20-company-meals-spec.md:107`, `:37`): a company refund
**reverses the funding allocation directly** and mints no tender. `MealsJournalProjectionSource` keys on
`ReceiptType == Return`, **not on tender**, so the reversal already landed correctly. **The entire defect was
POS-side**, and §7 `:221` already names refund paths among the switches that must classify `CompanyAccount` as
a receivable — *"never fake cash or card tender"* (§13.2).
**Red proven on unmodified code, 6 of 6**: RETREC tender `Cash`; drawer `PayOut` −14 900; expected cash 100 000
→ 85 100; X-report `CashTotal` −14 900; refused outright with no open cash day; and no company route on
`PosController` at all.
**The change**: a new `POST /pos/payment/company-account/{journalEntryId}/refund` that journals
`CompanyAccount`, reads no drawer session and needs no open day. `RefundCash` now **refuses a company original
and names the correct control**, and the new route refuses a non-company original so it cannot be used to skip a
real pay-out. **SAF-T follows for free**: the return exports medium **12006 CUSTACCT**, not 12001 CASH.
**One judgement call for review**: § 5-3-7's second paragraph ties signature and phone to a *tilbakebetaling til
kunde*. A company return pays nobody back, so both were dropped **on the new route only** — verified reachable
from nowhere else, with a cash return still requiring a signature, pinned.
**C3 is not clo


===== F-COMPANYACCOUNT-BLOCKED-BY-THE-APPROVAL-GATE  [Warn]
TITLE: a tender that touches no rail is refused like one that does
plan.md loc: plan.md:32728
QUOTED TOKENS (occurrence counts at the tips):
  PaymentType.CompanyAccount                     fe=4    be=38   ['test/e2e/journeys/consumer/meals-funded-checkout.spec.js']
  !Store.Approved                                fe=0    be=0    []
  PayInStore                                     fe=16   be=135  ['test/store-cart-state.test.js']
BODY:
- clears when: a company-account order is accepted for an unapproved store, or the plan records why approval should gate a tender that touches no payment rail
- owner: @sven

`PaymentType.CompanyAccount` is **not exempted from the `!Store.Approved` gate** the way `PayInStore` is.
**A company tender never touches a payment rail** — it draws on an agreement the venue already has — so the
approval check that exists to protect card and wallet flows refuses something it has no reason to.
Found because store 1 was unapproved and closed, which blocked consumer checkout entirely and forced the seeder
around it. **A venue piloting Company Meals before approval completes is exactly the case the module is for.**


===== F-CONDITIONS-HAVE-NO-RETURN-PATH  [Warn]
TITLE: an applied review condition has nowhere legal to land
plan.md loc: plan.md:27855
QUOTED TOKENS (occurrence counts at the tips):
  built-unverified                               fe=9    be=1    ['playwright.config.js']
  running                                        fe=100  be=139  ['nuxt.config.js']
  verified                                       fe=67   be=165  ['playwright.config.js']
  open                                           fe=426  be=685  ['vercel.json']
  L-MRG-COVERAGE-UNKNOWN-2                       fe=0    be=0    []
  L-MRG-COVERAGE-UNKNOWN                         fe=2    be=0    ['lanes/L-MARGIN-WASTE-SURFACE-IS-HONEST/evidence.md']
  4557027                                        fe=0    be=0    []
  evidence                                       fe=135  be=314  ['jest.config.js']
BODY:
- clears when: a lane that applies review conditions has a reporting path the clerk accepts, and no applied condition sits only in a refused return file
- cleared by: L-ATDE-REVIEW-CONDITIONS
- owner: @sven

**Measured on 2026-08-04 by trying it.** Six lanes had written a second RETURN; the clerk refused **all
six** — four with *"lane is `built-unverified`, not `running`"*, one with *"is `verified`"*, and the two
oldest because their lanes never left `open`.
The refusals are correct: the clerk's model is **one dispatch, one return**. The gap is that the loop this
plan actually runs has a step the model does not — a lane reaches `built-unverified`, a Fable reviewer
names conditions, the lane applies them, **and then has no legal way to report that it did.**
**The cost is not lost work but lost attribution.** In at least one case the refused second return carried
the *better* evidence pointer: `L-MRG-COVERAGE-UNKNOWN-2` names the commit and the provenance section,
where the merged first return predates the commit existing. The plan therefore verifies against the weaker
pointer of the two it was given.
Interim convention adopted, so nothing stalls: **a lane applying conditions reports in a message, and the
orchestrator re-points the lane's evidence and logs it.** Whether the clerk should instead accept a second
return, or model conditions as a successor lane, is a change to the tool and is Sven's to rule.
**Checked on 2026-08-05, and the claim above holds — but only at the ref the return names.** Measured in the
shared checkout, `L-MRG-COVERAGE-UNKNOWN`'s evidence file has no section 9 at all and ends *"Nothing was
committed"*; measured at `4557027`, section 9 is there in full. **The clerk made the wrong-ref error first
and caught it before reporting**, which is the fourth instance of that error in this program and the reason
a brief must name the commit it read a state at.
**The cost is narrower than first written, and worth narrowing.** The two evidence *paths* are identical, so
nothing needed re-pointing; what the refused return carried was **content**, not a better pointer. The real
gap is that the `evidence:` field is a bare path with no room for a ref, so **a plan can point at a file that
resolves and still read the wrong copy of it.**


===== F-CONFIRM-BRUTEFORCE  [Blocker]
TITLE: the proof the § 15 guard rests on can be guessed
plan.md loc: plan.md:23297
QUOTED TOKENS (occurrence counts at the tips):
  already-fixed-pending-merge                    fe=0    be=0    []
  L-CONFIRM-FAMILY-MERGE                         fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: confirming an email is rate-limited and attempt-counted, and the code is drawn from a cryptographic source
- cleared by: L-CONFIRM-FAMILY-MERGE
- owner: @sven
- blocks: FT-GROWTH

The test-send guard now requires a **confirmed** address, which is the right fix. **Its premise is not
sound.**
Confirming an email compares a plaintext six-digit code with **no attempt counter, no lockout on that
path, and no rate limit** — the code is **not invalidated on a wrong guess**, and a fresh one can be minted
forever. Even odds at roughly 450,000 attempts: **about seventy minutes at a hundred requests a second.**
The code is also drawn from a non-cryptographic generator.
So markedsføringsloven § 15 went from **two requests to any address** to **an afternoon and a script.**
Narrowed, not closed — **and the commit message claims closed.**
**The condition this turns on:** the rate-limit lane running now must cover the **guess** entry point, not
only the address write. If it covers only the send route, **the § 15 claim does not hold.**
Not live exposure today — the module is dark and the provider defaults to a fake. **A go-live gate.**
**Ruled 2026-08-03 (Sven): `already-fixed-pending-merge`.**
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-CONFIRM-FAMILY-MERGE`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiated blockers.


===== F-CONFIRM-MERGE-RECEIPT-TRAP  [Blocker]
TITLE: two lanes recorded different runs at one receipt path
plan.md loc: plan.md:26739
FILE REFS (resolved at the tips):
  evidence.md                                                fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  artifacts/tests/base-8704ff63-fast-tier.trx    fe=0    be=3    ['artifacts/tests/README.md']
  evidence.md                                    fe=6    be=4    ['lanes/L-LIVE-WORLD-BANNER/evidence.md']
  rename-both                                    fe=0    be=0    []
  51e97fa2                                       fe=0    be=1    ['artifacts/tests/README.md']
  ee81d409                                       fe=0    be=0    []
  10a733ea                                       fe=0    be=1    ['artifacts/tests/README.md']
  a1eae22b                                       fe=0    be=0    []
  L-CONFIRM-FAMILY-MERGE                         fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: the confirm family is merged with both base receipts kept under distinct names and each lane's evidence file pointing at the run it actually produced
- cleared by: L-CONFIRM-FAMILY-MERGE
- owner: @sven
- blocks: S-PILOT-SAFE

Found by the Fable review of the eleven-commit confirm family, and it is a **merge-time** hazard: it
cannot be seen in any single lane, and both lanes are individually correct.
Two siblings each measured the same base independently and each committed **its own run** at the
identical path `artifacts/tests/base-8704ff63-fast-tier.trx`. The counters agree; the blobs and run ids
do not. Git conflicts loudly, which is the system working.
**The trap is the resolution.** Each lane's `evidence.md` names that exact path as *its* recorded base
run. Taking either side — `-X ours`, `-X theirs`, or a human picking the newer one — leaves the other
lane's evidence pointing at a trx **it did not produce.** That is the receipt-contradicting-its-own-
description shape this estate has already paid for.
The resolution is to **rename both** and update the one path reference in each evidence file. A second
conflict in the receipts README is benign and resolves as a pure union.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `rename-both`.**
**Resolved correctly 2026-08-03, and the two runs were genuinely different.** Blob `51e97fa2` (run id
`ee81d409`, 13:55) and `10a733ea` (`a1eae22b`, 13:57): counters agree at 4410/4398/0/12, **two minutes
apart, not the same run.** Taking either side would have deleted a real measurement.
Renamed both, **extracted blobs hashed byte-identical to the originals**, and the one path reference in
each lane's evidence repointed at the run that lane actually produced.
**And the composed tree was measured for the first time**: it had never been compiled or run — every number
in that family was per-lane. Build 0 errors, fast tier 4487/4475/0/12. The named post-merge repair then
added exactly +1 test and +1 pass, **reproduced composed rather than inherited from the lane that wrote
it.**
**The SQL tier has still never run against any commit in this family.**
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-CONFIRM-FAMILY-MERGE`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiat


===== F-CONSENT-SUMMARY-REASONS-NOT-IN-THE-ENUM  [Warn]
TITLE: a body the divergence check cannot see is wrong
plan.md loc: plan.md:29540
FILE REFS (resolved at the tips):
  GrowthConsentStanding.vue                                  fe-suffix :54
QUOTED TOKENS (occurrence counts at the tips):
  CONSENT_SUMMARY                                fe=3    be=0    ['test/growth-send-gate.test.js']
  SpamComplaint                                  fe=1    be=0    ['test/e2e/fixture/growth-newsletter.js']
  ManualSuppression                              fe=1    be=0    ['test/e2e/fixture/growth-newsletter.js']
  Complaint                                      fe=3    be=11   ['test/growth-send-gate.test.js']
  AdminBlock                                     fe=0    be=6    ['WebApi.Tests/Growth/GrowthSuppressionLiftTests.cs']
  GrowthSuppression.Reason                       fe=0    be=0    []
  EnumToStringConverter                          fe=0    be=11   ['Migrations/20260714192953_PosSimplificationReasonsRoles.cs']
  GrowthSuppressions                             fe=1    be=67   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  UPDATE                                         fe=11   be=223  ['test/e2e/scripts/live-world-reset.sh']
  readConsentStanding                            fe=5    be=0    ['test/growth-send-gate.test.js']
  GrowthConsentStanding.vue:54                   fe=0    be=0    []
  exclusionReasonBreakdown                       fe=5    be=1    ['test/growth-newsletter-page.test.js']
  PendingConfirmation                            fe=1    be=0    ['test/e2e/fixture/growth-newsletter.js']
  GrowthConsentDenyReason                        fe=0    be=27   ['WebApi.Tests/Growth/GrowthConsentServiceTests.cs']
BODY:
- clears when: every suppression reason the fixture reports exists in the backend enum, or a check compares response bodies and not only status shapes
- owner: @sven

**Found while teaching the fixture a refusal, outside that lane's subject.** `CONSENT_SUMMARY` reports reasons
**`SpamComplaint`** and **`ManualSuppression`**. The backend enum has **`Complaint`** and **`AdminBlock`**.
Neither fixture value exists in the product.
**The divergence check is blind to it by construction.** It compares refusal shapes — status and error key —
and this is **body-shape drift**. So the check can be green while a journey walks a world whose vocabulary the
product does not use.
**That widens what a green run means, in the direction the receipt already warned about.** Twelve of 642 routes
are anchored, and now: within those twelve, only the refusal shape is compared. **A green divergence run is a
statement about status codes on a twelfth of the surface**, not about the fixture matching the backend.
**Settled, and by C1 rather than by taste.** The brief invited the counter-hypothesis that the fixture's names
were the better ones and the enum the poorer side. It does not survive the storage layer:
`GrowthSuppression.Reason` persists through an `EnumToStringConverter`, so **the member name is the stored
string**, and `GrowthSuppressions` is one of three tables the append-only guard defends. **Renaming `Complaint`
orphans every row already carrying it, and the only repair is an `UPDATE` against an append-only ledger.** The
enum cannot move; the fixture did.
**Readers were found first, the prediction was recorded, and it held: zero reds.** Nothing asserted either
string, and every other consumer already spoke the product's vocabulary. **The fixture's own suppression ledger,
twelve lines below the defect, already used the real spellings — the file contradicted itself.**
**And it was never an internal token.** `readConsentStanding` passes the keys through untouched and
`GrowthConsentStanding.vue:54` renders `{{ entry.reason }}` **raw** — no label map, no i18n key; the clerk
confirmed the line. **Every journey against this fixture printed two words to a Norwegian operator that the
product can never print.**
**A third divergence, found and deliberately left.** `exclusionReasonBreakdown` reports `PendingConfirmation`,
which is not a member of `GrowthConsentDenyReason` either — the intended member is `Unverified`, corroborated
by two existing unit tests rather than guessed. Zero readers, one word, a different enum, named in place.
**Three divergent strings in this one fixture aga


===== F-CONSUMER-MENU-EMPTY-WITHOUT-CATEGORY-IMAGES  [Blocker]
TITLE: a category with no picture is dropped from the shop
plan.md loc: plan.md:32783
FILE REFS (resolved at the tips):
  CategoryModelBuilder.cs                                    be-suffix :49
QUOTED TOKENS (occurrence counts at the tips):
  CategoryModelBuilder.cs:49                     fe=0    be=0    []
  searchOptions                                  fe=0    be=11   ['Mcp/Services/McpShoppingService.cs']
  bulk-import                                    fe=0    be=4    ['Bruno/Okam API/products/-products-bulk-import.bru']
BODY:
- clears when: a published category with no image still appears in the consumer menu, or the product refuses to publish one
- cleared by: L-A-PUBLISHED-CATEGORY-REACHES-THE-SHOP
- owner: @sven

`CategoryModelBuilder.cs:49` **drops any category with no image** whenever `searchOptions` is present — and the
consumer web **always sends them**. Store 1 has zero category images, and `bulk-import` sets none.
**So the shop renders an empty menu over a fully published catalogue**: four categories, fifteen products,
every one `published: true`. Proven by calling the same endpoint without a body, which returns all four.
**Nothing tells the operator.** The admin pages show a complete menu, so the venue believes it is trading.


===== F-CONSUMER-READS-CATEGORY-IMAGE-UNGUARDED  [Blocker]
TITLE: two consumer surfaces throw the moment a category has none
plan.md loc: plan.md:32876
FILE REFS (resolved at the tips):
  ConsumerWeb/pages/categories.vue                           fe-basename :302
  ConsumerApp/.../CategoriesPage.vue                         ABSENT :405
QUOTED TOKENS (occurrence counts at the tips):
  ConsumerWeb/pages/categories.vue:302           fe=0    be=0    []
  ConsumerApp/.../CategoriesPage.vue:405         fe=0    be=0    []
  category.image.imageUrl                        fe=3    be=0    ['lanes/L-LAND-THE-FRONTEND-ON-THE-TRUNK/evidence.md']
  node_modules                                   fe=37   be=6    ['nuxt.config.js']
  modul/apps/admin-web/.../CategoryManager.tsx:4 fe=0    be=0    []
BODY:
- clears when: no consumer surface dereferences a category image without a guard, shown by a render of a category that has none
- owner: @sven

**This is a landing-order hazard, not a defect in isolation, and it is why the category fix must not ship
alone.**
`ConsumerWeb/pages/categories.vue:302` and `ConsumerApp/.../CategoriesPage.vue:405` read
`category.image.imageUrl` **unguarded**. They have never thrown **only because the backend guaranteed an
image** — by dropping every category that lacked one, which is the very defect being fixed.
**So the backend fix hands them a shape they have never seen.** Guards first, or both together. Never the
backend alone.
Guards are patched in the lane directory but **unbuilt** — separate repos, isolated worktree, no
`node_modules`.
**A third surface tells the operator a falsehood after the change**:
`modul/apps/admin-web/.../CategoryManager.tsx:484` renders *"Hidden from guests. Add an image"* on every
image-less row. Once an image is not required, that chip is **false**. Not patched.


===== F-CORE-ADMIN-DEAD-SURFACES  [Warn]
TITLE: refunds, a report and an export that cannot be reached
plan.md loc: plan.md:31949
FILE REFS (resolved at the tips):
  order-service.ts                                           ABSENT :94
  orders.vue                                                 fe-suffix :222
  dinehome.vue                                               fe-suffix :388
QUOTED TOKENS (occurrence counts at the tips):
  _orderService.Refund                           fe=0    be=1    ['Controllers/OrdersController.cs']
  order-service.ts:94                            fe=0    be=0    []
  pages/                                         fe=141  be=23   ['nuxt.config.js']
  components/                                    fe=305  be=12   ['jest.config.js']
  /admin/dinehome                                fe=4    be=0    ['lanes/L-LOGINMODAL-MOUNTED-ONCE/mutate.py']
  navGroups                                      fe=3    be=2    ['test/admin-nav-access.test.js']
  orders.vue:222-234                             fe=0    be=0    []
  orders.vue:751-756                             fe=0    be=0    []
  adminStores                                    fe=12   be=6    ['test/kitchen-and-board-resume-after-login.test.js']
  dinehome.vue:388-401                           fe=0    be=0    []
  0001-01-01                                     fe=7    be=1    ['test/workforce-me-self-requests.test.js']
BODY:
- clears when: each surface is either reachable from a navigation entry or removed, and the plan records which
- owner: @sven

Three separate reachability gaps in the core admin, found in one survey:
- **`_orderService.Refund` (`order-service.ts:94`) has zero callers** in `pages/` or `components/`. Refunds
  exist only through the POS refund modal and the Dintero terminal page — **not from the order history a
  venue would actually look at.**
- **`/admin/dinehome` is an orphan**: no `navGroups` entry and **zero links repo-wide**. A whole punctuality
  report reachable only by typing the URL. *(Ironically it is the one page whose sign-in handler is complete.)*
- **The order export is a dead end above 20 pages**: `orders.vue:222-234` replaces the download options with a
  warning, so **the largest result sets — the ones worth exporting — cannot be exported at all.**
Also recorded, smaller: `orders.vue:751-756` leaves `adminStores` empty after an in-page sign-in, so the store
filter never renders for that session; `dinehome.vue:388-401` is the one date function that does not guard the
`0001-01-01` sentinel, and it is the **default sort key**, so nonsense rows dominate the ordering.


===== F-CORE-DISCOVERY-PREFERS-THE-SHARED-CHECKOUT  [Warn]
TITLE: a lane editing core can be served somebody else's copy
plan.md loc: plan.md:28804
FILE REFS (resolved at the tips):
  test/e2e/support/core-checkout.js                          fe-exact :74
QUOTED TOKENS (occurrence counts at the tips):
  L-WORKTREE-BASENAME-PIN                        fe=0    be=0    []
  test/e2e/support/core-checkout.js:74-75        fe=0    be=0    []
  Web-modules                                    fe=78   be=15   ['test/journey-artifact-store.test.js']
  core                                           fe=229  be=168  ['nuxt.config.js']
  reuseExistingServer                            fe=11   be=0    ['playwright.config.js']
BODY:
- clears when: core discovery prefers the calling worktree's own copy, shown by a lane in its own worktree resolving core to its own tree
- owner: @sven

**Found by `L-WORKTREE-BASENAME-PIN` beside the defect it was sent for, and deliberately not fixed.**
`test/e2e/support/core-checkout.js:74-75` ranks a directory named **`Web-modules` ahead of all others**
when locating `core` — **including ahead of the calling lane's own worktree.**
**So a lane that edits `core` can be silently served the shared checkout's copy**, and test against code it
did not write while believing it tested its own.
**It fails nothing, which is why nobody has reported it in a night of seven lanes hitting adjacent traps.**
That is the same family as `reuseExistingServer` adopting a foreign fixture on port 4010, and as a health
probe answering `200` for a world whose database is gone: **the harness quietly substitutes something that
works for the thing you asked for.**
**Left alone on purpose, and the reasoning is right:** changing a discovery preference **touches every lane
at once**, and there are seven live. That is a change to make deliberately, in a quiet window, not as a
side effect of a test-assertion fix.
**Ranked below its siblings only because `core` edits are rarer than journey runs** — but it is the one of
the three that would corrupt a *build* rather than a *measurement*.


===== F-CORE-PIN-ON-NO-REMOTE  [Blocker]
TITLE: a fresh clone cannot check out its own dependency
plan.md loc: plan.md:28448
QUOTED TOKENS (occurrence counts at the tips):
  L-TIER-ARTIFACTS                               fe=0    be=0    []
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  core                                           fe=229  be=168  ['nuxt.config.js']
  1bcab0b6                                       fe=0    be=0    []
  lane/core-ore-label                            fe=0    be=0    []
  github.com/Okam-AS/Core.git                    fe=2    be=3    ['.gitmodules']
  F-COMMIT-TREE-LEAVES-NO-REF                    fe=0    be=0    []
BODY:
- clears when: the commit feature/restaurant-modules pins for core is reachable from a remote ref, shown by git branch -r --contains naming at least one
- cleared by: L-CANNOT-BE-REBUILT-CENSUS
- owner: @sven

**Found by `L-TIER-ARTIFACTS` and verified independently by the clerk before recording.**
`feature/restaurant-modules` pins the `core` submodule at **`1bcab0b6`**. Inside the submodule checkout,
`git branch -r --contains 1bcab0b6` returns **nothing**; `git branch -a --contains` returns exactly one
ref, the **local, unpushed** `lane/core-ore-label`. The remote is `github.com/Okam-AS/Core.git`.
**So a fresh clone of this branch cannot check out its own dependency, cannot build, and cannot test.**
Everyone working today is fine only because the object already sits in one worktree's submodule gitdir.
**It is one `git gc` from unrecoverable**, and it is the same family as the dangling commits recorded under
`F-COMMIT-TREE-LEAVES-NO-REF` — work that exists while nothing durable holds it — except that this one is
depended on by the whole branch rather than by one lane.
**This is Sven's because the remedy is a push**, and pushing is his alone. Either `lane/core-ore-label`
goes to the remote, or the branch is repinned to a commit that is already there.
**A second finding from the same lane, worth keeping beside it:** an unpopulated submodule **hid 36 tests**
behind a healthy-looking `112 suites, 4 failed` total. That is why the lane's two receipts differ by 36
tests at identical source — and why a receipt taken in a fresh worktree cannot be compared with one taken
in a populated checkout unless both say which they were.
**The cost is now measured, and it is a silent one, 2026-08-05.** A fresh worktree without
`git -c protocol.file.allow=always submodule update --init core` loses **five suites at load time — including
all four money suites** — and the full run then reports **2547 tests instead of 2729**.
**It does not report an error. It reports a smaller green.** 182 tests vanish from the denominator and the run
still reads as passing. A lane that measured its baseline in such a worktree would compare a 2547-test run
against a 2754-test run and conclude something about its own change.
**That is the same shape as the archived-test inflation, inverted.** One put 29 superseded assertions **into**
the count; this takes 182 real ones **out**. Both leave a green nobody has reason to question, which is why the
remedy in each case is to read what the runner collected rather than what it reported.


===== F-CORE-SUBMODULE-CANNOT-BE-INITIALISED-NORMALLY  [Warn]
TITLE: a fresh worktree cannot init the core submodule; the pinned commit is in no shared modules dir
plan.md loc: plan.md:33238
BODY:
- clears when: git submodule update --init core succeeds in a fresh worktree at the trunk, or the recipe for fetching the pinned sha is recorded where the next person will read it
- owner: @sven


===== F-CORS-EXPOSURE-REVERT  [Warn]
TITLE: landing the CORS lane silently narrows the download headers
plan.md loc: plan.md:7567
FILE REFS (resolved at the tips):
  Program.cs                                                 be-exact
QUOTED TOKENS (occurrence counts at the tips):
  2a052800                                       fe=0    be=0    []
  AddCors                                        fe=0    be=1    ['Program.cs']
  AddOkamCors                                    fe=0    be=0    []
  WithExposedHeaders("ETag")                     fe=0    be=0    []
  BrowserReadableHeaders.All                     fe=1    be=3    ['lanes/L-WF-KODEOVERSIKT-UI/evidence.md']
  lane/cors-credentialed-origin                  fe=0    be=0    []
  Program.cs                                     fe=31   be=88   ['test/world-stamp-windows.test.js']
  DownloadHeaderWireTests                        fe=0    be=8    ['WebApi.Tests/Wire/MealsDownloadHeaderWireTests.cs']
BODY:
- clears when: the merged AddOkamCors default policy exposes BrowserReadableHeaders.All, asserted by the download header wire tests at the integration tip
- cleared by: L-CORS-CREDENTIALED-ORIGIN
- owner: @sven

**A collision that did not exist when the CORS lane was cut. Found by the integration-branch audit
reading both sides at the tip.**
`2a052800` moves the inline `AddCors` block into an `AddOkamCors` extension — and that extension
**hardcodes `WithExposedHeaders("ETag")`**. Since that commit was written, the pdf family changed the
same line at the tip to `BrowserReadableHeaders.All`.
So landing `lane/cors-credentialed-origin` produces a modify/delete conflict on `Program.cs`, and
**resolving it to the extension as written silently reverts the download exposure** — the browser stops
seeing the headers the download work exists to expose.
**The tier would catch it** — `DownloadHeaderWireTests` asserts response headers — which is exactly why
it is worth naming now rather than discovering it as a red nobody expected. A conflict resolved toward
the incoming side is the ordinary, reasonable move here, and it is the wrong one.
The change for whoever lands it: use `BrowserReadableHeaders.All` on the default policy inside the
extension, and decide separately whether the named guest policy needs the same exposure.


===== F-CORS-ORIGINS-BY-INDEX  [Warn]
TITLE: the allowed-origin list is overridden by position, not by value
plan.md loc: plan.md:7482
FILE REFS (resolved at the tips):
  appsettings.json                                           be-exact
QUOTED TOKENS (occurrence counts at the tips):
  L-CORS-CREDENTIALED-ORIGIN                     fe=0    be=1    ['lanes/L-GROWTH-FAMILY-LAND/merge-receipt.md']
BODY:
- clears when: the deployed configuration is shown to carry the production origins with no localhost entry, measured on the resolved options object rather than on a settings file
- cleared by: L-CORS-CREDENTIALED-ORIGIN
- owner: @sven

**Named by `L-CORS-CREDENTIALED-ORIGIN` as residue, and it is the kind of configuration defect that reads
as correct in every file you would open.**
**.NET configuration overrides arrays by index.** So in Development the base entry `https://www.okam.no`
is not extended by the environment file — it is **shadowed** by `http://localhost:3000` at position 0.
The consequence to hold on to: **"www is listed in appsettings.json" does not mean "www is allowed in
dev".** Anyone reading the base file to answer "which origins are permitted" gets the wrong answer, and
the file they read is not wrong — the merge rule is.
The other direction is the one that matters at go-live: **production must never inherit the localhost
origins.** A credentialed surface whose allow-list contains `http://localhost:3000` in production is a
credentialed surface trusting anything on the operator's machine.
Harmless today because the surface is not deployed. The clear condition is deliberately written against
the **resolved options object**, not against a settings file, because reading the file is exactly the
mistake this flag records.


===== F-CREDITNOTE-BEFORE-RENDER  [Warn]
TITLE: a renderer outage leaves a real credit note behind a refusal
plan.md loc: plan.md:23796
BODY:
- clears when: a credit note is not committed before the document that evidences it can be produced, or the surface says a credit note exists that could not be rendered
- owner: @sven

**The row is written and committed before the render is attempted.** So when the renderer is down, the
caller gets a refusal **and a real credit note has already been created** — with nothing on any surface
saying so.
Pinned as it behaves rather than changed, which was right: **the ordering is a product decision about
whether a credit note exists before its document does**, and that is not a lane's call.


===== F-CROSS-REPO-EVIDENCE-UNVERIFIABLE  [Warn]
TITLE: a backend lane's evidence cannot satisfy its own exit
plan.md loc: plan.md:28037
FILE REFS (resolved at the tips):
  lanes/L-HOSTED-SERVICE-FLOOR/mutation-log.md               fe-basename
  /OkamAPI-hostedfloor/lanes/.../mutation-log.md             fe-basename
QUOTED TOKENS (occurrence counts at the tips):
  L-HOSTED-SERVICE-FLOOR                         fe=0    be=0    []
  lane/hosted-service-floor                      fe=0    be=0    []
  lanes/L-HOSTED-SERVICE-FLOOR/mutation-log.md   fe=0    be=0    []
  ../OkamAPI-hostedfloor/lanes/.../mutation-log. fe=0    be=0    []
  F-CLERK-EXITS-NAME-NO-INSTRUMENT               fe=0    be=0    []
BODY:
- clears when: a lane whose evidence lives in the backend repo can be verified against it, either by exits naming the path relative to the plan root or by the clerk resolving cross-repo paths
- owner: @sven

**Measured 2026-08-04 by trying both forms on `L-HOSTED-SERVICE-FLOOR`.** Its evidence is real, committed
on `lane/hosted-service-floor`, and sits at `lanes/L-HOSTED-SERVICE-FLOOR/mutation-log.md` **inside the
backend repository**. The plan root is the frontend repository. So:
- `lanes/L-HOSTED-SERVICE-FLOOR/mutation-log.md` → *evidence path does not exist* (it does not, from here).
- `../OkamAPI-hostedfloor/lanes/.../mutation-log.md` → *exit does not name it* (correctly — the exit names
  the other form).
**Both refusals are right, and together they make the lane unverifiable.** The work is finished,
reviewed and its conditions applied; only the pointer cannot be made admissible.
**The exit is left as written rather than rewritten to fit**, because rewriting an already-reported exit so
the evidence passes is editing the test until it passes — the same standing refusal recorded on
`F-CLERK-EXITS-NAME-NO-INSTRUMENT`. The forward-only remedy is that a backend lane's exit names its
evidence **relative to the plan root**, the way the existing backend probes already do.


===== F-DEAD-WORLD-ANSWERS-HEALTHY  [Warn]
TITLE: a health probe passes against a world whose database is gone
plan.md loc: plan.md:28625
QUOTED TOKENS (occurrence counts at the tips):
  L-WF-PIVOT-DEFECTS                             fe=0    be=0    []
  :5951                                          fe=12   be=0    ['playwright.config.js']
  :5952                                          fe=4    be=0    ['lanes/L-LIVE-WORLD-STAFF/live-world-run.txt']
  /health                                        fe=45   be=15   ['playwright.config.js']
  :3961                                          fe=10   be=0    ['lanes/L-LIVE-WORLD-RESTORE/01-workforce-flag-lever.live.json']
  :5961                                          fe=13   be=0    ['test/journey-artifact-store.test.js']
  :3904                                          fe=0    be=0    []
  lsof                                           fe=11   be=1    ['test/world-stamp-windows.test.js']
BODY:
- clears when: a health probe fails when its database is absent, shown by an arm that removes the container and expects a non-200
- owner: @sven

**Found by `L-WF-PIVOT-DEFECTS` while choosing a port, and it is worse than the stale-fixture trap.**
`:5951` and `:5952` **answer `/health` with 200 while their SQL containers no longer exist.** They are dead
worlds that still look alive to a probe.
**Why this outranks the fixture trap recorded above.** A careful lane checks health precisely to establish
that a world is real before trusting it — so this defeats the check that was supposed to catch the other
problem. A lane that does everything right, probes before running, and gets `200 Healthy` can still be
talking to nothing.
**It sits beside a second orphan of the older kind:** a dev server still holding `:3961`, which pairs with
`:5961` and **would have served pre-fix code** to anyone who took the default. The finding lane bound
`:3904` instead and left both orphans alone.
**The cheap fix is in the probe, not in the ports:** a health endpoint that reports healthy without touching
its database is reporting that the process is up, which is not the question anybody is asking it. Until
that changes, the working practice is the one lanes have converged on tonight — `lsof` before binding, own
ports, and **check what the world actually answers rather than that it answers.**


===== F-DELIVERY-TOGGLES-FAIL-SILENTLY  [Blocker]
TITLE: four call sites announced success over a refusal
plan.md loc: plan.md:31876
FILE REFS (resolved at the tips):
  delivery.vue                                               fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  updateToggle                                   fe=1    be=0    ['pages/admin/delivery.vue']
  deliveryEnabledChange                          fe=2    be=0    ['test/delivery-save-failure.test.js']
  changeDeliveryType                             fe=8    be=0    ['test/delivery-save-failure.test.js']
  saveChanges                                    fe=13   be=1    ['test/delivery-save-failure.test.js']
  Promise.all                                    fe=32   be=1    ['test/delivery-save-failure.test.js']
  checked=false                                  fe=0    be=0    []
  selfPickUp=true                                fe=0    be=0    []
  false                                          fe=619  be=938  ['nuxt.config.js']
  StoreService                                   fe=32   be=24   ['test/training-disclosure.test.js']
  delivery.vue                                   fe=10   be=0    ['test/delivery-save-failure.test.js']
  150.5                                          fe=9    be=1    ['test/delivery-save-failure.test.js']
  hasDeliveryAddressChanges                      fe=2    be=0    ['test/delivery-save-failure.test.js']
  /stores                                        fe=142  be=173  ['nuxt.config.js']
BODY:
- clears when: a refused delivery write reports the refusal and re-reads the store, shown by a red arm against the shipped page
- cleared by: L-SETTINGS-SAVES-REPORT-FAILURE
- owner: @sven

**Worse than raised: four call sites, not one.** `updateToggle` was the one on record; `deliveryEnabledChange`,
`changeDeliveryType` and `saveChanges` each fire **two or three writes under `Promise.all`, drop every returned
boolean, and announce success over a refusal.**
**Measured against the shipped page: 12 of 21 arms red.** The switch read `checked=false` while the server
still held `selfPickUp=true`, no notification appeared, and the store was re-read once rather than twice.
**The `false` return is demonstrated, not assumed** — one arm drives the real `StoreService` through a faked
http module and shows a **204** and an **unparseable 200 body** both resolving `false` without throwing.
**The arm worth reading**: a refused Wolt switch lands own-driving **off** and Wolt **on-refused**, leaving the
venue with **no home delivery at all** — a third state the page never showed, having announced *"changed to
Wolt"*.
**Both halves were needed.** Reporting the failure while leaving the switch flipped still leaves the screen
lying, so the fix throws on a falsy write **and** re-reads, falling back to the last known server store if the
re-read itself fails. Switches snap back to the server; forms keep the operator's draft but keep Save on
screen, so a form never reads as saved.
**The rounding defect reproduces, and the reason a second reader could not see it is now known.** A store on
15050 øre offers Save with nothing edited, and pressing it posts 15000 — but **nothing in this repository
creates such a store**: `delivery.vue` is the only writer and always sends kroner × 100, so it needs an outside
writer. **The asymmetry is keyboard-reachable regardless**: the field is free text, `150.5` parses to 15000,
equals stored, Save never appears, and the operator is left looking at `150.5` over a stored `150`.
**A third instance needed no outside writer at all**: `hasDeliveryAddressChanges` compared raw store fields
against locals normalised with `|| ""`, so a **null city stayed permanently dirty** and Save posted the address.
**One residual left open rather than quietly defaulted**: a store whose minimum genuinely holds øre now
displays floored kroner without being permanently dirty, so the `.50` is invisible. Showing it honestly needs
the two-input kroner/øre control the delivery-method editor already uses **in the same file** — a money-path
change the lane judged out of scope, an


===== F-DEMO-ACT5-CLAIM-NO-LONGER-REPRODUCES  [Warn]
TITLE: the demo's fifth act asserts a drift that the current renderer does not produce
plan.md loc: plan.md:33037
BODY:
- clears when: ACT 5 measures a claim that reproduces against plan render --html, or the act is retired with the reason recorded
- owner: @sven


===== F-DEPLOY-NEEDS-FOUR-APP-SETTINGS-FIRST  [Blocker]
TITLE: the App Service will refuse to start without them
plan.md loc: plan.md:32917
FILE REFS (resolved at the tips):
  appsettings.Development.json                               be-exact
QUOTED TOKENS (occurrence counts at the tips):
  AppSettings__Secret                            fe=0    be=0    []
  AppSettings__PowerUserVerificationCode         fe=1    be=0    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  ExternalApi__EddaOrdersApiKey                  fe=0    be=0    []
  DocumentRenderer__FunctionKey                  fe=0    be=0    []
  appsettings.Development.json                   fe=4    be=8    ['test/e2e/scripts/live-world.sh']
BODY:
- clears when: the four keys exist as app settings in every deployed environment, checked before the branch carrying the guard is deployed
- owner: @sven

**This is a config-before-deploy dependency created deliberately, and it must not be discovered at deploy time.**
Once the credentials-from-config work lands, the App Service **refuses to start** unless all four exist:
`AppSettings__Secret`, `AppSettings__PowerUserVerificationCode`, `ExternalApi__EddaOrdersApiKey`,
`DocumentRenderer__FunctionKey`.
**That refusal is the point** — a silent fallback to a committed literal is the defect being fixed, and the
estate's own precedent is the fiscal-journal guard that throws outside Development with a written reason.
**Nothing breaks today**: the demo scripts, the owner's live world, the wire tier and CI are all unaffected,
because the two inbound credentials moved to `appsettings.Development.json`, which no deployed environment
loads.
**One trap closed in advance**: the guard **rejects the committed `"Set in Azure…"` placeholder spelling**, so
an operator who copies it into an app setting does not satisfy the check.


===== F-DETACHED-MIGRATIONS  [Blocker]
TITLE: two migrations exist on no branch
plan.md loc: plan.md:26502
QUOTED TOKENS (occurrence counts at the tips):
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  lane/train-w3-schema                           fe=0    be=1    ['artifacts/tests/1de069061c08b8e86755d16a884da72f0aa725ec/RUN.md']
  20260731220005                                 fe=0    be=5    ['Migrations/20260801084923_Margin_PeriodStatementFinalizedImmutable.cs']
  make-the-tip-reachable                         fe=0    be=0    []
BODY:
- clears when: the migration chain tip is reachable from feature/restaurant-modules, so a lane branching from the branch cannot fork it
- cleared by: L-MIG-STACK-LAND
- owner: @sven
- blocks: S-PILOT-SAFE

Found by the next migration author, who checked instead of assuming. The Margin statement-freeze trigger
and the publication-uniqueness index were committed to a **detached head in a worktree, belonging to no
branch**. Authoring from `feature/restaurant-modules` would have forked the chain three ways — and the
538/538 SQL baseline everyone is measuring against exists only at that unreachable commit.
That lane merged the detached tip into its own branch to proceed, so the work is now carried by
`lane/train-w3-schema` and lands with it.
**Confirmed by review, 2026-08-01, from the object store rather than the account.** The branch ends at
`20260731220005`; the two newer migrations exist only at a detached commit. The W3 lane's Designer
parent is genuinely the real tip, and the fork range it skipped carries no migration and one
comment-only entity change. The waste lane has since seeded correctly from that tip and moved on, so
nothing is ambiguous — but **until the W3 lane lands, its own HEAD is the only valid Designer parent**
for any new migration. Until those commits are on the branch, **any lane that
authors a migration from the branch tip forks the chain**, and the failure shows only on a fresh
database.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `make-the-tip-reachable`.**


===== F-DEV-BUILD-POINTS-AT-PRODUCTION  [Blocker]
TITLE: a local dev server talks to the live API unless told otherwise
plan.md loc: plan.md:31998
FILE REFS (resolved at the tips):
  nuxt.config.js                                             fe-exact :45
  dintero.vue                                                fe-suffix
  surfboard.vue                                              fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  nuxt.config.js:45                              fe=0    be=0    []
  API_BASE_URL                                   fe=46   be=11   ['nuxt.config.js']
  dintero.vue                                    fe=5    be=3    ['nuxt.config.js']
  surfboard.vue                                  fe=5    be=3    ['test/store-config-full-replace.test.js']
BODY:
- clears when: a dev build cannot reach the production API without an explicit opt-in, shown by a default that fails closed
- cleared by: L-DEV-DEFAULT-FAILS-CLOSED
- owner: @sven

**`nuxt.config.js:45` defaults `API_BASE_URL` to the production API.** So `npm run dev` on a laptop, with no
override, is **a live client against real customer data** — and nothing on screen says so.
**This is the most dangerous thing in the estate for anybody about to click through the product**, because two
of the defects found today are **destructive on save**: `dintero.vue` wipes a store's payment configuration and
`surfboard.vue` clears its tips flag. Reproducing either against the default target changes a real venue.
**The default should fail closed.** A local build that cannot find a backend is an obvious, recoverable
problem; a local build that silently found the wrong one is not.


===== F-DEV-EXCEPTION-PAGE-ECHOES-THE-BEARER  [Blocker]
TITLE: a 500 body returns the caller's own token
plan.md loc: plan.md:32496
QUOTED TOKENS (occurrence counts at the tips):
  Development                                    fe=4    be=49   ['test/e2e/scripts/live-world.sh']
BODY:
- clears when: no error response carries request headers, in any environment reachable outside a developer's machine
- owner: @sven

**Found while seeding a deliberate payment failure.** The Vipps deposit refusal returns an **untyped HTTP 500**
rendered as the **ASP.NET developer exception page** — and that page **echoes the request headers back**, so
the response body contains the caller's `Authorization: Bearer …`.
**Two ways this bites.** A token in a response body is a token in every log, proxy and browser cache that
touches it. And the estate already knows what that costs: the Wolt secret and a live refresh token were logged
at Information level on 2026-07-30, and **the rotation, not the code fix, was the expensive part.**
**It is `Development` behaviour**, so the question that decides the severity is **which deployed environments
run with that page on**. That is the owner's to check and is why this is a blocker rather than a note.


===== F-DEV-SERVER-REUSE-PASSES-A-MUTANT  [Warn]
TITLE: a browser arm agreed with itself across a mutation
plan.md loc: plan.md:31609
BODY:
- clears when: every browser arm in this estate restarts its compiler between arms, or a run that reuses one is shown to discriminate
- owner: @sven

Caught by the lane that closed the duplicate-modal defect, in **its own first attempt**: an arm that mutated the
page under **one running dev server plus a 25-second sleep** reported a pass on a page that demonstrably had two
mount sites. The compiler had not rebuilt; the browser was reading the pre-mutation bundle.
**A sleep is not a barrier**, and this is the browser-tier analogue of every stale-artifact failure already
recorded here. The lane fixed its own harness by restarting the compiler per arm. **Nothing checks that any other
browser arm in the estate does the same**, and a mutation arm that cannot fail is worth less than no arm at all,
because it reads as proof.


===== F-DEV-SERVERS-SHARE-BUILD  [Warn]
TITLE: three dev servers share one build directory
plan.md loc: plan.md:23809
BODY:
- clears when: two live journey runs can proceed in one checkout without one deleting the other's build output
- owner: @sven

**Cost two lanes whole chain runs today, independently.** Three dev servers in this checkout share one
build directory: a sibling's recompile **deletes a template out from under a running server**, and the
bundler **caches the failure until restart.**
Worse in one direction than it looks: **the server borrows and releases the shared submodule on exit**,
which is the same hazard one step further along.
**The wrong-world guard caught it correctly every time** — zero served, non-zero exit — which is the
guard doing exactly its job on a failure it was not designed for. That is why this is a warning rather
than a blocker: **it is loud.**


===== F-DINTERO-SAVE-WIPES-PAYMENT-CONFIG  [Blocker]
TITLE: arriving and pressing Save destroys a venue's payment setup
plan.md loc: plan.md:32015
FILE REFS (resolved at the tips):
  pages/admin/dintero.vue                                    fe-exact
  dintero.vue                                                fe-suffix :560
QUOTED TOKENS (occurrence counts at the tips):
  pages/admin/dintero.vue                        fe=3    be=1    ['nuxt.config.js']
  immediate                                      fe=74   be=90   ['package-lock.json']
  storeId                                        fe=311  be=822  ['artifacts/journeys/modal-scroll-lock.playwright.json']
  dintero.vue:560-591                            fe=0    be=0    []
  :705-747                                       fe=0    be=0    []
  StoreService                                   fe=32   be=24   ['test/training-disclosure.test.js']
  undefined                                      fe=256  be=29   ['nuxt.config.js']
  JSON.stringify                                 fe=135  be=4    ['test/workforce-delivery-failures.test.js']
  GetSurfboardConfig                             fe=2    be=2    ['test/store-config-full-replace.test.js']
  dintero.vue                                    fe=5    be=3    ['nuxt.config.js']
  console.log(config)                            fe=1    be=0    ['pages/admin/dintero.vue']
  core/                                          fe=101  be=21   ['nuxt.config.js']
  Okam-AS/Core                                   fe=3    be=8    ['.gitmodules']
BODY:
- clears when: the payment settings page loads a store's existing configuration before it can be saved, shown by a test that reds when the load is skipped
- cleared by: L-DESTRUCTIVE-SAVES-LOAD-FIRST
- owner: @sven

`pages/admin/dintero.vue` **never loads the selected store's existing payment configuration on arrival.** The
watcher is not `immediate`, and the sidebar already carries the selected `storeId`, so no change event ever
fires.
**Pressing Save then posts the empty form defaults over the live record** — account id, client id and secret,
split seller, commission, Wolt fees (`dintero.vue:560-591`, `:705-747`).
**There is no unusual sequence here.** Open the page, press Save. That is the whole reproduction, and it is
what an operator does when they mean to change one field.
**Reproduced on a live loopback record, 2026-08-06: opening the page and pressing Save destroyed 14 of 17
stored fields** — account id, client id, client secret, split seller, commission, and all three Wolt fees.
Through the fixed code the same action is refused as not-loaded, and **zero fields change**.
**Fixed at the seam rather than on the two pages.** A full-replace guard is enforced inside `StoreService` —
the one door both pages must pass through — requiring that the record was read **for this id**, that the payload
carries every writable field, and that no extra keys ride along. `undefined` counts as missing, because
`JSON.stringify` drops it.
**PATCH and a server-side partial-update contract were both considered and rejected with reasons**: each needs
OkamAPI changes this lane could not land or verify, and *"absent means keep"* silently redefines what every
existing caller's omission means.
**A neighbouring cause was closed too**: `GetSurfboardConfig`'s `.catch(() => ({}))` turned a **failed read**
into blank defaults that were then saved over the record.
**C7, found and removed**: `dintero.vue` carried a `console.log(config)` that printed the client secret.
**Note for whoever lands it: `core/` is a git submodule**, so the guard lands in `Okam-AS/Core` rather than in
this repository. An estate-wide grep found no consumer of the two gated methods outside these two pages, so the
fail-closed blast radius is contained — but the change crosses a repo boundary.


===== F-DISK-PRESSURE  [Warn]
TITLE: the estate is one large build from a lane dying mid-run
plan.md loc: plan.md:26540
QUOTED TOKENS (occurrence counts at the tips):
  ENOSPC                                         fe=0    be=0    []
BODY:
- clears when: free space on the working volume is comfortably above what a full backend build plus a SQL container needs, and something reclaims it without a person remembering
- owner: @sven

A lane hit **a full disk** mid-run today — `ENOSPC` blocked even its tool harness for several minutes.
It recovered on its own and lost nothing, but the volume has almost nothing spare, with roughly 30 GiB free, and a
single backend build plus a Testcontainers SQL Server can consume a large fraction of that.
The known reclaim is documented and routine: caches plus `obj`/`bin` trees across the worktrees.
The hazard is that nobody is watching, and a lane that dies on ENOSPC mid-migration is the worst
possible moment for it.


===== F-DOCSYNC-WROTE-A-STALE-TRUTH  [Warn]
TITLE: a doc lane recorded a gap that a live sibling was closing
plan.md loc: plan.md:9071
FILE REFS (resolved at the tips):
  utils/meals/admin-client.js                                fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  L-MEALS-DOCSYNC                                fe=0    be=0    []
  utils/meals/admin-client.js                    fe=2    be=0    ['utils/meals/claim-client.js']
  L-MEALS-ENROL-UI                               fe=0    be=0    []
BODY:
- clears when: the enrolment paragraph in utils/meals/admin-client.js matches what the branch does, and the two lanes' edits to that file are reconciled in one merge
- cleared by: L-MEALS-ENROL-UI
- owner: @sven

**Both lanes behaved correctly and the collision still happened, which is the point.**
`L-MEALS-DOCSYNC` began editing `utils/meals/admin-client.js` in the shared checkout to record that
enrolment stays unbound and is *"a lane of its own"* — **while `L-MEALS-ENROL-UI`, which is that lane, was
in the same file binding it.** The enrolment lane backed its own line out, moved to an isolated worktree,
and left the shared checkout exactly as found.
**So a documentation lane wrote a true sentence that was false by the time it was saved.** Its whole
purpose was to remove text asserting facts the branch had falsified, and it produced one — not through
carelessness, but because the fact changed underneath it inside the same hour.
**That paragraph will conflict at merge**, and the conflict is the good outcome: it is visible. The
failure mode to watch for is the merge resolving it toward the doc lane's side, which would reinstate a
claim that enrolment is unbound on a branch where it is bound.
The general lesson is one this plan already carries in another direction: **a doc sweep is only as fresh
as the moment it ran**, and the lanes it describes are moving. It does not make doc sweeps wrong — it
makes them things that must land quickly or be re-measured.


===== F-DUP-DISPATCH  [Warn]
TITLE: one lane ran twice at once and the twin deleted the live worktree
plan.md loc: plan.md:22568
QUOTED TOKENS (occurrence counts at the tips):
  L-MRG-WASTE                                    fe=3    be=0    ['lanes/L-MARGIN-WASTE-SURFACE-IS-HONEST/evidence.md']
  blocked                                        fe=60   be=82   ['test/growth-newsletter-page.test.js']
  open                                           fe=426  be=685  ['vercel.json']
BODY:
- clears when: no lane can be started while an agent for that lane is still alive, or the shared-path collision is made impossible by per-lane worktree naming
- owner: @sven

**The clerk's error, recorded rather than quietly fixed.** `L-MRG-WASTE` returned `blocked`, which sets
the lane back to `open` — and `open` is startable. Its agent was still alive. On the next cycle the
clerk started the lane again, so **two agents with the same identity ran the same lane concurrently**,
one against the old brief and one against the new.
They collided on a shared worktree path: the twin finished, committed its receipt, and **deleted the
worktree out from under the run that was still using it.**
Nothing was lost — the second agent verified the twin's receipt adversarially instead of burning a
second thirty-five-minute SQL slot, and containers were attributed by name throughout, so no foreign
container was touched. But the gap is real: a `blocked` verdict returns a lane to a startable state
while its agent may still be running, and lanes may share a scratch path.
Briefs since this one say *never a shared scratch path*; the startable-while-alive half is not closed.


===== F-EF-NEVER-DECLARES-A-TRIGGER  [Blocker]
TITLE: 25 triggers, zero declarations, and every EF update to them dies
plan.md loc: plan.md:32402
FILE REFS (resolved at the tips):
  MealsStatementService.cs                                   be-suffix :168
QUOTED TOKENS (occurrence counts at the tips):
  TrainingCourseVersions                         fe=0    be=59   ['Migrations/20260729091423_Events_NotificationOutbox.Designer.cs']
  Published                                      fe=29   be=122  ['test/workforce-requests-page.test.js']
  Retired                                        fe=20   be=54   ['test/training-evidence.test.js']
  HasTrigger                                     fe=1    be=31   ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/landing-receipt.md']
  TrainingCompletions                            fe=0    be=59   ['Migrations/20260729091423_Events_NotificationOutbox.Designer.cs']
  TrainingAuditEvents                            fe=1    be=53   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  EventsStateTransitions                         fe=1    be=65   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  EventsPaymentReceipts                          fe=1    be=61   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  EventsAcceptanceReceipts                       fe=1    be=44   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  GrowthConsentTextVersions                      fe=3    be=53   ['lanes/L-A-GUEST-CAN-LEAVE-A-MAILING-LIST/evidence.md']
  GrowthSuppressions                             fe=1    be=67   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  GrowthConsentReceipts                          fe=1    be=52   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  GrowthConsentCheckReceipts                     fe=1    be=51   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  GrowthProviderEventReceipts                    fe=1    be=48   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
BODY:
- clears when: every table the chain puts a trigger on is declared to EF with HasTrigger, shown by a SQL-tier run that updates one row on each such table
- cleared by: L-EF-DECLARES-EVERY-TRIGGER
- owner: @sven

**Found by a demo seeder, not by any test — and it is a shipping blocker for six modules.**
`POST …/versions/{no}/publish` returns **HTTP 500** on SQL Server, 3 of 3 attempts:
> *"The target table `TrainingCourseVersions` of the DML statement cannot have any enabled triggers if the
> statement contains an OUTPUT clause without INTO clause."* — **Error 334**
**The trigger is not rejecting the write.** Its UPDATE branch only fires when the OLD row is already
`Published`/`Retired`; a Draft→Published transition is legal and **never reaches it**. EF emits
`UPDATE … OUTPUT` because the model never told it a trigger exists, and SQL Server refuses that
unconditionally.
**Measured estate-wide: the migration chain creates 25 triggers and `HasTrigger` appears ZERO times in the
entire backend.** Every table below is exposed wherever EF issues an UPDATE or DELETE — append-only tables that
only ever see INSERTs are unaffected, which is why so much still works:
`TrainingCourseVersions` · `TrainingCompletions` · `TrainingAuditEvents` · `EventsStateTransitions` ·
`EventsPaymentReceipts` · `EventsAcceptanceReceipts` · `GrowthConsentTextVersions` · `GrowthSuppressions` ·
`GrowthConsentReceipts` · `GrowthConsentCheckReceipts` · `GrowthProviderEventReceipts` · `MarginSalesFacts` ·
`MealsStatementLines` · `MealsFundingAllocations` · `MealsCreditAdjustments` · `MealsAuditEvents` ·
`WorkforceSchedulePublications` · `WorkforceAttendanceAdjustments` · `WorkforceClockEvents` ·
`WorkforcePersonnelListEntries` · `WorkforcePersonnelListParticipants` · `WorkforcePersonnelPresenceEvents` ·
`WorkforceIdentityCodeRegisterIssues` · `WorkforceIdempotencyRecords` · `WorkforceAuditEvents`
**Why 587 SQL-tier tests missed it.** The immutability suites exercise the triggers by **raw SQL**, or note
that *"on SQL Server the trigger would roll it back"* — **the EF write path was never run against SQL Server
with the migration's triggers applied.** A green tier over a path no test takes: the same reachability lesson
this estate has now paid for five times.
**It fails visibly rather than silently**, which is the one mercy: the publish button routes to an error
banner. But three of Training's endpoints are dead — publish, retire and draft edit — and the module cannot
demonstrate its central act.
**The fix is one line per table** — `entity.ToTable(tb => tb.HasTrigger("TR_…"))` — and the sweep 


===== F-EF-UNNAMED-INDEX-REPLACES  [Warn]
TITLE: an unnamed index silently reconfigures its neighbour
plan.md loc: plan.md:22734
BODY:
- clears when: no entity configuration adds an index by columns alone where another index on those columns already exists, or a check reds when one does
- owner: @sven

Found only by running, and it is the shape worth generalising: **EF keys an unnamed index by its columns.**
So adding a second index on a column that already carries one **reconfigures the existing index rather than
adding a new one.**
The failure that would have shipped: **every roster read quietly loses its index**, while the new
constraint still works and **every test still passes.** A performance defect with no red anywhere, produced
by a one-word omission — the named overload is required.
Nothing sweeps for this today, and one migration lane found it by accident.


===== F-EMPTY-GREP-READS-AS-ABSENCE  [Warn]
TITLE: a search that cannot match reports zero, and zero reads as proof
plan.md loc: plan.md:28011
QUOTED TOKENS (occurrence counts at the tips):
  L-HOSTED-SERVICE-FLOOR                         fe=0    be=0    []
  \bConfiguration\b                              fe=0    be=0    []
  \bEnvironment\b                                fe=0    be=0    []
  IConfiguration                                 fe=0    be=36   ['Program.cs']
  EnvironmentName                                fe=0    be=8    ['Program.cs']
  typeof                                         fe=154  be=261  ['package-lock.json']
BODY:
- clears when: no evidence document rests an absence claim on a search whose pattern was not itself shown to match a known-present instance
- cleared by: L-ABSENCE-CLAIMS-AUDIT
- owner: @sven

**Diagnosed by `L-HOSTED-SERVICE-FLOOR` on its own committed evidence, which is why it is worth keeping.**
Its purity claim scanned for `\bConfiguration\b` and `\bEnvironment\b`. **A word boundary cannot match
inside `IConfiguration` or `EnvironmentName`**, so the search returned nothing — and nothing was read as
*confirmation there is nothing*. The true counts are **four** config/env reads and **six** `new`
expressions, two of which run at registration time.
**The general shape: a search proves absence only if the pattern can find the thing when it is there.**
Zero hits from a pattern that cannot match is indistinguishable from zero hits from a clean file, and the
first is the more confident-looking of the two.
**The lane's own instrument already encodes the remedy**, which is the neat part: its floor names types
with `typeof` rather than strings **precisely so a rename breaks compilation instead of silently matching
nothing** — the same defect one layer up from where it then made it in prose. The cheap discipline is to
run any absence pattern against a known-present instance first, and record that it matched.
The conclusion never rested on the wrong sentence — twenty-seven runs invoking the method for real
established it independently — but the sentence was in the evidence document, and an evidence document is
read by people who will not re-run twenty-seven anything.


===== F-EV-ACCEPT-UNGATED  [Blocker]
TITLE: a guest can accept or decline with the module switched off
plan.md loc: plan.md:22866
QUOTED TOKENS (occurrence counts at the tips):
  gate-the-writes                                fe=0    be=0    []
BODY:
- clears when: the public proposal accept and decline writes refuse for a store without the Events core flag, pinned by a test that reds if the gate is removed
- cleared by: L-EV-ACCEPT-GATE
- owner: @sven
- blocks: FT-EVENTS

The core flag gates the Events **reads** — which is why the pipeline goes dark without it. It does
**not** gate the public accept and decline writes.
Those are state-changing and reachable with the flag off, so a venue that never enabled the module, or
one that turned it off, can still have its proposals accepted from the outside. The proposal service has
**no gate at all**, which contradicts the module gate's own docstring.
Found by the journey sweep and handed on rather than fixed, correctly — it is a different lane's shape
from modelling fixtures.
**Ruled 2026-08-03 (Sven): `gate-the-writes`.**
**Closed 2026-08-03, and the count was understated: three ungated writes, not two.** Events has five
anonymous routes. **All three writes were ungated** — enquiry creation, proposal accept, proposal decline —
and the deposit page was the only gated anonymous route. The proposal service carried **no module gate at
all**, and the amendment service carries none either, so the accept route had *two* ungated write paths.
The gate went in where the token first resolves the store, and **before the status switch**, so it covers
the idempotent replay and the amendment branch too. The refusal reuses the code the guest page already
renders, so there is no unhandled failure where a refusal belongs.
Its non-vacuity is the shape worth copying: each refusal sits beside a success on **the same token, same
world, same call**, differing in exactly one variable — and it pins the **exact** error code, so a subject
that was merely expired would fail the test rather than satisfy it.
It also pinned the thing that made this possible: the gate is an **optional constructor parameter**, which
is itself the failure mode — an unsupplied one silently does nothing while a hand-injected suite still
passes. A wiring test now resolves the service from the real composition root and pins that the gate
arrived.


===== F-EV-ACCEPT-UNNAMED  [Warn]
TITLE: the server accepts a proposal from nobody
plan.md loc: plan.md:26491
BODY:
- clears when: the accept route refuses an acceptance carrying no name and no contact address, or the omission is ruled acceptable and the reason recorded
- owner: @sven

The guest page requires a typed name and e-mail; **the server does not.** So the evidence row that
answers "who agreed to this" can be written with neither, and the receipt prints "not stated" rather
than a person. The whole value of the acceptance record is that it names someone, and the only thing
enforcing that today is a form.


===== F-EV-CALLBACK  [Blocker]
TITLE: one lost deposit callback releases the guest's authorized hold
plan.md loc: plan.md:26040
QUOTED TOKENS (occurrence counts at the tips):
  sweep-captures-not-releases                    fe=0    be=0    []
BODY:
- clears when: a test proves that a deposit authorized at the provider whose callback never arrives is captured and promoted by the expiry sweep rather than released
- cleared by: L-EV-CALLBACK-SWEEP
- owner: @sven
- blocks: FT-EVENTS

The guest deposit page never polls and never consults the provider; the Vipps callback ACKs 200 whether
or not promotion happened; the sweep then releases at expiry. The guest approved, the venue loses the
booking, and no instrument retries. Found by review on 2026-07-30, reasoned from code and not yet
reproduced against a running sweep.
**Ruled 2026-08-03 (Sven): `sweep-captures-not-releases`.**
**Corrected 2026-08-03, and this flag must be corrected rather than cleared.** The sweep **does not release
the guest's hold** — it consults the rail and, on an authorized deposit, replays the missing delivery into
the completion sink. That landed on 2026-07-31, **two days before the ruling that dispatched a lane at
it**, and it is an ancestor of the tip.
**The lane did not stop at reading, because "already fixed" is a claim a green suite can fake.** It ran the
mutation both ways over the existing suite: remove the provider consultation and eight tests red including
the headline; capture unconditionally and two red, because lapsed deposits stop expiring. **Neither flipped
default survives**, so the sweep is shown to discriminate rather than to have had its default changed.
**The other two clauses are still true, and true by design.** The page never polls and the callback still
acknowledges regardless — under the ruling that is correct, because **the sweep is the retry.** So clearing
this flag would be as wrong as leaving it: it would read as three open defects or as none.
One asymmetry it declined to smooth over: the unconditional-capture mutation produces no unauthorized
capture, because the completion sink refuses one independently. Defence in depth, and it means **the
sweep's own guard is pinned only through the sink's.**


===== F-EV-CONCURRENCY-GUARD-UNTESTED  [Blocker]
TITLE: the settlement's optimistic concurrency check is inert at the only tier that runs
plan.md loc: plan.md:27679
QUOTED TOKENS (occurrence counts at the tips):
  null                                           fe=610  be=1670 ['nuxt.config.js']
BODY:
- clears when: a settlement mutation is proven to refuse a stale revision on SQL Server, or the plan records that the guard is deployment-only and untested
- cleared by: L-EV-CONCURRENCY-REFUSES-A-STALE-REVISION
- owner: @sven
- blocks: FT-GROWTH

Surfaced while mapping the Events settlement truth seams. **Under SQLite the settlement revision is `null`
and the if-match guard goes lenient — it does not raise its refusal at all.** Under SQL Server it is a
rowversion every mutation must echo.
**The container-free tier is the only tier that has run**, and a test asserts the null explicitly. So every
settlement mutation's concurrency control — **the thing that stops two operators overwriting each other on a
money document** — is exercised nowhere.
This is not a defect in the guard; it is a guard nothing has ever pressed. It belongs with the SQL-tier debt
rather than with the Events module, and it is a second reason the one run at the merged stack matters.


===== F-EV-FAKE-DRIFT  [Warn]
TITLE: the Events deposit fake cannot represent a provider-refunded state
plan.md loc: plan.md:26072
BODY:
- clears when: one contract suite is passed by both the fake port and the real adapter, and a pin refuses any provider state the real adapter cannot emit
- owner: @sven

The same shape already shipped once as a defect: no Vipps deposit could be promoted because the fake
returned a state the real adapter never returns. The refusal logic reads a refunded amount the fake
hardcodes to zero, so every sweep and late-success test involving a refund exercises a state the real
rail does not produce.


===== F-EV-GUESTLINK-FORK  [Blocker]
TITLE: two composers for one guest address, and git cannot see it
plan.md loc: plan.md:27060
FILE REFS (resolved at the tips):
  Helpers/Events/EventsGuestLink.cs                          ABSENT
  EventsGuestLinks.cs                                        ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  Helpers/Events/EventsGuestLink.cs              fe=0    be=0    []
  EventsGuestLinks.cs                            fe=0    be=0    []
  F-MEALS-CORS-DOUBLE-LAND                       fe=0    be=0    []
  lane/ev-vipps-fallback-2                       fe=0    be=0    []
  fc09be1d                                       fe=0    be=0    []
  PublicBaseUrlMalformed                         fe=0    be=1    ['Services/Events/EventsEmailNotificationDelivery.cs']
  EventsNotificationOutbox.LastError             fe=0    be=1    ['Services/Events/Interfaces/IEventsNotificationDelivery.cs']
  file:///                                       fe=0    be=2    ['WebApi.Tests/Margin/MarginEhfInvoiceParserTests.cs']
  lane/ev-uri-relative                           fe=0    be=0    []
  6a7bf75b                                       fe=0    be=0    []
  CredentialCompositionSweepTests                fe=1    be=3    ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  lane/ev-vipps-fallback                         fe=0    be=0    []
  9e3a607b                                       fe=0    be=0    []
  "/events/"                                     fe=0    be=5    ['WebApi.Tests/Wire/ErrorBodyHeaderEchoWireTests.cs']
BODY:
- clears when: exactly one guest-link composer exists in the tree and every caller reads it
- cleared by: L-GUESTLINK-ONE-COMPOSER
- owner: @sven
- blocks: FT-EVENTS

Found by a sibling lane reading across worktrees, **while the forking work was still uncommitted** — which
is the only window in which it was cheap.
One lane committed `Helpers/Events/EventsGuestLink.cs`, **singular**. Another was about to commit
`EventsGuestLinks.cs`, **plural**, with an incompatible design: one throws, the other returns a fault enum.
**The half git catches is the harmless half.** The duplicated method name conflicts and someone resolves
it. **The composer does not** — different filenames, no conflict, both land, both compile, and the estate
carries two answers to *where does a guest come back to* until a guest returns to the wrong one.
The existing helper's **own docstring says it exists to prevent exactly this drift.**
Second instance today of two commits making one fix in different places, after `F-MEALS-CORS-DOUBLE-LAND`.
The pattern is now clear enough to name: **a lane that cannot see its siblings will re-solve a solved
problem under a name nobody is watching.**
**Swept and ruled, 2026-08-04. The premise was stale and the instinct was right.** `EventsGuestLinks.cs`
**was never written** — not on any of **315 refs**, not in **33 worktrees** including untracked files, not
in either stash, not in any dangling commit. Five independent proofs, plus a second sweep run blind that
reproduced every finding.
**The fork is real and sits inside one branch.** `lane/ev-vipps-fallback-2` (`fc09be1d`) points the Vipps
adapter at the helper — which validates the scheme and **throws** — while leaving the outbox mail path
composing the same guest URL **inline**, accepting a relative origin and returning the fault enum
`PublicBaseUrlMalformed`. **"One throws, the other returns a fault" was exact** as a description of behaviour;
it describes helper-versus-inline rather than file-versus-file.
**Two corrections from the lane that closed it, 2026-08-06.** `PublicBaseUrlMalformed` is a **string label
persisted to `EventsNotificationOutbox.LastError`, not a C# enum** — the behaviour holds, the type does not.
**And the inline shape was worse than "accepts a relative origin".** `new Uri(origin + path, UriKind.Absolute)`
**does not reject a relative origin on Unix** — it yields `file:///`, so the malformed branch was **dead for the
ordinary typo** rather than merely lenient about it.
**The composer already existed six times over**, byte-identical (`sha 97110b7c`) on three unmerged branches and
t


===== F-EV-HEALTHDATA  [Warn]
TITLE: a guest's health statement persists in three places with no anonymisation
plan.md loc: plan.md:26333
BODY:
- clears when: the anonymisation reaches the event record, every issued run-sheet item and the guest notes, and the verbatim-disclosure ruling is recorded
- owner: @sven

Raised by review, because the enlargement was recorded only in a lane's return and a gap remembered
only in a return will be lost. A dietary or allergen statement becomes special-category personal data
the moment it names a condition, and it now lives in the event row, in the body of every run sheet ever
issued, and in guest-authored notes. No anonymisation code exists anywhere in the estate.


===== F-EV-INQUIRY-UNGATED  [Blocker]
TITLE: a guest can create an event for a venue that cannot see it
plan.md loc: plan.md:22903
BODY:
- clears when: the public enquiry write refuses for a store without the Events core flag, or the plan records that a public enquiry is deliberately reachable for any store and why
- owner: @sven
- blocks: FT-EVENTS

Found by the lane that gated accept and decline, and **deliberately left for a ruling rather than fixed**,
which was the right call.
The public enquiry write is ungated. A guest can create an event row for a store whose admin surface
answers 404 — **a confirmation for a booking the venue can never see.**
The reason it is a decision rather than a defect: **the enquiry form is plausibly how a venue discovers the
module at all.** Refusing it may close the front door on the thing that sells it. Whether the answer is
*refuse the write* or *the form should not be reachable for an un-opted store* is a product call.
The same lane left the payment callback alone on purpose and said why: gating it would strand in-flight
money, and that posture is already documented against the deposits surface — unlike accept and decline,
which had nothing recorded against them at all.


===== F-EV-NO-GUEST-ORIGIN  [Blocker]
TITLE: no configuration says where the guest deposit page lives
plan.md loc: plan.md:23052
QUOTED TOKENS (occurrence counts at the tips):
  decide-the-host-now                            fe=0    be=0    []
  reopen_when                                    fe=1    be=0    ['lanes/L-MRG-EHF-SPIKE/DETAIL.md']
  D-PREFCENTRE-DEPLOY                            fe=3    be=0    ['test/e2e/journeys/growth-guest-exit-cross-origin.spec.js']
BODY:
- clears when: a committed configuration sets the guest origin for Events, or a recorded ruling says which host serves those pages
- cleared by: L-EV-GUEST-ORIGIN
- owner: @sven
- blocks: FT-EVENTS

Found while checking why the deposit initiate carries no return URL. **The return URL cannot be composed
because nothing says where to return to.** The Events public origin is unset in **every committed
configuration** — the settings file holds only the dispatch switch, and the development file has no Events
section at all — and **the setting's own doc comment records that which origin serves those pages remains
Sven's decision.**
Two consequences the lane drew out. The guest cannot be returned after paying. And **the guest could not
have been mailed the link in the first place**, because the same origin composes it.
This is the same shape as the Growth preference centre's origin problem, and answering one carelessly
answers the other by accident.
**Ruled 2026-08-03 (Sven): `decide-the-host-now`.**
**Corrected 2026-08-03: "the only caller that sets a fallback is checkout" was one call site short.**
Three production call sites reach the Vipps initiate and **two** set a fallback — both composing the
checkout path. Right about the destination, wrong about the count.
**And the non-vacuity number is the finding.** Mutating the service's fallback assignment to null reds
**exactly one test out of 4392** on the whole container-free tier — the new one. Every fake-based test
stays green. So this was never only an Events gap: **checkout's own fallback had never been covered at the
serialization hop either.** The load-bearing test drives the real service over a captured HTTP edge and
asserts the serialized JSON, because the deposit fake and the scripted service both accept the call
happily — which is why no suite could see it.
**Two corrections to my brief, from the lane that closed it.**
**Overstated:** I wrote that Vipps *requires* the fallback. That could not be confirmed from the published
spec. What is confirmed: Vipps **validates** the field and it is the post-payment redirect target. So the
honest statement is **the guest has no way back**, not *the provider refuses*.
**Understated:** Vipps **rejects a localhost fallback**, which constrains what the development value can
be — recorded in the setting's own doc comment rather than left to be rediscovered.
The ruling is pinned as **a relationship rather than a literal**: the guest origin must share a registrable
domain with the committed public base URL, so it reopens exactly where the ruling's `reopen_when` says it



===== F-EV-REFUND-LINE-UNREACHABLE  [Warn]
TITLE: a settlement line kind no request can create
plan.md loc: plan.md:27697
BODY:
- clears when: the refund line kind is reachable through a route, or it is removed from the enum
- owner: @sven

Measured while mapping the same seams: the line-add route **refuses everything except invoice and adjustment
kinds**, and nothing else generates a refund line. **The enum member exists and no path can produce it.**
Small, and worth recording because the estate has already spent a lane discovering that a typed refusal code
was unreachable for a similar reason: an enum that names a state the product cannot reach reads to the next
author as a supported case.


===== F-EVENTS-ACCEPTOR-CODE-IS-A-PINNED-PUBLIC-CONTRACT  [Warn]
TITLE: a new problem code entered a registry Core clients pin, with no downstream owner
plan.md loc: plan.md:33032
FILE REFS (resolved at the tips):
  events-service.ts                                          ABSENT
BODY:
- clears when: Core events-service.ts carries EVENTS_ACCEPTOR_REQUIRED, or the registry records that clients need not pin it
- owner: @sven


===== F-EVENTS-DELIVERY-CANNOT-BE-PROVEN-ON-ANY-WORLD-HERE  [Blocker]
TITLE: the SMTP password is the appsettings placeholder, so every Events delivery attempt dies at the TLS handshake
plan.md loc: plan.md:33343
BODY:
- clears when: one Events guest link is delivered end to end on a world an agent can reach, or the delivery path is recorded as unprovable locally with what a proof would require
- owner: @sven


===== F-EVENTS-DISPATCH-HAS-NO-SCREEN  [Blocker]
TITLE: the one module switch a venue needs and cannot reach, with ten guest links queued behind it
plan.md loc: plan.md:33188
BODY:
- clears when: an operator can release queued guest dispatches for a store from a screen, shown by a walk that flips it and sees the queue drain
- owner: @sven


===== F-EVENTS-OUTBOX-FOURTH-ANSWER  [Warn]
TITLE: a month-old unmerged lane answers the guest-origin question again
plan.md loc: plan.md:27558
BODY:
- clears when: the older outbox lane is recorded as superseded, or its fix is carried into the coordinated trio
- owner: @sven

A fourth answer to the guest-origin question sits unmerged from 2026-07-30, and **git confirms it is not
equivalent to anything on the tip.** Its own message: *a misconfigured origin no longer throws away every
queued guest link.*
**The coordinated trio that settled this question never mentions it** — and it touches the very outbox test
file another lane rewrote this evening, so it is a second collision axis as well as a fourth answer.
It needs a **superseded-or-lost ruling** before the trio lands, which is the same shape as a decision
already taken once in this family.


===== F-EVENTS-SPACE-CANNOT-BE-ATTACHED  [Warn]
TITLE: every run sheet says "no space assigned"
plan.md loc: plan.md:32513
QUOTED TOKENS (occurrence counts at the tips):
  spaceId                                        fe=0    be=4    ['artifacts/journeys/ev-dietary/run-sheet.json']
  EventsManualCreateRequest                      fe=0    be=7    ['WebApi.Tests/Events/EventsSettingsSurfaceTests.cs']
BODY:
- clears when: an event created through the enquiry path can be given a space, shown by a run sheet naming one
- owner: @sven

Both venue spaces exist and **nothing can attach one to an event that was not hand-created.** `spaceId` is
settable only on `EventsManualCreateRequest`; the inquiry body, the proposal body, the dietary write and the
run-sheet generate have no such field, and **there is no event-update route at all.**
So the spaces settings screen is **write-only decoration** for every event that arrives the way real events
arrive — through the public enquiry form. Ten seeded events, ten run sheets, every one reading *"No space
assigned."*


===== F-EVENTS-VIPPS-REFUSAL-IS-UNTYPED  [Warn]
TITLE: the page cannot key its toast on the error it was built for
plan.md loc: plan.md:32527
FILE REFS (resolved at the tips):
  EventsDepositPaymentPortAdapter.cs                         be-suffix :131
  EventsDepositService.cs                                    be-suffix :170
  EventsDepositsController.cs                                be-suffix :119
QUOTED TOKENS (occurrence counts at the tips):
  Failed                                         fe=81   be=376  ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  EventsDepositPaymentPortAdapter.cs:131-154     fe=0    be=1    ['lanes/L-AN-ERROR-BODY-STOPS-HANDING-BACK-THE-CALLERS-TOKEN/finding.md']
  :163                                           fe=2    be=8    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  :173                                           fe=3    be=2    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  EventsProblemException.PaymentProvider         fe=0    be=6    ['WebApi.Tests/Events/EventsDepositLostCallbackTests.cs']
  EventsDepositService.cs:170-180                fe=0    be=0    []
  EventsDepositsController.cs:119-126            fe=0    be=0    []
  EventsProblemException                         fe=3    be=58   ['test/e2e/fixture/events.js']
  EVENTS_PAYMENT_PROVIDER                        fe=6    be=7    ['test/events-page.test.js']
BODY:
- clears when: a provider failure on the Vipps rail raises the typed payment-provider problem the client already handles
- owner: @sven

**All the money rules held** — the intent was committed first, `T7` and an `Initiated` receipt filed, the
compensation ran to `Failed` with its own receipt and `T10`, and no phantom charge exists. **Only the
client-facing error type is wrong.**
`EventsDepositPaymentPortAdapter.cs:131-154` does not wrap Vipps faults, where the Stripe/Dintero branch at
`:163`/`:173` raises `EventsProblemException.PaymentProvider`. `EventsDepositService.cs:170-180` runs the
compensation then rethrows the original, and `EventsDepositsController.cs:119-126` catches only
`EventsProblemException`.
So the page cannot key its toast on `EVENTS_PAYMENT_PROVIDER` **for the one rail that is actually wired**, and
the operator gets a raw 500 instead of the refusal the product was designed to show.


===== F-EVERY-LANE-DEPENDENCY-ENDS-AT-SVEN  [Blocker]
TITLE: sixty-four open lanes, none of them ready, by construction
plan.md loc: plan.md:30521
QUOTED TOKENS (occurrence counts at the tips):
  satisfied()                                    fe=0    be=0    []
  needs                                          fe=197  be=351  ['playwright.config.js']
  accepted                                       fe=136  be=276  ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  cleared                                        fe=41   be=44   ['artifacts/journeys/workforce-invitation-list-revoke.playwright.json']
  ruled                                          fe=20   be=76   ['test/feature-flags-page.test.js']
  PLAN_ACTOR                                     fe=2    be=0    ['lanes/L-LOGINMODAL-MOUNTED-ONCE/run-browser-arm.sh']
  built-unverified                               fe=9    be=1    ['playwright.config.js']
  verified                                       fe=67   be=165  ['playwright.config.js']
  open                                           fe=426  be=685  ['vercel.json']
  L-MODAL-SEVEN                                  fe=0    be=0    []
  L-MODAL-SCROLLLOCK                             fe=0    be=0    []
  evidence                                       fe=135  be=314  ['jest.config.js']
BODY:
- clears when: some open lane is ready without an acceptance, or the plan records that lane-to-lane needs are deliberately owner-gated
- owner: @sven

**Measured on 2026-08-05, after a four-day-old return could not be merged and the reason turned out to be
structural rather than local.** `satisfied()` treats a `needs:` target as met only when a Lane is
**`accepted`**, a Flag is `cleared`, or a Decision is `ruled`. **`accepted` is the owner's alone** — the tool
refuses it whenever `PLAN_ACTOR` is set, which is exactly the lock it is meant to be.
**The counts:** 254 lanes `built-unverified`, 58 `verified`, **0 `accepted`**. Sixty-four lanes are `open`
and **none is unblocked**. Of 74 unmet dependency edges, 35 point at Lanes, 27 at Decisions and 12 at Flags —
so **roughly half of all blocking terminates in an acceptance nobody but the owner can give**, and the
Decisions add 27 more.
**This is why `ready 0` will keep appearing however much work is authored.** A lane written with any
`needs: L-…` is unreachable until an acceptance sitting, and only lanes authored with **no needs at all** can
ever dispatch while the owner is away. That is a fact about the instrument, not a complaint about it: the
gate is doing precisely what it was built to do.
**One lane is a single acceptance away** — `L-MODAL-SEVEN`, whose work has been committed on
`lane/modal-seven @ 839d377` since 2026-08-01 with its artifact, its estate test and a red probe from before
the fix, waiting on `L-MODAL-SCROLLLOCK` (state `verified`) being accepted. **Its return also predates the
bare-path rule**, so its `evidence:` line is decorated and would be refused on admissibility even after the
gate opened; that part is repairable and this one is not.
**The honest reading is that acceptance is not yet the bottleneck, and will become one.** Only one lane is
waiting on an acceptance today; 24 more are waiting on lanes that are built but unverified, which is work
this side can still do. **The queue behind the owner is short now and grows every time a lane lands.**


===== F-EVERY-LOAD-FAILURE-TELLS-THE-GUEST-THE-OFFER-EXPIRED  [Blocker]
TITLE: a network blip makes a guest ask the venue to reissue an offer that is still live
plan.md loc: plan.md:33398
FILE REFS (resolved at the tips):
  pages/offer/_code.vue                                      fe-exact
BODY:
- clears when: a load failure on pages/offer/_code.vue is distinguishable from an expired offer in what the guest is shown, pinned by a test that reds when the two are collapsed
- owner: @sven


===== F-EVERY-MAIL-DIES-AT-A-REVOCATION-CHECK-THIS-HOST-CANNOT-COMPLETE  [Blocker]
TITLE: a bare SmtpClient leaves certificate-revocation checking on, so all fourteen IEmailService callers fail at connect on such a host
plan.md loc: plan.md:33353
BODY:
- clears when: a send over the product's own transport connects on a host that cannot complete a revocation check, shown by a probe that reds against the current bare client
- owner: @sven


===== F-EVIDENCE-GITIGNORED  [Warn]
TITLE: a landed lane's cited receipt was never committed
plan.md loc: plan.md:26867
QUOTED TOKENS (occurrence counts at the tips):
  L-FE-JOURNEYS-MERGE                            fe=1    be=0    ['lanes/L-FE-WF-ONBOARD-WALK/mutation-proof.txt']
  lanes/L-FE-JOURNEYS-MERGE/*.log                fe=0    be=0    []
  *.log                                          fe=1    be=1    ['.gitignore']
  .txt                                           fe=57   be=25   ['test/login-modal-success-is-silent.test.js']
  red-when-an-evidence-path-is-ignored           fe=0    be=0    []
BODY:
- clears when: no lane's evidence pointer names a path that git ignores, and a check reds when one does
- cleared by: L-EVIDENCE-CITATIONS-RESOLVE
- owner: @sven

Found by the lane that finished `L-FE-JOURNEYS-MERGE`'s work. That lane's return cites
`lanes/L-FE-JOURNEYS-MERGE/*.log` as its evidence — and **`*.log` is gitignored, so those files were never
committed.** The pointer resolves to nothing in any clone.
It is the receipt-that-does-not-exist shape, arrived at by accident rather than by claim: the lane really
did run what it said, and wrote it to a path the repository silently discards. **Nobody checked the
extension**, and nothing in the tooling would have said so.
The lane that found it wrote its own evidence as `.txt` on purpose, which is the fix at one lane's scale.
The general fix is a check that reds when an evidence pointer names an ignored path.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `red-when-an-evidence-path-is-ignored`.**


===== F-EVIDENCE-IN-THE-TREE-DIRTIES-ITS-OWN-BUILD-ID  [Warn]
TITLE: a lane's own receipts make its build unverifiable
plan.md loc: plan.md:29820
FILE REFS (resolved at the tips):
  journey.js                                                 fe-suffix
  world-stamp.js                                             fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  +dirty                                         fe=18   be=0    ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  Web-modules@…+dirty                            fe=0    be=0    []
  lanes/                                         fe=98   be=11   ['jest.config.js']
  docs/plan/                                     fe=13   be=1    ['jest.config.js']
  lanes-archive/                                 fe=0    be=0    []
  docs/plan-old/                                 fe=0    be=0    []
  journey.js                                     fe=40   be=2    ['playwright.config.js']
  -uall                                          fe=0    be=0    []
  world-stamp.js                                 fe=10   be=0    ['test/world-stamp-windows.test.js']
BODY:
- clears when: a lane can write evidence during a run without the run's build id gaining +dirty, or the harness names which paths are excluded from the provenance check
- owner: @sven

**Caught by a lane on itself, 2026-08-05.** Its first re-capture pass printed a build id ending `+dirty` —
because **two untracked run logs had been written inside the worktree it was measuring.** Nothing was wrong
with the code, the ref or the provers; the act of recording the evidence invalidated the provenance of the
evidence.
**It is the shape this program has spent two days on, turned inward.** The instrument caught its own operator,
which is the good outcome — but only because that lane read the build id rather than the exit code.
**And it is not hypothetical for the corpus.** Two committed arm-3 receipts name `Web-modules@…+dirty`, so
**both were captured from the shared main checkout while it was dirty** — a build nobody can check out. The
convention that would have prevented it is to write evidence outside the tree under measurement, which is what
the lane switched to and which nothing writes down.
**Decided by measurement, and the convention lost.** The rule is **exclusion, narrowly**: an *untracked* path
under `lanes/` or `docs/plan/` is not a change to the build; **everything else is.** The lane argued it against
the alternative and the alternative failed on its own terms — *"write evidence outside the tree under
measurement"* in practice means **inside somebody else's tree**, which is how the shared checkout came to hold
**1,221 of its 1,356 dirty entries as bookkeeping.** Meanwhile the strict check fired on **every** run of the
correct workflow, so it had stopped separating *somebody edited code* from *somebody wrote a log*.
**Both arms, through the real prover, with the lane's own logs inside the tree they measure.** Evidence only →
a clean build id, 5 of 5 arms. One line appended to a source file, with the occurrence count asserted before the
result was trusted → **`+dirty`**. And the defect reproduced at the pristine ref first, so the before-state is
measured rather than assumed.
**Narrowness proven by four reds rather than asserted.** A **committed** receipt under `lanes/` rewritten still
says `+dirty` — this is untracked-only, not a directory exclusion, and `lanes/` holds **125 tracked files
including 25 receipts**. `lanes-archive/` and `docs/plan-old/` still say `+dirty`. Clean again after each.
**And the corpus lies stay lies, which is the point of keeping it narrow.** Applied to the shared checkout
today it reads `ignored=1221, changed=135, dirty=true


===== F-EXCHANGE-AWARD-BLOCKED-BY-A-STALE-ROW  [Warn]
TITLE: she is refused a shift because of her own superseded self
plan.md loc: plan.md:32838
QUOTED TOKENS (occurrence counts at the tips):
  WorkforceShiftExchangeService.RevalidateAwardA fe=0    be=0    []
  workforce.exchange-not-awardable               fe=1    be=1    ['utils/workforce/requests-inbox.js']
BODY:
- clears when: a worker can be awarded a shift she held only in a superseded revision, shown by a walk that reopens and re-awards one
- owner: @sven

Same family, different predicate. `WorkforceShiftExchangeService.RevalidateAwardAsync:641` filters
`State != Cancelled` **with no lineage filter**.
**Confirmed by probe**: pull a worker off a shift and reopen it, and she can ask for it back — 200 OK — but the
award **always 409s** `workforce.exchange-not-awardable`, *"the candidate already works an overlapping shift"*.
The overlapping shift is **her own row in the superseded revision.**
**Left unfixed deliberately**: it changes award admission semantics and deserves its own red-first proof rather
than riding along with a lineage sweep.


===== F-EXCHANGE-GATE-MERGE  [Warn]
TITLE: two lanes add a different flag gate to the same award, at the same anchor
plan.md loc: plan.md:6970
FILE REFS (resolved at the tips):
  EVIDENCE.md                                                be-suffix
QUOTED TOKENS (occurrence counts at the tips):
  lane/wf-exchange-award-ungated                 fe=0    be=0    []
  AwardAsync                                     fe=1    be=6    ['utils/workforce/requests-inbox.js']
  workforce.exchange                             fe=5    be=4    ['test/workforce-me-claim-outcome.test.js']
  lane/wf-exchange-move                          fe=0    be=0    []
  workforce.publication                          fe=36   be=9    ['playwright.config.js']
  EVIDENCE.md                                    fe=0    be=0    []
BODY:
- clears when: AwardAsync on the integration branch carries both the Exchange and the Publication stage gates, Exchange first
- cleared by: L-WF-EXCHANGE-AWARD-UNGATED
- owner: @sven

**A merge hazard no single lane can see, found by a reviewer reading both branches.**
`lane/wf-exchange-award-ungated` gates `AwardAsync` on `workforce.exchange`.
`lane/wf-exchange-move` gates **the same method at the same anchor** on `workforce.publication`,
because there an award mints a successor schedule revision.
The award lane's own `EVIDENCE.md` records the opposite — that the other lane's gate is *"a different
flag on a different write"*, and concludes *"a merge should be textual, not semantic"*. **Both halves
are wrong.** The insertions share an anchor and will conflict as both-added.
**The resolution is semantic, and taking either side loses a real refusal**: keep BOTH gates. An
exchange-dark store must refuse even when publication is lit, and the reverse. Order Exchange first so a
doubly-dark store names the flag that owns the surface, and merge the two comment blocks into one.
Whichever of the two lands second inherits this; it belongs in that merge brief, not in a lane's
private evidence file.


===== F-EXISTENCE-CHECKS-REPORT-PRESENT-FILES-ABSENT  [Warn]
TITLE: diagnosed: the checker treats the whole decorated evidence line as a filename
plan.md loc: plan.md:28994
FILE REFS (resolved at the tips):
  lanes/L-GR-TESTSEND-ERRORCODE/DETAIL.md                    fe-basename
QUOTED TOKENS (occurrence counts at the tips):
  ~/.claude/skills/plan-hub/bin/plan             fe=0    be=0    []
  _evidence_kind_ok                              fe=0    be=0    []
  os.path.exists                                 fe=1    be=0    ['lanes/L-LIVE-WORLD-BANNER/mutation-proof.py']
  lanes/L-GR-TESTSEND-ERRORCODE/DETAIL.md        fe=0    be=0    []
  bin/plan:8721                                  fe=0    be=0    []
  evidence                                       fe=135  be=314  ['jest.config.js']
  needs                                          fe=197  be=351  ['playwright.config.js']
  bin/plan:8719                                  fe=0    be=0    []
BODY:
- clears when: the clerk's evidence refusal distinguishes an annotated evidence string from a missing file, so no reader can take one for the other
- owner: @sven

**Diagnosed at file and line, and the clerk reproduced it before rewriting this. The cause is decoration, and
nothing else.** `~/.claude/skills/plan-hub/bin/plan`, `_evidence_kind_ok`, lines 8719–8721:
The **entire evidence string** is passed to `os.path.exists` — parentheticals, `· sha` annotations, multi-path
lists and all. Reproduced directly: `lanes/L-GR-TESTSEND-ERRORCODE/DETAIL.md` **exists**; the same path
followed by `(commit 2a3a881 on feature/restaurant-modules, local)` reports **absent**. **Zero of the 89
denial rows carries a bare path.**
**The refusals are protocol-correct, which inverts what this flag first said.** §2.4 requires evidence to be a
single existing repo path, so an annotated line genuinely is inadmissible. The figures of the form *"N exits
lack admissible evidence"* are therefore **not inflated as admissibility counts** — they were misread as
file-existence counts, by the sweep's own message wording, by the audit that quoted it, and by the clerk.
**The message is the defect, not the check.**
**Two earlier explanations are retired, including the clerk's.** The hypothesis that the checker consulted git
rather than the filesystem is refuted. So is the clerk's tracked-versus-untracked framing: the 56 / 27 / 6
split is arithmetically fine and its axis is **causally irrelevant** — 7 of the false rows are tracked and 19
are not, and decoration decides every one of them. Chasing git state was chasing a correlation.
**And two of the three sweeps this flag originally accused were already withdrawn** — one correct because it
named the tip it measured at, one because its two files were written 10 and 74 minutes after it ran.
**The remedy is one line and it is not the clerk's to make.** At `bin/plan:8721`, an evidence string containing
whitespace, `·`, `(` or `@` should be refused as *not a single bare path* rather than as a missing file,
naming the first existing token. That retires the entire misreading class at its source. **It is a change to
Sven's own tool**, outside this repository, and is recorded here rather than made.
**One consequence for every lane and every brief written from here.** An `evidence:` line must be a bare path —
a commit id or a branch name appended to it makes the evidence inadmissible, silently, with a message that
says the file is missing. The clerk has been issuing briefs whose return template invites exactly that.
**The trap fired again tonight, on a


===== F-EXIT-PREFIX-IS-A-STAMP  [Blocker]
TITLE: an exit naming a directory is satisfied by any file in it
plan.md loc: plan.md:27374
QUOTED TOKENS (occurrence counts at the tips):
  artifacts/journeys/                            fe=51   be=24   ['playwright.consumer.config.js']
  artifacts                                      fe=72   be=39   ['playwright.config.js']
  failed                                         fe=355  be=363  ['jest.config.js']
  fact                                           fe=337  be=489  ['playwright.config.js']
  L-GROWTH-MAIL                                  fe=1    be=2    ['test/e2e/journeys/growth-guest-lifecycle.spec.js']
  L-EV-DIETARY                                   fe=0    be=1    ['docs/plans/events-dietary-capture-decision.md']
  L-MEALS-STALE-TOKEN                            fe=0    be=0    []
  L-MODAL-SCROLLLOCK                             fe=0    be=0    []
  L-EV-RUNSHEET-PRINT                            fe=0    be=0    []
  L-CONFIRM-ADMIN-SURFACE                        fe=0    be=0    []
  L-EXIT-INSTRUMENT-CENSUS                       fe=0    be=0    []
  exit_tokens                                    fe=0    be=0    []
  evidence_admissible                            fe=0    be=0    []
  exists                                         fe=362  be=582  ['playwright.config.js']
BODY:
- clears when: no exit is satisfied by an artifact that does not demonstrate what the exit describes, shown by a case where a failing artifact is refused
- cleared by: L-PATH-EVIDENCE-IS-READ
- owner: @sven
- blocks: FT-GROWTH

**The twenty-first non-failing shape, and it is in the verification path itself — the worst place it could
be.** The instrument check matches on **prefix**, so an exit naming the *directory* `artifacts/journeys/`
is satisfied by **any file underneath it.**
Measured, not reasoned: a feature verifies against the bare word `artifacts`. It verifies against a modal
scroll-lock capture that has nothing to do with it. **And it verifies against an artifact whose own status
field reads `failed`** — because path evidence is never read, only `fact:` evidence gets a status check.
**All twenty-two artifacts satisfy all twenty-four such items interchangeably.**
**Six of the fifteen lanes I verified this morning rest on this.** `L-GROWTH-MAIL`, `L-EV-DIETARY`,
`L-MEALS-STALE-TOKEN`, `L-MODAL-SCROLLLOCK`, `L-EV-RUNSHEET-PRINT` and `L-CONFIRM-ADMIN-SURFACE` each name
only the directory. **The other nine name a file or a fact and are sound.** I have not un-verified the six —
that is the owner's call, and the honest record is more useful than a tidy number.
**Worse in aggregate: 109 of 149 exits name no instrument at all**, so under §6.1 nothing can ever verify
them — including, as the lane noted, its own.
**Note on the review batch verified 2026-08-03: these are the honest case, not the stamped one.** Each of
the twenty-two names **a specific committed file** — its own review document, in this repository — so the
prefix hole does not apply to them. The prefix hole is about exits naming a *directory*.
They still carry the weaker property this flag exists to name: **path evidence is never read.** The tool
confirms the file exists and is admissible; it does not confirm the document says what the exit describes.
For a review whose deliverable **is** the document, that gap is narrow. **For a journey artifact whose own
status field can read `failed`, it is not.**
**Catalogue correction, 2026-08-03: I assigned the ordinal twenty-one twice and accepted both without
noticing.** One lane claimed it for a comparison hole where a runner summarises on the error stream; this
flag claimed it for the prefix hole. **They are different shapes, so the catalogue is at least
twenty-two** — and every count I have quoted since is an undercount.
The same is true of the collision ordinals: three separate flags call themselves the *third* or *fourth*
instance of two lanes s


===== F-EXPIRY-RENDERS-EMPTY-PAGES-NOT-A-SIGN-IN  [Warn]
TITLE: the admin web ships logoutIfTokenExpired and TokenIsValid with no caller, so an expired token looks like a broken app
plan.md loc: plan.md:33158
BODY:
- clears when: an expired token in the admin web produces a sign-in prompt rather than empty pages, shown in a browser
- owner: @sven


===== F-FAILSPEC-DOES-NOT-HOLD-ITS-LANE  [Warn]
TITLE: a refuted spec is re-dispatched in the same cycle
plan.md loc: plan.md:27771
QUOTED TOKENS (occurrence counts at the tips):
  L-MRG-PAGE-TEST-VACUOUS                        fe=0    be=0    []
  fail-spec                                      fe=2    be=1    ['test/e2e/scripts/live-world-banner-check.js']
  D-SPEC-L-MRG-PAGE-TEST-VACUOUS                 fe=0    be=0    []
  blocks                                         fe=54   be=122  ['.eslintrc.js']
  needs                                          fe=197  be=351  ['playwright.config.js']
  E-NEEDS-DANGLING                               fe=0    be=0    []
BODY:
- clears when: every open D-SPEC decision's lane carries a needs: naming that decision, so no lane is dispatched against a spec it has already refuted
- owner: @sven

**Found by watching it happen, not by reading the tool.** `L-MRG-PAGE-TEST-VACUOUS` returned `fail-spec`
at 15:31; the merge appended `D-SPEC-L-MRG-PAGE-TEST-VACUOUS` with `blocks: L-MRG-PAGE-TEST-VACUOUS`; and
the very next `plan tick` **granted that lane again**.
**`blocks:` is a rendering field.** It lists dependents in the views. Readiness is gated by `needs:`, so a
`blocks:` line holds nothing. The stub the tool appends on every `fail-spec` therefore names the lane it
must hold and does not hold it — this is general, not particular to this lane.
**The cost is a wasted agent and a false signal.** A lane sent against a spec it has already refuted
re-derives the identical refusal, and the plan gains a second `fail-spec` that looks like new information.
Worse, an orchestrator declining the dispatch by hand each cycle leaves no record of why, so the next one
dispatches it.
The remedy applied here is per-lane and forward-only: add `needs: D-SPEC-<lane>` to the lane the stub
names, which releases automatically when the decision is ruled. Making the tool write that line at
`fail-spec` merge time is the general fix and is Sven's to rule, since it changes the clerk.
**A grammar trap worth recording beside it**, because it cost a cycle here: a **lane block** takes bare
comma-separated ids (`needs: L-FOO, F-BAR`), while a **RETURN block** prefixes each with `+`
(`needs: +L-FOO`). Writing the RETURN form in a lane block yields `E-NEEDS-DANGLING` naming an id that is
defined and parses correctly — the `+` travels into the lookup key, so the message points at the target
rather than at the punctuation.


===== F-FE-CI-UNGATED  [Info]
TITLE: no CI job runs the frontend suite
plan.md loc: plan.md:26033
BODY:
- clears when: fact:fe.ci is present
- cleared by: L-FE-CI
- owner: @sven


===== F-FILTER-NOT-CONTAINERFREE  [Warn]
TITLE: the suite filter everyone uses still starts SQL containers
plan.md loc: plan.md:23030
BODY:
- clears when: a filter or trait exists that provably starts no container, derived from what the tests actually use rather than from their names
- owner: @sven

The filter that excludes SQL-Server-named tests **still starts Testcontainers**, because at least one
scaffold test uses them without carrying that word in its name. A lane hit it today while running the
full suite, killed its own run immediately and touched no foreign container.
That filter is the one this plan's briefs have effectively been recommending to lanes with no container
slot. **It is not a container-free filter**, and a lane that believes it is will take a slot it was not
granted — on a host where three concurrent containers has already meant an out-of-memory kill.
The remedy is a trait derived from what a test actually uses, in the shape of the estate's existing
derived-scope convention tests, rather than a name match a new file silently escapes.
**A second instance found the same day, in a different module:** two Growth lineage classes use the SQL
fixture without carrying that word in their names either. So this is not one stray file — **the naming
convention has already failed twice**, which is the argument for deriving the trait rather than patching
the names.


===== F-FINISHED-WORK-ON-NO-REF  [Blocker]
TITLE: a whole feature, a money-path guard and a proven backend fix, none of them on a ref
plan.md loc: plan.md:30268
FILE REFS (resolved at the tips):
  utils/workforce/pos-clock-state.js                         fe-exact
  test/e2e/fixture/world.js                                  fe-exact
  api-server.js                                              fe-suffix
  support/journey.js                                         fe-suffix
  utils/cross-currency.js                                    fe-exact
  workforce-timesheets.js                                    fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  utils/workforce/pos-clock-state.js             fe=2    be=2    ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/landing-receipt.md']
  lane/growth-sql-catch-typed                    fe=0    be=0    []
  refs/salvage                                   fe=0    be=0    []
  posclk_                                        fe=6    be=0    ['test/workforce-pos-clock.test.js']
  wfclock_                                       fe=0    be=0    []
  fail-spec                                      fe=2    be=1    ['test/e2e/scripts/live-world-banner-check.js']
  refs/lanes/preservation-snapshot-unreferenced- fe=0    be=0    []
  e79348e3                                       fe=0    be=0    []
  refs/lanes                                     fe=7    be=0    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
  -uall                                          fe=0    be=0    []
  scripts/                                       fe=47   be=6    ['nuxt.config.js']
  docs/                                          fe=24   be=142  ['jest.config.js']
  dcb79b9                                        fe=0    be=0    []
  test/e2e/fixture/world.js                      fe=5    be=0    ['test/journey-rerunnability.test.js']
BODY:
- clears when: every lane whose return reports built work has that work on a ref, or each exception is recorded as deliberately discarded
- owner: @sven

**Asked on purpose after three instances were found by accident, and the answer is worse than the three.**
Across **335 returns, 141 frontend refs, 332 backend refs and 450 worktrees**:
- **An entire delivery-failures feature — 7 paths, 0 of 141 refs**, untracked in the shared checkout. Its own
  return says *"Nothing committed, nothing pushed"* **and reports a passing journey.**
- **A money-path guard on 0 refs**: `utils/workforce/pos-clock-state.js`, the named protection against **a
  clock-out flipping the till to *clocked in* with no end time.**
- **A backend fix with a five-arm mutation proof, on no ref.** `lane/growth-sql-catch-typed` resolves exactly
  to the backend tip — the clerk confirmed both sides — and the change lives only in a worktree. **The backend
  was never covered by the shared-dirt census**, so nothing had it on a list.
- **Two branches at the exact tip with no return filed at all.**
- **An empty commit in `refs/salvage` whose message claims a walked consent lifecycle** — zero paths against
  its parent, reachable from nothing, named by no return.
**And the till is worse than "on no ref" — it is two disjoint tills and the composition carries neither.**
The shared checkout's component uses 25 `posclk_` keys, a lane branch's uses 47 `wfclock_` keys, and **the
candidate has zero of either.**
**The method correction matters as much as the list.** Reading returns for reported source paths was **weak — 7
of 14 flagged were false positives.** What worked was the inverse: **every worktree file whose `(path, blob)`
is on no ref.** And the cheap tip-equality check has a real false-positive class — a branch can sit at the tip
**correctly**, because its lane returned `fail-spec`.
**Preserved, 2026-08-05, and the clerk verified the ref independently.**
`refs/lanes/preservation-snapshot-unreferenced-work` at `e79348e3`, parent the modules tip, **23 paths beyond
it** — 17 untracked and 6 tracked-and-modified — all measured **on 0 of 141 refs immediately before staging and
on 1 of 143 after**, staged by explicit pathspec. `for-each-ref --contains` across **all four namespaces**
returns exactly that one ref, and `fsck --unreachable` does not list it.
**It is deliberately not a branch.** `refs/lanes`, matching the plan snapshot's namespace and tone: the message
states the measurement, says it is a snapshot rather than a proposal, **names the authoring lane of every path**,
and says plainly that not
