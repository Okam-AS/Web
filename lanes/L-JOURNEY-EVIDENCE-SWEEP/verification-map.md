# L-JOURNEY-EVIDENCE-SWEEP - what would verify every built-unverified item

Measured 2026-08-03 against docs/plan/plan.md on feature/restaurant-modules.
Method: the plan tool's own evidence_admissible() called read-only, in-process.
No plan state was written, no `plan verify` was run, no suite was re-run.

built-unverified: 149 (143 Lane + 6 Feature).  verified: 15.  accepted: 0.
(plan.md is live: it moved from 148 to 149 while this sweep ran, as a sibling lane
merged.  Every class below was re-measured after that merge; only B1 changed, 35->36.)

NONE of the 149 verifies against its recorded evidence today.

## Counts by refusal class
    33  A1-EXIT-REWRITE-ONLY
    36  B1-EVIDENCE-TRIM+EXIT
    37  B2-ARTIFACT-ONLY-OUTSIDE-REPO
    16  B3-NO-FILE-ANYWHERE
     1  C2-PROBE-SUITE-KIND
     1  C3-PROBE-EXISTS-EXTRACTOR
     3  C5-PROBE-UNCONF
    22  D-NO-EVIDENCE

  A1  evidence exists and passes guard 1; ONLY the exit-names-the-instrument rule refuses it
  B1  evidence is a sentence with a path to THIS repo buried in it
  B2  the file named exists only in a sibling worktree or in ../OkamAPI-modules
  B3  evidence is branch/commit prose; it names no file that exists anywhere
  C   evidence is a fact: whose probe cannot serve as verification
  D   no evidence recorded at all

## Counts by what the exit: names as an instrument
    24  dir-prefix
    10  fact-only
   109  none
     6  path

  none        the exit names no path and no fact: nothing can EVER verify it (6.1)
  dir-prefix  the exit names only the directory artifacts/journeys/ - see the HOLE section
  fact-only   the exit names a fact: and no path
  path        the exit names a real path

## A1-EXIT-REWRITE-ONLY  (33)

### L-GROWTH-LAND (Lane)  exit-instrument: path
  evidence: ../OkamAPI-modules/artifacts/tests/99855b1d1d35ab35c1c09e072da0fc6d42421e56/RUN.md
  exit    : growth-mail-postmark, growth-privacy-evidence, unsub-oneclick and growth-webhook-auth are ancestors of feature/restaurant-modules AND fact:growth.mail.provider flips, with fact:be.tests ok at the merged tip
  refusal : exit: “growth-mail-postmark, growth-privacy-evidence, unsub-oneclick and growth-webhook-auth are ancestors of feature/restaurant-modules AND fact:growth.mail.provider flips, with fact:be.tests ok at the merged tip” does not name ../OkamAPI-modules/artifacts/tests/99855b1d1d35ab35c1c09e072da0fc6d42421e56/RUN.md
  needs   : exit must name ../OkamAPI-modules/artifacts/tests/99855b1d1d35ab35c1c09e072da0fc6d42421e56/RUN.md

### L-MRG-WASTE (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-mrgwaste/artifacts/tests/50b85657/RUN.md
  exit    : a waste entry with a reason code lands in the statement week's coverage read AND the finalize trigger rolls back any post-freeze write to it, on a chain-built database
  refusal : exit: “a waste entry with a reason code lands in the statement week's coverage read AND the finalize trigger rolls back any post-freeze write to it, on a chain-built database” does not name /Users/svendaneel/okam/wt-mrgwaste/artifacts/tests/50b85657/RUN.md
  needs   : exit must name /Users/svendaneel/okam/wt-mrgwaste/artifacts/tests/50b85657/RUN.md

### L-WF-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-WF-REVIEW.md
  exit    : a returned inventory naming, for every step of the Workforce journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it
  refusal : exit: “a returned inventory naming, for every step of the Workforce journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it” does not name docs/plan/reviews/L-WF-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-WF-REVIEW.md

### L-MRG-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-MRG-REVIEW.md
  exit    : a returned inventory naming, for every step of the Margin journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it
  refusal : exit: “a returned inventory naming, for every step of the Margin journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it” does not name docs/plan/reviews/L-MRG-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-MRG-REVIEW.md

### L-EV-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-EV-REVIEW.md
  exit    : a returned inventory naming, for every step of the Events journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it
  refusal : exit: “a returned inventory naming, for every step of the Events journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it” does not name docs/plan/reviews/L-EV-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-EV-REVIEW.md

### L-MEALS-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-MEALS-REVIEW.md
  exit    : a returned inventory naming, for every step of the Meals journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it
  refusal : exit: “a returned inventory naming, for every step of the Meals journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it” does not name docs/plan/reviews/L-MEALS-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-MEALS-REVIEW.md

### L-TRAIN-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-TRAIN-REVIEW.md
  exit    : a returned inventory naming, for every step of the Training journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it
  refusal : exit: “a returned inventory naming, for every step of the Training journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it” does not name docs/plan/reviews/L-TRAIN-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-TRAIN-REVIEW.md

### L-GR-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-GR-REVIEW.md
  exit    : a returned inventory naming, for every step of the Growth journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it
  refusal : exit: “a returned inventory naming, for every step of the Growth journey, the code that serves it and the first step a person cannot complete, each with the file and line that decides it” does not name docs/plan/reviews/L-GR-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-GR-REVIEW.md

### L-MEALS-DEGENERATE-TWO (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/OkamAPI-mealsdegen2/lanes/L-MEALS-DEGENERATE-TWO/evidence.md
  exit    : both release-path guard pins hold a second reservation, proven by a clamp mutation that reds them
  refusal : exit: “both release-path guard pins hold a second reservation, proven by a clamp mutation that reds them” does not name /Users/svendaneel/okam/OkamAPI-mealsdegen2/lanes/L-MEALS-DEGENERATE-TWO/evidence.md
  needs   : exit must name /Users/svendaneel/okam/OkamAPI-mealsdegen2/lanes/L-MEALS-DEGENERATE-TWO/evidence.md

### L-MEALS-REQUOTE-RELEASE (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-mealsrequote/lanes/L-MEALS-REQUOTE-RELEASE/evidence.md
  exit    : the stale-token re-quote journey passes on the smaller allowance it was written for, rather than the doubled one it needs today
  refusal : exit: “the stale-token re-quote journey passes on the smaller allowance it was written for, rather than the doubled one it needs today” does not name /Users/svendaneel/okam/wt-mealsrequote/lanes/L-MEALS-REQUOTE-RELEASE/evidence.md
  needs   : exit must name /Users/svendaneel/okam/wt-mealsrequote/lanes/L-MEALS-REQUOTE-RELEASE/evidence.md

### L-MRG-WASTE-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-MRG-WASTE-REVIEW.md
  exit    : a returned verdict on MIG-23, its trigger and its guard, naming every place the change could be wrong and every claim in its return that the artifacts do not support
  refusal : exit: “a returned verdict on MIG-23, its trigger and its guard, naming every place the change could be wrong and every claim in its return that the artifacts do not support” does not name docs/plan/reviews/L-MRG-WASTE-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-MRG-WASTE-REVIEW.md

### L-PRICE-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-PRICE-REVIEW.md
  exit    : a returned verdict on the absent-amount gate naming every render path that now behaves differently and every place absence can still print as a real amount
  refusal : exit: “a returned verdict on the absent-amount gate naming every render path that now behaves differently and every place absence can still print as a real amount” does not name docs/plan/reviews/L-PRICE-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-PRICE-REVIEW.md

### L-EV-ONBOARD-PRINT-BLEED (Lane)  exit-instrument: none
  evidence: lanes/L-EV-ONBOARD-PRINT-BLEED/evidence.md
  exit    : the run sheet printed from a store still in onboarding carries no notification banner, measured on the produced PDF rather than on screen
  refusal : exit: “the run sheet printed from a store still in onboarding carries no notification banner, measured on the produced PDF rather than on screen” does not name lanes/L-EV-ONBOARD-PRINT-BLEED/evidence.md
  needs   : exit must name lanes/L-EV-ONBOARD-PRINT-BLEED/evidence.md

### L-MRG-WASTE-500 (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-mrgwaste500/artifacts/tests/L-MRG-WASTE-500/RUN.md
  exit    : a waste entry naming a nonexistent or foreign ingredient answers a coded refusal, and a cross-tenant create is pinned
  refusal : exit: “a waste entry naming a nonexistent or foreign ingredient answers a coded refusal, and a cross-tenant create is pinned” does not name /Users/svendaneel/okam/wt-mrgwaste500/artifacts/tests/L-MRG-WASTE-500/RUN.md
  needs   : exit must name /Users/svendaneel/okam/wt-mrgwaste500/artifacts/tests/L-MRG-WASTE-500/RUN.md

### L-UTLKVIT-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-UTLKVIT-REVIEW.md
  exit    : a returned verdict on the delivery receipt, its number series, its marking path and the no-migration claim, naming every place the change could be wrong and every claim the artifacts do not support
  refusal : exit: “a returned verdict on the delivery receipt, its number series, its marking path and the no-migration claim, naming every place the change could be wrong and every claim the artifacts do not support” does not name docs/plan/reviews/L-UTLKVIT-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-UTLKVIT-REVIEW.md

### L-FLAGS-UI-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-FLAGS-UI-REVIEW.md
  exit    : a returned verdict on the flag switchboard naming, for every flag it offers, whether throwing that switch changes anything a person can observe
  refusal : exit: “a returned verdict on the flag switchboard naming, for every flag it offers, whether throwing that switch changes anything a person can observe” does not name docs/plan/reviews/L-FLAGS-UI-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-FLAGS-UI-REVIEW.md

### L-GR-PRIVACY-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-GR-PRIVACY-REVIEW.md
  exit    : a returned verdict on the privacy queue and the deadline, naming every place the statutory claim could be wrong and every claim the artifacts do not support
  refusal : exit: “a returned verdict on the privacy queue and the deadline, naming every place the statutory claim could be wrong and every claim the artifacts do not support” does not name docs/plan/reviews/L-GR-PRIVACY-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-GR-PRIVACY-REVIEW.md

### L-GR-TESTSEND-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-GR-TESTSEND-REVIEW.md
  exit    : a returned verdict on the test-send binding naming every path by which marketing content can still reach an address, and whether the pins can fail
  refusal : exit: “a returned verdict on the test-send binding naming every path by which marketing content can still reach an address, and whether the pins can fail” does not name docs/plan/reviews/L-GR-TESTSEND-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-GR-TESTSEND-REVIEW.md

### L-WF-W5-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-WF-W5-REVIEW.md
  exit    : a returned verdict on the W5 tables, the export seam and MIG-24, naming every place the change could be wrong and every claim the artifacts do not support
  refusal : exit: “a returned verdict on the W5 tables, the export seam and MIG-24, naming every place the change could be wrong and every claim the artifacts do not support” does not name docs/plan/reviews/L-WF-W5-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-WF-W5-REVIEW.md

### L-MEALS-RELEASE-CLUSTER-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-MEALS-RELEASE-CLUSTER-REVIEW.md
  exit    : a returned verdict on the combined state of the Meals release path, naming any pin that a merge of all four lanes would leave unfalsifiable
  refusal : exit: “a returned verdict on the combined state of the Meals release path, naming any pin that a merge of all four lanes would leave unfalsifiable” does not name docs/plan/reviews/L-MEALS-RELEASE-CLUSTER-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-MEALS-RELEASE-CLUSTER-REVIEW.md

### L-GR-CONFIRMED-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-GR-CONFIRMED-REVIEW.md
  exit    : a returned verdict on whether the § 15 path is now closed, naming any remaining route to an address the platform cannot prove belongs to the sender
  refusal : exit: “a returned verdict on whether the § 15 path is now closed, naming any remaining route to an address the platform cannot prove belongs to the sender” does not name docs/plan/reviews/L-GR-CONFIRMED-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-GR-CONFIRMED-REVIEW.md

### L-MEALS-SWEEP-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-MEALS-SWEEP-REVIEW.md
  exit    : a returned verdict on the sweep guard naming every assertion that cannot fail at the tier it runs on, and what the SQL tier would have to show
  refusal : exit: “a returned verdict on the sweep guard naming every assertion that cannot fail at the tier it runs on, and what the SQL tier would have to show” does not name docs/plan/reviews/L-MEALS-SWEEP-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-MEALS-SWEEP-REVIEW.md

### L-FLAGS-RESOLVERS-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-FLAGS-RESOLVERS-REVIEW.md
  exit    : a returned verdict on the three effective-flag resolvers, naming any case where a reported value still disagrees with what the gate would answer
  refusal : exit: “a returned verdict on the three effective-flag resolvers, naming any case where a reported value still disagrees with what the gate would answer” does not name docs/plan/reviews/L-FLAGS-RESOLVERS-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-FLAGS-RESOLVERS-REVIEW.md

### L-EV-INQUIRY-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-EV-INQUIRY-REVIEW.md
  exit    : a returned verdict on the enquiry gate, naming any request that still distinguishes a venue from a non-venue, and any path the gate does not cover
  refusal : exit: “a returned verdict on the enquiry gate, naming any request that still distinguishes a venue from a non-venue, and any path the gate does not cover” does not name docs/plan/reviews/L-EV-INQUIRY-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-EV-INQUIRY-REVIEW.md

### L-FLAGS-EXCUSE-BYFLAG (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/OkamAPI-flagsexcuse/lanes/L-FLAGS-EXCUSE-BYFLAG/mutation-receipt.md
  exit    : deleting any effective-flag resolver registration reds the catalog guard, and every excuse names one flag with a reason that is true
  refusal : exit: “deleting any effective-flag resolver registration reds the catalog guard, and every excuse names one flag with a reason that is true” does not name /Users/svendaneel/okam/OkamAPI-flagsexcuse/lanes/L-FLAGS-EXCUSE-BYFLAG/mutation-receipt.md
  needs   : exit must name /Users/svendaneel/okam/OkamAPI-flagsexcuse/lanes/L-FLAGS-EXCUSE-BYFLAG/mutation-receipt.md

### L-CLIENT-TRAILING-SLASH (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/Web-modules/lanes/L-CLIENT-TRAILING-SLASH/mutation-receipt.md
  exit    : the confirm route is posted in the same shape as its siblings, and a check reds if a route path diverges from the convention
  refusal : exit: “the confirm route is posted in the same shape as its siblings, and a check reds if a route path diverges from the convention” does not name /Users/svendaneel/okam/Web-modules/lanes/L-CLIENT-TRAILING-SLASH/mutation-receipt.md
  needs   : exit must name /Users/svendaneel/okam/Web-modules/lanes/L-CLIENT-TRAILING-SLASH/mutation-receipt.md

### L-LIVE-HARNESS-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-LIVE-HARNESS-REVIEW.md
  exit    : a returned verdict on the live harness and both live journeys, naming every way a live-labelled artifact could still be produced without reaching a live backend
  refusal : exit: “a returned verdict on the live harness and both live journeys, naming every way a live-labelled artifact could still be produced without reaching a live backend” does not name docs/plan/reviews/L-LIVE-HARNESS-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-LIVE-HARNESS-REVIEW.md

