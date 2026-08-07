

===== F-FIRST-AFFECTED-REVISION-CAN-BE-SUPERSEDED  [Warn]
TITLE: it points at a revision, and the pointer can be stale
plan.md loc: plan.md:32856
QUOTED TOKENS (occurrence counts at the tips):
  WorkforceRequestsService.FirstAffectedPublishe fe=0    be=0    []
  F-REPUBLISH-DOUBLES-PLANNED-MINUTES            fe=0    be=0    []
BODY:
- clears when: the first-affected schedule revision is never a superseded one, shown by a case where a superseded revision would have been named
- owner: @sven

**Separated out on the lane's own advice, and it was right to insist.**
`WorkforceRequestsService.FirstAffectedPublishedRevisionAsync:424` shares the missing lineage filter with the
three readers in `F-REPUBLISH-DOUBLES-PLANNED-MINUTES` — **but it is a different failure.** It does not double
anything. It **returns a pointer to a superseded revision.**
**So a fix scoped to the doubling would close this flag without ever touching it**, which is exactly how a
defect survives a sweep that appears to have covered it.
**And the right answer is not obvious.** Excluding superseded lineage here changes *which* revision is named,
not a count — so whoever takes it must say what the correct answer is rather than applying the filter by
reflex.


===== F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM  [Warn]
TITLE: a Norwegian fiscal receipt prints the code's own word for it
plan.md loc: plan.md:30500
FILE REFS (resolved at the tips):
  Services/Kassa/EscPosReceiptBuilder.cs                     be-exact :315
QUOTED TOKENS (occurrence counts at the tips):
  Services/Kassa/EscPosReceiptBuilder.cs:315     fe=2    be=0    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  CompanyAccount                                 fe=16   be=58   ['test/payment-type-label.test.js']
BODY:
- clears when: no payment type renders its raw enum name on the ESC/POS receipt, or each remaining one is recorded as deliberate
- cleared by: L-ESCPOS-COMPANYACCOUNT-LABEL
- owner: @sven

**Found while confirming a different defect, on the artifact that actually matters.**
`Services/Kassa/EscPosReceiptBuilder.cs:315` has **no `CompanyAccount` arm**, and its default returns the
enum name — so a company credit sale prints the raw English **`CompanyAccount`** on a Norwegian fiscal
receipt.
**It is the safer default failing in the other direction, which is why it survived.** The sibling emitter
blanks the line and was found because a blank is conspicuous; this one always prints *something*, and
something is what a reviewer checks for. **A printed word that is the programmer's word rather than the
reader's is harder to see than an empty line and just as wrong on a document an inspector reads.**
**Distinct from the blank-payer defect and on the other emitter.** The two share no code: the blank is on the
emailed PDF, a commercial document; **this one is on the journal-backed ESC/POS receipt.**


===== F-FIXTURE-BACKUP-STALE  [Warn]
TITLE: a restore-from-backup would now drop another lane's work
plan.md loc: plan.md:23390
BODY:
- clears when: no lane holds a stale backup of a shared fixture file, or restores are done by pathspec commit rather than by file copy
- owner: @sven

The byte-exact backup-and-restore habit — adopted precisely **because a checkout would destroy other
lanes' hunks** — has developed the failure it was invented to prevent. One lane's backup of the shared
fixture server is now **stale against the file it would restore**, so **restoring from it would drop a
sibling's committed hunks.**
Two lanes also collided on the same tree in the same hour: one **briefly swept the other's staged files
into its commit**, amended to release them, and the other re-committed alone.
**The habit is not the fix; committing by pathspec is.** A backup is a snapshot of a moment on a tree
where a dozen lanes are moving.


===== F-FIXTURE-BEHIND-BACKEND  [Blocker]
TITLE: the e2e fixture can be a release behind what it stands in for
plan.md loc: plan.md:23442
FILE REFS (resolved at the tips):
  lanes/L-BLOCKER-RESTATE/verdicts.md                        ABSENT :197
  package.json                                               fe-exact
  test/e2e/scripts/fixture-divergence.js                     fe-exact
  GrowthNewsletterService.cs                                 be-suffix :649
  growth-newsletter.js                                       fe-suffix
  test/fixture-refusal-divergence.test.js                    fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  check-for-divergence                           fe=0    be=0    []
  lanes/L-BLOCKER-RESTATE/verdicts.md:197-200    fe=0    be=0    []
  package.json                                   fe=5    be=4    ['nuxt.config.js']
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  test/e2e/scripts/fixture-divergence.js         fe=2    be=0    ['package.json']
  test:e2e:fixture-divergence                    fe=10   be=0    ['package.json']
  --prove                                        fe=2    be=0    ['package.json']
  L-FIXTURE-DIVERGENCE                           fe=1    be=0    ['lanes/L-ARTIFACT-RANK-KEY/evidence.md']
  :197-200                                       fe=0    be=0    []
  31fc45d                                        fe=0    be=0    []
  a62160e                                        fe=0    be=0    []
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  GrowthNewsletterService.cs:649                 fe=0    be=0    []
  growth-newsletter.js                           fe=4    be=0    ['test/fixture-refusal-divergence.test.js']
BODY:
- clears when: a check reds when the fixture's refusal shapes diverge from the backend's, rather than a lane noticing by hand
- cleared by: L-FIXTURE-DIVERGENCE
- owner: @sven
- blocks: S-EVIDENCE

**Found twice in one day, from opposite directions, and it is worse than either instance.**
The admin-confirm lane found **the fixture was a release behind the backend** — it checked address
equality but **not the confirmation flag** that had just landed. Its journey would have run against **a
world that never refused anything**: an assertion that could not fail, in the exact shape the standing law
names. It levelled the fixture and re-ran a sibling journey green.
The journey-coverage lane found the same class from the other side: two ported fixtures answered
**hard-coded flags**, so the surfaces they stood in for could not refuse either.
**This is the fixture-models-no-flags defect generalised.** A fixture is a claim about a backend, and
nothing checks that claim. Six journeys were once green for exactly this reason; **the remedy so far has
been a lane noticing by hand, which is not a remedy.**
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `check-for-divergence`.**
**Closed 2026-08-03 — and the lane reframed the flag while closing it. The divergence is real, but not as
"somebody forgot": there is no single backend to be behind.** Three refusal shapes exist on lane branches
and **do not exist on the integration branch at all.** The fixture is level with three lanes and **ahead of
the integration branch.**
So a committed snapshot of "the backend's refusals" would have gone green the moment the backend moved,
which is the failure one level up. The check instead **reads a named checkout and prints the sha, branch
and dirty state it read** — the answer is only as good as the world you point it at, and it says which
world that was.
**Derived, not enumerated, and the residue is stated.** Backend refusal statuses come from each module's
typed exception class; routes from their attributes; reachable refusals scoped by the controller's own
imports. On the fixture side **a refusal primitive is any function whose parameters name both a status and
a code** — which found four differently-named helpers without being told any of them. What remains
enumerated is the route mapping per handler, and **a mapping does not go stale when a refusal is added**,
while a missed declaration **reds rather than greens.**
**Discrimination proved both ways on the real corpus.** Deleting one refusal reds it by name, file and
line. Renaming a helper,


===== F-FIXTURE-NO-GATES  [Blocker]
TITLE: the e2e fixture modelled no flags, so gated journeys could not fail
plan.md loc: plan.md:22792
QUOTED TOKENS (occurrence counts at the tips):
  workforce-schedule-publish                     fe=36   be=0    ['playwright.config.js']
  fixture-models-the-flag-store                  fe=0    be=0    []
  D-SPEC-L-GR-DELIVERY-RECORD                    fe=0    be=0    []
BODY:
- clears when: the e2e fixture models the flag store for every gated surface a journey walks, and each such journey turns its own switch on through the product rather than assuming it
- cleared by: L-FIXTURE-FLAG-STORE
- owner: @sven
- blocks: S-EVIDENCE

**Found by the lane that built the flag switchboard, in its own neighbourhood.** The
`workforce-schedule-publish` journey was green **only because the fixture modelled no flags at all.** The
publication flag gates all four schedule writes and is deny-closed, so **on a real store every step of
that journey would have been refused.**
The journey was not weakly asserted; it was asserted against a world that cannot produce the refusal.
That is the thirteenth assertion-that-cannot-fail found in two days, and the first at journey scope
rather than test scope.
The remedy is not per-journey: any journey walking any gated surface has the same hole, and five other
modules are deny-closed the same way. The fixture must model the gate, and a journey should turn its own
switch on **through the product** — which is what the flag journey now does.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `fixture-models-the-flag-store`.**
**Audit verdict 2026-08-03: already-fixed. The remedy is dated 08-01 — two days before the ruling written
for this flag — and it is at the world**, not on a branch. This is one of the eight stale blockers found
today.
**Its lane is therefore held rather than dispatched.** Sending an agent at it would be the ninth lane spent
discovering that work already exists, and the whole point of the re-measure was to stop paying that price.
It waits for `D-SPEC-L-GR-DELIVERY-RECORD`'s ruling, which decides how the already-fixed set is closed —
the same question this flag now poses.


===== F-FIXTURE-PRINTS-WORDS-THE-PRODUCT-CANNOT-SAY  [Blocker]
TITLE: six of twelve wrong values reach a screen
plan.md loc: plan.md:30071
FILE REFS (resolved at the tips):
  EventsJourney.vue                                          fe-suffix :136
  growth-newsletter.vue                                      fe-suffix :561
  events.js                                                  fe-suffix
  world.js                                                   fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  EventsJourney.vue:136                          fe=0    be=0    []
  deposit.paymentType                            fe=1    be=0    ['components/admin/events/EventsJourney.vue']
  growth-newsletter.vue:561                      fe=0    be=0    []
  Superseded                                     fe=15   be=101  ['test/events-guest.test.js']
  Received                                       fe=45   be=132  ['test/growth-privacy-page.test.js']
  events.js                                      fe=3    be=0    ['nuxt.config.js']
  world.js                                       fe=20   be=1    ['test/journey-rerunnability.test.js']
  Capture                                        fe=20   be=371  ['test/meals-statement-view.test.js']
BODY:
- clears when: every enum-backed value the e2e fixtures emit is a member of the enum the reading code binds it to, or each divergence is recorded as deliberate
- cleared by: L-FIXTURE-VALUES-ARE-ENUM-MEMBERS
- owner: @sven

**Swept with a denominator: all 10 fixture files, 6,655 lines, 1,556 string literals plus 17 enum-shaped keys,
360 rows checked, 272 bound to a backend enum by the code that reads them.** **260 of 272 are right — five
files are entirely clean.**
**Twelve are wrong and six of them print to an operator.** The clerk confirmed two by object:
`EventsJourney.vue:136` renders `deposit.paymentType` **raw**, without the label map that exists, and
`growth-newsletter.vue:561` interpolates a submission status straight into a notification. Four more print
through the same component, and one is the twin of the consent case already recorded — **the prior lane caught
the string; nobody had noticed it was printed.**
**One of the twelve names a state that does not exist at all.** `Superseded` as a workforce invitation state —
the backend reuses the single pending row. And `Received` renders as the fallback «Ikke satt», so it is
**wrong and invisible at the same time.**
**The drift is seeded-versus-simulated rather than per-module, which is the transferable part.** `events.js`
derives its values **by running the machine**: 74 of 74 correct. `world.js` hand-types them and owns **5 of the
12 — all inside the Events objects `events.js` serves but does not build.**
**And a union-membership check would pass 5 of the 12.** `Capture` is a genuine member of another enum;
four more belong to five other enums. **Only binding each field to the enum its reading code uses finds them**,
which is why the binding table with its backend file-and-line evidence is the artefact worth keeping.
**Five more string-typed fields diverge outside the enum-backed criterion, three of them rendered** — including
one where **the fixture disagrees with itself**. The sharpest: `approval.state: 'Superseded'` is **silently
collapsed to none**, so that journey walks *not approved* instead of the *approval superseded* branch it was
written for. **A journey testing the wrong branch, again.**


===== F-FLAG-CONDITIONS-ARE-NOT-TESTABLE  [Warn]
TITLE: the hazard count cannot fall no matter what lands
plan.md loc: plan.md:28920
QUOTED TOKENS (occurrence counts at the tips):
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
  fact                                           fe=337  be=489  ['playwright.config.js']
  F-POS-TENDER-WIRE-REINTRODUCES-TWO             fe=0    be=0    []
  needs                                          fe=197  be=351  ['playwright.config.js']
BODY:
- clears when: a majority of open blocker flags carry a clears_when naming a fact: key, so the clerk can clear them by measurement rather than by asking
- cleared by: L-FLAG-CONDITIONS-TESTABLE
- owner: @sven

**Measured 2026-08-05: of 170 open flags, 5 carry a `clears_when` the tool can test.** One blocker, two warns
and two infos name a `fact:` key. **The other 165 name a condition in prose**, and `plan flag clear` refuses
them with *"clears_when names no fact: key, so the tool cannot test it"* — leaving `--override --by @sven` as
the only path.
**The consequence is that the headline's hazard count is not responsive to work.** `flags 60! 100~` reads as a
standing measure of what is wrong, and it will read the same after the hazard is fixed, because nothing but an
owner's override can move it. That was demonstrated the moment it was found: `F-POS-TENDER-WIRE-REINTRODUCES-TWO`
had **both arms of its condition verified independently by the clerk** — the branch 0 ahead of the tip, one
predicate definition taking the journal entry, six call sites — and it stays open, because the condition is a
sentence rather than a key.
**This is instrumentation, not intent, so it is fixable without amending anything.** A `clears_when` claims
nothing about the past; it says how the world will be checked in future. Rewriting one to name a fact key
backed by a probe is the same class of act as adding the probe.
**The cost of leaving it is not the count — it is the queue.** Sixty blockers that only Sven can clear is
sixty items in his queue, most of which are questions of fact that a probe would settle without him.
**Corrected, 2026-08-05: the clerk's framing of this flag was wrong in the direction that mattered.** The
lane that classified all sixty open blockers found **only 16 of 60 need a person** — seven owner acts, two
product rulings, seven genuinely inexpressible — and **44 are testable with a probe that can be written**. The
clerk had reported the opposite, that 165 of 170 flags were beyond measurement and that Sven's queue was
therefore unavoidable. **Most of that queue is authorable work.**
**And the calibration case ruled against the clerk too.** `F-POS-TENDER-WIRE-REINTRODUCES-TWO` is class three,
and `plan flag clear` refusing prose was **right**: the tempting probe tests presence rather than uniqueness,
its subject is a relationship between branches, and the file is not in the checkout probes read. **The answer
was never an override.** It was to leave the merge-simulation derivation behind as an artifact a probe can
read, which nobody did.
**The ranking is the a


===== F-FLAG-PAGE-PROMISED-ONE-BEHAVIOUR-FOR-SIX  [Warn]
TITLE: a switchboard described six gates as if they agreed
plan.md loc: plan.md:28489
QUOTED TOKENS (occurrence counts at the tips):
  L-TRAIN-READONLY-VISIBLE                       fe=0    be=0    []
  /admin/feature-flags                           fe=50   be=2    ['test/feature-flags-page.test.js']
  EventsModuleGate                               fe=8    be=34   ['test/e2e/fixture/events.js']
  EVENTS_DISABLED                                fe=25   be=24   ['test/feature-flags-page.test.js']
  training.setup                                 fe=21   be=15   ['test/feature-flags-page.test.js']
BODY:
- clears when: each module's row states what its own switch does, verified against that module's gate, with no fleet-wide claim standing above them
- owner: @sven

**Found by `L-TRAIN-READONLY-VISIBLE` while making one row true, and it was sitting directly above that
row.** The `/admin/feature-flags` intro promised, **for all six modules at once**, that a switch which is
not on *"refuses writes — reads and exports of what is already recorded keep working."*
**It is false for at least one.** `EventsModuleGate` answers **404 `EVENTS_DISABLED`** and takes the module
**dark, reads included.** So an operator reading that page was told the opposite of what Events does.
**The part that makes this a flag rather than a fixed defect: four modules were never checked.** Training
and Events are now known and they **disagree with each other**. Meals, Growth, Workforce and Margin have
not been read against their own gates, so the page has been replaced with *"the answer differs by module —
read the row"*, which is honest but is not yet the same as each row being true.
**Why it matters more than wording.** This is the switchboard an operator reaches for **during an
incident**. A promise that reads uniformly invites one mental model for six different behaviours, and the
moment it is wrong is the moment somebody is already under pressure.
**Not touched, deliberately, and correctly:** whether Events *should* dark its reads is its owner's call,
not a lane's. The finding lane changed no gate.
**One nuance worth keeping, because the corrected copy states it.** Even for Training, "reads keep
serving" is not unconditional: a store that has **never recorded anything** does go dark on 404, because
visibility means `training.setup` on **or** a Training row already exists. The row says so rather than
over-claiming — which is the standard the other four rows now have to meet.


===== F-FLAG-PROBES-CANNOT-COMPARE-A-VALUE  [Blocker]
TITLE: the one fact-backed blocker clears on a filename
plan.md loc: plan.md:29153
FILE REFS (resolved at the tips):
  ClockScreen.vue                                            fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  flag_condition_met                             fe=0    be=0    []
  =<literal>                                     fe=0    be=0    []
  verify                                         fe=31   be=146  ['test/admin-nav-access.test.js']
  exists                                         fe=362  be=582  ['playwright.config.js']
  sha256                                         fe=21   be=36   ['test/growth-newsletter-page.test.js']
  junit                                          fe=0    be=0    []
  json                                           fe=162  be=480  ['nuxt.config.js']
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
  F-ACCT-DUP                                     fe=0    be=0    []
  acct.uidx                                      fe=0    be=0    []
  be.world                                       fe=0    be=0    []
  False                                          fe=23   be=370  ['test/e2e/scripts/live-world.sh']
  unconf                                         fe=21   be=48   ['test/growth-newsletter-page.test.js']
  ClockScreen.vue                                fe=7    be=0    ['test/pos-clock-reserved-key.test.js']
BODY:
- clears when: a clears_when backed by a fact is refused unless the fact's value is compared, so no flag clears on the mere presence of a file
- owner: @sven

**Measured by reading the tool rather than the spec prose, and it reverses the assumption every probe in this
plan was written under.** `flag_condition_met` checks only that a fact's `status == ok` and that its content is
non-empty. **It never compares the value.** The `=<literal>` form that `verify` honours is stripped and ignored
here.
**So `exists`, `sha256`, `trx`, `junit` and `json:` on any count or boolean are unsound in a `clears_when`** —
they assert that something was read, not that it says what the flag requires.
**That indicts the one flag in this plan already wired to a fact.** `F-ACCT-DUP` — the live accounting-day
double-post — clears on `acct.uidx`, which is `exists` against a **filename glob**. It would clear on any
migration whose name matches, **not on a unique index existing.** And `be.world` reads **`False` at status
`ok`**, which any presence-only condition would treat as satisfied.
**Two further properties, also from the source and also not in §2.6.** A probe reads **one file** — glob,
newest mtime, and `**` does not recurse — so a condition like *one definition and six call sites* is outside
the vocabulary by construction. And **probes only ever assert presence**: no match is `unconf`, never *absent*,
so every negative condition has to be inverted into an artifact that a fix leaves behind.
**And the probe root is the working directory, with no git.** Of 61 probes drafted against these blockers,
**exactly one reads a file a fresh clone of the declared world would have.** A worked case: `ClockScreen.vue` is
on disk, in no index and on no ref this branch has — a probe would clear `F-POS-CLOCK-NO-CLIENT` here and fail
in a clone.
**This is a blocker because it makes the instrument capable of clearing a live defect on a false reading**,
and the live defect it currently points at is the accounting double-post.


===== F-FLAGS-FALSE-GUARANTEE  [Blocker]
TITLE: the switchboard promises a reliability it does not have for Meals
plan.md loc: plan.md:22924
FILE REFS (resolved at the tips):
  TrainingFeatureFlags.cs                                    be-suffix :118
QUOTED TOKENS (occurrence counts at the tips):
  lane/flags-resolvers-cover-three               fe=0    be=0    []
  0f29a898                                       fe=0    be=0    []
  lane/flags-effective-resolvers                 fe=1    be=0    ['lanes/L-FLAGS-IMPOSSIBLE-COMMENT/notes.md']
  e45ec4c1                                       fe=1    be=0    ['lanes/L-FLAGS-IMPOSSIBLE-COMMENT/notes.md']
  lane/flags-excuse-byflag                       fe=0    be=0    []
  6ae0b8db                                       fe=0    be=0    []
  TrainingFeatureFlags.cs:118-119                fe=0    be=0    []
  Defaults                                       fe=3    be=31   ['components/admin/pos/PaymentScreen.vue']
  Declared                                       fe=10   be=61   ['test/modal-scroll-lock.test.js']
  merge-it                                       fe=0    be=0    []
BODY:
- clears when: Meals registers an effective-flag resolver, or the screen's reliability sentence is scoped to the modules where it holds
- cleared by: L-FLAGS-RESOLVERS-COVER-THREE
- owner: @sven
- blocks: S-PILOT-SAFE

**The landing vehicle is `lane/flags-resolvers-cover-three` @ `0f29a898`.** The backend half was first written
2026-08-01 on `lane/flags-effective-resolvers` @ `e45ec4c1`; that branch and `lane/flags-excuse-byflag` @ `6ae0b8db`
are **retired-superseded** — equivalence ruled safe on review 2026-08-06, by enumerating changed paths on each branch
rather than assuming them, then blob-identity on all 7 added files and hunk-content comparison on the 3 modified
ones. `e45ec4c1` is the *parent* of `6ae0b8db`, so the two are one linear chain and no independent work is lost;
both worktrees are clean at their tips. Meals, Events and Growth each report through their real gate. **Training
correctly needs none**, and that is structural rather than incidental: `TrainingFeatureFlags.cs:118-119` builds
`Defaults` from the same `Declared` records the catalog is handed, so gate and endpoint cannot disagree — though
nothing pins that if Training later grows an outer switch.
The flag stays open until `0f29a898` lands, and one consequence remains: the note's *other* half —
*effective on is not a promise* — is now merely **over-cautious** rather than wrong, in three languages.
The screen tells the operator, **in three languages**, that an effective-off can be relied on — the gate
will refuse. Its client says the same in a comment. **For the one Meals row it draws, that is false.**
The store-backed Meals flag falls back to **configuration, not the advertised default**, and Meals
registers no effective resolver. So with the module config on and no row, the controller reports
effective-off while the gate answers on.
**That is character-for-character the divergence Margin's resolver was written to close** — its source
comment describes exactly this case. Margin closed it; Meals did not.
Latent on shipped configuration, which is why nobody has seen it. **The first Meals pilot is the day it
goes live**, because the backend's own reach test says a pilot is enabled by precisely that config key.
**Ruled 2026-08-03 (Sven): `merge-it`.**


===== F-FOCUSTRAP-TEARDOWN-NEVER-RUNS  [Warn]
TITLE: a Vue 3 hook in a Vue 2 app
plan.md loc: plan.md:30407
FILE REFS (resolved at the tips):
  FocusTrap.vue                                              fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  FocusTrap.vue                                  fe=6    be=1    ['test/payment-type-label.test.js']
  unmounted()                                    fe=3    be=0    ['test/payment-type-label.test.js']
  beforeDestroy                                  fe=70   be=2    ['test/pos-clock-reserved-key.test.js']
  destroyed                                      fe=29   be=33   ['test/growth-privacy-page.test.js']
  _tick                                          fe=3    be=4    ['test/pos-clock-reserved-key.test.js']
  data()                                         fe=57   be=5    ['jest.config.js']
BODY:
- clears when: the focus trap releases on teardown through a hook this Vue version calls, shown by a test that reds when the release is removed
- cleared by: L-FOCUSTRAP-TEARDOWN
- owner: @sven

**`FocusTrap.vue` declares its teardown in `unmounted()`** — the clerk confirmed the line — **and this is a
Vue 2 application, which never calls that hook.** The Vue 2 name is `beforeDestroy`/`destroyed`.
**So the release never runs.** Whatever the trap installs — listeners, a focus restore, a document-level
handler — stays installed after the component goes.
**It is the same shape as the dead `_tick` property found an hour ago**, where an underscore-prefixed key was
declared in `data()` and Vue never proxied it: **code that reads as careful and executes as nothing.** Neither
was caught by a suite; both were found by somebody reading the file for another reason.
**Named by a lane whose subject was payment labels**, and left unfixed because it is nobody's lane — which is
why it is here.


===== F-FOUR-PAGES-STILL-DO-NOT-RESTART-AFTER-IN-PAGE-SIGN-IN  [Warn]
TITLE: overview, offers, kam and goods allow an in-page sign-in and bind nothing to login-success
plan.md loc: plan.md:33178
BODY:
- clears when: each of the four pages holds the state a fresh mount would have produced after an in-page sign-in, shown by driving the login-success path and reading the page own store
- owner: @sven


===== F-FRONTEND-DECLARES-STATES-THE-SERVER-CANNOT-SEND  [Warn]
TITLE: a mirror that invented two members
plan.md loc: plan.md:30608
QUOTED TOKENS (occurrence counts at the tips):
  Ukjent                                         fe=15   be=13   ['test/workforce-pivot-components.test.js']
  OrderStatus                                    fe=8    be=147  ['test/ongoing-board-covers-every-live-status.test.js']
BODY:
- clears when: every member of the frontend delivery and order-status mirrors exists in the backend enum, or each extra is recorded as deliberate with what produces it
- cleared by: L-MIRROR-HOLDS-ONLY-REAL-MEMBERS
- owner: @sven

**Found while routing three labels through the dictionary, and it is the enum-mirror defect running the other
way.** The recorded gap so far has been the frontend being **short** a member the backend can send. These two
are the opposite: **the frontend declares states the server has no way to produce.**
- One delivery type is **a member of no enum anywhere** — not the backend's, not the shared core's. Nothing
  can ever set it.
- The shared core declares an order status **the backend does not have.**
**The short direction and the extra direction fail differently, which is why this is its own flag.** A missing
member renders `Ukjent` for something real — visible, wrong, and reported by whoever sees it. **An extra
member renders nothing at all, because nothing ever selects it**, so it survives every test, every review and
every walk. It is dead code wearing a domain name, and the next person to read the mirror will believe it.
**It also makes the mirror useless as documentation.** A reader checking what states exist now gets a superset
of the truth, with no way to tell which entries are real without going to the backend — which is the one thing
the mirror was supposed to save them.
**Half of this flag is refuted, measured at the backend tip on 2026-08-05.** `OrderStatus` carries
`OpenCheck = 10` and has **nine** members; the shared core mirrors it exactly. **The claim that the frontend
declares an order status the backend does not have was wrong** — what is short is the label ladder, which is
the opposite direction and belongs with the other short rows.
**The surviving half holds and gained a second member.** One delivery case was a real backend member removed
in 2024 that the frontend never dropped, and a reward transaction type exists in the mirror and not in the
backend. **Neither is assigned anywhere in source, fixture or test**, so both are dead rather than
client-set.
**The second one is why this flag is worth keeping despite the refutation:** that same mirror is **short in
the other direction at the same time.** It can name a case that cannot occur and cannot name the case that
does — and an audit of either direction alone finds half of it.


===== F-FRONTEND-ENUM-MIRROR-SHORT-A-MEMBER  [Warn]
TITLE: a copy of a backend enum that is missing one
plan.md loc: plan.md:30168
FILE REFS (resolved at the tips):
  core/enums/payment-type.ts                                 ABSENT
  core/pinia/checkout.ts                                     ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  core/enums/payment-type.ts                     fe=0    be=2    ['docs/plans/replan/b-meals-completeness.md']
  PaymentType                                    fe=17   be=383  ['test/payment-type-label.test.js']
  CompanyAccount                                 fe=16   be=58   ['test/payment-type-label.test.js']
  core/pinia/checkout.ts                         fe=2    be=0    ['test/e2e/journeys/consumer/meals-funded-checkout.spec.js']
  RewardTransactionType                          fe=0    be=6    ['Enums/RewardTransactionType.cs']
  core/enums                                     fe=9    be=7    ['test/store-cart-state.test.js']
BODY:
- clears when: the frontend enum mirrors carry every member their backend enum declares, or each omission is recorded with the reason
- owner: @sven

