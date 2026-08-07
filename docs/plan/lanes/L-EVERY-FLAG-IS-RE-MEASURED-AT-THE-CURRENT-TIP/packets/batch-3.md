

===== F-PERSONALLISTE-PRINT  [Blocker]
TITLE: the statutory sheet's print stylesheet is inert, measured
plan.md loc: plan.md:26453
QUOTED TOKENS (occurrence counts at the tips):
  L-MENU-ALLERGEN-MATRIX                         fe=0    be=0    []
  document.body                                  fe=29   be=1    ['test/modal-scroll-lock.test.js']
  adopt-scoped-css                               fe=0    be=0    []
  L-PRINT-HOST                                   fe=0    be=0    []
BODY:
- clears when: a rendered PDF of the personalliste is committed showing the sheet laid out for paper
- cleared by: L-PRINT-HOST
- owner: @sven
- blocks: FT-WORKFORCE

**Raised as *probably*; it is now measured, twice over.** `L-MENU-ALLERGEN-MATRIX` observed the guard —
a class set imperatively on `document.body` — **wiped by vue-meta in a real browser**. Then the Events
run-sheet lane, asked to copy the personalliste's pattern, copied its control and stylesheet shapes and
**deliberately refused its guard**, on the grounds that the mechanism had been measured inert. It chose
scoped CSS instead, which needs no class applied, cannot reach another admin screen, and dies on unmount.
So the § 8-5-6 sheet's print path does not work today, and the pattern it was serving as the estate's
example of has now been declined by the next lane that looked at it. Severity raised from warn: this is
the statutory document, and the flag no longer says *probably*.
Found while building a different document. The personalliste is the page an inspector is handed, and
its print rules hang off a body class that vue-meta wipes. Nobody has printed it.
**Ruled 2026-08-03 (Sven): `adopt-scoped-css`.**
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-PRINT-HOST`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiated blockers.


===== F-PERSONNEL-LIST-FLAG-IS-NOT-IN-THE-CATALOG  [Warn]
TITLE: the operator lever refuses a flag the SQL bootstrap inserts straight into the store table
plan.md loc: plan.md:33213
BODY:
- clears when: workforce.personnel-list appears in the shared flag catalog so the lever and the bootstrap agree, shown by the switchboard offering it
- owner: @sven


===== F-PGREP-WAIT-LOOP-MATCHES-ITSELF  [Warn]
TITLE: an until-not-pgrep wait loop matches its own command line and never terminates
plan.md loc: plan.md:33168
BODY:
- clears when: every wait loop in this estate's scripts and briefs uses a bracketed pattern such as [d]otnet, or waits on a pid rather than a pattern
- owner: @sven


===== F-PKILL-USED-AGAINST-A-STANDING-PROHIBITION  [Warn]
TITLE: a lane used pkill twice after being told never to, and disclosed it rather than letting it pass
plan.md loc: plan.md:33163
BODY:
- clears when: no lane brief is answered with a pattern kill, or the prohibition is restated with the kill-by-pid alternative named inline so the instrument is obvious
- owner: @sven


===== F-PLAN-NOT-IN-GIT  [Blocker]
TITLE: the plan, every return and every review exist only in one working tree
plan.md loc: plan.md:27574
FILE REFS (resolved at the tips):
  docs/plan/plan.md                                          ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  checkout                                       fe=103  be=139  ['playwright.config.js']
  /Users/svendaneel/okam/plan-backup-2026-08-03  fe=0    be=0    []
  artifacts/                                     fe=64   be=35   ['playwright.config.js']
  exists                                         fe=362  be=582  ['playwright.config.js']
  refs/lanes/plan-snapshot                       fe=0    be=0    []
  51970563                                       fe=0    be=0    []
  docs/plan                                      fe=15   be=84   ['jest.config.js']
  briefs/                                        fe=0    be=0    []
  render/                                        fe=0    be=0    []
  .gitignore                                     fe=10   be=1    ['nuxt.config.js']
  lanes/                                         fe=98   be=11   ['jest.config.js']
  docs/plan/plan.md                              fe=2    be=0    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
BODY:
- clears when: the plan directory is tracked and committed, or the plan records where its durable copy lives and what refreshes it
- cleared by: L-PLAN-LIVES-IN-GIT
- owner: @sven
- blocks: FT-GROWTH

**Measured, and I confirmed it independently before writing this: `git ls-files docs/plan` returns zero.
Not ignored — never committed.**
So the plan itself, **153 returns and all 22 review documents** exist **only in this working tree.** A
`git clean`, a bad `checkout`, or a disk loss takes the entire record of this program with it — including
the twenty-two lanes verified this evening, whose whole durability argument was that their evidence is *a
committed file in this repository.* **It is not committed.**
I had seen the untracked marker earlier today, on this very file, and did not register what it meant. That
is the miss, not the state.
**A backup now exists outside the repository at `/Users/svendaneel/okam/plan-backup-2026-08-03` — 566
files, 28 MB, taken 2026-08-03.** It is a copy, not a mechanism: nothing refreshes it, so it is already
going stale. **The durable answer is tracking the directory**, which is a commit to a shared branch and
therefore the owner's.
**Two consequences that change other work:**
`artifacts/` is **gitignored by design**, with a comment saying so — and nineteen of the twenty already
instrumented exits point into it. **So naming a journey capture is not a durability upgrade over naming a
worktree file.** The distinction this plan has been drawing between them is thinner than it reads.
**Seven of thirty-four probes are structurally inadmissible as evidence** — an `exists` extractor and the
suite-kind ones can never verify anything, by the tool's own guard. Exits pointing at those facts are
unverifiable no matter what lands.
**A durable copy now exists, 2026-08-05, and it satisfies the second arm of this condition rather than the
first.** `refs/lanes/plan-snapshot` at `51970563` carries **954 files** — the whole of `docs/plan` except the
regenerable `briefs/` and `render/` that its own `.gitignore` covers, plus the whole of `lanes/`. Verified
after writing: `docs/plan/plan.md` is in the tree, the commit is reachable from that ref, and **nothing
outside those two paths was staged**, so no sibling's uncommitted work was swept in.
**What it is and what it is not.** It is a snapshot on a lane ref, made because `git clean -nd` listed the
entire plan for removal and a single `git clean -fd` would have taken the record of every lane, every return
and every review with it. **It is not a proposal.** Nothing was pushed, no shared branch mo


===== F-PLAN-SNAPSHOT-CARRIES-A-CREDENTIAL  [Blocker]
TITLE: the docs-in-git push would publish a live value
plan.md loc: plan.md:31652
FILE REFS (resolved at the tips):
  docs/plan/returns/L-LIVE-WORLD-SEED-1.md                   ABSENT
  L-WF-ONBOARD-DEMO-RUN-1.md                                 ABSENT
  playwright.config.js                                       fe-exact
  owner-step.md                                              ABSENT
  appsettings.json                                           be-exact
  Scripts/demo/demo-common.sh                                be-exact :25
  Scripts/demo/seed-workforce-demo.sh                        be-exact :32
QUOTED TOKENS (occurrence counts at the tips):
  L-PLAN-LIVES-IN-GIT                            fe=0    be=0    []
  plan/docs-20260806                             fe=0    be=0    []
  54d4dfc                                        fe=0    be=0    []
  docs/plan/returns/L-LIVE-WORLD-SEED-1.md       fe=0    be=0    []
  L-WF-ONBOARD-DEMO-RUN-1.md                     fe=0    be=0    []
  refs/lanes/plan-snapshot                       fe=0    be=0    []
  docs/plan                                      fe=15   be=84   ['jest.config.js']
  6c4305e                                        fe=0    be=0    []
  test/e2e/**                                    fe=0    be=0    []
  playwright.config.js                           fe=17   be=0    ['playwright.consumer.config.js']
  lanes/                                         fe=98   be=11   ['jest.config.js']
  lanes/L-PLAN-LIVES-IN-GIT/fresh-clone/.git     fe=0    be=0    []
  owner-step.md                                  fe=0    be=0    []
  appsettings.json                               fe=9    be=29   ['test/e2e/scripts/live-world.sh']
BODY:
- clears when: the ref proposed for pushing carries no credential value in any reachable object, and refs/lanes/plan-snapshot is deleted rather than kept
- cleared by: L-PLAN-ARTIFACTS-ARE-SCRUBBED
- owner: @sven

**Measured 2026-08-06, and it gates an owner step already written as runnable.**
`L-PLAN-LIVES-IN-GIT` prepared `plan/docs-20260806` @ `54d4dfc` — 444 files — and recorded a one-command
`git push` for the owner. **That branch contains `docs/plan/returns/L-LIVE-WORLD-SEED-1.md` and
`L-WF-ONBOARD-DEMO-RUN-1.md`, both of which carry the power-user verification code.** So does the local snapshot
ref `refs/lanes/plan-snapshot`, which I refreshed at 14:00Z with `git add -f` over the whole directory.
**Neither ref has been pushed and neither file is on any real branch.** Nothing is published. But the prepared
step publishes it, and the whole point of that lane was to make the step one command.
**Seven untracked files in this working tree carry the value**, and the demo code appears in eight more under
`docs/plan`. **Do not `git add` any of them.** Scrub first, then rebuild both refs from the scrubbed tree — a
scrub that leaves the old objects reachable has not removed anything.
**Closed for the push ref, verified independently 2026-08-06 by scanning every reachable object rather than the
checkout.** `plan/docs-20260806` is now `6c4305e` — **451 objects, zero occurrences** of the power-user code,
the demo code or the JWT signing key. The old commit `54d4dfc` is unreachable from any ref or reflog. **The
one-command push the owner was handed is safe to run.**
**`refs/lanes/plan-snapshot` cannot be made clean here and should be deleted rather than kept.** It still holds
**133 demo-code occurrences across 5,760 objects** — the power-user code and the signing key are gone. The
survivors live in *product* ancestry (`test/e2e/**`, `playwright.config.js`, 20 tracked `lanes/` files) 309
commits deep, so scrubbing them means rewriting the repository's own history, not the plan's. That ref is
local-only and is **not** the one proposed for pushing.
**A tip-only rebuild would have removed nothing** — the snapshot ref's two parent commits already carried both
codes, so the fix had to rebuild a three-commit segment. And `lanes/L-PLAN-LIVES-IN-GIT/fresh-clone/.git` was
itself a carrier: its files read clean while its object store still held ten pre-scrub blobs.
**One correction that would have bitten the owner mid-push**: `owner-step.md` hardcoded `54d4dfc` in **both**
its pre-push verify and post-push confirm blocks. After the rebuild both would have failed — at exac


===== F-POS-403-UNREACHABLE  [Warn]
TITLE: a refusal code that no request can produce
plan.md loc: plan.md:27024
BODY:
- clears when: the operator-session refusal reaches a caller as the code its contract names, or the contract is corrected to the code that actually arrives
- owner: @sven

Measured, not argued. The typed 403 for an invalid operator session **is unreachable on both POS
endpoints**: the real resolver throws a type that is deliberately not the framework's application
exception, so middleware maps it to a bare 401 **before the controller's catch runs.**
**The service-tier fake throws the application exception instead, which is why nobody noticed** — the
tests exercise a failure the production path cannot produce. Same shape as the fixture-behind-backend
finding, one layer down.
The caller therefore gets a bare 401 with no body where the contract promises a coded 403. Which of those
is correct is a contract ruling, not a fix.


===== F-POS-CLOCK-NO-CLIENT  [Blocker]
TITLE: the whole POS clock surface has no client anywhere
plan.md loc: plan.md:26976
QUOTED TOKENS (occurrence counts at the tips):
  lane/fe-wf-oplink                              fe=0    be=0    []
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
  L-WF-PUNCH-UI                                  fe=0    be=0    []
  X-Operator-Session                             fe=8    be=29   ['test/workforce-pos-clock.test.js']
  BeginDayModal                                  fe=6    be=0    ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/fe-jest-tip.txt']
  setMode('clock')                               fe=0    be=0    []
BODY:
- clears when: a till screen consumes the clock punch and the clock-state read, or the plan records that the POS clock surface is not shipping in this edition
- cleared by: L-POS-CLOCK-CLIENT-OR-RECORDED
- owner: @sven
- blocks: S-PILOT-SAFE

Found by the lane that fixed the punch responses, **outside its own subject and larger than it.** It is
not that the new read is unconsumed — **nothing consumes the punch endpoint either.**
A grep across both frontend repositories finds exactly one workforce client, the manager route, and that
file **explicitly documents that it does not bind the POS route.** The till register screen does not exist
in any repo.
So this is not a new orphan endpoint; **it is a whole module surface with no caller**, and it is the
surface the four-weeks-of-POS-clocking market gate depends on. C3 says a capability exists only when it is
reachable — by that test the POS clock does not exist, and no green suite can see that, which is exactly
the failure mode recorded for this estate on 2026-07-29.
**Correction, 2026-08-03 — this flag is stale as world-description, hours after being raised.** A whole-set
review found a POS clock caller on `lane/fe-wf-oplink`, unpushed: an eleven-step journey whose steps six
and seven are literally *become the register at its PIN screen* and *Ola signs in with his PIN*.
So "no client anywhere" is **no longer true**. What remains true is narrower and still worth a ruling: the
client is on an unmerged branch, and its capture records a **fixture** backend — so it is not live proof,
and it is exactly the evidence class this estate spent the week learning to distrust.
It therefore becomes a merge plus one live re-capture, not a build. **Which also means the "rule it out of
this edition" arm can be deleted by building rather than by ruling** — that arm exists only while no client
does.
**A lane has now built what this `clears_when` asks for — at `L-WF-PUNCH-UI`, 2026-08-04 — but it is
unmerged, so the flag stays open.** The clearing condition reads *"a till screen consumes the clock punch
and the clock-state read"*. That screen now exists: a **"Stempling" mode inside the POS shell**, reached by
clicking the register's own top bar.
**It could not have gone anywhere else, which is itself the answer to the flag's question.**
`POST /workforce/pos/clock-events` authenticates a **device JWT plus `X-Operator-Session`**, and the POS
shell is **the only place in the app that holds one** — so "the till register screen does not exist in any
repo" was true, and the surface had exactly one possible home.
**Recorded rather than


===== F-POS-TENDER-WIRE-REINTRODUCES-TWO  [Blocker]
TITLE: eleven pre-fork heads silently re-add the credit-sale predicate
plan.md loc: plan.md:27230
FILE REFS (resolved at the tips):
  Services/Kassa/KassaCreditSale.cs                          be-exact
  PosSettlementService.cs                                    be-suffix :380
  MasterData.cs                                              ABSENT :112
QUOTED TOKENS (occurrence counts at the tips):
  21f79514                                       fe=0    be=0    []
  lane/meals-pos-tender-wire                     fe=0    be=1    ['docs/plans/PENDING-MIGRATIONS-LEDGER.md']
  Services/Kassa/KassaCreditSale.cs:25           fe=0    be=0    []
  PosSettlementService.cs:380                    fe=0    be=0    []
  :392                                           fe=2    be=2    ['lanes/L-CENSUS-CORRECTIONS/recheck-production-randomness.txt']
  2431883d                                       fe=1    be=2    ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/landing-receipt.md']
  MasterData.cs:112                              fe=0    be=1    ['lanes/L-LAND-THE-BACKEND-ON-THE-TRUNK/evidence.md']
  feature/restaurant-control-stage0              fe=2    be=18   ['test/e2e/journeys/margin-week-freeze.spec.js']
  prep/meals-w3-landing                          fe=0    be=0    []
  lane/meals-w3-fiscal                           fe=0    be=0    []
  lane/a1-store-country                          fe=0    be=0    []
  lane/a2-growth-flake                           fe=0    be=0    []
  lane/a3-tx-gate                                fe=0    be=0    []
  lane/a5-events-w4                              fe=0    be=0    []
BODY:
- clears when: every landing onto feature/restaurant-modules leaves exactly one credit-sale predicate — `git grep -lE 'bool +IsCreditSale *\(' <result-tree> -- '*.cs'` naming only Services/Kassa/KassaCreditSale.cs — and the eleven pre-fork heads based at 2431883d, for which a plain merge silently re-adds the private one, are retired unlanded or reduced to the shared predicate before any of them is landed
- owner: @sven
- blocks: FT-GROWTH

**Twice corrected, and the second correction was also incomplete. This is the measured version.**
**The lane this flag warned about should land — it already has.** `21f79514` (OkamAPI, 2026-08-04) is a real
two-parent merge of `lane/meals-pos-tender-wire` with zero conflicts; the lane is 0 ahead and 61 behind, and the
tip carries the company-account allocation branch. A throwaway merge of the utlkvit family with that lane
produced **exactly one** predicate definition — `Services/Kassa/KassaCreditSale.cs:25`, six call sites, each
passing a journal entry. **Holding it was never the right call**, and the reachability it closes is real:
`PosSettlementService.cs:380` used to throw *"Unsupported payment type"*, and at the tip `:392` authorises a
till tender with an operator actor.
**The seventh twin does not exist on any of 216 non-ancestor branches.**
**But "reintroduction fires only under a port, a cherry-pick, or a whole-file resolution" is false as a general
rule.** It holds only when a branch's merge-base already contains the predicate. Simulating **all 215
outstanding landings** onto the tip: 111 clean merges yield one definition each, 104 conflict, and **11 results
hold two.**
**For those eleven a PLAIN merge re-adds the private predicate, auto-merged, outside any marker.** They share
merge-base `2431883d` (2026-07-17), which holds **no predicate at all** — so the tip's *deletion* has nothing
to apply to while their *addition* is new content git keeps silently. The definition arrives at line 199
unshown, and the human is prompted only about the one-line call site at `MasterData.cs:112`.
The eleven, in OkamAPI: `feature/restaurant-control-stage0`, `prep/meals-w3-landing`, `lane/meals-w3-fiscal`,
`lane/a1-store-country`, `lane/a2-growth-flake`, `lane/a3-tx-gate`, `lane/a5-events-w4`, `lane/a6-meals-minors`,
`lane/b1-training-w3`, `lane/b2-wf-exchange`, `lane/b3-wf-timesheets`. None of their commits is upstream —
pre-fork heads, ported.
**A tree-keyed count says 95 and is answering the wrong question**; the count that matters is per *landing
result*.
**C4 makes this a money finding rather than a tidiness one.** The predi


===== F-POWERUSER-CODE-IS-COMMITTED  [Blocker]
TITLE: one half of the platform-admin sign-in is in the repository
plan.md loc: plan.md:31486
FILE REFS (resolved at the tips):
  appsettings.json                                           be-exact :20
  appsettings.Development.json                               be-exact
  Program.cs                                                 be-exact :52
  Controllers/UserController.cs                              be-exact :179
  Controllers/OAuthLoginController.cs                        be-exact :119
  Services/OfferProposalService.cs                           be-exact :436
  Authorization/StoreAdminAuthorizationHandler.cs            be-exact :17
  Services/UserService.cs                                    be-exact :621
  L-LIVE-WORLD-SEED-1.md                                     ABSENT
  L-WF-ONBOARD-DEMO-RUN-1.md                                 ABSENT
  Scripts/demo/demo-common.sh                                be-exact :25
  Scripts/demo/seed-workforce-demo.sh                        be-exact :32
  PowerUserRoleSeed.cs                                       be-suffix :160
  UserService.cs                                             be-suffix :442
QUOTED TOKENS (occurrence counts at the tips):
  AppSettings:PowerUserVerificationCode          fe=2    be=0    ['test/e2e/journeys/admin-refusal-worker.spec.js']
  appsettings.json:20                            fe=0    be=0    []
  AppSettings:AdminUserPhoneNumber               fe=2    be=8    ['test/e2e/journeys/admin-refusal-worker.spec.js']
  appsettings.Development.json                   fe=4    be=8    ['test/e2e/scripts/live-world.sh']
  AppSettings                                    fe=8    be=237  ['test/e2e/support/venue.js']
  Program.cs:52                                  fe=0    be=0    []
  AddEnvironmentVariables()                      fe=1    be=1    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  Program.cs:44                                  fe=0    be=0    []
  AppSettings__PowerUserVerificationCode         fe=1    be=0    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  ed09f851a                                      fe=0    be=0    []
  b0b501a5                                       fe=0    be=0    []
  Controllers/UserController.cs:179              fe=0    be=0    []
  Controllers/OAuthLoginController.cs:119        fe=0    be=0    []
  Services/OfferProposalService.cs:436           fe=0    be=0    []
BODY:
- clears when: the power-user verification code is retired everywhere it appears — appsettings, both Scripts/demo files, and the plan-hub artifacts — and the replacement is read from configuration rather than a committed file
- cleared by: L-SECRETS-READ-FROM-CONFIG
- owner: @sven

**`AppSettings:PowerUserVerificationCode` at `appsettings.json:20`** is a real, usable six-digit value.
`AppSettings:AdminUserPhoneNumber` at `:13` is a placeholder sentence, so the phone half is owner-held and the
code half is not.
**Whether deployment overrides it is not verifiable from this repository**, and that is an owner question.
Three negative checks were run: `appsettings.Development.json` carries **no `AppSettings` section at all**;
`Program.cs:52` is the single binding site; the Azure workflow sets no app settings. `AddEnvironmentVariables()`
at `Program.cs:44` means an `AppSettings__PowerUserVerificationCode` override would win if one is set.
**The line is not new — it was introduced 2023-11-26 by `ed09f851a`.** *(Corrected 2026-08-06: I had written
"last touched 2026-08-03", which is the **file's** mtime from an unrelated Events change (`b0b501a5`), and read
as though this program's own work introduced it. It is two years and eight months old, which makes rotation more
urgent, not less.)*
**Three doors, not one.** The demo/power-user credential pair short-circuits SMS verification at
`Controllers/UserController.cs:179` (minting the ~100-year JWT), `Controllers/OAuthLoginController.cs:119`
(signing an OAuth cookie identity for the MCP authorize flow) and `Services/OfferProposalService.cs:436`.
**What the door grants is why this is a blocker.** `Authorization/StoreAdminAuthorizationHandler.cs:17` succeeds
the `StoreAdminRequirement` for **any** `Store` resource on `IsInRole(PowerUserRole)`, with **no store scoping** —
read across the whole 27-line file. Beyond that bypass there are **72** `[Authorize(Roles = PowerUserRole)]`
attributes in the non-test tree. And `Services/UserService.cs:621` sets `Expires` to **+36500 days**, so a token
obtained through this door **never expires**.
**The value is NOT withheld, and I said it was.** *(Corrected 2026-08-06.)* It appears in **seven untracked files
of this working tree, two of them under `docs/plan/returns/`** — `L-LIVE-WORLD-SEED-1.md` and
`L-WF-ONBOARD-DEMO-RUN-1.md` — and it is **committed in OkamAPI** at `Scripts/demo/demo-common.sh:25` and
`Scripts/demo/seed-workforce-demo.sh:32`. **A rotation that changes only `appsettings.json` is not a rotation.**
See `F-PLAN-SNAPSHOT-CARRIES-A-CREDENTIAL` — those untracked files


===== F-PREF-UNREACHABLE  [Warn]
TITLE: the preference centre cannot open a session from the deployed origins
plan.md loc: plan.md:25978
QUOTED TOKENS (occurrence counts at the tips):
  D-PREF-ORIGIN                                  fe=1    be=0    ['test/e2e/journeys/growth-guest-lifecycle.spec.js']
BODY:
- clears when: fact:growth.prefcentre.cors is present and fact:growth.cookie.crosssite is present
- cleared by: L-GROWTH-PREFCENTRE
- owner: @sven

Both facts go green only under the named-policy option. If `D-PREF-ORIGIN` rules for the same-origin
proxy the fix leaves no code trace here, and this flag has to be cleared by the owner against the
capture instead.


===== F-PRIVATE-INDEX-COMMIT-CAN-BUILD-AN-UNRUN-TREE  [Warn]
TITLE: the clerk's own commit recipe has a failure mode
plan.md loc: plan.md:28830
QUOTED TOKENS (occurrence counts at the tips):
  L-WF-TIMESHEET-UI                              fe=0    be=0    []
  GIT_INDEX_FILE                                 fe=1    be=0    ['lanes/L-XZ-NEGATED-ABSENCE/mutation-log.md']
  lanes/L-WF-TIMESHEET-UI/shared-edits/          fe=0    be=0    []
  workforce-delivery                             fe=10   be=0    ['test/workforce-delivery-failures.test.js']
  workforce-publications                         fe=6    be=0    ['test/admin-nav-access.test.js']
  training-evidence                              fe=7    be=0    ['test/training-evidence.test.js']
  workforce-roles                                fe=10   be=0    ['test/workforce-roles-page.test.js']
  F-LANE-COMMITS-CARRY-SIBLING-HUNKS             fe=0    be=0    []
BODY:
- clears when: a lane committing from the shared checkout can show that the tree it committed is a tree somebody actually ran
- owner: @sven

**`L-WF-TIMESHEET-UI` attempted the recipe the clerk has prescribed to every lane tonight — a private
`GIT_INDEX_FILE` seeded from `read-tree HEAD` plus its own hunks — and rejected it on evidence.** Two
measurements, in order:
- **At `-U3`, a sibling's nav entry merged into its diff hunk and rode along.** The standalone run caught
  it because the resulting tree **offered a sidebar link to a page that tree did not contain.**
- **At `-U0`, the anchors themselves turned out to be sibling work**, so there was no context to cut at.
**The deeper objection is the one that matters, and it applies to every lane that followed the recipe
tonight.** Every suite and every journey were verified **against the working tree**. A synthetic
`HEAD + mine` tree is therefore **a tree nobody has run** — so committing it produces a branch whose green
was measured somewhere else. **The recipe protects the shared checkout and quietly weakens the evidence.**
**What that lane did instead**: committed only files that are **wholly its own**, and recorded the nine
shared edits exactly, in `lanes/L-WF-TIMESHEET-UI/shared-edits/` — **translations as re-runnable guarded
scripts rather than as a diff.** That keeps the commit a tree somebody ran, and makes the shared half
replayable instead of asserted.
**Context for why this bit here and not earlier:** four sibling pages — `workforce-delivery`,
`workforce-publications`, `training-evidence`, `workforce-roles` — are **absent from HEAD**, all unlanded,
so this lane's nav, i18n and pin edits interleave with four other lanes' at once. **The recipe degrades as
the shared checkout diverges**, and it has diverged all evening.
**This does not repeal the recipe** — it is still right that no lane may `checkout -b` in a tree six others
are live in, and `F-LANE-COMMITS-CARRY-SIBLING-HUNKS` still stands. **What it repeals is the assumption
that the resulting commit is evidence.** Both flags now point the same way: **at landing time, take paths
and re-run — never trust a branch's recorded green.**


===== F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH  [Blocker]
TITLE: the backend probes read whatever branch a sibling last checked out
plan.md loc: plan.md:31333
QUOTED TOKENS (occurrence counts at the tips):
  ../OkamAPI-modules                             fe=2    be=0    ['test/margin-coverage-waste-absent.test.js']
  lane/meals-grace-pins                          fe=6    be=6    ['test/e2e/journeys/margin-week-freeze.spec.js']
  34c6c103                                       fe=3    be=2    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  F-BACKEND-FACTS-OFF-BRANCH                     fe=0    be=0    []
  EnableCors                                     fe=0    be=0    []
  AllowCredentials                               fe=2    be=0    ['utils/growth/growth-guest-client.js']
  2a052800                                       fe=0    be=0    []
BODY:
- clears when: every backend probe reads a tree whose branch this plan names, shown by a probe that reds when that tree is on any other ref
- cleared by: L-PROBE-DIR-IS-PINNED
- owner: @sven
- blocks: L-TRIPLETEX-CLAIM-OUTLIVES-ITS-CALL

**Measured 2026-08-06: `../OkamAPI-modules` — the `dir` every backend probe and several lanes read — is
checked out on `lane/meals-grace-pins` at `34c6c103`.** A sibling lane's branch.
**This is `F-BACKEND-FACTS-OFF-BRANCH` one level worse than that flag records.** It is not that the checkout
is four commits behind integration; it is that **which branch it is on is not a property this plan controls**,
and it changes whenever another lane checks something out there. Every backend fact is therefore a
measurement of an arbitrary ref, and it can go from true to false with nothing in the plan having changed.
**It also produced a wrong conclusion today**, which is how it was found: a lane read that tree, saw no
`EnableCors` and no `AllowCredentials`, and reported the preference-centre CORS fact as **mis-probed**. The
probe is correct. The work is on `2a052800` and the tree was simply somewhere else.


===== F-PROBE-ROOT-WRONG-WORLD  [Blocker]
TITLE: the checkouts the facts are read from are not the world the plan declares
plan.md loc: plan.md:26633
FILE REFS (resolved at the tips):
  Services/Growth/GrowthPrivacyObligation.cs                 be-exact
  GrowthPrivacyRequestService.cs                             be-suffix
QUOTED TOKENS (occurrence counts at the tips):
  ../OkamAPI-modules                             fe=2    be=0    ['test/margin-coverage-waste-absent.test.js']
  lane/meals-grace-pins                          fe=6    be=6    ['test/e2e/journeys/margin-week-freeze.spec.js']
  ../ConsumerWeb                                 fe=3    be=2    ['playwright.consumer.config.js']
  feature/swiss                                  fe=4    be=5    ['test/e2e/scripts/consumer-dev-server.js']
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  Services/Growth/GrowthPrivacyObligation.cs     fe=0    be=0    []
  GrowthPrivacyRequestService.cs                 fe=0    be=2    ['docs/plans/PROOF-BENCHMARKS.md']
  unknown                                        fe=315  be=233  ['test/workforce-delivery-failures.test.js']
  D-CONSUMERWEB-WORLD                            fe=0    be=0    []
  already-guarded                                fe=0    be=0    []
BODY:
- clears when: every sibling checkout a probe reads is on the branch this plan declares as its world, and a mechanism says so without being asked
- cleared by: L-PROBE-DROP-CONSUMERWEB
- owner: @sven
- blocks: S-EVIDENCE

Found by the agent designing the drift guardrails, while surveying what already existed. It is not a
hypothetical the design needed — it is **true right now, on this machine.**
`../OkamAPI-modules` — the checkout that **nineteen** probes read — is on `lane/meals-grace-pins`.
`../ConsumerWeb`, which the twentieth reads, is on `feature/swiss`. The plan's declared world is
`feature/restaurant-modules`, and only Web-modules itself is standing in it.
The backend checkout is **not a descendant of the declared world**: four landed commits are missing from
it and one unmerged lane commit is in it. Two of the missing four are the article 12 deadline moving to
the wire, and they change `Services/Growth/GrowthPrivacyObligation.cs` and
`GrowthPrivacyRequestService.cs` — files this plan has facts about.
**The reason this is the worst shape available is that it produces green, not red.** Retain-and-mark
protects the plan against a probe source that is *absent*. Nothing protects it against a source that is
*present and foreign*. Twenty facts as of this writing read `ok`, and the honest state of nineteen of them is
unknown.
The design's own count said fourteen. It is twenty.
**Live, re-measured on every `plan refresh`:**
This repo is on <!--fact fe.world.branch 2026-08-06T15:52Z ok-->feature/restaurant-modules<!--/fact-->, conforming:
<!--fact fe.world 2026-08-06T15:52Z ok-->True<!--/fact-->. The backend checkout that nineteen
probes read is on <!--fact be.world.branch 2026-08-06T15:52Z ok-->lane/meals-grace-pins<!--/fact-->, conforming:
<!--fact be.world 2026-08-06T15:52Z ok-->False<!--/fact-->, and it is missing
<!--fact be.world.behind 2026-08-06T15:52Z ok-->4<!--/fact--> commits this branch has.
`../ConsumerWeb`, which the twentieth reads, conforms:
the world file read `unknown` on purpose,
because **nobody has ruled which ConsumerWeb branch this plan reads from**, and filling the expected
value in with whatever the checkout happens to be on is how a guard is made to pass by definition.
See `D-CONSUMERWEB-WORLD`.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `already-guarded`.**
**Correction, 2026-08-04 — this block's own counts are stale, and the sentence that scolds an undercount is
now itself one.** The prose above says "nineteen probes", "the twentieth", and *"The design's own count said
fourteen. It 


===== F-PROD-BEARER-COMMITTED-IN-BRUNO  [Blocker]
TITLE: a production admin token is in the repository
plan.md loc: plan.md:32901
QUOTED TOKENS (occurrence counts at the tips):
  PowerUserRole                                  fe=3    be=83   ['test/e2e/journeys/admin-refusal-worker.spec.js']
  AppSettings:Secret                             fe=0    be=10   ['WebApi.Tests/Wire/MealsDownloadHeaderWireTests.cs']
  F-JWT-SIGNING-KEY-COMMITTED                    fe=0    be=0    []
  .json                                          fe=104  be=102  ['nuxt.config.js']
  .bru                                           fe=2    be=1    ['test/delivery-minimum-ore.test.js']
BODY:
- clears when: no committed file carries a bearer token, and the key that signs them is rotated
- owner: @sven

`Bruno/Okam API/environments/OKAM - prod.bru` commits a **production `PowerUserRole` bearer token**, minted with
`AppSettings:Secret`.
**The token expired 2026-06-22. The key that signs a fresh one has not been rotated** — and that key is itself
committed (`F-JWT-SIGNING-KEY-COMMITTED`). So the expiry buys nothing: anyone holding the repository can mint a
replacement.
**Found only because a fifth copy of another credential turned up in the same directory.** A `.cs`/`.json`/`.sh`
sweep walks straight past `.bru`, which is how both survived every previous search.


===== F-PROD-BEARER-IS-SCRIPT-READABLE  [Blocker]
TITLE: the wildcard is safe for cookies and unsafe for headers
plan.md loc: plan.md:31234
FILE REFS (resolved at the tips):
  plan.md                                                    ABSENT :10232
  StoresController.cs                                        be-suffix :1199
  ExternalMenuController.cs                                  be-suffix :34
  Program.cs                                                 be-exact :71
  Helpers/ServiceCollectionExtensions.cs                     be-exact :73
QUOTED TOKENS (occurrence counts at the tips):
  plan.md:10232                                  fe=0    be=0    []
  AllowAnyHeader()                               fe=1    be=2    ['test/e2e/fixture/api-server.js']
  [Authorize]                                    fe=9    be=106  ['test/meals-claim-page.test.js']
  X-Okam-ApiKey                                  fe=0    be=2    ['Bruno/Okam API/stores/stores-{storeId}-orders.bru']
  StoresController.cs:1199                       fe=0    be=0    []
  X-API-Key                                      fe=0    be=5    ['Bruno/Wolt/Wolt Marketplace Integrations/Webhooks (Testing)/Test Auth Code Webhook.bru']
  ExternalMenuController.cs:34                   fe=0    be=0    []
  __Host-OkamOAuthLogin                          fe=0    be=2    ['lanes/L-AN-ERROR-BODY-STOPS-HANDING-BACK-THE-CALLERS-TOKEN/environments.md']
  SameSite=Lax                                   fe=0    be=0    []
  /oauth/authorize                               fe=1    be=6    ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  /mcp                                           fe=1    be=13   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  origin/master                                  fe=1    be=2    ['lanes/L-THE-GUEST-EXIT-IS-FINISHED/evidence.md']
  6c0b3a19                                       fe=0    be=0    []
  Program.cs:71-77                               fe=0    be=0    []
BODY:
- clears when: a cross-origin script cannot read a response to a header-authenticated request against the deployed API, checked from outside this machine
- cleared by: L-CORS-NARROW-THE-DEFAULT
- owner: @sven

**This refutes the plan's own standing justification for leaving the wildcard alone** — *"a bearer-token API
where nothing rides on ambient credentials"*, at `plan.md:10232`. **True for cookies. False for headers.**
`AllowAnyHeader()` **echoes** the requested headers rather than emitting `*`. The Fetch spec's carve-out — a
literal `*` never covers `Authorization` — would have blocked cross-origin bearer calls by accident. **The
echo defeats it by name**: `ACRH: authorization` comes back as
`access-control-allow-headers: authorization,content-type` beside `access-control-allow-origin: *`.
An author-set header is not a CORS "credential", so **three header-borne credentials are script-readable from
any origin today**, not on preference-centre day: `Authorization: Bearer` on every `[Authorize]` route,
`X-Okam-ApiKey` (`StoresController.cs:1199`) and `X-API-Key` (`ExternalMenuController.cs:34`).
**The cookie half is genuinely closed and was measured, not assumed**: the only cookie on the deployed API,
`__Host-OkamOAuthLogin`, is `SameSite=Lax` and read only by `/oauth/authorize` navigations; `/mcp` is
correctly scoped and its live preflight returns no CORS headers at all.
**Three disagreements between the branch and production, each of which would misdirect a fixer:**
production runs `origin/master` (`6c0b3a19`), where the wildcard is `Program.cs:71-77`. **The claim that this
shape exists on no other branch is FALSE — refuted by review 2026-08-06.** The identical permissive default is on
`feature/restaurant-modules` @ `8e2b57de` at `Program.cs:96-103` (`AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()`
at `:100-102`, same ordering defect: `UseCors()` `:284` before `UseAuthentication()` `:305`) and on
`lane/cors-followups` @ `17c12c20` at `Helpers/ServiceCollectionExtensions.cs:73-78`. `AddOkamCors` returns **zero**
hits on the integration branch, and `lane/cors-followups` — described as the fix — adds a *named*
`GrowthGuestCorsPolicy` at `:94-100` while leaving the wildcard default untouched. **So this plan's
`Program.cs:97-102` citation is the integration branch's own range and points at the defect, not at a correct file.**
**The fix must land on master AND the integration branch**: merge-base `30dc54ae`, master +1, integration +507,
neither an ancestor of the other — a master-only fix is reverted the day those commits merge, and it will not
conflict


===== F-PROD-CORS-WILDCARD  [Blocker]
TITLE: the live API answers every origin
plan.md loc: plan.md:26933
QUOTED TOKENS (occurrence counts at the tips):
  api.okam.no                                    fe=2    be=17   ['test/journey-artifact-store.test.js']
  AllowAnyOrigin                                 fe=6    be=5    ['test/e2e/journeys/growth-guest-lifecycle.spec.js']
  lane/growth-prefcentre                         fe=0    be=0    []
  F-POS-CLOCK-NO-CLIENT                          fe=0    be=0    []
  D-PREFCENTRE-DEPLOY                            fe=3    be=0    ['test/e2e/journeys/growth-guest-exit-cross-origin.spec.js']
  okam.no/preferences/communications             fe=1    be=1    ['pages/preferences/communications.vue']
BODY:
- clears when: the deployed API answers a preflight with a named origin rather than a wildcard, checked against the live host
- cleared by: L-CORS-WILDCARD-MEASURED
- owner: @sven
- blocks: S-PILOT-SAFE

Measured against the **live** host, not against this branch: `api.okam.no` answers a preflight with
`access-control-allow-origin: *`. **That is a production defect, not a branch one**, and it is why this
flag is separate from the preference-centre lane that found it.
The default policy is `AllowAnyOrigin` applied globally. It is survivable only because no credentialed
cross-origin call succeeds against it today — the browser refuses the combination — which is the same
accident that made the preference centre unreachable rather than exploitable.
The fix exists and is built on `lane/growth-prefcentre`: a named policy carrying explicit origins,
mutation-proven so that deleting one attribute reds exactly three tests with the wildcard in the diff. It
reaches production when that branch does.
**This flag and `F-POS-CLOCK-NO-CLIENT` are the only two open blockers with no recorded ruling** — every
other one in the set was ruled on 2026-08-03, so the work outstanding across the rest is execution rather
than decision.
This one has a further property that puts it above the others: **its only route to being fixed runs through
`D-PREFCENTRE-DEPLOY`.** The named policy that closes it is built and mutation-proven on an unmerged
branch, and it reaches the live host only when that branch is deployed. Nothing an agent can do closes a
production defect on a host nothing has ever deployed to.
**Re-measured against the live host 2026-08-03, read-only: still true.** The preflight answers a wildcard
origin with no credentialed grant, and `okam.no/preferences/communications` still answers 404. The fix is
built and mutation-proven on an unmerged branch — deleting one attribute reproduces the production symptom
verbatim in the diff — and it reaches production only when that branch is deployed.
**One honest limit the lane stated rather than papered over:** the wire tier **cannot discriminate the
cookie's same-site property**, because every request runs on one loopback host, which is same-site by
construction. What it proves is that the cookie is strict, that it is **the only difference between
authorised and not**, and that the two committed hosts stand in the relationship the ruling turns on. The
browser capture needs the deploy.
**And it caught a credential leak in its own work before committing it:** a mutation first failed by
printing the entire session cookie — a working cred


===== F-PROD-STORES-APIKEY-HARDCODED  [Blocker]
TITLE: a GUID API key is compiled into the source and guards anonymous order reads
plan.md loc: plan.md:31215
FILE REFS (resolved at the tips):
  StoresController.cs                                        be-suffix :1207
  Program.cs                                                 be-exact :210
QUOTED TOKENS (occurrence counts at the tips):
  StoresController.cs:1207                       fe=0    be=0    []
  X-Okam-ApiKey                                  fe=0    be=2    ['Bruno/Okam API/stores/stores-{storeId}-orders.bru']
  [AllowAnonymous]                               fe=7    be=50   ['test/e2e/fixture/events.js']
  :1192                                          fe=0    be=0    []
  :1199                                          fe=0    be=0    []
  :1213                                          fe=0    be=0    []
  [Authorize]                                    fe=9    be=106  ['test/meals-claim-page.test.js']
  :1208                                          fe=0    be=0    []
  UseCors                                        fe=0    be=1    ['Program.cs']
  Program.cs:210                                 fe=0    be=0    []
  UseAuthentication                              fe=0    be=1    ['Program.cs']
  :222                                           fe=4    be=1    ['lanes/L-DI-COLLECTION-SILENT/census.md']
BODY:
- clears when: the key is rotated and the new value is read from configuration rather than from a committed literal, and the routes it guards no longer answer anonymously
- cleared by: L-SECRETS-READ-FROM-CONFIG
- owner: @sven

`StoresController.cs:1207` compares an incoming `X-Okam-ApiKey` against a **GUID literal in the source** — the
`[AllowAnonymous]` opt-out at `:1192`, the header read at `:1199`, the allow-list `{ 52, 53, 54, 57 }` at `:1213`.
The class is `[Authorize]` at `:30`, so the opt-out is deliberate and the GUID is the sole guard. Those are **real
stores, not fixtures**. *(Line corrected 2026-08-06 from `:1208`, which is the opening brace.)*
**The value is deliberately withheld from every artifact this plan carries**, per C7 and per the lesson the
estate paid on 2026-07-30: redacting a message without rotating the credential fixes nothing and makes the
exposure harder to find later. **The owner action is rotation**; consolidating or hiding it is not.
Compounded by the CORS default: `UseCors` at `Program.cs:210` precedes `UseAuthentication` at `:222`, so the
route's own **401 carries `access-control-allow-origin: *`** — measured, without sending a credential.


===== F-PROOF-HARNESS-NOT-THE-GUARD  [Info]
TITLE: a failing proof is not evidence the guard is wrong
plan.md loc: plan.md:8541
FILE REFS (resolved at the tips):
  arm-N.sh                                                   ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  L-LIVE-WORLD-BANNER                            fe=13   be=0    ['lanes/L-LIVE-WORLD-BANNER/evidence.md']
  arm-N.sh                                       fe=1    be=0    ['lanes/L-LIVE-WORLD-BANNER/evidence.md']
BODY:
- clears when: no lane changes a guard in response to a proof-harness failure without first showing the guard is the cause
- cleared by: L-LIVE-WORLD-BANNER
- owner: @sven

**`L-LIVE-WORLD-BANNER` hit a failure that did not reproduce, captured it as instructed, and then did the
part that is easy to get wrong: it diagnosed the harness rather than the guard.**
Its mutation proof reported six unexpected arms. The cause was **the proof**, not the check — the harness
handed mutants named `arm-N.sh` while the check identifies both files by their own basenames. It fixed
the harness with per-arm directories keeping canonical filenames, recorded the diagnosis in the proof's
docstring, and **the check was never changed in response.**
**That order is the whole point.** The tempting move when a proof reds unexpectedly is to loosen the
thing being proved until the proof goes quiet — and the result looks identical to a guard that was
correct all along. This estate has already paid for the same instinct twice: a flake re-run until green
because nobody could name it, and a tree always dirty so nobody noticed real dirt.
Two other properties of that lane's proof are worth naming as the standard, because they are rarer than
they should be:
- **Arm 0 reds on the real text that was on the branch**, not on a mutant invented to make it red. A
  guard that has never been shown to fail on the actual defect is a guard nobody has tested.
- **Two arms deliberately green**: a rename applied to both files, and a world where the text and a
  missing reset honestly agree. That is what makes it a **contradiction** check rather than a rule that a
  filename must appear — and it is the difference the exit asked for.


===== F-PUBLISH-DOUBLE-OUTBOX  [Warn]
TITLE: the second outbox row is a sibling, and the assertion was stale
plan.md loc: plan.md:31569
QUOTED TOKENS (occurrence counts at the tips):
  WorkforceNotificationOutbox                    fe=1    be=45   ['utils/workforce/delivery-failures.js']
  Channel                                        fe=9    be=203  ['test/growth-guest.test.js']
  TargetReference                                fe=1    be=54   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  LogicalDedupeKey                               fe=1    be=46   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  f5305ced                                       fe=0    be=0    []
  Database=SqlServer                             fe=0    be=20   ['artifacts/tests/README.md']
  D-SPEC-L-PUBLISH-WRITES-ONE-OUTBOX-ROW         fe=0    be=0    []
  lane/publish-outbox-shape                      fe=0    be=0    []
  3bb9c039                                       fe=0    be=0    []
BODY:
- clears when: the publish assertion names the channel set it expects rather than a row count, and that assertion has run on SQL Server
- cleared by: L-PUBLISH-WRITES-ONE-OUTBOX-ROW
- owner: @sven

**Raised as a blocker and downgraded on measurement the same day — the product is correct and the test was
not.** *(Corrected 2026-08-06.)*
One publish writes two `WorkforceNotificationOutbox` rows because it plans **two channels**: an in-app row and
an e-mail row, with different `Channel`, `TargetReference` and `LogicalDedupeKey`. One recipient, one inbox
entry, one e-mail. **Driving it to one row would delete the e-mail**, which is the only channel that reaches an
invited worker who has not yet claimed — the in-app adapter is a no-op and the inbox is unreachable until they
do.
**What is real is how long it hid.** `f5305ced` swapped the single hard-coded command for the channel plan on
2026-08-01 and updated the four fast-tier assertions; its own message records *"SQL tier not run."* The
`Database=SqlServer` count line was **unreachable from every routine run and read 1 for five days**, surfacing
only when the first SQL tier in five days finally ran. The defect was in what nobody could execute, not in what
anybody wrote.
**Shape of the fix is `D-SPEC-L-PUBLISH-WRITES-ONE-OUTBOX-ROW`'s to rule.** A fix exists unmerged on
`lane/publish-outbox-shape` @ `3bb9c039`, proved by three mutations, and **has never run on SQL Server** — fold
it into the run that verifies MIG-29, since those two are the only defects left on that tier.


===== F-RECEIPT-BLANK-PAYER-LINE  [Warn]
TITLE: a fiscal document with an empty line where the payer belongs
plan.md loc: plan.md:30427
FILE REFS (resolved at the tips):
  Services/Kassa/ReceiptService.cs                           be-basename
  PosReceiptService.cs                                       be-suffix
  Services/ReceiptService.cs                                 be-exact :152
  lanes/L-PAYMENT-LABEL-UKJENT/mutation-log.md               fe-basename :173
  PosSettlementService.cs                                    be-suffix :576
  Services/Kassa/EscPosReceiptBuilder.cs                     be-exact :315
  WebApi.Tests/Meals/CompanyAccountClassificationTests.cs    be-exact :41
QUOTED TOKENS (occurrence counts at the tips):
  Services/Kassa/ReceiptService.cs               fe=2    be=1    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  PosReceiptService.cs                           fe=6    be=2    ['test/receipt-discount-row.test.js']
  Services/ReceiptService.cs:152                 fe=2    be=1    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  lanes/L-PAYMENT-LABEL-UKJENT/mutation-log.md:1 fe=2    be=1    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  Services/Kassa/                                fe=7    be=23   ['test/pos-receipt-payer-line-and-signature.test.js']
  NotSet(0)                                      fe=0    be=0    []
  Giftcard(75)                                   fe=0    be=0    []
  PayInStore(100)                                fe=0    be=0    []
  Cash(110)                                      fe=0    be=0    []
  DinteroTerminal(450)                           fe=0    be=0    []
  WoltMarketplace(500)                           fe=0    be=0    []
  NotSet                                         fe=14   be=54   ['test/payment-type-label.test.js']
  PosSettlementService.cs:576-578                fe=1    be=0    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
BODY:
- clears when: no receipt prints an empty payer line for a payment type the product can produce, or each blank is recorded as deliberate
- cleared by: L-RECEIPT-PAYER-LINE-LOCATE
- owner: @sven

**Reported by the payment-label lane as an adjacent finding: the receipt printer emits a blank payer line for
five payment types**, cash among them.
**The clerk could not confirm the file it named.** There is no `Services/Kassa/ReceiptService.cs` on the
integration tip — the receipt code lives in `PosReceiptService.cs` and its interface — so **the path in the
report does not resolve and the line number cannot be checked.** The finding may still be exactly right; **it
is recorded as attributed-and-unverified**, and whoever takes it must locate the site before acting.
**Why it is worth keeping despite that.** It is the same family as the label defect that produced it — a
payment type the product writes and the surface cannot name — **arriving on a kassasystemforskrifta artifact
rather than an admin list.** A blank where a payer belongs is harder to notice than a wrong word and worse to
explain.
**Located and confirmed on 2026-08-05 at `Services/ReceiptService.cs:152`, read with `git show` at the
integration tip `8e2b57de` — and three corrections came back, one of them to this record.**
**The mis-cited path was the clerk's, not the lane's.** `lanes/L-PAYMENT-LABEL-UKJENT/mutation-log.md:173`
reads `Services/ReceiptService.cs:152` — right path, right line. **The `Services/Kassa/` prefix appears
nowhere in that lane's output; it was introduced here, in this flag.** A lane was spent re-deriving a fact
that was already correctly cited on disk, and the reason it was spent is that this record said the citation
did not resolve. **The check that would have caught it is reading the source document before restating it.**
**Six, not five, and the sixth is the sharpest.** 17 enum values, 11 labelled; blank for `NotSet(0)`,
`Giftcard(75)`, `PayInStore(100)`, `Cash(110)`, `DinteroTerminal(450)`, `WoltMarketplace(500)`. `NotSet` was
omitted before, and `PosSettlementService.cs:576-578` says in its own comment that a **100%-comped order
settles with no tender and stays `NotSet`** — so that is a completed, journalled sale whose receipt line is
blank permanently, not an unsaved draft.
**C6 is not breached, and this record claimed it was.** There are **two independent payer-line emitters
sharing no code.** The fiscal receipt uses `Services/Kassa/EscPosReceiptBuilder.cs:315`, whose default
returns the enum name and **never blanks**; the POS electronic receipt links to that same journal


===== F-REGISTRABLE-DOMAIN-TWICE  [Warn]
TITLE: two lanes, one answer to "are these the same site"
plan.md loc: plan.md:27291
BODY:
- clears when: exactly one registrable-domain helper exists and both origin checks read it
- owner: @sven

One lane extracted it; another holds an **identical private copy** for the Events origin. Same question,
two implementations, and **the private one cannot be found by anyone looking for the shared one.**
Not a fork in the dangerous sense — the answers agree today. But this is the fourth same-shape collision
recorded today, and the pattern is now well established: **a lane that cannot see its siblings re-solves a
solved problem under a name nobody is watching.** Merge order is named in the return.


===== F-REPUBLISH-DOUBLES-PLANNED-MINUTES  [Blocker]
TITLE: a payroll column inflates every time a week is republished
plan.md loc: plan.md:32812
QUOTED TOKENS (occurrence counts at the tips):
  State                                          fe=239  be=710  ['playwright.config.js']
  WorkforceActualMinutes.ReadAsync:151           fe=0    be=0    []
  plannedOrdinaryMinutes                         fe=0    be=0    []
  WorkforceLabourBandService.ReadPublishedAssign fe=0    be=0    []
  WorkforceAttendanceService.GetAttendanceAsync: fe=0    be=0    []
  WorkforceRequestsService.FirstAffectedPublishe fe=0    be=0    []
BODY:
- clears when: republishing an identical week leaves planned minutes, planned labour cost and planned variance unchanged, shown by a measured before-and-after on each reader
- cleared by: L-PLANNED-MINUTES-HONOUR-LINEAGE
- owner: @sven

**Found by sweeping for the defect that produced the duplicate open shifts — and the sweep is worth more than
the fix was.** Four more readers filter on `State` alone with no lineage filter, and the first is **measured,
not reasoned**:
- **`WorkforceActualMinutes.ReadAsync:151`** — an identical week republished takes `plannedOrdinaryMinutes`
  from **480 to 960**. That single reader feeds the **payroll hours export**, contract exposure and the labour
  band, so **one republish inflates the planned column of a payroll CSV** and the planned side of every variance
  and labour-percentage figure derived from it. Paid minutes come from clock sessions and are unaffected — the
  plan is wrong, the actuals are right, and the gap between them is what a manager reads.
- **`WorkforceLabourBandService.ReadPublishedAssignmentsAsync:456`** — planned labour cost and unpunched-shift
  count **double per republication**. A money path.
- **`WorkforceAttendanceService.GetAttendanceAsync:86`** — the planned side of planned-versus-actual variance
  doubles.
- **`WorkforceRequestsService.FirstAffectedPublishedRevisionAsync:424`** — not duplication: it can **name a
  superseded revision** as the first affected schedule revision.
**All four are unfixed and each needs its own red-first proof.** Republishing a week is the ordinary act this
module supports, so none of these is an edge case.


===== F-RESERVATION-CONFLICT-IGNORES-EXTRA-TABLES  [Warn]
TITLE: the client's conflict rule disagrees with the server's
plan.md loc: plan.md:31919
FILE REFS (resolved at the tips):
  ReservationService.cs                                      be-suffix :701
  reservations.vue                                           fe-suffix :458
QUOTED TOKENS (occurrence counts at the tips):
  ReservationService.cs:701-735                  fe=0    be=0    []
  r.Tables                                       fe=0    be=4    ['WebApi.Tests/Kassa/ReservationServiceTests.cs']
  rt.TableId                                     fe=0    be=6    ['WebApi.Tests/Kassa/ReservationServiceTests.cs']
  :633-637                                       fe=0    be=0    []
  overrideCapacity                               fe=1    be=0    ['pages/admin/reservations.vue']
  :627                                           fe=1    be=4    ['lanes/L-PRICE-BYPASS-FIVE/remaining-sites.md']
  reservations.vue:458-466                       fe=0    be=0    []
  r.tableId                                      fe=4    be=0    ['components/admin/reservations/ReservationTimeline.vue']
  saveReservation                                fe=1    be=0    ['pages/admin/reservations.vue']
  blocksFor                                      fe=1    be=0    ['components/admin/reservations/ReservationTimeline.vue']
  tableIds                                       fe=5    be=1    ['test/reservations-combined-table-conflict.test.js']
BODY:
- clears when: the client refuses a combined booking whose extra table is taken, before the request is sent
- cleared by: L-RESERVATION-CONFLICT-SEES-EVERY-TABLE
- owner: @sven

**Raised as a blocker on the belief that this was a live double-booking path. It is not — measured 2026-08-06,
and the severity drops accordingly.**
**The server does catch it.** `ReservationService.cs:701-735` includes `r.Tables` and blocks **every**
`rt.TableId`; `:633-637` refuses if **any** chosen table is blocked. Both admin write routes reach it, and
`overrideCapacity` gates capacity only (`:627`) — never the conflict.
**What the defect actually costs is a lost draft and a confusing message.** `reservations.vue:458-466` compares
only `r.tableId`, so the client lets the operator build and submit a booking the server will refuse. The
refusal reads *"no longer available"*, and `saveReservation` then **closes the modal — the typed draft is
gone.** So the operator loses their work and is told something that is not quite true: the table was never
available, and nothing changed underneath them.
**The renderer already knew.** `blocksFor` draws the block on every `tableIds` row while the conflict rule
swore that table was free — the screen and the rule disagreed with each other, in view of the operator.
**Closed on the client in three files** — a set intersection over every table a reservation holds, the whole
draft passed to the modal's check, and extra tables carried through timeline drag and resize. Combine chips
gained a busy state, so a taken table now says so **before it is picked**.
**C5 remains open**: no browser arm. The e2e fixture has no floor-plan or reservation endpoints, so this is
suite evidence only.


===== F-RETRACTED-LANE-WORKTREES-BLOCK-THE-TRUNK  [Warn]
TITLE: worktrees belonging to retracted lanes still hold the trunk branch and block every future landing
plan.md loc: plan.md:33243
BODY:
- clears when: no worktree holds feature/restaurant-modules in either repository except a landing lane's own, shown by git worktree list
- owner: @sven


===== F-RETREC-GUARD-IS-DEAD  [Warn]
TITLE: a guard on a money path that no test misses
plan.md loc: plan.md:28897
FILE REFS (resolved at the tips):
  KassaCreditSale.cs                                         be-suffix :28
  Services/Kassa/KassaCreditSale.cs                          be-exact :28
QUOTED TOKENS (occurrence counts at the tips):
  RETREC                                         fe=9    be=110  ['test/pos-return-document-amount-and-vat.test.js']
  Services/Kassa/KassaCreditSale.cs:28           fe=0    be=0    []
  transType                                      fe=2    be=14   ['utils/meals/store-view.js']
BODY:
- clears when: removing the RETREC guard at KassaCreditSale.cs:28 reds at least one test, or the guard is removed with the SQL tier run and the removal reviewed
- owner: @sven

**Found by the lane that came to rebase the tender-wire branch and found nothing to rebase.** Deleting the
`RETREC` guard at `Services/Kassa/KassaCreditSale.cs:28` reds **nothing across 1209 tests**.
**This is a dead branch and not merely an unexercised one, and the difference was measured.** The same run's
vacuity control reds 15 tests in that scope, including the SAF-T `transType` 11002 pins — so the predicate
around this guard is exercised, and the guard specifically is not.
**It was left in place, correctly.** It is a defensive guard on a money path, it sits outside the exit
criterion of the lane that found it, and **the SQL tier never ran**. Deleting code because a green suite does
not miss it is the shape that has already cost this program twice, most recently four hours earlier when a
lane's own first fix carried a branch all 58 of its tests passed without.
**Two ways to close this and they are not equivalent.** Either a test exists that reds when the guard goes —
in which case the guard is load-bearing and the flag was a false alarm — or the guard goes, with the SQL tier
run first, because a guard nothing can distinguish from its absence is documentation written as code.


===== F-REVIEWERS-LOSE-THE-RUNS-THEY-WAIT-ON  [Warn]
TITLE: three verdicts today stalled on a process that died with them
plan.md loc: plan.md:30868
BODY:
- clears when: no reviewer is asked to wait on a suite it started, or the plan records that long runs belong to the lane rather than to its reviewer
- cleared by: L-PLAN-LIVES-IN-GIT
- owner: @sven

**Three Fable reviewers today ended a turn waiting on a suite run, and in every case the run was dead when the
next wake checked** — zero processes alive, nothing written. Each had to be told the same thing: **files
survive, processes do not.**
**The cost is not the run, it is the verdict.** In each case the reviewer had already produced the
load-bearing evidence itself — mutations re-derived in its own worktree, refs read, counts checked — and was
holding a complete judgement hostage to the least decisive number in it. **One was resumed three times.**
**The shape to prefer: a reviewer measures what it can hold in one turn, and a long tier run belongs to the
lane, which is already committing its own tree.** A reviewer that inherits a lane's tier figure and says so is
more honest than one that re-runs it and loses the answer.
**Where a reviewer must re-derive a long run, the instruction that works is to state the gap and rule anyway.**
A verdict with a named unverified number is usable; a verdict that never arrives is not — and this program has
now spent three sessions learning that the same way.


===== F-REVIEWS-CANNOT-BE-JOINED-TO-LANES  [Warn]
TITLE: the review record and the lane record do not meet
plan.md loc: plan.md:28968
QUOTED TOKENS (occurrence counts at the tips):
  built-unverified                               fe=9    be=1    ['playwright.config.js']
  L-JOURNEY-PROXY-BLINDSPOT                      fe=0    be=0    []
  L-MRG-REVISE-LAND                              fe=0    be=0    []
BODY:
- clears when: every fired review is recorded in the log against the lane id it reviewed, so the set of landed-and-unreviewed lanes can be listed by a script
- owner: @sven

**197 lanes stand `built-unverified` and the number of them that have been reviewed cannot be determined
from this plan.** Reviews *are* fired — the log carries 81 lines mentioning one — but they are recorded by
informal name. The line *"reviews fired for proxy-blindspot and mrg-revise-land"* names no lane id, so
`L-JOURNEY-PROXY-BLINDSPOT` and `L-MRG-REVISE-LAND` read as unreviewed to any join.
**This was found by a detector that failed its own control, which is the only reason it is stated correctly
here.** A first sweep reported 0 of 197 reviewed. Run against three lanes known to have been reviewed, it
returned false for all three — so the instrument was wrong, not the world, and the true count is
**unknown rather than zero**. A second sweep keyed on lane id found 7, which is a floor and not a measure.
**The cost is that the review backlog cannot be worked down deliberately.** With no join, choosing what to
review next is done from memory, and memory is what the standing cycle exists to replace. The clerk has been
selecting by recency and consequence, which is defensible for the top of the list and useless for the tail.
**The remedy is one line per review, written when it is fired, naming the lane id.** It costs nothing and it
is the difference between a backlog and a rumour. Recorded as a flag rather than fixed silently, because the
convention binds every future session and not only this one.


===== F-REWARDS-STATS-DIVIDES-BY-ZERO  [Warn]
TITLE: the panel 500s and no data can fix it
plan.md loc: plan.md:32798
FILE REFS (resolved at the tips):
  RewardsController.cs                                       be-suffix :133
QUOTED TOKENS (occurrence counts at the tips):
  RewardsController.cs:133                       fe=0    be=0    []
  DivideByZeroException                          fe=0    be=0    []
BODY:
- clears when: the rewards statistics panel renders when every customer is a member
- owner: @sven

`RewardsController.cs:133` throws `DivideByZeroException` when the non-member order count is zero.
**No amount of seeding repairs it**: in this world the one honest customer *is* the member, so non-member
orders are zero by construction — and that is the ordinary state of a venue whose first loyalty member is its
first regular.


===== F-RF1313-CREDIT-SALE-CLAIM-UNBACKED  [Blocker]
TITLE: the systembeskrivelse says the X/Z report describes credit sales, and no code produces it
plan.md loc: plan.md:29225
FILE REFS (resolved at the tips):
  docs/okam-kassa/compliance/RF-1313-systembeskrivelse.md    be-exact :155
  docs/plans/pos-open-decisions.md                           be-exact :33
QUOTED TOKENS (occurrence counts at the tips):
  docs/okam-kassa/compliance/RF-1313-systembeskr fe=0    be=0    []
  CreditSalesCount                               fe=0    be=1    ['docs/plans/pos-open-decisions.md']
  docs/plans/pos-open-decisions.md:33            fe=0    be=0    []
  lane/meals-xz-credit                           fe=0    be=0    []
  F-RF1313-FALSE-CONTROL                         fe=0    be=0    []
BODY:
- clears when: the X/Z report produces the credit-sale specification § 2-8-2 second paragraph requires, or the sentence asserting it is withdrawn from the systembeskrivelse
- owner: @sven

**Found by the blocker recheck outside its assignment, and the clerk verified it independently at the tip.**
`docs/okam-kassa/compliance/RF-1313-systembeskrivelse.md:155` reads *"Spesifikasjonen av kredittsal i § 2-8-2
andre ledd høyrer til X/Z-rapporten og er skildra der"* — the credit-sale specification belongs to the X/Z
report and is described there.
**It is not.** `CreditSalesCount` has **exactly one hit on the integration branch**, and it is in a planning
document, `docs/plans/pos-open-decisions.md:33`. **No code at the tip produces those columns.**
**The cause is a landing asymmetry that the document itself predicted as a cross-lane risk.** The utlkvit
family landed; `lane/meals-xz-credit` did not. The sentence was true of the world its author expected and is
false of the world that shipped.
**This is the second instance of exactly this shape in the same document.** `F-RF1313-FALSE-CONTROL` records
the first: the systembeskrivelse asserting database-layer journal triggers that no migration in the chain
creates. **A produkterklæring that describes controls the product does not have invites the inspection it
cannot survive**, which is why C6 exists and why this is a blocker rather than a documentation task.
**Two remedies and they are not equivalent.** Landing the credit-sale columns makes the sentence true and is
the one a venue benefits from. Withdrawing the sentence makes the document honest and is the one available
today. **Which to do, and whether the earlier RF-1313 finding's notification obligation applies here too, is
Sven's** — the first instance was recorded as carrying one.
**Not a claim about live exposure.** Whether this reaches a real venue depends on what has been submitted and
to whom, which the clerk has not established and is not guessing.


===== F-ROLLBACK-LEAVES-TRACKED-STATE  [Blocker]
TITLE: a rolled-back transaction leaves the mutation in memory
plan.md loc: plan.md:27175
BODY:
- clears when: no guard throws after mutating a tracked entity, or a pin proves the next operation on that scope sees the pre-mutation state
- cleared by: L-MEALS-RELEASE-ACTOR
- owner: @sven
- blocks: FT-GROWTH

**Fell out of a paired refusal test** — the kind of test that keeps a success beside its refusal — and it
is a defect class rather than one site.
The coherence guard threw **after** setting a reservation to released. The database rolled back correctly.
**The scoped context kept tracking the mutated entity anyway**, so the *next* release on that same scope
answered *already released* for a reservation the database still holds as bound.
So a refusal that works, and a rollback that works, together produce a lie — **and neither half is wrong
on its own.** Fixed here by staging the audit row before the mutation rather than after.
Worth generalising: **anywhere a guard throws after touching a tracked entity, the transaction is honest
and the in-memory graph is not.** Nothing sweeps for that shape today.


===== F-RUNBOOK-CANNOT-START-A-COLD-MACHINE  [Warn]
TITLE: the documented path assumes containers nobody documents
plan.md loc: plan.md:31778
FILE REFS (resolved at the tips):
  Scripts/demo/demo-up.sh                                    be-exact
  Scripts/demo/RUNBOOK.md                                    be-exact
  Program.cs                                                 be-exact :868
QUOTED TOKENS (occurrence counts at the tips):
  Scripts/demo/demo-up.sh                        fe=1    be=3    ['test/e2e/scripts/live-world.sh']
  Scripts/demo/RUNBOOK.md                        fe=0    be=0    []
  :5091                                          fe=0    be=8    ['Scripts/demo/seed-growth-demo.sh']
  Events__Enabled                                fe=2    be=2    ['test/e2e/scripts/live-world.sh']
  Growth__Enabled                                fe=0    be=2    ['Scripts/demo/seed-growth-demo.sh']
  wt-demo5                                       fe=0    be=1    ['Scripts/demo/RUNBOOK.md']
  Features:Meals                                 fe=16   be=39   ['test/platform-flag-board.test.js']
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  Program.cs:868                                 fe=0    be=0    []
BODY:
- clears when: a person with a cold machine can follow one document from nothing to a signed-in admin page
- owner: @sven

`Scripts/demo/demo-up.sh` and `Scripts/demo/RUNBOOK.md` do cover the flow, and the path they describe works —
API on `:5091`, all six modules seeded, `Events__Enabled` and `Growth__Enabled` armed, the power-user door
opened on the worker's phone.
**Three gaps, measured 2026-08-06:**
- **The commands to create the SQL and Redis containers exist nowhere in either repository.** Everything
  downstream assumes they are already up.
- RUNBOOK names a checkout (`wt-demo5`) that is **on a stale lane branch**.
- RUNBOOK states that `Features:Meals` is never bound. **That is stale at `8e2b57de`** — it is bound at
  `Program.cs:868`, which matters because the Meals flag-board divergence turns on exactly that key.


===== F-SCHED-DEAD-CLASS  [Warn]
TITLE: unrunnable lanes are soaking the dispatch budget
plan.md loc: plan.md:26618
BODY:
- clears when: the scheduler can be told a resource class is unavailable, so lanes needing it stop consuming grants that runnable lanes could take
- owner: @sven

Observed while Docker was down. Thirteen sql-class lanes are ready and none can run — there is no
machine. The scheduler ranks them into the grant anyway, and because the global budget is counted in
points, **two ungrantable lanes exhaust it**: node and suite slots sit free while five authored,
runnable lanes are never offered.
The standing rule is never to dispatch what tick did not grant, and that rule is right — so the cost
lands as idle capacity rather than as a violation. The plan has no vocabulary for "this class has no
machine today", which is the actual missing thing.


===== F-SCROLLLOCK-FLAKE  [Warn]
TITLE: a modal test reds on timing and will red somebody else's run
plan.md loc: plan.md:26887
QUOTED TOKENS (occurrence counts at the tips):
  modal-estate-scroll-lock                       fe=15   be=0    ['.gitignore']
BODY:
- clears when: the scroll-lock assertion waits for layout to settle rather than racing it, shown by the same test passing at the speed that currently reds it
- owner: @sven

Observed, not inferred, and **not caused by the lane that reported it** — identical code on both sides of
its comparison. `modal-estate-scroll-lock` failed once at **2.9 seconds** with a 109-pixel drift against a
two-pixel tolerance, then passed at 8.3s, 8.4s, and 47.1s.
**Failing fast is the tell.** It wheels the page before layout settles, so the faster the machine the more
likely it reds — which means it will bite hardest on exactly the runs nobody is watching, and it will be
attributed to whichever lane happens to be running.


===== F-SEND-KODE-BEFORE-HYDRATION-SENDS-NOTHING  [Warn]
TITLE: clicking Send kode before hydration sends nothing and renders no OTP boxes, looking exactly like a dead backend
plan.md loc: plan.md:33066
QUOTED TOKENS (occurrence counts at the tips):
  LoginModal                                     fe=45   be=4    ['artifacts/journeys/modal-estate-scroll-lock.playwright.json']
BODY:
- clears when: the sign-in control either cannot be clicked before it can send, or reports that nothing was sent, shown in a browser
- owner: @sven

**Clerk correction appended 2026-08-06, added beside the text above and not over it.** The lane measured
this in Chromium and the title is wrong about the mechanism. The send **succeeded** — six OTP boxes
rendered at **453 ms**, an SMS really went out — and was then thrown away at **485 ms** when the shell's
own navigation destroyed the modal and mounted a second one at the phone step with zero boxes.
**`LoginModal` could not have reported it**, because from inside the modal the send worked. The screen a
person sees is exactly as described; the cause was the clerk's guess and was wrong.


===== F-SHARED-CHECKOUT-DIRT-IS-UNRECORDED-WORK  [Warn]
TITLE: 270 dirty files, some of them earlier drafts of landed work
plan.md loc: plan.md:29778
FILE REFS (resolved at the tips):
  utils/price.js                                             fe-exact
  translations/no.ts                                         fe-exact
  en.ts                                                      fe-suffix
  de.ts                                                      fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  utils/price.js                                 fe=24   be=4    ['test/price-bypass-legacy.test.js']
  translations/*.ts                              fe=0    be=0    []
  F-LANE-COMMITS-CARRY-SIBLING-HUNKS             fe=0    be=0    []
  e34977ac                                       fe=7    be=0    ['lanes/L-PRICE-BYPASS-FIVE/remaining-sites.md']
  translations/no.ts                             fe=4    be=6    ['test/e2e/fixture/world.js']
  en.ts                                          fe=2    be=9    ['lanes/L-FE-WF-INVITE-LIST-REVOKE/evidence.md']
  de.ts                                          fe=3    be=5    ['test/e2e/journeys/modal-estate-scroll-lock.spec.js']
  lanes/**                                       fe=1    be=0    ['lanes/L-LAND-THE-FRONTEND-ON-THE-TRUNK/evidence.md']
  docs/plan/**                                   fe=2    be=1    ['lanes/L-THE-GUEST-EXIT-IS-FINISHED/evidence.md']
  --untracked=normal                             fe=0    be=0    []
  refs/heads                                     fe=1    be=2    ['scripts/worldstamp']
  lane/guard-repair-lands                        fe=0    be=0    []
BODY:
- clears when: every uncommitted change in the shared checkout is attributed to a lane, superseded by a commit, or deliberately discarded, so no sweep can take or lose one
- owner: @sven

**A lane found `utils/price.js` carrying +118 uncommitted lines in the shared checkout that are an *earlier
revision* of work already committed on its own baseline** — the same content arrived by another route. Not a
rival change, and indistinguishable from one until somebody diffs it.
**And three `translations/*.ts` carry roughly 380 uncommitted lines of another lane's work**, into which that
lane needed to add one key per file.
**Both directions are live.** A pathspec commit takes only what it names, so **a sibling's work in a shared file
is silently left behind**; a wildcard `git add` takes it all, which is how `F-LANE-COMMITS-CARRY-SIBLING-HUNKS`
was raised. **The shared checkout is holding work whose owner nobody can name from the file alone.**
**Measured, 2026-08-05T02:43:01Z against baseline `e34977ac`: 133 paths in scope, and 66 of them — half — are
dirty in more than one lane's interest.**
**The worst three are the same three: `translations/no.ts`, `en.ts` and `de.ts`, each claimed by 46 lanes with
43 rival variants.** That is not a merge hazard in the abstract; it is three files that nearly every lane in
this program has touched and that no two of them can both land unexamined.
**The exclusion is stated rather than assumed, and it dominates.** `lanes/**` (735 paths) and `docs/plan/**`
(348) are **out of scope — together 89 percent of the dirt.** In scope, 133; single-lane bookkeeping, 49.
**The clerk's "~270 dirty files" was a different measurement.** It is the `--untracked=normal` count, 293 here,
**which counts untracked directories rather than files.** Two numbers, two questions, and the plan has been
quoting the one that answers neither.
**The census caught itself moving and said so.** `refs/heads` went from 107 to 108 while its author was down —
the new branch is `lane/guard-repair-lands`, dispatched by the clerk an hour earlier, committing five in-scope
paths. **No verdict changed**, because its blobs differ from the working tree on all five and a third read
confirmed **0 of 133 working blobs had moved.** What changed is that each of those five now has **one more
claimant**, and two of them were already attributed to another lane on the same harness code.
**So the contested-path column is a floor, not a total** — both documents now say so. A census of a live working
tree with lanes writing into it is a photograph, and the honest form of it names the shut


===== F-SHARED-REF-CLOBBER  [Warn]
TITLE: two landers moved the integration ref and one merge was discarded
plan.md loc: plan.md:7286
QUOTED TOKENS (occurrence counts at the tips):
  L-MEALS-POSREL-LAND                            fe=0    be=0    []
  d776f9e7                                       fe=0    be=0    []
  9888178f                                       fe=0    be=0    []
  b9c95082                                       fe=0    be=0    []
  21f79514                                       fe=0    be=0    []
  5c3a9be1                                       fe=0    be=0    []
BODY:
- clears when: every lane that moves feature/restaurant-modules does so with update-ref and an old-value guard, and no reflog entry on that ref reads `Reset to`
- cleared by: L-MEALS-POSREL-LAND
- owner: @sven

**This fired for real, between two of this plan's own merge lanes.** `L-MEALS-POSREL-LAND` moved the
integration ref to `d776f9e7` with a guarded `git update-ref <new> <old>`. Seconds later a sibling
lander overwrote it with `9888178f` — the reflog records `branch: Reset to 9888178f` — **discarding a
merge without merging it.**
Nothing was lost, because the lander held its work on a local branch, re-merged onto the new base,
re-measured from scratch and moved the ref guarded again. Verified independently: `d776f9e7`'s successor
`b9c95082`, `21f79514`, `5c3a9be1` and `9888178f` are all ancestors of the tip, and the six exit files
of three merge lanes are present on it.
**The rule, and it belongs in every merge brief: move the shared ref with `git update-ref <ref> <new>
<old>`. Never `git branch -f`, never a reset.** The guard is what turns a silent clobber into a
refusal. A lander that cannot move the ref should say so and stop, not force it.
Parallel merge lanes are the right shape — this is not an argument for serialising them. It is an
argument for the one primitive that makes them safe.


===== F-SHELL-FALLBACK-MASQUERADES-AS-THE-FIRST-BRANCH  [Info]
TITLE: the eighth way a check answered confidently and wrongly
plan.md loc: plan.md:29340
FILE REFS (resolved at the tips):
  docs/plans/PENDING-MIGRATIONS-LEDGER.md                    be-exact
QUOTED TOKENS (occurrence counts at the tips):
  L-MIG-STACK-RECORD                             fe=0    be=0    []
  Web-modules                                    fe=78   be=15   ['test/journey-artifact-store.test.js']
  OkamAPI-modules                                fe=18   be=9    ['test/growth-send-gate.test.js']
  os.path.exists                                 fe=1    be=0    ['lanes/L-LIVE-WORLD-BANNER/mutation-proof.py']
  perl                                           fe=9    be=9    ['package-lock.json']
  \Q…\E                                          fe=0    be=0    []
  PIPESTATUS                                     fe=1    be=0    ['lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/run-browser-arm.sh']
BODY:
- clears when: no evidence document reports a path as found in one repository on the strength of a command whose fallback branch searched another
- owner: @sven

**The clerk told `L-MIG-STACK-RECORD` the migrations ledger lives in `Web-modules`. It does not — it is in
`OkamAPI-modules`, tracked on 184 refs there and absent from all 104 frontend refs.** The lane resolved it,
said so, and asked that the plan be corrected.
**The mechanism is worth recording because it produced output that looked exactly like the truth.** The check
was `ls docs/plans/PENDING-MIGRATIONS-LEDGER.md 2>/dev/null || (cd ../OkamAPI-modules && ls ...)`. The first
branch failed **silently**, the fallback ran, and its output — a real file with a real size and mtime — was read
as the first branch's result. **Nothing in the output says which branch produced it.**
**This is the eighth distinct way a check has reached a confident wrong answer in this program in one day.** A
bare filename pathspec that matches nothing; a brace expansion with the extension outside the `}`; a decorated
evidence string passed whole to `os.path.exists`; a check run against the wrong repository; a claim re-derived at
a newer ref than its document named; a script run from the wrong working directory; a UTC stamp compared against
a local mtime; **and now a fallback whose output is indistinguishable from the branch it replaced.**
**The common shape across all eight is worth more than any of them.** Each produced a plausible, well-formed
result rather than an error, and each was caught only because somebody re-derived the answer a second way.
**Two more instances, both self-caught, bringing the set to fifteen.** A mutation pass used `perl` with
`\Q…\E` around a string containing `@`; **both substitutions silently no-oped and the suite reported 38
passed** — read at face value, *the mutation broke nothing*. It was caught only because a verification grep
printed nothing afterwards. And **zsh does not populate bash's `PIPESTATUS`**, which swallowed an exit code
outright.
**The lane's remedy is the one worth copying: assert the mutation landed before trusting any result of it.**
Thirteen of the fifteen instances in this set returned a plausible, well-formed answer rather than an error, and
almost every one was caught by a control that ran *after* the measurement rather than by reading the
measurement more carefully.


===== F-SHIPPED-BRANCH-IS-NOT-WHAT-THE-CHECKOUT-SHOWS  [Blocker]
TITLE: the tree carries ~370 uncommitted paths of lane work
plan.md loc: plan.md:31814
QUOTED TOKENS (occurrence counts at the tips):
  Web-modules                                    fe=78   be=15   ['test/journey-artifact-store.test.js']
  lane/focustrap-teardown                        fe=2    be=0    ['lanes/L-MARGIN-WASTE-SURFACE-IS-HONEST/evidence.md']
  e34977a                                        fe=13   be=1    ['test/order-label-dictionaries.test.js']
  [shipped]                                      fe=0    be=0    []
BODY:
- clears when: a person can tell, from the checkout alone, which capabilities are on the shipped branch and which are uncommitted lane work
- owner: @sven

**Measured 2026-08-06 while writing the verification guide, and it changes what every walkthrough means.**
The `Web-modules` checkout sits on `lane/focustrap-teardown`, one commit past the shipped tip `e34977a`, and
carries **~370 uncommitted paths of unmerged lane work.**
**Among them: the Training publish-button fix, the entire Training evidence page, and a Margin
recipe-revision editor.** So a person clicking through this checkout is testing **a tree that exists nowhere
else** — capabilities that look shipped are uncommitted, and defects that look fixed are still live for
everybody else.
**The guide marks every divergence `[shipped]` versus `[this checkout]` for exactly this reason.** That is a
workaround for a hazard, not a fix: nothing in the repository tells a reader which is which, and the same trap
has already produced two wrong measurements in this plan.


===== F-SIGN-IN-IGNORES-THE-REDIRECT-ITS-OWN-GUARD-WROTE  [Warn]
TITLE: after sign-in the app lands on the dashboard and never honours the redirect its route guard put on the URL
plan.md loc: plan.md:33052
QUOTED TOKENS (occurrence counts at the tips):
  /admin/training-courses                        fe=11   be=3    ['test/admin-nav-access.test.js']
  overview                                       fe=52   be=30   ['test/workforce-personnel-list-components.test.js']
  offers                                         fe=138  be=37   ['test/workforce-timesheet.test.js']
  goods                                          fe=42   be=110  ['test/margin-menu-margin-panel.component.test.js']
  AdminPage                                      fe=160  be=8    ['Claude.md']
  mounted                                        fe=213  be=7    ['playwright.growth-guest-exit.config.js']
  push('/admin')                                 fe=15   be=3    ['test/front-door-pages-resume-after-login.test.js']
BODY:
- clears when: signing in at a guarded URL lands on the page that was asked for, shown by a browser walk that starts at a deep link
- owner: @sven

**Clerk correction appended 2026-08-06, added beside the text above and not over it.** The lane that fixed
this measured the cause and it is **not** what this flag's title says. The sign-in path does **not** throw
the redirect away — from `/admin/training-courses` the redirect survives and lands correctly. **Four
pages destroyed it first**: `overview`, `offers`, `kam`, `goods`. `AdminPage` is a page component's
*child*, so its `mounted` runs first and begins navigating; the page's own `mounted` then answered *"you
are not a Key Account Manager"* to a visitor it had never met, and its bare `push('/admin')` superseded
the in-flight navigation. The symptom in the title is real; the attribution was the clerk's and was wrong.


===== F-SPLICE-RESIDUE-IN-BRIEFS  [Warn]
TITLE: the old splice damage is still generating garbled briefs
plan.md loc: plan.md:9166
QUOTED TOKENS (occurrence counts at the tips):
  state                                          fe=589  be=1023 ['nuxt.config.js']
BODY:
- clears when: no lane block's prose runs into the next block's header on one line, and no dispatched brief contains a fragment of another lane
- cleared by: L-MEALS-PROJECTION-LAG-VISIBLE
- owner: @sven

**A lane was dispatched today with a brief whose middle seventy lines were fragments of two other lanes,
spliced mid-sentence, twice. It executed the legible exit and named the discrepancy rather than
improvising — which is the only reason this was found.**
The cause is the batch-edit splice earlier in this program: an edit applied by byte offset while mutating
the same string, which deleted 22 lane blocks. They were restored from a view generated before the
damage, and each says its prose is unrecoverable. **What nobody checked was the seams.** Thirteen blocks
had their prose cut **mid-word** with the next block's `state:` line running on directly:
`plan check` reports **0 errors** on that, and did throughout. The parser recovers, the rendered views
recover — **and the brief generator does not**, because it copies the block body verbatim. So the damage
was invisible in every place anyone looked and visible only to an agent reading its own brief.
**Repaired structurally, not editorially.** I split each seam so the header starts its own line. **The
truncated prose is left truncated** — a sentence ending "…and the billin" stays that way, because
inventing the rest is exactly the failure this plan exists to prevent, and a lane reading a half-sentence
knows it is half. Thirteen lines split, line count reconciled.
**What is not fixed:** the missing prose itself, and whatever briefs were generated from the seams before
today. If a lane's brief looked strange in the last two days, this is why.


===== F-SQL-CONTAINERS-FROM-EARLIER-SESSIONS-STILL-HOLD-THE-HOST  [Warn]
TITLE: three left running, two of them for days
plan.md loc: plan.md:30826
BODY:
- clears when: no SQL container older than the current session is running, or each surviving one is recorded as deliberately kept
- owner: @sven

**Observed 2026-08-05: three SQL containers are up — one for thirteen hours and two for two days — and none
belongs to any lane in this session.** They were not touched, because killing a container this session did not
create is a standing rule here and one that has already been broken once in this estate.
**On a host where two to three concurrent database containers is the measured ceiling, three standing ones
are the ceiling.** That is a large part of why thirteen ready lanes cannot move, and it is not a cap the plan
imposed — it is residue.
**Reaping them is the owner's call precisely because the rule that protects them is a good one.** A lane that
guesses which containers are abandoned is a lane that eventually kills a colleague's fixture mid-run; a person
who knows the sessions are over can clear all three in a second.


===== F-SQL-HEADROOM  [Warn]
TITLE: the host cannot start another database container, and swap is what proves it
plan.md loc: plan.md:26798
QUOTED TOKENS (occurrence counts at the tips):
  L-WF-ADJUSTMENT-ORDINAL                        fe=0    be=2    ['Migrations/20260802151208_Workforce_TimesheetAdjustmentOrdinal.cs']
  F-CAP-COUNTS-LANES                             fe=0    be=0    []
  tear-down-after-walking                        fe=0    be=0    []
BODY:
- clears when: a SQL-tier lane starts a container without the host being over its memory and swap budget, or the standing worlds are torn down deliberately
- owner: @sven
- blocks: L-ACCT-UIDX, L-EV-SEED-DEPOSITS, L-WF-ADJUSTMENT-ORDINAL, L-MIG-TRAIN-DISPLAY-SNAPSHOT, L-MIG-STACK-LAND, L-WF-BOOTSTRAP-ONE-ENGAGEMENT, L-LIVE-WALK-MARGIN, L-LIVE-WALK-EVENTS

Raised by `L-WF-ADJUSTMENT-ORDINAL`, which measured it **inside the Docker VM rather than inferring it
from container sums** — and the difference is the finding. Available memory read **1114 MB of 7837**, and
**swap was 1018 of 1024 consumed.** The swap exhaustion is invisible in `docker stats`, which is what the
clerk had been reading all day; the estimate from container totals was about 1.2 GiB free and no swap
figure at all.
A sixth database container needs 1.3 to 1.4 GiB. So the block is real and it is worse than the number the
clerk had been quoting when waiving this lane five cycles running.
Five containers belong to other lanes and are holding worlds open for the walks C5 asks for. **None of
them is the clerk's to stop**, which is why this is a flag for the owner rather than a lane for an agent.
This is the concrete instance of `F-CAP-COUNTS-LANES`: the plan's cap counts lanes and the thing that runs
out is host memory.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `tear-down-after-walking`.**


===== F-SQL-SLOT-GATE-IS-ONLY-A-START-CONDITION  [Warn]
TITLE: the memory floor admits a run that then starves the host
plan.md loc: plan.md:32124
QUOTED TOKENS (occurrence counts at the tips):
  MemAvailable                                   fe=0    be=0    []
  95d8ca73                                       fe=0    be=0    []
  ec6e993f                                       fe=0    be=0    []
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: every SQL container this plan starts caps its own server memory, and two capped lanes are shown to coexist where two uncapped ones do not
- owner: @sven

**Found by the migration author while holding a slot legitimately.** The ~3 GiB free-memory rule is a **start**
gate and nothing more. That lane passed it at 3.22 GiB — and five minutes later two uncapped SQL Servers had
`MemAvailable` falling **0.6 GiB per minute**, roughly two minutes from an OOM-137 that would have killed the
sibling's run as well as its own.
**The fix is small, safe and general**: cap `max server memory` inside **your own** container, identified by
its Testcontainers **session id** rather than by name — the lane's was `95d8ca73`, the foreign one
`ec6e993f`. It touched nothing it did not create, a watchdog re-capped five fixtures, and it **cost nothing
measurable**: 41 minutes against a 51-minute baseline.
**What was actually measured is one *capped* lane coexisting with one *uncapped* foreign one** — foreign peak
3.75 GiB, `MemAvailable` floor ~0.96 GiB. *(Corrected on review: I wrote that two capped lanes coexist where two
uncapped ones do not. That is the expectation this flag's `clears_when` still has to show, and I had recorded
the clearing condition as an accomplished fact.)*
**Two conditions before this becomes general practice**, both from the review:
- **Derive the session id positively, from the lane's own Testcontainers process** — never by elimination. This
  lane identified its session as *"the one that is not the foreign ryuk"*; with three sessions on the host that
  mis-caps a sibling, which is the foreign-container mutation the estate's hard rule forbids.
- **Prefer a builder-time hard limit to a watchdog.** Each fresh fixture ran uncapped for up to ~30 seconds, and
  `max server memory` bounds the buffer pool rather than the process — capped containers still ran 2.0–2.2 GiB.
  The watchdog is a legitimate backstop, not the guarantee.


===== F-STALE-HUSKY-HOOK-BLOCKS-EVERY-COMMIT  [Warn]
TITLE: a stale husky hook cds into a path that exists in no checkout, so every commit needs --no-verify
plan.md loc: plan.md:32999
FILE REFS (resolved at the tips):
  git/hooks/husky.local.sh                                   ABSENT
BODY:
- clears when: .git/hooks/husky.local.sh either resolves in a normal checkout or is removed, and a commit succeeds without --no-verify
- owner: @sven


===== F-STALE-SECURITY-ARTIFACT  [Warn]
TITLE: a closed hazard is still recorded as open
plan.md loc: plan.md:26240
FILE REFS (resolved at the tips):
  artifacts/security/L-VIPPS-LOG-mutation.md                 be-exact
QUOTED TOKENS (occurrence counts at the tips):
  artifacts/security/L-VIPPS-LOG-mutation.md     fe=0    be=0    []
BODY:
- clears when: no committed security artifact describes a finding that has since been closed, or each such artifact carries the resolution beside it
- owner: @sven

`artifacts/security/L-VIPPS-LOG-mutation.md` still lists the request-body middleware as an **open, unfixed
finding**, and instructs the reader to *delete it, or record the decision to keep it*. It was deleted this
morning.
The lane that closed it **did not rewrite that file**, correctly — it is another lane's dated evidence, and
editing a receipt to match a later world is the shape this estate has spent all week refusing.
But the consequence is real in the other direction: **a future audit reads a closed hazard as live**, and
either re-opens work already delivered or, worse, trusts the artifact over the code. The fix is to record the
resolution beside the finding rather than in place of it.


===== F-STASH-IS-SHARED-ACROSS-WORKTREES  [Warn]
TITLE: a pop in one tree reaches another branch's week-old work
plan.md loc: plan.md:30774
BODY:
- clears when: no lane takes a baseline by stashing, or the plan records that the shared stash is understood and the practice is deliberate
- owner: @sven

**Found the hard way: `git stash` is a single shared stack across every worktree on this estate.** A lane
with nothing of its own popped, and **reached a stash left on a different branch on 2026-07-28** — a
conflict, not a clean restore. Nothing was lost and the entry survived, but only because the lane noticed.
**The habit it breaks is a common one.** Stashing to take a clean baseline, then popping to resume, is how
half the lanes here have measured a before-and-after. With roughly 124 worktrees sharing one stack, **that is
a coin flip against every other lane's leftovers**, and the failure arrives as a merge conflict in files the
lane never touched — which reads as somebody else's mess rather than as this.
**It is the same shape as the shared module tree and the shared hook directory:** a per-checkout tool that
turns out to be per-repository, invisible until two checkouts want it at once. **Three now.**
**The safe practice is a second worktree or a copy, not a stash** — and no lane should be told to take a
baseline any other way.
**A fourth member of this family, found 2026-08-05.** A lane's harness used a **fixed scratch path** rather
than a lane-local one, so **two lanes running it concurrently would restore each other's page backup over the
wrong tree.** Repaired by its finder.
**That makes four per-checkout tools that are actually per-repository or per-host:** the module tree, the hook
directory, the stash, and now a scratch path chosen by convention rather than by isolation. **The pattern is
worth naming as a class**, because each was found only when two things wanted it at once, and each failed as
somebody else's mess rather than as a tool.


===== F-SUBMODULE-DEINIT-IN-A-WORKTREE-DEREGISTERS-CORE-FOR-EVERYONE  [Warn]
TITLE: git submodule deinit core inside a worktree strips the url from the shared config, deregistering core for the owner
plan.md loc: plan.md:33278
BODY:
- clears when: worktree teardown guidance names rm -rf plus git worktree prune, and no lane runs submodule deinit against a shared config
- owner: @sven


===== F-SUITE-PINS-THE-CHECKOUT-NAME  [Warn]
TITLE: one suite is red in every lane worktree in the estate
plan.md loc: plan.md:28109
FILE REFS (resolved at the tips):
  test/journey-artifact-store.test.js                        fe-exact :295
  core-checkout.js                                           fe-suffix :74
QUOTED TOKENS (occurrence counts at the tips):
  test/journey-artifact-store.test.js:295        fe=2    be=0    ['lanes/L-CHECK-DISCOUNT-SUM-COUPLED/after-suite.txt']
  :457                                           fe=7    be=0    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
  /^Web-modules@/                                fe=7    be=0    ['lanes/L-XZ-RESIDUAL-SITES/mutation-log.md']
  test/journey-artifact-store.test.js            fe=24   be=0    ['test/e2e/support/artifact-store.js']
  test/e2e/                                      fe=133  be=5    ['nuxt.config.js']
  0cea96a                                        fe=0    be=0    []
  candidate/fe-compose-2026-08-05                fe=3    be=0    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  lane/collect-review-conditions                 fe=0    be=0    []
  lane/worktree-basename-pin                     fe=1    be=0    ['lanes/L-XZ-RESIDUAL-SITES/mutation-log.md']
  e34977a                                        fe=13   be=1    ['test/order-label-dictionaries.test.js']
  Web-modules                                    fe=78   be=15   ['test/journey-artifact-store.test.js']
  buildFromWorldStamp                            fe=4    be=0    ['test/world-stamp-windows.test.js']
  :311                                           fe=0    be=1    ['WebApi.Tests/Tripletex/TripletexSupplierInvoiceReadTests.cs']
  :366                                           fe=0    be=0    []
BODY:
- clears when: the journey artifact-store suite passes in a worktree whose directory basename is not Web-modules, shown by a run from a lane worktree
- owner: @sven

**Confirmed twice on 2026-08-04, by two lanes that did not know of each other's finding.**
`test/journey-artifact-store.test.js:295` and `:457` pin the **checkout's directory basename** — they
assert `/^Web-modules@/` — so the suite is red in **every lane worktree**, all of which are named for their
lane rather than for the repository.
**The cost is not the two failures; it is what they teach.** Every lane that runs the full frontend suite
sees two reds it did not cause, and must spend effort establishing they are pre-existing before it can
trust anything else it measured. Two lanes did exactly that today. A permanent red that everyone learns to
ignore is how a real red gets ignored too.
**Two corrections to the clerk's brief, both verified independently, 2026-08-05.** The suite is at
`test/journey-artifact-store.test.js` — **not** under `test/e2e/`, where there are zero hits. And the fix is
**not "on no tip"**: `0cea96a` is contained by `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`
and `lane/worktree-basename-pin`. **It is already in the composition candidate**, which changes what remains to
be done.
**The fix closes the condition and is a real fix rather than a relaxation, shown three ways.** At `e34977a` in
a foreign-named worktree the suite runs 2 failed / 36 passed of 38; at `0cea96a` in the same worktree, **38 of
38 — the total unchanged**, so nothing was dropped to reach green. And **38 of 38 again in a worktree named
literally `Web-modules`**, which rules out having merely moved which directory fails.
**The pin still bites, measured by mutation on production code with the fixed test in place.** Dropping the
checkout name from the build id reds 3; using an absolute path instead of the basename reds 2; making
`buildFromWorldStamp` return null — the artifact genuinely lacking its world stamp — reds 6. The first two match
the fix commit's own claimed counts exactly.
**What the diff actually does.** Two files, +181/−7, **no production code**. One derived constant replaces four
spelled literals, and at `:311` the old regex became a shape check **plus** an explicit equality against that
constant — **so the name is still asserted, only derived**, and not circularly, since the value under test comes
from the port holder's own working directory. `:366` was **vacuous in every lane worktree** and is now real.
**Residual, reported and not fixed:** `core-checkout.js:74-76` st


===== F-SURFBOARD-SAVE-CLEARS-TIPS  [Blocker]
TITLE: every save silently turns tipping off
plan.md loc: plan.md:32054
FILE REFS (resolved at the tips):
  surfboard.vue                                              fe-suffix
  StoreService.cs                                            be-suffix :1399
QUOTED TOKENS (occurrence counts at the tips):
  surfboard.vue                                  fe=5    be=3    ['test/store-config-full-replace.test.js']
  tipsEnabled                                    fe=2    be=1    ['test/store-config-full-replace.test.js']
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  StoreService.cs:1399                           fe=0    be=0    []
BODY:
- clears when: a save that does not intend to change tipping leaves the flag as it was, shown at the wire tier
- cleared by: L-DESTRUCTIVE-SAVES-LOAD-FIRST
- owner: @sven

**Verified end to end into the backend.** Every `surfboard.vue` save **omits `tipsEnabled`**, and OkamAPI at
`8e2b57de` binds the missing key to **false** (`StoreService.cs:1399`).
So each save silently turns tipping off for the venue. Nothing on screen changes, nothing errors, and the money
consequence lands on the staff rather than on the operator who pressed the button.
**Same species as the Dintero wipe**: a partial form posted as if it were the whole record. Two independent
instances make it a pattern worth a rule rather than two fixes.


===== F-SURVIVING-FIXTURE-SERVES-STALE-CODE  [Warn]
TITLE: a restart that silently fails to bind proves the old code
plan.md loc: plan.md:28250
QUOTED TOKENS (occurrence counts at the tips):
  L-JOURNEY-TEARDOWN                             fe=1    be=0    ['lanes/L-LIVE-WORLD-BANNER/evidence.md']
  nohup                                          fe=4    be=1    ['test/world-stamp-windows.test.js']
  lsof                                           fe=11   be=1    ['test/world-stamp-windows.test.js']
  reuseExistingServer                            fe=11   be=0    ['playwright.config.js']
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: a journey harness refuses to run against a fixture it did not start, or asserts the served build matches the working tree, shown by an arm where a stale fixture is left running
- owner: @sven

**Found by `L-JOURNEY-TEARDOWN` after the session outage, and it is the quietest failure on this page.**
Its `nohup` fixture and dev server **survived the kill**, so port 4973 was still serving **pre-fix code** —
and its restart **silently failed to bind**, because something already held the port. A run in that state
is green against the old build while the author believes it is testing the new one.
**Nothing warns.** There is no error: the fixture answers, the walk passes, the artifact records a
completed journey. It is the stale-binary trap that mutation proofs already guard against, one layer out —
the tree is fresh, the *server* is not.
**The lane handled it correctly, which is the pattern worth keeping**: it **verified ownership by cwd**
before touching anything, replaced only its own fixture, kept the warm build, and **left the orphaned npx
node it did not start alone.**
**Why this is a flag and not a note.** Several journey lanes ran through this outage window and each
restarted its own world. Any of them whose restart failed to bind the same way would have proved the old
code and reported green, and **nothing in the artifact would show it.** The cheap remedy is for the harness
to assert the served build against the working tree rather than to trust that a restart happened.
**Confirmed live, with a named mechanism and a named process, 2026-08-04 20:5x.** This is no longer a
hazard in principle: **PID 73160 has held port 4010 since 16:03 — five hours — serving from another lane's
worktree**, and `lsof` confirms it still listening.
**The mechanism is `reuseExistingServer`.** Playwright *silently adopts* whatever already holds the port,
so a run on default ports never starts its own fixture. There is no warning and no error — the harness
believes it launched a world it did not.
**The lucky failure is a 404 on a route that exists**, which is what the finding lane hit. **The unlucky one
is a walk that passes against stale code and reports green**, which nothing in the artifact would reveal.
**Two running journey lanes were warned immediately** and told to check which ports they actually used, to
re-run rather than reconcile if they used the defaults, and to name their ports in their returns.
**Nobody killed it** — it is not the clerk's to stop and the estate's rule holds — so the working practice
is: `lsof -nP -iTCP:<port> -sTCP:LISTEN` before bind


===== F-SV-NUMBER-PASSES-THE-FODSELSNUMMER-GUARD  [Blocker]
TITLE: the German label named the one value the server does not refuse
plan.md loc: plan.md:30106
QUOTED TOKENS (occurrence counts at the tips):
  MealsEmployeeReference.Normalize               fe=1    be=4    ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
BODY:
- clears when: an employee reference that is a foreign social-security number is refused or recorded as deliberately accepted, shown by an arm that submits a twelve-character reference and expects the refusal
- cleared by: L-EMPLOYEE-REF-REFUSES-ANY-NATIONAL-ID
- owner: @sven

**Found by a translation lane checking whether a string should exist before rewording it.** The surface
**forbids** a fødselsnummer rather than displaying one, so the German label was not a privacy leak — and then
the finding underneath it is worse than the label.
**`MealsEmployeeReference.Normalize` refuses eleven digits that pass both mod-11 control weightings** — which
is to say, **it refuses a fødselsnummer specifically.** A German *Sozialversicherungsnummer* is **twelve
characters and contains a letter**, so it fails that test, **passes the guard, and lands on statement lines the
service's own comment says are frozen by trigger.**
**So the German string warned against the one number the server does not refuse.** The label was wrong about
which identifier it named, and right that an identifier of that kind reaches the field.
**C1 is why this is a blocker rather than a validation nicety.** Those statement lines are append-only. **A
foreign identity number that gets in cannot be taken out** — the repair the situation would call for is the one
the guard forbids.


===== F-SYMLINKED-MODULES-COMPILE-THE-OTHER-TREE  [Blocker]
TITLE: a worktree build silently compiles the shared checkout
plan.md loc: plan.md:30553
QUOTED TOKENS (occurrence counts at the tips):
  node_modules                                   fe=37   be=6    ['nuxt.config.js']
BODY:
- clears when: no lane's build or journey evidence was produced in a worktree whose node_modules is symlinked to another checkout, or each such run is re-measured with the modules copied
- cleared by: L-WHICH-EVIDENCE-CAME-FROM-A-BORROWED-TREE
- owner: @sven

**Found by a lane correcting its own instrument, and it reaches far beyond that lane.** Symlinking
`node_modules` into a worktree makes **webpack resolve and compile the *shared* checkout's components**, not
the worktree's. The build reports success against a tree the operator is not looking at.
**It failed loudly only by luck** — one component happened to differ between the two trees. **Where the trees
agree, it is undetectable**, and the run reads as a clean pass of the worktree under test.
**Roughly a hundred worktrees in this estate symlink `node_modules`**, and it is the standard workaround for
`npm ci` being unsafe here — `node_modules` is shared, so `npm ci` deletes it out from under every other
checkout. So the workaround that protects the estate is the same one that invalidates the measurement.
**This is a measurement hazard, not a product defect, which is what makes it dangerous.** It cannot produce a
wrong build for a customer; it can only produce a **wrong receipt** — and receipts are what this plan runs on.
Every build-derived or journey-derived claim from a symlinked worktree is now of unknown provenance until
re-measured.
**The fix the finding lane used is cheap: an APFS clone (`cp -Rc`)**, which costs no disk until written and
gives the worktree its own module tree.
**One piece of collateral is recorded rather than hidden**: that run overwrote the shared build cache under
`node_modules`. It is gitignored and regenerable, and no tracked file was touched.


===== F-THE-ACKNOWLEDGE-BUTTON-CAN-CONFIRM-THE-NEXT-WEEK  [Blocker]
TITLE: with two unread publications the button that stays on screen belongs to the next row, so a second press confirms a different week
plan.md loc: plan.md:33313
BODY:
- clears when: a second press of the acknowledge control cannot acknowledge a publication the worker did not intend, shown by a walk with two unread publications
- owner: @sven


===== F-THE-ACKNOWLEDGEMENT-RECEIPT-IS-ONLY-PAGE-STATE  [Warn]
TITLE: the receipt is page state; the inbox carries no acknowledgement field and the route has no GET sibling, so a reload loses it
plan.md loc: plan.md:33308
BODY:
- clears when: a worker who acknowledged a week still sees the receipt after reloading the page, shown in a browser
- owner: @sven


===== F-THE-ADMIN-SCREEN-RENDERS-BOTH-NEW-CODES-AS-SOMETHING-WENT-WRONG  [Warn]
TITLE: two new newsletter refusal codes render as a generic error until ERROR_KEYS and three locale strings land
plan.md loc: plan.md:33318
BODY:
- clears when: an operator refused for unclosed markup or an empty body reads which of the two it was, shown in a browser
- owner: @sven


===== F-THE-BRANCH-EXISTS-ON-NO-REMOTE  [Blocker]
TITLE: a clone cannot check out the branch this whole program is on
plan.md loc: plan.md:30963
QUOTED TOKENS (occurrence counts at the tips):
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  main                                           fe=156  be=516  ['nuxt.config.js']
BODY:
- clears when: `feature/restaurant-modules` resolves on both remotes, shown by ls-remote naming it in each
- cleared by: L-CANNOT-BE-REBUILT-CENSUS
- owner: @sven

**`feature/restaurant-modules` exists on neither remote.** The clerk verified it directly and proved the check
working first, so the empty answer is an answer: a real clone stops at `pathspec did not match`, **before the
submodule pin and before any install.**
**This gate sits above three findings already recorded**, each of which was reached by reasoning past it. The
submodule pinned to no remote ref, the dependency lock that cannot be regenerated, the migration chain — **all
of them are downstream of a checkout that cannot happen.**
**135 frontend commits and 507 backend commits are on this laptop and nowhere else**, along with the pinned
submodule object and the entire plan directory. **A clone gets `main`, which builds and knows nothing about
any of it.**
**It is one push per repository**, which is why it is worth stating plainly rather than burying in a census: a
day's work by a dozen lanes is currently protected by a single disk.


===== F-THE-BRIEF-BOILERPLATE-TEACHES-THE-NO-OP-COMMAND  [Warn]
TITLE: the standard tier sentence in briefs is the bare root command that measures nothing
plan.md loc: plan.md:33293
BODY:
- clears when: the brief boilerplate names the test project or a WebApi.Tests working directory, so no lane is taught the no-op form
- owner: @sven


===== F-THE-CONFLICT-IS-A-DECOY  [Warn]
TITLE: the damaging half of a merge is the half that merges cleanly
plan.md loc: plan.md:28548
FILE REFS (resolved at the tips):
  Program.cs                                                 be-exact
  Helpers/ServiceCollectionExtensions.cs                     be-exact
QUOTED TOKENS (occurrence counts at the tips):
  L-CORS-LAND-FOLLOWUPS                          fe=0    be=0    []
  Program.cs                                     fe=31   be=88   ['test/world-stamp-windows.test.js']
  Helpers/ServiceCollectionExtensions.cs         fe=6    be=12   ['test/receipt-discount-row.test.js']
  WithExposedHeaders("ETag")                     fe=0    be=0    []
  BrowserReadableHeaders.All                     fe=1    be=3    ['lanes/L-WF-KODEOVERSIKT-UI/evidence.md']
  download                                       fe=56   be=38   ['playwright.config.js']
BODY:
- clears when: a landing lane's review checks the auto-merged files of a rebase and not only the conflicted ones, shown by a review naming a clean-merged file it inspected
- owner: @sven

**Predicted in outline and found to be worse in detail by `L-CORS-LAND-FOLLOWUPS`.** The brief warned that
resolving the `Program.cs` conflict carelessly would re-break download filenames. What actually happened:
**`Program.cs` conflicted exactly as forecast — and `Helpers/ServiceCollectionExtensions.cs` auto-merged
with no conflict at all**, silently carrying the lane's hardcoded `WithExposedHeaders("ETag")` on top of a
tip exposing `BrowserReadableHeaders.All`.
**So the conflict was a decoy.** The damage landed in the file git resolved without asking. **A reviewer who
inspected only the conflict resolution would never have seen it** — and inspecting the conflict is exactly
what a careful reviewer does.
**The regression it would have shipped**, proven by re-applying the naive resolution: **13 of 42 wire
assertions red**, reading `Expected ["Content-Disposition","ETag","X-Meals-C…"] / Actual ["ETag"]` across
SAF-T, invoices, receipts, credit notes, workforce exports and the Meals statement. That is **every download
filename silently becoming `download`**, plus the Meals content hash — the kind of defect that ships and is
noticed weeks later by a user, not by a suite.
**The lane also checked its own instrument**: it verified the restore had actually recompiled before
trusting the green, which is the stale-build trap this estate documents for precisely this red-then-green
procedure.
**The general rule this leaves behind:** on a rebase of a branch that forked before a shared helper existed,
**the files to audit are the ones git merged without asking.** A conflict announces itself; a clean merge of
a diverged helper does not.


===== F-THE-COVERAGE-CENSUS-AND-THE-PER-FILE-INSTRUMENT-DISAGREE-BY-ABOUT-DOUBLE  [Warn]
TITLE: the per-module census statement counts are roughly twice what the instrument reports per file
plan.md loc: plan.md:33428
BODY:
- clears when: the per-module census and a per-file jest coverage run report the same statement total for one named module, or the census records which instrument produced its figures
- owner: @sven


===== F-THE-DEFAULT-TEST-FILTER-CLAIMS-A-CONTAINER-SLOT  [Warn]
TITLE: two lanes started databases they had no grant for
plan.md loc: plan.md:30845
BODY:
- clears when: running the backend suite without an explicit SQL exclusion cannot start a container, or the exclusion is documented where a lane will read it before its first run
- owner: @sven

**Twice on 2026-08-05, a lane with no SQL grant started a database container by accident** — each time on a
first baseline run, and each time because the filter it reached for **swept the SQL-fixture classes** rather
than excluding them. Both disclosed it; the harness reaped the containers; nothing foreign was touched.
**The trap is that the safe form is the longer one.** Filtering by namespace is the obvious thing to type and
it is the wrong thing: the exclusion has to be added deliberately, and a lane that does not know to add it
finds out by watching a container appear.
**It matters more than tidiness on this host.** Two to three concurrent database containers is the measured
ceiling, one migration author and two SQL lanes is the standing cap, and this morning three containers left
over from earlier sessions were holding the whole estate. **An accidental fourth is not free.**
**And it costs the measurement, not just the slot.** Both lanes then saw SQL-tier reds they had no grant to
interpret — model-drift assertions in one case — and both correctly drew no conclusion. **A red nobody may
read is worse than no red**, because the next reader may not be as careful.


===== F-THE-EVIDENCE-PAGE-PROMISES-A-RECORD-IT-CANNOT-HAND-OVER  [Blocker]
TITLE: the training evidence page promises a record that can be presented at an inspection, and no export of any kind exists
plan.md loc: plan.md:33248
BODY:
- clears when: a person can produce the training evidence record as a file or a printed document from that page, shown in a browser
- owner: @sven


===== F-THE-EVIDENCE-SPLIT-POLICY-HAS-FLIPPED  [Info]
TITLE: about ninety lane evidence files landed on the trunk, reversing the split policy the first landing set
plan.md loc: plan.md:33183
BODY:
- clears when: the trunk either carries lane evidence deliberately with the reason recorded, or the split policy is restated and the inert files removed
- owner: @sven


===== F-THE-FIX-REPRODUCED-THE-DEFECT  [Info]
TITLE: a lane's own count made the same mistake it was fixing
plan.md loc: plan.md:9785
QUOTED TOKENS (occurrence counts at the tips):
  Success                                        fe=31   be=234  ['test/workforce-requests-page.test.js']
BODY:
- clears when: no lane's success criterion aggregates over a set wider than the thing it claims succeeded
- cleared by: L-ACCOUNTING-EXPORT-SILENT
- owner: @sven

**The clearest instance this program has produced of a defect surviving its own fix, and the lane reported
it rather than quietly correcting it.**
The defect: an accounting export reported a store count taken from **a different query** than the one that
did the exporting, so **the books went unposted while the job said it ran.**
The lane's first cut asserted the result list had three entries — which held **only because its own POS
double returned nothing.** Worse, and this is the finding: its success criterion aggregated `Success`
**over a merged list**, which **would have counted a store as exported on the strength of its Z-report
vouchers while its daily books went unposted.**
**That is the original defect, rebuilt inside the test written to catch it** — a success computed over a
set wider than the thing being claimed. The shape is identical: a number that is not wrong about what it
measured, measuring the wrong thing.
It split the two result sets, required the daily half non-empty and all-successful separately, and made
the fixture post POS vouchers for **deliberately not the set the daily export serves** — so the two can
never be confused again.
**Two smaller notes worth keeping from the same day.** Its mutant initially escaped its own dedicated test
because the refusal already failed that store, so it extended **the assertion** — a registered provider
that simply does not serve that store, no wiring gap and no refusal. And a sibling on the day settlement
found the reverse discipline: its first mutant **reds on the first assertion and cannot reach the ones
behind it**, so it wrote two more mutants rather than let later assertions ride on one that never ran.


===== F-THE-FIXTURE-MODELS-THE-OLD-ROLE-UPSERT  [Warn]
TITLE: the e2e fixture models PUT roles without the new key, so a double-submit journey would diverge from the backend
plan.md loc: plan.md:33223
BODY:
- clears when: the e2e fixture keys a role upsert the way the backend now does, shown by a fixture-driven double submit that leaves one row
- owner: @sven


===== F-THE-FRONTEND-COVERAGE-NUMBER-IS-AN-ARTIFACT  [Blocker]
TITLE: vue-jest instruments nothing indented, so the published frontend coverage measures import lists only
plan.md loc: plan.md:33198
BODY:
- clears when: an indented statement inside a .vue script block is counted by the coverage run, shown by a probe that reds against the current instrumentation
- owner: @sven


===== F-THE-GATE-SENTENCE-PRINTS-BLANK-FROM-THE-BROWSER-MENU  [Info]
TITLE: printing from the browser's own menu in the gated state yields a blank sheet
plan.md loc: plan.md:33283
BODY:
- clears when: the gate sentence appears on paper when printed from the browser menu, or the blank result is recorded as acceptable
- owner: @sven


===== F-THE-OFFER-PAGE-BUILDS-ERROR-COPY-IT-NEVER-RENDERS  [Warn]
TITLE: errorCouldNotLoad and errorNoOrderNumber are assigned and reach no pixel
plan.md loc: plan.md:33408
FILE REFS (resolved at the tips):
  pages/offer/_code.vue                                      fe-exact
BODY:
- clears when: every error string assigned on pages/offer/_code.vue is rendered somewhere the guest can see, or is deleted, pinned by a test
- owner: @sven


===== F-THE-PRESCRIBED-WORKTREE-TEARDOWN-DESTROYS-SUBMODULE-COMMITS  [Blocker]
TITLE: a submodule inside a linked worktree keeps its objects under that worktree, so rm -rf plus prune deletes them
plan.md loc: plan.md:33448
QUOTED TOKENS (occurrence counts at the tips):
  core                                           fe=229  be=168  ['nuxt.config.js']
  Okam-AS/Web-modules                            fe=0    be=0    []
  Okam-AS/Core.git                               fe=2    be=3    ['.gitmodules']
  9626a561                                       fe=6    be=1    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/frontend-tier.txt']
  a6ae241                                        fe=0    be=0    []
BODY:
- clears when: every brief that permits editing core/ names the bundle-before-teardown step, checked by grep across docs/plan/briefs/
- owner: @sven

**Verified by the clerk 2026-08-07, independently of the lane that reported it.**
`git ls-tree feature/restaurant-modules core` records
**`160000 commit 9626a561bb0442b0aed026be75b7f9419337ac6d`**. `git ls-remote origin` inside `core` returns
**11 refs**, and `git branch -r --contains 9626a561` returns **empty** — the pin is on **no remote branch**.
Its own subject is **`wip: the full-replace guard and its wiring, saved before any composition`**.
**So the frontend trunk pins a local WIP commit.** A fresh clone of `Okam-AS/Web-modules` plus
`Okam-AS/Core.git` cannot check out a working tree, which is why every brief in this program carries a
local-path fetch remedy — **the remedy has been treating the symptom of this for weeks.**
**Two consequences worth stating plainly.** The pin exists on this machine and nowhere else that has been
demonstrated, so **the trunk is one disk failure from unbuildable**. And any real push is **two repos and
at least two commits, core first** — `9626a561` before anything stacked on it.
**A lane has now stacked a second commit on it**: `core` `a6ae241`, whose parent is exactly this pin.


===== F-THE-SUITE-IS-RED-ON-A-FAITHFUL-CLONE  [Warn]
TITLE: two tests pin the directory the repository is not named
plan.md loc: plan.md:30986
BODY:
- clears when: the frontend suite passes in a checkout named as the repository clones, or the directory-name dependency is recorded as deliberate
- cleared by: L-CANNOT-BE-REBUILT-CENSUS
- owner: @sven

**Two assertions pin the checkout's own directory name**, and the repository does not clone to that name — so
**a faithful clone fails them**, and every worktree in this estate does too.
**Proven by isolating the one variable**: rename the tree and they pass; rename it back and they red. **A
fifth failure sits beside it** in the journey suite, where the configuration excludes a tag in one mode and
nothing in the other, so one walk meets a fixture serving a fraction of its rules.
**Neither has ever been caught because no workflow runs either suite.** That is the standing blocker one layer
up, and this is the first measured consequence of it: **two reds that every lane has learned to step over,
recorded nowhere until a clone was actually attempted.**


===== F-THE-TRUNK-DEPENDS-ON-A-CORE-COMMIT-THAT-EXISTS-ONLY-ON-THIS-MACHINE  [Blocker]
TITLE: core pin 9626a561 is absent from Okam-AS/Core.git, so the frontend trunk is unbuildable from the remotes alone
plan.md loc: plan.md:33443
BODY:
- clears when: git fetch origin 9626a561 succeeds inside core against Okam-AS/Core.git without the local-path remedy
- owner: @sven


===== F-THE-WEEK-RUN-JOURNEY-STILL-PUBLISHES-ONE-WEEK  [Warn]
TITLE: the week-run journey publishes one week, so the two-publication ordering defect has no e2e pin
plan.md loc: plan.md:33368
BODY:
- clears when: the week-run journey publishes two weeks and pins that confirming one does not confirm the other
- owner: @sven


===== F-THREE-BRANCHES-CARRY-ONE-GROWTH-CATCH-FIX  [Warn]
TITLE: one fix exists on three unpushed branches and only one of them applies to the current trunk
plan.md loc: plan.md:33089
BODY:
- clears when: lane/growth-sql-catch-typed c7912d49 and lane/newsletter-dispatch-reports-its-cause 33a99ac4 are retired unlanded, and d74c2c87b is the only ref carrying the typed catch
- owner: @sven


===== F-THROW-50018-ALREADY-SPENT  [Blocker]
TITLE: the ledger tells the next author to take a number that is taken
plan.md loc: plan.md:29497
QUOTED TOKENS (occurrence counts at the tips):
  20260731220005_Workforce_IdentityCodeRegisterI fe=0    be=4    ['Migrations/20260801084923_Margin_PeriodStatementFinalizedImmutable.cs']
  D-INTEGRATION-FASTFORWARD                      fe=0    be=0    []
  F-MIG-LEDGER-THROW-NUMBER-WRONG                fe=0    be=0    []
BODY:
- clears when: no ledger copy names a THROW number as next-free that a migration on the integration branch already consumes
- cleared by: L-LEDGER-NUMBERS-ARE-FREE
- owner: @sven

**`20260731220005_Workforce_IdentityCodeRegisterIssues` is on the integration branch and consumes `THROW
50018`.** The integration copy of the ledger, at MIG-14 line 291, **still instructs an author that 50018 is the
next free number.**
**The integration copy cannot self-correct, because nothing points at that migration** — it carries no MIG
number in either copy, which is the *present-and-unnumbered* class. **A document is wrong about a scarce
resource and the thing that would correct it is invisible to it.**
**The stack copy already carries the fix, and it is on the forked side** — 34 commits away from the branch an
author reads. So the correction exists and cannot be reached without the hand merge
`D-INTEGRATION-FASTFORWARD` now turns on.
**This is the second wrong scarce-number claim in the same document** — `F-MIG-LEDGER-THROW-NUMBER-WRONG`
records the first, a stated ceiling six above the real one. **A ledger consulted *because* it is the authority
on scarce numbers is wrong about two of them.**


===== F-TIERS-NEVER-RAN-AT-THE-NEW-TIPS  [Blocker]
TITLE: both trunks moved and neither tier was run at the new tip
plan.md loc: plan.md:33233
BODY:
- clears when: the frontend jest run and the backend non-SQL tier are recorded at 3ff7f07 and a9837ca92 with every failure accounted for against the 3563 and 4832 baselines
- owner: @sven


===== F-TRAIN-DISCLOSURE-EVIDENCE-IS-AN-ABORT  [Blocker]
TITLE: the receipt is the crash it should have reported
plan.md loc: plan.md:31971
QUOTED TOKENS (occurrence counts at the tips):
  L-TRAIN-DISCLOSURE                             fe=0    be=0    []
  after.trx                                      fe=0    be=1    ['lanes/L-TRIGGER-DECLARATIONS-REFRESHED/evidence.md']
  RunInfo                                        fe=0    be=4    ['artifacts/tests/BASE-8e2b57de-sql-allfailing.trx']
  ObjectDisposedException                        fe=0    be=4    ['WebApi.Tests/Meals/MealsPoisonedModuleGraph.cs']
  Xunit.Sdk.AllException.get_Message             fe=0    be=0    []
  Assert.All                                     fe=0    be=111  ['WebApi.Tests/AnalyticsToolRunnerTests.cs']
  endTime                                        fe=13   be=18   ['test/reservations-combined-table-conflict.test.js']
BODY:
- clears when: L-TRAIN-DISCLOSURE cites a trx that completed, over the tests its own commit adds
- cleared by: L-TRAINWIRE-ABORT
- owner: @sven

**Measured by derivation over all 20 trx-citing items, 2026-08-06.** `L-TRAIN-DISCLOSURE` claims 14 tests,
its cited `after.trx` holds **3**, and 11 are absent — **unrun, not filtered**: none carries a trait, the run
holds **0 of the tree's 558 SqlServer-trait tests**, and 96 sibling Training rows did run.
**The artifact is an aborted run.** `ResultSummary outcome="Failed"` against `Counters failed="0"`, 962 of
roughly 4,400 rows, 87 seconds, with `RunInfo` naming a test-host crash — `ObjectDisposedException` inside
`Xunit.Sdk.AllException.get_Message`, an `Assert.All` whose own failure formatting threw.
**So the tier aborted because of the very defect the lane introduced, and the aborted artifact was then cited
as proof the work was sound.** The last eight results by `endTime` are all in that lane's own new class.
**Nothing in the evidence line or the lane body discloses any of it.** The trx says so in two places and
nobody read either.
The filtered-versus-unrun distinction was load-bearing rather than pedantic: a first pass ignoring run mode
scored **14 false shortfalls** across three other lanes, each of which turned out to cite a second tier that
does contain its tests, in both directions.


===== F-TRAIN-DISCLOSURE-UNREADABLE  [Warn]
TITLE: the access ledger is written and nobody can read it
plan.md loc: plan.md:28520
FILE REFS (resolved at the tips):
  pages/admin/training-courses.vue                           fe-exact :526
  pages/admin/workforce-me.vue                               fe-exact :364
  utils/training/training-client.js                          fe-exact :395
QUOTED TOKENS (occurrence counts at the tips):
  L-TRAIN-EVIDENCE-PACK-UI                       fe=0    be=0    []
  pages/admin/training-courses.vue:526           fe=0    be=0    []
  pages/admin/workforce-me.vue:364               fe=0    be=0    []
  utils/training/training-client.js:395          fe=0    be=0    []
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  evidence.read                                  fe=13   be=4    ['test/training-disclosure.test.js']
BODY:
- clears when: a person can see who has opened their own training record, shown by a browser journey reaching the disclosure list
- cleared by: L-TRAIN-DISCLOSURE-READ
- owner: @sven
- blocks: L-TRAIN-DISCLOSURE-READ

**Found by `L-TRAIN-EVIDENCE-PACK-UI` while building the surface beside it, and verified independently by
the clerk before recording.**
`GET /training/stores/{storeId}/evidence/disclosures` is called from **two** places —
`pages/admin/training-courses.vue:526` and, tellingly, `pages/admin/workforce-me.vue:364`, **the worker's
own page** — through `utils/training/training-client.js:395`. **There is no handler for it anywhere at the
integration tip `8e2b57de`.**
**So the ledger is being written while no subject can read who opened their record.** The write half is
real and was proved four ways by the finding lane: every evidence read appends an `evidence.read` row with
a resolved actor, a second read appends a second row, and a refused read appends none.
**That asymmetry is the defect.** An access log nobody can read is a control that exists for the operator
and not for the person it is about — and it is the worker's own page that calls the missing route, so the
intended reader is unambiguous.
**It is C3 in its purest form**: a client method, two call sites and a documented route number, with no
handler behind any of it. The finding lane's copy deliberately makes **no promise on that route's behalf**,
which is why nothing on screen is a lie today.


===== F-TRAIN-EVIDENCE-SERVICE-UNCENSUSED  [Blocker]
TITLE: two audit-stamping services the census never named, in two modules
plan.md loc: plan.md:27734
FILE REFS (resolved at the tips):
  Services/Training/TrainingEvidenceService.cs               be-exact :274
  Services/Meals/MealsFundingAuthority.cs                    be-exact :251
QUOTED TOKENS (occurrence counts at the tips):
  Services/Training/TrainingEvidenceService.cs:2 fe=0    be=0    []
  Services/Meals/MealsFundingAuthority.cs:251    fe=0    be=0    []
  MealsAuditEntry                                fe=0    be=14   ['WebApi.Tests/Meals/MealsPoisonedModuleGraph.cs']
BODY:
- clears when: every production type that writes an audit entry is named in the census for BOTH Training and Meals, shown by a derivation that reds when one is missing and when one is added
- cleared by: L-CENSUS-DERIVES-ITS-FLOOR
- owner: @sven
- blocks: FT-GROWTH

Found the moment the census stopped **carrying** its floors and started **deriving** them: the stored
numbers said ten sites, four resolvers, four files; the tree has **eleven sites, five resolvers, five
files.**
The extra is **a Training service that stamps audit entries and the census never named it.** So the module
reported full coverage of a set that was missing a member — which is the precise failure a floor is supposed
to prevent, produced by the floor itself.
**Nobody would have found this by reading**, because the census was internally consistent: its list and its
count agreed with each other. **Only a second, independent derivation could disagree with it.**
**Corrected 2026-08-06 by the lane that built the derivation: it is two modules, not one.** Measured twice at
the same tip by two scanners sharing no code, agreeing on all 21 rows.
- **Training** holds 11 sites over 5 files against a floor of 10/4 — `Services/Training/TrainingEvidenceService.cs:274`.
- **Meals** holds 15 sites over 7 files against a floor of 14/6 — `Services/Meals/MealsFundingAuthority.cs:251`, which
  stamps a `MealsAuditEntry` whose own comment calls it *"the only artefact this write leaves that can name who made
  the company liable"*. **That is a C4 money-path attribution row**, which makes the Meals instance the more serious of
  the two and the one nobody had recorded at all.
**And the old comparison could not have failed either way.** `>=` and `Contains` are one-directional, so no addition
can red them — and the slack an addition opens then absorbs a deletion.
**Corrected on review, because the record is what a later reader trusts: only the addition shipped.** Both uncensused
services are real and present at this tip. The **deletion** direction was *demonstrated by mutation*, not shipped —
and demonstrated on the genuine drift, by deleting a site into exactly the slack the addition had opened, with the
old instrument staying green at 38/38.


===== F-TRAIN-IK  [Info]
TITLE: Training carries no internal-control surface, so the word cannot be printed
plan.md loc: plan.md:26024
BODY:
- clears when: fact:train.checklists is present
- owner: @sven

The claim was taken off the UI on 2026-07-30, which is the mitigation. HACCP and food traceability are
absent from the whole estate, not only from Training.


===== F-TRAIN-INVISIBLE-ON-A-FRESH-STORE  [Blocker]
TITLE: the walk asserts a regime a new venue cannot be in
plan.md loc: plan.md:31148
BODY:
- clears when: the training walk opens on a state a fresh venue can actually reach, or the plan records that its opening regime requires seeded data and why that is acceptable
- cleared by: L-LIVE-WALK-TRAINING
- owner: @sven
- blocks: L-LIVE-WALK-TRAINING

**The fixture answers the context read 200 unconditionally; the product answers it only when the module is
switched on or a training row already exists.** A live world provides neither, so **the walk reds at step one**
— the gate panel renders and the walk asserts the gate is absent.
**And that is the walk's thesis, not a seed gap.** Its next steps assert **visible, both flags off, and a
refusal** — the disabled-after-data regime, which **a fresh venue cannot be in**, because visibility needs
data, data needs a write, and a write needs the flag.
**The walk already contains the honest version of itself**: its last step turns a flag off and proves the rows
survive. So the amendment is **shorter than what is there** — open on the never-enabled refusal, or move the
read-only demonstration after the first course.
**It must not be closed by seeding a training row into the world script.** That would manufacture **a store no
venue can be**, and the whole value of a live walk is that it cannot.


===== F-TRAIN-NO-EVIDENCE  [Warn]
TITLE: the inspector evidence pack has a full test suite and no endpoint
plan.md loc: plan.md:26131
QUOTED TOKENS (occurrence counts at the tips):
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: the evidence projection is served by a route, proven at the wire tier with an authorization matrix
- owner: @sven

A competency register whose evidence cannot be produced for an inspector is a binder with no pages.
The projection, its golden pack and a probe pinning the absent surface all exist; only the route does
not. The absence is recorded as an assembly-level fact rather than hidden, which is why this
is warn and not blocker.
**Stale as written, 2026-08-03, and it should be restated rather than retired.** It says there is no
endpoint. **The route landed** — its `clears_when` is met on the backend, and two lanes said so in their
returns before this one.
**The live gap is the inverse of what this flag describes: a caller gap, not a route gap.** The pack is
served and nothing in the product calls it. A flag that names the wrong half will be closed against the
wrong evidence — which is how eleven blockers today came to describe defects that no longer existed.


===== F-TRAIN-PERSONREF-LEAK  [Warn]
TITLE: a person reference resolves to a name with no store predicate
plan.md loc: plan.md:26404
BODY:
- clears when: the display-name resolution is scoped to the requesting store, or the cross-store resolution is ruled acceptable and the reason recorded
- owner: @sven

Found while landing the inspector evidence read. The display name and on-file check resolve **without a
store predicate** — deliberate and pinned, so it is a choice rather than an oversight, but the
consequence is that any store admin holding a person reference can turn it into a real person's name,
including a person who has never worked for them. The rest of the module's isolation is the strongest
in the estate, which is what makes this one worth ruling rather than assuming.


===== F-TRAIN-TRUNCATE  [Info]
TITLE: the deviation history can be emptied without firing its trigger
plan.md loc: plan.md:26528
QUOTED TOKENS (occurrence counts at the tips):
  TRUNCATE                                       fe=1    be=3    ['components/admin/pos/PosTopBar.vue']
BODY:
- clears when: the application principal is denied the permission TRUNCATE requires, and the deploy story records it
- owner: @sven

The deviation-events table deliberately takes no foreign key, which is what closes FK-before-trigger
masking — and is also precisely what makes `TRUNCATE` legal on it. TRUNCATE does not fire AFTER
triggers, so it would empty an append-only history while every catalog pin stayed green. It needs the
same permission class as dropping the trigger, so this is a deployment posture rather than a code
defect, but unlike a drop it leaves no trace in the guards.


===== F-TRAINING-COMPLETIONS-NEVER-NAME-THE-COURSE  [Warn]
TITLE: the completions table course column is empty on every row of every world
plan.md loc: plan.md:33079
BODY:
- clears when: a completion row on the Training admin surface renders the course it completed, shown in a browser
- owner: @sven


===== F-TRAINWIRE-TIER-ABORTS  [Blocker]
TITLE: a failing assertion killed the host that was formatting its failure
plan.md loc: plan.md:31446
FILE REFS (resolved at the tips):
  TrainingWireTests.cs                                       be-suffix
QUOTED TOKENS (occurrence counts at the tips):
  06b8b582                                       fe=0    be=0    []
  TrainingWireTests                              fe=2    be=16   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles.txt']
  [Fact]                                         fe=1    be=721  ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/landing-receipt.md']
  ObjectDisposedException                        fe=0    be=4    ['WebApi.Tests/Meals/MealsPoisonedModuleGraph.cs']
  JsonDocument                                   fe=0    be=46   ['WebApi.Tests/DinteroServiceTests.cs']
  JsonElement.ToString                           fe=0    be=0    []
  Xunit.Sdk.AllException.get_Message             fe=0    be=0    []
  TestFailed                                     fe=0    be=0    []
  AllException                                   fe=0    be=0    []
  ContainsException                              fe=0    be=0    []
  Assert.All                                     fe=0    be=111  ['WebApi.Tests/AnalyticsToolRunnerTests.cs']
  WireHostFixture:766                            fe=0    be=0    []
  actorIsSubject                                 fe=6    be=0    ['test/training-disclosure.test.js']
  TrainingWireTests:1031                         fe=0    be=0    []
BODY:
- clears when: the non-SQL tier at the disclosure merge completes with a counted triple and no aborted run, shown by a trx whose ResultSummary agrees with its Counters
- cleared by: L-TRAINWIRE-ABORT
- owner: @sven

**Reproduced before anything was changed**, at a clean checkout of `06b8b582` (OkamAPI) with no merge in
front: **3155 passed / 0 failed / 10 skipped, then `Test Run Aborted`** — zero failures recorded and roughly
1,200 tests never reached. A six-second reproduction narrows it: `TrainingWireTests` declares **26 `[Fact]`**
and the trx holds **15**.
**The assertion did fail. The crash is xunit formatting that failure afterwards** —
`ObjectDisposedException` on a `JsonDocument` at `JsonElement.ToString`, inside
`Xunit.Sdk.AllException.get_Message`, reached while the runner constructs `TestFailed`. **`AllException`
formats lazily where `ContainsException` formats in its constructor, so only `Assert.All` is fatal.**
**The claim over-reached as well as crashing**: the subject is claimed by an outsider
(`WireHostFixture:766`), two sibling tests read the log as that subject, and their rows carry
`actorIsSubject` true. Shown by order rather than argued — **the last test recorded before the abort is the
sibling that writes the subject row.**
**The abort was hiding a second red.** With the host no longer dying, `TrainingWireTests:1031` finally runs
and fails: it asserted every `evidence.read` for the subject was AdminA's, while a sibling **deliberately** has
AdminB read that person in another store. Same defect shape — an all-rows claim over a shared fixture — the
ledger is right and the assertion over-claimed. **That is a third change beyond the two named**, kept as a
separable hunk and repaired rather than silenced, and the repair is strictly stronger: it proves the request
adds exactly one row.
**The landing is unblocked, measured on the merge itself.** `TrainingWireTests.cs` is byte-identical at
`06b8b582` and at the disclosure merge `f4407595` (same blob), so the fix was applied there and the tier run:
**4650 passed / 0 failed / 12 skipped, completes.** That is the number the gate was actually about.
**Mutation is the cleanest artifact**: forcing `ActorIsSubject` true makes the *same* assertion fail, and the
run now finishes at 24/2/26 and **names it** — where before, that exact failure took the host down.
**One correction to my own exit rather than a fail-spec**: I asked for a trx enumerating 4650 tests at
`06b8b582`, but that tree holds **4393**. 4650 belongs to `8e2b57de`, 59 commits ahead. The substance —
completes, nothing left unrun — is met 


===== F-TRANSLATION-MERGE-DUPLICATES-A-KEY-SILENTLY  [Blocker]
TITLE: nine merges that leave the same key twice, and two of them are money
plan.md loc: plan.md:29877
QUOTED TOKENS (occurrence counts at the tips):
  lane/fe-events-margin-surfaces                 fe=0    be=0    []
  lane/mrg-waste-frontend                        fe=0    be=0    []
BODY:
- clears when: a merge that would leave a key twice in a translations object literal is refused or reported, shown by a check that reds on a tree carrying a duplicate
- owner: @sven

**Proven by simulation rather than asserted: 87 file merges run with `git merge-file`, and 9 of them merge
clean while leaving the key in the object literal twice.** No conflict, no error, and **JavaScript takes the
later entry.** That is silent last-writer-wins, and it was validated on a positive — two occurrences at known
lines, zero conflict markers, the control key appearing once.
**Two of the nine are money keys whose variants say opposite things.** On `lane/fe-events-margin-surfaces`, one
reading tells an operator the week **was not frozen** and the other that the figures **are a floor, short by an
unknown amount**. A third, on `lane/mrg-waste-frontend`, states a **validation contract two ways** — must be
greater than zero, or may be left empty.
**And which side wins is decided by line position, not by which side is incoming.** The two money cases
**resolve in opposite directions.** So there is no rule of thumb available and no way to reason about the
outcome without simulating the merge.
**Latent rather than fired: no ref carries a duplicate today.** It is a property of merges nobody has performed
yet, which is exactly when it is cheap to prevent and exactly when nobody looks.


===== F-TRANSLATION-STALE-BUT-PRESENT  [Warn]
TITLE: a key in all three locales saying three different things
plan.md loc: plan.md:30017
FILE REFS (resolved at the tips):
  GoodsGroupsTab.vue                                         fe-suffix :10
QUOTED TOKENS (occurrence counts at the tips):
  posset_goods_hint                              fe=4    be=0    ['components/admin/pos-settings/GoodsGroupsTab.vue']
  index_specialDays_*                            fe=0    be=0    []
  GoodsGroupsTab.vue:10                          fe=0    be=0    []
  wfpl_business_mixed                            fe=4    be=0    ['components/admin/workforce/WorkforcePersonnelListSheet.vue']
  receiptModal_orgNumber                         fe=5    be=0    ['test/e2e/journeys/modal-estate-scroll-lock.spec.js']
  mrg_sup_org_number                             fe=4    be=0    ['pages/admin/margin-suppliers.vue']
BODY:
- clears when: no key present in every locale carries a Norwegian value that has gained meaning the others lack, or each such divergence is recorded with the reason
- owner: @sven

**Found by the lane that closed the missing-key gap, and it is the worse class.** `posset_goods_hint` exists in
all three locales — the clerk confirmed 1/1/1 — and **the Norwegian gained "og styrer MVA" while English and
German did not.** So an English operator is **never told that goods groups set the tax.**
**It has no visual tell at all.** A missing key falls back and renders Norwegian to a German operator, which
looks wrong and invites a question. **A stale key renders fluent English that is quietly incomplete**, and
nothing on the screen or in any check distinguishes it from a correct sentence.
**No claimant contests it either**, so it will not surface at a merge. It survived the key-parity work because
parity compares which keys exist, not what they say.
**The same mechanism is live on the admin dashboard** for the sixteen `index_specialDays_*` keys.
**This is the third shape in the same family in two days** — a key missing, a key duplicated, and now a key
present and stale. Only the first two are detectable by anything currently in the tree.
**The answer is exactly one key, and the method is worth more than the answer.** Of the 4,782 keys present in
all three locales, **only `posset_goods_hint` carries Norwegian meaning the others lack** — and it is stale in
**both**. It renders at `GoodsGroupsTab.vue:10`. **The sharpest form of the finding: 46 tri-present keys name
MVA in Norwegian, 45 have a target naming VAT or MwSt., and that one has neither.**
**The obvious method was refuted before any negative was reported.** A structural sweep on length ratio,
sentence count, numerals, clauses and a statute regex flagged 25 keys at **precision 0 of 25** — and **missed
the known positive entirely**, because `posset_goods_hint` scores zero on every structural signal at an English
length ratio of 1.148, ordinary for this corpus. What worked was a lexicon **mined from the 4,782 aligned
triples themselves** plus a consequence glossary: **recall 1 of 1 at precision under one percent** — a recall
instrument with a hand-read tail, and **454 keys read by hand.** Coverage 3,315 of 3,329 comparable; the 366 no
instrument could judge are **all 37 characters or shorter**, so nothing large enough to hide a clause went
unswept.
**Two corrections to the clerk's brief, both narrowing.** The sixteen `index_specialDays_*` keys are **16/0/0**
— the *missing* shape, already inside the siblings' 35-k


===== F-TRANSLATIONS-ARE-A-CHOKE  [Warn]
TITLE: three shared files nobody can safely commit
plan.md loc: plan.md:9635
QUOTED TOKENS (occurrence counts at the tips):
  L-MRG-RECIPE-REVISE-UI                         fe=0    be=0    []
  translations/{no,en,de}.ts                     fe=4    be=2    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
  L-MRG-REVISE-LAND                              fe=0    be=0    []
  0c483de                                        fe=0    be=0    []
  c429d51                                        fe=0    be=0    []
  5ad0ca0                                        fe=0    be=0    []
  mrg_revise_*                                   fe=0    be=0    []
  mlst_                                          fe=7    be=0    ['test/meals-statement-view.test.js']
  mrgs_                                          fe=17   be=0    ['test/margin-statements-page.test.js']
  nav_meals                                      fe=5    be=1    ['test/meals-components.test.js']
BODY:
- clears when: every lane's translation work is committable without sweeping a sibling's, and no lane reports finished work it could not commit
- cleared by: L-MRG-RECIPE-REVISE-UI
- owner: @sven

**`L-MRG-RECIPE-REVISE-UI` finished its work and could not commit it.** Verified: all three of
`translations/{no,en,de}.ts` are modified in the shared checkout by siblings, and **no pathspec commit is
safe without sweeping somebody else's edits.** So a lane's completed, mutation-proven work sits
uncommitted in a worktree.
**This is the estate's rules working correctly and producing a jam.** Commit by pathspec, never
`git add -A`, never clean what you did not dirty, never bulk-edit these three files — every one of those
is right, and together they mean the busiest shared files in the frontend have no safe write path once two
lanes want them in the same hour.
**The reason the no-bulk-edit rule exists is not negotiable**: a conflict resolved that way once shipped
the app with **no client bundle**. So the fix is not to relax it.
The consequence to hold on to: **uncommitted work is the most fragile state in this program.** A killed
session recovered ten lanes from committed branches today; the one thing that recovery could not have
saved is a worktree nobody had committed.
Options worth ruling: a per-lane translation fragment merged at land time; a lane-owned lock on the three
files; or an explicit convention that a lane commits its translation lines **and** the siblings' lines it
found, naming them — which is honest but makes every lane a partial merge of every other.
**A way through it was found on 2026-08-04, and it is recorded here because it departs from what this flag
told lanes to do.** `L-MRG-REVISE-LAND` was briefed to leave all translation work alone. Measured, that
made its exit unreachable: the 36KB test reads the translation tables directly at lines 824-835, so at the
translation-free commit `0c483de` the suite is **49/51 with exactly those two tests red**.
**So it landed the translations as a second, separate commit** — `c429d51`, sixteen lines per locale and
nothing else — and wrote down the undo: `git update-ref refs/heads/lane/mrg-recipe-revise-ui 0c483de`
restores the briefed boundary exactly.
**The rule was respected rather than relaxed, which is the part worth keeping.** The hunk was built against
`5ad0ca0`'s **committed** file through a temporary index — never the dirty working tree — and its extractor
refuses unless every hunk is a pure addition, hunk 1 holds exactly the fourteen `mrg_revise_*` keys the
lane's evidence claims, no `mlst_`, `mrgs


===== F-TRIPLETEX-CALL-BUDGET-UNDERCOUNTS-THE-WORST  [Warn]
TITLE: CASE
plan.md loc: plan.md:32965
FILE REFS (resolved at the tips):
  TripletexSettings.cs                                       be-suffix :57
QUOTED TOKENS (occurrence counts at the tips):
  f3817eed9                                      fe=0    be=2    ['lanes/L-BACKEND-PATCHES-ARE-APPLIED/evidence.md']
BODY:
- clears when: the per-call budget in TripletexSettings.cs:57 is derived from the worst-case call count rather than a count that can be exceeded, or a recorded ruling says the safe-direction error is accepted
- owner: agent

Raised by the pre-merge reading of `f3817eed9`, which ruled that commit **land-as-is** and recorded this
beside the ruling rather than as a reason to hold it. **The error is in the safe direction** — the budget
is smaller than the worst case, so the claim window closes early rather than late — and the reviewer
named the exact tightening. It is here so it cannot be lost between a landing and the next author.


===== F-TRIPLETEX-CALL-BUDGET-UNDERCOUNTS-THE-WORST-CASE  [Warn]
TITLE: the Tripletex per-call budget undercounts the worst case
plan.md loc: plan.md:32984
FILE REFS (resolved at the tips):
  TripletexSettings.cs                                       be-suffix :57
BODY:
- clears when: the per-call budget in TripletexSettings.cs:57 is derived from the worst-case call count, or a recorded ruling accepts the safe-direction error
- owner: @sven


===== F-TRIPLETEX-CLAIM-EXPIRES-MID-CALL  [Blocker]
TITLE: a rate limit, not an operator, opens a double-voucher path
plan.md loc: plan.md:32155
QUOTED TOKENS (occurrence counts at the tips):
  PostAsync                                      fe=1    be=63   ['test/tripletex-run-outcome.test.js']
  Pending                                        fe=52   be=307  ['test/check-discount-sum.test.js']
  MaxRateLimitRetries                            fe=0    be=5    ['WebApi.Tests/Tripletex/TripletexClientTests.cs']
  externalVoucherNumber                          fe=1    be=5    ['pages/admin/tripletex.vue']
BODY:
- clears when: a claim cannot expire while the run holding it is still posting, shown by a test that reds when the threshold is shorter than the client's retry budget
- cleared by: L-TRIPLETEX-CLAIM-OUTLIVES-ITS-CALL
- owner: @sven

**Found by the lane sent to check a label that turned out to be honest. This is the defect that was actually
there.**
`PostAsync` re-claims a `Pending` row once it is **10 minutes** old. Inside that same window it makes **two**
Tripletex HTTP calls, and the client sits on a 429 for `MaxRateLimitRetries` attempts — **default 5** — at up
to **120 seconds** each.
**5 × 120 s = 600 s = exactly the 10-minute staleness threshold. Per call. And there are two.**
So under a sustained rate limit a live run legitimately holds its claim for up to **~20 minutes** while the
threshold expires at **10**. Run B re-claims a claim still held; B's cross-check returns null, because A has not
posted yet and that method swallows its failures by design; **both post**. Both upsert the same row, last writer
wins — **Tripletex holds two vouchers sharing one external number, the log holds one**, and reconciliation reads
the log, so nothing surfaces it.
**No operator error is needed. A rate limit opens it.**
**The fix is backend and needs no migration**, so C2 does not gate it: derive the threshold from
`MaxRateLimitRetries`, heartbeat the claim while a call is in flight, or bound total in-flight time below the
threshold.
**One dependency the repository cannot answer**: whether Tripletex itself rejects a duplicate
`externalVoucherNumber`. If it does, the blast radius is smaller — establish it with the provider.


===== F-TRIPLETEX-PROMISES-IDEMPOTENCE-IT-LACKS  [Info]
TITLE: the label I said was unbacked is backed
plan.md loc: plan.md:32070
FILE REFS (resolved at the tips):
  20260714014129_AddTripletexIntegration.cs                  be-suffix :84
  TripletexAdminController.cs                                be-suffix :82
QUOTED TOKENS (occurrence counts at the tips):
  TripletexVoucherPoster.PostAsync               fe=1    be=0    ['test/tripletex-run-outcome.test.js']
  ExternalKey                                    fe=0    be=60   ['Migrations/20260715090000_AddOperatorSessionPinVerified.Designer.cs']
  20260714014129_AddTripletexIntegration.cs:84-8 fe=0    be=0    []
  DropIndex                                      fe=0    be=30   ['CLAUDE.md']
  TripletexAdminController.cs:82-94              fe=0    be=0    []
  AccountingSummaries                            fe=1    be=85   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  GenerateAndSendDailySummaryAsync               fe=0    be=11   ['WebApi.Tests/Tripletex/TripletexNightlyExportE2eTests.cs']
  20260803093235_Kassa_AccountingSummaryDayUniqu fe=0    be=5    ['Migrations/20260803093235_Kassa_AccountingSummaryDayUniqueIndex.Designer.cs']
  F-TRIPLETEX-CLAIM-EXPIRES-MID-CALL             fe=0    be=0    []
BODY:
- clears when: this record is read once by anyone who would otherwise re-raise it — the world it described does not exist
- owner: @sven

**Retracted on measurement. I raised this and every part of it was wrong.**
**The label is backed.** All four *"Kjør bilag"* controls and the failed-voucher re-run funnel into
`TripletexVoucherPoster.PostAsync` on a deterministic `ExternalKey`, whose unique filtered index **is in the
chain** — `20260714014129_AddTripletexIntegration.cs:84-89`, since 14 July — with model and snapshot agreeing
and no `DropIndex` anywhere. The poster **claims the key before posting** rather than checking afterwards, and
detects the violation by SQL error number rather than message text, so it survives a non-English server.
**This page cannot reach the accounting-day double-post at all.** `TripletexAdminController.cs:82-94` resolves
only the Tripletex provider — *"Tripletex only, never re-fires the eMonkey webhook"* — and `AccountingSummaries`
is written only by `GenerateAndSendDailySummaryAsync`, whose callers are an accounting route and the nightly
provider. **No page in this frontend fires it**; what this page calls is a pure read.
**And the double-post is closed regardless.** `20260803093235_Kassa_AccountingSummaryDayUniqueIndex` is the
chain tip and creates the unique index, refusing wide or duplicate rows.
**What the lane found instead is real and is recorded as `F-TRIPLETEX-CLAIM-EXPIRES-MID-CALL`.**


===== F-TRIPLETEX-REFUSAL-READS-AS-FAILURE  [Warn]
TITLE: the guarantee working is painted as an error
plan.md loc: plan.md:32186
FILE REFS (resolved at the tips):
  tripletex.vue                                              fe-suffix :205
QUOTED TOKENS (occurrence counts at the tips):
  tripletex.vue:205-207                          fe=0    be=0    []
  success=false                                  fe=0    be=1    ['Controllers/WoltAuthController.cs']
  F-TRIPLETEX-CLAIM-EXPIRES-MID-CALL             fe=0    be=0    []
  skipped                                        fe=39   be=154  ['playwright.growth-guest-exit.config.js']
BODY:
- clears when: a contended-claim result renders as a neutral state rather than as a failure
- cleared by: L-TRIPLETEX-CLAIM-OUTLIVES-ITS-CALL
- owner: @sven

`tripletex.vue:205-207` renders `success=false` as red **"Feil"**. But the contended-claim outcome —
*"Bilaget eksporteres allerede av en annen kjøring"* — returns `Success=false, Skipped=true`, which is **the
idempotence guarantee working exactly as designed.**
**So the page tells the operator that a correctly-refused duplicate failed — and what a red row invites is
pressing it again**, which is precisely the door `F-TRIPLETEX-CLAIM-EXPIRES-MID-CALL` leaves open. The two
compose into a defect neither has alone.
The genuinely-idempotent skip (already posted) returns `Success=true, Skipped=true` and reads *"Hoppet over"*
correctly. **Only the contended case is mislabelled**, and the fix is to branch on `skipped` in the false arm
too.


===== F-TRIPLETEX-STALE-RECOVERY-IS-LONGER-THAN-ITS-STATED-TEN  [Warn]
TITLE: MINUTES
plan.md loc: plan.md:32975
QUOTED TOKENS (occurrence counts at the tips):
  f3817eed9                                      fe=0    be=2    ['lanes/L-BACKEND-PATCHES-ARE-APPLIED/evidence.md']
  Retry-After                                    fe=0    be=12   ['WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs']
BODY:
- clears when: the stale-claim recovery path completes within its stated window, or the stated window is changed to the value the derivation actually produces
- owner: agent

Also raised by the reading of `f3817eed9`: the stale recovery lengthens from a stated **10 minutes** to
approximately **24.3 minutes** once the derived threshold and the capped `Retry-After` compose. **Nothing
is lost and nothing is double-claimed** — a claim simply stays held longer than the number an operator
would read. Recorded rather than blocking, because the reviewer measured it as safe.


===== F-TRIPLETEX-STALE-RECOVERY-IS-LONGER-THAN-ITS-STATED-TEN-MINUTES  [Warn]
TITLE: the Tripletex stale recovery is longer than its stated ten minutes
plan.md loc: plan.md:32989
BODY:
- clears when: the stale-claim recovery completes within its stated window, or the stated window is changed to the value the derivation produces
- owner: @sven


===== F-TWO-BACKEND-COMMITS-LEFT-OFF-THE-TRUNK-BY-NAME  [Warn]
TITLE: the backend landing deliberately omitted two commits and named them rather than dropping them quietly
plan.md loc: plan.md:33042
FILE REFS (resolved at the tips):
  WORLD.json                                                 ABSENT
BODY:
- clears when: 34c6c1031 meals expiry pins is landed or recorded as unwanted, and e956337ed is triaged file by file since it carries a settings hook config and a stale WORLD.json
- owner: @sven


===== F-TWO-FINALIZE-CONTROLS  [Warn]
TITLE: two surfaces bind one irreversible freeze
plan.md loc: plan.md:9350
QUOTED TOKENS (occurrence counts at the tips):
  L-MEALS-RECONCILE-UI                           fe=0    be=0    []
  L-MEALS-STATEMENT-SURFACE                      fe=0    be=0    []
  /admin/meals-statements                        fe=7    be=0    ['test/admin-nav-access.test.js']
  openExceptionCount                             fe=0    be=3    ['.lane/L-A-REFUSAL-STOPS-NAMING-THE-PERSON-IT-PROTECTS-detail.md']
BODY:
- clears when: exactly one surface binds the finalize endpoints, and the refusal it renders names the exception blocking it
- cleared by: L-MEALS-RECONCILE-UI
- owner: @sven

**Caught live, by a lane watching the shared checkout go dirty underneath it rather than by a merge.**
`L-MEALS-RECONCILE-UI` and `L-MEALS-STATEMENT-SURFACE` **both bind the finalize endpoints.** The second
was adding `/admin/meals-statements` to the navigation while the first was finishing.
**A freeze is irreversible, and two controls for it is worse than either alone** — an operator who finds
the wrong one gets a refusal that does not say what blocks it. In the lane's own words: *"the merge must
decide which surface owns the finalize, or you ship two controls for one irreversible freeze and only one
names its blocker."*
**Only one of them names the blocker, and that took real work.** The wire contract carries
`openExceptionCount` and **no id, kind, source key or company**, so naming what blocks a finalize needed a
**join** of the refusal against the queue read — **scoped to the billed company**, because the guard
counts per `(store, company)` while the queue answers for the whole venue. That lane also declined to port
an existing branch's banner that renders a count and names nothing.
**This did not wait for the merge because I told the running lane.** It can consume what exists, or argue
its surface should own the finalize and say what happens to the other control — either is fine; silently
binding it twice is not.
**The general shape, and it is new in this program:** every collision recorded so far was found *at* a
merge or by a reviewer reading two branches. This one was found by a lane **noticing a shared file change
under it while it worked** — which is the only place a two-controls-for-one-write conflict is cheap to
fix.


===== F-UTLKVIT-PREDICATE-COLLISION  [Blocker]
TITLE: two lanes hoisted the same predicate to different homes
plan.md loc: plan.md:26821
QUOTED TOKENS (occurrence counts at the tips):
  one-predicate-six-call-sites                   fe=0    be=0    []
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  a273e013                                       fe=0    be=0    []
BODY:
- clears when: one credit-sale predicate exists in the tree and all six call sites read it
- cleared by: L-UTLKVIT-FAMILY-LAND
- owner: @sven
- blocks: S-PILOT-SAFE

Found only by composing the two sibling lanes, which is the point: **it is invisible in either one.**
They are siblings off the same base, not ancestor and descendant, and **both hoisted the credit-sale
predicate out of the SAF-T export — to different homes.** One made a public type taking a journal entry;
the other made an internal static on the receipt service.
**Landing them independently leaves two definitions in the tree**, and nothing in either lane's diff says
so. The same shape as the receipt-path trap in the confirm family: two individually correct lanes whose
composition is wrong.
Resolved in the composing lane toward the public type, on stated grounds — it is null-safe, it takes an
entry so **a payment list cannot be substituted for one**, and it does not force the accounting export to
reference a receipt service. All six call sites now read the one definition.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `one-predicate-six-call-sites`.**
**Verified closed 2026-08-03 by count, not by claim.** Exactly one credit-sale predicate exists in the
tree, with exactly six references. The rival internal static is deleted and the surviving file is taken
verbatim. The lane also swept for an *unnamed* twin rather than only a same-named one — the remaining
matches are per-payment-line tender mapping, a different question.
The merge is arithmetically clean: the composed base count is **the exact union of the two parents**, so
the merge lost no pin and duplicated none.
**Two process findings worth keeping.** Asserting the checkout clean *before* the build mattered — it came
out dirty afterwards on the known artifact churn. And it caught itself **watching the wrong assembly**: a
production file compiles into the application dll, not the test dll, so the test dll's mtime never moves
for a production edit and reads as a false stale build. Second lane today to hit that.
**LANDED 2026-08-03 on `feature/restaurant-modules` as merge `a273e013`, on Sven's instruction and on the
lane's own request.** Merged, **not ported** — which is the distinction the whole family turned on: a port
would have reintroduced two closed defects from the till lane's tree.
Measured at the merge commit, in an isolated worktree so the shared checkout and its live process were never
touched: **zero conflicts, build 0 errors, container-free tier 4387 passed / 0 failed / 12 skipped.** Th


===== F-UTLKVIT-SALE-ROW  [Blocker]
TITLE: a credit sale still prints and copies as a proof of purchase
plan.md loc: plan.md:22961
QUOTED TOKENS (occurrence counts at the tips):
  already-fixed-pending-merge                    fe=0    be=0    []
  W-PROBE-UNUSED                                 fe=0    be=0    []
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  a273e013                                       fe=0    be=0    []
BODY:
- clears when: the print, view and public paths addressed at a credit sale's own id produce the delivery receipt, and the copy guard refuses the credit-sale sale row
- cleared by: L-UTLKVIT-FAMILY-LAND
- owner: @sven
- blocks: FT-MEALS

The delivery receipt was built and **the old door was left open.** The document keeps the sale's own
journal id and the plain receipt path has no forward resolution, so the print endpoint — **whose own
comment says the first print of a sale is the original receipt** — the view endpoint, the SMS and the
public page all produce **an unmarked salgskvittering for a sale nobody paid**, whenever addressed at the
id every existing client already uses.
Worse: the copy allowlist permits copying that row, **minting a KOPI-marked apparent proof of purchase —
the precise forgery the lane's own refusal test exists to prevent**, reachable through the other door.
Latent only because the feature is production-unreachable, which was verified. It must not survive the
day the settlement branch opens.
**Ruled 2026-08-03 (Sven): `already-fixed-pending-merge`.**
Delivery-receipt kind on the branch: <!--fact meals.utlkvit 2026-08-06T15:52Z unconf-->pending<!--/fact-->. Credit-sale total in the Z report: <!--fact meals.xz.credit 2026-08-06T15:52Z unconf-->pending<!--/fact-->. Both probes existed with no span, so their facts were never rendered and could not be used as evidence — which is what `W-PROBE-UNUSED` had been saying on every check.
**LANDED 2026-08-03 on `feature/restaurant-modules` as merge `a273e013`, on Sven's instruction and on the
lane's own request.** Merged, **not ported** — which is the distinction the whole family turned on: a port
would have reintroduced two closed defects from the till lane's tree.
Measured at the merge commit, in an isolated worktree so the shared checkout and its live process were never
touched: **zero conflicts, build 0 errors, container-free tier 4387 passed / 0 failed / 12 skipped.** That
tree had never been built by anyone. **One predicate, six references, and the refund path still requires a
sale — so a credit sale stays refundable at the till.**
**Nothing was pushed.** The branch moved locally only.


===== F-VIPPS-REDACT-OPEN  [Blocker]
TITLE: a malformed guest deposit link publishes its own credential
plan.md loc: plan.md:26361
QUOTED TOKENS (occurrence counts at the tips):
  already-in-flight                              fe=0    be=0    []
  L-VIPPS-REDACT-404                             fe=0    be=0    []
BODY:
- clears when: an unmatched request and an encoded route value both redact, pinned by tests that fail when either path is reopened
- cleared by: L-VIPPS-REDACT-404
- owner: @sven
- blocks: S-PILOT-SAFE

Found by review of the lane that closed the original leak. Redaction runs off bound route values only,
so a 404 redacts nothing — and a trailing period appended by an email client is enough to turn the
guest's own link into an unredacted credential in telemetry. No rotation is owed today because the
branch has never been deployed, but this must close before it is.
**Closed and measured 2026-08-03, and the lane corrected this description in both directions.**
**Larger than stated:** a **405** has the same shape as a 404 — the method-mismatch shim *is* an endpoint,
so a rule keyed on "did routing select one" answers yes while the route values are still empty. **Both
phone-number routes are write verbs**, so a plain GET at either one published the number. The trigger is
now the empty route-value set, which covers 404 and 405 alike.
**Overstated:** the percent-encoding half **was not reproducible.** The server decodes into the request
path *before* routing and the telemetry SDK builds its URL from that, so an encoded phone number arrived
already decoded and the existing replacement matched it. Measured rather than assumed. The escaped forms
are matched anyway — one accessor away from mattering.
**But its other half was real.** The unchanged-URL check was **fail-open**: an unchanged URL is exactly
what a *missed* credential looks like. The check now verifies its own output against what it undertook to
remove, and drops the URL when the value survives.
**Ruled 2026-08-03 (Sven): `already-in-flight`.**
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-VIPPS-REDACT-404`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiated blockers.


===== F-WASTE-PANEL-REPORTED-A-FAILURE-IT-NEVER-ATTEMPTED  [Warn]
TITLE: and a green test held the fabrication up
plan.md loc: plan.md:32664
QUOTED TOKENS (occurrence counts at the tips):
  createStatement                                fe=5    be=0    ['test/margin-coverage-waste-absent.test.js']
  readWasteSummary                               fe=6    be=0    ['test/margin-coverage-waste-absent.test.js']
BODY:
- clears when: no Margin panel reports on a request it did not make, and no test asserts a fabricated zero
- cleared by: L-MARGIN-WASTE-SURFACE-IS-HONEST
- owner: @sven

**The browser walk recorded `NO REQUEST WAS MADE`.** `createStatement` read coverage alone while drawing both
panels, so *"we could not fetch the waste"* was printed **about a request that was never sent** — a failure
reported without being observed, which is the purest instance of this estate's recurring shape.
**And the fabrication was two layers deep.** `readWasteSummary` manufactured the zeros with
`longOrNull(x) || 0`, justified in its own comment as *"the server always sends it"* — **it never does.** A
test asserting that an absent block reads as `entryCount: 0` was **passing**, which is why the defect survived
review. The lane flipped that test rather than deleting it.


===== F-WF-ACK-DUP  [Warn]
TITLE: two acknowledgements of one schedule both stick, and neither can be removed
plan.md loc: plan.md:26258
QUOTED TOKENS (occurrence counts at the tips):
  Two_concurrent_acknowledgements                fe=0    be=9    ['artifacts/tests/1da15fb1-sql-tier.trx']
  2eeff48f                                       fe=0    be=6    ['Migrations/20260801102621_Workforce_PublicationReceiptUniqueness.cs']
  WorkforceSchedulePublicationReceipts           fe=0    be=36   ['Migrations/20260729091423_Events_NotificationOutbox.Designer.cs']
  MIG-22                                         fe=0    be=3    ['WebApi.Tests/Growth/GrowthDbFailureClassificationTests.cs']
  Growth_AuditLedger                             fe=0    be=8    ['Migrations/20260806125642_Growth_AuditLedger.cs']
  bd3a840f                                       fe=0    be=2    ['artifacts/tests/24cd4ead5e73dac127fca8de0ab2b56f26c85887/RUN.md']
  Margin_PeriodStatementFinalizedImmutable       fe=0    be=9    ['Migrations/20260801084923_Margin_PeriodStatementFinalizedImmutable.cs']
  d6b0630f                                       fe=0    be=3    ['artifacts/tests/2eeff48f405d09427bd509b0c68686797c64afd6/RUN.md']
  F-MIG22-CLAIMED-TWICE                          fe=0    be=0    []
  L-MIG-NUMBER-CLAIMS                            fe=0    be=0    []
  F-GROWTH-SQL-TIER-RED-BY-CONSTRUCTION          fe=0    be=0    []
BODY:
- clears when: the filtered unique index lands as MIG-22 and PublicationAcknowledgementRaceSqlServerTests passes
- owner: @sven

**Confirmed at the SQL tier, 2026-08-01.** No longer an argument from reading: a whole-assembly run
observed `Two_concurrent_acknowledgements` expecting one receipt and getting **two**, and a second lane
reproduced it at an unrelated base to prove it is not that lane's doing. The flag was raised on
inspection; it is now measured.
Proven, not suspected: the SQL tier ran for the first time at `2eeff48f` and this is the one red.
`WorkforceSchedulePublicationReceipts` has no unique index, so two acknowledgements with different
idempotency keys both reserve, both read "no receipt", and both insert — `Expected: 1, Actual: 2`,
exactly as the test's own class doc predicts.
The table is append-only in the EF guard, so **the duplicate cannot be removed through the
application**. A worker who double-taps leaves two permanent receipts on the record that answers "who
saw this schedule, and when" in a dispute.
Ledger numbering was corrected while landing the Margin trigger: the Workforce index is **MIG-22**,
because MIG-21 was already claimed and load-bearing. That is the four-lanes-claiming-one-number
failure recurring, caught this time by a lane checking rather than assuming.
**`MIG-22` is not a unique reference, 2026-08-05 — this condition cannot currently be tested.** The number is
claimed by **two** migrations on two branches: `Growth_AuditLedger` at `bd3a840f` on the integration branch, and
`Margin_PeriodStatementFinalizedImmutable` at `d6b0630f` on the stack. The two ledger copies diverge by 739
lines and each author read their own.
**So "lands as MIG-22" names one of two different things**, and the filtered unique index this flag waits for is
neither of them. `F-MIG22-CLAIMED-TWICE` carries the collision; `L-MIG-NUMBER-CLAIMS` is deriving the full claim
list from the branches rather than from either document.
**`F-GROWTH-SQL-TIER-RED-BY-CONSTRUCTION` names MIG-22 as well, and means the other one.** Two open flags
waiting on the same string for different work is precisely the failure the ledger's own text predicted.


===== F-WF-ACKNOWLEDGE-SHOWS-NOTHING  [Warn]
TITLE: a worker confirms a published week and sees no receipt
plan.md loc: plan.md:28173
QUOTED TOKENS (occurrence counts at the tips):
  acknowledge()                                  fe=1    be=0    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  v-if                                           fe=300  be=2    ['Claude.md']
  /workforce/me/inbox                            fe=6    be=0    ['test/workforce-me-client.test.js']
  {items:[]}                                     fe=0    be=0    []
  /attendance                                    fe=13   be=17   ['test/workforce-rates-client.test.js']
  rows:[]                                        fe=0    be=0    []
BODY:
- clears when: a worker who acknowledges a published week is shown the receipt, pinned by the workforce week-run journey rather than by a component test
- owner: @sven

**Found by walking it, which is the only way it could have been found.** The worker presses **Bekreft**
and **is shown nothing at all.**
The mechanism is a contradiction the code cannot escape: `acknowledge()` stores the receipt and then
reloads the inbox — but acknowledging implies *seen*, so the item drops out of the unread list, and the
entire notice is `v-if`'d away, **taking the receipt with it.** The receipt renderer needs an item that is
both **unread and acknowledged**, and no such item can exist.
**No component test could have caught this**, because every part works: the receipt is stored, the inbox
reloads, the unread filter is correct. The defect lives only in the sequence a person actually performs.
The finding lane **asserted the defect in its journey**, so fixing it will red the walk. That is
deliberate and it is the right shape: invert the assertion when the fix lands rather than deleting it —
four tests asserting a defect have been found this session and inverting is what keeps the record.
**Worth knowing about the surface it was found on:** `/workforce/me/inbox` hard-returned `{items:[]}` in
every fixture run ever made and `/attendance` was a three-line stub returning `rows:[]`, so the
acknowledgement, the read marker, the punch list and the correction had **no browser-reachable caller at
all** until this lane derived them from the acts that produce them.


===== F-WF-BLIND-BIND  [Blocker]
TITLE: a login-carrying operator is bound to a person nobody saw
plan.md loc: plan.md:26554
QUOTED TOKENS (occurrence counts at the tips):
  name-the-person-and-allow-correction           fe=0    be=0    []
BODY:
- clears when: the review names the person for the existing-login case too, and a mis-mapped link can be corrected through an audited path
- cleared by: L-WF-BLIND-BIND-NAME
- owner: @sven
- blocks: FT-WORKFORCE

The operator import is a genuine review — both sides named, permanence stated — **except for one case**.
When the operator already carries a login, the frontend cannot resolve which person that login maps to,
so the review shows no name. The manager can still confirm, and that permanently decides whose pay every
future punch lands on. **No endpoint can undo it.**
One mis-mapped login at a pilot venue is unfixable wrong pay attribution. The screen is honest that it
cannot name the person, which is the right posture for a frontend — the hazard is the API gap behind it,
and it needs a resolved-name preview or a dry run, plus an audited correction path.
**Ruled 2026-08-03 (Sven): `name-the-person-and-allow-correction`.**


===== F-WF-CATEGORY  [Warn]
TITLE: three of the four statutory personalliste categories cannot be produced
plan.md loc: plan.md:25948
FILE REFS (resolved at the tips):
  WorkforcePersonnelListProjection.cs                        be-suffix :207
QUOTED TOKENS (occurrence counts at the tips):
  Employee                                       fe=36   be=170  ['test/workforce-personnel-list.test.js']
  WorkforcePersonnelListProjection.cs:207        fe=2    be=0    ['lanes/L-WF-KODEOVERSIKT-UI/evidence.md']
BODY:
- clears when: a person can be recorded under each statutory category the personalliste renders, or the categories the product cannot produce are removed from the sheet
- owner: @sven

One production site sets a participant category and it is hardcoded to `Employee`
(`WorkforcePersonnelListProjection.cs:207`). The other three exist in the schema, the enum and the
renderer, and nothing creates them. So the sheet has columns for a reality it cannot record — which
is the same shape as printing a statute the product cannot satisfy.


===== F-WF-CLOCK-LIES  [Warn]
TITLE: a punch that recorded nothing answers as a success
plan.md loc: plan.md:26393
QUOTED TOKENS (occurrence counts at the tips):
  sessionState                                   fe=5    be=8    ['test/workforce-pos-clock.test.js']
BODY:
- clears when: a clock-out with no open session is distinguishable from one that closed a session, on the wire
- cleared by: L-WF-CLOCK-WIRE
- owner: @sven

The register surface refuses to print an outcome it cannot know, which is the honest response to this —
but the next client to read `sessionState` will not, and it will tell a worker their day was recorded
when nothing was written.


===== F-WF-CLOCK-UNLINKED  [Blocker]
TITLE: a POS operator cannot become a clockable person
plan.md loc: plan.md:26295
QUOTED TOKENS (occurrence counts at the tips):
  land-the-link-lane                             fe=0    be=0    []
  L-WF-OPLINK                                    fe=1    be=0    ['lanes/L-PRICE-NULL-ZERO/lane-notes.md']
BODY:
- clears when: a journey capture shows operator import, then clock-in, then the clocked minutes on the attendance table
- cleared by: L-WF-OPLINK
- owner: @sven
- blocks: FT-WORKFORCE

Until this clears, the four-weeks-of-POS-clocking market gate cannot start, and the POS-native
attendance differentiator cannot be demonstrated to anyone.
**Ruled 2026-08-03 (Sven): `land-the-link-lane`.**
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-WF-OPLINK`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiated blockers.


===== F-WF-EXCHANGE-STALE-GRID  [Warn]
TITLE: an awarded swap leaves the old person on the published grid
plan.md loc: plan.md:26309
BODY:
- clears when: the award-to-published-awardee capture exists under artifacts/journeys/
- cleared by: L-WF-EXCHANGE-GRID
- owner: @sven


===== F-WF-NO-INVITE  [Blocker]
TITLE: no worker can enter Workforce through any shipped surface
plan.md loc: plan.md:26118
QUOTED TOKENS (occurrence counts at the tips):
  build-the-invite-surface                       fe=0    be=0    []
BODY:
- clears when: a browser journey captures a manager issuing an invitation and a worker claiming it and reaching their own schedule
- cleared by: L-WF-INVITE-SURFACE
- owner: @sven
- blocks: FT-WORKFORCE

The staff-invitation and claim endpoints exist and have no UI anywhere; both frontend clients declare
invitations out of scope. The whole self-service half — worker page, acknowledgements, requests — is
reachable only by hand-crafted API calls, while the backend journey for it records green.
**Ruled 2026-08-03 (Sven): `build-the-invite-surface`.**


===== F-WF-NOCORRECTION  [Blocker]
TITLE: a personalliste entry cannot be corrected by anyone
plan.md loc: plan.md:22751
QUOTED TOKENS (occurrence counts at the tips):
  build-the-correction-path                      fe=0    be=0    []
BODY:
- clears when: a production code path records who corrected a personalliste entry and when, or the caveat printed on the sheet says the register cannot be corrected
- cleared by: L-WF-CORRECTION-PATH
- owner: @sven
- blocks: FT-WORKFORCE

Surfaced when the evidence-world lane removed the fixture rows the product cannot write. **Nothing in
the product can correct a personalliste entry.** Both entry writes pass a null correction actor, and
the controller has no write action at all.
bokføringsforskriften § 8-5-6 requires the register to record *hvem som har foretatt rettelsen og
tidspunkt* — who made the correction and when. There is no path.
It was **masked by the fixture's own correction row**, which is why nobody had seen it: the sheet
demonstrated a capability that existed only in the test world. No caveat mentions it. The remedy is a
backend correction path, not another line of caveat text — though a caveat is the honest stopgap.
**Ruled 2026-08-03 (Sven): `build-the-correction-path`.**


===== F-WF-NODEPARTURE  [Warn]
TITLE: a missing departure can never be corrected
plan.md loc: plan.md:25959
QUOTED TOKENS (occurrence counts at the tips):
  correctionActor                                fe=7    be=4    ['test/workforce-personnel-list.test.js']
BODY:
- clears when: a manager can correct a personnel-list entry through a shipped surface, with the correction attributed and the original preserved
- owner: @sven

`correctionActor` is null at both call sites and there is no correction endpoint. The only write path
is clock-in and clock-out, so a worker who forgets to clock out leaves a row nobody can fix — on the
document an inspector reads. Append-only is right; a correction is a counter-entry, not an edit, and
there is no way to make one.


===== F-WF-NOREG  [Warn]
TITLE: personalliste codes have no register, which is what makes the substitution lawful
plan.md loc: plan.md:25924
QUOTED TOKENS (occurrence counts at the tips):
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
  fact:wf.idreg                                  fe=1    be=0    ['docs/plan/returns/L-WF-KODEOVERSIKT-UI-1.md']
  lane/wf-idreg                                  fe=2    be=0    ['lanes/L-WF-KODEOVERSIKT-UI/evidence.md']
BODY:
- clears when: a venue has a filled-in register for a business day and the owner says the § 8-5-6 duty is met in practice, not merely producible
- cleared by: L-WF-IDREG
- owner: @sven

**Amended 2026-08-01 after L-WF-IDREG landed, on the lane's own recommendation.** The product now
produces the kodeoversikt as a template — one row per code, the identity column blank on every row
under every path, with the venue's duty and the retain-until date printed on the document. That is a
real mitigation and it is why the severity drops from blocker to warn.
It is not closure, and the original `clears_when` would have cleared it on `fact:wf.idreg` alone —
a fact that proves the template exists, not that any venue has filled one in. The duty is discharged
by a person keeping a register, which no probe can see. So the condition is now owner-judged prose,
and the tool will ask rather than decide. Lowering the severity is a judgement I made from the lane's
recommendation; overturn it if you read the exposure differently.
**Annotated 2026-08-01 after review.** The severity drop rests half on work that is **not on the
branch**: the backend landed, but the frontend download lever and its rewritten notice sit only on
`lane/wf-idreg`, unpushed. HEAD's own text is still truthful — it claims no register and states the
venue's duty — so there is no live false claim, but the mitigation this warn assumes is one lost
worktree away from gone. Restore blocker if that lane is not merged.


===== F-WF-OPEN-SHIFTS-IGNORE-SUPERSESSION  [Blocker]
TITLE: a worker is offered a shift she already won
plan.md loc: plan.md:32547
QUOTED TOKENS (occurrence counts at the tips):
  ListOpenAssignmentsAsync                       fe=0    be=3    ['Controllers/WorkforceMeController.cs']
  CheckPersonOverlapsAsync                       fe=0    be=3    ['Models/Workforce/WorkforceScheduleModels.cs']
BODY:
- clears when: the open-assignment list excludes superseded publications, shown by a worker page listing each open shift once after a successor publication
- cleared by: L-OPEN-SHIFTS-EXCLUDE-SUPERSEDED
- owner: @sven

**Found by seeding a perfectly ordinary sequence: publish a week, then publish a successor.**
`ListOpenAssignmentsAsync` filters only on `State == Published` **with no lineage filter** — unlike
`CheckPersonOverlapsAsync`, which deliberately excludes superseded publications. So after publication #2
supersedes #1, the worker's own page lists **three** cards where there should be one:
- the revision-1 Saturday she was **already awarded**, with `alreadyRequested: false`, so it reads as
  re-biddable
- the Sunday offer **twice**, once per revision
**The award is the part that bites.** A worker bidding for a shift she already holds, on a page that tells her
she has not bid, is a rota the venue cannot trust — and the manager's side has no matching duplication, so the
two screens disagree about what is open.
**Inherent to the successor flow**, not to how the demo was seeded: republishing a week is the normal act this
module exists to support.


===== F-WF-PAYROLL-REKEY  [Warn]
TITLE: an accountant re-keys every period by hand
plan.md loc: plan.md:26316
BODY:
- clears when: one exported file is accepted by the ruled vendor's import validator without hand-mapping, recorded under artifacts/payroll/
- cleared by: L-WF-PAYROLL-VENDOR
- owner: @sven


===== F-WF-PUSH-SILENT  [Blocker]
TITLE: a worker who was never told is recorded as notified
plan.md loc: plan.md:26416
QUOTED TOKENS (occurrence counts at the tips):
  resolve-and-record-the-actor                   fe=0    be=0    []
  cleared_by                                     fe=0    be=1    ['lanes/L-INVOICE-AUTHORIZE-LAND/merge-receipt.md']
  L-GR-DISPATCH-ACTOR                            fe=0    be=0    []
BODY:
- clears when: a send to a tag with no registration is recorded as failed, pinned by a test that fails if the outcome is discarded again
- cleared by: L-WF-PUSH-SILENT
- owner: @sven
- blocks: FT-WORKFORCE

The module's publication record answers "what did each worker see, and when" in a dispute. If a push to
a revoked device is recorded as delivered, that record becomes evidence *against* the venue rather than
for it — and the worker it names never saw the schedule.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `resolve-and-record-the-actor`.**
**`cleared_by` repointed 2026-08-03 by the whole-set review, and the mislink mattered.** It named
`L-GR-DISPATCH-ACTOR`, whose exit records **the actor**. This flag clears on an **outcome** — a send to a
tag with no registration recorded as *failed*. Different property, different lane.
Worse than a bookkeeping slip: **both lanes were dispatchable and both would have touched the same
notification adapter.** A collision waiting to happen, invisible from inside either lane.
**The ruling line above is not this flag's ruling, 2026-08-05 — annotated rather than removed.**
`resolve-and-record-the-actor` is the **actor** ruling. It arrived with the `cleared_by` link to
`L-GR-DISPATCH-ACTOR`, and when the whole-set review repointed that link it left the ruling behind. **This flag
clears on an outcome** — a send to a tag with no registration recorded as *failed* — which is a different
property, as the paragraph below the ruling already says.
**So the repoint was half-applied, and the half that stayed is the one a reader trusts first.** Somebody
scanning for "is this ruled?" finds a ruling and stops.
**It is left in place deliberately.** Removing a recorded ruling is not the clerk's act, and a flag whose
history has been tidied cannot be audited. The correction sits beside it.
**And it explains why 59 backend commits could never overtake this one.** The re-rule pass found the code
fully met and this flag still standing: the residue is a document defect, and no landing repairs a document.


===== F-WF-TWO-ADMINS-TWO-ENGAGEMENTS  [Blocker]
TITLE: two administrators can each open Workforce for one store
plan.md loc: plan.md:22716
BODY:
- clears when: two different store administrators opening Workforce concurrently leave exactly one first engagement, refused by a database constraint
- cleared by: L-WF-BOOTSTRAP-ONE-ENGAGEMENT
- owner: @sven
- blocks: FT-GROWTH

Found by the lane sent at the smaller case, and **it is larger than the one anybody had named** — including
the service's own remarks, which describe only a single caller double-submitting.
**Two *different* administrators of one store, neither carrying a person row**, mint two persons. So the
one-person-per-login index is never touched, and both first engagements stand. **A store with two admins
both clicking to open the module is the likeliest way this ever happens in the field**, and it was the case
nobody was looking at.
Both cases are covered by the same constraint; this exists so the larger one is recorded rather than
folded silently into the smaller.


===== F-WF-WORKER-CANNOT-SEE-HER-OWN-REQUESTS  [Warn]
TITLE: submitted and then invisible on reload
plan.md loc: plan.md:32571
FILE REFS (resolved at the tips):
  utils/workforce-me/me-client.js                            fe-exact :52
QUOTED TOKENS (occurrence counts at the tips):
  WorkforceSelf                                  fe=32   be=64   ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  utils/workforce-me/me-client.js:52-56          fe=0    be=0    []
BODY:
- clears when: a worker can re-read her own availability and time-off after a reload, shown by a page that still lists them in a new session
- owner: @sven

A worker submits availability and time-off, and **after a reload sees neither**.
`GET /me/staff-memberships/{id}/availability` answers **405** — only `PUT` is bound — and the store-scoped read
is 403 for a `WorkforceSelf` caller.
**The frontend already knows and says so in its own source**: `utils/workforce-me/me-client.js:52-56` — *"a
submission is visible for as long as the page is open and no longer."*
So the manager's inbox is the only place those requests exist. The worker has no way to check what she asked
for, or whether she asked at all.


===== F-WIRE-TIER-DIRTIES-ARTIFACTS  [Warn]
TITLE: running the wire tier rewrites another module's committed artifacts
plan.md loc: plan.md:26901
QUOTED TOKENS (occurrence counts at the tips):
  artifacts/journeys/ev-dietary/*                fe=0    be=0    []
BODY:
- clears when: a wire-tier run leaves every committed journey artifact it does not own byte-identical, or the artifacts it rewrites are not committed
- owner: @sven

Reported by the lane that hit it, which restored the files by hand and **did not commit them.** The next
lane may not notice.
Running the wire tier rewrites `artifacts/journeys/ev-dietary/*` — timestamps only, but a rewrite is a
rewrite, and the standing rule to commit by pathspec exists precisely because a broad stage has already
swallowed six of another lane's untracked files once.
So this is a trap with a known shape: **a lane runs a tier it was told to run, and the diff it did not
author appears in its own commit.** It is a warn rather than a blocker because the content is timestamps,
and the cost is a confusing diff rather than a wrong claim — but it is exactly how a receipt ends up
describing a run nobody made.


===== F-WOLT-DEAD  [Warn]
TITLE: a background service never registered in any commit in history
plan.md loc: plan.md:26003
BODY:
- clears when: fact:wolt.sync.host is present, or the class is gone and the owner clears this against that diff
- cleared by: L-WOLT-SYNC
- owner: @sven


===== F-WORKFORCE-BLAMES-THE-PERSON-FOR-A-MODULE-BEING-OFF  [Warn]
TITLE: module-off answers 403 and the roster prints du har ikke bemanningstilgang, blaming the operator
plan.md loc: plan.md:33193
BODY:
- clears when: a module-off refusal on the workforce roster names the module rather than the person's access, shown in a browser
- owner: @sven


===== F-WORKFORCE-ROLE-UPSERT-KEYS-ON-NOTHING  [Blocker]
TITLE: a role upsert mints duplicates on repeat, and two duplicate rows are live in the owner's world now
plan.md loc: plan.md:33208
BODY:
- clears when: a repeated role upsert leaves one row per role, shown by a second call that changes no count, and the duplicate Kokk and Servitor rows on store 1 are resolved
- owner: @sven


===== F-WORKTREE-WITHOUT-MODULES-FAILS-SILENTLY  [Blocker]
TITLE: fifteen worktrees where a test run cannot say it did not run
plan.md loc: plan.md:29681
FILE REFS (resolved at the tips):
  package.json                                               fe-exact
  package-lock.json                                          fe-exact
  jest.config.js                                             fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  package.json                                   fe=5    be=4    ['nuxt.config.js']
  node_modules                                   fe=37   be=6    ['nuxt.config.js']
  ts-jest                                        fe=6    be=3    ['jest.config.js']
  core                                           fe=229  be=168  ['nuxt.config.js']
  tail                                           fe=305  be=552  ['playwright.growth-guest-exit.config.js']
  Web-modules                                    fe=78   be=15   ['test/journey-artifact-store.test.js']
  okam/Web                                       fe=53   be=15   ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
  feature/POS                                    fe=3    be=43   ['.gitmodules']
  package-lock.json                              fe=0    be=2    ['docs/plans/replan/a2-web-testing.md']
  core/                                          fe=101  be=21   ['nuxt.config.js']
  pretest                                        fe=0    be=0    []
  globalSetup                                    fe=0    be=0    []
  engines                                        fe=4    be=3    ['package-lock.json']
  jest.config.js                                 fe=4    be=3    ['test/vue-coverage-instrumentation.test.js']
BODY:
- clears when: a suite run in a worktree without node_modules fails loudly, or every worktree carrying a package.json resolves its modules
- owner: @sven

**Measured by the clerk, 2026-08-05: 94 worktrees carry a `package.json` and 15 of them have no
`node_modules`.** Three lanes have now hit it, and **each got a different silent failure**:
- **A smaller green.** Five suites fail at load, including all four money suites, and the run reports
  **2547 tests instead of 2729**. 182 real tests leave the denominator and nothing says so.
- **A figure attributed to a tree that could not have produced it.** A receipt reports *"1 suite passed, 8 tests
  passed"* from a worktree with no modules and no module tree above it — the run happened in the shared
  checkout, and the receipt cannot be re-run where it says.
- **Exit 0 on a `ts-jest` Validation Error.** A run judged by exit code **logs that as a pass.** That is the
  worst of the three, because exit code is what most harnesses check.
**Not one of the three raised an error.** The lane that hit the third had established a baseline against it and
would have compared its own work to a run that never happened; it caught it because it read the output rather
than the status.
**The remedy is not "remember to install".** Fifteen worktrees is what an estate of this shape produces, and a
harness that cannot distinguish *nothing ran* from *everything passed* will keep being trusted. **The lanes that
hit it symlinked to the shared module tree, which works and is a convention nobody wrote down.**
**A related correction, and it is the clerk's.** Briefs have been quoting a bare estate total — *"2547 instead
of 2729"* — as though it were a constant. **It is not.** Three lane baselines measured tonight carry **146, 145
and 140 test files**, and their totals differ accordingly: one lane reported 2586 on the 140-file tree while
another reported 2804 on the 146-file tree. **Both are right about their own tree.**
**So a suite total is a property of a tree, not of the estate**, and a lane told to expect a number will
either doubt a correct run or accept a wrong one. The figure worth quoting is the one a lane measures on its
**own untouched baseline before its first edit** — which is what the last four lanes did, and why their
before-and-after comparisons hold.
**The node_modules failure and this one compose badly.** A lane that inherits a total *and* runs in a worktree
with no modules gets a smaller number it has been told to expect a different value for, and no error either
way.
**Built — and it corrected three things the clerk had


===== F-WORLD-FACTS-ARE-GREEN-IN-THE-WRONG-DIRECTION  [Blocker]
TITLE: the hub asserts a branch it is not on
plan.md loc: plan.md:32094
FILE REFS (resolved at the tips):
  artifacts/world/WORLD.json                                 ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  Web-modules                                    fe=78   be=15   ['test/journey-artifact-store.test.js']
  lane/focustrap-teardown                        fe=2    be=0    ['lanes/L-MARGIN-WASTE-SURFACE-IS-HONEST/evidence.md']
  fe.world                                       fe=0    be=0    []
  be.world                                       fe=0    be=0    []
  artifacts/world/WORLD.json                     fe=2    be=1    ['scripts/worldstamp']
  worldstamp                                     fe=4    be=1    ['world.config']
  <dir>/.git                                     fe=0    be=0    []
  <repo>/.git/worktrees/<name>/HEAD              fe=0    be=0    []
  be.dir.ref                                     fe=0    be=0    []
  lane/meals-grace-pins                          fe=6    be=6    ['test/e2e/journeys/margin-week-freeze.spec.js']
  fe.dir.ref                                     fe=0    be=0    []
  .pin                                           fe=8    be=3    ['test/e2e/fixture/workforce-punch.js']
  F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH           fe=0    be=0    []
BODY:
- clears when: no fact asserting a checkout's branch can read ok while that checkout is on another branch, shown by a probe that reds on the mismatch
- owner: @sven

**Found by the lane building the probe pin, in the hub the flag was written in.** `Web-modules` is on
`lane/focustrap-teardown`, while this plan carries `fe.world = True` and
`fe.world.branch = feature/restaurant-modules` as **`ok` facts**.
**They are false today, and false in the green direction** — the failure mode that never announces itself.
**The cause is structural, not a stale value.** `fe.world` and `be.world` parse `artifacts/world/WORLD.json`,
which `worldstamp` writes **from inside the repo it describes**. The hub's copy was stamped 2026-08-03T08:14Z
and the tree moved afterwards. **The backend copy is right about its branch by luck, not by construction.**
**The new pins read git's own bookkeeping instead** — `<dir>/.git` and
`<repo>/.git/worktrees/<name>/HEAD`, both written by `git checkout` itself — so no collector can forget to run
and no artifact can decay. Applied 2026-08-06: `be.dir.ref` now reads **`lane/meals-grace-pins`** and
`fe.dir.ref` reads **`lane/focustrap-teardown`**, with both `.pin` facts unconfirmed. The instrument caught
both trees on its first run.
**It does not clear `F-PROBE-DIR-IS-A-FOREIGN-LANE-BRANCH`.** Moving the trees onto the declared ref is a
separate act, and the backend tree is another lane's worktree — the owner's call, not the clerk's.
**Known limit, stated rather than discovered later**: the pin answers branch *identity*, not branch *position*,
and it assumes a linked-worktree layout, so a plain clone reds. That is a false alarm and never a false green.


===== F-WRONG-CLOCK-DEMOTES-A-TRUE-FINDING  [Warn]
TITLE: a UTC stamp compared against a local mtime, inside the audit of false conclusions
plan.md loc: plan.md:29187
FILE REFS (resolved at the tips):
  absences.md                                                ABSENT
  docs/plan/returns/L-DOWNLOAD-HEADERS-1.md                  ABSENT :7
QUOTED TOKENS (occurrence counts at the tips):
  lanes/L-ABSENCE-AUDIT-CONDITIONS               fe=0    be=0    []
  docs/plan/returns/L-DOWNLOAD-HEADERS-1.md:7    fe=0    be=0    []
  2026-08-01T16:08Z                              fe=0    be=0    []
  15:51Z                                         fe=0    be=0    []
  2026-08-01T15:51Z                              fe=0    be=0    []
  os.path.exists                                 fe=1    be=0    ['lanes/L-LIVE-WORLD-BANNER/mutation-proof.py']
BODY:
- clears when: the L-DOWNLOAD-HEADERS demotion in absences.md is reversed, and no evidence document compares a Z-suffixed timestamp against a filesystem mtime without converting one of them
- owner: @sven

**Measured by the clerk, 2026-08-05, and it reverses a demotion published minutes earlier.**
`lanes/L-ABSENCE-AUDIT-CONDITIONS` demoted the contradiction at `docs/plan/returns/L-DOWNLOAD-HEADERS-1.md:7`
— *"THE BRIEF FILE DOES NOT EXIST … was never generated"* — on the ground that the return came **103 minutes
before** the brief. It did not.
**The two timestamps were on different clocks.** The return's own stamp reads `2026-08-01T16:08Z`; the brief's
filesystem mtime reads `2026-08-01 17:51` **in CEST**, which is `15:51Z`. Converted to one clock:
- brief written **15:51:07Z**
- return written **16:07:45Z**
**The brief existed sixteen and a half minutes before the return said it never had.** Its own header stamps
`2026-08-01T15:51Z`, so the file states its birth in UTC while the filesystem states it in local time, and
reading the two side by side inverts the order.
**So the contradiction stands and the demotion is wrong.** The reviewer that first flagged it was right, and
the correction to the correction is now the record.
**The class is new and belongs beside the others.** This program has now measured six ways a search or a
comparison reaches a confident wrong answer: a bare pathspec that cannot match, a brace expansion that
mangles the extension, a decorated evidence string passed whole to `os.path.exists`, a check run against the
wrong repository, a claim re-derived at a newer ref than the document named, and a script run from the wrong
working directory. **Comparing a Z-suffixed stamp against a local mtime is the seventh**, and it is the one
that just cost a true finding.
**The irony is worth keeping rather than smoothing away.** It happened inside the lane whose subject is claims
that were never checked, in the same pass that correctly demoted a different claim and correctly refused an
impossible condition. Careful work is not the same as immune work, which is the argument for measuring rather
than trusting — including when the thing being measured is another measurement.


===== F-WT-THREE-LANES  [Warn]
TITLE: three lanes share one worktree and none was told
plan.md loc: plan.md:23185
QUOTED TOKENS (occurrence counts at the tips):
  wt-gr-deadline                                 fe=0    be=0    []
BODY:
- clears when: no two running lanes name the same worktree, or the brief that grants a worktree says who else holds it
- owner: @sven

The copy lane finished and reported a **concurrent actor** in `wt-gr-deadline`: a file that was clean when
it started now carries uncommitted lines it did not write. It excluded them from its commit and left them
untouched, which is exactly right.
**Those lines are a sibling lane's, and a third lane is landing that same branch.** Three lanes, one
worktree, and **none of their briefs said so** — the clerk dispatched all three without checking.
This is the shape that already cost a run yesterday, when a duplicate dispatch deleted a shared worktree
out from under a live process. Nothing was lost this time **because the lane checked before committing**
rather than because the dispatch was safe.
**It happened again the same hour, and the clerk caused it.** A lane was handed that worktree while the
landing lane was **actively working in it** — and committed under the second lane mid-edit. It saved its
diff, made its own worktree, and **restored the other lane's tree to its head**; both are clean and the
commit is intact. Its own words: *a brief that hands a lane someone else's live worktree will keep
producing this.*


===== F-XZ-CREDIT-DOUBLE-LAND  [Warn]
TITLE: an older credit lane would reintroduce the predicate collision
plan.md loc: plan.md:8993
QUOTED TOKENS (occurrence counts at the tips):
  L-XZ-CREDIT-FIELDS                             fe=0    be=0    []
  fail-spec                                      fe=2    be=1    ['test/e2e/scripts/live-world-banner-check.js']
  CreditPortionOf                                fe=0    be=0    []
  KassaCreditSale.IsCreditSale                   fe=0    be=5    ['lanes/L-LAND-THE-BACKEND-ON-THE-TRUNK/evidence.md']
  F-XZ-CREDIT-UNSPEC                             fe=0    be=0    []
  KassaCreditSale                                fe=1    be=7    ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/landing-receipt.md']
  IsCreditSale                                   fe=1    be=7    ['lanes/L-THE-TOP-RANKED-FIXES-REACH-THE-TRUNK/landing-receipt.md']
  lane/meals-xz-credit                           fe=0    be=0    []
BODY:
- clears when: lane/meals-xz-credit is retired or rebased onto the credit work that landed after it, and one predicate answers which lines are credit
- cleared by: L-XZ-CREDIT-FIELDS
- owner: @sven

**Named by `L-XZ-CREDIT-FIELDS`, which nearly returned `fail-spec` and then explained why it should not.**
The credit half of the X/Z work **does** already exist — on `lane/meals-xz-credit @ 25586d86`. But that
branch is **59 commits behind** the base the new work chose, is an **ancestor of neither** integration
candidate, covers **no delivery receipts**, and touches **no systembeskrivelse**.
**The lane took its field names and refused its predicate**, and the reasoning is the durable part: the
older branch carries a `CreditPortionOf` that is **a second answer to "which lines are credit"** beside
`KassaCreditSale.IsCreditSale` — the predicate the utlkvit family land composed onto **one** definition
read by six call sites. Adopting both would undo that.
It adopted the **names** deliberately, because `F-XZ-CREDIT-UNSPEC` records a probe that named a field
nobody chose and reported absence forever. Now `KassaCreditSale` owns both questions and `IsCreditSale`
is defined in terms of `CreditPortionOf`.
**The hazard is landing order, not code.** If `lane/meals-xz-credit` merges alongside the new work, the
predicate collision returns — and this estate has already spent a merge lane composing six call sites
onto one predicate precisely to end it.


===== F-XZ-CREDIT-UNSPEC  [Blocker]
TITLE: creating credit sales made two X/Z obligations live and unbuilt
plan.md loc: plan.md:22995
QUOTED TOKENS (occurrence counts at the tips):
  build-before-pilot                             fe=0    be=0    []
  meals.xz.credit                                fe=0    be=0    []
  CreditSalesAmount                              fe=0    be=0    []
  unconf                                         fe=21   be=48   ['test/growth-newsletter-page.test.js']
BODY:
- clears when: the X and Z reports carry the count and amount of delivery receipts and a specified count and amount of credit sales, and the systembeskrivelse describes what the code does
- cleared by: L-XZ-CREDIT-FIELDS
- owner: @sven
- blocks: FT-MEALS

§ 2-8-2 requires the count and amount of **utleveringskvitteringar**, and a specified count and amount of
**kredittsal**. The report service has no case for either and the entity has no fields.
**Before the delivery-receipt lane those items were vacuous** — the regulation conditions them on the
function existing. That lane created the function and left the report behind, which is a reasonable
scope boundary and an obligation nobody recorded.
Two aggravations. The systembeskrivelse now says the credit-sale specification *belongs to the X/Z report
and is described there*, **and that section does not mention it** — the RF-1313 false-control shape
again, in the document written to fix that shape. And the lane's own X-report test **pins the credit sale
inside the cash-sale totals**, which the estate's own export comment contradicts in as many words.
**Ruled 2026-08-03 (Sven): `build-before-pilot`.**
**Measured 2026-08-03 read-only across branches, and the probe was wrong rather than the work missing.**
The fact `meals.xz.credit` read zero **on the very branch named for it** — which looked like the work being
absent. It is not: the lane built it, and the field is `CreditSalesAmount`, not the name the probe asked
for. **A probe that names a field nobody chose will report an absence forever**, and nothing would have
distinguished that from the work never being done.
Corrected to the real field name.
**The same measurement quantifies the wrong-world cost.** The delivery-receipt fact reads present **only on
its own lane branch** and zero on the integration branch, the merged stack and the checkout every probe
actually reads. So both facts are honestly `unconf` — not because the probes are broken, but because
**the work is on branches the plan cannot see**, which is the merge finding stated in facts rather than in
prose.


===== F-ZSH-WORD-SPLIT  [Warn]
TITLE: a shell loop over a variable silently checks nothing
plan.md loc: plan.md:7996
QUOTED TOKENS (occurrence counts at the tips):
  $list                                          fe=0    be=0    []
  NONE(tip)                                      fe=0    be=0    []
  usage                                          fe=38   be=10   ['nuxt.config.js']
BODY:
- clears when: no brief instructs an agent to iterate a list in zsh, and every ancestry or existence check in a receipt shows its per-item output rather than a summary
- cleared by: L-WF-PUSH-LAND
- owner: @sven

**Three times in one session, twice by the clerk and once by a lane. It is worth a flag because the
failure mode is silence, not error.**
**zsh does not word-split an unquoted variable.** A `for` loop over `$list` iterates **once**, with the
whole string as a single item. Every command in the loop then runs against a nonsense argument.
What makes it dangerous here is what those commands do when handed nonsense:
- `git merge-base --is-ancestor "a b c"` prints **usage** and exits non-zero — which a `&&` chain reads
  as "not an ancestor". A lane hit exactly this and its first ancestry pass answered `NONE(tip)` for
  every branch in every family. **It caught it because it read the output instead of the exit code**, and
  re-ran every check.
- `read -r a b` with `-a` fails outright — that one is loud.
- A verify sweep looped this way attempted **zero** verifications and reported 97 refusals. The refusals
  were fabricated by the loop, not by the tool.
**The remedy is not "quote it".** It is: do list work in Python, and in any receipt **show the per-item
result rather than a count** — the clerk's fabricated 97 and the lane's fabricated `NONE(tip)` were both
summaries that looked plausible. A per-item line would have shown `usage:` in the first row.
This belongs beside the assertion-shape catalogue rather than in it: those are tests that cannot fail;
this is a **check that never ran** and reported an answer anyway.