### L-GR-RATELIMIT-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-GR-RATELIMIT-REVIEW.md
  exit    : a returned verdict on the rate limits, naming any path to a code or a send that no limiter covers, and whether the cache fix holds
  refusal : exit: “a returned verdict on the rate limits, naming any path to a code or a send that no limiter covers, and whether the cache fix holds” does not name docs/plan/reviews/L-GR-RATELIMIT-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-GR-RATELIMIT-REVIEW.md

### L-CONFIRM-CHAIN-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-CONFIRM-CHAIN-REVIEW.md
  exit    : a returned verdict on the composed state of the confirm and Growth chain, naming any defect that exists only in the merge and any pin the merge would leave unfalsifiable
  refusal : exit: “a returned verdict on the composed state of the confirm and Growth chain, naming any defect that exists only in the merge and any pin the merge would leave unfalsifiable” does not name docs/plan/reviews/L-CONFIRM-CHAIN-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-CONFIRM-CHAIN-REVIEW.md

### L-MONEYPATH-PAIR-REVIEW (Lane)  exit-instrument: none
  evidence: docs/plan/reviews/L-MONEYPATH-PAIR-REVIEW.md
  exit    : a returned verdict on the export-duplicate index and the renderer outage handling, naming any route still unguarded and any claim the artifacts do not support
  refusal : exit: “a returned verdict on the export-duplicate index and the renderer outage handling, naming any route still unguarded and any claim the artifacts do not support” does not name docs/plan/reviews/L-MONEYPATH-PAIR-REVIEW.md
  needs   : exit must name docs/plan/reviews/L-MONEYPATH-PAIR-REVIEW.md

### L-GUARD-W0 (Lane)  exit-instrument: none
  evidence: lanes/L-GUARD-DEMO/demo-run.txt
  exit    : a session started with a sibling checkout on the wrong branch receives the mismatch in its opening context without anyone asking for it, and the same session started with every checkout correct receives no such line — both shown by the recorded hook output
  refusal : exit: “a session started with a sibling checkout on the wrong branch receives the mismatch in its opening context without anyone asking for it, and the same session started with every checkout correct receives no such line — both shown by the recorded hook output” does not name lanes/L-GUARD-DEMO/demo-run.txt
  needs   : exit must name lanes/L-GUARD-DEMO/demo-run.txt

### L-CONFIRM-FAMILY-MERGE (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-confirmfam/artifacts/tests/72cf3e0a34b278514bb6872c8803a52384a80000/RUN.md
  exit    : the five true heads of the confirm family are merged in the reviewed order, the composed tree builds and its fast tier is green at the merge commit, and both base receipts survive under distinct names
  refusal : exit: “the five true heads of the confirm family are merged in the reviewed order, the composed tree builds and its fast tier is green at the merge commit, and both base receipts survive under distinct names” does not name /Users/svendaneel/okam/wt-confirmfam/artifacts/tests/72cf3e0a34b278514bb6872c8803a52384a80000/RUN.md
  needs   : exit must name /Users/svendaneel/okam/wt-confirmfam/artifacts/tests/72cf3e0a34b278514bb6872c8803a52384a80000/RUN.md

### L-BLOCKER-RESTATE (Lane)  exit-instrument: none
  evidence: lanes/L-BLOCKER-RESTATE/verdicts.md
  exit    : each open blocker flag is recorded as still-true, already-fixed, or partly-true-with-the-false-clause-named, each verdict citing the commit or the code that settles it, merged from a RETURN
  refusal : exit: “each open blocker flag is recorded as still-true, already-fixed, or partly-true-with-the-false-clause-named, each verdict citing the commit or the code that settles it, merged from a RETURN” does not name lanes/L-BLOCKER-RESTATE/verdicts.md
  needs   : exit must name lanes/L-BLOCKER-RESTATE/verdicts.md

## B1-EVIDENCE-TRIM+EXIT  (36)

### L-TRAIN-W3-SCHEMA (Lane)  exit-instrument: fact-only
  evidence: artifacts/tests/1da15fb113ae72a8f71ed68ef758bb1a8a30d69b/RUN.md (SQL tier 557/557, fast 4313/0/9) + OkamAPI-modules 3993f797 in detached worktree /Users/svendaneel/okam/wt-trainw3, NOT pushed. fact:train.checklists probes ../OkamAPI-modules and will read present only AFTER this lane is merged; the entities exist only in my worktree.
  exit    : fact:train.checklists is present AND a chain-built database refuses a second run row for one store, template and business date, and refuses DELETE on the deviation events at the trigger, both in a committed trx
  refusal : evidence path does not exist: artifacts/tests/1da15fb113ae72a8f71ed68ef758bb1a8a30d69b/RUN.md (SQL tier 557/557, fast 4313/0/9) + OkamAPI-modules 3993f797 in detached worktree /Users/svendaneel/okam/wt-trainw3, NOT pushed. fact:train.checklists probes ../OkamAPI-modules and will read present only AFTER this lane is merged; the entities exist only in my worktree.
  needs   : trim evidence to ../OkamAPI-modules

### L-WF-OPLINK (Lane)  exit-instrument: dir-prefix
  evidence: artifacts/journeys/wf-operator-import-clock.playwright.json (11/11 steps passed, commit 3e811b2, 0 failed requests, 6 screenshots) in worktree ~/okam/web-wf-oplink, copied to lanes/L-WF-OPLINK/artifacts/journeys/ · branch lane/fe-wf-oplink, commit 3e811b2, not pushed · Jest 98 suites / 2282 tests, 5/5 browser journeys
  exit    : a manager runs the pos-operator-import from the roster and the linked operator clocks in from the POS surface, with the clocked minutes visible on the attendance table, captured under artifacts/journeys/
  refusal : evidence path does not exist: artifacts/journeys/wf-operator-import-clock.playwright.json (11/11 steps passed, commit 3e811b2, 0 failed requests, 6 screenshots) in worktree ~/okam/web-wf-oplink, copied to lanes/L-WF-OPLINK/artifacts/journeys/ · branch lane/fe-wf-oplink, commit 3e811b2, not pushed · Jest 98 suites / 2282 tests, 5/5 browser journeys
  needs   : trim evidence to lanes/L-WF-OPLINK/artifacts/journeys/

### L-STATUTE-HONESTY (Lane)  exit-instrument: dir-prefix
  evidence: Web-modules lane/statute-honesty @ f01886a (worktree ../web-statute) + OkamAPI-modules lane/statute-honesty @ 485959ab (worktree ../OkamAPI-statute); artifacts/journeys/statute-honesty/ incl. the A4 portrait PDF; neither pushed
  exit    : the personalliste sheet and its CSV state that only employees can be registered, and the run-sheet staleness banner names a post-issue dietary statement as its own cause, both captured under artifacts/journeys/
  refusal : evidence path does not exist: Web-modules lane/statute-honesty @ f01886a (worktree ../web-statute) + OkamAPI-modules lane/statute-honesty @ 485959ab (worktree ../OkamAPI-statute); artifacts/journeys/statute-honesty/ incl. the A4 portrait PDF; neither pushed
  needs   : trim evidence to ../web-statute

### L-GROWTH-HEALTH-HONEST (Lane)  exit-instrument: none
  evidence: OkamAPI-modules lane/growth-health-honest @ c11e78a6 (worktree ../wt-growth-health, off feature/restaurant-modules 24dec838); fast tier 4360 passed / 0 failed / 12 skipped, `dotnet test --filter "Database!=SqlServer"`; per-mutation detail at ../wt-growth-health/.lane/L-GROWTH-HEALTH-HONEST-detail.md
  exit    : the delivery health response withholds its bounce and complaint rates when the bound provider cannot ingest delivery events, AND the Postmark client redacts its server-token header, both shown by fast-tier tests
  refusal : evidence path does not exist: OkamAPI-modules lane/growth-health-honest @ c11e78a6 (worktree ../wt-growth-health, off feature/restaurant-modules 24dec838); fast tier 4360 passed / 0 failed / 12 skipped, `dotnet test --filter "Database!=SqlServer"`; per-mutation detail at ../wt-growth-health/.lane/L-GROWTH-HEALTH-HONEST-detail.md
  needs   : trim evidence to ../wt-growth-health

### L-CORE-ORE-LABEL (Lane)  exit-instrument: none
  evidence: lanes/L-CORE-ORE-LABEL/consumerapp-red-run.txt, lanes/L-CORE-ORE-LABEL/consumerapp-revert-red.txt, lanes/L-CORE-ORE-LABEL/consumerapp-green-run.txt, lanes/L-CORE-ORE-LABEL/residual-unfixed-cores.txt, ConsumerApp/checks/price-label-ore.mjs
  exit    : a total carrying øre renders without the no-øre suffix in every client reading the shared price helper, pinned by unit tests over the øre and whole-krone cases
  refusal : evidence path does not exist: lanes/L-CORE-ORE-LABEL/consumerapp-red-run.txt, lanes/L-CORE-ORE-LABEL/consumerapp-revert-red.txt, lanes/L-CORE-ORE-LABEL/consumerapp-green-run.txt, lanes/L-CORE-ORE-LABEL/residual-unfixed-cores.txt, ConsumerApp/checks/price-label-ore.mjs
  needs   : trim evidence to lanes/L-CORE-ORE-LABEL/consumerapp-red-run.txt

### L-REVIEW-RESIDUALS (Lane)  exit-instrument: none
  evidence: OkamAPI-modules lane/review-residuals-provider @ bd765c7d (worktree ../wt-resid-provider, off lane/growth-health-honest c11e78a6) and lane/review-residuals-rezone @ 15a1d0b7 (worktree ../wt-resid-rezone, off lane/wf-export-duplicate 3a4442a7); trx committed at artifacts/tests/3bdef5c6-fast-tier.trx and artifacts/tests/4a9cbb9c-fast-tier.trx; per-guard detail at ../wt-resid-provider/.lane/L-REVIEW-RESIDUALS-provider.md and ../wt-resid-rezone/.lane/L-REVIEW-RESIDUALS-rezone.md
  exit    : the mail-provider declaration pin derives its adapter list by reflection rather than by hand, and the re-zoning guard has a behavioural case per anchor, both shown by fast-tier tests
  refusal : evidence path does not exist: OkamAPI-modules lane/review-residuals-provider @ bd765c7d (worktree ../wt-resid-provider, off lane/growth-health-honest c11e78a6) and lane/review-residuals-rezone @ 15a1d0b7 (worktree ../wt-resid-rezone, off lane/wf-export-duplicate 3a4442a7); trx committed at artifacts/tests/3bdef5c6-fast-tier.trx and artifacts/tests/4a9cbb9c-fast-tier.trx; per-guard detail at ../wt-resid-provider/.lane/L-REVIEW-RESIDUALS-provider.md and ../wt-resid-rezone/.lane/L-REVIEW-RESIDUALS-rezone.md
  needs   : trim evidence to ../wt-resid-provider

### L-EV-STALE-CAUSE (Lane)  exit-instrument: dir-prefix
  evidence: ../web-evstale/artifacts/journeys/events-stale-cause.playwright.json (6/6 steps, 3 PNGs, commit 2bc18da) + ../OkamAPI-modules worktree ../wt-evstale artifacts/lanes/L-EV-STALE-CAUSE/EVIDENCE.md
  exit    : the run-sheet read publishes which of the four staleness causes fired, and only the true one is shown, captured under artifacts/journeys/
  refusal : evidence path does not exist: ../web-evstale/artifacts/journeys/events-stale-cause.playwright.json (6/6 steps, 3 PNGs, commit 2bc18da) + ../OkamAPI-modules worktree ../wt-evstale artifacts/lanes/L-EV-STALE-CAUSE/EVIDENCE.md
  needs   : trim evidence to ../web-evstale/artifacts/journeys/events-stale-cause.playwright.json

### L-MEALS-RELEASE-RACE (Lane)  exit-instrument: none
  evidence: lanes/L-MEALS-RELEASE-RACE/evidence.md — worktree /Users/svendaneel/okam/OkamAPI-meals-race, branch lane/meals-release-race, commit f70a0254 (off feature/restaurant-modules de1e5c5e, local only)
  exit    : a release that loses the optimistic concurrency check returns the canonical outcome rather than an unhandled error, and the two core-facing release paths still unwind what they are supposed to
  refusal : evidence path does not exist: lanes/L-MEALS-RELEASE-RACE/evidence.md — worktree /Users/svendaneel/okam/OkamAPI-meals-race, branch lane/meals-release-race, commit f70a0254 (off feature/restaurant-modules de1e5c5e, local only)
  needs   : trim evidence to lanes/L-MEALS-RELEASE-RACE/evidence.md

### L-DOWNLOAD-HEADERS (Lane)  exit-instrument: none
  evidence: OkamAPI-dlhdr 9207f480 (lane/download-headers, local, not pushed) · WebApi.Tests/Wire/DownloadHeaderWireTests.cs · WebApi.Tests/Wire/MealsDownloadHeaderWireTests.cs · Helpers/BrowserReadableHeaders.cs · lanes/L-DOWNLOAD-HEADERS/red.txt
  exit    : a cross-origin browser client can read the filename and any integrity header on every download endpoint, shown at the wire tier for each
  refusal : evidence path does not exist: OkamAPI-dlhdr 9207f480 (lane/download-headers, local, not pushed) · WebApi.Tests/Wire/DownloadHeaderWireTests.cs · WebApi.Tests/Wire/MealsDownloadHeaderWireTests.cs · Helpers/BrowserReadableHeaders.cs · lanes/L-DOWNLOAD-HEADERS/red.txt
  needs   : trim evidence to lanes/L-DOWNLOAD-HEADERS/red.txt

### L-GROWTH-NEWSLETTER-WIRE (Lane)  exit-instrument: none
  evidence: OkamAPI-modules lane/growth-newsletter-wire @ 87600a1c (worktree ../wt-gr-nlwire, off feature/restaurant-modules de1e5c5e); fast tier 4363 passed / 0 failed / 12 skipped, `dotnet test --filter "Database!=SqlServer"`; per-mutation detail at ../wt-gr-nlwire/.lane/L-GROWTH-NEWSLETTER-WIRE-detail.md
  exit    : create, edit, approve and detail each answer through real routing under an authorization matrix, with a wrong-store admin refused identically to an absent resource
  refusal : evidence path does not exist: OkamAPI-modules lane/growth-newsletter-wire @ 87600a1c (worktree ../wt-gr-nlwire, off feature/restaurant-modules de1e5c5e); fast tier 4363 passed / 0 failed / 12 skipped, `dotnet test --filter "Database!=SqlServer"`; per-mutation detail at ../wt-gr-nlwire/.lane/L-GROWTH-NEWSLETTER-WIRE-detail.md
  needs   : trim evidence to ../wt-gr-nlwire

### L-PRICE-NULL-ZERO (Lane)  exit-instrument: none
  evidence: lanes/L-PRICE-NULL-ZERO/before-after.txt · lanes/L-PRICE-NULL-ZERO/mutation-proof.txt · lanes/L-PRICE-NULL-ZERO/lane-notes.md · test/price-absence.test.js · commit a48fb78 on feature/restaurant-modules, not pushed
  exit    : a null or absent amount renders as unknown rather than as zero, pinned over null, zero and a genuine amount
  refusal : evidence path does not exist: lanes/L-PRICE-NULL-ZERO/before-after.txt · lanes/L-PRICE-NULL-ZERO/mutation-proof.txt · lanes/L-PRICE-NULL-ZERO/lane-notes.md · test/price-absence.test.js · commit a48fb78 on feature/restaurant-modules, not pushed
  needs   : trim evidence to lanes/L-PRICE-NULL-ZERO/before-after.txt