**Found by a lane that deliberately refused to use it as a source.** `core/enums/payment-type.ts` carries
**16 members** — the clerk confirmed the count — where the backend enum carries **17**. The lane read the
backend by object at the tip for every one of its six enum checks **rather than trusting the mirror**, and said
so.
**A mirror short a member is worse than no mirror**, because it answers. A membership check against it returns
*not a member* for a value the product can genuinely produce, and the caller has no way to tell that from a
real divergence.
**It is the same shape as the fixture drift one layer in.** A fixture that speaks words the product cannot say
was found by binding each field to the enum its reading code uses; **a mirror that omits a word the product can
say fails the same test from the other direction.**
**How many mirrors exist and how many are short is not known.** One was measured because one lane needed it.
**Censused: 40 declarations across 918 files, matched by member set against all 177 backend enums with the
name kept as a separate column** — and the extractor validated first on the known positive. **32 are mirrors,
24 agree member-for-member, 8 diverge, and 8 are not mirrors at all** — HTTP verbs, action names, vendor
strings.
**One defect, and it is the only mirror that is both short a member and read as a value.** `PaymentType` omits
**`CompanyAccount`**, and `core/pinia/checkout.ts` resolves the checkout label through an **equality ladder** —
the clerk read the lines. **A company-account tender falls through every branch.** The other seven divergences
are type-annotation-only today.
**One addition, and it is the class nothing can complain about.** `RewardTransactionType` carries a member the
backend does not have while **dropping one it does** — and the enum that should have had it is missing it.
**A membership check that *has* the member simply passes**, so an addition is invisible from both sides.
**Readers matter and were counted: 8 value-read, 27 type-only, 5 with no reader at all.**
**Name-keying would have failed twice** — one mirror matches no backend name, another scored a spurious 0.27
against an unrelated enum and is vendor strings the backend types as plain text. **And set-matching alone ties
three ways** on one member set, resolved only by the importing model. **A member added to one of those three
would be invisible to a set-keyed check.**
**Recorded but not a


===== F-GIT-ADD-SWALLOW  [Warn]
TITLE: a concurrent stage swallowed another lane's files
plan.md loc: plan.md:23375
BODY:
- clears when: every lane commits by pathspec, so a concurrent lane's files cannot be staged by accident
- owner: @sven

**A lane's first commit swallowed six of another lane's untracked files**, because a broad stage on a
shared tree takes whatever is there at that instant. It was repaired — reset, re-commit, and the other
lane's two modified and six untracked files **verified byte-identical afterwards** — but the repair was
luck of noticing.
**The durable fix is one habit: commit by pathspec.** `git commit -- <paths>` is immune to it. With a
dozen lanes on one tree and two worktree collisions already this program, it should be a standing rule in
every brief rather than a lesson each lane learns once.


===== F-GR-CONFIRM-AGELESS  [Warn]
TITLE: a mailbox that changed hands quietly still authorises a send
plan.md loc: plan.md:23601
BODY:
- clears when: a confirmation older than a ruled window cannot authorise a send, which needs both the window and a column recording when the confirmation was made
- owner: @sven

Named by the lane that closed everything else about this, **and it stopped exactly where a ruling was
required rather than inventing one.**
A mailbox that changed hands and **quietly accepts** mail leaves no suppression, so nothing catches it.
Closing that needs **two things the estate does not have**: a staleness window nobody has ruled, and a
column recording **when** a confirmation was made. The lane authored neither, on the reasoning that **an
unruled window makes it a column nothing reads.**
The residue matters because the confirmation is now the load-bearing proof that an address belongs to its
sender. This is the part of that proof that cannot be strengthened by evidence — only by a policy.


===== F-GR-DISPATCH-UNATTRIBUTED  [Blocker]
TITLE: a mass send has no attributable trigger
plan.md loc: plan.md:23130
QUOTED TOKENS (occurrence counts at the tips):
  resolve-and-record-the-actor                   fe=0    be=0    []
BODY:
- clears when: the dispatch call resolves and records the actor that triggered it
- cleared by: L-GR-DISPATCH-ACTOR
- owner: @sven
- blocks: FT-GROWTH

Found while reviewing the test-send guard, and it **undercuts that lane's own framing.** Test-send was
described as the only newsletter write whose controller passed no user id. **That is not true — dispatch
passes none either**, and dispatch is the path that mails the whole audience.
It is approval-gated, so a name exists — but it is **the approver's, not the sender's**, and those can be
different people. Combined with Growth having no audit ledger at all, **a mass send has no attributable
trigger anywhere on disk.**
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `resolve-and-record-the-actor`.**
**Closed 2026-08-03, confirmed still-true at the tip first.** The dispatch action was **the only write on
that controller not requiring a caller identity**, and the run row carries no actor column — so the only
name reachable from a send was **the approver's: who cleared the content, not who sent it.**
**It recorded one row per request rather than per run**, and the reasoning matters: dispatch is idempotent,
but **a caller who re-triggers it drives the drain that submits whatever is still queued** — so naming only
the creator misattributes that mail. Both roles are separated, and the created-run row is staged **inside**
the transaction, so it commits with the deliveries or not at all.
**It landed in the ledger a sibling built rather than beside it**, based on that lane's branch instead of
the bare tip — **no column, no index, no constraint**, so the specified migration shape is unchanged. That
is the fifth same-shape collision this week avoided by reading across worktrees first.
**By-value across three distinct principals** — approver, dispatcher and re-requester — with two admins on
one run leaving **two rows with two different ids, which no prefix-plus-constant can produce.**
**And it proved the unreachable-401 rather than faking it**, independently reproducing the finding a Margin
lane made the same day: no token authenticates while being unnameable, so a wire test asserting that
refusal would be measuring authentication. Pinned as a fact — empty challenge body, the module's code
absent — with the guard proven at the service seam instead.


===== F-GR-FALSE-EVIDENCE  [Blocker]
TITLE: Growth privacy resolutions record deliveries that never happened
plan.md loc: plan.md:26083
QUOTED TOKENS (occurrence counts at the tips):
  no-record-without-success                      fe=0    be=0    []
  D-SPEC-L-GR-DELIVERY-RECORD                    fe=0    be=0    []
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: the access and erasure resolution records cannot report a delivery unless the sender reports success, proven by a contract case in which the sender throws
- cleared by: L-GR-DELIVERY-RECORD
- owner: @sven
- blocks: FT-GROWTH

The Art. 15 export and the Art. 17 completion notice both terminate in the in-memory fake mail
provider, and the resolution record is written with the delivery marked delivered regardless. As deployed
these are false entries in the evidence a regulator would be shown. Separate from F-GROWTH-FAKE-MAIL,
which is the delivery gap itself; this is the record claiming otherwise.
**Ruled 2026-08-03 (Sven): `no-record-without-success`.**
**Measured 2026-08-03: this flag describes a defect that no longer exists, and had not for some time.**
A lane sent to close it found the ruling **already implemented at the integration tip**, by a commit whose
own message is *an article 15/17 receipt can no longer record a delivery nobody made*. The phrase this flag
rests on returns **four hits, all past-tense comments describing the defect, and zero code**. The state
that reports a delivery has exactly one producer, downstream of both checks.
The existing test was already the contract case the exit asked for — a throwing sender on both articles,
paired in-world with a succeeding one — and the lane **proved it discriminates** rather than assuming:
swallowing the throw reds exactly the two throwing arms, dropping the outcome check reds four.
**C1 settled without anyone:** the table has never been deployed, so there are no false entries to repair.
**The uncomfortable part is how it was found.** Nothing in the plan noticed. It surfaced only because an
agent was dispatched to build work that was already delivered — which means the cost of a stale blocker is a
whole lane, and there is no reason to think this is the only one. See `D-SPEC-L-GR-DELIVERY-RECORD`,
option three.
The tool refused my clear because `clears_when` names no fact key and cannot be tested. That refusal is
correct and the flag stays open for the owner — but it is open as **bookkeeping**, not as work.


===== F-GR-HEALTH-DEAF  [Blocker]
TITLE: the delivery health endpoint reports perfect health on a deaf pipeline
plan.md loc: plan.md:26344
QUOTED TOKENS (occurrence counts at the tips):
  withhold-rather-than-zero                      fe=0    be=1    ['WebApi.Tests/Margin/MarginSetupDayResolutionTests.cs']
  L-GROWTH-HEALTH-HONEST                         fe=0    be=1    ['artifacts/tests/99855b1d1d35ab35c1c09e072da0fc6d42421e56/RUN.md']
BODY:
- clears when: the delivery rates are withheld rather than reported as zero whenever the bound provider cannot deliver events
- cleared by: L-GROWTH-HEALTH-HONEST
- owner: @sven
- blocks: FT-GROWTH

With Postmark bound, no delivery, bounce or complaint event can ever be ingested — the provider does
not sign webhooks and the ingestion path requires a verified signature. Every delivery therefore parks
at accepted forever, and the store's health endpoint reads **bounce rate 0.0, complaint rate 0.0**:
perfect health, reported to an operator as fact, on a pipeline that cannot hear. The dispatch-run
mapper already nulls its open rate when nothing was delivered; this endpoint lacks that honesty.
**Ruled 2026-08-03 (Sven): `withhold-rather-than-zero`.**
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-GROWTH-HEALTH-HONEST`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiated blockers.


===== F-GR-NEWSLETTER-CROSS  [Blocker]
TITLE: the newsletter store guard is load-bearing and unproven
plan.md loc: plan.md:26572
QUOTED TOKENS (occurrence counts at the tips):
  both                                           fe=380  be=676  ['nuxt.config.js']
  blocker                                        fe=61   be=37   ['playwright.growth-guest-exit.config.js']
  lane/growth-newsletter-wire                    fe=0    be=0    []
  prove-at-the-wire                              fe=0    be=0    []
BODY:
- clears when: the cross-store refusal on the four newsletter authoring writes is proven at the wire and equal to an absent resource, at a tip that carries the proof
- owner: @sven
- blocks: FT-GROWTH

**Restated 2026-08-05 under the `both` ruling. There was never a live defect here — this is a proof gap**,
and the title above is the corrected one.
**At the integration tip the guard is called and its answer is honoured**, at five sites rather than the four
the lane counted: each reads `if (!await AuthorizeStoreAsync(storeId)) return GrowthError(NotFound())`. The
clerk re-derived this in the backend repository after a first attempt measured in the wrong one and returned
nothing — **the line numbers below differ slightly from the lane's for the last site, and the substance does
not.** No admin of one venue can reach another venue's newsletter on shipped code, and none could when this
flag was raised.
**The "calls the guard and discards its answer" shape this flag described is the injected mutation that
exposed the gap, not shipped code.**
**What was true, and is still true at the tip, is the part worth keeping:** the guard is protected by nothing.
With its effect removed the entire fast tier stays green, because every pre-existing cross-tenant test passes
the intruder's **own** store as the route store, where the service conceals on its own — the isolation suite
is **15 of 15 green against the mutated build**, re-measured at this tip today. **The guard is load-bearing
for a request nothing in the suite ever makes**, so the next refactor can delete it silently.
**Severity stays `blocker` and is deliberately not argued down.** An unprotected guard on a cross-tenant path
earns one; only the *kind* of blocker changes. The proof exists as one test-only commit that is **not an
ancestor of the tip**, and a conflict-free pre-validated merge of it has been prepared and left unmerged.
**The original claim is preserved below, so the record shows what was believed and what was measured.**
cleared_by: L-GR-NEWSLETTER-CROSS
Found by the lane sent to add routed coverage, by mutating what a source-text scan cannot see: the four
actions **call the store guard and discard its answer.** With that guard's effect removed the entire fast
tier stays green — because every existing cross-tenant fact passes the intruder's *own* store as the
route store, where the service conceals on its own. The controller guard was load-bearing only for a
request nothing in the suite ever made.
In that state a non-power-user admin of one venue can read, edit and **approve** another venue's
newslet


===== F-GR-NEWSLETTER-SELF-APPROVE  [Warn]
TITLE: the author of a newsletter can approve it
plan.md loc: plan.md:27355
QUOTED TOKENS (occurrence counts at the tips):
  F-GR-DISPATCH-UNATTRIBUTED                     fe=0    be=0    []
BODY:
- clears when: approval of an audience-facing send requires a different person than the author, or the plan records that one pair of eyes is deliberate and why
- owner: @sven

Surfaced from the tenancy proof's own docstring rather than from a reviewer: **approval is gated by exactly
the same store-admin check as creation.** There is no second pair of eyes, so **whoever writes a newsletter
can approve their own send to the whole audience.**
The proof **pins that equality deliberately, in both directions** — which is honest, and also means the
current behaviour is now locked in by a test. If a four-eyes rule is wanted for the audience-facing send,
that test is what would have to change, and it should change on a ruling rather than by someone finding it
inconvenient.
Relevant to `F-GR-DISPATCH-UNATTRIBUTED`, which observes that the recorded name on a mass send is **the
approver's, not the sender's** — if those are the same person by construction, that distinction was never
doing any work.


===== F-GR-NO-EXIT-FROM-A-LIST  [Blocker]
TITLE: as deployed a guest cannot leave a mailing list
plan.md loc: plan.md:27892
FILE REFS (resolved at the tips):
  pages/preferences/unsubscribe.vue                          fe-exact :102
  GrowthDispatchService.cs                                   be-suffix :465
  Program.cs                                                 be-exact :97
  nuxt.config.js                                             fe-exact :45
  communications.vue                                         fe-suffix :315
  appsettings.json                                           be-exact :176
QUOTED TOKENS (occurrence counts at the tips):
  L-JOURNEY-GROWTH                               fe=2    be=0    ['.gitignore']
  /preferences/unsubscribe                       fe=11   be=6    ['test/growth-guest-pages.test.js']
  test/                                          fe=208  be=36   ['nuxt.config.js']
  pages/preferences/unsubscribe.vue:102-108      fe=0    be=0    []
  GrowthDispatchService.cs:465                   fe=2    be=0    ['test/e2e/fixture/growth.js']
  :476                                           fe=0    be=0    []
  AllowAnyOrigin()                               fe=5    be=2    ['test/e2e/journeys/growth-guest-lifecycle.spec.js']
  Program.cs:97-102                              fe=0    be=0    []
  nuxt.config.js:45                              fe=0    be=0    []
  communications.vue:315-322                     fe=0    be=0    []
  okam.no                                        fe=46   be=66   ['nuxt.config.js']
  okamapi.azurewebsites.net                      fe=17   be=10   ['nuxt.config.js']
  Program.cs:963-967                             fe=0    be=0    []
  appsettings.json:176-177                       fe=1    be=0    ['test/e2e/journeys/growth-guest-lifecycle.spec.js']
BODY:
- clears when: a guest holding no session can reach an unsubscribe surface from a dispatched message and complete a withdrawal against the deployed origins, shown by a journey capture
- cleared by: L-GR-EXIT-IS-LINKED
- owner: @sven

**Found by `L-JOURNEY-GROWTH` and confirmed at high confidence by an independent Fable review that read
the controllers, the dispatch service and the deployed CORS configuration.** This is the art. 7(3)
obligation the Growth module is built around, so it is a go-live blocker rather than a defect note.
**Two independent blockers, and the second is the one that matters most.**
**(a) Nothing links a guest to the exit.** There are **zero product-code references** to
`/preferences/unsubscribe` — all nine hits are under `test/`, and the page says so itself at
`pages/preferences/unsubscribe.vue:102-108`. Both guest credentials are minted **solely inside the dispatch
path** (`GrowthDispatchService.cs:465` unsubscribe, `:476` preference centre) and travel only in mail.
**(b) Even holding a valid token, the preference centre cannot open a session across the deployed
origins.** CORS is `AllowAnyOrigin()` **without credentials** (`Program.cs:97-102`, `nuxt.config.js:45`,
documented at `communications.vue:315-322`), so the session cookie cannot cross
`okam.no` → `okamapi.azurewebsites.net`. **Blocker (b) survives mail going live**; the two are coupled on
(a) but not on (b), which is why sending mail would not by itself close this.
**A related claim corrected on the record, because the milder version was overstated.** "No mail leaves the
process" is true as **configuration posture, not as structure**: `Program.cs:963-967` registers Fake, Smtp
**and a fully live Postmark HTTP client**, and the committed `appsettings.json:176-177` pins `Fake` with
`Enabled:false`. **One configuration key sends real mail with no code change** — so the day this module is
switched on is the day (a) starts mattering to real recipients, with (b) already waiting behind it.


===== F-GR-PROVIDER-ACCOUNT-UNGATED  [Blocker]
TITLE: a store-addressable route with no store gate
plan.md loc: plan.md:27159
QUOTED TOKENS (occurrence counts at the tips):
  L-GR-TESTSEND-RECORD                           fe=0    be=0    []
BODY:
- clears when: the provider-account upsert refuses a store that does not exist or is not gated, pinned by a test that reds if the gate is removed
- cleared by: L-GR-TESTSEND-RECORD
- owner: @sven
- blocks: FT-GROWTH

Found by a gate-ordering test that **reddened when an actor was added** to the provider-account upsert —
so the guard caught a hole nobody was looking for.
The route is store-addressable and had **no store gate at all**: provisioning a sending identity for a
**nonexistent** store wrote a row anyway. Fixed by gating the route, **not by widening the rule that caught
it** — which is the right way round, and worth noting because the cheap fix was available and refused.
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-GR-TESTSEND-RECORD`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiated blockers.


===== F-GR-PROVIDER-GATE-PIN-VACUOUS  [Warn]
TITLE: the gate pin passes again if the actor line goes with it
plan.md loc: plan.md:27325
BODY:
- clears when: removing the store gate reds the pin regardless of what else is removed alongside it
- owner: @sven

Found by the blocker audit while checking the flag raised this morning. **The pin that caught the ungated
route is conditional on the change that surfaced it:** delete the gate line *and* the actor line together
and it goes green again.
That is the twentieth non-failing shape and it is a subtle one — the pin is not vacuous today, and it did
catch a real hole. It is vacuous **against the specific reversion somebody would actually make**, which is
the only reversion that matters.


===== F-GR-SEND-GATE-JOURNEY-RED  [Warn]
TITLE: a newsletter journey fails at the branch tip, before any newsletter route
plan.md loc: plan.md:27339
QUOTED TOKENS (occurrence counts at the tips):
  F-ARTIFACT-STORE-OVERWRITES                    fe=0    be=0    []
BODY:
- clears when: the newsletter send-gate journey completes at the integration tip, or the plan records why the app shell does not settle for it
- owner: @sven

Reported by the divergence lane and **proved pre-existing** — identical with its own files reverted, so it
is the tip's behaviour rather than the lane's.
The journey never reaches a newsletter route at all: **the application shell stays on its loading state and
the walk times out.** So this is not a Growth defect; it is the app failing to settle for this journey,
which is a worse shape because it will be read as the module's fault.
It also **overwrote that journey's artifact** while failing, which is `F-ARTIFACT-STORE-OVERWRITES` landing
in practice: a red run displacing a green one at a canonical path.


===== F-GR-SWEEP-ACTORLESS  [Warn]
TITLE: the dispatch sweep records no actor, on purpose, and that wants review
plan.md loc: plan.md:23168
BODY:
- clears when: the sweep's passes are attributable, or the plan records that an unnamed sweep is deliberate and why an append-per-pass was rejected
- owner: @sven

**A judgement the lane made and flagged rather than buried.** The dispatch sweep is left **deliberately
actorless**: it resumes runs whose creation is already named, over a recipient set fixed at creation.
The reason it did not add a system-actor row per pass is the interesting part: **the sweep picks up every
in-progress run on every interval**, so a run stuck behind a flipped kill switch would **append forever
into a table C1 forbids purging.** An attribution that grows without bound is worse than none.
So the gap is real, the omission is reasoned, and the alternative is worse — which is precisely the shape
that needs a ruling rather than a lane.


===== F-GR-UNCONFIRMED-EMAIL  [Blocker]
TITLE: the § 15 guard binds to an address the caller can choose
plan.md loc: plan.md:23102
QUOTED TOKENS (occurrence counts at the tips):
  already-fixed-pending-merge                    fe=0    be=0    []
  L-CONFIRM-FAMILY-MERGE                         fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: the test-send binding requires a confirmed profile email, and a pin proves an unconfirmed one is refused
- cleared by: L-CONFIRM-FAMILY-MERGE
- owner: @sven
- blocks: FT-GROWTH

**The control built to close the markedsføringsloven § 15 path does not hold.** It binds the send to the
signed-in admin's profile email **without requiring that email to be confirmed** — and that column is a
**self-asserted field any authenticated user can set to any address in one request**, because the
send-confirmation-code route persists the new address *before* any code is entered, with no uniqueness
constraint and no rate limit.
So the route is not closed. It is narrowed from **one request to any address** to **two requests to any
address, one at a time.**
**The estate has the exact precedent one file over**, where a membership service requires the confirmation
flag with the comment *a profile email a user can set to anything proves nothing.*
A go-live blocker rather than confirmed live exposure — the mail provider still defaults to a fake — but
both gates are intended to open, and the lane exists precisely because *with a real provider bound* is the
plan. **Whether it has ever been exploited is unanswerable:** Growth has no audit ledger and the email
column is overwritten in place with no history.
**Ruled 2026-08-03 (Sven): `already-fixed-pending-merge`.**
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-CONFIRM-FAMILY-MERGE`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiated blockers.


===== F-GROWTH-MODULE-LEVER-CANNOT-TURN-ON  [Blocker]
TITLE: an operator flips the switch, the board says on, the surface stays dark
plan.md loc: plan.md:31031
BODY:
- clears when: flipping the Growth module flag for a store makes its public surface answer, shown by a test that reds when the effective resolution is removed
- cleared by: L-GROWTH-EFFECTIVE-RESOLVER
- owner: @sven

**A live-only product defect the fixture cannot see, and the interface's own documentation names this exact
shape:** *"otherwise the lever silently stops working."*
**Every Growth flag is ANDed under a configuration master that ships false**, and **Growth registers no
effective resolver** — the clerk verified it at the tip: implementations exist for **Workforce and Margin
only**, and just one is registered in the composition root. So the flag board computes the naive
*overridden-or-default* answer, **reports the module ON after the operator flips it, and the public surface
stays dark.**
**A fixture with no outer master cannot see this**, which is why five days of green journeys did not.
**Meals is in the same position** — an implementation exists for neither it nor Growth — and that is worth
checking before this is called a Growth defect.
**The operator-facing consequence is the worst kind:** the switch and the board agree with each other and
disagree with the product, so the person flipping it has **no signal that anything is wrong.**
**Corrected 2026-08-06: the clerk's supporting sentence was wrong and the flag survives it.** This block said
implementations exist for Workforce and Margin *"and just one is registered in the composition root."* **That
was a grep of one file reported as a fact about the application.** Margin registers its resolver **inside a
module extension** the root calls — an arrangement that exists so parallel lanes never edit one file — so the
count is **two registrations, not one.**
**The defect it describes is unchanged**: Growth still registers no resolver, and a sweep of every extension
file confirms **Meals registers none either.** Two modules resolve their master, two do not.
**Margin is the working precedent** the interface documentation names, and it differs from Growth in the way
that matters: it **coalesces** rather than ANDs, so an operator's store row is honoured against an empty
default instead of being overruled by a dark master.


===== F-GROWTH-NO-LIVE-CONFIRM-LINK  [Blocker]
TITLE: the consent journey cannot be walked live at all
plan.md loc: plan.md:31005
BODY:
- clears when: a guest's confirm link is obtainable in a live world without sending mail to a real address, or the plan records that Growth's consent journey is fixture-only and why that is acceptable
- cleared by: L-LIVE-WALK-GROWTH
- owner: @sven
- blocks: L-LIVE-WALK-GROWTH

**The confirm link exists only inside a sent message, and the product is deliberately built so that it
cannot be recovered any other way.** The token is minted, handed to the mail, and **only its hash is
persisted** — the entity's own comment says *"Only the token HASH is stored, never the token."* That is
correct design and it is also why the fixture's mailbox surface **has no live analogue and none can be
built by discovery.**
**No transport is both live and safe.** The fake sender is in-memory on no route; the sandbox provider
accepts and never delivers; and the real path goes through the production relay as the company's own
address. **So a live confirm is either impossible or it mails a stranger.**
**The withdrawal half is further out still.** The unsubscribe token has exactly **one** production caller —
inside the dispatch loop — so live, **no verified contact holds an exit handle until a marketing message is
sent to them**, and that message prints the preference link that answers 404.
**This is the one module whose C5 exit may be unreachable by construction rather than by effort**, and that
is worth ruling rather than retrying. The honest options are a development-only retrieval path that cannot
exist in production, a seeded confirmed contact, or recording the journey as fixture-only with the reason.


===== F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED  [Blocker]
TITLE: a 409 telling an operator to retry something that can never succeed
plan.md loc: plan.md:29112
QUOTED TOKENS (occurrence counts at the tips):
  GrowthAuditEvents                              fe=1    be=23   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  GrowthConsentTextService.PublishAsync          fe=0    be=5    ['WebApi.Tests/Growth/GrowthConsentTextAuthoringTests.cs']
  GrowthDispatchService                          fe=11   be=31   ['test/e2e/fixture/growth.js']
  InvalidOperationException                      fe=4    be=160  ['lanes/L-DI-COLLECTION-SILENT/census.md']
  SqlException                                   fe=0    be=48   ['artifacts/mig7/RUN.md']
BODY:
- clears when: no Growth write path converts a SqlException into a conflict or a masking exception without testing the SQL error number, shown by an arm that raises 208 and expects the refusal to name the missing object
- owner: @sven

**Found by the lane sent to settle whether `GrowthAuditEvents` exists, and it is worth more than the table.**
The audit row is added in the **caller's** unit of work, so a missing table rolls the business mutation back —
**fail-closed, which is the right failure.** What is not right is what the operator is told.
**Six write sites, all reachable, presenting three ways.** Four give a clean 500.
**`GrowthConsentTextService.PublishAsync` returns a 409 saying another version was published concurrently and
inviting a retry** — there is no concurrent publisher, and **the retry can never succeed**. `GrowthDispatchService`
throws a masking secondary `InvalidOperationException` that destroys the diagnosis outright.
**The defect outlives the cause, which is why this is a flag and not a note on the migration.** Both catch
blocks are **untyped on the SQL error number**: they convert any `SqlException` into their own story. Land the
table tomorrow and these two still misreport every future SQL failure — a deadlock, a timeout, a permission
error — as a publish conflict or as a null reference.
**Not live exposure.** The Growth tables are not deployed, so nothing is failing in production today. It is a
go-live item, and it sits beside the missing migration rather than behind it: the migration removes today's
trigger, and only typed handling removes the defect.


===== F-GROWTH-SQL-TIER-RED-BY-CONSTRUCTION  [Warn]
TITLE: a whole test tier that will red the day Docker comes back
plan.md loc: plan.md:29258
QUOTED TOKENS (occurrence counts at the tips):
  GrowthSqlServerFixture                         fe=0    be=12   ['WebApi.Tests/Growth/GrowthCaptureRaceSqlServerTests.cs']
  MigrateAsync                                   fe=0    be=27   ['WebApi.Tests/Training/TrainingHarness.cs']
  GrowthAuditEvents                              fe=1    be=23   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  EnsureCreated()                                fe=0    be=3    ['artifacts/tests/24cd4ead5e73dac127fca8de0ab2b56f26c85887/RUN.md']
BODY:
- clears when: the Growth SQL Server tier builds a database containing GrowthAuditEvents, or the tier is recorded as knowingly red until MIG-22 lands
- owner: @sven

**Escalated by the lane that typed the Growth catch blocks, from outside its own subject.**
`GrowthSqlServerFixture` builds its database with `MigrateAsync` — the chain — and the chain does not create
`GrowthAuditEvents`. **So every audit-writing Growth SQL Server test is red by construction today.**
**It is invisible for a reason that will expire.** Docker has been down, so nobody has run that tier. The
moment it comes back, those tests fail — and they will fail for a cause that has nothing to do with whatever
change is being tested at that moment, which is the worst kind of red to hand somebody.
**This is the mirror image of the defect that produced it.** The rest of the estate builds test databases from
the **model** through 170 `EnsureCreated()` sites, which is exactly why no suite could see that the table is
missing from the chain. This one fixture builds from the chain, so it is the only place in the estate that
would have told anyone — and it has been dark.
**MIG-22 closes it and is already ruled.** Nothing here needs a new decision; what is owed is that the next
person to bring Docker up is not surprised.


===== F-GROWTHAUDIT-MISSING-AT-THE-MERGE-TIP  [Blocker]
TITLE: the composed stack itself carries the model-chain breach
plan.md loc: plan.md:32941
FILE REFS (resolved at the tips):
  ApplicationDbContext.cs                                    be-suffix :219
  GrowthAuditWriter.cs                                       be-suffix :89
QUOTED TOKENS (occurrence counts at the tips):
  HasPendingModelChanges()                       fe=1    be=26   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  integration/mig-stack-merge                    fe=0    be=4    ['artifacts/tests/24cd4ead5e73dac127fca8de0ab2b56f26c85887/RUN.md']
  7f8945dc                                       fe=0    be=3    ['lanes/L-BACKEND-PATCHES-ARE-APPLIED/evidence.md']
  GrowthAuditEvents                              fe=1    be=23   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  ApplicationDbContext.cs:219                    fe=0    be=1    ['lanes/L-BACKEND-PATCHES-ARE-APPLIED/evidence.md']
  GrowthAuditWriter.cs:89                        fe=0    be=1    ['lanes/L-BACKEND-PATCHES-ARE-APPLIED/evidence.md']
  AccountingSummaries                            fe=1    be=85   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  L-GROWTHAUDIT-MIGRATION                        fe=0    be=0    []
  lane/growthaudit-migration                     fe=0    be=2    ['lanes/L-LAND-THE-BACKEND-ON-THE-TRUNK/evidence.md']
BODY:
- clears when: HasPendingModelChanges is false at the tip that lands on the trunk, and GrowthAuditEvents exists on a chain-built database
- cleared by: L-GROWTHAUDIT-MIGRATION
- owner: @sven

**Found while isolating something else, and re-measured to prove it was not the patch's doing.**
`HasPendingModelChanges()` is **already true at `integration/mig-stack-merge` `7f8945dc`** with the patch fully
reverted and rebuilt.
**The delta is one whole table.** `GrowthAuditEvents` is mapped at `ApplicationDbContext.cs:219` and written at
`GrowthAuditWriter.cs:89` by five Growth services — and **no migration creates it, and the model snapshot does
not name it.**
**That is the `AccountingSummaries` shape a third time**: green on every model-built test database, `Invalid
object name` on every chain-built one. **It is a C2 breach sitting at the tip that is about to land on the
trunk.**
`L-GROWTHAUDIT-MIGRATION` authored the migration that creates it, on `lane/growthaudit-migration` — **unmerged**.
So the fix exists and the landing order now matters: **that migration must reach the trunk with, or before, the
composed stack.**


===== F-GROWTHAUDIT-TABLE-MISSING-FROM-THE-GROWTH-MIGRATION  [Blocker]
TITLE: 19 Growth tables, and not the audit one
plan.md loc: plan.md:32761
QUOTED TOKENS (occurrence counts at the tips):
  20260727221455_RestaurantModules_Initial       fe=0    be=4    ['Migrations/20260727221455_RestaurantModules_Initial.Designer.cs']
  Growth*                                        fe=2    be=16   ['utils/growth/api-client.js']
  MealsAuditEvents                               fe=1    be=40   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  TrainingAuditEvents                            fe=1    be=53   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  WorkforceAuditEvents                           fe=2    be=48   ['test/e2e/scripts/live-world.sh']
  CreateOrGetRunAsync                            fe=1    be=12   ['pages/admin/growth-newsletter.vue']
  _audit.Append(...)                             fe=0    be=0    []
  SaveChangesAsync                               fe=7    be=503  ['test/e2e/fixture/training.js']
  L-GROWTHAUDIT-MIGRATION                        fe=0    be=0    []
BODY:
- clears when: GrowthAuditEvents exists on a chain-built database, shown from the system catalogs
- cleared by: L-GROWTHAUDIT-MIGRATION
- owner: @sven

**Independent confirmation of the defect the migration lane was built to fix**, from the other end.
`SELECT COUNT(*) FROM sys.tables WHERE name='GrowthAuditEvents'` → **0**, and
`GET /v1/growth/stores/1/audit-events` → **500 `Invalid object name`**.
`20260727221455_RestaurantModules_Initial` creates **19 `Growth*` tables and not this one**, while
`MealsAuditEvents`, `TrainingAuditEvents` and `WorkforceAuditEvents` all exist. So it is not a pattern nobody
followed — it is one module's omission.
**It is a second blocker on newsletter dispatch that nothing had recorded.** `CreateOrGetRunAsync` calls
`_audit.Append(...)` unconditionally at three sites, and the writer stages onto the same DbContext by design —
so the dispatch's own `SaveChangesAsync` throws. Subscribe, confirm, create and approve do not append, which is
why nothing has broken yet.
`L-GROWTHAUDIT-MIGRATION` creates it, unmerged; this world predates it.


===== F-GUARD-PROOF-COULD-NOT-EXECUTE  [Warn]
TITLE: a proof that died on load still printed a table and still failed
plan.md loc: plan.md:27964
FILE REFS (resolved at the tips):
  guard-proof.js                                             fe-suffix
  artifact-store.js                                          fe-suffix
  build-provenance-proof.js                                  fe-suffix
  world-stamp.js                                             fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  L-JOURNEY-PROXY-BLINDSPOT                      fe=0    be=0    []
  guard-proof.js                                 fe=8    be=0    ['package.json']
  artifact-store.js                              fe=12   be=0    ['test/journey-assertions.test.js']
  ./world-stamp                                  fe=3    be=0    ['test/journey-assertions.test.js']
  build-provenance-proof.js                      fe=7    be=0    ['test/e2e/scripts/live-world-stamp-wiring-check.js']
  world-stamp.js                                 fe=10   be=0    ['test/world-stamp-windows.test.js']
BODY:
- clears when: every guard-proof harness fails loudly and distinguishably when its arms cannot execute, shown by an arm that is made unloadable on purpose
- owner: @sven

**Found by `L-JOURNEY-PROXY-BLINDSPOT` while building something else, and proved pre-existing from HEAD
blobs rather than by running.** `guard-proof.js` hand-copied two support files into its throwaway harness
while `artifact-store.js` requires `./world-stamp`, so **all fifteen arms died in module load** —
`Cannot find module './world-stamp'`, `No tests found`.
**The dangerous part is how it failed.** It still printed a results table and still exited nonzero, so it
read as *a guard catching a regression* rather than as *a proof that could not run at all*. Those two
states look identical from outside and mean opposite things.
**The consequence, stated plainly: the split-origin arms a Fable review had approved had never actually
run.** A review can only rule on what it can see, and what it saw was a harness reporting failures for a
reason nobody had cause to question.
**The narrow fix and the general one.** `build-provenance-proof.js` already listed `world-stamp.js`; the
lane that added it updated one copy list and missed this one. The copy list now closes over whatever the
support files actually import, so adding a support file cannot reintroduce it.
**What is left open, and why this is a flag rather than a closed note:** nothing yet forces a harness to
distinguish *arms ran and failed* from *arms could not run*. Until an unloadable arm is made to fail
differently from a red one, the next harness of this shape will tell the same lie.


===== F-GUARD-PROOF-NOT-IN-CI  [Warn]
TITLE: the evidence guard exists and nothing runs it
plan.md loc: plan.md:23361
BODY:
- clears when: the journey guard proof runs in CI, or the plan records that no workflow runs suites and what stands in for that
- owner: @sven

The guard proof is built, seven-armed and self-falsifying. **No workflow in this repository runs any
suite**, so nothing executes it unless a person remembers to.
The flag it proves can clear without this — the instrument exists and works. But **an instrument nobody
runs gates nothing**, which is a weaker version of the exact problem it was built to solve: the estate had
a guard that passed for the wrong reason, and would now have one that never runs at all.


===== F-HOST-VM-EATS-THE-CEILING  [Warn]
TITLE: a three-day VM makes the load ceiling unreachable
plan.md loc: plan.md:28334
QUOTED TOKENS (occurrence counts at the tips):
  Virtualization.framework                       fe=0    be=0    []
  fseventsd                                      fe=0    be=0    []
  WindowServer                                   fe=0    be=0    []
  zen_pasteur                                    fe=2    be=8    ['lanes/L-MRG-EHF-SPIKE/DETAIL.md']
  okam-lws-staff-sql                             fe=2    be=8    ['lanes/L-MRG-EHF-SPIKE/DETAIL.md']
  okam-lws-sql                                   fe=4    be=8    ['test/e2e/scripts/live-world-reset.sh']
  okam-lvsp-sql                                  fe=1    be=5    ['lanes/L-MRG-EHF-SPIKE/DETAIL.md']
  okam-lwr-sql                                   fe=5    be=5    ['lanes/L-MRG-EHF-SPIKE/DETAIL.md']
  raiis/saladin-core                             fe=0    be=0    []
  ~/Desktop                                      fe=1    be=2    ['lanes/L-MRG-EHF-SPIKE/DETAIL.md']
  --maxWorkers                                   fe=0    be=2    ['docs/plans/replan/a2-web-testing.md']
  suite                                          fe=147  be=443  ['jest.config.js']
  uptime                                         fe=1    be=0    ['test/e2e/support/consumer-guest.js']
  fact                                           fe=337  be=489  ['playwright.config.js']
BODY:
- clears when: the host sits under the 21 load ceiling with the plan's own lanes accounted for, shown by an uptime reading taken while six lanes run
- owner: @sven

**Measured at 19:46 on 2026-08-04, after six agents died within minutes of each other to
stream-watchdog stalls.** The stalls were the symptom; the host was the cause. Load stood at **59.8
against a ceiling of 21**, and the top consumer was **not this program**:
- a `Virtualization.framework` VM burning **four-and-a-quarter cores**, running **three days**
- `fseventsd` at four-fifths of a core, `WindowServer` at two-fifths
- 57 node processes and 5 dotnet processes alongside
**The VM is not mine to stop** — the estate's rule is that nobody kills what they did not start, and it
predates every lane running today by days. But while it holds four cores, the 21 ceiling cannot be
honoured by throttling lanes alone: the plan can be entirely idle and still read over it.
**The operational consequence, recorded so it is not rediscovered.** Six lanes were killed and the correct
response was **not** to resume them all — that would have rebuilt the stampede the ceiling exists to
prevent. Only the two whose remaining work needs no suite were resumed; the four needing a browser or a
database were held until load falls, and each resumed lane was told plainly not to run a full suite and to
**stop and say so** if its close requires one.
**This is Sven's to rule because the fix is outside the program**: stop the VM, accept a lower effective
ceiling, or accept that lanes will be killed and resumed through it.
> @sven · 2026-08-04 · F-HOST-VM-EATS-THE-CEILING — Sven, 2026-08-04: 'raise this or fix it so its not fucking us anymore'. Acted on: three runaway containers (zen_pasteur, okam-lws-staff-sql, okam-lws-sql) stopped gracefully with exit 0. Nothing removed - containers, volumes and images persist; docker start <name> restores them.
**Fixed on the owner's instruction, 2026-08-04 20:08, and the fix was surgical rather than blunt.**
**The VM was not the culprit; three containers inside it were.** `docker stats` named them:
`zen_pasteur` at 1.2 cores, `okam-lws-staff-sql` at 0.94, `okam-lws-sql` at 0.76 — together roughly the
VM's whole figure. All three had been up **two to three days**, from earlier sessions.
**Stopped gracefully, exit 0 on all three. Nothing was removed.** They persist as `Exited (0)`, and
`docker start <name>` restores each with its data. Images and named volumes are untouched — the estate's
own record warns that a *reset* would have destroyed nine locally-built images with no registry to pul


===== F-I18N-FALLBACK-MASKS-A-MISSING-KEY  [Info]
TITLE: a missing translation shows the wrong language, not a raw key
plan.md loc: plan.md:28154
FILE REFS (resolved at the tips):
  utils/i18n.js                                              fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  L-MRG-WASTE-RECEIPTS                           fe=0    be=0    []
  utils/i18n.js                                  fe=0    be=0    []
BODY:
- clears when: the plan's statement of what a missing translation key does matches utils/i18n.js, and any key-presence test grades by the severity that actually occurs
- owner: @sven

**A correction to this plan's own premise, measured by `L-MRG-WASTE-RECEIPTS` rather than assumed.**
The brief it was given — and the lane text behind it — said a missing translation **ships as a raw key**.
It does not, in the common case: `utils/i18n.js` falls back **active → no → en → de → key**. A key missing
from one locale renders the **Norwegian string to an English operator**. A raw key requires the key to be
absent from all three, and there are **zero** of those.
**The real defect is milder and different in kind, which is why it is worth restating rather than
deleting.** Silent language substitution on a money or statutory surface is its own problem — an English
operator reading Norwegian may not notice they are reading a fallback at all — but it is not the
suite-green-over-a-raw-key failure the plan claimed. The lane graded its new presence test by the severity
that actually occurs, and pinned **34 Norwegian-only rendered keys** as debt, ratcheted in both directions.


===== F-IDENTICAL-EXPRESSION-DIVERGENT-MEANING  [Info]
TITLE: two call sites read the same and mean different things
plan.md loc: plan.md:8026
QUOTED TOKENS (occurrence counts at the tips):
  L-CREDIT-NOTE-NUMBER                           fe=0    be=0    []
  GetPdf                                         fe=0    be=3    ['Controllers/InvoicesController.cs']
  CreateCreditNote                               fe=0    be=5    ['WebApi.Tests/Wire/PdfDownloadWireTests.cs']
BODY:
- clears when: a reviewer checking a duplicated expression records, per call site, which row each identifier resolves to rather than that the expressions match
- cleared by: L-CREDIT-NOTE-NUMBER
- owner: @sven

**Named by `L-CREDIT-NOTE-NUMBER` when asked why nobody had caught a defect two lanes had already
reported. The answer is the useful part.**
`GetPdf` and `CreateCreditNote` built their download filename with the **identical expression** from the
route parameter. In `GetPdf` that is correct — the route parameter and the document's own number are the
**same row**. In `CreateCreditNote` it is wrong, because the service returns a model for a **newly
inserted** row whose number the database has just assigned.
**So the two call sites look the same in source, and one of them is a defect.** Reading the diff, the
grep, or the two lines side by side all agree; only asking *which row does this identifier resolve to
here* separates them.
This is a reviewing failure mode rather than a coding one, and it belongs beside the assertion-shape
catalogue for the same reason: it describes something that **looks like evidence and is not**. A grep
proving two sites are consistent proves they are consistent — not that either is right.
The lane also did the right thing with the test that covered it: an existing wire test **pinned the
defect** as intended behaviour. It flipped that pin rather than adding a second test beside it. A pin
asserting the wrong behaviour is not neutral — it is a standing instruction to keep the defect.


===== F-IN-PAGE-SIGN-IN-IS-DEAD-END-TO-END  [Blocker]
TITLE: three lanes each fix a third, and the path stays broken
plan.md loc: plan.md:32299
FILE REFS (resolved at the tips):
  AdminPage.vue                                              fe-suffix
  ongoing.vue                                                fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  built                                          fe=212  be=285  ['playwright.config.js']
  AdminPage.closeLoginModal                      fe=1    be=0    ['test/adminpage-redirect-target.test.js']
  $router.replace                                fe=15   be=1    ['artifacts/journeys/modal-scroll-lock.playwright.json']
  login-success                                  fe=72   be=5    ['test/adminpage-redirect-target.test.js']
  mounted                                        fe=213  be=7    ['playwright.growth-guest-exit.config.js']
  L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN        fe=2    be=0    ['test/kitchen-and-board-resume-after-login.test.js']
  @login-success                                 fe=66   be=5    ['test/orders-and-statistics-resume-after-login.test.js']
  lane/loginmodal-mounted-once                   fe=3    be=0    ['lanes/L-LAND-THE-FRONTEND-ON-THE-TRUNK/evidence.md']
  0f88242                                        fe=2    be=0    ['lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/notes.md']
  AdminPage                                      fe=160  be=8    ['Claude.md']
  AdminPage.vue                                  fe=88   be=4    ['Claude.md']
  $route.path                                    fe=4    be=1    ['test/adminpage-redirect-target.test.js']
  $route.fullPath                                fe=3    be=0    ['test/adminpage-redirect-target.test.js']
  /admin/ongoing                                 fe=35   be=2    ['artifacts/journeys/modal-estate-scroll-lock.playwright.json']
BODY:
- clears when: a person signing in on /admin/ongoing?redirect= sees the board poll, shown by a browser capture counting requests after the sign-in
- cleared by: L-ADMINPAGE-EMITS-INSTEAD-OF-NAVIGATING
- owner: @sven

**Raised by the lane that fixed its own third and refused to let `built` imply more than it earned.**
**With its fix applied, on a clean compile, the board makes ZERO requests after the sign-in a person actually
performs.** Two modals stack on that URL; the visitor uses the shell's, on top; `AdminPage.closeLoginModal`
takes its `$router.replace` branch, so **`login-success` never fires** and the reused component never re-runs
`mounted`. The page's own handler is repaired and **not reached**.
**Three changes are needed and each lane holds one:**
- the per-page starter list, so a sign-in restarts the clock, the poll and the fullscreen listener — **landed**
  on `L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN`
- the duplicate-modal removal bound to `@login-success` — on `lane/loginmodal-mounted-once` @ `0f88242`, which
  **carries the incomplete starter list forward verbatim**, so it is complementary rather than duplicate
- `AdminPage` **emitting rather than navigating** on that URL — owned by nobody
**The open seam, named and deliberately not taken**: `AdminPage.vue` should compare its redirect target to
`$route.path` rather than `$route.fullPath`. The lane left it alone because it is a sibling's file and this
estate has five double-lands on record.
**This is the shape worth noticing.** Three lanes, three green suites, three honest `built` verdicts — and a
person still cannot do the thing. Only the browser arm saw it, and only because the lane ran one after its
suite was already green.
**Measured end to end 2026-08-06, and two things in the account above need narrowing.**
**The walk a person actually performs was never broken.** Typing `/admin/ongoing` while signed out bounces to
`/admin?redirect=…`, whose target is a **different** page — so `$router.replace` mounts it and its `mounted`
starts the board. Two requests, counted.
**The dead form is an admin page carrying a redirect query that points at itself**, and the only producer of
that query anywhere in the repository is `AdminPage.initAuth`, which always writes `/admin`. So it is reached
by typing, bookmarking or sharing such a URL — plus `initAuth:99`, which explicitly renders that page in place,
which is why the seam exists at all.
**The AdminPage fix alone is invisible**, and its own lane said so rather than implying otherwise: on the
repaired board it matches the stock build on every visible 


===== F-INT-LEDGER-CEILING-SIX-LOW  [Blocker]
TITLE: the next free MIG number on the integration branch is already held
plan.md loc: plan.md:29520
BODY:
- clears when: the integration copy's highest MIG entry matches the highest claimed across both copies, so next-free names a number no branch holds
- cleared by: L-LEDGER-NUMBERS-ARE-FREE
- owner: @sven

**MIG-23 to 28 exist only in the stack copy.** So the integration copy's ceiling is **six numbers low**, and an
author following it takes **MIG-23 — already held on 14 refs.**
**This is the MIG-12 five-way clash set up to repeat, with the difference that made the first one survivable
removed.** MIG-12 was resolved by serial renumber on 2026-07-30 and it worked because all four branches merged
the same evening. **These have been divergent for days.**
**Neither copy is right about both branches.** The integration copy is correct that ten stack entries are not
landed there; the stack copy is correct that they exist. Ten entries marked LANDED in one are absent from the
other, and each statement is true of its own branch. **That is the exact reason a reconciliation had to be
derived from the branches rather than by reading one document against the other.**


===== F-INTEGRATION-BRANCHES-UNCOMPOSED  [Blocker]
TITLE: the two merged stacks have never been composed with each other
plan.md loc: plan.md:27477
BODY:
- clears when: the migration stack and the confirm family are composed, the result builds, and its receipt records a tier run at the composed commit
- cleared by: L-COMPOSE-AND-RUN-THE-STACK
- owner: @sven
- blocks: FT-GROWTH

Found by reading the two integration branches **against each other**, which nothing had delivered. The confirm
family is **not a descendant of the integration branch**: it lacks the tip's three newest commits, so **its
composed measurement was taken on a base three commits behind.**
**And the missing commits are the article 12 deadline landing, while the family itself carries the deadline
statute work** — the same statutory surface, **split across the two sides of a merge nobody has performed.**
A trial merge of the two stacks **conflicts on the receipts file** — the third guaranteed occurrence of the
trap that would have destroyed real measurements if resolved by side — and auto-merges the composition
root, which this estate's own lesson says must be re-checked for a double land rather than trusted.
**The composed pair has never been built.** This is the receipt trap one level up, and until this review
nothing recorded it.


===== F-INVITATION-CLAIM-IGNORES-THE-MODULE  [Warn]
TITLE: a Workforce-off store can still have invitations claimed
plan.md loc: plan.md:31696
FILE REFS (resolved at the tips):
  WorkforceInvitationService.cs                              be-suffix :83
  WorkforceStaffController.cs                                be-suffix :156
QUOTED TOKENS (occurrence counts at the tips):
  WorkforceInvitationService.ClaimAsync          fe=0    be=0    []
  :185                                           fe=0    be=1    ['docs/plans/replan/b-workforce-completeness.md']
  userId                                         fe=21   be=241  ['test/ongoing-board-covers-every-live-status.test.js']
  workforce.module                               fe=14   be=24   ['test/growth-send-gate.test.js']
  WorkforceInvitationService.cs:83               fe=0    be=0    []
  WorkforceStaffController.cs:156                fe=0    be=0    []
  :157                                           fe=4    be=0    ['test/delivery-save-failure.test.js']
  [Authorize]                                    fe=9    be=106  ['test/meals-claim-page.test.js']
BODY:
- clears when: the invitation claim path refuses for a store whose Workforce module is off, or the plan records why claiming must stay reachable and what bounds it
- owner: @sven

`WorkforceInvitationService.ClaimAsync` (`:185`) carries **only a blank-`userId` guard**. The class does not take
a flag or gate dependency at all, so the claim path is ungated by capability **and by `workforce.module`**.
**Part of this is deliberate and correct**: claiming an invitation is how a person acquires a first engagement,
so gating it on a capability they cannot yet hold would be circular. That reasoning is on record.
**What is not on record is the module half.** A store with Workforce explicitly switched off can still have
invitations claimed against it, which is a different question from the circularity and was found while verifying
something else.
Note the neighbouring correction: the *issue* side is gated **service-side** at `WorkforceInvitationService.cs:83`,
not by a controller attribute — `WorkforceStaffController.cs:156` is the route and `:157` the action, and the
controller carries only `[Authorize]` at `:29`.


===== F-INVOICE-PRICELABEL-STILL-SHADOWS  [Warn]
TITLE: a page satisfies the money rule while standing off the seam
plan.md loc: plan.md:28200
FILE REFS (resolved at the tips):
  pages/admin/kravia-invoice.vue                             fe-exact :591
QUOTED TOKENS (occurrence counts at the tips):
  L-PRICE-SHADOW-GUARD                           fe=0    be=0    []
  L-PRICE-BYPASS-FIVE                            fe=6    be=1    ['test/price-gate-shadow.test.js']
  nokAmountLabel                                 fe=5    be=1    ['test/price-bypass-legacy.test.js']
  priceLabel                                     fe=124  be=4    ['test/margin-menu-margin-panel.component.test.js']
  8c6e91fa                                       fe=6    be=0    ['lanes/L-XZ-RESIDUAL-SITES/mutation-log.md']
  CustomerInfoModal                              fe=13   be=1    ['test/ongoing-board-covers-every-live-status.test.js']
  UNKNOWN_AMOUNT                                 fe=22   be=1    ['test/check-discount-sum.test.js']
  pages/admin/kravia-invoice.vue:591             fe=0    be=0    []
  invoiceAmountLabel                             fe=3    be=0    ['test/price-bypass-legacy.test.js']
BODY:
- clears when: no component declares its own priceLabel, shown by the shadow guard passing with no ledger entry for the invoice page
- owner: @sven

**Measured by `L-PRICE-SHADOW-GUARD` against the committed code, and it contradicts what I told that lane.**
I said `L-PRICE-BYPASS-FIVE` had fixed the invoice-page shadow outright. It had not. That lane fixed the
**coercion** — the helper no longer does `|| 0` and now delegates to the shared `nokAmountLabel` — but
**`priceLabel` is still declared at line 591**, so the page still shadows the global mixin method. The
working tree is byte-identical to `8c6e91fa`, and that lane's own new comment says as much.
**So the page satisfies the rule today while remaining off the seam.** The distinction matters exactly
once: **the next edit to that helper is free of the gate again**, because nothing routes it through the
mixin. A rule obeyed by coincidence looks identical to a rule enforced, right up to the edit that separates
them.
**This is why the guard exists rather than the fix**, and the guard now carries it: the invoice-page shadow
is **pinned, not double-fixed**, so it stays visible until somebody removes the declaration.
The sibling shadow was resolved rather than pinned — `CustomerInfoModal`'s local method is gone, which also
corrected a deviation nobody had named: it printed `"206,80 kr"` where this admin's declared format is the
`kr ` prefix. The estate's single absence mark is the em dash `UNKNOWN_AMOUNT` (U+2014).
**Settled by a third party, and both lanes were partly wrong — including this flag as first written.**
**The shadow does stand**, at `pages/admin/kravia-invoice.vue:591`. But two corrections to what is above:
1. **"The next edit to that helper is free of the gate again" is not quite true.** The finding lane's own
   pin drives all three worlds **through the component's own method**, so an edit that stops refusing
   absence goes **red**. The exposure is real but narrower than this flag first claimed.
2. **Deleting the local method is not an available fix**, which is the part nobody had. The mixin formats
   with core's `kr `-prefix while the invoice prints nb-NO suffix style (`206,80 kr`), so **de-shadowing by
   deletion would restyle every invoice figure** — a user-visible change smuggled inside a correctness fix.
**So the correct change is a rename, not a removal**: vacate the colliding name (`priceLabel` →
`invoiceAmountLabel`), keep the delegation bytes unchanged, move the ten template call sites, and flip the
pin from *"still shadows, answers the same"* to asserting **no method named `price


===== F-INVOICE-RETRY-ANONYMOUS  [Blocker]
TITLE: an unauthenticated route mails every unsent invoice in the database
plan.md loc: plan.md:23760
QUOTED TOKENS (occurrence counts at the tips):
  26599c6e                                       fe=0    be=0    []
  [Authorize]                                    fe=9    be=106  ['test/meals-claim-page.test.js']
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
  fact                                           fe=337  be=489  ['playwright.config.js']
  fold-into-the-five                             fe=0    be=0    []
  F-INVOICE-ROUTES-ANONYMOUS                     fe=0    be=2    ['lanes/L-INVOICE-AUTHORIZE-LAND/merge-receipt.md']
  authorize-all-five                             fe=0    be=1    ['lanes/L-INVOICE-AUTHORIZE-LAND/merge-receipt.md']
BODY:
- clears when: the bulk invoice retry route requires authorisation, pinned by a test that reds if the attribute is removed
- cleared by: L-INVOICE-AUTHORIZE
- owner: @sven
- blocks: S-PILOT-SAFE

**Condition met and verified, but the tool cannot clear it and I may not force it.** At `26599c6e` the
controller carries a class-level `[Authorize]` and `[Authorize(Roles = ClaimConstants.PowerUserRole)]`
on all six actions — I read that at the tip rather than taking the lane's word. The merge lane proved it
on the wire in both directions: before, an anonymous `POST /Invoices/RetrySendingExistingInvoices`
answered **200**; after, anonymous gets 401 with a bearer challenge and an empty body, a non-power user
gets 403 with **no** challenge header, and a power user gets 200.
`plan flag clear` refuses because this `clears_when` names no `fact:` key, so the tool cannot test it —
and the override is `--by @sven`, which is his authority, not mine. **This flag is one owner action from
closed.** Rewriting the condition so the tool would accept it is not something I will do to reach a
clear I want.
Found by the renderer lane, **outside its own subject**, while enumerating the call sites it had to fix.
**The bulk retry route carries no authorisation attribute at all**, and what it does is **iterate every
unsent invoice in the database and mail them.** Anyone who can reach the host can trigger it.
Not a leak of content to the caller — the mail goes to each invoice's own recipient — which is why it is a
blocker rather than a catastrophe: **it is an unauthenticated way to make the product send a large volume of
real mail to real customers, repeatedly.**
**Ruled 2026-08-03 (Sven): `fold-into-the-five`.**
**Subsumed 2026-08-03 by `F-INVOICE-ROUTES-ANONYMOUS`.** Same controller, same lane, same ruling
(`authorize-all-five`). It was kept separate only so the *mails-your-customers* consequence would not be
lost in a list; that consequence is now recorded on the routes flag, and two names for one problem is a
second thing to forget to close.


===== F-INVOICE-ROUTES-ANONYMOUS  [Blocker]
TITLE: four money routes that create and mail invoices take no caller identity
plan.md loc: plan.md:26683
QUOTED TOKENS (occurrence counts at the tips):
  L-INVOICE-RETRY-RETIREMENT                     fe=0    be=1    ['lanes/L-INVOICE-AUTHORIZE/evidence.md']
  [AllowAnonymous]                               fe=7    be=50   ['test/e2e/fixture/events.js']
  {orderId}                                      fe=4    be=27   ['test/cart-wire.test.js']
  authorize-all-five                             fe=0    be=1    ['lanes/L-INVOICE-AUTHORIZE-LAND/merge-receipt.md']