### L-MODAL-BROKEN-TWO (Lane)  exit-instrument: dir-prefix
  evidence: lanes/L-MODAL-BROKEN-TWO/detail.md · artifacts/journeys/admin-single-login-prompt · artifacts/journeys/admin-change-delivery-type · lane/modal-broken-two @ 6348944 (worktree ~/okam/web-modal-two, not pushed)
  exit    : the delivery-type modal renders, and a signed-out visitor to an admin page sees one login prompt, both captured under artifacts/journeys/
  refusal : evidence path does not exist: lanes/L-MODAL-BROKEN-TWO/detail.md · artifacts/journeys/admin-single-login-prompt · artifacts/journeys/admin-change-delivery-type · lane/modal-broken-two @ 6348944 (worktree ~/okam/web-modal-two, not pushed)
  needs   : trim evidence to lanes/L-MODAL-BROKEN-TWO/detail.md

### L-GR-APPROVAL-STATE (Lane)  exit-instrument: none
  evidence: OkamAPI-modules lane/gr-approval-state @ 3ea531f5 (worktree ../wt-gr-approval, off feature/restaurant-modules de1e5c5e, local only); fast tier 4361 passed / 0 failed / 12 skipped; lanes/L-GR-APPROVAL-STATE/{red-1-projection.txt,mutations.txt,fast-tier.txt}
  exit    : the detail read distinguishes never-approved from approval-revoked-by-edit, shown at the wire tier
  refusal : evidence path does not exist: OkamAPI-modules lane/gr-approval-state @ 3ea531f5 (worktree ../wt-gr-approval, off feature/restaurant-modules de1e5c5e, local only); fast tier 4361 passed / 0 failed / 12 skipped; lanes/L-GR-APPROVAL-STATE/{red-1-projection.txt,mutations.txt,fast-tier.txt}
  needs   : trim evidence to ../wt-gr-approval

### L-WF-BOOTSTRAP (Lane)  exit-instrument: path
  evidence: OkamAPI lane/wf-bootstrap @ 9d1719df (worktree ../wt-wfboot, off feature/restaurant-modules 3579bbbc); fast tier 4374 passed / 0 failed / 12 skipped vs BASE 4369 / 0 / 12 from a clean checkout of 3579bbbc, `dotnet test --filter "Database!=SqlServer"`, assembly mtime 11:17:43 > newest source 11:13:16. Web-modules lane/fe-wf-bootstrap @ 9264904 (worktree ../web-wfboot, off 89c2c1f); jest 109 suites / 2469 passed / 1 failed (journey-artifact-store asserts the checkout is named Web-modules; this is a worktree).
  exit    : a wire test proves a fresh store's StoreAdmin obtains a WorkforceManager engagement over HTTP with no SQL, AND Scripts/demo/seed-workforce-demo.sh loses its INSERT INTO WorkforceStaffMembers block in the same change
  refusal : evidence path does not exist: OkamAPI lane/wf-bootstrap @ 9d1719df (worktree ../wt-wfboot, off feature/restaurant-modules 3579bbbc); fast tier 4374 passed / 0 failed / 12 skipped vs BASE 4369 / 0 / 12 from a clean checkout of 3579bbbc, `dotnet test --filter "Database!=SqlServer"`, assembly mtime 11:17:43 > newest source 11:13:16. Web-modules lane/fe-wf-bootstrap @ 9264904 (worktree ../web-wfboot, off 89c2c1f); jest 109 suites / 2469 passed / 1 failed (journey-artifact-store asserts the checkout is named Web-modules; this is a worktree).
  needs   : trim evidence to ../wt-wfboot

### L-EV-VIPPS-FALLBACK (Lane)  exit-instrument: none
  evidence: lane/ev-vipps-fallback-2 @ fc09be1d off feature/restaurant-modules 3579bbbc, worktree ../wt-evvippsfb2, local, unpushed - container-free tier (Database!=SqlServer) 4380 passed / 0 failed / 12 skipped, zero containers started - WebApi.Tests/Events/EventsDepositVippsFallbackTests.cs 11/11
  exit    : a live test-MSN initiate for a deposit returns a redirect and, after approval in Vipps, the guest lands back on the deposit page reading paid
  refusal : evidence path does not exist: lane/ev-vipps-fallback-2 @ fc09be1d off feature/restaurant-modules 3579bbbc, worktree ../wt-evvippsfb2, local, unpushed - container-free tier (Database!=SqlServer) 4380 passed / 0 failed / 12 skipped, zero containers started - WebApi.Tests/Events/EventsDepositVippsFallbackTests.cs 11/11
  needs   : trim evidence to ../wt-evvippsfb2

### L-GR-WITHDRAW-ORIGIN (Lane)  exit-instrument: none
  evidence: lanes/L-GR-WITHDRAW-ORIGIN/RUNS-2.md; OkamAPI lane/gr-withdraw-origin @ e0c2b02f (base lane/growth-prefcentre 2a052800, worktree ~/okam/OkamAPI-grwithdraw); Web-modules lane/fe-gr-withdraw-origin @ 8049332 (base lane/fe-growth-prefcentre 7a8b0d3, worktree ~/okam/web-grwithdraw); neither pushed
  exit    : a browser at the deployed preference-centre URL shows the session cookie attached on the preferences read, answering 200
  refusal : evidence path does not exist: lanes/L-GR-WITHDRAW-ORIGIN/RUNS-2.md; OkamAPI lane/gr-withdraw-origin @ e0c2b02f (base lane/growth-prefcentre 2a052800, worktree ~/okam/OkamAPI-grwithdraw); Web-modules lane/fe-gr-withdraw-origin @ 8049332 (base lane/fe-growth-prefcentre 7a8b0d3, worktree ~/okam/web-grwithdraw); neither pushed
  needs   : trim evidence to lanes/L-GR-WITHDRAW-ORIGIN/RUNS-2.md

### L-GR-POSTMARK-WEBHOOK (Lane)  exit-instrument: none
  evidence: lane/gr-postmark-webhook 5b895dc4 (worktree ../wt-gr-postmark) — Wire/GrowthPostmarkWebhookWireTests 8/8, Growth/GrowthPostmarkEventReaderTests 38/38, Growth non-SQL 544/0, Wire+Modules 377/0
  exit    : a genuine Postmark delivery and bounce payload replayed against the webhook route lands a receipt and moves a delivery to delivered or failed, pinned by a wire test
  refusal : evidence path does not exist: lane/gr-postmark-webhook 5b895dc4 (worktree ../wt-gr-postmark) — Wire/GrowthPostmarkWebhookWireTests 8/8, Growth/GrowthPostmarkEventReaderTests 38/38, Growth non-SQL 544/0, Wire+Modules 377/0
  needs   : trim evidence to ../wt-gr-postmark

### L-TRAIN-EVIDENCE-NAMES-COURSE (Lane)  exit-instrument: none
  evidence: OkamAPI wt-trn-names lane/trn-evidence-names fcb5181a + b560bc3a (artifacts/tests/L-TRAIN-EVIDENCE-NAMES-COURSE/RUN.md, base.trx, after.trx) . Web-modules cff41c8 . artifacts/journeys/training-course-to-evidence.playwright.json (19 steps, passed)
  exit    : every completion row displays the course title and version, pinned by both a component test and a wire test
  refusal : evidence path does not exist: OkamAPI wt-trn-names lane/trn-evidence-names fcb5181a + b560bc3a (artifacts/tests/L-TRAIN-EVIDENCE-NAMES-COURSE/RUN.md, base.trx, after.trx) . Web-modules cff41c8 . artifacts/journeys/training-course-to-evidence.playwright.json (19 steps, passed)
  needs   : trim evidence to artifacts/journeys/training-course-to-evidence.playwright.json