BODY:
- clears when: every route on the invoices controller either requires an authenticated caller or is recorded here as deliberately public with the reason
- cleared by: L-INVOICE-AUTHORIZE
- owner: @sven
- blocks: S-PILOT-SAFE

Confirmed by the Fable money-path review, which **escalated it from one route to four.** The invoices
controller carries no authorize attribute at class or action level, and there is no fallback policy and
no global authorize filter anywhere in the composition root — both checked directly.
The route already known is the bulk retry, which mails every invoice with an empty send-address. The
three the review added are worse in kind: they are **GET** routes that **create** invoices before
sending them — the payout, Vipps-settlement and Dintero-settlement bulk creators. A GET that writes
money rows is reachable by anything that can make a link fetch itself.
**Pre-existing — no lane made these routes anonymous.** But the money-path pair changed the consequence
rather than the reachability: at base, an anonymous call during a renderer outage answered 500 with
nothing persisted, because the dereference aborted before the save. After the fix the run **completes,
mails what it can, and persists** — including the retirement `L-INVOICE-RETRY-RETIREMENT` describes.
The route went from crash-inert to state-changing under outage.
This is C4's shape at the entry rather than at the write: a money-path write whose actor is nobody.
**Re-counted 2026-08-02 by the lane that fixed the retirement: it is FIVE, not four.** The fifth is the
Dintero settlement webhook, which the money-path review did not name. The four already recorded are
confirmed at their exact lines, and there is still no class-level authorize attribute.
That lane also corrected the retirement's framing in both directions, and the corrections matter here.
**Overstated:** it is **not live** — the branch carrying it is unmerged and unpushed, so production still
dies on the null dereference before the save and nothing is being retired today. Pre-merge fix, not an
incident. **Understated:** invoices are stamped with the address at creation, so the unsent pool holds
exactly those whose store had no invoice email when the invoice was written — and the retry retires one
precisely when the store has since been given an address. That is **the entire population the route
exists to serve**, not a corner of it.
Two further defects on the same route, pre-existing and unclaimed: the send is **not awaited**, so a mail
failure is invisible and the stamp saves anyway — retiring the invoice exactly as a re


===== F-ISPOWERUSER-IS-A-COLUMN-NOTHING-WRITES  [Blocker]
TITLE: two pages gate on a flag the product cannot set
plan.md loc: plan.md:32744
FILE REFS (resolved at the tips):
  reservations.vue                                           fe-suffix :307
  tables.vue                                                 fe-suffix :35
QUOTED TOKENS (occurrence counts at the tips):
  /admin/reservations                            fe=7    be=8    ['test/reservations-combined-table-conflict.test.js']
  /admin/tables                                  fe=3    be=5    ['components/admin/pos/BoardView.vue']
  currentUser.isPowerUser                        fe=7    be=4    ['components/molecules/EmployeeManager.vue']
  reservations.vue:307                           fe=0    be=1    ['lanes/L-POWER-USER-IS-A-FACT-THE-PRODUCT-CAN-SET/evidence.md']
  tables.vue:35                                  fe=0    be=1    ['lanes/L-POWER-USER-IS-A-FACT-THE-PRODUCT-CAN-SET/evidence.md']
  AspNetUsers.IsPowerUser                        fe=0    be=3    ['WebApi.Tests/Wire/PowerUserProjectionWireTests.cs']
  AppSettings__AdminUserPhoneNumber              fe=2    be=4    ['test/e2e/journeys/admin-refusal-worker.spec.js']
  "role":"PowerUserRole"                         fe=0    be=2    ['WebApi.Tests/Wire/PowerUserProjectionWireTests.cs']
  /admin/goods                                   fe=6    be=2    ['test/front-door-pages-resume-after-login.test.js']
  /admin/offers                                  fe=11   be=0    ['test/admin-nav-access.test.js']
BODY:
- clears when: a power user can reach the reservations and tables pages without a hand-written database row, shown by a sign-in that renders them
- owner: @sven

**`/admin/reservations` and `/admin/tables` gate on `currentUser.isPowerUser`** (`reservations.vue:307`,
`tables.vue:35`) — and `AspNetUsers.IsPowerUser` is a **column no code path in the product ever writes.**
Setting `AppSettings__AdminUserPhoneNumber` grants the server-side role — the JWT was verified to carry
`"role":"PowerUserRole"` — but **login returns `isPowerUser: false`**, so both pages hard-redirect. The role
and the column are two different facts and only one of them is reachable.
**A seeder had to write the column by hand** to make those pages visible, and said so. **That change is still
in the owner's database**: `UPDATE AspNetUsers SET IsPowerUser = 0 WHERE UserName = N'+4799681931'` reverts it.
Side effect while it stands: `/admin/goods` and `/admin/offers` appear in the nav.


===== F-JEST-COLLECTS-LANE-FILES  [Warn]
TITLE: lane working files run as tests on the shipped branch
plan.md loc: plan.md:31430
FILE REFS (resolved at the tips):
  jest.config.js                                             fe-exact
  count.arm.spec.js                                          fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  jest.config.js                                 fe=4    be=3    ['test/vue-coverage-instrumentation.test.js']
  lanes/                                         fe=98   be=11   ['jest.config.js']
  main                                           fe=156  be=516  ['nuxt.config.js']
  candidate/fe-compose-2026-08-05                fe=3    be=0    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  L-LOGINMODAL-MOUNTED-ONCE                      fe=8    be=0    ['test/login-modal-mounted-once.test.js']
  0f88242                                        fe=2    be=0    ['lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/notes.md']
  count.arm.spec.js                              fe=5    be=0    ['lanes/L-LOGINMODAL-MOUNTED-ONCE/kill-proof-browser.txt']
BODY:
- clears when: `jest.config.js` ignores `lanes/` on the branch lanes are cut from, shown by a run that collects no file under it
- owner: @sven

`jest.config.js` on `main` and on both login-modal lane branches **does not ignore `lanes/`** — that entry
exists only on `candidate/fe-compose-2026-08-05`.
So lane working files are collected: **probes run and pass, inflating counts**, and Playwright specs load
outside their runner and **fail**. `L-LOGINMODAL-MOUNTED-ONCE` @ `0f88242` has `count.arm.spec.js` under
`lanes/` on a base without the exclusion, so it likely carries this red too.
The lane that found it **renamed its own files rather than editing a config another lane owns** — the right
call, and the reason the underlying gap is still open.


===== F-JOURNAL-FINALIZE-INDEX-DROPPED  [Blocker]
TITLE: an index nobody chose to drop is missing from every deployed database
plan.md loc: plan.md:27710
BODY:
- clears when: the finalize lookup index exists on a chain-built database alongside the fiscal backstop, or the plan records that one index serves both reads and why
- cleared by: L-FINALIZE-INDEX-OR-A-REASON
- owner: @sven
- blocks: FT-GROWTH

Found by the shadow sweep on its first real run, and **it is not a latent risk — it is the state of every
database in the estate.**
Two index configurations claim the same journal columns eleven lines apart: a **non-unique finalize lookup**
and a **unique one-sale-per-order fiscal backstop.** Only the second exists — in the model, in the snapshot,
and on every deployed database. An early migration created the name non-unique; a later one **dropped that
name and re-created it unique and filtered.**
**Nobody chose that drop.** The mapper emitted it because the model only ever had one index to emit, and
**the migration diff reads as routine.** That is the whole shape: a deliberate-looking migration produced by
a one-word omission upstream.
**The lane scoped the harm honestly rather than maximally.** The fiscal constraint is intact. The finalize
read carries the filtered value so the optimiser may still match it. **The reads that provably cannot are
the return-filtered refund-cap aggregates — on an append-only table**, which only grows. No query plan was
measured, because no SQL tier ran.


===== F-JOURNEY-FILTER-DISCARDS-A-404  [Warn]
TITLE: the walk that covers this page throws the evidence away
plan.md loc: plan.md:32650
QUOTED TOKENS (occurrence counts at the tips):
  margin-statement-week                          fe=10   be=0    ['test/e2e/fixture/margin.js']
  favicon                                        fe=30   be=0    ['nuxt.config.js']
BODY:
- clears when: no journey filter discards a status-code error, or each discarded pattern names why it is noise
- owner: @sven

`margin-statement-week`'s console filter is `/favicon|Vue Devtools|status of 404/i`.
So **every green run of the walk that covers the waste panel silently discarded the 404** that proves four of
its routes have no handler. The evidence was produced, seen, and thrown away as noise on every pass.
**`favicon` and `Vue Devtools` are noise. A 404 is a finding.** Folding the third into the same pattern is how
a walk stays green over a surface that cannot work.


===== F-JOURNEY-GUARD-DECORATIVE  [Blocker]
TITLE: a live-labelled run against a fixture passed and exited zero
plan.md loc: plan.md:23324
QUOTED TOKENS (occurrence counts at the tips):
  "status":"failed"                              fe=0    be=0    []
  fail-the-process                               fe=0    be=0    []
  failed                                         fe=355  be=363  ['jest.config.js']
  D-SPEC-L-GR-DELIVERY-RECORD                    fe=0    be=0    []
BODY:
- clears when: a live-labelled journey run against the wrong backend fails the process, proven by a mutation
- cleared by: L-JOURNEY-GUARD-FAIL
- owner: @sven
- blocks: S-EVIDENCE

**Reproduced for real, not argued.** The lane building the first live world ran the dangerous case
deliberately — a live-labelled run against a dev server compiled against the fixture. **The journey
passed. The artifact wrote `"status":"failed"`. The runner printed `1 passed` and exited 0.**
**The pre-existing fixture-side guard had the identical hole.** So the estate's protection against
mislabelling a run was **decorative on both sides**, and every journey artifact produced under it carries
only the weight of the runner's exit code — which was zero regardless.
Both now re-throw **after** writing the artifact, and both mutations re-run red. **This is the eighteenth
assertion found unable to fail in three days, and the first at harness level rather than test level** —
which is why it is a blocker: it is the thing that would have let every future live claim be wrong
silently.
**Ruled 2026-08-03 (Sven): `fail-the-process`.**
**Corrected 2026-08-03: this flag narrates a fixed defect in the present tense, and so did the brief I
wrote from it.** Reproduced on a clean tree before anything was built: a live-labelled run against a
fixture-compiled app **already exits 1**, the reporter says `1 failed`, and the artifact says `failed`.
The fixture side behaves identically. The re-throw landed weeks ago — **and this flag's own body already
said so** in a sentence I read past every time I quoted the rest of it.
**The lane did not return fail-spec, and was right not to.** Its exit was a *proof obligation*, not a code
change, and **no proof existed**: the original mutation was a one-off nobody could re-run. **Nothing in a
tree of ninety-one suites went red if you deleted the single line the entire evidence standard rests on.**
Six lanes frozen behind a claim is worse than six frozen behind an instrument.
**Second stale blocker found today by dispatching a lane at one**, after the Growth delivery record. Both
surfaced only because an agent was sent to build work already delivered. That is now twice, in one day, in the
same cluster — see `D-SPEC-L-GR-DELIVERY-RECORD` option three.


===== F-JOURNEY-GUARD-WAS-DEAD  [Blocker]
TITLE: the guard the evidence standard rests on had no working test
plan.md loc: plan.md:29589
FILE REFS (resolved at the tips):
  test/e2e/scripts/guard-proof.js                            fe-exact
  world-stamp.js                                             fe-suffix
  harness-copy.js                                            ABSENT
  artifact-store.js                                          fe-suffix :138
  guard-proof.js                                             fe-suffix :216
  build-provenance-proof.js                                  fe-suffix
  journey.js                                                 fe-suffix
  api-server.js                                              fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  e34977a                                        fe=13   be=1    ['test/order-label-dictionaries.test.js']
  test/e2e/scripts/guard-proof.js                fe=4    be=0    ['package.json']
  world-stamp.js                                 fe=10   be=0    ['test/world-stamp-windows.test.js']
  test/e2e/support/                              fe=36   be=0    ['playwright.config.js']
  test/e2e/scripts/                              fe=45   be=2    ['nuxt.config.js']
  L-JOURNEY-MEALS                                fe=0    be=1    ['.lane/L-A-REFUSAL-STOPS-NAMING-THE-PERSON-IT-PROTECTS-detail.md']
  harness-copy.js                                fe=0    be=0    []
  94fa256                                        fe=3    be=0    ['test/e2e/scripts/guard-proof.js']
  require('./world-stamp')                       fe=3    be=0    ['test/journey-assertions.test.js']
  artifact-store.js:138                          fe=0    be=0    []
  guard-proof.js:216-217                         fe=0    be=0    []
  servingFixture                                 fe=0    be=0    []
  health+lsof                                    fe=0    be=0    []
  997936a                                        fe=1    be=0    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
BODY:
- clears when: every journey artifact captured before the guard harness was repaired is re-established under a guard proven to run, or the plan records which artifacts were captured under the dead guard and what they are worth
- owner: @sven

**Found by a lane that was not looking for it, measured at `e34977a` in a throwaway worktree.**
`test/e2e/scripts/guard-proof.js` was **already dead**: **9 of its 10 arms die during module load** on
`Cannot find module './world-stamp'`, because its harness copies files from a **hand-written list of two** and
`world-stamp.js` lives in `test/e2e/support/` while the script lives in `test/e2e/scripts/`. The clerk confirmed
the directory split independently.
**The tenth arm made it worse rather than better.** Arm 3 **"passed" spuriously** — its success condition is
`nonzero exit and no artifact`, **which is exactly a module-load death's signature.** So the one arm that
reported working was reporting the failure of the other nine.
**This is the line the whole evidence standard rests on.** `L-JOURNEY-MEALS` was unfrozen on the argument that
*"the guard is built and proven by seven arms including two that reproduce the historical defect on demand — so
a capture from here carries weight an exit code alone never did."* **That guard was not running.** Every journey
artifact captured since carries less weight than the plan records.
**What is not yet known is how much less**, and that is the work. A guard that never ran does not make the
captures false; it makes them unwitnessed. **Which artifacts were taken under it, and whether any of them would
have failed a working guard, is a measurement nobody has made.**
**Repaired by the finding lane via a shared `harness-copy.js`, now 10 of 10** — on a lane branch, not on any tip.
**Measured across all 115 refs, 2026-08-05: of 41 committed journey receipts, 15 predate the guard, 26 were
captured from a tree where it could not load, and _zero_ were ever witnessed.** Not weakened captures —
**none.**
**The guard was alive for 12 hours and 35 minutes, and that window contains no artifact-adding commit.** It
died at `94fa256`, which added `require('./world-stamp')` to `artifact-store.js:138` while
`guard-proof.js:216-217` copies from a hand-written list of two. **So it broke by something else being fixed**,
which is why nobody noticed.
**The sharpest instance is the argument this plan used to unfreeze a lane.** The two `L-JOURNEY-MEALS` captures
that *"the guard is proven by seven arms"* authorised were taken **13 hours and 7 minutes after the guard
died.** Both have now been re-run and pas


===== F-JOURNEY-LEAVES-LEVERS-ON  [Warn]
TITLE: a journey run changes the world it ran against
plan.md loc: plan.md:8313
QUOTED TOKENS (occurrence counts at the tips):
  L-EV-JOURNEY-TIMEBOMB                          fe=4    be=0    ['lanes/L-ALIASING-NEEDLE-SWEEP/census.md']
BODY:
- clears when: a journey that pulls a feature lever restores it, shown by two consecutive runs against one world where the second starts from the state the first did
- cleared by: L-EV-JOURNEY-TIMEBOMB
- owner: @sven

**Observed, not theorised.** `L-EV-JOURNEY-TIMEBOMB` was proving re-runnability when its run was killed
by a session limit. Its last recorded line is the finding: *"Arm A run 2 failed — the pipeline is not
dark, because run 1 left the levers on."*
This is a **third** re-runnability fault, beyond the two that lane was authored for (a constant subject
name, and a future date literal). Those two make a second run *unreliable*. This one makes it **run
against a different world**: the journey enables a feature lever and does not put it back, so run 2
starts from a state run 1 created.
**Why it matters more than it looks:** the estate has been treating a green journey as evidence about the
product. A journey that mutates its own world is evidence about **the product plus whatever the last run
left behind** — and the failure surfaces as an unrelated assertion failing on run 2, which reads as
flakiness rather than as contamination.
It also explains a constraint several lanes have been honouring by instinct: three declined to borrow a
standing world for exactly this reason, and one noted that a pending acceptance walk asserts *zero flag
overrides*, so borrowing would have reddened another lane's evidence. **They were right, and this is why.**


===== F-JOURNEY-RECEIPT-DOES-NOT-NAME-ITS-FIXTURE  [Blocker]
TITLE: a walk that may have been served by another lane's world
plan.md loc: plan.md:29415
FILE REFS (resolved at the tips):
  playwright.config.js                                       fe-exact
  test/e2e/fixture/api-server.js                             fe-exact
  test/e2e/journeys/meals-statement-month.spec.js            fe-exact
  journey.js                                                 fe-suffix
  playwright.json                                            ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  playwright.config.js                           fe=17   be=0    ['playwright.consumer.config.js']
  test/e2e/fixture/api-server.js                 fe=19   be=1    ['playwright.config.js']
  /Users/svendaneel/okam/wt-jwf                  fe=1    be=0    ['lanes/L-WF-KODEOVERSIKT-UI/evidence.md']
  /__fixture/health                              fe=8    be=0    ['playwright.config.js']
  workforce-kodeoversikt                         fe=7    be=1    ['test/workforce-personnel-list-code-register-client.test.js']
  test/e2e/journeys/meals-statement-month.spec.j fe=0    be=0    []
  127.0.0.1:4010                                 fe=3    be=0    ['playwright.config.js']
  journey.js                                     fe=40   be=2    ['playwright.config.js']
  apiBaseUrl                                     fe=56   be=2    ['artifacts/journeys/modal-scroll-lock.playwright.json']
  4772c13                                        fe=0    be=0    []
  lane/L-JOURNEY-PORT-HARDCODED                  fe=0    be=0    []
  e34977a                                        fe=13   be=1    ['test/order-label-dictionaries.test.js']
  require                                        fe=418  be=536  ['playwright.config.js']
  artifacts/journeys/*.playwright.json           fe=2    be=0    ['test/e2e/support/artifact-store.js']
BODY:
- clears when: every journey receipt names the fixture process that served it, and a run refuses to proceed against a fixture it did not start
- owner: @sven

**The composition lane found this in its own completed work and corrected its own headline for it.**
`playwright.config.js` carries `reuseExistingServer: !process.env.CI`. It never set `CI`, and **pid 73160** — a
sibling lane's `test/e2e/fixture/api-server.js`, cwd `/Users/svendaneel/okam/wt-jwf`, started before that
session — was holding **port 4010** and answering `/__fixture/health` with 200. The clerk confirmed that process
is still alive. **Every journey it reported drove its frontend against another lane's API fixture, 368 lines
divergent from the composed one.**
**The corrected figures show how much this moved.** On isolated ports with the serving process confirmed by pid
and cwd: **26 passed / 3 failed, not 21 / 8.** **Five of the eight failures were artifacts.**
**And the withdrawn one is the expensive kind.** `workforce-kodeoversikt`, the § 8-5-6 statutory download,
**passes**. It had been reported as a failing statutory journey, repeated in two briefs and in three status
messages. **Naming a statutory gap that does not exist is the same class of error as asserting a control that
does not exist** — the failure this plan already records twice against RF-1313, arriving from the opposite
direction.
**The hazard is estate-wide, not lane-local.** With roughly eighty worktrees on this host, **any journey receipt
taken without a private fixture port may have been served by a foreign fixture**, and **two receipts cannot be
compared unless each states which one served it.** Every journey artifact in this plan predates that
requirement.
**The cheap remedy is a per-lane port; the durable one is that a run refuses a fixture it did not start.**
Both are cheaper than the correction they prevent — this one cost a statutory claim and five phantom failures,
and it was caught only because a lane checked for stray processes after it had already reported.
**What survives untouched:** everything git-derived or jest-derived — the 28-of-61 conflict split, the collector
correction, the twin reconciliation, the translation checks. **Only the journey evidence was affected.**
**The ninth instance sits one layer inside the eighth, and it is the sharpest of the set.**
`test/e2e/journeys/meals-statement-month.spec.js` **hardcoded `127.0.0.1:4010` at line 72, present at its birth
commit** — so its red **survived isolating the run**. On an isolated tier the rest of the walk went to the
private port while that one expres


===== F-JWT-SIGNING-KEY-COMMITTED  [Blocker]
TITLE: the token signing key is in the repository, and forging needs no login at all
plan.md loc: plan.md:31626
FILE REFS (resolved at the tips):
  appsettings.json                                           be-exact :12
  Program.cs                                                 be-exact :139
  Helpers/ServiceCollectionExtensions.cs                     be-exact :192
  Services/UserService.cs                                    be-exact :591
  StoreAdminAuthorizationHandler.cs                          be-suffix :17
  UserService.cs                                             be-suffix :621
QUOTED TOKENS (occurrence counts at the tips):
  AppSettings:Secret                             fe=0    be=10   ['WebApi.Tests/Wire/MealsDownloadHeaderWireTests.cs']
  appsettings.json:12                            fe=0    be=0    []
  Program.cs:139                                 fe=0    be=0    []
  AddJWTAuthentication                           fe=4    be=8    ['lanes/L-DI-COLLECTION-SILENT/dicensus-tool.cs.txt']
  Helpers/ServiceCollectionExtensions.cs:192-194 fe=0    be=0    []
  Services/UserService.cs:591                    fe=0    be=0    []
  F-POWERUSER-CODE-IS-COMMITTED                  fe=1    be=0    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  StoreAdminAuthorizationHandler.cs:17           fe=1    be=0    ['test/e2e/journeys/workforce-week-run-two-humans.spec.js']
  UserService.cs:621                             fe=0    be=0    []
  Program.cs:75-81                               fe=0    be=0    []
  KassaSettings.UseKeyVault                      fe=0    be=3    ['Program.cs']
BODY:
- clears when: the JWT signing key is read from Key Vault or environment configuration with a fail-fast guard outside Development, and the committed value is retired
- cleared by: L-SECRETS-READ-FROM-CONFIG
- owner: @sven

**Found by a reviewer checking a smaller finding, and it is strictly larger than the one it was checking.**
`AppSettings:Secret` at **`appsettings.json:12`** is a committed 36-character GUID-shaped value. It is the
**HMAC-SHA256 JWT signing key**: `Program.cs:139` passes it to `AddJWTAuthentication`
(`Helpers/ServiceCollectionExtensions.cs:192-194`), and `Services/UserService.cs:591` mints with it.
**Whoever holds it forges a token carrying `role: PowerUserRole` with no login at all** — no phone number, no
verification code, none of the chain `F-POWERUSER-CODE-IS-COMMITTED` describes. And that role is a StoreAdmin of
every store (`StoreAdminAuthorizationHandler.cs:17`), on tokens that never expire (`UserService.cs:621`).
**Committed since 2020-04-08.**
**There is no fail-fast guard, and the estate demonstrably knows how to write one.** Contrast `Program.cs:75-81`,
which **throws** outside Development unless `KassaSettings.UseKeyVault` is true, with a written reason about the
fiscal journal. The token key has nothing equivalent — the committed default simply works.
**This should be ruled on before the power-user code, not after.** The false sentence *"every neighbouring secret
on that surface is a placeholder"* — which I wrote — is what hid it, eight lines above the key it described.


===== F-KITCHEN-CLOCK-FREEZES-AFTER-LOGIN  [Blocker]
TITLE: a KDS whose ticket timers stop is a KDS with no purpose
plan.md loc: plan.md:31853
FILE REFS (resolved at the tips):
  kitchen.vue                                                fe-suffix :135
  KitchenTicket.vue                                          fe-suffix :113
  ongoing.vue                                                fe-suffix :285
  AdminPage.vue                                              fe-suffix :99
QUOTED TOKENS (occurrence counts at the tips):
  mounted                                        fe=213  be=7    ['playwright.growth-guest-exit.config.js']
  kitchen.vue:135-145                            fe=0    be=0    []
  this.clockInterval                             fe=1    be=0    ['pages/admin/kitchen.vue']
  :143                                           fe=3    be=5    ['test/kitchen-and-board-resume-after-login.test.js']
  :144                                           fe=2    be=5    ['test/kitchen-and-board-resume-after-login.test.js']
  closeLoginModal                                fe=9    be=0    ['test/adminpage-redirect-target.test.js']
  :244-251                                       fe=0    be=0    []
  this.now                                       fe=8    be=0    ['test/kitchen-and-board-resume-after-login.test.js']
  KitchenTicket.vue:113-138                      fe=0    be=0    []
  0:00                                           fe=137  be=146  ['test/workforce-delivery-failures.test.js']
  ongoing.vue:285-290                            fe=0    be=0    []
  startAutoRefresh()                             fe=2    be=0    ['pages/admin/ongoing.vue']
  adminStores                                    fe=12   be=6    ['test/kitchen-and-board-resume-after-login.test.js']
  AdminPage.vue:99-101                           fe=0    be=0    []
BODY:
- clears when: signing in through a page's own modal restores everything `mounted` starts, shown for the kitchen clock and the ongoing auto-refresh
- cleared by: L-KITCHEN-AND-BOARD-RECOVER-AFTER-LOGIN
- owner: @sven

`kitchen.vue:135-145` returns early for a logged-out user and so never starts `this.clockInterval` (`:143`) or
the fullscreen listener (`:144`). `closeLoginModal` (`:244-251`) restarts the fetch and the auto-refresh but
**never starts the clock**.
So after an in-page sign-in `this.now` is frozen at page load: **every ticket age timer in
`KitchenTicket.vue:113-138` is wrong**, new tickets clamp to `0:00` and never escalate to amber or red. On a
kitchen display, the ageing tickets are the entire point of the screen.
**The same shape on the live board is worse**: `ongoing.vue:285-290` never calls `startAutoRefresh()`, so the
board becomes **a frozen snapshot and new orders never appear**; it also leaves `adminStores` empty, which
silently disables transfer.
**Related, and it decides the severity**: `AdminPage.vue:99-101` redirects a logged-out visitor away from any
admin path other than `/admin`, so these handlers are usually not reached — **except** when the page is
entered with `?redirect=` already set, which is exactly the post-login return path.


===== F-KRAVIA-MESSAGE-NULLED-BY-EVERY-DINTERO-SAVE  [Warn]
TITLE: a third field, wiped since before anyone looked
plan.md loc: plan.md:32207
FILE REFS (resolved at the tips):
  dintero.vue                                                fe-suffix
  StoreService.cs                                            be-suffix :1266
QUOTED TOKENS (occurrence counts at the tips):
  dintero.vue                                    fe=5    be=3    ['nuxt.config.js']
  kraviaMessage                                  fe=2    be=0    ['test/store-config-full-replace.test.js']
  StoreService.cs:1266                           fe=1    be=0    ['test/store-config-full-replace.test.js']
  :1390                                          fe=1    be=0    ['test/store-config-full-replace.test.js']
BODY:
- clears when: the Kravia invoice message has an operator lever on the page that writes it, or the plan records why it is set elsewhere
- owner: @sven

**Found by writing the write model down rather than by reading the page.** `dintero.vue` has **never** sent
`kraviaMessage`, and `StoreService.cs:1266`/`:1390` assign every write-model field unconditionally — so an
absent key becomes the C# default rather than unchanged. **Every Dintero save has been nulling the stored
Kravia invoice message.**
It now round-trips, so saving no longer destroys it. **But the field still has no input on the page**, so a
venue cannot set or correct it from anywhere — a C3 gap left standing after the destructive half was closed.
**Third instance of one shape in one page.** The other two — the payment credentials and the tips flag — were
found by a UI survey; this one was invisible until somebody enumerated what the form posts against what the
endpoint accepts. **That enumeration is the instrument**, not the survey.


===== F-LAND-OUTBOX-FLAKE-NOT-GUID  [Warn]
TITLE: of the two rival fixes, one catches a leak the other misses
plan.md loc: plan.md:9611
QUOTED TOKENS (occurrence counts at the tips):
  F-OUTBOX-FLAKE-FIXED-TWICE                     fe=0    be=0    []
  lane/ev-outbox-flake                           fe=2    be=0    ['lanes/L-ALIASING-NEEDLE-SWEEP/census.md']
BODY:
- clears when: lane/ev-outbox-flake is an ancestor of the integration branch and lane/ev-outbox-guid-substring is retired or reduced to additive tests
- cleared by: L-ALIASING-NEEDLE-SWEEP
- owner: @sven

**`F-OUTBOX-FLAKE-FIXED-TWICE` recorded that one defect has two fixes and said land one. A reviewer has
now ruled which, on evidence rather than preference.**
Both branches rewrite **the same test's same hunks**, so landing both is a guaranteed conflict. The pick
is `lane/ev-outbox-flake`, and the reason is the carried-forward lesson from the census itself: **its
digit-inventory assertion is the only one of the two that catches `2 000,00`** — the space-grouped
rendering a Norwegian money leak actually takes. The rival keeps bare needles inside its helper and so
still misses it.
The inventory also subsumes the rival's stray-identifier guard for any digit-bearing identifier; a
digit-free GUID occurs with probability about 4e-14.
**The rival is not worthless and should not simply be deleted.** Its seeded-token reproduction cases and
its planted-leak check are additive and do **not** conflict — only the shared test rewrite does. Cherry-pick
those afterwards.


===== F-LANDING-THE-BACKEND-HALF-FIRST-BREAKS-A-7-3-PROMISE-ON-EVERY-SEND  [Blocker]
TITLE: the unsubscribe base url is printed on every dispatched message, so shipping the backend ahead of the consumer deploy makes the promise false rather than missing
plan.md loc: plan.md:33348
BODY:
- clears when: the consumer unsubscribe surface is deployed at the origin the footer prints, or the footer stops printing a url that does not answer
- owner: @sven


===== F-LANE-COMMITS-CARRY-SIBLING-HUNKS  [Warn]
TITLE: a lane branch is a snapshot, not a merge candidate
plan.md loc: plan.md:28742
FILE REFS (resolved at the tips):
  AdminPageHeader.vue                                        fe-suffix
  admin-nav-access.test.js                                   fe-suffix
  api-server.js                                              fe-suffix
  schedule-client.js                                         fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  L-WF-PUBHIST                                   fe=0    be=0    []
  2d86446                                        fe=0    be=0    []
  AdminPageHeader.vue                            fe=15   be=7    ['test/store-cart-state.test.js']
  admin-nav-access.test.js                       fe=7    be=1    ['test/e2e/journeys/training-evidence-document.spec.js']
  api-server.js                                  fe=33   be=1    ['playwright.config.js']
  schedule-client.js                             fe=3    be=0    ['utils/workforce/requests-client.js']
  L-WF-FAILURES-SURFACE                          fe=0    be=0    []
  F-THE-CONFLICT-IS-A-DECOY                      fe=0    be=0    []
  GIT_INDEX_FILE                                 fe=1    be=0    ['lanes/L-XZ-NEGATED-ABSENCE/mutation-log.md']
  write-tree                                     fe=2    be=2    ['lanes/L-THE-GUEST-EXIT-IS-FINISHED/evidence.md']
  commit-tree                                    fe=2    be=0    ['lanes/L-XZ-NEGATED-ABSENCE/mutation-log.md']
  update-ref                                     fe=1    be=3    ['lanes/L-XZ-NEGATED-ABSENCE/mutation-log.md']
BODY:
- clears when: every lane branch cut from the shared checkout tonight is landed by pathspec or has its co-resident hunks named, so no sibling's work is taken or lost by a file-level merge
- owner: @sven

**Disclosed by `L-WF-PUBHIST` in its own commit body rather than left for a lander to discover.** Its
commit at `2d86446` carries **seven files that were already dirty from sibling lanes before it started** —
`AdminPageHeader.vue`, `admin-nav-access.test.js`, `api-server.js`, `schedule-client.js` and the three
translation files, chiefly from `L-WF-FAILURES-SURFACE`.
**There was no clean way out and it chose right.** Excising a sibling's hunks means rewriting files it did
not dirty — forbidden, and it would have produced **a divergent third version** of each. So the commit says
plainly that it is **"a durability snapshot of a lane branch, not a merge candidate to be taken whole —
take my paths, not the file-level diff."**
**This generalises to every branch cut from that checkout tonight, which is most of them.** The shared tree
went from **204 to 224 dirty files during one lane's session**, and two files changed underneath it at
22:04 from a concurrent lane. **Any lane commit made from that tree may carry hunks its author never
wrote.**
**So the landing rule for tonight's branches is: take paths, not files.** A file-level merge of two such
branches either duplicates a sibling's change or silently drops it — and it is the *clean* merge that does
the damage, as `F-THE-CONFLICT-IS-A-DECOY` already records from a different angle.
**The technique that made this safe is worth keeping**: a private `GIT_INDEX_FILE` seeded from
`read-tree HEAD`, pathspecs added to **that** index only, then `write-tree` → `commit-tree` →
`update-ref`, with HEAD, the shared index and the working tree all verified untouched afterwards.
**Never `checkout -b` in a shared checkout other lanes are live in.**


===== F-LANES-ARE-BEING-AUTHORED-FROM-FLAG-BODIES-THAT-THE-TRUNK-HAS-OVERTAKEN  [Blocker]
TITLE: three lanes were dispatched at defects already fixed, because the flag census predates fifty commits of trunk
plan.md loc: plan.md:33433
BODY:
- clears when: no lane brief cites a defect site that a grep at the current trunk tip cannot reproduce, checked at authoring time and recorded in the lane body
- owner: @sven


===== F-LIMITERS-PER-PROCESS  [Warn]
TITLE: the marketing-law proof rests on limits that do not survive a second replica
plan.md loc: plan.md:26779
QUOTED TOKENS (occurrence counts at the tips):
  record-single-replica-as-a-constraint          fe=0    be=0    []
BODY:
- clears when: either the confirmation and send limiters are backed by a store shared across replicas, or the plan records single-replica as a deployment constraint the section 15 claim depends on
- owner: @sven
- blocks: S-PILOT-SAFE

Raised by the confirm-chain review as a bound **nothing in the family states in one place**, which is
what makes it worth a flag rather than a comment.
Every limiter in the § 15 chain is in-memory and per-process, and so is the one-shot retirement claim.
On the ratified container-apps infrastructure, **every budget multiplies by the replica count** and the
retirement fires once per replica. The guessing arithmetic that makes the six-digit code defensible —
the even-odds-beyond-a-year figure — assumes one process.
This is not a new defect: it mirrors the SMS limiter pattern already in the estate. What changed is
that a **statutory claim now rests on it**, and no lane says so.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `record-single-replica-as-a-constraint`.**


===== F-LINT-IS-ENABLED-AND-WIRED-INTO-NOTHING  [Warn]
TITLE: the rule that catches it is already an error and never runs
plan.md loc: plan.md:29969
FILE REFS (resolved at the tips):
  package.json                                               fe-exact
  eslintrc.js                                                ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  error                                          fe=437  be=406  ['.gitignore']
  package.json                                   fe=5    be=4    ['nuxt.config.js']
  husky                                          fe=3    be=0    ['package-lock.json']
  .git/hooks                                     fe=1    be=0    ['lanes/L-LAND-THE-FRONTEND-ON-THE-TRUNK/evidence.md']
  lint-staged                                    fe=2    be=0    ['package-lock.json']
  .eslintrc.js                                   fe=0    be=1    ['docs/plans/replan/a1-web-admin-pattern.md']
  extends                                        fe=40   be=8    ['.eslintrc.js']
  hookIsDefined()                                fe=0    be=0    []
  /Users/svendaneel/okam/Web/.git/hooks          fe=0    be=0    []
  @nuxtjs/eslint-module                          fe=2    be=0    ['package-lock.json']
  buildModules                                   fe=1    be=0    ['nuxt.config.js']
  @nuxtjs/stylelint-module                       fe=3    be=0    ['nuxt.config.js']
  --ext                                          fe=1    be=2    ['lanes/L-THE-COVERAGE-INSTRUMENT-MEASURES-WHAT-IT-CLAIMS/evidence.md']
  .vue                                           fe=383  be=23   ['nuxt.config.js']
BODY:
- clears when: eslint runs on a change to a translations dictionary through a script, a hook or a workflow, shown by a run that reds on a rule already configured as error
- owner: @sven

**The rule that catches the duplicate-key hazard already exists, is already `error`, and finds it in under a
second — and nothing in this repository ever invokes it.** The clerk verified all three halves: **no script in
`package.json` contains "lint"**, **no workflow mentions it**, and **`package.json` carries no `husky` key** —
while the hooks in `.git/hooks` are husky **v4**, which reads exactly that key. **So the configured
`lint-staged` never fires.**
**This is not "a check switched off". It is a check enabled and wired into nothing** — which reads better in a
config than being off, and behaves identically.
**It is the third instance of that shape in two days**, after a prover in no gate and a divergence comparison
in no suite. The lane's response is the right one: it put the check **inside the test suite**, where it cannot
be disabled by editing a config nobody runs.
**Runnable now, and the diagnosis was wrong in its mechanism though right in its conclusion.** eslint itself is
healthy — v7.32.0, all eight plugins and the Vue parser resolve, **0 fatal or parse errors across 878 files**,
and **207 rules resolve to `error`**. `.eslintrc.js` sets fourteen rules and **none of them are `error`**, so
every one of the 207 arrives through the two `extends`.
**The clerk's husky account was wrong: `hookIsDefined()` greps for the hook's own name, not a `husky` key**, and
the lane proved it by running the hook — *"pre-commit config not found, skipping hook"*, exit 0. The conclusion
survives; the reason does not.
**Two facts the clerk did not have, and they change who may act.** The seventeen hooks live in the **shared
common directory** `/Users/svendaneel/okam/Web/.git/hooks` — **one directory behind roughly ninety worktrees**,
33 entries, confirmed — and they were written by **one lane's `npm install`** on 2026-08-01. **Repairing them
would arm a lint gate across the whole estate on that basis.** The lane did not touch them, correctly.
**And a fourth dead lever nobody had named.** `@nuxtjs/eslint-module` is a declared devDependency and is
**not** in `buildModules`, while `@nuxtjs/stylelint-module` **is** — the clerk confirmed both. **So stylelint
runs on every dev build and eslint does not.** `lint-staged` configures both and only one is reachable, which
is evidence the eslint wiring was **dropped rather than never intended**.
**`--ext` turned out to be load-bearing: without it


===== F-LIVE-WORLD-5961-DIRTY  [Warn]
TITLE: the live workforce world is left published and needs a restore before reuse
plan.md loc: plan.md:28650
FILE REFS (resolved at the tips):
  live-world-reset.sh                                        fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  :5961                                          fe=13   be=0    ['test/journey-artifact-store.test.js']
  L-WF-PIVOT-DEFECTS                             fe=0    be=0    []
  workforce.publication                          fe=36   be=9    ['playwright.config.js']
  okam-lwr-sql                                   fe=5    be=5    ['lanes/L-MRG-EHF-SPIKE/DETAIL.md']
  state=None                                     fe=0    be=0    []
  assertFirstRevision                            fe=3    be=0    ['test/journey-assertions.test.js']
BODY:
- clears when: live-world-reset.sh restore has run against :5961 and the current week reads unplanned in both the draft and published views
- owner: @sven

**Recorded so the next lane to want `:5961` does not inherit it silently.** `L-WF-PIVOT-DEFECTS` read the
state back over HTTP, read-only, after its run:
- **Current week (2026-08-03..09): Published**, publication #1, 1 shift, and `workforce.publication` left
  **on** for store 1.
- **Uke 38 (2026-09-14..20): Draft, revision 1, 0 shifts** — probe residue six weeks out, where neither
  live workforce journey looks.
**It did not restore, and stopping was correct.** `live-world-reset.sh restore` works by `docker exec` into
`okam-lwr-sql` — **a container it did not create**, which its brief forbids. So it left the state and
reported it rather than reaching into somebody else's container to tidy up.
**The wrinkle inside it is the same class as the dead worlds above, and worth more than the residue.**
**The current week's *draft* view reads `state=None` even though the week is published** — only the
published view shows `Published / publication 1`. So a later run reads *"Ingen plan"*, sails through its
planning step, and **plans a week somebody has already planned.**
**It is no longer silent**, which is the one piece of good news: `assertFirstRevision` means the next run
**reds at step 5** on *"this draft opened as revision 2"* rather than filing a green artifact. **So the
world is loud rather than quietly wrong — but it is not clean**, and the restore is owed before anyone
trusts `:5961` again.
**Teardown belongs to whoever owns `okam-lwr-sql`**, not to a lane that borrowed the port.


===== F-LIVE-WORLD-ONE-HUMAN  [Blocker]
TITLE: the live world can only be one person at a time
plan.md loc: plan.md:31171
FILE REFS (resolved at the tips):
  live-world.sh                                              fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  live-world.sh                                  fe=47   be=0    ['nuxt.config.js']
  IsNoSmsPhoneNumber                             fe=0    be=1    ['Services/UserService.cs']
BODY:
- clears when: two distinct humans can sign in to a live world without an SMS, shown by a walk that acts as a manager and then as a worker in the same run
- cleared by: L-LIVE-WORLD-SECOND-HUMAN
- owner: @sven
- blocks: L-LIVE-WALK-WORKFORCE

**Cross-module: Workforce hit it, and Meals hit it before that.** Exactly one no-SMS credential is usable
**without a configuration act** — `live-world.sh` spends it on the **manager**. *(Corrected 2026-08-06: the
power-user credential is also usable; its phone half is an owner-held value rather than an absent one.)* The power-user phone ships as a placeholder
sentence rather than a number, and the third no-SMS path — `IsNoSmsPhoneNumber` — is a **lock-out, not a
bypass**, so it cannot be borrowed for a second identity.
**Every module whose value is two people talking is therefore unwalkable live.** Workforce's week-run needs
a manager who publishes and a worker who acknowledges; Meals needs a concierge and an invitee. Four of the
Workforce walk's six capabilities sit behind this and the no-engagement blocker together.
**It is not a fixture gap that seeding can close.** A second human needs a credential, and issuing one is an
owner act — which is why this is a Flag rather than a lane's to-do.


===== F-LOGIN-CENTURY-TOKEN  [Blocker]
TITLE: the login route mints a hundred-year token into a body any origin can read
plan.md loc: plan.md:31280
FILE REFS (resolved at the tips):
  UserService.cs                                             be-suffix :547
  Helpers/ServiceCollectionExtensions.cs                     be-exact :195
  Controllers/UserController.cs                              be-exact :161
  Services/UserService.cs                                    be-exact :499
  Program.cs                                                 be-exact :134
QUOTED TOKENS (occurrence counts at the tips):
  /User/login                                    fe=6    be=3    ['test/login-modal-success-is-silent.test.js']
  AddDays(36500)                                 fe=2    be=3    ['test/login-modal-success-is-silent.test.js']
  UserService.cs:547                             fe=1    be=0    ['lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/notes.md']
  Helpers/ServiceCollectionExtensions.cs:195-204 fe=0    be=0    []
  OnTokenValidated                               fe=1    be=7    ['lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/notes.md']
  Controllers/UserController.cs:161-181          fe=0    be=0    []
  :162                                           fe=2    be=2    ['utils/meals/claim-client.js']
  Services/UserService.cs:499-509                fe=0    be=0    []
  IOAuthSmsRateLimiter                           fe=1    be=8    ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  Helpers/ServiceCollectionExtensions.cs:59      fe=0    be=0    []
  OAuthLoginController                           fe=0    be=10   ['WebApi.Tests/Wire/LoginTokenAndSmsDoorWireTests.cs']
  :106                                           fe=7    be=3    ['lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md']
  UseRateLimiter()                               fe=0    be=1    ['Program.cs']
  [EnableRateLimiting]                           fe=0    be=0    []
BODY:
- clears when: the token this route issues expires within an ordinary session lifetime, and its SMS companion refuses a caller that asks too often
- owner: @sven

`/User/login` returns a JWT with `AddDays(36500)` — `UserService.cs:547`. A hundred years. It is delivered in
a response body that the wildcard `access-control-allow-origin: *` makes **script-readable from any origin**,
so a token that never expires is also a token any page can pick up.
**And there is no revocation path.** `Helpers/ServiceCollectionExtensions.cs:195-204` fails `OnTokenValidated` only
when the user row no longer exists — no security stamp, no denylist. So "expires in 100 years" is operationally
**"cannot be revoked short of deleting the user"**, which decides the shape of the remediation.
Its SMS companion is `Controllers/UserController.cs:161-181` (route attribute `:162`) and the unlimited sender is
`Services/UserService.cs:499-509`. `IOAuthSmsRateLimiter` is registered at `Helpers/ServiceCollectionExtensions.cs:59`
and consumed only by `OAuthLoginController` at `:63` and `:106`. Same product, two doors, one unguarded — and the
unguarded one spends money per call.
**Worse than an unattached policy — the middleware is absent.** `UseRateLimiter()` is never called anywhere on
master, and `[EnableRateLimiting]` / `RequireRateLimiting` appear zero times, so the `"fixed"` policy at
`Program.cs:134-141` could not fire even if a route asked. *(Corrected 2026-08-06: I had cited `UserService.cs:161`,
which is an unrelated reward-program query.)*


===== F-LOGIN-OTP-IS-BRUTE-FORCEABLE  [Blocker]
TITLE: the six-digit verification code is unmetered at the login door while the sibling OAuth door meters it
plan.md loc: plan.md:33153
BODY:
- clears when: /User/login consumes the verify budget the way the OAuth door does, shown by a wire proof that refuses the caller after the allowance
- owner: @sven


===== F-LOGINMODAL-MOUNTED-TWICE  [Warn]
TITLE: twelve admin pages carry a second sign-in modal
plan.md loc: plan.md:31372
FILE REFS (resolved at the tips):
  lang.vue                                                   fe-suffix
  workforce-me.vue                                           fe-suffix
  AdminPage.vue                                              fe-suffix :103
QUOTED TOKENS (occurrence counts at the tips):
  .login-modal                                   fe=26   be=1    ['artifacts/journeys/modal-estate-scroll-lock.playwright.json']
  LoginModal                                     fe=45   be=4    ['artifacts/journeys/modal-estate-scroll-lock.playwright.json']
  AdminPage                                      fe=160  be=8    ['Claude.md']
  brev                                           fe=28   be=22   ['package-lock.json']
  dinehome                                       fe=12   be=8    ['test/admin-nav-access.test.js']
  kitchen                                        fe=48   be=66   ['test/margin-statements-page.test.js']
  lang                                           fe=228  be=44   ['nuxt.config.js']
  onboarding                                     fe=56   be=65   ['.gitignore']
  ongoing                                        fe=44   be=12   ['artifacts/journeys/modal-estate-scroll-lock.playwright.json']
  orders                                         fe=95   be=258  ['Claude.md']
  payouts                                        fe=16   be=9    ['test/admin-nav-access.test.js']
  statistics                                     fe=35   be=28   ['Claude.md']
  wolt-calc                                      fe=9    be=0    ['test/admin-nav-access.test.js']
  wolt-menu                                      fe=17   be=2    ['test/admin-nav-access.test.js']
BODY:
- clears when: no admin route renders more than one `.login-modal`, shown by a count that reds on a second mount
- cleared by: L-LOGINMODAL-MOUNTED-ONCE
- owner: @sven

**Eleven admin pages** mount their own `LoginModal` on top of the one `AdminPage` already renders: `brev`,
`dinehome`, `kitchen`, `lang`, `onboarding`, `ongoing`, `orders`, `payouts`, `statistics`, `wolt-calc`,
`wolt-menu` — each at two mount sites.
**Found as a Playwright strict-mode violation from two real elements**, by a lane that chased it down rather
than selecting around it. Two modals hold two copies of the sign-in state and only one is the one on screen.
Measured in a browser: with `lang.vue` at HEAD, `/admin/lang` serves `.login-modal` = 2 **and two phone fields**.
**Corrected 2026-08-06 by the lane that closed it — I had written twelve, and `/admin` did not reproduce.**
`/admin` mounts none of its own and never did; the browser reports 1 there before and after. `workforce-me.vue`
carries none either.
**Three different counts were already in this repository** — ten in the estate scroll-lock note, twelve in a
sibling lane's spec, eleven in the tree. Eleven is what compiling every template and walking every closure
produces. **A census nobody re-derives drifts into three answers**, which is the same shape as the audit-stamp
floor that produced `F-TRAIN-EVIDENCE-SERVICE-UNCENSUSED`.
**The duplicates were not decorative, and deleting them naively would have lost behaviour.**
`AdminPage.initAuth` calls `_userService.Reload()` and **ignores its result** (`AdminPage.vue:103`), so
`onboarding` and `wolt-menu` raised their own modal when that call answered false. The close adds
`AdminPage.openLogin()` for exactly that path, and a mutation deleting it reds — load-bearing, not decorative.


===== F-LOGINMODAL-SUCCESS-SHOWS-A-BLOB  [Warn]
TITLE: a latent credential render, one call-site edit away
plan.md loc: plan.md:31401
FILE REFS (resolved at the tips):
  LoginModal.vue                                             fe-suffix :203
  plugins/admin-core-services.js                             fe-exact :50
QUOTED TOKENS (occurrence counts at the tips):
  LoginModal.vue:203                             fe=1    be=0    ['lanes/L-LOGINMODAL-MOUNTED-ONCE/notes.md']
  JSON.stringify(response)                       fe=11   be=0    ['test/login-modal-success-is-silent.test.js']
  errorMessage                                   fe=17   be=4    ['test/login-modal-success-is-silent.test.js']
  AdminUserService.Login                         fe=2    be=0    ['lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/c7-probe.probe.js']
  plugins/admin-core-services.js:50-54           fe=1    be=0    ['lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/notes.md']
  "true"                                         fe=53   be=55   ['test/training-evidence-print.test.js']
  user.token                                     fe=5    be=0    ['test/login-modal-success-is-silent.test.js']
  SetCurrentUser                                 fe=9    be=2    ['test/store-cart-state.test.js']
  UserService.Login                              fe=5    be=0    ['test/login-modal-success-is-silent.test.js']
  token                                          fe=279  be=820  ['nuxt.config.js']
  LoginAdmin                                     fe=6    be=1    ['test/login-modal-success-is-silent.test.js']
  login()                                        fe=2    be=3    ['lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/notes.md']
  getCode                                        fe=9    be=0    ['test/login-modal-success-is-silent.test.js']
BODY:
- clears when: the success path assigns nothing to the error slot and resets it, shown by a test that reds when either half is removed
- cleared by: L-LOGINMODAL-SUCCESS-IS-SILENT
- owner: @sven

**Measured 2026-08-06, and it inverts what this flag and I both said. It is neither a credential leak nor a
visible defect today.**
`LoginModal.vue:203` assigns `JSON.stringify(response)` to `errorMessage` on the success path — but
`AdminUserService.Login` (`plugins/admin-core-services.js:50-54`) **collapses the User to a boolean first**, so
the assigned string is `"true"`. And **nobody was ever shown it**: `user.token` hides the form once
`SetCurrentUser` lands, and all 15 mount sites unmount the modal on the close the success path emits. Confirmed
in a real browser with the defect compiled and served.
**What is real is that every guard lives outside this component.** The token exists one layer down — core
`UserService.Login` resolves `token` among nine keys — and **`LoginAdmin`, in that same adapter file, already
returns the user object.** So the line sits **one call-site edit** from serializing a 36500-day non-revocable
token into an error box. That is why the fix removes the assignment outright rather than making it safer.
**The naive fix was a trap, which is the transferable part.** `login()` carried **no `errorMessage` reset**, so
the defective line was the only thing clearing a stale *"Feil kode"* before a success. Deleting it alone
reintroduces the mirror defect a sibling lane found by mutation. The reset moved to the top of the method,
matching `getCode` directly above it.
*(I reported this to the owner as a live credential in the DOM on every sign-in. That was wrong in both
directions — the value is `"true"`, and the box never paints.)*


===== F-MARGIN-CSV-TIMESTAMP-IS-TWO-HOURS-EARLY  [Warn]
TITLE: the export converts Oslo time to UTC twice
plan.md loc: plan.md:32616
QUOTED TOKENS (occurrence counts at the tips):
  calculationTimestampUtc                        fe=9    be=0    ['test/margin-statements-page.test.js']
BODY:
- clears when: the statement CSV and its JSON carry the same calculation timestamp
- owner: @sven

The statement CSV export writes `calculationTimestampUtc` **two hours early** — Oslo wall-clock converted to
UTC a second time. **The JSON is correct**, so the two artifacts for one statement disagree about when it was
calculated.
Small, and it is on a **bokføring**-adjacent export where a timestamp is part of what the document asserts.


===== F-MARGIN-MODEL-DRIFTS-FROM-ITS-CHAIN  [Warn]
TITLE: a lineage test reds on drift nobody's diff contains
plan.md loc: plan.md:30805
BODY:
- clears when: the margin wave's model matches its migration chain with no pending changes, or the drift is traced to the commit that introduced it and recorded
- owner: @sven

**Found by a lane whose own diff cannot contain it.** The SQL tier reds on the margin wave's lineage
assertion — *no pending model changes* — and the lane that hit it carries **no entity, no model-building
change and no migration**. It is **C2-shaped drift**, and it was **unrecorded anywhere in this plan** until
now.
**It could not be confirmed against the base, and that is the honest state.** Doing so needs the SQL fixture,
and the lane had no slot; it said so rather than measuring it another way and calling it the same thing.
**C2 is why this matters more than a red count.** The chain is the truth and the model is not — a model that
has drifted ahead of its chain replays in an order nobody tested, and the failure surfaces on a fresh database
and never on the author's. **This estate has already been bitten twice by exactly that**, once by a chain that
cannot replay from empty and once by an index that exists in every model-built test database and in no
migration.


===== F-MARGIN-PRODUCT-LINKS-DEMAND-AN-UNDOCUMENTED-IF-MATCH  [Warn]
TITLE: the product-links route demands If-Match carrying the recipe revision and nothing says so
plan.md loc: plan.md:33203
BODY:
- clears when: a caller can discover the required If-Match from the route's own refusal or its contract, shown by a request that is refused with the revision it wanted
- owner: @sven


===== F-MARGIN-SETUP-DAY-RECONCILES-TO-ZERO  [Blocker]
TITLE: effective dates are compared against midnight, not the sale
plan.md loc: plan.md:32589
FILE REFS (resolved at the tips):
  MarginStatementSupport.cs                                  be-suffix :126
  MarginStatementService.cs                                  be-suffix :423
QUOTED TOKENS (occurrence counts at the tips):
  MarginPeriodSalesAnalyzer                      fe=0    be=4    ['WebApi.Tests/Margin/MarginPriceImpactRankingTests.cs']
  fact.BusinessDate                              fe=0    be=5    ['WebApi.Tests/Margin/MarginDayRevenueReadTests.cs']
  00:00:00                                       fe=79   be=41   ['test/workforce-roles-page.test.js']
  effectiveFrom                                  fe=46   be=37   ['test/workforce-roles-page.test.js']
  BusinessDate.AddDays(1)                        fe=0    be=2    ['WebApi.Tests/Margin/MarginSetupDayResolutionTests.cs']
  MarginStatementSupport.cs:126                  fe=0    be=1    ['.lane/L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY.md']
  MarginStatementService.cs:423                  fe=0    be=0    []
  :507                                           fe=0    be=2    ['docs/plans/replan/b-meals-completeness.md']
BODY:
- clears when: a store that sets Margin up and sells the same day gets a theoretical cost, shown by a statement whose theoretical percentage is non-zero on the setup day
- owner: @sven

**A venue that switches Margin on and trades the same day sees theoretical 0,0 % beside a real actual — the
module's own anti-pattern, produced by the module itself.**
`MarginPeriodSalesAnalyzer` resolves product links, recipe versions and prices at `fact.BusinessDate`, which is
a calendar date stored at **`00:00:00`**. Anything created *during* the trading day fails
`EffectiveFrom <= instant` against that day's own sales.
**Three consequences, and only one is escapable through the product:**
- **Links** can be backdated via the DTO's `effectiveFrom` — a field **the UI deliberately never sends**.
  Doing so took coverage from **0 % to 93,41 %**, so the operator's own screen cannot perform the repair.
- **Recipe versions cannot be backdated at all over HTTP.** An Active version cannot be re-activated and a new
  draft cannot be backdated under the incumbent. The only escape is creating brand-new recipes.
- **Imported prices** supersede forward only — harmless here, since earlier manual prices are in force at
  midnight.
**It corrects itself the next day**, which is what makes it dangerous: the one day a venue is most likely to be
looking at the module is the one day it lies, and by the time anyone investigates it has healed.
**Fix named, not made**: resolve at end-of-business-day (`BusinessDate.AddDays(1)`, exclusive) at
`MarginStatementSupport.cs:126` and `MarginStatementService.cs:423`/`:507`.


===== F-MARGIN-TELLS-CALLERS-TO-READ-AN-ETAG-IT-DOES-NOT-EMIT  [Warn]
TITLE: the shared revision-required detail names an ETag header that Margin emits on only one resource
plan.md loc: plan.md:33328
BODY:
- clears when: every Margin resource whose write demands If-Match emits the token it wants as an ETag, or the shared detail stops naming a header that is absent
- owner: @sven


===== F-MARGIN-WASTE-PANEL-CALLS-NOTHING  [Blocker]
TITLE: four client routes with no backend handler at all
plan.md loc: plan.md:31797
FILE REFS (resolved at the tips):
  utils/margin/waste-client.js                               fe-exact :62
QUOTED TOKENS (occurrence counts at the tips):
  utils/margin/waste-client.js:62-89             fe=0    be=0    []
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  MarginCoverageResponse                         fe=4    be=7    ['test/e2e/journeys/margin-waste-absent.spec.js']
BODY:
- clears when: every route the waste client calls has a handler on the shipped branch, or the panel stops offering a capability the server does not have
- cleared by: L-MARGIN-WASTE-SURFACE-IS-HONEST
- owner: @sven

**Found by deriving the UI guide.** `utils/margin/waste-client.js:62-89` calls **four** routes that have **zero
backend handlers** at OkamAPI `8e2b57de`. The panel renders as a failed read.
**And the coverage panel fabricates a reassuring answer for the same absence** — it reports *"no waste
recorded"* where the truth is that nothing can record waste, because the backend `MarginCoverageResponse` has
**no waste field at all**. So the one surface that might have exposed the gap instead conceals it.
**This is C3, and it is the sharpest instance yet**: not a service without a controller, but a whole client
built against an API that was never written — in the module otherwise measured as the cleanest in the estate.


===== F-MEALS-ACTOR-WORKLIST-STALE  [Warn]
TITLE: the blocked fix would land three sites of four
plan.md loc: plan.md:23253
BODY:
- clears when: the release-actor worklist names four sites and answers what kind an ordering member is
- owner: @sven

The blocked actor lane enumerated **three** release sites and proposed a kind vocabulary of admin and
system. **The re-quote lane has since added a fourth** — and it is attributable in a way neither actor-less
site is, since it carries an authenticated caller and token possession.
**So the vocabulary has no kind for it.** An ordering member is neither an admin nor a background worker.
Merging the re-quote lane without amending that worklist means **the eventual fix lands three-of-four and
the new site stays silently unaudited** — which is worse than the gap it closes, because the gap will look
closed.


===== F-MEALS-BOARD-SAYS-OFF-OVER-A-LIVE-MODULE  [Warn]
TITLE: Growth's defect, run backwards
plan.md loc: plan.md:31124
BODY:
- clears when: the flag board's answer for Meals matches what its routes actually do, shown by a case where the module is serving and the board agrees
- cleared by: L-GROWTH-EFFECTIVE-RESOLVER
- owner: @sven

**Meals is a fourth shape, and its board lies in the opposite direction to Growth's.** Its master is
declared, and its lever **coalesces rather than ANDs** — so where the lever reaches, it works. **But no
effective resolver exists**, and the platform's own interface documentation says a resolver is required for
exactly this case: a fallback that is configuration rather than the advertised default, **naming Margin as
the precedent.**
**So with the module switched on and no override row, the board reports it off over a module that is
serving.** Growth's board says on over dark; **Meals' says off over live.**
**It is invisible today only because the shipped configuration also reads false** — and it becomes real **the
moment anyone stands up the first live Meals world**, because that environment variable is the only way to
reach the first act at all.
**A lane swept the whole tree rather than the composition root**, after that mistake was made and corrected
here: only two implementations exist estate-wide, and only their two registrations.


===== F-MEALS-CORS-DOUBLE-LAND  [Warn]
TITLE: two commits make the same fix in different places
plan.md loc: plan.md:27041
BODY:
- clears when: only one of the two CORS commits is on the integration branch and the stale test that was written to red is gone
- owner: @sven

Named by the lane that made the second fix, about its own earlier run — which is the useful kind of
self-report.
The blocked first attempt landed a commit that makes the same header fix **inline in the composition
root**, before the shared CORS helper existed. The finished attempt extends the shared helper instead.
**They will conflict**, and taking the wrong side reintroduces the fork the helper exists to prevent.
Land the helper version; drop the inline one. That branch also carries a wire test **deliberately written
to go red until the lever fork was ruled** — the fork is ruled now, so the test is stale and goes with it.
Third instance this week of a hazard invisible inside any single lane, after the receipt-path trap and the
predicate collision. It is why the whole-set read is now standing procedure.


===== F-MEALS-EIGHTH-READ  [Blocker]
TITLE: the fix for seven degenerate reads introduced an eighth
plan.md loc: plan.md:23208
QUOTED TOKENS (occurrence counts at the tips):
  uninvolved-reservation-in-the-world            fe=0    be=0    []
  --no-build                                     fe=5    be=47   ['test/e2e/scripts/growth-guest-exit-world.sh']
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: the pin 9fe599c6 is an ancestor of whatever commit lands Meals on the integration branch, testable by merge-base --is-ancestor against that merge commit
- cleared by: L-MEALS-EIGHTH-READ
- owner: @sven
- blocks: FT-MEALS

**The exact defect shape this cluster exists to kill, reintroduced on the same day.** The re-quote lane's
superseded-release is a **third production decrement site**, and a reviewer walked a clamp mutant through
**all nine of its tests and its browser journey — every one passes.**
The cause is structural, not careless: in every test where the release fires, **the superseded reservation
is the only other hold on the guard row**, so clamp-then-increment lands on exactly the asserted value.
The remedy is named and small: hold **one uninvolved quote** across the supersede so the two diverge, plus
a refusal variant where the re-quote fits from zero but not over that hold.
Seven such reads existed at the base and all seven are now covered. **This is the eighth, and it exists
only in the merged state**, which is why no single lane could have seen it.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `uninvolved-reservation-in-the-world`.**
**Adjacent correction, 2026-08-03, from the release-actor lane: the release-site count and its attribution
were both wrong in my brief.** There are **three** release sites, not two. And the one I called
webhook-driven **has a human**: it runs only for an order-carrying payable, and both such callers enter
from an authenticated controller route. **The genuinely anonymous site is the cart one.** One of three has
a human; two do not.
The lane also hit the `--no-build` staleness trap for real: an incremental build left the assembly **older
than the restored sources**, and a full rebuild was needed before any number could be trusted. That trap
is now confirmed rather than theoretical.
**`clears_when` restated 2026-08-05 to a predicate a machine can test, on the re-scoping ruling.** It read as
a behaviour to demonstrate; the behaviour has since been demonstrated, and what remains is a **merge
condition**. The original wording is preserved in the ruling's record rather than lost.
**Why the predicate is the honest form.** Seven branches carry the re-quote release and **four carry the
pin** — the three without are exactly the plan's landing and proof candidates. The one branch carrying
release, pin and SQL twin together also adds a production retry change, so it is no drop-in; and the SQL twin
is trait-gated, so it never runs in the container-free tier at all.
**


===== F-MEALS-ENROLMENT-HAS-NO-CALLER  [Blocker]
TITLE: the write the whole module depends on is bound by nothing
plan.md loc: plan.md:31743
FILE REFS (resolved at the tips):
  MealsQuoteService.cs                                       be-suffix :164
QUOTED TOKENS (occurrence counts at the tips):
  MealsQuoteService.cs:164-170                   fe=0    be=0    []
BODY:
- clears when: an operator can enrol a member from a screen, shown by a walk that reaches the checkout's company tab without a hand-made request
- cleared by: L-MEALS-ENROLMENT-HAS-A-BUTTON
- owner: @sven

**Found by deriving the UI guide rather than by reading the code**, which is why nothing caught it before.
`POST /v1/meals/programs/{programId}/members` has **no page, no button and no client binding anywhere in this
tree**. And `MealsQuoteService.cs:164-170` **hard-requires** membership — so with no way to enrol, the funded
checkout's **company tab silently never appears**. Not an error, not a refusal: the surface a diner would use
simply is not offered, and nothing says why.
**This is C3 exactly**, and it is the operational reason Meals cannot be walked: everything downstream of
enrolment is unreachable, so 30 built-unverified lanes sit behind a write with no caller.
Two neighbours found in the same pass: programme enrolment (#12), statement draft (#19) and finalize (#20)
have no UI at all, and the **reconciliation queue and resolve**, **company archive**, **membership revoke** and
the member's own `/me` reads are likewise unbound.


===== F-MEALS-FUNDING-AUTHORITY-COLLISION  [Blocker]
TITLE: two lanes change one interface and cannot see each other
plan.md loc: plan.md:27498
BODY:
- clears when: the funding authority carries one agreed shape, with an actor kind that has a correct value for a till operator
- owner: @sven
- blocks: FT-GROWTH

Verified as a four-file overlap on the funding interface, both its implementations and the shared test kit.
One lane makes the actor pair a **required, undefaulted parameter** on both release members. The other adds
a third member for the till, **stamped with a POS operator — for which the actor-kind enum has no correct
value.** They sit on different bases and **neither can see the other.**
So the collision is not a merge conflict to resolve; **it is a design disagreement about what the interface
is**, discovered only by reading across.
**Confirmed by measurement on 2026-08-06, on a merge actually performed rather than reasoned about.** A lane
merged the two branches on a throwaway and found the collision is real **and has an offender neither branch
shows alone**: the tip's till tender stamp names no actor kind, and the vocabulary available **has no correct
value for a till operator.**
**That is the part that makes this a decision rather than a fix.** It is not that a call site forgot to pass
a value — **there is no value to pass.** Adding one is a change to what the system says an actor *is*, which
is why it sits here and not in a lane.
**Nothing was decided by that lane**, and it named the offender without touching it.


===== F-MEALS-LEVER-INERT  [Blocker]
TITLE: the switchboard offers a Meals switch that reaches no guest
plan.md loc: plan.md:22823
QUOTED TOKENS (occurrence counts at the tips):
  meals.module                                   fe=18   be=47   ['test/platform-flag-board.test.js']
  withhold-with-a-reason                         fe=0    be=0    []
  tell-the-truth                                 fe=0    be=0    []
  Content-Disposition                            fe=20   be=8    ['test/workforce-personnel-list-code-register-client.test.js']
BODY:
- clears when: the Meals catalog entry either reaches the consumer path or is withheld from the catalog with a written reason, as Training and Workforce already do for theirs
- cleared by: L-MEALS-LEVER-WITHHOLD
- owner: @sven
- blocks: FT-MEALS

Found by the journey sweep, in the screen that shipped hours earlier. `meals.module` — **the one Meals
lever in the per-store catalog** — is read at three admin routes and **none of them is on the consumer
path.** Flipping it neither enables nor disables a store's quotes or funded checkouts.
So an operator now has a switchboard that shows them a Meals switch, and throwing it does nothing a
guest can see. The real gate is host configuration, which no screen touches.
This is the advertised-but-ungating shape the estate already withheld five Training flags and two
Workforce flags for. Meals' own reach test pins the lever at 4 of 29 routes and is honest about it —
what is new is that there is now a screen presenting the lever as if it worked.
**Ruled 2026-08-03 (Sven): `withhold-with-a-reason`.**
**Corrected 2026-08-03 by the lane sent to close it: the premise was false and the truth is worse.**
The operator surface never reported these flags as effective — the catalog cannot hold a row for them, so
none could exist. What the page actually did: its withheld note told operators that **all** withheld
stages *would have no effect whatever they were set to*.
That is true of Training and Workforce, whose owners state they have no enforcement point. **It is the
opposite of true for Meals**, whose own descriptor says its three are enforced at fifteen production call
sites. **The board was calling an enforced billing flag inert** — and a venue reading it would have
concluded the money path was dark when it was not.
Fixed by naming both kinds separately, plus a disclosure that the Meals money-path flags are deployment
configuration. No catalog entry, no control drawn: the `tell-the-truth` ruling is intact.
**The C3 gap is stated rather than faked:** no endpoint exposes the Meals configuration section, so the
page cannot distinguish *off at deployment* from *off for this store*. It says the deployment shape and
says the value is unknowable from there. Closing it needs a shared platform field.
**And half two was understated.** The content-hash header was the briefed case, but `Content-Disposition`
was unexposed too — and that one is **reachable today**: nine actions return files, two live browser
callers parse it, and both the Margin statement export and the Workforce hours export were taking their
client-side fallback filenam


===== F-MEALS-LEVER-OPAQUE  [Warn]
TITLE: the operator lever reports enabled while 25 of 29 routes stay dark
plan.md loc: plan.md:26184
QUOTED TOKENS (occurrence counts at the tips):
  warn                                           fe=152  be=260  ['.eslintrc.js']
  Features:Meals                                 fe=16   be=39   ['test/platform-flag-board.test.js']
  meals.module                                   fe=18   be=47   ['test/platform-flag-board.test.js']
BODY:
- clears when: the operator surface distinguishes the per-store lever from the host configuration, so a venue switched on through the only admin control cannot read as enabled while most of the module refuses
- owner: @sven

**Reviewed 2026-08-01.** `warn` is defensible only before a pilot. The operator surface does not merely
lack a lever — it reports the module effective while the module is dead, which is the
advertised-but-ungating flag failure this estate has already catalogued. The cheap fix is not building
the lever: have the operator surface read the real gate and render "disabled at deployment". Treat this
as blocker at pilot.
Measured by a derived route-to-gate map: the per-store lever lights exactly four routes — the store
company directory, the two store reconciliation reads, and corridor signing. The other 25 answer only
to the host `Features:Meals` section, and their refusal is a deliberately opaque 404. The operator's own
surface reports `meals.module` effective, which is true and useless. This is the "enabled and nothing
works" presentation, and it is a product gap rather than a test gap.


===== F-MEALS-MONEY-FLAGS-HAVE-NO-LEVER  [Blocker]
TITLE: three of four flags are settable only by restarting the process
plan.md loc: plan.md:31097
BODY:
- clears when: every Meals flag a money path depends on is settable for a store without a restart, or each host-only flag is recorded as deliberate with what an operator does instead
- cleared by: L-LIVE-WALK-MEALS
- owner: @sven
- blocks: L-LIVE-WALK-MEALS

**Three of the four Meals flags are withheld from the operator catalogue by design** — no screen, no
interface, no per-store row, and the store flag endpoint answers a refusal for each. **Every act of the
funded-lunch walk sits on one of them**, and all of them are host configuration.
**The one flag that does have a lever reaches only the venue-scoped surfaces — not one act of the walk.** So
the module cannot be turned on for a store at all: it is turned on for **the process**, by environment
variables on the launch line, three of which are settable no other way.
**That means a venue cannot be given Meals and a venue cannot be taken off it**, and the ordering, projection
and statement paths — all money — have no per-store control whatsoever. The clerk confirmed all four ship
false and that two withholding declarations exist.
**The fixture states this in prose and models it nowhere**, saying in a comment that there is *"no lever a
journey could flip"* — so every green Meals capture was taken against routes that always answer.
**This is a product decision rather than a defect**, which is why it is here: either the money flags get a
lever, or the plan records what an operator is supposed to do instead when one venue wants Meals and another
does not.


===== F-MEALS-NO-SQL-ON-REQUOTE  [Blocker]
TITLE: no SQL tier has run on any re-quote-bearing tree, by anyone
plan.md loc: plan.md:23269
QUOTED TOKENS (occurrence counts at the tips):
  run-it-when-there-is-memory                    fe=0    be=0    []
BODY:
- clears when: a SQL Server tier run exists on a tree carrying the re-quote release, with its trx committed
- cleared by: L-COMPOSE-AND-RUN-THE-STACK
- owner: @sven
- blocks: FT-MEALS

**Settled by the lane that went looking for the misdescribed receipt.** The one artifact cited as covering
the SQL Server classes on the merged state **contains zero of them and ran under eleven seconds** — its
eight-test delta is three ordinary container-free classes.
So the sentence that made anyone believe this was covered was **the only claim otherwise**, and it was
wrong. **No SQL Server tier has run on any tree carrying the re-quote production change, by any lane.**
Not a defect in that change — a gap in what is known about it. **It must not be carried forward as
covered**, which is precisely how it survived this long.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `run-it-when-there-is-memory`.**
**The SQL-tier debt is wider than this flag, measured 2026-08-03.** At least three properties are exercised
**nowhere** because they exist only on SQL Server: the accounting-day unique index whose absence is a live
double-post; the settlement revision guard, which is **inert under SQLite** so two operators overwriting one
money document is untested; and every migration join in a nine-deep stack, where 584 tests were discovered
at the tip and **zero executed.**
Each was found separately by a different lane. **They are one debt with one payment** — a single run at the
merged stack — which is why that run outranks the lanes waiting behind it.


===== F-MEALS-REFUSAL-NAMES-THE-INVITEE  [Warn]
TITLE: a refusal can hand back the person it is protecting
plan.md loc: plan.md:27923
QUOTED TOKENS (occurrence counts at the tips):
  MealsInvitationIntendedContactTests.The_refusa fe=0    be=2    ['.lane/L-A-REFUSAL-STOPS-NAMING-THE-PERSON-IT-PROTECTS-detail.md']
  022c5324f                                      fe=0    be=1    ['.lane/L-A-REFUSAL-STOPS-NAMING-THE-PERSON-IT-PROTECTS-detail.md']
  L-JOURNEY-MEALS                                fe=0    be=1    ['.lane/L-A-REFUSAL-STOPS-NAMING-THE-PERSON-IT-PROTECTS-detail.md']
  "intendedContact":"marit@example.test"         fe=0    be=0    []
BODY:
- clears when: a contact-mismatch refusal carries no invitee identity on the wire, shown by a check that reads the response body rather than the rendered page
- owner: @sven

**Clerk correction appended 2026-08-06, beside the text above and not over it.** The lane sent to close
this **partly falsified the premise**, and the flag should be narrowed rather than cleared as written.
This flag says nothing exists that would notice the withholding clause going away. **Run against the
whole tier, the mutation reds two tests, not none.** The second is
`MealsInvitationIntendedContactTests.The_refusal_does_not_tell_the_holder_which_address_to_go_and_acquire`,
**pre-existing at trunk from `022c5324f`**.
**It is not a substitute, which is why the flag was still worth acting on**: it is at the object tier
rather than the wire, it covers **the email limb only**, and it accepted **any** 403 — so it was one
refusal-ordering change away from vacuous. The lane tightened it to pin the code, and that was its only
edit to an existing file.
**The true statement is narrower than the flag's**: nothing read the wire, and nothing covered the phone
or payroll-reference limbs.
**Proved over HTTP by `L-JOURNEY-MEALS`, not argued from source.** A clean refusal body is clean; with the
withholding clause removed the body carries `"intendedContact":"marit@example.test"` — the email of the
person whose invitation is being refused, handed to whoever asked.
**The reason the walk stays green is the part worth keeping.** The journey step reads **rendered page
text**, and the leak lives in a problem-document extension that **no Vue renders**. So the clause that
withholds the invitee can be deleted and the walk still exits 0. The control has two enforcement points and
the journey watches only the one **a token thief does not need to defeat**.
**The finding under the finding.** The lane's first version of this check reported *no leak* — because the
request it sent was refused at the idempotency guard **before it ever reached the contact test**. The
instrument was measuring a request that never arrived. It caught that itself and rebuilt the check; without
that step this flag would say the opposite.
Left unfixed deliberately: the spec is committed and shared, and the finding lane's boundary is its own
directory. The fix belongs with whoever owns that refusal.


===== F-MEALS-STATEMENT-CLIENT-CLAIMS-A-PAGE-THAT-IS-NOT-HERE  [Warn]
TITLE: a client header names an unmerged component
plan.md loc: plan.md:31764
FILE REFS (resolved at the tips):
  /statement-client.js                                       fe-basename
  MealsMonthClose.vue                                        ABSENT
QUOTED TOKENS (occurrence counts at the tips):
  utils/…/statement-client.js                    fe=0    be=0    []
  MealsMonthClose.vue                            fe=5    be=0    ['test/e2e/fixture/meals.js']
  RF-1313                                        fe=1    be=5    ['lanes/L-ESCPOS-COMPANYACCOUNT-LABEL/finding.md']
BODY:
- clears when: the statement client's header names only components that exist on the branch it ships on
- owner: @sven

`utils/…/statement-client.js` documents `MealsMonthClose.vue` as its consumer. **That component is on an
unmerged lane**, so a reader following the header looks for a file the branch does not contain, and concludes
the surface exists.
**Small, and the same species as the two large ones this week** — `RF-1313`'s systembeskrivelse asserting
triggers no migration creates, and a receipt citing tests its trx does not hold. A comment is a claim, and this
estate keeps discovering it has shipped claims nothing checks.


===== F-MEALS-SUPERSEDE-BYPASSES-AUTHORITY  [Blocker]
TITLE: one release site is not the authority the attribution guards
plan.md loc: plan.md:27643
BODY:
- clears when: every allowance release goes through the funding authority, or the site that bypasses it carries its own attribution and is named in the census
- cleared by: L-SUPERSEDE-RELEASE-IS-ATTRIBUTED
- owner: @sven
- blocks: FT-GROWTH

Found by construction rather than by review, and it bites **at a merge, not in either branch alone.**
A sibling lane makes the actor pair **required and undefaulted** on the funding authority's release members
— which reads as closing the attribution for releases. **But the supersede release never calls that
authority.** It mutates the tracked entity and issues its own raw statement.
So on merge the attribution lands **three of four**, and **the fourth site stays unaudited while looking
covered** — which is worse than an obvious gap, because the census will report the module as accounted for.
There is **no compile collision**, so nothing will object. It is the same shape as the census floors and the
receipt path: **git catches the harmless half.**


===== F-MEMCACHE-IN-TRYCATCH  [Blocker]
TITLE: an unrelated config failure would delete every rate limiter
plan.md loc: plan.md:23407
QUOTED TOKENS (occurrence counts at the tips):
  already-fixed-pending-merge                    fe=0    be=0    []
  L-CONFIRM-FAMILY-MERGE                         fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
BODY:
- clears when: the memory cache is registered unconditionally, and a test reds if it moves back inside a conditional path
- cleared by: L-CONFIRM-FAMILY-MERGE
- owner: @sven
- blocks: S-PILOT-SAFE

**Correction, 2026-08-02 — the clerk had the failure mode backwards, and an independent review found it.**
It would **not** have been silent. With the cache absent, **a globally registered filter fails construction
on every request** — an application-wide 500 storm, and in development a startup crash. **Loud and
fail-closed, not silent and fail-open.** The defect and the fix are both real; **the story was wrong.**
**And the clerk's list was wrong too:** the operator PIN cool-off **never depended on this cache** — it is
database and Redis backed and would have survived untouched. What did depend on it: the Growth public
limiter, the new e-mail limiter, the Events enquiry limiter, the SMS code caps, the reservation caps and a
metadata service.
The fix is still exactly right, because it is **what makes the catch's own promise of staying online
actually true** — and the check that keeps it there is now specified in its own lane.
Found by a lane whose subject was something else entirely. The in-memory cache was registered **only
inside a try/catch**, after two calls that can throw — so **a failure in an unrelated integration's
configuration would silently delete every in-memory rate limiter in the estate while the API stayed up.**
Not a degraded mode anyone would notice: the service keeps serving, the limiters simply stop existing.
Every throttle the estate relies on — the code-to-contact-point caps, the operator PIN cool-off, and the
new e-mail-channel limits — depends on that one registration.
The lane moved it out of the conditional beside its own work. **The flag stays open until something reds
if it moves back**, because this is precisely the shape that gets re-introduced by a well-meaning tidy.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `already-fixed-pending-merge`.**
**Step one of the blocker re-measure, 2026-08-03: the lane meant to clear this has delivered (`L-CONFIRM-FAMILY-MERGE`).** That is a candidate, not a verdict — it says the work exists, not that the condition holds. **Step two is owed**: prove the green is real rather than vacuous, the way the callback lane did by mutating its suite both ways. Recorded so the audit reads a shortlist rather than forty-seven undifferentiated blockers.


===== F-MERGE-BREAKS-BUILD  [Warn]
TITLE: a clean merge of two green lanes did not compile
plan.md loc: plan.md:7310
FILE REFS (resolved at the tips):
  WebApi.Tests/Meals/MealsPoisonedModuleGraph.cs             be-exact
QUOTED TOKENS (occurrence counts at the tips):
  lane/meals-pos-tender-wire                     fe=0    be=1    ['docs/plans/PENDING-MIGRATIONS-LEDGER.md']
  lane/meals-release                             fe=0    be=2    ['artifacts/tests/README.md']
  CS0535                                         fe=0    be=0    []
  WebApi.Tests/Meals/MealsPoisonedModuleGraph.cs fe=0    be=0    []
  --no-build                                     fe=5    be=47   ['test/e2e/scripts/growth-guest-exit-world.sh']
BODY:
- clears when: every merge lane's receipt records that it built the merge commit before running any tier, so a non-compiling merge is reported rather than measured
- cleared by: L-MEALS-POSREL-LAND
- owner: @sven

**The seventh merge hazard, and the first one found by a lane rather than predicted.** Git merged
`lane/meals-pos-tender-wire` and `lane/meals-release` with **zero conflicts**, and the result did not
compile: `CS0535` at `WebApi.Tests/Meals/MealsPoisonedModuleGraph.cs`.
The release lane introduced a **new test double** against a four-member interface. The pos-tender lane
added a **fifth member** to that interface, against a graph that had no such double. **Textually
disjoint. Both green alone. Neither lane could see it, and no conflict count would have caught it.**
The six hazards this plan already carries are all *semantic* collisions in code that merges and builds.
This one is different in kind: **the merge does not compile at all**, so a lane that runs its tier with
`--no-build`, or that inherits a per-lane green instead of re-running at the merge commit, reports a
green that was never produced.
Both existing merge-brief rules are what caught it — re-run the tier **at the merge commit**, and never
`--no-build`. This flag exists so the rule is carried as a finding rather than as a habit.
The fix belonged in the test double only, with the same body as its four siblings; no production file
was touched. That is the right shape for this hazard: an interface gained a member, so every double of
it owes one.


===== F-MIG-CHAIN-STACKED  [Blocker]
TITLE: a second lane silently carries an unmerged migration as its own tail
plan.md loc: plan.md:22589
FILE REFS (resolved at the tips):
  20260731220005_Workforce_IdentityCodeRegisterIssues.cs     be-suffix
  GrowthAuditWriter.cs                                       be-suffix
QUOTED TOKENS (occurrence counts at the tips):
  lane/wf-w5-timesheet                           fe=3    be=7    ['lanes/L-DI-COLLECTION-SILENT/census.md']
  lane/margin-waste                              fe=3    be=8    ['lanes/L-MARGIN-WASTE-SURFACE-IS-HONEST/evidence.md']
  land-the-stack-in-order                        fe=0    be=0    []
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  20260731220005                                 fe=0    be=5    ['Migrations/20260801084923_Margin_PeriodStatementFinalizedImmutable.cs']
  lane/mig-company-receivable                    fe=0    be=3    ['artifacts/mig7/RUN.md']
  lane/train-w3-schema                           fe=0    be=1    ['artifacts/tests/1de069061c08b8e86755d16a884da72f0aa725ec/RUN.md']
  F-DETACHED-MIGRATIONS                          fe=0    be=3    ['Migrations/20260801174639_Workforce_W5_Timesheets.cs']
  --is-ancestor                                  fe=4    be=7    ['lanes/L-LIVE-WORLD-BANNER/evidence.md']
  --diff-filter=A                                fe=0    be=0    []
  lane/margin-waste-500                          fe=0    be=0    []
  lane/wf-digest-tautology                       fe=0    be=0    []
  lane/wf-timesheet-wire                         fe=0    be=0    []
  lane/review-residuals-rezone                   fe=0    be=0    []
BODY:
- clears when: no branch carries another lane's unmerged migration as its chain tail, or the dependency is recorded where a migration author will see it
- cleared by: L-MIG-STACK-LAND
- owner: @sven
- blocks: S-PILOT-SAFE, L-MRG-PRICE-CORRECTION, L-MEALS-RELEASE-ACTOR

`lane/wf-w5-timesheet` **branched off `lane/margin-waste`'s tip and now carries that lane's unmerged
migration as its own chain tail.** Neither lane's brief says so, and nothing in the repo announces it.
Two consequences, both of the shape C2 exists to prevent. Rework margin-waste and the timesheet lane
breaks with it. And a third author who lands a migration believing the chain tip is the branch tip will
produce two migrations sharing a parent — **the failure that surfaces only on a fresh database and
never on the author's.**
Two further August migrations sit on detached heads, on no branch at all, which is how the picture got
this hard to read.
**Sharper, 2026-08-01:** a lane needing a migration measured the distance and it is **five migrations**,
not two — the feature branch is not an ancestor of the true tip. And the THROW ledger is worse than the
naive read: from that lane's base only 50060 is visible, so **the instinctive next number is 50061, which
Margin already holds.** The highest claimed anywhere is 50073.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `land-the-stack-in-order`.**
**The depth number has now been wrong three times, and the pattern is the finding.** It was carried as
*five*, corrected to *six*, and measured this morning as **seven** — `feature/restaurant-modules` ends at
`20260731220005` and the stack carries seven migrations on top. The branches have diverged both ways: 22
feature-only commits against 24 stack-only.
Each correction came from a lane that **measured with git instead of reading the previous lane's
sentence**, and each time the stale number had already been copied forward into a brief. A depth that is
derivable in one command has been hand-carried three times — which is the same shape as the walk counts
and the anonymous-route count, and the reason the ledger now carries an explicit *re-measure, do not
inherit* warning.
**Wrong a fourth time, measured the same day as the third: it is EIGHT — but see the correction below, because this sentence manufactures a disagreement that does not exist.** `feature/restaurant-modules`
carries 127 migrations; the tip at `lane/mig-company-receivable` carries 135. Verified by listing both
trees rather than by reading either previous sentence.
Five, six, seven, eight — **each


===== F-MIG-LEDGER-THROW-NUMBER-WRONG  [Warn]
TITLE: the ledger names a trigger number that is not the highest
plan.md loc: plan.md:29137
FILE REFS (resolved at the tips):
  docs/plans/PENDING-MIGRATIONS-LEDGER.md                    be-exact :504
QUOTED TOKENS (occurrence counts at the tips):
  docs/plans/PENDING-MIGRATIONS-LEDGER.md:504    fe=0    be=0    []
BODY:
- clears when: the pending-migrations ledger's highest THROW 500nn matches what the integration branch actually contains, or the discrepancy is recorded beside it
- owner: @sven

**MIG-22 in `docs/plans/PENDING-MIGRATIONS-LEDGER.md:504` states the highest `THROW 500nn` in use is 50073.
On the integration branch the highest is 50060.**
**It changes nothing today and that is precisely why it is worth recording.** 50074 is free under either
reading, so the next migration author picks a safe number whichever document they trust. The hazard is that a
ledger consulted **because** it is the authority on scarce numbers is wrong about one, and the next collision
will be found by a failing migration rather than by reading.


===== F-MIG17-WIDTH-HALF-THE-SPEC  [Blocker]
TITLE: a column built at 64 where the spec says 128, on a value that cannot be repaired
plan.md loc: plan.md:29478
QUOTED TOKENS (occurrence counts at the tips):
  20260731215452_Meals_MembershipEmployeeReferen fe=0    be=1    ['Migrations/20260731215452_Meals_MembershipEmployeeReference.Designer.cs']
  nvarchar(64)                                   fe=0    be=27   ['Migrations/20260729091423_Events_NotificationOutbox.Designer.cs']
  nvarchar(128)                                  fe=1    be=32   ['pages/admin/workforce-roles.vue']
BODY:
- clears when: the employee-reference column is the width both ledger copies specify, or the narrower width is ruled acceptable with the truncation risk recorded
- cleared by: L-EMPREF-WIDTH-OR-A-RULING
- owner: @sven

**Found as a rider on the reconciliation, and it outranks the entry it rode in on.** MIG-17 is satisfied by
`20260731215452_Meals_MembershipEmployeeReference`, on the integration branch since 2026-08-01 — but built
**`nvarchar(64)` where both ledger copies specify `nvarchar(128)`.**
**The value is company-supplied and immutable after claim.** So a reference longer than 64 characters is not
truncated-and-fixable; it is **truncated and unrepairable**, and C1 forbids the repair that would otherwise be
reached for.
**Closing MIG-17 as done hides it.** The entry is marked not-built in both copies while the migration is
landed — so the obvious correction is to tick it, and ticking it buries the width. **That is why this is a
separate flag and not a line in the reconciliation.**


===== F-MIG22-CLAIMED-TWICE  [Blocker]
TITLE: one migration number, two lanes, neither able to see the other
plan.md loc: plan.md:29282
QUOTED TOKENS (occurrence counts at the tips):
  Growth_AuditLedger                             fe=0    be=8    ['Migrations/20260806125642_Growth_AuditLedger.cs']
  bd3a840f                                       fe=0    be=2    ['artifacts/tests/24cd4ead5e73dac127fca8de0ab2b56f26c85887/RUN.md']
  Margin_PeriodStatementFinalizedImmutable       fe=0    be=9    ['Migrations/20260801084923_Margin_PeriodStatementFinalizedImmutable.cs']
  d6b0630f                                       fe=0    be=3    ['artifacts/tests/2eeff48f405d09427bd509b0c68686797c64afd6/RUN.md']
  GrowthAuditEvents                              fe=1    be=23   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  lane/margin-finalize-lag                       fe=0    be=3    ['Migrations/20260801084923_Margin_PeriodStatementFinalizedImmutable.cs']
  a6a1174b                                       fe=0    be=2    ['artifacts/tests/baa5e38a17ab188869049a581570eea64c464bae/RUN.md']
  F-MIG-CHAIN-STACKED                            fe=0    be=5    ['Migrations/20260802151208_Workforce_TimesheetAdjustmentOrdinal.cs']
  20260731203011                                 fe=0    be=3    ['Migrations/20260801084923_Margin_PeriodStatementFinalizedImmutable.cs']
  23f6bbeb                                       fe=0    be=6    ['artifacts/tests/README.md']
  20260801102621                                 fe=0    be=4    ['Migrations/20260801102621_Workforce_PublicationReceiptUniqueness.Designer.cs']
  50061                                          fe=0    be=14   ['Migrations/20260801132512_Margin_WasteEntries.cs']
  Up()                                           fe=1    be=8    ['test/reservations-combined-table-conflict.test.js']
  DbSet                                          fe=0    be=24   ['artifacts/tests/24cd4ead5e73dac127fca8de0ab2b56f26c85887/RUN.md']
BODY:
- clears when: each pending migration number is claimed by exactly one branch across both ledger copies, shown by a list derived from the branches rather than read from either copy
- owner: @sven

**MIG-22 is claimed by two different migrations on two different branches.** `Growth_AuditLedger` at
`bd3a840f`, on the integration branch; `Margin_PeriodStatementFinalizedImmutable` at `d6b0630f`, on the stack.
**Neither author could see the other**, because the ledger exists in two copies that diverge by **739 lines**
and each author read the one on their own branch.
**The ledger predicted this failure in its own words** — *"two lanes claiming one MIG number is how this ledger
stops being an index"* — and it happened anyway, across exactly the seam it was warning about. A document that
names its own failure mode and then suffers it is evidence the mechanism is missing, not the warning.
**It also means a figure already reported to Sven is ambiguous.** The `GrowthAuditEvents` finding names MIG-22
as the item that would create that table. It read the integration copy, so its reading is right for that copy —
but *MIG-22* is not a unique reference to anything.
**Off-chain and separate, from the same measurement:** `lane/margin-finalize-lag` at `a6a1174b` carries a
**superseded duplicate of the chain's first link** — same name, same DDL, two different ids. **Landing both
would apply the same schema change twice.**
**The remedy is not a renumbering.** It is that the number is claimed somewhere both authors read, which is the
same gap `F-MIG-CHAIN-STACKED` names one layer up, and the two should be closed together.
**Measured properly, 2026-08-05, and the clerk's characterisation of this flag was wrong in both directions.**
A census of **28 MIG numbers** — derived from 317 backend heads, 33,108 ref-by-file rows and 181 migration
files, run twice with two different parsers that agreed — found **5 collisions, not 1**: MIG-12, 19, 20, 21 and
22.
**MIG-21, not MIG-22, is the only case where two real migration files claim one number.** `a6a1174b` /
`20260731203011` against `23f6bbeb` / `20260801102621`, neither an ancestor of the other. **The two files differ
by an eight-line comment.** Same `CREATE TRIGGER`, same `THROW 50060`/`50061`, and **no `IF OBJECT_ID`
guard** — so landing both does not apply the DDL twice harmlessly. **The second `Up()` fails hard.**
**MIG-22 is migration-versus-reservation.** `bd3a840f` adds 28 files and **no migration at all**; its own commit
message says the slot was held. Under this plan's own definition — a migration file on a branch is a cla


===== F-MIXIN-LABELS-CANNOT-TRANSLATE  [Blocker]
TITLE: three receipt labels no translation can reach in any language
plan.md loc: plan.md:30475
FILE REFS (resolved at the tips):
  plugins/global-mixin.js                                    fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  plugins/global-mixin.js                        fe=41   be=7    ['test/growth-newsletter-page.test.js']
  paymentTypeLabel:82                            fe=0    be=0    []
  deliveryTypeLabel:97                           fe=0    be=0    []
  orderStatusLabel:134                           fe=0    be=0    []
  switch                                         fe=222  be=273  ['nuxt.config.js']
  Ukjent                                         fe=15   be=13   ['test/workforce-pivot-components.test.js']
  Forespurt                                      fe=3    be=1    ['test/order-label-dictionaries.test.js']
BODY:
- clears when: no label rendered on the receipt surface is produced by a switch that never consults the dictionary, shown by a journey that reds when the German string is corrupted
- cleared by: L-MIXIN-LABELS-TRANSLATE
- owner: @sven

**Found unprompted by the lane building the German receipt floor, and it is larger than the defect that lane
was sent for.** `plugins/global-mixin.js` — `paymentTypeLabel:82`, `deliveryTypeLabel:97`,
`orderStatusLabel:134` — are `switch` statements returning **hardcoded Norwegian**, with no `$i` anywhere in
them.
**So no translation can reach them in any language.** This is not a missing key, not a stale key, and not a
fallback: **there is no lookup at all.** Three of the six values on the Swiss receipt read `Ukjent`,
`Hent selv` and `Forespurt` — to a Swiss reader, on a document the product prints as a fiscal artifact.
**It is why the German journey floor cannot help here.** That floor asserts what the dictionary renders; these
three never consult the dictionary, so a floor over them would be asserting Norwegian and calling it correct.
**Distinct from the coverage defect already recorded on the same function.** That one is *ten cases against
seventeen backend members*, and its worst symptom is `Ukjent` for a cash sale. **This one is that even the ten
that match are untranslatable.** Fixing the coverage without fixing the lookup produces seven more Norwegian
strings on a German receipt, not fewer.


===== F-MODULE-MASTERS-ARE-UNDECLARED-AND-INVISIBLE  [Blocker]
TITLE: a module ships dark with no setting saying so
plan.md loc: plan.md:31069
BODY:
- clears when: every module master is declared in configuration with its shipped value, and the flag board cannot render a module's rows while its master is off
- cleared by: L-LIVE-WALK-EVENTS
- owner: @sven

**Two live-walk lanes hit the same shape within an hour, from opposite directions, and neither fixture could
see it.**
**Events: the master key is declared in neither settings file** — the clerk verified the block exists in both
and carries no enabled field — so it defaults false and **a controller-wide filter 404s every route before
any action body runs.** Growth, for contrast, carries an explicit false.
**Growth: the master is declared and false, but no effective resolver is registered**, so the board **reports
the module on after an operator flips it while the surface stays dark.**
**The common defect is that the board and the switch agree with each other and disagree with the product.**
In one case the setting is absent, in the other the resolution is; in both, **an operator has no signal that
anything is wrong**, and every fixture-backed journey stays green because a fixture has no outer master.
**A live capture already passes while arming a flag on a store whose every route is 404** — which is the
clearest statement of the cost: the evidence and the product disagree and nothing compares them.
**Meals is unchecked and may be in the same position.** Two of the six modules were found this way in one
hour, and only because something real answered.


===== F-MRG-EPOCH-CAVEAT  [Warn]
TITLE: a statement rests on an epoch defect nobody has confirmed closed
plan.md loc: plan.md:23826
FILE REFS (resolved at the tips):
  Services/Margin/MarginMenuMarginService.cs                 be-exact
QUOTED TOKENS (occurrence counts at the tips):
  Services/Margin/MarginMenuMarginService.cs     fe=1    be=0    ['utils/margin/menu-margin.js']
  MarginBusinessDateEpochSwitchTests             fe=1    be=4    ['utils/margin/recipe-client.js']
BODY:
- clears when: the journal-epoch defect referenced in MarginMenuMarginService is confirmed resolved, or a pilot statement is shown to be unaffected by it
- owner: @sven

`Services/Margin/MarginMenuMarginService.cs` refers to "an unresolved journal-epoch defect the
fact-based reads rest on", with `MarginBusinessDateEpochSwitchTests` around it. Found while reviewing
the module against its competitors, not by a lane engaged with it. The Margin statement is the artifact
an accountant books from, so its business-date epoch is not a detail — confirm the status before any
statement is shown to a paying venue.


===== F-MRG-FINALIZE-LAG  [Warn]
TITLE: a statement can be frozen while the projector is behind
plan.md loc: plan.md:26150
QUOTED TOKENS (occurrence counts at the tips):
  ac0f2f30                                       fe=0    be=1    ['artifacts/tests/baa5e38a17ab188869049a581570eea64c464bae/RUN.md']
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  F-WF-NOCORRECTION                              fe=0    be=0    []
  docs/plan/**                                   fe=2    be=1    ['lanes/L-THE-GUEST-EXIT-IS-FINISHED/evidence.md']
  v-if                                           fe=300  be=2    ['Claude.md']
BODY:
- clears when: finalize refuses or stamps a caveat when the projector lags, and the lag is visible to a store admin rather than to power users only
- cleared by: L-MEALS-PROJECTION-LAG-VISIBLE
- owner: @sven

**Both clauses are now satisfied in code, and I am not clearing it, for the same reason a statutory
blocker was left open earlier today.**
Clause one — *finalize refuses when the projector lags* — is on the integration branch: `ac0f2f30` is an
ancestor of `8e2b57de`, verified by the lane rather than assumed. Clause two — *the lag is visible to a
store admin* — exists only on `lane/mrg-lag-visible @ b2aa72e`, **not on the frontend tip.**
**A flag cleared on unmerged code asserts a control the branch does not have.** That is the RF-1313 shape
this estate has already shipped once, and the reason `F-WF-NOCORRECTION` is still open beside a finished
correction path. It clears when the branch has it, not before.
**The body of this flag is also stale and contradicts its own condition** — it describes the surface as
computing a floor and freezing it. The lane that built the fix reported that and could not correct it,
because a lane may not edit `docs/plan/**`. That is clerk work and it is mine; I have left the wording
alone rather than rewriting a condition I am about to be judged against, and it should be rewritten by
whoever rules the flag.
**One thing the lane found that the condition does not capture:** the read was **StoreAdmin-scoped all
along**. The lag was never power-user-gated at the controller — the client's own template hid it inside
the same `v-if` as a PowerUser-only rebuild button. **The venue was always entitled to the number and the
surface withheld it.**
The day-revenue seam over the same projector already refuses when behind; the statement seam computes
a floor and freezes it. The lag panel on the statements page renders only for power users, so the
person freezing the week cannot see what they are freezing. The receipt watermark makes an understated
week forensically explicable, not operationally right.


===== F-MRG-INGREDIENT-FACTOR-ZERO  [Warn]
TITLE: a withheld conversion factor renders as a confident zero
plan.md loc: plan.md:27833
FILE REFS (resolved at the tips):
  components/admin/margin/MarginIngredientPanel.vue          fe-exact :146
QUOTED TOKENS (occurrence counts at the tips):
  L-COERCION-WRITE-PATHS                         fe=0    be=0    []
  components/admin/margin/MarginIngredientPanel. fe=0    be=0    []
  conversion.factorToBase                        fe=2    be=0    ['components/admin/margin/MarginIngredientPanel.vue']
  Intl.NumberFormat().format(null)               fe=2    be=0    ['test/margin-waste.test.js']
  ToNumber(null)                                 fe=0    be=0    []
  supersededConversions                          fe=1    be=0    ['components/admin/margin/MarginIngredientPanel.vue']
  detail.conversions                             fe=1    be=0    ['components/admin/margin/MarginIngredientPanel.vue']
  F-COERCION-MAKES-A-ZERO                        fe=0    be=0    []
BODY:
- clears when: the ingredient panel distinguishes a withheld conversion factor from a stated zero, shown by a test that reds when the guard is removed
- cleared by: L-MRG-INGREDIENT-FACTOR-ZERO
- owner: @sven
- blocks: L-MRG-INGREDIENT-FACTOR-ZERO

**Found by `L-COERCION-WRITE-PATHS` outside its own mandate and confirmed independently by its reviewer**,
so it is on the record rather than in a lane's margin notes.
`components/admin/margin/MarginIngredientPanel.vue:146` passes `conversion.factorToBase` to the shared
formatter unguarded. `Intl.NumberFormat().format(null)` is `"0"`, because `ToNumber(null)` is `0` — so a
**withheld** factor prints as **"1 pack = 0 grams"**. The reader cannot tell an unmeasured factor from a
measured zero, and the confident form is the more misleading of the two.
`supersededConversions` reads `detail.conversions` straight off the wire with no read model, so nothing
between the response and the screen can supply the distinction.
**A new instance of the recorded `F-COERCION-MAKES-A-ZERO` family**, and it is registered here because the
finding lane's mandate was write-side: render-side sites were classification-only for it. An unregistered
confirmed finding is the census hazard this program keeps removing from other documents.


===== F-MRG-ONBOARD-16  [Warn]
TITLE: a venue types its own ingredient library
plan.md loc: plan.md:26323
BODY:
- clears when: either the approved curation is served, or a venue's own invoice lines seed the library in a captured journey
- cleared by: L-MRG-STARTER-150
- owner: @sven

Sixteen starter items against roughly a hundred and fifty specified, while every competitor demos
photographing an invoice. The module's spec names onboarding as its own kill risk.


===== F-MRG-STATEMENT-UNATTRIBUTED  [Blocker]
TITLE: the weekly figure an accountant books from names nobody
plan.md loc: plan.md:23673
QUOTED TOKENS (occurrence counts at the tips):
  resolve-and-record-the-actor                   fe=0    be=0    []
BODY:
- clears when: a margin statement and its spend entries name the actor that produced them
- cleared by: L-GR-DISPATCH-ACTOR
- owner: @sven
- blocks: FT-MARGIN

Found by the repricing lane, **outside its own subject**, and it is the same shape as the unattributed
mass send — on a money surface.
**The statement and its spend entries carry no actor column, and the controller resolves no user on any
action.** So the weekly figure **an accountant books from has no attributable author.**
C4 says every money-path write names the actor that caused it. This is one, and it is wider than the lane
that found it — which is why it was recorded rather than absorbed.
**Ruled 2026-08-03 (the recommended path, on Sven's instruction to take it for the rest): `resolve-and-record-the-actor`.**


===== F-MRG-WASTE-PANEL-CALLS-NOTHING  [Blocker]
TITLE: an absent feature reads to the venue as a failed read
plan.md loc: plan.md:27662
BODY:
- clears when: the statement waste panel either calls routes the backend publishes, or says the feature is absent rather than reporting a failed read
- cleared by: L-MRG-WASTE-PANEL-SAYS-ABSENT
- owner: @sven
- blocks: FT-GROWTH

Found by the lane that walked the statement week, **outside its own subject and by pressing the screen
rather than reading it.**
The waste panel calls **four routes no backend checkout here publishes** — checked against two that carry
the rest of Margin. And the load **swallows the 404 into "unknown"**, so **an absent feature is presented to
a venue as a read that failed.**
That is the worse of the two possible wrongs: a missing feature invites a question, while a failed read
invites a retry, a support call, and eventually distrust of the numbers beside it on the same screen.


===== F-MRG-YIELD-NOWHERE  [Warn]
TITLE: a curated yield has nowhere to land and would cost nothing
plan.md loc: plan.md:21838
BODY:
- clears when: an ingredient carries a default yield that reaches the recipe lines using it, or the curation stops collecting yields
- owner: @sven

Found by the lane preparing the curation, and it changes what the curation is worth. **A yield factor
exists on exactly one thing in this product — a recipe line — and not on the ingredient.** So a curated
yield cannot follow an ingredient into the recipes that use it, and the field appears **nowhere in the
frontend**: today every recipe line is costed **at no loss whatever the curation says.**
The lane captured and validated yields anyway but **deliberately does not silently cost them**, and says so
in the file to the person filling it in — rather than leaving a column that looks load-bearing and is not.
Making them count needs a default yield on the ingredient — a migration — plus a recipe-line control that
pre-fills from it. Worth knowing **before** an evening is spent authoring 150 of them.


===== F-MY-LIVENESS-CHECK-NEVER-MEASURED-ANYTHING  [Warn]
TITLE: a count that was a hardcoded zero, three times acted on
plan.md loc: plan.md:30892
QUOTED TOKENS (occurrence counts at the tips):
  /dev/null                                      fe=10   be=13   ['test/e2e/scripts/live-world-reset.sh']
  PATH                                           fe=33   be=21   ['env.ts']
BODY:
- clears when: no liveness check in this plan's practice relies on a flag the platform does not support, or each such check is shown returning a true count and a true zero
- owner: @sven

**The clerk told three agents their suite runs were dead. The check behind that claim never ran.**
`pgrep -c` **does not exist on this platform** — the flag is unsupported, pgrep exits with a usage error, the
error was sent to `/dev/null`, and the `|| echo 0` fallback printed **zero every single time.** It was not a
measurement; it was a constant.
**Measured now, side by side at one moment: the broken form prints nothing and exits non-zero, while a
process listing counts eight** — including the very test host and its runner. **The working form is a process
listing filtered by a bracketed pattern.**
**This is the estate's own catalogued failure, committed by the clerk that catalogues it.** *"A shell `||`
fallback indistinguishable from the first branch"* has been on the instrument list for two days and was
briefed to lanes; **it is the shape that produced this.**
**The cost was real even though the outcome survived.** Three reviewers were told to abandon runs on a false
premise; **the third checked, found eight processes alive, and said so plainly rather than accepting the
instruction.** Its verdict is unaffected — it had already re-derived the load-bearing evidence itself — but one
figure in it is now recorded as unverified for a reason that was never true.
**A second lesson underneath the first:** `pgrep -f` on this platform matches a process's **environment
block**, so a pattern naming a directory that appears in `PATH` matches unrelated processes. Even the
supported form answers a different question than the one asked.
**A third instrument error of the same family, same day.** After that lane's session died, the clerk reported
*"no lane branch yet"* — searched for two plausible name fragments, and **the branch was named neither.** It
had existed the whole time. The lane verified on disk rather than trusting the claim, exactly as it had been
told to do for the reverse case, and corrected the record.
**The pattern across all three is one thing: a check whose shape encodes an assumption, reported as a
measurement.** A count flag that does not exist, a reference that silently becomes a history modifier, and a
grep for a naming convention nobody agreed. **None of them failed loudly.**


===== F-NATIVE-ADMIN-CARRIES-THE-SAME-ORE-FLOOR  [Warn]
TITLE: a second admin client, unfixed
plan.md loc: plan.md:32227
FILE REFS (resolved at the tips):
  AdminApp/app/views/pages/DeliveryMethods.vue               ABSENT
  StoresController.cs                                        be-suffix :563
QUOTED TOKENS (occurrence counts at the tips):
  AdminApp/app/views/pages/DeliveryMethods.vue   fe=1    be=0    ['test/delivery-minimum-ore.test.js']
  StoresController.cs:563-570                    fe=0    be=0    []
BODY:
- clears when: the native admin's minimum-order field shows what the column holds, or the plan records that client as out of scope
- owner: @sven

**A reachability census found three admin clients flooring the minimum-order amount, not one.** The third is
the **native** `AdminApp/app/views/pages/DeliveryMethods.vue`, carrying the identical floor.
The web client is fixed. **The native one is not**, so the same invisible-øre display and the same
cannot-remove-an-øre-component behaviour persist there.
**Worth knowing why it can bite at all**: the backend has exactly **one** writer, `StoresController.cs:563-570`,
which assigns the amount straight to the column — **no rounding, no multiple-of-100 rule, no validation** — and
a Bruno request template ships for it. So the value arrives by hand, and the honest fix is a field that shows
what the column holds rather than a constraint pretending it cannot.


===== F-NEEDS-PLACEHOLDER-REFUSES-A-GOOD-RETURN  [Warn]
TITLE: three lanes refused for filling in a field they should omit
plan.md loc: plan.md:28681
FILE REFS (resolved at the tips):
  scripts/drift-demo/demo.sh                                 fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  needs                                          fe=197  be=351  ['playwright.config.js']
  none                                           fe=504  be=534  ['nuxt.config.js']
  (none)                                         fe=15   be=6    ['test/margin-statements-page.test.js']
  F-CONDITIONS-HAVE-NO-RETURN-PATH               fe=0    be=0    []
  F-FAILSPEC-DOES-NOT-HOLD-ITS-LANE              fe=0    be=0    []
  L-FE-WF-INVITE-LIST-REVOKE                     fe=2    be=0    ['lanes/L-FE-WF-INVITE-LIST-REVOKE/evidence.md']
  e8d69fc                                        fe=0    be=0    []
  L-GUARD-DEMO                                   fe=0    be=0    []
  scripts/drift-demo/demo.sh                     fe=2    be=0    ['lanes/L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS/landing-receipt.md']
  lanes/L-GUARD-DEMO/demo-run.txt                fe=0    be=0    []
BODY:
- clears when: a RETURN with no dependencies merges without the author having to know that the needs line must be absent rather than empty
- owner: @sven

**Three lanes in one evening**, each with finished, correct work, each refused on the same line:
`needs: none`, `needs: (none)`, `needs: none`. The clerk reads `needs:` as a list of entity ids and goes
looking for one literally named `none`.
**The cause is the template, not the lanes.** The generated return block shows
`needs: +<ID>   # required for blocked` — so the line is **present** in what every author copies, with a
comment explaining when it is *required* and nothing saying it must be **absent** otherwise. Filling in a
placeholder is the natural reading of a field that is already there.
**The cost is not the refusal, it is where the refusal lands.** Each of these lanes had already finished
its work; the round trip happens at the end, after the expensive part, and reads to the author as though
something substantive was wrong. Two of the three had also just been through a separate refusal for a
`log:` length they had counted correctly.
**The clerk's dispatch note now says to omit the line entirely unless blocked**, which stops the bleeding.
The durable fix is the tool's and is Sven's to rule: either the generated block should omit `needs:` for
non-blocked verdicts, or the parser should treat an empty, `none` or `(none)` value as no dependencies.
**Filed alongside `F-CONDITIONS-HAVE-NO-RETURN-PATH` and `F-FAILSPEC-DOES-NOT-HOLD-ITS-LANE`** — the same
family, where the loop this plan actually runs and the loop the clerk models have drifted apart in a small
way that costs a session each time.
**A fourth instance, and it is the one that settles the argument: `needs: -`, from a lane whose brief
carried an explicit warning about this exact trap.** The dispatch note said, in bold, to omit the line
entirely and not to write `none` or `(none)`. **It still got filled — with a dash.**
**So the prose fix does not work.** A field that is *present* in the template invites a value, and a
warning elsewhere in the brief loses to the shape of the block being copied. Three lanes without the
warning and one with it produced the same defect, which is as close to a controlled result as this program
is going to get.
**That moves the durable fix from "remind people" to "change the artefact".** Either the generated block
omits `needs:` for non-blocked verdicts, or the parser treats an absent, empty, `none`, `(none)` or `-`
value as no dependencies. Both are the tool's, and are Sven's to rule.
**The cost is now measurable*


===== F-NEGATIVE-SALE-REFUNDS-THE-LISTED-PRICE  [Blocker]
TITLE: an unstated discount handed the customer money the shop never took
plan.md loc: plan.md:29378
FILE REFS (resolved at the tips):
  SellScreen.vue                                             fe-suffix :569
  test/check-lineamount-sum.test.js                          fe-exact
  test/receipt-discount-row.test.js                          fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  SellScreen.onNegativeSale                      fe=6    be=1    ['test/check-lineamount-sum.test.js']
  fails                                          fe=135  be=309  ['playwright.config.js']
  null                                           fe=610  be=1670 ['nuxt.config.js']
  refs/lanes/L-CHECK-DISCOUNT-SUM-COUPLED        fe=1    be=0    ['lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED/mutation-log.md']
  c8f26d5                                        fe=3    be=1    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
  feature/restaurant-modules                     fe=34   be=56   ['world.config']
  SellScreen.vue:569                             fe=0    be=0    []
  isDeductionInPlay(g.discountAmount)            fe=3    be=0    ['lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM/refund-vs-sum-probe.js']
  clears_when                                    fe=1    be=0    ['test/e2e/journeys/growth-testsend-refusal.spec.js']
  lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED           fe=6    be=0    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
  7a72c02                                        fe=4    be=0    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
  lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM           fe=6    be=0    ['test/check-lineamount-sum.test.js']
  c32cda3                                        fe=1    be=0    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
  lanes/L-OFFER-PARTIAL-SUBTOTAL                 fe=1    be=0    ['lanes/L-THE-ORPHANED-FIXES-REACH-A-BRANCH/evidence.md']
BODY:
- clears when: no POS return path computes an amount from a listed price where a stated discount exists, shown by a mutation that reds when the discount is ignored
- cleared by: L-CHECK-DISCOUNT-SUM-COUPLED
- owner: @sven

**Found by the lane sent to fix a rendered total, in a third site it was not sent to look at.**
`SellScreen.onNegativeSale` branched on the same `> 0` test, so **an unstated discount built the return at
`unitAmount × quantity` — the listed price.** The customer is handed back money the shop never took.
**Pre-existing, and it was reachable before this week.** A genuine `0` fails `> 0` identically, so the path
existed already; what changed is that `null` now lands there too. **It was fixed and pinned rather than shipped
unexamined**, which is the right call for a money path found in passing.
**This is why the render-versus-write distinction was worth drawing.** A coerced zero on a render misreports a
number. On this path it moved kroner. The lane that first drew that distinction predicted exactly this class and
could not name an instance; here is one.
**Fixed on `refs/lanes/L-CHECK-DISCOUNT-SUM-COUPLED` at `c8f26d5`, not on any shared branch.** The flag stays
open until that lands.
**Measured by the clerk 2026-08-07, beside the above rather than over it: `c8f26d5` IS an ancestor of
`feature/restaurant-modules`.** `git merge-base --is-ancestor c8f26d5 feature/restaurant-modules` succeeds,
and the trunk's `SellScreen.vue:569` carries the `isDeductionInPlay(g.discountAmount)` branch with its
comment naming the listed-price hazard. **The sentence above is stale: it landed.** Whether that satisfies
`clears_when` depends on the mutation existing at the tip, which the clerk did not run — **this note claims
the fix shipped, not that the flag is clear.**
**Three siblings of it did NOT land, and their pins are absent from the trunk entirely**:
`lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED` @ `7a72c02`, `lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM` @ `c32cda3`,
`lanes/L-OFFER-PARTIAL-SUBTOTAL` @ `35e5cdd`. `test/check-lineamount-sum.test.js` and
`test/receipt-discount-row.test.js` do not exist on the trunk, and the string
`pos_negative_sale_unpriceable` — the message the unpriceable-return path renders — is **absent from all
three dictionaries**. `lanes/L-WORLD-STAMP-WINDOWS` @ `997936a` did land (identical at the tip).


===== F-NEWSLETTER-CONTENT-IS-NEVER-PARSED  [Warn]
TITLE: RequireContent checks the content is non-empty and never parses it, so a mangled body stores with a 200
plan.md loc: plan.md:33218
BODY:
- clears when: a newsletter body that is not valid content is refused rather than stored, shown by a request that is refused and one that succeeds
- owner: @sven


===== F-NEWSLETTER-DISPATCH-DEAD-ON-CHAIN  [Blocker]
TITLE: dispatch fails on every chain-built database and calls it a race
plan.md loc: plan.md:31532
QUOTED TOKENS (occurrence counts at the tips):
  GrowthAuditEvents                              fe=1    be=23   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  L-GROWTHAUDIT-MIGRATION                        fe=0    be=0    []
  L-GROWTH-SQL-CATCH-TYPED                       fe=0    be=0    []
  built-unverified                               fe=9    be=1    ['playwright.config.js']
  lane/growth-sql-catch-typed                    fe=0    be=0    []
  c7912d49                                       fe=0    be=0    []
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  7f8945dc                                       fe=0    be=3    ['lanes/L-BACKEND-PATCHES-ARE-APPLIED/evidence.md']
  GrowthConsentTextService:247                   fe=0    be=0    []
  GrowthConsentTextService.PublishAsync:247      fe=0    be=0    []
BODY:
- clears when: newsletter dispatch succeeds on a database built from the migration chain, and a failure caused by an absent table reports that cause rather than a concurrency outcome
- cleared by: L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE
- owner: @sven

**Measured on 2026-08-06, on the first SQL-tier run at any SHA carrying the integration branch's last five
days.** Six of the twenty-one `GrowthAuditEvents` failures are newsletter dispatch **failing outright on any
chain-built database** — which is every deployed database, since deployments replay the chain rather than the
model.
**And the report is wrong in the direction that costs the most.** A `catch (DbUpdateException)` written for one
specific cause swallows the missing-table exception and reports a **lost race** — a benign, retryable message
for a schema defect that no retry will ever resolve.
**Two separable defects, deliberately kept apart**: the table is `L-GROWTHAUDIT-MIGRATION`, the reporting is
this flag's lane. Landing the table alone makes the misreporting invisible again, and it will mask the next
absent table exactly the same way.
**I dispatched a second lane at a defect that already had one — the fifth double-land this estate has
recorded, and the first one I caused.** `L-GROWTH-SQL-CATCH-TYPED` sits `built-unverified` with the **identical**
production change committed at `lane/growth-sql-catch-typed` @ `c7912d49`, unpushed, reaching neither
`8e2b57de` nor the composed stack `7f8945dc`. The two were derived independently and converged on the same
one-hunk filter, which is corroboration rather than waste — but **only one may land.**
**Prefer `c7912d49`**: it also narrows `GrowthConsentTextService:247`, which this flag's exit excludes. **Take
one thing from the newer lane** — its dispatch arm is fabrication-free, where `c7912d49`'s dispatch proof
raises a *constructed* `SqlException 208` and its own docstring names that gap.
**This flag half-clears on the reporting conjunct only.** Dispatch still fails on any chain-built database until
the migration lands, so those SQL reds stay red — but they now name the absent table instead of reporting a
lost race.
**A second untyped catch of the same shape is unfixed and reported**: `GrowthConsentTextService.PublishAsync:247`
answers an absent table with `409 growth.consent_text_version_race` — a retry that can never succeed.


===== F-NO-E2E-PIN-EXISTS-FOR-TWO-PUBLICATIONS-TO-ONE-WORKER  [Warn]
TITLE: the defect that re-targeted an acknowledgement has no end-to-end pin
plan.md loc: plan.md:33388
BODY:
- clears when: a journey publishes two weeks to one worker and asserts each confirmation lands on its own publication
- owner: @sven


===== F-NO-LANE-CAN-BE-DISPATCHED-UNTIL-THE-AGENT-CEILING-IS-RAISED  [Blocker]
TITLE: the session has spawned its 1000-agent maximum, so the clerk can author lanes but not staff them
plan.md loc: plan.md:33393
BODY:
- clears when: a lane dispatched by plan tick reaches a running agent, shown by a RETURN merged after this flag was raised
- owner: @sven


===== F-NO-LEVER-LANDED-TODAY-CAN-BE-WALKED-AGAINST-THE-LIVE-BUILD  [Blocker]
TITLE: the live API is 47 commits behind trunk, so today's levers and fixes cannot be shown to a person against it
plan.md loc: plan.md:33333
BODY:
- clears when: the API serving the live world is built from a trunk tip containing the landed levers, and one of them is walked in a browser
- owner: @sven


===== F-NODE-LANES-RUN-SUITE-SIZED-WORK  [Warn]
TITLE: node-class lanes run full dotnet tiers, so the class caps understate the real host cost
plan.md loc: plan.md:33143
BODY:
- clears when: a lane that runs a full test tier is counted against a cap that reflects its cost, or the node cap is set from measured load rather than lane count
- owner: @sven


===== F-NORWEGIAN-ONLY-KEYS-RENDER-NORWEGIAN-TO-EVERYONE  [Warn]
TITLE: the baseline already degrades silently
plan.md loc: plan.md:29900
FILE REFS (resolved at the tips):
  no.ts                                                      fe-suffix
  en.ts                                                      fe-suffix
  de.ts                                                      fe-suffix
QUOTED TOKENS (occurrence counts at the tips):
  no.ts                                          fe=8    be=6    ['test/events-surface.test.js']
  en.ts                                          fe=2    be=9    ['lanes/L-FE-WF-INVITE-LIST-REVOKE/evidence.md']
  de.ts                                          fe=3    be=5    ['test/e2e/journeys/modal-estate-scroll-lock.spec.js']
BODY:
- clears when: every key present in no.ts exists in en.ts and de.ts, or each Norwegian-only key is recorded as deliberate
- cleared by: L-NORWEGIAN-ONLY-KEYS-TRANSLATE
- owner: @sven

**Measured on the branch, not on a lane: `no.ts` holds 35 more keys than `en.ts` and `de.ts`.** The clerk
counted independently — 4816 against 4781 and 4781. **No branch makes a partial addition; the tip does.**
**Twenty of the thirty-five are VAT-facing**, including one warning that a rate change re-prices future sales.
**So an English- or German-speaking operator reads Norwegian at those points** — the resolver chain runs
`no → en → de`, and a key missing from the later locales resolves back to the first.
**This corrects a claim the clerk put in a brief.** A sibling measured the opposite direction — removing a
Norwegian string surfaced **the English sentence** to a Norwegian request — and the clerk generalised that into
a rule. **Both observations are real and they are different cases:** a missing `no` key falls forward, a missing
`en` or `de` key falls back to Norwegian. **The rule was the error, not either measurement.**


===== F-NOTHING-RUNS-A-SUITE-IN-CI  [Blocker]
TITLE: every gate in this plan is one somebody chooses to run
plan.md loc: plan.md:30674
BODY:
- clears when: a workflow runs the frontend suite on a change and can be shown failing on a planted defect, or the plan records that suites are deliberately local-only
- cleared by: L-CI-RUNS-THE-FAST-TIER
- owner: @sven

**Established by a lane that refused to wire a CI step it could not show firing.** The frontend workflow runs
a static export and nothing else: **no suite runs in CI at all.**
**This is the load-bearing fact behind a whole family of findings and it has never been written down.** Every
guard this program has built this week — the append-only prover, the Vue 3 shape sweep, the German journey
floor, the translation ratchet, the lint gate — **protects a run somebody chooses to make.** Each was
carefully proven to red on a planted defect, and each reds only if invoked.
**It also explains why the estate keeps shipping controls that gate nothing.** A rule set with no runner, a
prover in no gate, a divergence comparison in no suite, hooks stamped from a different repository: these are
not four unrelated oversights. **They are what a repository looks like when nothing has ever been forced to
run.**
**The hook path is not the answer here.** The husky v4 hooks live in the shared common git directory, are not
version-controlled, are stamped as installed from **a different repository**, and are shared with 121
worktrees — so wiring them changes behaviour for every checkout at once and leaves no record in this one.
**Stated as a flag rather than a lane because the choice is real.** Suites that take minutes, a host that has
already stalled twice this week, and roughly 130 in-flight worktrees are genuine arguments for keeping this
local. **What is not defensible is leaving it unstated while the plan speaks of gates.**


===== F-NPM-INSTALL-CANNOT-SUCCEED  [Blocker]
TITLE: the dependency install is broken for every worktree at once
plan.md loc: plan.md:30726
QUOTED TOKENS (occurrence counts at the tips):
  node_modules                                   fe=37   be=6    ['nuxt.config.js']
BODY:
- clears when: `npm install` resolves in a scratch clone of this repository, or the plan records the pinned replacement for the unresolvable dependency
- owner: @sven

**Measured while staging a toolchain comparison: `npm install` and `npm ci` fail repository-wide** on an
unresolvable edge-channel dependency — the registry has **no matching version** for the range the manifest
asks for.
**This is worse than the hazard already recorded, and it replaces it.** The standing rule was *do not run
`npm ci`, because `node_modules` is a symlink shared with roughly a hundred worktrees and `npm ci` deletes
it.* That is still true. **But the new fact is that it would not succeed even if it were safe** — so anyone
who runs it does not get a working tree back, and in the shared checkout they take every other worktree down
with them.
**The estate has been running on one surviving `node_modules` for some time without knowing it.** Nothing has
needed a fresh install, so nothing has surfaced this; the lane that found it was staging a package change and
had to do it surgically instead.
**It makes a fresh clone unbuildable**, which is the same class as the pin that cannot be checked out and the
migration chain that cannot replay from empty. **Three separate things in this estate now cannot be
reconstructed from their own source of truth.**


===== F-OFFER-MIXED-CANNOT-SAY-NOT-APPLICABLE  [Warn]
TITLE: a monthly total reads unknown where it should read nothing
plan.md loc: plan.md:28312
QUOTED TOKENS (occurrence counts at the tips):
  enableMonthlyFee                               fe=3    be=0    ['lanes/L-OFFER-PARTIAL-SUBTOTAL/mutation-log.md']
BODY:
- clears when: an offer document can distinguish a line with no monthly fee from a line whose monthly fee is unstated, shown by a mixed offer rendering both correctly
- owner: @sven

**A consequence the fix could not avoid, reported rather than hidden.** With the offer document now
refusing to total what it cannot total, a **mixed** offer's monthly total reads `—`.
**The document cannot tell "not applicable" from "not stated".** A one-time-only product's
`enableMonthlyFee` lives on the **catalogue item** and never reaches the document, so a line that has no
monthly fee by design is indistinguishable from a line whose monthly fee somebody forgot to enter.
**Both readings are wrong in different directions**, which is why this needs a person rather than a
default: showing `—` treats a deliberate absence as a gap, and showing a total would resume the very
behaviour just removed — presenting a partial sum as a whole one.
The upstream fix is outside the lane that found it: either write an explicit `0` for a line with no
monthly fee, or send the catalogue flags alongside the line so the document can tell the two apart.


===== F-ONE-MUTATION-LEDGER-CANNOT-BE-REPRODUCED-VERBATIM  [Warn]
TITLE: one lane's mutation script lived in a dead scratchpad, so its rows reproduce only by reconstruction
plan.md loc: plan.md:33258
FILE REFS (resolved at the tips):
  mutate.py                                                  fe-suffix
BODY:
- clears when: every mutation ledger ships the script that produced it beside the ledger, the way the till lane ships mutate.py
- owner: @sven


===== F-ONE-MUTATION-RUNNER-WOULD-FAIL-SILENTLY-RATHER-THAN-HALT  [Warn]
TITLE: L-THE-TILL-TESTS/mutate.py restores from a buffer but never compares the bytes back
plan.md loc: plan.md:33469
FILE REFS (resolved at the tips):
  test/mutation-runner-restore.test.js                       ABSENT
BODY:
- clears when: every mutation runner in the tree asserts the restored bytes equal the captured original, checked by the sweep arm of test/mutation-runner-restore.test.js
- owner: @sven


===== F-ONGOING-HIDES-A-LIVE-STATUS  [Blocker]
TITLE: an order in transit appears in no column on the live board
plan.md loc: plan.md:31835
FILE REFS (resolved at the tips):
  ongoing.vue                                                fe-suffix :259
  plugins/global-mixin.js                                    fe-exact :140
  orders.vue                                                 fe-suffix :420
QUOTED TOKENS (occurrence counts at the tips):
  ongoing.vue:259-267                            fe=0    be=0    []
  Accepted                                       fe=45   be=282  ['test/growth-newsletter-page.test.js']
  Processing                                     fe=22   be=181  ['test/ongoing-board-covers-every-live-status.test.js']
  ReadyForPickup                                 fe=11   be=9    ['test/ongoing-board-covers-every-live-status.test.js']
  ReadyForDriver                                 fe=11   be=5    ['test/ongoing-board-covers-every-live-status.test.js']
  Served                                         fe=61   be=16   ['artifacts/journeys/workforce-invitation-onboarding.playwright.json']
  DriverPickedUp                                 fe=10   be=5    ['test/ongoing-board-covers-every-live-status.test.js']
  plugins/global-mixin.js:140                    fe=0    be=0    []
  orders.vue:420                                 fe=0    be=0    []
  /orders/ongoing                                fe=6    be=1    ['test/adminpage-redirect-target.test.js']
  this.orders                                    fe=8    be=0    ['test/ongoing-board-covers-every-live-status.test.js']
  OpenCheck                                      fe=20   be=92   ['test/check-discount-sum.test.js']
BODY:
- clears when: every OrderStatus a live order can hold renders in some column of the ongoing board, shown by a test that reds when a status is added without a bucket
- cleared by: L-ONGOING-SHOWS-EVERY-LIVE-ORDER
- owner: @sven

**This is the venue's real operating screen and it can lose an order.** `ongoing.vue:259-267` buckets only
`Accepted`, `Processing`, `ReadyForPickup`, `ReadyForDriver` and `Served`. **`DriverPickedUp` is a live,
labelled status** — `plugins/global-mixin.js:140` renders it *"Sjåføren er på vei"*, and `orders.vue:420`
includes it in the ongoing filter set.
So an order returned by `/orders/ongoing` in that state **is loaded into `this.orders` and rendered in no
column at all**: invisible on the board and un-completable from the screen the venue actually works from.
`OpenCheck` is uncovered the same way.
**The failure mode is silence.** Nothing errors, nothing is empty — the order simply is not there.


===== F-ORE-PADDING-IN-TWO-CLIENTS  [Warn]
TITLE: an operator screen can print four ore as zero
plan.md loc: plan.md:27211
QUOTED TOKENS (occurrence counts at the tips):
  consumer-only                                  fe=0    be=3    ['WebApi.Tests/Events/EventsReadAdapterTests.cs']
BODY:
- clears when: no shipping client widens sub-ten-ore values into a padded zero, or the two operator clients are recorded as deliberately unfixed with the reason
- owner: @sven

Found by the lane that fixed the consumer half under the `consumer-only` ruling, **outside its own scope and
reported rather than quietly fixed.**
The suffix half of the defect genuinely cannot render in the two operator clients — both install an empty
suffix, which is what made consumer-only safe. **But the ore-padding half is still live in both:** values
of one to nine ore widen to two zeroes, so **four ore prints as zero on a screen an operator reads.**
Smaller than the consumer defect and never that lane's exit — but it is a money-display defect now
**knowingly** left in two shipping clients, which is a different thing from an unknown one.
One of them additionally carries **hand-written duplicates of the formatter**, so bumping its shared pin
alone would not fix its own copy.


===== F-OUTBOX-FLAKE-FIXED-TWICE  [Warn]
TITLE: one defect, two fixes, two branches; landing both collides
plan.md loc: plan.md:9293
FILE REFS (resolved at the tips):
  EventsOutboxDeliveryTests.cs                               be-suffix :411
QUOTED TOKENS (occurrence counts at the tips):
  L-ALIASING-NEEDLE-SWEEP                        fe=3    be=0    ['lanes/L-ALIASING-NEEDLE-SWEEP/census.md']
  8e2b57de                                       fe=27   be=9    ['test/payment-type-label.test.js']
  EventsOutboxDeliveryTests.cs:411-412           fe=3    be=0    ['lanes/L-ALIASING-NEEDLE-SWEEP/census.md']
  22/16^3                                        fe=5    be=0    ['lanes/L-ALIASING-NEEDLE-SWEEP/census.md']
BODY:
- clears when: exactly one of the two outbox-aliasing fixes is an ancestor of the integration branch and the other is retired
- cleared by: L-ALIASING-NEEDLE-SWEEP
- owner: @sven

**`L-ALIASING-NEEDLE-SWEEP` swept all 811 test files and found the aliasing defect is still live on the
trunk — and has been fixed twice, independently, in two different ways.**
`lane/ev-outbox-flake @ 59a1d607` and `lane/ev-outbox-guid-substring @ 79f9dd7d` are **neither an ancestor
of `8e2b57de`**, and `EventsOutboxDeliveryTests.cs:411-412` still carries the original assertion. **Land
one, not both** — two fixes to one assertion is a conflict at best and two competing pins at worst.
**The rate is now measured rather than estimated: 1 in 196.0**, from a dynamic program over a real v4
GUID with the version nibble and variant pinned. It **independently reproduces** the earlier
200,000-body sampling of 1 in 197.6 — two methods agreeing is what makes the number usable.
**It also corrected both earlier figures as optimistic**, and named why: `22/16^3` is an **expected count,
not a probability**, and overstates by double-counting overlapping windows.


===== F-OVERBROAD-TEST-FILTER  [Warn]
TITLE: one filter spelling starts a container the other does not
plan.md loc: plan.md:8338
QUOTED TOKENS (occurrence counts at the tips):
  FullyQualifiedName!~SqlServer                  fe=0    be=3    ['artifacts/security/L-VIPPS-LOG-mutation.md']
BODY:
- clears when: no brief, script or receipt in the estate uses FullyQualifiedName!~SqlServer, and every container-free run names the Database!=SqlServer form
- cleared by: L-WF-TIMESHEET-RACE
- owner: @sven

**A lane started a SQL container today. It said so itself, unprompted, and cleaned up:** *"I started a
SQL container by using an over-broad filter. Recording that; it was mine and Testcontainers already
removed it. Switching to the mandated filter."*
Every brief in this program says **`dotnet test --filter "Database!=SqlServer"`, never
`FullyQualifiedName!~SqlServer`**. The two look interchangeable and are not: the name-based form misses
any SQL-tier test whose class name does not contain the string, so those tests run — and a
Testcontainers fixture starts a container.
**The reason this is a flag rather than a note is the host.** The container budget here is roughly two to
three concurrent SQL containers before the VM OOM-kills; five foreign containers have been up for most of
this session, three holding worlds for an acceptance walk. An accidental start is not a tidy-up problem,
it is a lane killing somebody else's pending evidence.
**The behaviour to keep is the lane's, not the mistake's.** It attributed the container to itself,
verified it was gone, and switched — rather than discovering it later in a receipt or leaving a sibling
to find an orphan. That is what the never-touch-a-container-you-did-not-create rule is for: attribution
by name, never by count.


===== F-OVERVIEW-STILL-READS-THE-COLUMN-NOT-THE  [Warn]
TITLE: ROLE
plan.md loc: plan.md:33106
QUOTED TOKENS (occurrence counts at the tips):
  StoresOverviewResponseModel.IsPowerUser        fe=0    be=1    ['lanes/L-POWER-USER-IS-A-FACT-THE-PRODUCT-CAN-SET/evidence.md']
  /admin/overview                                fe=34   be=2    ['test/front-door-pages-resume-after-login.test.js']
  false                                          fe=619  be=938  ['nuxt.config.js']
  PowerUserBypassMechanismTests                  fe=1    be=3    ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  DinteroController.GetBalance                   fe=0    be=2    ['WebApi.Tests/Authorization/PowerUserBypassMechanismTests.cs']
BODY:
- clears when: StoresOverviewResponseModel.IsPowerUser is projected from role membership like the login and user payloads, or the five column-gated sites behind decision T-13 are ruled together
- owner: @sven

**A residual the lane recorded rather than quietly widening, and it was right not to.**
`StoresOverviewResponseModel.IsPowerUser` still copies the **column**, so `/admin/overview` reports
`false` to a genuine power user even after login and `GET /user` are fixed to read the role.
**It sits behind a standing ruling and that is why it was left.** The lane found decision **T-13**
recorded in `PowerUserBypassMechanismTests`, covering five other sites that gate on the column. It moved
all five onto the role, then **reverted all five** — because those five are **authorization rather than
reporting**, and the guard itself calls that swap *"a widening wearing a refactor's clothes"*.
`DinteroController.GetBalance` is the money-path read T-13 names.
**So this is one flag standing in for a family**, and ruling it in isolation would answer the smallest
member of it.


===== F-OVERVIEW-STILL-READS-THE-COLUMN-NOT-THE-ROLE  [Warn]
TITLE: the overview payload still copies the IsPowerUser column instead of the role
plan.md loc: plan.md:33123
BODY:
- clears when: StoresOverviewResponseModel.IsPowerUser is projected from role membership, or the five column-gated sites behind decision T-13 are ruled together
- owner: @sven


===== F-OWNERS-CHECKOUT-HOLDS-UNOWNED-WORK  [Blocker]
TITLE: a fix exists only in a working tree and a checkout would erase it
plan.md loc: plan.md:32630
FILE REFS (resolved at the tips):
  MarginCoveragePanel.vue                                    fe-suffix
  margin-recipes.vue                                         fe-suffix
  utils/margin/money.js                                      fe-exact
QUOTED TOKENS (occurrence counts at the tips):
  L-MRG-COVERAGE-UNKNOWN                         fe=2    be=0    ['lanes/L-MARGIN-WASTE-SURFACE-IS-HONEST/evidence.md']
  MarginCoveragePanel.vue                        fe=6    be=0    ['test/margin-statement-components.test.js']
  margin-recipes.vue                             fe=6    be=0    ['test/margin-recipes-page.test.js']
  utils/margin/money.js                          fe=5    be=0    ['test/workforce-rates-attendance.test.js']
  F-SHIPPED-BRANCH-IS-NOT-WHAT-THE-CHECKOUT-SHOW fe=0    be=0    []
BODY:
- clears when: no fix exists only as an uncommitted change in the owner's checkout, shown by a clean status or by each change being carried on a branch
- owner: @sven

**Measured 2026-08-06 in the checkout the owner is using.** `L-MRG-COVERAGE-UNKNOWN`'s edits exist **in the
working tree only** — `MarginCoveragePanel.vue`, `margin-recipes.vue`, `utils/margin/money.js` and three test
files are modified, and **HEAD carries none of them.**
**A `git checkout` or `git clean` discards them silently.** Nobody owns them, no branch holds them, and the
lane that made them has returned.
**It has already produced two contradictory measurements of the same subject.** The Margin demo plan read the
**dirty tree** and concluded the coverage panel was already honest; the lane brief read the **branch** and
found the fabrication. **Both were right about the tree they read**, and neither could tell that the other was
reading something different.
This is `F-SHIPPED-BRANCH-IS-NOT-WHAT-THE-CHECKOUT-SHOWS` with a name and a specific casualty.


===== F-PARTNER-FEED-DROPS-IMAGELESS-CATEGORIES  [Warn]
TITLE: TOO
plan.md loc: plan.md:33009
FILE REFS (resolved at the tips):
  ExternalMenuService.cs                                     be-suffix :137
QUOTED TOKENS (occurrence counts at the tips):
  ExternalMenuService.cs:137-140                 fe=0    be=0    []
  ImageSource                                    fe=0    be=145  ['Migrations/20260715090000_AddOperatorSessionPinVerified.Designer.cs']
  D-CATEGORY-IMAGE-CLIENT-GATE                   fe=0    be=0    []
BODY:
- clears when: ExternalMenuService.cs:137-140 either stops dropping image-less categories, or the partner-feed contract is recorded as deliberately image-required with the reason
- owner: @sven

**A second, independent copy of the same drop**, found by the lane that proved the consumer guards.
`ExternalMenuService.cs:137-140` filters image-less categories on the **API-key partner feed**, with an
extra `ImageSource` null test the consumer path does not have.
**It is a published contract, which is what makes it a separate question** rather than part of the
consumer fix: partners have integrated against the current shape, and changing what a paying integrator
receives is not the same decision as fixing our own shop. `D-CATEGORY-IMAGE-CLIENT-GATE` does not cover
it and should not be stretched to.


===== F-PARTNER-FEED-DROPS-IMAGELESS-CATEGORIES-TOO  [Warn]
TITLE: the partner feed drops image-less categories too, under its own published contract
plan.md loc: plan.md:33022
FILE REFS (resolved at the tips):
  ExternalMenuService.cs                                     be-suffix :137
BODY:
- clears when: ExternalMenuService.cs:137-140 stops dropping image-less categories, or the partner-feed contract is recorded as deliberately image-required with the reason
- owner: @sven


===== F-PENDING-MODEL-CHECK-HAS-A-BLIND-SPOT  [Warn]
TITLE: it diffs the snapshot, not the migration operations
plan.md loc: plan.md:32353
QUOTED TOKENS (occurrence counts at the tips):
  HasPendingModelChanges()                       fe=1    be=26   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
  ApplicationDbContextModelSnapshot              fe=0    be=15   ['CLAUDE.md']
  AccountingSummaries                            fe=1    be=85   ['lanes/L-CENSUS-CORRECTIONS/recheck-needles-rows.json']
BODY:
- clears when: a check compares the model against what the migrations actually do, or the plan records that the introduction-time tripwire is accepted as the whole guard
- owner: @sven

**Correction to my own brief, measured by the lane I sent.** I claimed
`HasPendingModelChanges()` would have caught both of this week's live defects. **It would have caught one.**
**It diffs the model against `ApplicationDbContextModelSnapshot` — never against the migrations' operations.**
`AccountingSummaries`' unique index **was in the snapshot the whole time**: MIG-7's own migration summary
records that `ef migrations add` arrived with an **empty `Up`**. So the check would have fired on the commit
that introduced the index and **gone silent at the next unrelated snapshot regeneration.**
**It is a tripwire at the moment of introduction, not a chain audit.** That is still worth having — it is
provably free of any database round-trip, ~5 seconds, and it caught live drift the instant it was pointed at
the branch. But it is not the guard I described.
**The instrument with no blind spot is a different one**: compare the model against the migration *operations*.
Named here as an open gap rather than assumed closed.