### L-FLAGS-JOURNEY-SWEEP (Lane)  exit-instrument: none
  evidence: lanes/L-FLAGS-JOURNEY-SWEEP/census.md (all 12 journeys) · mutation-{a,b,c-a,c-b}.log · commit bb1bf0c · artifacts/journeys/*.playwright.json 12/12 passed
  exit    : no journey walking a gated surface passes against a fixture that models no flags, proven by a mutation that turns a gate off and reds the journey
  refusal : evidence path does not exist: lanes/L-FLAGS-JOURNEY-SWEEP/census.md (all 12 journeys) · mutation-{a,b,c-a,c-b}.log · commit bb1bf0c · artifacts/journeys/*.playwright.json 12/12 passed
  needs   : trim evidence to lanes/L-FLAGS-JOURNEY-SWEEP/census.md

### L-FLAGS-NOTE-FALSIFIABLE (Lane)  exit-instrument: none
  evidence: 7c9f172 · artifacts/journeys/workforce-flag-lever.playwright.json
  exit    : the reliability note and the catalog size are asserted on content and count, reds if the note is reworded to claim the opposite or the catalog shrinks
  refusal : evidence path does not exist: 7c9f172 · artifacts/journeys/workforce-flag-lever.playwright.json
  needs   : trim evidence to artifacts/journeys/workforce-flag-lever.playwright.json

### L-GR-TESTSEND-ERRORCODE (Lane)  exit-instrument: none
  evidence: lanes/L-GR-TESTSEND-ERRORCODE/DETAIL.md (commit 2a3a881 on feature/restaurant-modules, local)
  exit    : the not-your-address refusal renders its own sentence rather than the generic error, pinned by a test that reds if the mapping is dropped
  refusal : evidence path does not exist: lanes/L-GR-TESTSEND-ERRORCODE/DETAIL.md (commit 2a3a881 on feature/restaurant-modules, local)
  needs   : trim evidence to lanes/L-GR-TESTSEND-ERRORCODE/DETAIL.md

### L-EV-REFUND-FAKE-ARG (Lane)  exit-instrument: none
  evidence: lanes/L-EV-REFUND-FAKE-ARG/commit-events-sqlserver.trx (25/25, chain-built) + commit-events-fast.trx (458/458) at OkamAPI lane/ev-refund-fake-arg db9b39a1
  exit    : the refund-driving Events tests pass at the branch tip on a chain-built database, and the seeding helper cannot be called in a way that silently disarms the fake
  refusal : evidence path does not exist: lanes/L-EV-REFUND-FAKE-ARG/commit-events-sqlserver.trx (25/25, chain-built) + commit-events-fast.trx (458/458) at OkamAPI lane/ev-refund-fake-arg db9b39a1
  needs   : trim evidence to lanes/L-EV-REFUND-FAKE-ARG/commit-events-sqlserver.trx

### L-GR-DEADLINE-COPY (Lane)  exit-instrument: none
  evidence: lanes/L-GR-DEADLINE-COPY/DETAIL.md · frontend 7a2c789 · backend 3b42da1d (lane/gr-deadline-onwire)
  exit    : the unknown-deadline sentence names the real cause in all three locales, and no comment describes the derivation that was deleted
  refusal : evidence path does not exist: lanes/L-GR-DEADLINE-COPY/DETAIL.md · frontend 7a2c789 · backend 3b42da1d (lane/gr-deadline-onwire)
  needs   : trim evidence to lanes/L-GR-DEADLINE-COPY/DETAIL.md

### L-GR-DEADLINE-STATUTE (Lane)  exit-instrument: none
  evidence: lane/gr-deadline-statute f7abfd8e (wt /Users/svendaneel/okam/wt-gr-statute, off 3b42da1d) · lanes/L-GR-DEADLINE-STATUTE/growth-scoped.trx
  exit    : the working-day extension and the end-of-day expiry are either implemented or named in the obligation's own doc, and the timezone reading is recorded
  refusal : evidence path does not exist: lane/gr-deadline-statute f7abfd8e (wt /Users/svendaneel/okam/wt-gr-statute, off 3b42da1d) · lanes/L-GR-DEADLINE-STATUTE/growth-scoped.trx
  needs   : trim evidence to lanes/L-GR-DEADLINE-STATUTE/growth-scoped.trx

### L-LIVE-WORLD-SEED (Lane)  exit-instrument: none
  evidence: Web-modules feature/restaurant-modules @ 9a5900a (local, not pushed) · artifact lanes/L-LIVE-WORLD-SEED/events-deposit-precondition.live.playwright.json = {"backend":"live","apiBaseUrl":"http://127.0.0.1:5951","backendProbe":{"status":200,"body":"Healthy"},"backendServed":12} · seed receipt lanes/L-LIVE-WORLD-SEED/live-world-run.txt (127 migrations, 211 tables, 25 append-only triggers, from EMPTY)
  exit    : at least one existing journey runs against a live API on a seeded database and produces an artifact naming that backend, not the fixture
  refusal : evidence path does not exist: Web-modules feature/restaurant-modules @ 9a5900a (local, not pushed) · artifact lanes/L-LIVE-WORLD-SEED/events-deposit-precondition.live.playwright.json = {"backend":"live","apiBaseUrl":"http://127.0.0.1:5951","backendProbe":{"status":200,"body":"Healthy"},"backendServed":12} · seed receipt lanes/L-LIVE-WORLD-SEED/live-world-run.txt (127 migrations, 211 tables, 25 append-only triggers, from EMPTY)
  needs   : trim evidence to lanes/L-LIVE-WORLD-SEED/events-deposit-precondition.live.playwright.json

### L-LIVE-WORLD-STAFF (Lane)  exit-instrument: none
  evidence: lanes/L-LIVE-WORLD-STAFF/live-world-run.txt (commit 538abe6)
  exit    : the two workforce journeys run live on a seeded world, with artifacts naming the live backend
  refusal : evidence path does not exist: lanes/L-LIVE-WORLD-STAFF/live-world-run.txt (commit 538abe6)
  needs   : trim evidence to lanes/L-LIVE-WORLD-STAFF/live-world-run.txt

### L-ARTIFACT-PROVENANCE (Lane)  exit-instrument: none
  evidence: lanes/L-ARTIFACT-PROVENANCE/evidence.md (commit 533aea4, 5 files, pathspec) + artifacts/journeys/runs/ledger.jsonl
  exit    : a journey artifact cannot be displaced by a run against a different backend, and each records the build that answered, proven by a run that would previously have overwritten a stronger one
  refusal : evidence path does not exist: lanes/L-ARTIFACT-PROVENANCE/evidence.md (commit 533aea4, 5 files, pathspec) + artifacts/journeys/runs/ledger.jsonl
  needs   : trim evidence to lanes/L-ARTIFACT-PROVENANCE/evidence.md

### L-LIVE-WORLD-RESTORE (Lane)  exit-instrument: none
  evidence: lanes/L-LIVE-WORLD-RESTORE/live-world-reset-run.txt (commit 337f9bf)
  exit    : two live journeys run in sequence against one world, each getting the state it needs, without replaying migrations between them
  refusal : evidence path does not exist: lanes/L-LIVE-WORLD-RESTORE/live-world-reset-run.txt (commit 337f9bf)
  needs   : trim evidence to lanes/L-LIVE-WORLD-RESTORE/live-world-reset-run.txt

### L-LIVE-SEED-VIA-PRODUCT (Lane)  exit-instrument: none
  evidence: test/e2e/scripts/live-world.sh (Web-modules feature/restaurant-modules, local commit) - three live artifacts under lanes/L-LIVE-SEED-VIA-PRODUCT/ all "backend":"live" "apiBaseUrl":"http://127.0.0.1:5956" (workforce-schedule-publish backendServed=48, workforce-flag-lever=80, events-deposit-precondition=12) - seed receipt lanes/L-LIVE-SEED-VIA-PRODUCT/live-world-run.txt (127 migrations, 211 tables, 25 append-only triggers, from EMPTY)
  exit    : the seeded store and its admin are made through the product's own registration path, or the script says truthfully why they cannot be
  refusal : evidence path does not exist: test/e2e/scripts/live-world.sh (Web-modules feature/restaurant-modules, local commit) - three live artifacts under lanes/L-LIVE-SEED-VIA-PRODUCT/ all "backend":"live" "apiBaseUrl":"http://127.0.0.1:5956" (workforce-schedule-publish backendServed=48, workforce-flag-lever=80, events-deposit-precondition=12) - seed receipt lanes/L-LIVE-SEED-VIA-PRODUCT/live-world-run.txt (127 migrations, 211 tables, 25 append-only triggers, from EMPTY)
  needs   : trim evidence to test/e2e/scripts/live-world.sh

### L-FE-WF-ONBOARD-WALK (Lane)  exit-instrument: none
  evidence: commit 35440cf on feature/restaurant-modules (ff, no merge commit) - artifacts/journeys/workforce-invitation-onboarding.playwright.json + lanes/L-FE-WF-ONBOARD-WALK/{mutation-proof,run-1,run-2,run-final,suite-journeys,suite-journeys-2,suite-jest}.txt
  exit    : the workforce invitation-onboarding walk is on the integration branch or the plan says where it is
  refusal : evidence path does not exist: commit 35440cf on feature/restaurant-modules (ff, no merge commit) - artifacts/journeys/workforce-invitation-onboarding.playwright.json + lanes/L-FE-WF-ONBOARD-WALK/{mutation-proof,run-1,run-2,run-final,suite-journeys,suite-journeys-2,suite-jest}.txt
  needs   : trim evidence to artifacts/journeys/workforce-invitation-onboarding.playwright.json

### L-UTLKVIT-REPRINT-KIND (Lane)  exit-instrument: none
  evidence: worktree /Users/svendaneel/okam/wt-utlkvit-reprint, branch lane/utlkvit-reprint-kind @ 88b7307f (local, never pushed, merge base fb522bdd = sale-row 1854f594 + replay-source 3a509b68) - fast tier base fb522bdd 4375 passed / 0 failed / 12 skipped / 4387, after 88b7307f 4379 / 0 / 12 / 4391, filter "Database!=SqlServer", separate clean detached checkouts, zero containers started - mutation 11 green -> 8 red -> 11 green - summaries and the red set in lanes/L-UTLKVIT-REPRINT-KIND/
  exit    : reprinting a credit sale through the receipt endpoint and the print endpoint hands over the delivery document, and the model addresses it in the field a client actually reads, pinned by a test that reds if the kind is taken from the entry alone
  refusal : evidence path does not exist: worktree /Users/svendaneel/okam/wt-utlkvit-reprint, branch lane/utlkvit-reprint-kind @ 88b7307f (local, never pushed, merge base fb522bdd = sale-row 1854f594 + replay-source 3a509b68) - fast tier base fb522bdd 4375 passed / 0 failed / 12 skipped / 4387, after 88b7307f 4379 / 0 / 12 / 4391, filter "Database!=SqlServer", separate clean detached checkouts, zero containers started - mutation 11 green -> 8 red -> 11 green - summaries and the red set in lanes/L-UTLKVIT-REPRINT-KIND/
  needs   : trim evidence to lanes/L-UTLKVIT-REPRINT-KIND/

### L-AI-MIDDLEWARE-DELETE (Lane)  exit-instrument: none
  evidence: OkamAPI lane/ai-middleware-delete @ 5b2e99c8 (worktree ~/okam/wt-aimw, cut from feature/restaurant-modules 3579bbbc; local, not pushed) - container-free tier 4370 passed / 0 failed / 12 skipped (5m49s) vs clean-checkout base 4369/0/12 at 3579bbbc, delta is the one new test - WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs - lanes/L-AI-MIDDLEWARE-DELETE/mutations.txt
  exit    : the request-body capture middleware is deleted and a test fails if it is wired back as it stands
  refusal : evidence path does not exist: OkamAPI lane/ai-middleware-delete @ 5b2e99c8 (worktree ~/okam/wt-aimw, cut from feature/restaurant-modules 3579bbbc; local, not pushed) - container-free tier 4370 passed / 0 failed / 12 skipped (5m49s) vs clean-checkout base 4369/0/12 at 3579bbbc, delta is the one new test - WebApi.Tests/Wire/RequestBodyTelemetryPinTests.cs - lanes/L-AI-MIDDLEWARE-DELETE/mutations.txt
  needs   : trim evidence to lanes/L-AI-MIDDLEWARE-DELETE/mutations.txt

### L-GR-DISPATCH-ACTOR (Lane)  exit-instrument: none
  evidence: lane/gr-dispatch-actor@a1e2655f (worktree /Users/svendaneel/okam/wt-gr-dispatch-actor); detail in lanes/L-GR-DISPATCH-ACTOR/detail.md
  exit    : the newsletter dispatch, the margin statement and its spend entries, and a push publication record each resolve and record the actor that caused them, asserted by value at the wire tier
  refusal : evidence path does not exist: lane/gr-dispatch-actor@a1e2655f (worktree /Users/svendaneel/okam/wt-gr-dispatch-actor); detail in lanes/L-GR-DISPATCH-ACTOR/detail.md
  needs   : trim evidence to lanes/L-GR-DISPATCH-ACTOR/detail.md

### L-JOURNEY-GUARD-FAIL (Lane)  exit-instrument: none
  evidence: test/e2e/scripts/guard-proof.js @ 31fc45d
  exit    : a live-labelled journey run against the wrong backend exits non-zero, proven by a mutation that makes it pass again
  refusal : evidence path does not exist: test/e2e/scripts/guard-proof.js @ 31fc45d
  needs   : trim evidence to test/e2e/scripts/guard-proof.js

### L-FIXTURE-DIVERGENCE (Lane)  exit-instrument: none
  evidence: lanes/L-FIXTURE-DIVERGENCE/receipts.txt - commits a62160e, 61a76ef off base 31fc45d
  exit    : a check reds when the fixture's refusal shapes diverge from the backend's, proven by removing one refusal from the fixture
  refusal : evidence path does not exist: lanes/L-FIXTURE-DIVERGENCE/receipts.txt - commits a62160e, 61a76ef off base 31fc45d
  needs   : trim evidence to lanes/L-FIXTURE-DIVERGENCE/receipts.txt

### L-ARTIFACT-RANK-KEY (Lane)  exit-instrument: none
  evidence: lanes/L-ARTIFACT-RANK-KEY/evidence.md (commits 397f4ab + 5407589, pathspec) + lanes/L-ARTIFACT-RANK-KEY/mutants/mutation-report.txt
  exit    : an artifact cannot be displaced by a lower-ranked later run, every artifact records which backend build answered it, and the three displaced live journeys are restored
  refusal : evidence path does not exist: lanes/L-ARTIFACT-RANK-KEY/evidence.md (commits 397f4ab + 5407589, pathspec) + lanes/L-ARTIFACT-RANK-KEY/mutants/mutation-report.txt
  needs   : trim evidence to lanes/L-ARTIFACT-RANK-KEY/evidence.md

## B2-ARTIFACT-ONLY-OUTSIDE-REPO  (37)

### L-TRAIN-EVID-LAND (Lane)  exit-instrument: path
  evidence: OkamAPI-modules/artifacts/tests/f8b3a30f2ecfaf00beab1e903dd68193fbc8eca2/RUN.md
  exit    : lane/train-evidence-endpoint is an ancestor of feature/restaurant-modules AND the evidence route answers at the wire tier under its authorization matrix, shown by fact:be.tests at a tip containing it
  refusal : evidence path does not exist: OkamAPI-modules/artifacts/tests/f8b3a30f2ecfaf00beab1e903dd68193fbc8eca2/RUN.md
  needs   : OkamAPI-modules/artifacts/tests/f8b3a30f2ecfaf00beab1e903dd68193fbc8eca2/RUN.md

### L-MEALS-UTLKVIT (Lane)  exit-instrument: fact-only
  evidence: OkamAPI worktree /Users/svendaneel/okam/wt-utlkvit, branch lane/meals-utlkvit @ 1a03bc6c (local, not pushed) · SQL TIER WebApi.Tests/Meals/MealsDeliveryReceiptSqlServerTests.cs (3/3 green, Meals SQL collection 101/101) · WebApi.Tests/Kassa/DeliveryReceiptComplianceTests.cs (9 pins) · fact:meals.utlkvit present on the branch (PosReceiptService.cs, 2 hits)
  exit    : fact:meals.utlkvit is present AND a finalized CompanyAccount check produces a journalled § 2-8-7 delivery receipt on its own gap-free number series, dated and carrying the not-a-purchase-receipt marking, proven at the SQL tier
  refusal : evidence path does not exist: OkamAPI worktree /Users/svendaneel/okam/wt-utlkvit, branch lane/meals-utlkvit @ 1a03bc6c (local, not pushed) · SQL TIER WebApi.Tests/Meals/MealsDeliveryReceiptSqlServerTests.cs (3/3 green, Meals SQL collection 101/101) · WebApi.Tests/Kassa/DeliveryReceiptComplianceTests.cs (9 pins) · fact:meals.utlkvit present on the branch (PosReceiptService.cs, 2 hits)
  needs   : /Users/svendaneel/okam/wt-utlkvit

### L-MEALS-XZ-CREDIT (Lane)  exit-instrument: fact-only
  evidence: OkamAPI worktree /Users/svendaneel/okam/wt-xzcredit, branch lane/meals-xz-credit @ 25586d86 (local, not pushed) · ARTIFACT WebApi.Tests/Meals/Fixtures/zreport-kredittsalg.txt · WebApi.Tests/Meals/MealsXZCreditSaleTests.cs (7 pins) · WebApi.Tests/Kassa/EodServiceTests.cs::GetSummary_CompanyAccount_IsCreditNotOtherTakings
  exit    : fact:meals.xz.credit is present AND a Z report over a day containing one CompanyAccount sale states kredittsalg as its own figure, named in Norwegian, outside the cash-sale totals, with the rendered output committed as an artifact
  refusal : evidence path does not exist: OkamAPI worktree /Users/svendaneel/okam/wt-xzcredit, branch lane/meals-xz-credit @ 25586d86 (local, not pushed) · ARTIFACT WebApi.Tests/Meals/Fixtures/zreport-kredittsalg.txt · WebApi.Tests/Meals/MealsXZCreditSaleTests.cs (7 pins) · WebApi.Tests/Kassa/EodServiceTests.cs::GetSummary_CompanyAccount_IsCreditNotOtherTakings
  needs   : /Users/svendaneel/okam/wt-xzcredit

### L-MENU-ALLERGEN-MATRIX (Lane)  exit-instrument: dir-prefix
  evidence: /Users/svendaneel/okam/web-menu-allergen/artifacts/journeys/menu-allergen-matrix.playwright.json (16/16 steps passed; 3 screenshots + print-preview.pdf, one A4 landscape page) · commit f1b0d1a on lane/menu-allergen-matrix (local, unpushed)
  exit    : a printable per-menu-item allergen matrix renders from the venue's product-allergen links, naming the venue as author of the data, captured under artifacts/journeys/
  refusal : evidence path does not exist: /Users/svendaneel/okam/web-menu-allergen/artifacts/journeys/menu-allergen-matrix.playwright.json (16/16 steps passed; 3 screenshots + print-preview.pdf, one A4 landscape page) · commit f1b0d1a on lane/menu-allergen-matrix (local, unpushed)
  needs   : /Users/svendaneel/okam/web-menu-allergen/artifacts/journeys/menu-allergen-matrix.playwright.json

### L-WF-EXCHANGE-MOVE (Lane)  exit-instrument: fact-only
  evidence: OkamAPI-modules a5ff40f2 on lane/wf-exchange-move (worktree ~/okam/wt-wfexmove) · fact:wf.journeys now 13 (WebApi.Tests/Workforce/WORKFORCE-JOURNEY-MANIFEST.md, WFJ-11 VERIFIED-GREEN) · Workforce fast suite 625/2 skipped/0 failed
  exit    : the shift-exchange journey reads verified-green in the Workforce journey manifest, as reported by fact:wf.journeys
  refusal : evidence path does not exist: OkamAPI-modules a5ff40f2 on lane/wf-exchange-move (worktree ~/okam/wt-wfexmove) · fact:wf.journeys now 13 (WebApi.Tests/Workforce/WORKFORCE-JOURNEY-MANIFEST.md, WFJ-11 VERIFIED-GREEN) · Workforce fast suite 625/2 skipped/0 failed
  needs   : ~/okam/wt-wfexmove

### L-WF-W5-TIMESHEET (Lane)  exit-instrument: none
  evidence: OkamAPI-modules lane/wf-w5-timesheet @ 9e82b286 (worktree ~/okam/wt-wfw5, cut from lane/margin-waste afcfddbc — the real chain tip, three migrations ahead of feature/restaurant-modules; local, not pushed) · fast tier 4362 passed / 0 failed / 7 skipped · SQL tier 26/26 (WorkforceTimesheetImmutabilitySqlServerTests + WorkforceW4MigrationLineageTests + RestaurantModulesMigrationRoundTripTests) · WORKFORCE-JOURNEY-MANIFEST.md on this branch reads 14 journeys VERIFIED-GREEN / 1 BLOCKED-ON-GAP · lanes/L-WF-W5-TIMESHEET/{evidence.md,mutations.md,fast-tier.txt,sql-tier.txt}
  exit    : the timesheet and export journeys read verified-green in the Workforce journey manifest AND a finalized batch refuses a further write on a chain-built database
  refusal : evidence path does not exist: OkamAPI-modules lane/wf-w5-timesheet @ 9e82b286 (worktree ~/okam/wt-wfw5, cut from lane/margin-waste afcfddbc — the real chain tip, three migrations ahead of feature/restaurant-modules; local, not pushed) · fast tier 4362 passed / 0 failed / 7 skipped · SQL tier 26/26 (WorkforceTimesheetImmutabilitySqlServerTests + WorkforceW4MigrationLineageTests + RestaurantModulesMigrationRoundTripTests) · WORKFORCE-JOURNEY-MANIFEST.md on this branch reads 14 journeys VERIFIED-GREEN / 1 BLOCKED-ON-GAP · lanes/L-WF-W5-TIMESHEET/{evidence.md,mutations.md,fast-tier.txt,sql-tier.txt}
  needs   : ~/okam/wt-wfw5

### L-VIPPS-REDACT-404 (Lane)  exit-instrument: none
  evidence: OkamAPI worktree /Users/svendaneel/okam/wt-vippsredact, branch lane/vipps-redact-404, commit cb18cab4, base feature/restaurant-modules 3579bbbc
  exit    : a request that binds no endpoint, and a percent-encoded route value, both reach telemetry with the credential replaced, shown by fast-tier theory cases including a trailing-dot deposit link
  refusal : evidence path does not exist: OkamAPI worktree /Users/svendaneel/okam/wt-vippsredact, branch lane/vipps-redact-404, commit cb18cab4, base feature/restaurant-modules 3579bbbc
  needs   : /Users/svendaneel/okam/wt-vippsredact

### L-EV-EXTDEP-GUARDS (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-evextguards/artifacts/lanes/L-EV-EXTDEP-GUARDS/EVIDENCE.md (commit 07247536, lane/ev-extdep-guards, local, unpushed)
  exit    : a record request omitting the received date is refused, and the receipt writer is provably reachable only from the ledger, both shown by fast-tier tests
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-evextguards/artifacts/lanes/L-EV-EXTDEP-GUARDS/EVIDENCE.md (commit 07247536, lane/ev-extdep-guards, local, unpushed)
  needs   : /Users/svendaneel/okam/wt-evextguards/artifacts/lanes/L-EV-EXTDEP-GUARDS/EVIDENCE.md

### L-MEALS-FLOOR-PINS (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/OkamAPI-mealsfloor/lanes/L-MEALS-FLOOR-PINS/evidence.md (commit 5a254d72 on lane/meals-floor-pins, off feature/restaurant-modules de1e5c5e; not pushed)
  exit    : the store-cancel and state-machine release pins hold a second reservation, so a decrement on the already-released path is visible rather than absorbed
  refusal : evidence path does not exist: /Users/svendaneel/okam/OkamAPI-mealsfloor/lanes/L-MEALS-FLOOR-PINS/evidence.md (commit 5a254d72 on lane/meals-floor-pins, off feature/restaurant-modules de1e5c5e; not pushed)
  needs   : /Users/svendaneel/okam/OkamAPI-mealsfloor/lanes/L-MEALS-FLOOR-PINS/evidence.md

### L-MEALS-GRACE-PINS (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/OkamAPI-modules/lanes/L-MEALS-GRACE-PINS/evidence.md (commit 34c6c103 on lane/meals-grace-pins, off feature/restaurant-modules de1e5c5e; not pushed)
  exit    : the expiry-grace pins hold a second reservation so a clamped guard is distinguishable from a correct decrement, proven by a mutation that reds them
  refusal : evidence path does not exist: /Users/svendaneel/okam/OkamAPI-modules/lanes/L-MEALS-GRACE-PINS/evidence.md (commit 34c6c103 on lane/meals-grace-pins, off feature/restaurant-modules de1e5c5e; not pushed)
  needs   : /Users/svendaneel/okam/OkamAPI-modules/lanes/L-MEALS-GRACE-PINS/evidence.md

### L-MEALS-SWEEP-GUARD (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/OkamAPI-sweepguard/lanes/L-MEALS-SWEEP-GUARD/evidence.md — lane/meals-sweep-guard @ 4bddfc7d (fix e828bcdf) off de1e5c5e, local only
  exit    : a concurrency failure on one strand leaves the remaining strands released and the sweep completing, shown by a fast-tier test that reds when the guard is removed
  refusal : evidence path does not exist: /Users/svendaneel/okam/OkamAPI-sweepguard/lanes/L-MEALS-SWEEP-GUARD/evidence.md — lane/meals-sweep-guard @ 4bddfc7d (fix e828bcdf) off de1e5c5e, local only
  needs   : /Users/svendaneel/okam/OkamAPI-sweepguard/lanes/L-MEALS-SWEEP-GUARD/evidence.md

### L-STATUTE-EVIDENCE-WORLD (Lane)  exit-instrument: none
  evidence: worktree /Users/svendaneel/okam/web-statute-world @ 2ee3fd7 (branch lane/statute-evidence-world, off lane/statute-honesty f01886a, not pushed); artifacts/journeys/statute-honesty/01-personalliste-with-coverage-caveat.pdf; lanes/L-STATUTE-EVIDENCE-WORLD/{EVIDENCE.md,mutation-log.txt}
  exit    : the committed personalliste PDF shows only rows the product can actually produce, and a test reds if the sheet ever renders a category the printed caveat says cannot appear
  refusal : evidence path does not exist: worktree /Users/svendaneel/okam/web-statute-world @ 2ee3fd7 (branch lane/statute-evidence-world, off lane/statute-honesty f01886a, not pushed); artifacts/journeys/statute-honesty/01-personalliste-with-coverage-caveat.pdf; lanes/L-STATUTE-EVIDENCE-WORLD/{EVIDENCE.md,mutation-log.txt}
  needs   : /Users/svendaneel/okam/web-statute-world

### L-WF-DEMO-PRESENCE (Lane)  exit-instrument: none
  evidence: OkamAPI worktree /Users/svendaneel/okam/wt-wfdemopres, branch lane/wf-demo-presence @ 8a9080c8 (local, not pushed; off feature/restaurant-modules de1e5c5e) · six full `Scripts/demo/demo-up.sh` runs from an EMPTY database against my own container, final green run captured at /private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/final-run.txt · step 13b prints `2026-07-20: Jonas Lie 08:02-16:04, Nora Berg 13:58-20:04` / `2026-07-21: Jonas Lie 07:58-16:12, Nora Berg 16:01-00:19`
  exit    : after the workforce demo seed, the personnel-list read for the seeded week returns the four seeded windows rather than an empty sheet
  refusal : evidence path does not exist: OkamAPI worktree /Users/svendaneel/okam/wt-wfdemopres, branch lane/wf-demo-presence @ 8a9080c8 (local, not pushed; off feature/restaurant-modules de1e5c5e) · six full `Scripts/demo/demo-up.sh` runs from an EMPTY database against my own container, final green run captured at /private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/final-run.txt · step 13b prints `2026-07-20: Jonas Lie 08:02-16:04, Nora Berg 13:58-20:04` / `2026-07-21: Jonas Lie 07:58-16:12, Nora Berg 16:01-00:19`
  needs   : /Users/svendaneel/okam/wt-wfdemopres

### L-GR-TESTSEND-GUARD (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-gr-testsend @ 5719fc96 · WebApi.Tests/Growth/GrowthTestSendBindingTests.cs · Growth 460/0/1 (SqlServer excluded, no slot held)
  exit    : a wire test proves a test-send to an arbitrary address is refused or attributed, and reds if the attribution is removed
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-gr-testsend @ 5719fc96 · WebApi.Tests/Growth/GrowthTestSendBindingTests.cs · Growth 460/0/1 (SqlServer excluded, no slot held)
  needs   : /Users/svendaneel/okam/wt-gr-testsend

### L-FLAGS-EFFECTIVE-RESOLVERS (Lane)  exit-instrument: none
  evidence: lane/flags-effective-resolvers @ e45ec4c1 (worktree /Users/svendaneel/okam/OkamAPI-flagseff); trx at lanes/L-FLAGS-EFFECTIVE-RESOLVERS/fast-tier.trx
  exit    : Events, Growth and Meals each report an effective flag value through their real gate, pinned by a test that reds if the resolver is removed
  refusal : evidence path does not exist: lane/flags-effective-resolvers @ e45ec4c1 (worktree /Users/svendaneel/okam/OkamAPI-flagseff); trx at lanes/L-FLAGS-EFFECTIVE-RESOLVERS/fast-tier.trx
  needs   : /Users/svendaneel/okam/OkamAPI-flagseff

### L-UTLKVIT-SALE-ROW (Lane)  exit-instrument: none
  evidence: worktree /Users/svendaneel/okam/wt-utlkvit-salerow, branch lane/utlkvit-sale-row @ 1854f594 (local, not pushed, off lane/meals-utlkvit 1a03bc6c) - WebApi.Tests/Kassa/CreditSaleDocumentRoutingTests.cs (7 pins) - base 4366/0/12 at 1a03bc6c clean, after 4373/0/12, filter "Database!=SqlServer", no container started
  exit    : a credit sale addressed at its own id produces the delivery receipt on print, view and the public page, and a copy of its sale row is refused, each pinned by a test that reds if the resolution is removed
  refusal : evidence path does not exist: worktree /Users/svendaneel/okam/wt-utlkvit-salerow, branch lane/utlkvit-sale-row @ 1854f594 (local, not pushed, off lane/meals-utlkvit 1a03bc6c) - WebApi.Tests/Kassa/CreditSaleDocumentRoutingTests.cs (7 pins) - base 4366/0/12 at 1a03bc6c clean, after 4373/0/12, filter "Database!=SqlServer", no container started
  needs   : /Users/svendaneel/okam/wt-utlkvit-salerow

### L-UTLKVIT-REPLAY-SOURCE (Lane)  exit-instrument: none
  evidence: commit 3a509b68 on lane/utlkvit-replay-source (worktree /Users/svendaneel/okam/wt-utlkvitreplay); base 1a03bc6c fast tier 4366 passed / 0 failed / 12 skipped / 4378; after 3a509b68 fast tier 4368 / 0 / 12 / 4380
  exit    : a replay whose payment list has drifted still hands over the document matching the appended entry, pinned by a drifted-replay test
  refusal : evidence path does not exist: commit 3a509b68 on lane/utlkvit-replay-source (worktree /Users/svendaneel/okam/wt-utlkvitreplay); base 1a03bc6c fast tier 4366 passed / 0 failed / 12 skipped / 4378; after 3a509b68 fast tier 4368 / 0 / 12 / 4380
  needs   : /Users/svendaneel/okam/wt-utlkvitreplay

### L-GR-TESTSEND-RECORD (Lane)  exit-instrument: none
  evidence: lane/growth-audit-ledger@bd3a840f (worktree /Users/svendaneel/okam/wt-gr-ledger)
  exit    : every test-send is recorded with its actor, its newsletter and its time, pinned by a test that reds if the record is dropped
  refusal : evidence path does not exist: lane/growth-audit-ledger@bd3a840f (worktree /Users/svendaneel/okam/wt-gr-ledger)
  needs   : /Users/svendaneel/okam/wt-gr-ledger

### L-GR-CONFIRMED-EMAIL (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-gr-confirmed @ 801d36a3 (lane/gr-confirmed-email, off 5719fc96, local, unpushed) · WebApi.Tests/Growth/GrowthTestSendBindingTests.cs · artifacts/tests/a7697121-fast-tier.trx = fast tier 4376 run / 4364 passed / 0 failed / 12 skipped, from a clean detached checkout of a7697121
  exit    : an admin whose profile email is set but unconfirmed cannot test-send to it, pinned by a test that reds if the confirmation requirement is removed
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-gr-confirmed @ 801d36a3 (lane/gr-confirmed-email, off 5719fc96, local, unpushed) · WebApi.Tests/Growth/GrowthTestSendBindingTests.cs · artifacts/tests/a7697121-fast-tier.trx = fast tier 4376 run / 4364 passed / 0 failed / 12 skipped, from a clean detached checkout of a7697121
  needs   : /Users/svendaneel/okam/wt-gr-confirmed

### L-GR-TESTSEND-RATELIMIT (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-gr-ratelimit @ c96cd21e (lane/gr-testsend-ratelimit, off 801d36a3, local, unpushed) · artifacts/tests/lane-fast-tier.trx 4403/4391/0/12 · artifacts/tests/base-801d36a3.trx 4376/4364/0/12, measured myself from a clean checkout of the base
  exit    : the test-send route and the profile-email change are both rate-limited, pinned by a test that reds if either limiter is removed
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-gr-ratelimit @ c96cd21e (lane/gr-testsend-ratelimit, off 801d36a3, local, unpushed) · artifacts/tests/lane-fast-tier.trx 4403/4391/0/12 · artifacts/tests/base-801d36a3.trx 4376/4364/0/12, measured myself from a clean checkout of the base
  needs   : /Users/svendaneel/okam/wt-gr-ratelimit

### L-MEALS-EIGHTH-PIN (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-mealseighth/lanes/L-MEALS-EIGHTH-PIN/evidence.md — lane/meals-eighth-pin @ 9fe599c6 off d5483cb3, local only
  exit    : an uninvolved reservation is held across the supersede so a clamp reds the pin, proven by injecting that clamp
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-mealseighth/lanes/L-MEALS-EIGHTH-PIN/evidence.md — lane/meals-eighth-pin @ 9fe599c6 off d5483cb3, local only
  needs   : /Users/svendaneel/okam/wt-mealseighth/lanes/L-MEALS-EIGHTH-PIN/evidence.md

### L-MEALS-SUPERSEDE-SQL (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-mealssupsql/lanes/L-MEALS-SUPERSEDE-SQL/evidence.md (commit 7dafec47; trx supersede-sql-clean, mutant-clamp, mutant-repeat-decrement, mutant-no-detach, trait-guard)
  exit    : the superseded release passes on SQL Server, including its detach-and-re-read path, pinned by a test that reds under a clamp
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-mealssupsql/lanes/L-MEALS-SUPERSEDE-SQL/evidence.md (commit 7dafec47; trx supersede-sql-clean, mutant-clamp, mutant-repeat-decrement, mutant-no-detach, trait-guard)
  needs   : /Users/svendaneel/okam/wt-mealssupsql/lanes/L-MEALS-SUPERSEDE-SQL/evidence.md

### L-MEALS-FOURWAY-TIER (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-meals-fourway-tier/lanes/L-MEALS-FOURWAY-TIER/ (commit 702d9481, trx f72c7a81-fourway-fast-tier.trx)
  exit    : the full fast tier passes on a tree carrying all four release lanes, with the trx committed at that commit
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-meals-fourway-tier/lanes/L-MEALS-FOURWAY-TIER/ (commit 702d9481, trx f72c7a81-fourway-fast-tier.trx)
  needs   : /Users/svendaneel/okam/wt-meals-fourway-tier/lanes/L-MEALS-FOURWAY-TIER/

### L-GR-CONFIRMED-PIN-FIX (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-gr-confirmed @ 48950702 (lane/gr-confirmed-email, local, unpushed) · code 3cf288fb · artifacts/tests/3cf288fb-fast-tier.trx + .../3cf288fb.../RUN.md = 4376 run / 4364 passed / 0 failed / 12 skipped
  exit    : the deny-closed pin reds when its own clause is deleted, the dead seed parameter is used or removed, and the shared-code rationale says something true
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-gr-confirmed @ 48950702 (lane/gr-confirmed-email, local, unpushed) · code 3cf288fb · artifacts/tests/3cf288fb-fast-tier.trx + .../3cf288fb.../RUN.md = 4376 run / 4364 passed / 0 failed / 12 skipped
  needs   : /Users/svendaneel/okam/wt-gr-confirmed

### L-GR-CONFIRM-STALE (Lane)  exit-instrument: none
  evidence: OkamAPI-modules lane/gr-confirm-stale @ 771c0fc0 (own worktree /Users/svendaneel/okam/wt-gr-confirm-stale, off 48950702) · artifacts/tests/771c0fc0a6504971fb1cfdab5eed4ab878582ab5/RUN.md + artifacts/tests/771c0fc0-fast-tier.trx (fast tier Database!=SqlServer, 4380 total / 4368 passed / 0 failed / 12 skipped) · WebApi.Tests/Growth/GrowthTestSendReachabilityTests.cs
  exit    : an address confirmed long ago and since unreachable cannot authorise a send, pinned by a test that reds if the staleness check is removed
  refusal : evidence path does not exist: OkamAPI-modules lane/gr-confirm-stale @ 771c0fc0 (own worktree /Users/svendaneel/okam/wt-gr-confirm-stale, off 48950702) · artifacts/tests/771c0fc0a6504971fb1cfdab5eed4ab878582ab5/RUN.md + artifacts/tests/771c0fc0-fast-tier.trx (fast tier Database!=SqlServer, 4380 total / 4368 passed / 0 failed / 12 skipped) · WebApi.Tests/Growth/GrowthTestSendReachabilityTests.cs
  needs   : /Users/svendaneel/okam/wt-gr-confirm-stale

### L-MEALS-QUOTE-RETRY (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-mealsqretry/lanes/L-MEALS-QUOTE-RETRY/evidence.md — lane/meals-quote-retry @ 92d45967, local only (base 46519562 = supersede-sql 7dafec47 + eighth-pin 9fe599c6 merged; disjoint files)
  exit    : a quote survives a transient failure raised inside its own save, pinned by a test that reds if the retry-safety is removed
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-mealsqretry/lanes/L-MEALS-QUOTE-RETRY/evidence.md — lane/meals-quote-retry @ 92d45967, local only (base 46519562 = supersede-sql 7dafec47 + eighth-pin 9fe599c6 merged; disjoint files)
  needs   : /Users/svendaneel/okam/wt-mealsqretry/lanes/L-MEALS-QUOTE-RETRY/evidence.md

### L-CONFIRM-SERVER-HALVES (Lane)  exit-instrument: none
  evidence: OkamAPI worktree /Users/svendaneel/okam/wt-confirm-halves, branch lane/confirm-server-halves @ 8704ff63 (off c96cd21e, local, unpushed) - lanes/L-CONFIRM-SERVER-HALVES/evidence.md - artifacts/tests/base-c96cd21e-fast-tier.trx 4403/4391/0/12 from a clean checkout of the base - artifacts/tests/lane-confirm-halves-fast-tier.trx 4410/4398/0/12
  exit    : a failed confirmation send is reported rather than swallowed, and a malformed address is refused rather than throwing, each pinned
  refusal : evidence path does not exist: OkamAPI worktree /Users/svendaneel/okam/wt-confirm-halves, branch lane/confirm-server-halves @ 8704ff63 (off c96cd21e, local, unpushed) - lanes/L-CONFIRM-SERVER-HALVES/evidence.md - artifacts/tests/base-c96cd21e-fast-tier.trx 4403/4391/0/12 from a clean checkout of the base - artifacts/tests/lane-confirm-halves-fast-tier.trx 4410/4398/0/12
  needs   : /Users/svendaneel/okam/wt-confirm-halves

### L-RESERVATION-LIMITER-MOVE (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/OkamAPI-reslimiter/lanes/L-RESERVATION-LIMITER-MOVE/evidence.md (commit d9189fbd, branch lane/reservation-limiter-move, local)
  exit    : the reservation limiter resolves after a configuration failure that throws before its registration, pinned by the composition-root check
  refusal : evidence path does not exist: /Users/svendaneel/okam/OkamAPI-reslimiter/lanes/L-RESERVATION-LIMITER-MOVE/evidence.md (commit d9189fbd, branch lane/reservation-limiter-move, local)
  needs   : /Users/svendaneel/okam/OkamAPI-reslimiter/lanes/L-RESERVATION-LIMITER-MOVE/evidence.md

### L-COMPOSITION-ROOT-CHECK (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-comproot @ bfe57c3c (lane/composition-root-check, off 8704ff63, local, unpushed) - WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs - artifacts/tests/lane-composition-root-fast-tier.trx 4419/4406/1/12 - artifacts/tests/base-8704ff63-fast-tier.trx 4410/4398/0/12 measured myself from this clean worktree - lanes/L-COMPOSITION-ROOT-CHECK/{evidence.md,mutations.txt}
  exit    : a configuration failure before the registrations leaves every limiter resolving and enforcing, and the global filter constructible, proven by a build that would previously have failed
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-comproot @ bfe57c3c (lane/composition-root-check, off 8704ff63, local, unpushed) - WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs - artifacts/tests/lane-composition-root-fast-tier.trx 4419/4406/1/12 - artifacts/tests/base-8704ff63-fast-tier.trx 4410/4398/0/12 measured myself from this clean worktree - lanes/L-COMPOSITION-ROOT-CHECK/{evidence.md,mutations.txt}
  needs   : /Users/svendaneel/okam/wt-comproot

### L-CONFIRM-CONAT-RETIRE (Lane)  exit-instrument: none
  evidence: OkamAPI 6771ba9a on lane/confirm-conat-retire (worktree /Users/svendaneel/okam/wt-conatretire, local, not pushed) + lanes/L-CONFIRM-CONAT-RETIRE/evidence.md
  exit    : a refusal from the shared per-address or per-IP bucket leaves an outstanding code alive, and only an account-bucket refusal retires it
  refusal : evidence path does not exist: OkamAPI 6771ba9a on lane/confirm-conat-retire (worktree /Users/svendaneel/okam/wt-conatretire, local, not pushed) + lanes/L-CONFIRM-CONAT-RETIRE/evidence.md
  needs   : /Users/svendaneel/okam/wt-conatretire

### L-CRYPTO-PIN-BYFORM (Lane)  exit-instrument: none
  evidence: OkamAPI worktree /Users/svendaneel/okam/wt-cryptopin, branch lane/crypto-pin-byform @ cfb3b14a (code 35630600, off 6771ba9a, local, unpushed) - lanes/L-CRYPTO-PIN-BYFORM/evidence.md - artifacts/tests/lane-crypto-pin-byform-fast-tier.trx 4418/4406/0/12 - artifacts/tests/base-6771ba9a-fast-tier.trx 4415/4402/1/12
  exit    : the confirmation code's source pin reds against every non-cryptographic form, not only the one that was there
  refusal : evidence path does not exist: OkamAPI worktree /Users/svendaneel/okam/wt-cryptopin, branch lane/crypto-pin-byform @ cfb3b14a (code 35630600, off 6771ba9a, local, unpushed) - lanes/L-CRYPTO-PIN-BYFORM/evidence.md - artifacts/tests/lane-crypto-pin-byform-fast-tier.trx 4418/4406/0/12 - artifacts/tests/base-6771ba9a-fast-tier.trx 4415/4402/1/12
  needs   : /Users/svendaneel/okam/wt-cryptopin

### L-COMPROOT-PIN-OVERDETERMINED (Lane)  exit-instrument: none
  evidence: 02c077cb on lane/confirm-postmerge-pin (/Users/svendaneel/okam/wt-postmergepin), WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs
  exit    : the registration-order assertion reds when the ordering fact it names is broken, not merely when the registration is absent
  refusal : evidence path does not exist: 02c077cb on lane/confirm-postmerge-pin (/Users/svendaneel/okam/wt-postmergepin), WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs
  needs   : /Users/svendaneel/okam/wt-postmergepin

### L-CONFIRM-POSTMERGE-PIN (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-postmergepin @ 02c077cb on lane/confirm-postmerge-pin off d9189fbd (1 file, pathspec commit, unpushed)
  exit    : the reservation-limiter absence assertion either reds on a realistic reordering mutation or is gone, and the doc block above it no longer describes a state the tree left behind
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-postmergepin @ 02c077cb on lane/confirm-postmerge-pin off d9189fbd (1 file, pathspec commit, unpushed)
  needs   : /Users/svendaneel/okam/wt-postmergepin

### L-MEALS-POS-TENDER-WIRE (Lane)  exit-instrument: none
  evidence: worktree ~/okam/OkamAPI-postender, branch lane/meals-pos-tender-wire, commit 32fd5a86 off lane/meals-utlkvit 1a03bc6c, NOT pushed. Container-free tier (dotnet test --filter "Database!=SqlServer"): base 1a03bc6c clean checkout 4366 passed / 0 failed / 12 skipped / 4378 total; mine 32fd5a86 4370 / 0 / 12 / 4382 - delta is exactly the 4 new tests. New file WebApi.Tests/Meals/MealsPosCreditTenderReachabilityTests.cs.
  exit    : a POS settlement carrying a company-account tender writes an OrderPayment and a journal sale row through the production path, shown by a test that drives the settlement service rather than inserting the receipt
  refusal : evidence path does not exist: worktree ~/okam/OkamAPI-postender, branch lane/meals-pos-tender-wire, commit 32fd5a86 off lane/meals-utlkvit 1a03bc6c, NOT pushed. Container-free tier (dotnet test --filter "Database!=SqlServer"): base 1a03bc6c clean checkout 4366 passed / 0 failed / 12 skipped / 4378 total; mine 32fd5a86 4370 / 0 / 12 / 4382 - delta is exactly the 4 new tests. New file WebApi.Tests/Meals/MealsPosCreditTenderReachabilityTests.cs.
  needs   : ~/okam/OkamAPI-postender

### L-EV-ACCEPT-GATE (Lane)  exit-instrument: none
  evidence: worktree ~/okam/OkamAPI-ev-acceptgate, branch lane/ev-accept-gate, commit 8eee00f7, NOT pushed, based on feature/restaurant-modules @ 3579bbbc (the stated integration tip; OkamAPI-modules is on lane/meals-grace-pins and was not used) - container-free tier 4374/0/12 vs baseline 4369/0/12 measured in a clean checkout of 3579bbbc, delta +5 = the 5 new tests, 0 regressions - WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs (3), WebApi.Tests/Wire/EventsProposalGateWiringTests.cs (2)
  exit    : the public proposal accept and decline writes refuse for a store without the Events core flag, pinned by a test that reds if the gate is removed
  refusal : evidence path does not exist: worktree ~/okam/OkamAPI-ev-acceptgate, branch lane/ev-accept-gate, commit 8eee00f7, NOT pushed, based on feature/restaurant-modules @ 3579bbbc (the stated integration tip; OkamAPI-modules is on lane/meals-grace-pins and was not used) - container-free tier 4374/0/12 vs baseline 4369/0/12 measured in a clean checkout of 3579bbbc, delta +5 = the 5 new tests, 0 regressions - WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs (3), WebApi.Tests/Wire/EventsProposalGateWiringTests.cs (2)
  needs   : ~/okam/OkamAPI-ev-acceptgate

### L-EV-GUEST-ORIGIN (Lane)  exit-instrument: none
  evidence: OkamAPI lane/ev-guest-origin @ b0b501a5, NOT pushed, based on feature/restaurant-modules @ 3579bbbc - worktree ~/okam/OkamAPI-ev-guestorigin - container-free tier 4371/0/12 vs baseline 4369/0/12 measured in the same worktree at 3579bbbc, delta +2 = the 2 new tests, 0 regressions - WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs
  exit    : a committed configuration sets the Events guest origin under the ruled domain, and an initiate with no origin configured refuses instead of stranding the guest, both shown at the wire tier
  refusal : evidence path does not exist: OkamAPI lane/ev-guest-origin @ b0b501a5, NOT pushed, based on feature/restaurant-modules @ 3579bbbc - worktree ~/okam/OkamAPI-ev-guestorigin - container-free tier 4371/0/12 vs baseline 4369/0/12 measured in the same worktree at 3579bbbc, delta +2 = the 2 new tests, 0 regressions - WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs
  needs   : ~/okam/OkamAPI-ev-guestorigin

### L-EV-OUTBOX-GUID-SUBSTRING (Lane)  exit-instrument: none
  evidence: OkamAPI-modules lane/ev-outbox-guid-substring 79f9dd7d (worktree /Users/svendaneel/okam/wt-evoutboxguid, off feature/restaurant-modules 3579bbbc, local, unpushed); after 4383/0/12 vs base 4369/0/12 measured myself, filter "Database!=SqlServer", no container started; .lane/base-3579bbbc.trx, .lane/after-lane.trx, .lane/repeat-runs.txt, .lane/L-EV-OUTBOX-GUID-SUBSTRING-detail.md
  exit    : the outbox guest-data assertion cannot match a substring of a generated identifier, shown by a test that reds when the identifier-aware form is reverted and passes across repeated runs with seeded identifiers that contain the digits
  refusal : evidence path does not exist: OkamAPI-modules lane/ev-outbox-guid-substring 79f9dd7d (worktree /Users/svendaneel/okam/wt-evoutboxguid, off feature/restaurant-modules 3579bbbc, local, unpushed); after 4383/0/12 vs base 4369/0/12 measured myself, filter "Database!=SqlServer", no container started; .lane/base-3579bbbc.trx, .lane/after-lane.trx, .lane/repeat-runs.txt, .lane/L-EV-OUTBOX-GUID-SUBSTRING-detail.md
  needs   : /Users/svendaneel/okam/wt-evoutboxguid

## B3-NO-FILE-ANYWHERE  (16)

### L-MEALS-REACHABLE (Lane)  exit-instrument: none
  evidence: lane/meals-reachable-api@02f27b95 (backend 28/28 container-free); lane/meals-reachable-web@f65595d (frontend 55/55 flag suites)
  exit    : the operator surface states that the Meals statement flags are disabled at deployment rather than reporting them effective, AND a browser client can read the export content-hash header, both shown at the wire tier
  refusal : evidence path does not exist: lane/meals-reachable-api@02f27b95 (backend 28/28 container-free); lane/meals-reachable-web@f65595d (frontend 55/55 flag suites)
  needs   : evidence is branch/commit prose only

### L-WF-CLOCK-WIRE (Lane)  exit-instrument: none
  evidence: OkamAPI lane/wf-clock-wire f14c91ec (base feature/restaurant-modules 3579bbbc); container-free tier 4377/0/12 vs base 4369/0/12
  exit    : a clock-out that closed nothing, a cross-employer refusal and an already-open session are each distinguishable from a clean punch on the wire, and a clock-state read answers whether this operator is clocked in, shown at the wire tier
  refusal : evidence path does not exist: OkamAPI lane/wf-clock-wire f14c91ec (base feature/restaurant-modules 3579bbbc); container-free tier 4377/0/12 vs base 4369/0/12
  needs   : evidence is branch/commit prose only

### L-PRINT-HOST (Lane)  exit-instrument: dir-prefix
  evidence: lane/print-host @ 6e6acd0 · artifacts/journeys/admin-print-host/ (5 PDFs, read) · artifacts/journeys/admin-print-host.playwright.json
  exit    : the personalliste and every admin document print without the sidebar gutter, verified by a rendered PDF committed under artifacts/journeys/
  refusal : evidence path does not exist: lane/print-host @ 6e6acd0 · artifacts/journeys/admin-print-host/ (5 PDFs, read) · artifacts/journeys/admin-print-host.playwright.json
  needs   : evidence is branch/commit prose only

### L-MEALS-RELEASE (Lane)  exit-instrument: none
  evidence: OkamAPI-meals-release 0659666f (lane/meals-release, local, not pushed) · WebApi.Tests/Wire/MealsQuoteReleaseWireTests.cs · lanes/L-MEALS-RELEASE/red-no-route.txt · lanes/L-MEALS-RELEASE/evidence.md · receipt artifacts/tests/0659666f33e500ce3fad3c456f5d01d2ac68ac9b/RUN.md
  exit    : a client that supersedes a reservation can release it, and a guest who re-quotes twice is not refused by their own earlier attempt, shown at the wire tier
  refusal : evidence path does not exist: OkamAPI-meals-release 0659666f (lane/meals-release, local, not pushed) · WebApi.Tests/Wire/MealsQuoteReleaseWireTests.cs · lanes/L-MEALS-RELEASE/red-no-route.txt · lanes/L-MEALS-RELEASE/evidence.md · receipt artifacts/tests/0659666f33e500ce3fad3c456f5d01d2ac68ac9b/RUN.md
  needs   : evidence is branch/commit prose only

### L-TRAIN-DISCLOSURE (Lane)  exit-instrument: none
  evidence: OkamAPI-modules 06b8b582 (lane/train-disclosure) + Web-modules 2d3488c; artifacts/tests/L-TRAIN-DISCLOSURE/after.trx
  exit    : the disclosure events recorded against a person are readable through a route, with the read itself recorded, shown at the wire tier under an authorization matrix
  refusal : evidence path does not exist: OkamAPI-modules 06b8b582 (lane/train-disclosure) + Web-modules 2d3488c; artifacts/tests/L-TRAIN-DISCLOSURE/after.trx
  needs   : evidence is branch/commit prose only

### L-DOWNLOAD-PDF-WIRE (Lane)  exit-instrument: none
  evidence: OkamAPI-dlpdf a7b90cbd (lane/download-pdf-wire, local, not pushed) · WebApi.Tests/Wire/PdfDownloadWireTests.cs · Services/Interfaces/IDocumentRenderer.cs · Services/OkamFunctionsDocumentRenderer.cs · WireContainmentTests.The_substituted_pdf_renderer_cannot_become_the_production_path · lanes/L-DOWNLOAD-PDF-WIRE/{red.txt,decision.md}
  exit    : order receipts, giftcard receipts, invoices and the delivery statistics PDF each reach a real 200 carrying a readable filename, or the seam that prevents it is replaced by one that can
  refusal : evidence path does not exist: OkamAPI-dlpdf a7b90cbd (lane/download-pdf-wire, local, not pushed) · WebApi.Tests/Wire/PdfDownloadWireTests.cs · Services/Interfaces/IDocumentRenderer.cs · Services/OkamFunctionsDocumentRenderer.cs · WireContainmentTests.The_substituted_pdf_renderer_cannot_become_the_production_path · lanes/L-DOWNLOAD-PDF-WIRE/{red.txt,decision.md}
  needs   : evidence is branch/commit prose only

### L-WF-ADJUST-ADDRESS (Lane)  exit-instrument: none
  evidence: OkamAPI-wfadjust f3887f9a + web-wf-adjust e9ba89e
  exit    : a manager-reachable read exposes the clock session identifier and the rates page offers the correction it currently refuses to fake, pinned by a wire test
  refusal : evidence path does not exist: OkamAPI-wfadjust f3887f9a + web-wf-adjust e9ba89e
  needs   : evidence is branch/commit prose only

### L-EV-INQUIRY-GATE (Lane)  exit-instrument: none
  evidence: backend lane/ev-inquiry-gate 8ecb47df (174/174 SQLite-tier Events+Modules) · frontend lane/fe-ev-inquiry-gate f7695bc (94 suites / 2199 tests)
  exit    : the public enquiry POST for a store without the Events core flag answers the module refusal, and the enquiry page renders its refusal card
  refusal : evidence path does not exist: backend lane/ev-inquiry-gate 8ecb47df (174/174 SQLite-tier Events+Modules) · frontend lane/fe-ev-inquiry-gate f7695bc (94 suites / 2199 tests)
  needs   : evidence is branch/commit prose only

### L-PDF-NULLDEREF (Lane)  exit-instrument: none
  evidence: OkamAPI-pdfnull 2497ce9d + receipt 17198f14 (lane/pdf-nullderef, local, not pushed) - WebApi.Tests/Wire/PdfRendererOutageWireTests.cs - WebApi.Tests/Services/DocumentRendererFailureTests.cs - artifacts/tests/2497ce9d-fast-tier.trx + 2497ce9d.../RUN.md - lanes/L-PDF-NULLDEREF/{red.txt,decision.md}
  exit    : a non-2xx renderer answer produces a handled error on all six call sites, pinned by a test that reds if the null is dereferenced again
  refusal : evidence path does not exist: OkamAPI-pdfnull 2497ce9d + receipt 17198f14 (lane/pdf-nullderef, local, not pushed) - WebApi.Tests/Wire/PdfRendererOutageWireTests.cs - WebApi.Tests/Services/DocumentRendererFailureTests.cs - artifacts/tests/2497ce9d-fast-tier.trx + 2497ce9d.../RUN.md - lanes/L-PDF-NULLDEREF/{red.txt,decision.md}
  needs   : evidence is branch/commit prose only

### L-JOURNEY-COVERAGE-THREE (Lane)  exit-instrument: dir-prefix
  evidence: artifacts/journeys/{margin-recipe-to-margin,training-course-to-evidence,growth-newsletter-send-gate}.playwright.json + 14 shots; commit 174a550
  exit    : Margin, Training and Growth each hold one journey walking their stated exit, captured under artifacts/journeys/
  refusal : evidence path does not exist: artifacts/journeys/{margin-recipe-to-margin,training-course-to-evidence,growth-newsletter-send-gate}.playwright.json + 14 shots; commit 174a550
  needs   : evidence is branch/commit prose only

### L-EV-URI-RELATIVE (Lane)  exit-instrument: none
  evidence: lane/ev-uri-relative @ 6a7bf75b (wt-evuri) · artifacts/lanes/L-EV-URI-RELATIVE/RUN.md
  exit    : a relative configured origin is refused by the malformed-origin branch on every platform, pinned by a test that reds if the absolute-URI check is removed
  refusal : evidence path does not exist: lane/ev-uri-relative @ 6a7bf75b (wt-evuri) · artifacts/lanes/L-EV-URI-RELATIVE/RUN.md
  needs   : evidence is branch/commit prose only

### L-WF-EXPORT-DUPLICATE (Lane)  exit-instrument: none
  evidence: /Users/svendaneel/okam/wt-wfexpdup/lanes/L-WF-EXPORT-DUPLICATE/{evidence.md,injection-probe-red.txt,sql-tier.txt,export-duplicate-race.trx,fast-tier.trx,sql-tier-workforce.trx} - lane/wf-export-duplicate @ 3a4442a7, local only
  exit    : two concurrent exports under different keys leave one succeeded batch, refused at the database rather than by a pre-commit read
  refusal : evidence path does not exist: /Users/svendaneel/okam/wt-wfexpdup/lanes/L-WF-EXPORT-DUPLICATE/{evidence.md,injection-probe-red.txt,sql-tier.txt,export-duplicate-race.trx,fast-tier.trx,sql-tier-workforce.trx} - lane/wf-export-duplicate @ 3a4442a7, local only
  needs   : evidence is branch/commit prose only

### L-FE-JOURNEYS-MERGE (Lane)  exit-instrument: none
  evidence: commit ddc27fa on feature/restaurant-modules (ff, no merge commit) - lanes/L-FE-JOURNEYS-MERGE/{bookkeeping.md,suite-18-of-18.log,mutation-proof.log,first-port-attempt-3-red.log}
  exit    : the four journeys the plan records as lane-only are either on the integration branch or the plan says where they are
  refusal : evidence path does not exist: commit ddc27fa on feature/restaurant-modules (ff, no merge commit) - lanes/L-FE-JOURNEYS-MERGE/{bookkeeping.md,suite-18-of-18.log,mutation-proof.log,first-port-attempt-3-red.log}
  needs   : evidence is branch/commit prose only

### L-FLAGS-IMPOSSIBLE-COMMENT (Lane)  exit-instrument: none
  evidence: commit 89c2c1f on feature/restaurant-modules (base 35440cfb, local, not pushed) - lanes/L-FLAGS-IMPOSSIBLE-COMMENT/{notes.md,mutation-proof.txt,suite-base.txt,suite-after.txt}
  exit    : the board's comment describes the states the API can now produce, pinned so it reds if the claim is reinstated
  refusal : evidence path does not exist: commit 89c2c1f on feature/restaurant-modules (base 35440cfb, local, not pushed) - lanes/L-FLAGS-IMPOSSIBLE-COMMENT/{notes.md,mutation-proof.txt,suite-base.txt,suite-after.txt}
  needs   : evidence is branch/commit prose only

### L-INVOICE-RETRY-RETIREMENT (Lane)  exit-instrument: none
  evidence: wt-invretire f18ffeda (fix+test) + receipt 1a0c0cbb, branch lane/invoice-retry-retirement off lane/pdf-nullderef (17198f14), local, not pushed - Services/InvoiceService.cs:89-102 - WebApi.Tests/Services/DocumentRendererFailureTests.cs - artifacts/tests/f18ffeda-fast-tier.trx + f18ffeda.../RUN.md
  exit    : the bulk retry route is run twice against a failing renderer and the invoice it could not mail is still selected on the second run, shown by a test that reds when the pre-render stamp is restored
  refusal : evidence path does not exist: wt-invretire f18ffeda (fix+test) + receipt 1a0c0cbb, branch lane/invoice-retry-retirement off lane/pdf-nullderef (17198f14), local, not pushed - Services/InvoiceService.cs:89-102 - WebApi.Tests/Services/DocumentRendererFailureTests.cs - artifacts/tests/f18ffeda-fast-tier.trx + f18ffeda.../RUN.md
  needs   : evidence is branch/commit prose only

### L-MIG-COMPANY-RECEIVABLE (Lane)  exit-instrument: none
  evidence: OkamAPI lane/mig-company-receivable @ 32c56fa4, off chain tip cff1c005; Migrations/20260803090036_Meals_CompanyReceivableAccount.cs; fast tier 4368/0/7
  exit    : the connection carries a company-receivable account alongside its two sibling intermediary accounts, created by a migration on the chain tip and read by the export
  refusal : evidence path does not exist: OkamAPI lane/mig-company-receivable @ 32c56fa4, off chain tip cff1c005; Migrations/20260803090036_Meals_CompanyReceivableAccount.cs; fast tier 4368/0/7
  needs   : evidence is branch/commit prose only

## C2-PROBE-SUITE-KIND  (1)

### L-BE-RECEIPT (Lane)  exit-instrument: path
  evidence: fact:be.tests
  exit    : fact:be.tests is ok from a trx produced at the current tip of feature/restaurant-modules, AND the artifact directory names the SHA it ran against
  refusal : fact:be.tests is a suite-kind probe — a green test suite does not exit built-unverified
  needs   : fact:be.tests inadmissible by design

## C3-PROBE-EXISTS-EXTRACTOR  (1)

### L-WF-IDREG (Lane)  exit-instrument: fact-only
  evidence: fact:wf.idreg (../OkamAPI-modules/Entities/Workforce/WorkforceIdentityCodeRegisterIssue.cs) + backend a04f51ca, d22c84c9 on feature/restaurant-modules + frontend a649e08 on lane/wf-idreg (worktree /Users/svendaneel/okam/web-wf-idreg), neither pushed
  exit    : fact:wf.idreg is present AND the code register for one business day is produced from the personalliste screen in a form an inspector can keep
  refusal : no probe declares fact:wf.idreg (../OkamAPI-modules/Entities/Workforce/WorkforceIdentityCodeRegisterIssue.cs) + backend a04f51ca, d22c84c9 on feature/restaurant-modules + frontend a649e08 on lane/wf-idreg (worktree /Users/svendaneel/okam/web-wf-idreg), neither pushed
  needs   : fact:wf.idreg cannot fail

## C5-PROBE-UNCONF  (3)

### L-FE-CI (Lane)  exit-instrument: fact-only
  evidence: fact:fe.ci
  exit    : fact:fe.ci is present AND a push to a feature branch produces the jest artifact this plan probes
  refusal : fact:fe.ci is `unconf`, not `ok`
  needs   : fact:fe.ci src=.github/workflows/nuxtjs.yml

### L-EV-EXTDEP (Lane)  exit-instrument: fact-only
  evidence: fact:ev.deposit.external (Services/Events/EventsDepositService.cs contains ExternalRecorded) + ../OkamAPI-ev-extdep/artifacts/lanes/L-EV-EXTDEP/EVIDENCE.md · lane/ev-extdep b10fc8a7, 7e9c38bf off feature/restaurant-modules d458e1cf, not pushed
  exit    : fact:ev.deposit.external is present AND a deposit received outside any provider rail reaches a settlement's DepositApplied line carrying the recording actor's user id, shown by a wire-tier test
  refusal : no probe declares fact:ev.deposit.external (Services/Events/EventsDepositService.cs contains ExternalRecorded) + ../OkamAPI-ev-extdep/artifacts/lanes/L-EV-EXTDEP/EVIDENCE.md · lane/ev-extdep b10fc8a7, 7e9c38bf off feature/restaurant-modules d458e1cf, not pushed
  needs   : fact:ev.deposit.external src=../OkamAPI-modules/Services/Events/EventsDepositService.cs

### L-EV-ACCEPT-RECEIPT (Lane)  exit-instrument: fact-only
  evidence: fact:ev.accept.receipt (Enums/Events/EventsNotificationKind.cs contains AcceptanceReceipt) + ../wt-ev-accept/artifacts/journeys/ev-accept-receipt/acceptance-receipt.html · lane/ev-accept-receipt 9f161e9e, 8ef3ce74 off feature/restaurant-modules a2897738, not pushed
  exit    : fact:ev.accept.receipt is present AND an accepted proposal stages an outbox row whose rendered document carries the version, the typed name, the acceptance moment and the content hash, with the rendered artifact committed
  refusal : no probe declares fact:ev.accept.receipt (Enums/Events/EventsNotificationKind.cs contains AcceptanceReceipt) + ../wt-ev-accept/artifacts/journeys/ev-accept-receipt/acceptance-receipt.html · lane/ev-accept-receipt 9f161e9e, 8ef3ce74 off feature/restaurant-modules a2897738, not pushed
  needs   : fact:ev.accept.receipt src=../OkamAPI-modules/Enums/Events/EventsNotificationKind.cs

## D-NO-EVIDENCE  (22)

### FT-WORKFORCE (Feature)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a manager walks plan, publish, punch, decide a request and open the personalliste in a browser and the walk is captured under artifacts/journeys/, AND the kodeoversikt for that business day can be produced
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### FT-MARGIN (Feature)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a chef enters an ingredient, a supplier price and a recipe, then opens, costs, freezes and corrects one week in a browser, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### FT-EVENTS (Feature)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a host takes one booking from the public enquiry page through a paid Vipps deposit to a settled statement in a browser, captured under artifacts/journeys/, AND the run sheet prints a recorded dietary requirement
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### FT-MEALS (Feature)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : an invited employee claims a membership, places a funded order a company budget pays for, and the month reaches a finalized statement line naming that employee, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### FT-TRAINING (Feature)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a manager authors a course, assigns it, a worker passes the quiz, and the completion is readable as evidence in a browser, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### FT-GROWTH (Feature)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a guest subscribes from the public page, receives a real double-opt-in mail from the ruled provider, confirms, then withdraws from the preference centre at the deployed origins, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-WF-PERSONNEL (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a manager opens the personalliste for a business day and prints it, captured under artifacts/journeys/, AND the identity-gap notice is on the printed sheet
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-WF-INBOX (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a worker files a request and a manager approves it in a browser, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-WF-BASIS (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a planned week shows a labour cost matching the backend's priced basis for a store with declared supplements, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-WF-SUPPLEMENTS (Lane)  exit-instrument: fact-only
  evidence: (none)
  exit    : fact:wf.journeys reports the Workforce journeys green AND a planned shift crossing a supplement window prices the supplement in a chain-built database
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-MARGIN-STATEMENT (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a chef freezes one statement week and files a correction in a browser, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-MARGIN-SUPPLIER (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a supplier, an article, a manual price and a CSV price import all reach a recipe's plate cost in a browser, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-EV-GUEST (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a guest opens a proposal token page, accepts it and reaches the deposit page, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-EV-VAT (Lane)  exit-instrument: fact-only
  evidence: (none)
  exit    : fact:ev.journeys reports no blocked Events journey AND a settlement carrying a deposit line names its withholding reason on screen
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-EV-RAILS (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a Vipps deposit reaches captured provider truth through the sink, captured under artifacts/journeys/, AND the Dintero and Stripe gaps are each an open Decision here
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-MEALS-WRITE (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a concierge creates a company, a program and an invitation in a browser, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-MEALS-CLAIM (Lane)  exit-instrument: path
  evidence: (none)
  exit    : an invited person claims an invitation at /meals/join and lands on an active membership, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-MEALS-RACE (Lane)  exit-instrument: path
  evidence: (none)
  exit    : fact:be.tests reports zero failures AND the SQL-tier run that resolved both claim races to exactly one membership is recorded under ../OkamAPI-modules/artifacts/tests/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-TRAIN-FIXES (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a worker takes a quiz, passes it and sees the completion, and a refused attempt names why, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-GROWTH-HONESTY (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : the newsletter screen states the provider that actually accepted a submission, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-GROWTH-GUEST (Lane)  exit-instrument: dir-prefix
  evidence: (none)
  exit    : a guest subscribes, confirms and unsubscribes across the four public pages, captured under artifacts/journeys/
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

### L-REACHSWEEP (Lane)  exit-instrument: none
  evidence: (none)
  exit    : the sweep names every unreachable production type with a ruling owed, AND every entry it names is either a Flag or a Decision in this plan
  refusal : NO-EVIDENCE
  needs   : no evidence recorded

================================================================================
# PRESCRIPTIONS - ordered by cost

## P1. The 22 review lanes: one identical exit rewrite each (evidence already exists)

Every one of these has `evidence: docs/plan/reviews/<ID>.md`, that file EXISTS, and it is
guard-1 admissible.  All 22 fail only on 6.1, because the exit is pure prose
("a returned verdict on ...") naming no instrument.  The fix is mechanical: append
`, recorded at docs/plan/reviews/<ID>.md` to each exit.

  L-WF-REVIEW  L-MRG-REVIEW  L-EV-REVIEW  L-MEALS-REVIEW  L-TRAIN-REVIEW  L-GR-REVIEW
  L-MRG-WASTE-REVIEW  L-PRICE-REVIEW  L-UTLKVIT-REVIEW  L-FLAGS-UI-REVIEW
  L-GR-PRIVACY-REVIEW  L-GR-TESTSEND-REVIEW  L-WF-W5-REVIEW
  L-MEALS-RELEASE-CLUSTER-REVIEW  L-GR-CONFIRMED-REVIEW  L-MEALS-SWEEP-REVIEW
  L-FLAGS-RESOLVERS-REVIEW  L-EV-INQUIRY-REVIEW  L-LIVE-HARNESS-REVIEW
  L-GR-RATELIMIT-REVIEW  L-CONFIRM-CHAIN-REVIEW  L-MONEYPATH-PAIR-REVIEW

## P2. 11 more lanes, one exit rewrite each (evidence exists, guard-1 admissible)

  L-GROWTH-LAND            exit should name ../OkamAPI-modules/artifacts/tests/99855b1d1d35ab35c1c09e072da0fc6d42421e56/RUN.md
  L-MRG-WASTE              exit should name /Users/svendaneel/okam/wt-mrgwaste/artifacts/tests/50b85657/RUN.md
  L-MRG-WASTE-500          exit should name /Users/svendaneel/okam/wt-mrgwaste500/artifacts/tests/L-MRG-WASTE-500/RUN.md
  L-MEALS-DEGENERATE-TWO   exit should name /Users/svendaneel/okam/OkamAPI-mealsdegen2/lanes/L-MEALS-DEGENERATE-TWO/evidence.md
  L-MEALS-REQUOTE-RELEASE  exit should name /Users/svendaneel/okam/wt-mealsrequote/lanes/L-MEALS-REQUOTE-RELEASE/evidence.md
  L-EV-ONBOARD-PRINT-BLEED exit should name lanes/L-EV-ONBOARD-PRINT-BLEED/evidence.md
  L-FLAGS-EXCUSE-BYFLAG    exit should name /Users/svendaneel/okam/OkamAPI-flagsexcuse/lanes/L-FLAGS-EXCUSE-BYFLAG/mutation-receipt.md
  L-CLIENT-TRAILING-SLASH  exit should name lanes/L-CLIENT-TRAILING-SLASH/mutation-receipt.md
  L-CONFIRM-FAMILY-MERGE   exit should name /Users/svendaneel/okam/wt-confirmfam/artifacts/tests/72cf3e0a34b278514bb6872c8803a52384a80000/RUN.md
  L-BLOCKER-RESTATE        exit should name lanes/L-BLOCKER-RESTATE/verdicts.md
  L-GUARD-W0               exit should name lanes/L-GUARD-DEMO/demo-run.txt

CAUTION: 7 of these 11 name an absolute path inside ANOTHER WORKTREE.  Guard 1 accepts
an absolute path that exists anywhere on disk, so the exit rewrite makes them verify -
but the record then points at a file that vanishes when the worktree is removed and is
not on this branch.  Prefer copying the receipt into lanes/<ID>/ first.

## P3. 36 lanes: trim the evidence to the path already inside its prose, THEN rewrite the exit

These recorded a whole sentence where a path belonged.  A path that exists in THIS repo
is already inside the sentence; guard 1 refuses because the sentence is not a path.
Both edits are needed (trim + exit).  Full per-lane list above under B1.

## P4. 37 lanes: the artifact exists only outside this repo

Evidence prose names a file that exists only in a sibling worktree or in
../OkamAPI-modules.  Landing the lane did not land its receipt.  Either copy the
receipt into lanes/<ID>/ on this branch, or accept an absolute path that dies with
the worktree.  Full list above under B2.

## P5. 16 lanes: no file named anywhere

Evidence is branch/commit prose only ("lane/x @ sha, local, not pushed").  Nothing to
point at.  These need a receipt written before they can verify.  Full list under B3.

## P6. 22 items with no evidence at all

18 of them - the six Features and 12 module lanes - have an exit ending
"captured under artifacts/journeys/".  See the HOLE section below: that exit is
satisfied by any file under artifacts/, so recording evidence for them is currently
bookkeeping without meaning.  What each ACTUALLY needs, measured against the 22
journey artifacts that exist:

  FT-WORKFORCE     no journey walks punch + request-decision + personalliste.
                   workforce-schedule-publish covers plan+publish only.      NEEDS A JOURNEY
  FT-MARGIN        margin-recipe-to-margin stops at the margin table; no
                   supplier price, no freeze, no correction.                 NEEDS A JOURNEY
  FT-EVENTS        no journey pays a Vipps deposit or reaches a settled
                   statement.  events-runsheet-print covers the dietary half. NEEDS A JOURNEY
  FT-MEALS         meals-funded-checkout covers the funded order; no claim,
                   no finalized statement line.                              NEEDS A JOURNEY
  FT-TRAINING      training-course-to-evidence exists and PASSED - but its own
                   step 8 reads "THE STATED EXIT CANNOT BE WALKED - there is
                   no quiz".  Verifying FT-TRAINING against it would verify
                   against an artifact that says the exit is unwalkable.     BLOCKED, NOT MISSING
  FT-GROWTH        growth-doi-postmark-sandbox.json has 0 steps (a provider
                   receipt, not a walk); account-email-confirm is the admin's
                   own address, not a guest.                                 NEEDS A JOURNEY
  L-WF-PERSONNEL   no personalliste journey at all.                          NEEDS A JOURNEY
  L-WF-INBOX       no request/approve journey.                               NEEDS A JOURNEY
  L-WF-BASIS       no labour-cost-vs-priced-basis journey.                   NEEDS A JOURNEY
  L-MARGIN-STATEMENT  no freeze/correction journey.                          NEEDS A JOURNEY
  L-MARGIN-SUPPLIER   no supplier/article/CSV-import journey.                NEEDS A JOURNEY
  L-EV-GUEST       events-guest-proposal-accept.playwright.json is an EXACT
                   match for this exit and PASSED.                           EVIDENCE EXISTS
  L-EV-RAILS       events-deposit-precondition is about the flag, not a
                   Vipps payment reaching provider truth.                    NEEDS A JOURNEY
  L-MEALS-WRITE    no concierge company/program/invitation journey.          NEEDS A JOURNEY
  L-MEALS-CLAIM    no /meals/join journey; plan.md line 451 already records
                   that this lane landed over a capability that is unmerged. NEEDS A CAPABILITY
  L-TRAIN-FIXES    training-course-to-evidence step 8: there is no quiz.     BLOCKED, NOT MISSING
  L-GROWTH-HONESTY growth-newsletter-send-gate.playwright.json is status
                   FAILED at step 1 (the known F-GR-SEND-GATE-JOURNEY-RED).  BLOCKED
  L-GROWTH-GUEST   no guest subscribe/confirm/unsubscribe journey.           NEEDS A JOURNEY

The remaining 4 no-evidence items:
  L-WF-SUPPLEMENTS  fact:wf.journeys IS admissible today (journey kind, regex, ok, =12)
  L-EV-VAT          fact:ev.journeys IS admissible today (journey kind, contains, ok)
  L-MEALS-RACE      exit names fact:be.tests, which is suite-kind and inadmissible BY DESIGN.
                    It also names ../OkamAPI-modules/artifacts/tests/ - use that instead.
  L-REACHSWEEP      exit names no instrument of any kind.  Nothing can ever verify it
                    until the exit names one.

## P7. 5 items whose evidence is a fact: that cannot serve

  L-BE-RECEIPT         fact:be.tests is suite-kind - inadmissible by design.  Its exit
                       also names a path shape; point at the trx directory instead.
  L-WF-IDREG           bare key is fact:wf.idreg, whose probe uses the `exists`
                       extractor - a probe that cannot fail is not evidence.  Give it
                       contains:/regex: over WorkforceIdentityCodeRegisterIssue.cs.
                       (Evidence also has prose glued onto the key: "fact:wf.idreg (...)".)
  L-FE-CI              fact:fe.ci is unconf; source .github/workflows/nuxtjs.yml EXISTS,
                       so `plan refresh` alone may clear it.
  L-EV-EXTDEP          fact:ev.deposit.external unconf; source exists in the backend.
  L-EV-ACCEPT-RECEIPT  fact:ev.accept.receipt unconf; source exists in the backend.

  All three unconf ones share one cause - see the WRONG WORLD section.

================================================================================
# TWO FINDINGS THAT ARE NOT BOOKKEEPING

## HOLE: a directory-prefix exit is not a gate

names_the_instrument() matches on `ev.startswith(tok) or tok.startswith(ev)`.  24 items
carry `exit: ... captured under artifacts/journeys/`, so the token is the DIRECTORY.
Measured, not argued:

    plan verify FT-GROWTH --evidence artifacts                                    -> ADMISSIBLE
    plan verify FT-GROWTH --evidence artifacts/journeys                           -> ADMISSIBLE
    plan verify FT-WORKFORCE --evidence artifacts/journeys/modal-scroll-lock...   -> ADMISSIBLE
    plan verify FT-GROWTH --evidence artifacts/journeys/growth-newsletter-send-gate.playwright.json
                                                                                  -> ADMISSIBLE
                                     (that artifact's own status field reads "failed")

All 22 existing journey artifacts verify all 24 dir-prefix items, interchangeably, and
the bare directory `artifacts` verifies them too.  Path-kind evidence is never read, so
a FAILED journey verifies as readily as a passing one - only fact: evidence gets a
status check.  Rewriting these 24 exits to name the FILE is therefore not cosmetic; it
is the difference between a gate and a rubber stamp.

## WRONG WORLD: every backend-sourced fact is being read off the wrong branch

  fact:be.world           = False   (on_expected)
  fact:be.world.branch    = lane/meals-grace-pins
  fact:be.world.behind    = 4 commits behind integration

Confirmed directly: /Users/svendaneel/okam/OkamAPI-modules HEAD is
34c6c103 on lane/meals-grace-pins, not feature/restaurant-modules.

Every probe sourced at ../OkamAPI-modules/... is therefore measuring a foreign world.
That includes both facts this sweep found admissible today:
  fact:wf.journeys -> ../OkamAPI-modules/WebApi.Tests/Workforce/WORKFORCE-JOURNEY-MANIFEST.md
  fact:ev.journeys -> ../OkamAPI-modules/WebApi.Tests/Events/EVENTS-JOURNEY-MANIFEST.md
and it explains three of the unconf facts whose globs now match nothing
(acct.uidx glob:0, train.checklists glob:0).

Two consequences:
  1. Do not verify L-WF-SUPPLEMENTS or L-EV-VAT on those facts until the sibling
     checkout is back on feature/restaurant-modules and `plan refresh` has re-read them.
  2. Both are journey-KIND probes reading a hand-written markdown manifest that asserts
     "12 journeys VERIFIED-GREEN".  Guard 1 admits it because the kind field says
     `journey`.  It is prose about a suite, not a walk - the same thing guard 1 exists
     to refuse, wearing the admissible kind.

Separately: both exits are conjunctions ("fact:X reports green AND <second clause>"),
and the fact measures only the first clause.  Verifying on the fact alone records half
a verdict as a whole one.

================================================================================
# PROPOSED FOLLOW-UP LANES (withheld from `items:` - see note)

  L-EXIT-NAMES-ARTIFACT   class:node
      exit: the 33 built-unverified items whose recorded evidence already passes guard 1
      each carry an exit: naming that evidence path, and `plan verify` accepts each one

  L-EXIT-DIR-PREFIX       class:node
      exit: no exit: in plan.md names `artifacts/journeys/` as a bare directory; each of
      the 24 names the single artifact file it means, and `plan verify <any> --evidence
      artifacts` is refused

  L-BACKEND-WORLD-RESET   class:node
      exit: fact:be.world reads True and fact:be.world.branch reads
      feature/restaurant-modules, and every ../OkamAPI-modules probe has been re-read

WHY THESE ARE NOT IN THE RETURN'S `items:` SECTION
The item grammar (2.3) separates tokens with U+00B7 MIDDLE DOT.  This lane's brief
requires the return to be ASCII only.  A token-less item merges, but `plan check` then
raises E-LANE-CLASS and E-LANE-EXIT against each one - measured in a sandbox copy:
three bare items produced 6 new errors against a plan that currently has 0.  The
micro-item form (L-JOURNEY-EVIDENCE-SWEEP.1) produced 1 error instead (E-MICRO-OPEN,
because a built-unverified lane may not hold open micro-items).  Both regress the check,
so the proposals are recorded here and the orchestrator should add them by hand with
the separator the grammar needs.

================================================================================
# PRE-EXISTING, REPORTED NOT CHASED

  test/journey-artifact-store.test.js:294 and :346 hardcode the checkout directory name
  ("Web-modules@"), so the suite reds in any differently-named worktree.  Confirmed
  present; untouched.

  artifacts/journeys/growth-newsletter-send-gate.playwright.json is status "failed" with
  a single step, "sign in and open the newsletter screen" - it never reaches a newsletter
  route.  Matches F-GR-SEND-GATE-JOURNEY-RED.  Untouched, and no journey suite was re-run.

  Build identity: 2 of 22 journey artifacts carry a non-empty backendBuild
  (workforce-flag-lever, workforce-invitation-onboarding).  Expected, not a finding.
