# L-THE-THREE-HUNDRED-BRANCHES-ARE-CLASSIFIED — all 313 unlanded lane branches, each with a bucket and a check

<!-- lane L-THE-THREE-HUNDRED-BRANCHES-ARE-CLASSIFIED · brief 41d90ed1 · measured 2026-08-07 · read-only in both repositories: no commit, merge, rebase, push, or ref deletion; no suite, no container -->

**Measured at the landed pair: frontend `a63c30f`, backend `a1c1a6dff`. Exactly 111 frontend and 202
backend `lane/*` heads are not ancestors of their trunk — the brief's 313, re-derived, not inherited.**

**The bottom line: 137 branches carry unlanded product work (49 FE, 88 BE), 176 are retired here with
a named check per row — 78 superseded (25 FE, 53 BE), 49 patch-carried (37 FE, 12 BE), and 49 backend
heads based at `2431883dae` that must never be plain-merged.** The prior census's expectation that most
files "matched nothing in the landing tree" was right about the bytes and wrong about the meaning: the
2026-08-06 owner snapshot (`11be859`) and the four landing waves carried far more lane content than the
census's file-level probe could see — 18 frontend lanes whose every distinctive added line is present at
the trunk tree under different commits.

## Method — every row got at least one of these checks

1. **Ancestor filter**: `git merge-base --is-ancestor <ref> <trunk>` — defines the 313.
2. **Patch equivalence**: `git cherry <trunk> <ref>` — rows where every unique commit is `-` are
   patch-carried (9 rows across both repos).
3. **Blob probe**: every file touched by a ref's unique non-merge commits, compared blob-for-blob at
   the ref tip vs the trunk tree, split into product paths vs lane-evidence paths (`lanes/`,
   `artifacts/`, `docs/plan/`, `.claude/`) — evidence stays behind by design and no longer counts
   against a row.
4. **Needle containment** (the decisive one): up to 8–12 of the longest added lines from each
   candidate's unique commits, checked verbatim with `git grep -F` **at the trunk tree**. `0/N` is
   "absent, and here is the check"; `N/N` retires the row as carried-by-content. For the eleven
   frontend refs riding a ~36-merge composed base, needles were taken against
   `candidate/fe-compose-2026-08-05` so they measure the lane's own delta, not the dead base.
5. **Family ancestry**: `git merge-base --is-ancestor` between sibling lanes plus `git cherry`
   between rebased redo pairs — every superseded row names its superseder by ref.
6. **Pre-fork re-derivation**: merge-base against `2431883dae` for every backend head, plus a
   per-tip `git grep -lE 'bool +IsCreditSale *\('` scan for the silent-predicate hazard.

**Both measured traps were respected.** Every content check here is a tree-at-a-named-revision check
(`git grep <rev>`, `git rev-parse <rev>:<path>`), never a search of the object set, and never
`--all` (which reads other worktrees' detached HEADs — the prior census's documented wrong answer).
Targeted verifications were run where needles could mislead: migration-heavy branches whose longest
lines are snapshot lines (`wf-bootstrap-one-engagement` 7/8 present yet `WorkforceBootstrap*` absent
from every trunk file — the 7/8 was the re-authored snapshot, the product is NOT landed; same shape
checked for `wf-operator-unique`, `finalize-index-or-a-reason`, and inverted for
`margin-finalize-lag`, whose migration IS at the trunk under `20260801084923`).

## Summary

| bucket | FE | BE | total |
|---|---|---|---|
| carries-unlanded-product-work | 49 | 88 | **137** |
| superseded (superseder named per row) | 25 | 53 | 78 |
| patch-carried (cherry / blob / needle check per row) | 37 | 12 | 49 |
| pre-fork-must-not-land (base `2431883dae`) | 0 | 49 | 49 |
| | 111 | 202 | **313** |

## The pre-fork bucket, re-derived — 49 heads, and the eleven-shape is confirmed at 9 lane refs

All 49 backend `lane/*` heads with merge-base exactly `2431883dae` (W2/W3/w4s-era: `events-w2/w3-*`,
`growth-w2/w3-*`, `margin-*`, `meals-w1/w2/w3-*`, `w4s-*`, `order-created-utc`,
`wf-personalliste-write`, `a1–a6`, `b1–b3`). **None may be plain-merged** — the base predates the
predicate deletion and the trunk's whole module epoch.

The silent-re-add subset was re-derived per tip, not inherited: exactly **9 lane refs** carry a private
`IsCreditSale` in `Services/Kassa/SaftCashRegisterExportService.MasterData.cs` while their merge-base
holds no predicate at all, so a plain merge auto-adds it **outside any conflict marker**:
`a1-store-country`, `a2-growth-flake`, `a3-tx-gate`, `a5-events-w4`, `a6-meals-minors`,
`b1-training-w3`, `b2-wf-exchange`, `b3-wf-timesheets`, `meals-w3-fiscal` — plus the two non-lane refs
`feature/restaurant-control-stage0` and `prep/meals-w3-landing`. That is the flag's eleven, confirmed
at today's trunk (baseline: the trunk's only definition is `Services/Kassa/KassaCreditSale.cs`). The
other 40 pre-fork heads carry no private predicate; their hazard is the 313–420-file conflict storm,
not a silent one.

## The ranked list — the live work, ordered by what a person would notice

Each item names every ref that belongs to it; FE/BE halves of one journey are one item. "Head" means
the family's superset branch — the superseded siblings are retired in the tables and land through the
head. **Serialization laws ride with the list: at most one migration author (item 20 is three
migrations), and the four composed-base FE refs must be cherry-picked, never merged.**

1. **The § 8-5-6 kodeoversikt button** — FE `lane/wf-kodeoversikt-ui` (4 own commits + browser-driven
   journey; needles 0/12, both register tests absent at the trunk). The backend register landed
   (`a04f51cab` is on the trunk); the button an inspector's identity-code substitution depends on did
   not. Rider: BE `lane/statute-honesty` (the register says which of the four categories it can carry).
   The reason this lane exists, and it is real.
2. **The personalliste can be corrected by nobody** — FE `lane/fe-wf-correction-path` + BE
   `lane/wf-correction-path` (F-WF-NOCORRECTION, #8 in the ranked flag review). Both halves exist,
   both 0-ish needles, neither landed. A statutory register an inspector reads, uncorrectable.
3. **The personalliste prints the fields the law asks for** — FE `lane/statute-evidence-world` +
   FE `lane/ev-stale-cause` (two heads sharing patch-equivalent base commits — land together) +
   BE `lane/ev-stale-cause` (the run sheet names which input moved). C6 material.
4. **The statutory X/Z day report states kredittsal** — BE `lane/eod-credit-split` +
   `lane/xz-printed-defects` (two heads over the shared `xz-credit-fields`; F-XZ-CREDIT-UNSPEC, #7 —
   zero code hits at the trunk today). Also stops the printed X/Z truncating a statutory figure and
   dropping a negative count's sign.
5. **The printed receipt invents a refund and drops a deduction row** — FE
   `lane/check-lineamount-ungated-sum` (head; built directly on the *landed* check-discount fix
   `c8f26d5`, so it cherry-picks clean).
6. **Four øre prints as zero on the operator's screen** — FE `lane/ore-padding-operator-clients`
   (F-ORE-PADDING, #9). Cherry-pick the øre commit only: the branch base drags an unrelated 07-29
   "various fix" commit.
7. **A worker presses Bekreft and is shown nothing** — FE `lane/wf-acknowledge-receipt-visible` +
   `lane/ack-receipt-survives-reload` (own deltas 0/12; **composed-base hazard — cherry-pick only**)
   + BE `lane/ack-receipt-inbox-column` (F-WF-ACKNOWLEDGE-SHOWS-NOTHING, #16).
8. **A guest cannot leave a mailing list at the deployed origins** — BE `lane/gr-exit-wire-the-mail`
   + FE `lane/fe-gr-exit-wire-the-mail` (the working exit, linked from the mail), workable only with
   the origin/cookie family: BE `lane/cors-followups` (head), `lane/pref-cookie-half`,
   `lane/cors-narrow-the-default` + `lane/cors-narrow-the-default-integration`, FE
   `lane/fe-gr-withdraw-origin` (F-GR-NO-EXIT-FROM-A-LIST, #15; GDPR Art. 7(3)).
9. **The module switchboard lies to the operator** — BE `lane/flags-resolvers-cover-three` +
   `lane/flags-excuse-byflag` (two heads over the shared resolvers) + FE `lane/meals-reachable-web`;
   small levers ride: BE `lane/meals-lever-withhold`, `lane/wf-lever-title`
   (F-GROWTH-MODULE-LEVER-CANNOT-TURN-ON #13, F-MODULE-MASTERS #14).
10. **The punch clock has a door and names who gets paid** — FE `lane/fe-wf-link-deadend` (head of a
    four-lane chain: clock door → operator link → named review → dead-end withdraw) + BE
    `lane/wf-link-deadend` (head) + `lane/wf-clock-wire` (the punch response says what happened).
11. **A manager corrects a punch from the screen** — FE `lane/journey-workforce` (head; carries
    `wf-adjust-address`'s commit patch-equivalently) + BE `lane/wf-adjust-address`.
12. **Meals enrolment has a working screen** — FE `lane/fe-meals-pretick-walked` (head of four) + BE
    `lane/meals-members-read` (the enrolled set can be read back); the month-close/reconciliation
    surfaces FE `lane/fe-meals-reconcile-ui` (`MealsMonthClose.vue` absent at the trunk); the claim
    receipt FE `lane/fe-meals-claim-receipt`.
13. **Meals money-path family (C4)** — BE `lane/meals-quote-retry` (head of the requote chain),
    `lane/supersede-release-attributed`, `lane/meals-release-actor` (**not** inside the former —
    cherry 2+; reconcile at landing), `lane/meals-release-race`, `lane/meals-sweep-guard`; record
    rider `lane/meals-eighth-read`.
14. **A refusal stops reading as in-progress forever** — BE `lane/replay-pins-close` (head),
    `lane/wf-idempotency-refusal-rest` (head), `lane/train-idempotency-refusal` — the same defect
    class in three modules, all unlanded.
15. **Events money and the guest's way in/out** — BE `lane/ev-extdep-guards` (record a deposit
    received outside every rail, C4), `lane/ev-accept-receipt` (acceptance receipted to both parties),
    `lane/ev-vipps-fallback-2` + `lane/guestlink-one-composer` (a Vipps guest has somewhere to
    return to), `lane/ev-inquiry-gate` + FE `lane/fe-ev-inquiry-gate` (a venue that never opted in
    stops taking enquiries), FE `lane/fe-events-margin-surfaces` (fix a figure in an unsent offer).
16. **Growth delivery truth** — BE `lane/review-residuals-provider` (head: health endpoint withholds
    rates its provider cannot know), `lane/gr-postmark-webhook` (a genuine Postmark event can move a
    delivery; also carried on `lane/compose-and-run-the-stack`), `lane/gr-approval-state`, FE
    `lane/fe-growth-suppressed-key` (operator told the address is suppressed, not "something went wrong").
17. **Training** — BE `lane/train-disclosure` (a person can see who looked at their training record;
    riders `local/train-disclosure-land`, `local/trainwire-abort-fix`), `lane/trn-evidence-names`
    (a completion row that names no course is not evidence), `lane/trb2` (worker self-service surface —
    **WIP, author-marked unverified**).
18. **A venue can print the allergen matrix for its own menu** — FE `lane/menu-allergen-matrix`.
19. **A worker can see their own hours** — FE `lane/fe-wf-self` (own-time panel absent at the trunk;
    the Growth half of the branch already landed).
20. **The three unlanded migrations** — BE `lane/wf-bootstrap-one-engagement` (+ FE
    `lane/fe-wf-bootstrap` as its UI half), `lane/wf-operator-unique`,
    `lane/finalize-index-or-a-reason` (already named in the trunk's pending-migrations ledger).
    **C2: one migration author, re-author onto the chain tip — every one of these Designer parents is
    stale by ten-plus migrations.**
21. **Security and PII hygiene** — BE `lane/route-guard-gaps` (head over `phone-in-path`),
    `lane/push-token-in-path`, `lane/vipps-redact-404`, `lane/rollback-tracked-sweep`,
    `lane/gr-newsletter-cross-land` (head of a triple), `lane/wolt-sync-unregistered`,
    `lane/empref-natid`, `lane/telemetry-initializer-floor`, `lane/hosted-service-floor`.
22. **Operator-visible riders** — BE `lane/mrg-price-correction-2` (head), `lane/mrg-starter-150`
    (head), `lane/margin-waste-500`, `lane/pdf-creditnote-name` (head), `lane/accounting-export-silent`,
    `lane/paymenttype-defined-tender`, `lane/wf-push-still-lies`, `lane/wf-withheld-bound`,
    `lane/wf-timesheet-race`, `lane/wf-exchange-move`, `lane/wf-exchange-award-ungated`,
    `lane/wf-timeoff-decide-gate`, `lane/wf-contact-imported` + FE `lane/fe-wf-contact-imported`,
    `lane/meals-reachable-api` (head), `lane/events-outbox` (**re-verify against the current drain
    first**); FE `lane/mrg-lag-visible` (F-MRG-FINALIZE-LAG — measured still gated at the tip),
    `lane/norwegian-only-keys-translate`, `lane/vat-keys-monolingual`, `lane/fe-meals-docsync`.
23. **Demo, seeds and run records** — BE `lane/train-demo-seed-completes` (head; **rescue-chain
    ancestry — cherry-pick, never merge**), `lane/wf-demo-presence`, `lane/wf-onboard-claim` (twin tip
    with `wf-onboard-demo-run`), `lane/ev-seed-deposits`, `lane/meals-docsync`,
    `lane/compose-and-run-the-stack` (the only tree holding the SQL-tier run record 587/565/22 with
    its baseline proof).
24. **The test-infrastructure tail** (a person notices none of it, which is why it is last, not why it
    is skippable) — FE `lane/consent-reason-vocabulary` (head), `lane/journey-teardown` (head),
    `lane/collapse-the-two-hook-sweeps` (head), `lane/artifact-names-its-locale`,
    `lane/artifact-names-its-module-tree`, `lane/fixture-flag-store`,
    `lane/fixture-titles-follow-the-flags`, `lane/fixture-values-are-enum-members`,
    `lane/guard-repair-lands`, `lane/provenance-excludes-lane-evidence`,
    `lane/modules-preflight-fails-loud`, `lane/mrg-page-test-vacuous`, `lane/mrg-waste-receipts`,
    `lane/mrg-recipe-transitions-pinned`, `lane/tier-artifacts`, `lane/fe-ci`, and the composed-base
    lint/duplicate-key five (`lint-runnable`, `lint-runs-on-something`, `lint-two-real-defects`,
    `duplicate-key-guard`, `duplicate-key-in-the-build` — cherry-pick only) +
    `lane/collect-review-conditions`, `lane/ack-...` (see item 7 for the product half); BE
    `lane/census-derives-its-floor` (head), `lane/dated-test-output`, `lane/ef-index-shadow-sweep`,
    `lane/ev-concurrency-stale-revision` (F-EV-CONCURRENCY-GUARD-UNTESTED),
    `lane/ev-refund-fake-arg`, `lane/fragile-needles`, `lane/lanes-out-of-assembly`,
    `lane/margin-violation-anchor`, `lane/meals-floor-pins`, `lane/meals-grace-pins` (**strandable:
    reachable only through the rescue chain — census finding E still holds**),
    `lane/publish-outbox-shape`, `lane/review-residuals-rezone`, `lane/utlkvit-reprint-kind`,
    `lane/wf-digest-tautology`, `lane/wf-timesheet-wire`, `lane/gr-deadline-statute` (head).

## Cross-cutting hazards the tables encode

- **The composed-base eleven (FE)**: `ack-receipt-survives-reload`, `collect-review-conditions`,
  `duplicate-key-guard`, `duplicate-key-in-the-build`, `lint-runnable`, `lint-runs-on-something`,
  `lint-two-real-defects`, `wf-acknowledge-receipt-visible`, `mrg-coverage-panel-says-absent`,
  `mrg-recipe-transitions-pinned`, `mrg-waste-panel-says-absent` all ride the retired
  `candidate/fe-compose-2026-08-05` (~36 merges). **Their own deltas cherry-pick; a plain merge drags
  the dead candidate onto the trunk.**
- **The rescue chain (BE)**: `planned-minutes-honour-lineage` (product already landed as `726906fe5`)
  and `train-demo-seed-completes/-redo` carry `wip: rescue ...` ancestry with `world.config` /
  `WORLD.json` snapshots. Cherry-pick only; `lane/meals-grace-pins` strands if the chain is dropped.
- **Duplicate tips**: FE `038612f8e1` (= `consent-reason-vocabulary` = `fixture-rendered-values`);
  BE `682aa9fc1f` (= `ask-conditions` = `ask-menuprice` = `feature/ask-okam` tip), `de0811f633`
  (= `wf-onboard-claim` = `wf-onboard-demo-run`), `e88af79642` (the eight pre-fork `a*/b*` heads).
- **Migrations**: exactly three live branches carry migrations (item 20) plus the two patch-carried
  ones already re-authored on the chain (`margin-finalize-lag`, the stack). C2 applies to every landing.

## Appendix — non-lane refs that carry product work (exit scope is lane/*; these are named, not tabled)

- **`feature/ask-okam` @ `682aa9fc1` (2026-08-07, live)** — the Ask Modul P0 program: 18 unlanded
  non-merge commits (chat hardening, staged-action spine + reaper, tool-scope facade, PII projection
  boundary, provider seam with the credential out of the URL, contract v0.3.0). **The single largest
  body of unlanded product work in either repository**; all 15 `lane/ask-*` rows retire into it.
- **`local/train-disclosure-land`, `local/trainwire-abort-fix`** — carry `lane/train-disclosure`'s
  commit plus "the training wire tier reports its failures instead of dying on them" (`94a926153`),
  which is on no lane ref.
- **`integration/confirm-family` @ `eeb1b8c47`** — the composed confirm family (carries
  `gr-deadline-statute`, `gr-postmark-webhook` content and two tier-run records).
- **`preserve/german-identifier-labels` (FE `bfa1992`) and `preserve/model-versus-chain-drift-test`
  (BE `66f19e23`)** — deliberate GC anchors for two otherwise-refless commits. Classified as such;
  not integration candidates, but the drift test and the German labels are themselves unlanded work
  someone must eventually land or retire by decision.
- **`land/meals-posrel-v1`** — merges only, cherry+ = 0: fully carried, retirable.
- **`trial/meals-eighth-read-tipmerge`** — merge-trial record for the meals requote family.
- **FE `worktree-agent-*` @ `d7b5f3f` (×10)** — the tip of `origin/main` (asharghi's Wolt Drive page),
  per the clerk's correction to the prior census; not lane work, not at risk.
- **35 BE + 3 FE `wip/rescue-2026-08-06-*`** — one dirty-worktree snapshot commit each; the census's
  finding G stands; none classified as integration candidates here.

## What this lane could not determine

- **Superseded-by-rewrite rows rest on subject+file+date evidence, not patch identity** (they are
  marked "not patch-eq" in their notes): `meals-xz-credit`, `ev-uri-relative`, `ev-vipps-fallback`,
  `census-floors-derived`, `cors-credentialed-origin`, `growth-prefcentre`, `gr-withdraw-origin`,
  `meals-reachable`, `meals-degenerate-two`. If one of these redos dropped a case its predecessor had,
  only a landing-time diff of the pair would show it.
- **`lane/modal-broken-two`'s delivery-type-modal residue** and **`lane/events-outbox`'s drain fix**
  are retired/held on partial evidence — both carry an explicit re-verify note in their rows.
- **No merge simulation was run for the 137 live rows** (read-only lane; the pre-fork eleven were
  verified by tip-tree scan, the mechanism the flag already measured). Landing order within a rank
  item is not derived here beyond the named head/chain relations.

## Frontend: all 111 non-ancestor lane heads (trunk `a63c30f`)

| ref | tip | unique | newest | needles | bucket | evidence |
|---|---|---|---|---|---|---|
| `lane/L-A-MENU-WITHOUT-PICTURES-STILL-SELLS` | 96f18de7b0 | 2 | 2026-08-06 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/L-JOURNEY-GROWTH` | ef2d6be46e | 2 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/L-JOURNEY-PORT-HARDCODED` | 4772c1316a | 1 | 2026-08-04 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/L-JOURNEY-PROXY-BLINDSPOT` | 6646fa5870 | 2 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/L-PRICE-SHADOW-GUARD` | a3666858d6 | 2 | 2026-08-04 | 11/12 | **patch-carried** | needles 11/12 at trunk tree |
| `lane/ack-receipt-survives-reload` | ac6ed72168 | 108 | 2026-08-06 | 0/12 | **carries-unlanded-product-work** | own delta 0/12 (worker confirmation survives refresh); MUST cherry-pick own commits — plain merge drags a 36-merge composed base that is not on the trunk |
| `lane/artifact-names-its-locale` | adde9364ee | 2 | 2026-08-05 | 1/12 | **carries-unlanded-product-work** | needle probe 1/12: mostly absent from the trunk tree |
| `lane/artifact-names-its-module-tree` | c3024b8a8a | 3 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/6/2 ev:1/0/0) |
| `lane/canonical-slot-survives-a-rerun` | f00d0400bc | 1 | 2026-08-05 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/check-lineamount-ungated-sum` | c32cda3cbc | 2 | 2026-08-05 | 1/12 | **carries-unlanded-product-work** | needle probe 1/12: mostly absent from the trunk tree |
| `lane/clock-client-reads-the-wire` | 0c6bca501b | 6 | 2026-08-05 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/coercion-write-paths` | 4351f8f7eb | 1 | 2026-08-04 | 0/12 | **superseded** | by landed margin-waste withdrawal 9044589 (lane/margin-waste-surface-is-honest): the waste form it validates was withdrawn at the trunk; revisit only if the waste surface returns |
| `lane/collapse-the-two-hook-sweeps` | 542ee15c7a | 3 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/4/1 ev:0/0/19) |
| `lane/collect-review-conditions` | 808d509582 | 104 | 2026-08-05 | 0/0 | **carries-unlanded-product-work** | own delta absent (assertion-count honesty); composed-base hazard — cherry-pick only |
| `lane/collected-paths` | 6f03b18748 | 1 | 2026-08-05 | - | **patch-carried** | evidence-only branch: all 13 unique paths are lanes/ evidence; no product content |
| `lane/consent-reason-vocabulary` | 038612f8e1 | 4 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/2/0 ev:0/0/3) |
| `lane/duplicate-key-guard` | cb2cee6f6a | 104 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | translations duplicate-key check absent at trunk; composed-base hazard — cherry-pick only |
| `lane/duplicate-key-in-the-build` | b4300b4137 | 104 | 2026-08-05 | 0/0 | **carries-unlanded-product-work** | build-time duplicate-key guard; own delta tiny — verify at cherry-pick; composed-base hazard |
| `lane/ev-guestlink-one-composer` | 7f309951b3 | 1 | 2026-08-04 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/ev-journey-timebomb` | b7a9f389bd | 1 | 2026-08-04 | 0/12 | **superseded** | by lane/journey-teardown (ancestor of it) |
| `lane/ev-stale-cause` | 818c48a909 | 5 | 2026-08-01 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/14/3 ev:0/0/17) |
| `lane/events-admin` | 6790589e3b | 1 | 2026-07-29 | 3/12 | **superseded** | by landed lane/live-walk-events (9087794) and the evolved events-pipeline page; needles 3/12, all product files exist at trunk |
| `lane/exit-instrument-census` | 778482bab8 | 1 | 2026-08-04 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/fe-admin-refusal-credential` | 478ced7306 | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/fe-ci` | 36ce9ae0ee | 1 | 2026-07-31 | 0/5 | **carries-unlanded-product-work** | needle probe 0/5: distinctive added lines absent from the trunk tree (probe prod:0/1/0 ev:0/0/1) |
| `lane/fe-ev-inquiry-gate` | f7695bcbfa | 1 | 2026-08-01 | 2/12 | **carries-unlanded-product-work** | needle probe 2/12: mostly absent from the trunk tree |
| `lane/fe-events-margin-surfaces` | e8b58ec166 | 2 | 2026-08-01 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/20/3 ev:0/0/0) |
| `lane/fe-gr-exit-wire-the-mail` | 814f04d608 | 2 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/3/1 ev:0/0/8) |
| `lane/fe-gr-withdraw-origin` | 80493321cb | 2 | 2026-08-03 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/6/2 ev:0/0/0) |
| `lane/fe-growth-prefcentre` | 7a8b0d3a0f | 1 | 2026-08-03 | 0/12 | **superseded** | by lane/fe-gr-withdraw-origin (ancestor of it) |
| `lane/fe-growth-suppressed-key` | 775d45e2fe | 4 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/7/0 ev:0/0/3) |
| `lane/fe-journey-meals` | f6294ddd71 | 2 | 2026-08-04 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/fe-journeys` | de0d66b947 | 3 | 2026-07-31 | 10/12 | **patch-carried** | needles 10/12 — carried via snapshot code commit 11be859; residual playwright config lines evolved |
| `lane/fe-meals-claim-receipt` | d833d19714 | 1 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/7/1 ev:0/0/0) |
| `lane/fe-meals-docsync` | 7ac2f929b9 | 1 | 2026-08-04 | 0/0 | **carries-unlanded-product-work** | Meals surface copy corrections; shorter-needle recheck: all ABSENT |
| `lane/fe-meals-journey-locator` | d320105f28 | 3 | 2026-08-05 | 0/12 | **superseded** | by lane/fe-meals-pretick-walked (ancestor of it) |
| `lane/fe-meals-pretick-walked` | 9fbed8069a | 4 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/13/1 ev:0/0/6) |
| `lane/fe-meals-reconcile-ui` | e0729488ab | 2 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/7/4 ev:0/0/5) |
| `lane/fe-meals-statement-surface` | 9215d3856f | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/fe-pos-clock` | 7c3a1e1f2d | 1 | 2026-08-01 | 0/12 | **superseded** | by lane/fe-wf-oplink (ancestor of it) |
| `lane/fe-training-meals-surfaces` | 20693381f8 | 5 | 2026-08-01 | 1/12 | **superseded** | its two halves carried separately: meals-statement (lane/fe-meals-statement-surface, 12/12) and training panels (lane/train-evidence-pack-ui, 12/12); residual 1/12 |
| `lane/fe-wf-blind-bind-name` | c67df92a27 | 4 | 2026-08-04 | 0/12 | **superseded** | by lane/fe-wf-link-deadend (ancestor of it) |
| `lane/fe-wf-bootstrap` | 9264904d10 | 1 | 2026-08-03 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/6/0 ev:0/0/0) |
| `lane/fe-wf-contact-imported` | 3583b9f1b1 | 2 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/6/1 ev:0/0/0) |
| `lane/fe-wf-correction-path` | b4dd5282ac | 2 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/8/0 ev:0/0/0) |
| `lane/fe-wf-invite-list-revoke` | e8d69fc3ce | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/fe-wf-link-deadend` | bed932e34e | 5 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/13/12 ev:0/0/0) |
| `lane/fe-wf-onboard` | 9ec1100dbc | 1 | 2026-07-31 | 9/12 | **superseded** | by landed lane/wf-invite-pair-fe (cec420a) + snapshot 11be859; needles 9/12 |
| `lane/fe-wf-oplink` | 3e811b222d | 3 | 2026-08-01 | 0/12 | **superseded** | by lane/fe-wf-blind-bind-name (ancestor of it) |
| `lane/fe-wf-self` | 5886ba3014 | 3 | 2026-08-01 | 3/12 | **carries-unlanded-product-work** | needle probe 3/12: mostly absent from the trunk tree |
| `lane/fixture-divergence-receipt` | 0dbec34b36 | 1 | 2026-08-05 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/fixture-flag-store` | d1c4b26272 | 1 | 2026-08-05 | 1/12 | **carries-unlanded-product-work** | needle probe 1/12: mostly absent from the trunk tree |
| `lane/fixture-rendered-values` | 038612f8e1 | 4 | 2026-08-05 | 0/12 | **superseded** | duplicate ref: same tip 038612f8e1 as lane/consent-reason-vocabulary |
| `lane/fixture-suppressed-refusal` | 3d20451152 | 3 | 2026-08-05 | 0/12 | **superseded** | by lane/consent-reason-vocabulary (ancestor of it) |
| `lane/fixture-titles-follow-the-flags` | ccb847de2e | 1 | 2026-08-05 | 1/12 | **carries-unlanded-product-work** | needle probe 1/12: mostly absent from the trunk tree |
| `lane/fixture-values-are-enum-members` | 1a88c244bb | 1 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/5/3 ev:0/0/5) |
| `lane/growth-admin` | f866024ae5 | 1 | 2026-07-29 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/guard-repair-lands` | 7030c00122 | 1 | 2026-08-05 | 1/12 | **carries-unlanded-product-work** | needle probe 1/12: mostly absent from the trunk tree |
| `lane/jest-collects-lanes` | 82127eb196 | 1 | 2026-08-05 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/journey-teardown` | b8ba80302d | 4 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/6/2 ev:0/2/14) |
| `lane/journey-workforce` | eb8f41217d | 4 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/12/2 ev:0/0/18) |
| `lane/lint-runnable` | 8ad3358e43 | 104 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | linter reachable by one command; 0/12; composed-base hazard — cherry-pick only |
| `lane/lint-runs-on-something` | f9a777f0b6 | 104 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | translations lint wired; 0/12; composed-base hazard — cherry-pick only |
| `lane/lint-two-real-defects` | aec051a3ee | 105 | 2026-08-05 | 3/12 | **carries-unlanded-product-work** | 3/12; composed-base hazard — cherry-pick only |
| `lane/margin-menu-margin-ui` | 36600c1fec | 1 | 2026-07-29 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/margin-recipes` | c3974fdbbc | 1 | 2026-07-29 | 9/12 | **patch-carried** | needles 9/12 — 07-29 scaffold carried by later margin work; residual lines are trunk evolution |
| `lane/meals-admin` | 7890f69185 | 1 | 2026-07-29 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/meals-enrol-pretick` | 2e3f39d144 | 2 | 2026-08-04 | 0/12 | **superseded** | by lane/fe-meals-journey-locator (ancestor of it) |
| `lane/meals-enrol-ui` | 802041a86a | 1 | 2026-08-04 | 0/12 | **superseded** | by lane/meals-enrol-pretick (ancestor of it) |
| `lane/meals-reachable-web` | f65595d61e | 1 | 2026-08-03 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/5/0 ev:0/0/0) |
| `lane/menu-allergen-matrix` | f1b0d1a912 | 1 | 2026-08-01 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/7/5 ev:0/0/0) |
| `lane/modal-broken-two` | 63489442c1 | 1 | 2026-08-01 | 1/12 | **superseded** | login half by the landed sign-in family (5826a2e front door + loginmodal-mounted-once); residue (delivery-type modal on 5 legacy pages) unverified — note kept |
| `lane/modules-preflight-fails-loud` | eb9d52e2c2 | 3 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/2/1 ev:0/0/0) |
| `lane/mrg-coverage-panel-says-absent` | bbe3d358b5 | 109 | 2026-08-05 | 12/12 | **superseded** | own delta needles 12/12 at trunk — carried via landed lane/margin-waste-surface-is-honest; composed base must never plain-merge |
| `lane/mrg-coverage-unknown` | 455702764a | 2 | 2026-08-04 | 11/12 | **superseded** | needles 11/12 — carried via landed waste/coverage honesty (9044589) |
| `lane/mrg-lag-visible` | b2aa72e81c | 1 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | F-MRG-FINALIZE-LAG: flag review measured the lag panel still poweruser-gated at the tip; needles 0/12 |
| `lane/mrg-page-test-vacuous` | 9312294a22 | 2 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/1/0 ev:0/0/4) |
| `lane/mrg-recipe-revise-ui` | c429d515d6 | 2 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/mrg-recipe-transitions-pinned` | 9cca3dca61 | 107 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | own delta 0/12 (five draft controls driven from screen — page tests); composed-base hazard — cherry-pick only |
| `lane/mrg-revise-land` | 4a4aa4a152 | 1 | 2026-08-04 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/mrg-waste-frontend` | 804fe2385b | 1 | 2026-08-04 | 0/12 | **superseded** | by landed 9044589 — the always-refused waste form was withdrawn instead of patched |
| `lane/mrg-waste-panel-says-absent` | 633e637c41 | 107 | 2026-08-05 | 11/12 | **superseded** | own delta needles 11/12 at trunk — carried via landed lane/margin-waste-surface-is-honest; composed base must never plain-merge |
| `lane/mrg-waste-receipts` | 87702ef047 | 1 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/0/1 ev:0/0/9) |
| `lane/norwegian-only-keys-translate` | a8177f848a | 1 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/2/1 ev:0/0/5) |
| `lane/offer-partial-subtotal` | 35e5cdd683 | 4 | 2026-08-04 | 11/12 | **patch-carried** | needles 11/12; also ancestor of lane/offers-page-hundredfold |
| `lane/offers-page-hundredfold` | 021d19c374 | 5 | 2026-08-04 | 11/12 | **patch-carried** | needles 11/12 — legacy money-print fixes carried; the 1 missing needle is the deleted-helper cleanup (deletions leave no needle) |
| `lane/ore-padding-operator-clients` | c3695f1026 | 2 | 2026-08-06 | 2/12 | **carries-unlanded-product-work** | F-ORE-PADDING admin-web half; needles 2/12; CAUTION: base da1d381 drags an unrelated 07-29 "various fix" commit — cherry-pick the ore fix only |
| `lane/price-cleanup-two` | e41cdff2f8 | 1 | 2026-08-04 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/price-crosscurrency` | 6f59ba3fde | 2 | 2026-08-04 | 11/12 | **patch-carried** | needles 11/12 |
| `lane/print-host` | 6e6acd06e1 | 1 | 2026-08-01 | 0/12 | **superseded** | by lane/statute-honesty (ancestor of it) |
| `lane/provenance-excludes-lane-evidence` | 607f1385ad | 2 | 2026-08-05 | 1/12 | **carries-unlanded-product-work** | needle probe 1/12: mostly absent from the trunk tree |
| `lane/receipt-discount-row-dropped` | 7a72c02c0a | 1 | 2026-08-05 | 0/12 | **superseded** | by lane/check-lineamount-ungated-sum (ancestor of it) |
| `lane/statute-evidence-world` | 2ee3fd76f4 | 4 | 2026-08-01 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/15/3 ev:0/0/15) |
| `lane/statute-honesty` | f01886a086 | 3 | 2026-08-01 | 0/12 | **superseded** | by lane/statute-evidence-world (ancestor of it) |
| `lane/tier-artifacts` | b1a28728b7 | 12 | 2026-08-06 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/1/4 ev:0/0/5) |
| `lane/train-evidence-pack-ui` | af0a4a131c | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/train-publish-unclickable` | 28548f9603 | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/train-readonly-visible` | abef9aacd2 | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/training-admin` | 4727090d0b | 1 | 2026-07-29 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/vat-keys-monolingual` | 686e3c5f7b | 1 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | needle probe 0/12: distinctive added lines absent from the trunk tree (probe prod:0/2/1 ev:0/0/0) |
| `lane/vue-jest-upgrade-measured` | d1e1c38eb2 | 1 | 2026-08-05 | - | **patch-carried** | blob probe: every changed product file byte-identical at the trunk tree |
| `lane/vue3-shape-guard` | cffede38b7 | 2 | 2026-08-05 | 0/12 | **superseded** | by lane/collapse-the-two-hook-sweeps (ancestor of it) |
| `lane/wf-acknowledge-receipt-visible` | 02c7356812 | 105 | 2026-08-05 | 0/12 | **carries-unlanded-product-work** | F-WF-ACKNOWLEDGE-SHOWS-NOTHING frontend half, own delta 0/12; same composed-base hazard — cherry-pick only |
| `lane/wf-adjust-address` | e9ba89e225 | 1 | 2026-08-03 | 0/12 | **superseded** | by lane/journey-workforce — sole commit patch-equivalent (git cherry minus) |
| `lane/wf-idreg` | a649e080fe | 1 | 2026-08-01 | 0/12 | **superseded** | by lane/wf-kodeoversikt-ui — its sole commit is patch-equivalent (git cherry minus) to 1e5b523 inside it |
| `lane/wf-kodeoversikt-ui` | 19ad0015ed | 5 | 2026-08-04 | 0/12 | **carries-unlanded-product-work** | the § 8-5-6 kodeoversikt button + browser-driven journey; needles 0/12, both register tests ABSENT at trunk |
| `lane/wf-pubhist` | 2d86446b74 | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/wf-roles-ui` | ff21e488ea | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/wf-timesheet-ui` | 618efc8875 | 1 | 2026-08-04 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/workforce-roster` | 319ec2534d | 1 | 2026-07-29 | 12/12 | **patch-carried** | needle probe 12/12: every distinctive added line present at the trunk tree |
| `lane/worktree-basename-pin` | 0cea96acc8 | 2 | 2026-08-04 | 6/6 | **patch-carried** | needle probe 6/6: every distinctive added line present at the trunk tree |

## Backend: all 202 non-ancestor lane heads (trunk `a1c1a6dff`)

| ref | tip | unique | newest | needles | bucket | evidence |
|---|---|---|---|---|---|---|
| `lane/a1-store-country` | e88af79642 | 380 | 2026-07-22 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/a2-growth-flake` | e88af79642 | 380 | 2026-07-22 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/a3-tx-gate` | e88af79642 | 380 | 2026-07-22 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/a5-events-w4` | e88af79642 | 380 | 2026-07-22 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/a6-meals-minors` | e88af79642 | 380 | 2026-07-22 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/accounting-export-silent` | a154ca19b5 | 1 | 2026-08-04 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/ack-receipt-inbox-column` | 6dfbb74b4a | 1 | 2026-08-06 | 3/8 | **carries-unlanded-product-work** | needle probe 3/8: mostly absent from the trunk tree |
| `lane/ask-conditions` | 682aa9fc1f | 27 | 2026-08-07 | 0/8 | **superseded** | alias tip of feature/ask-okam (682aa9fc1) — the live Ask P0 head; see appendix |
| `lane/ask-contract` | 3fc32724ab | 8 | 2026-08-07 | 0/8 | **superseded** | ancestor of feature/ask-okam — carried by the Ask integration branch |
| `lane/ask-epoch-reconciled` | 8f474f9195 | 8 | 2026-08-06 | 0/8 | **superseded** | ancestor of feature/ask-okam |
| `lane/ask-epoch` | c4767365f4 | 2 | 2026-08-06 | 0/8 | **superseded** | re-landed on feature/ask-okam as 8f474f919 (P0-8 re-apply); not an ancestor, content re-authored |
| `lane/ask-facade` | 63080fe1f8 | 4 | 2026-08-06 | 0/8 | **superseded** | re-landed on feature/ask-okam as a8836b18a ("land the epoch, facade, PII and loop lanes as one design") |
| `lane/ask-loop` | 11028a89a5 | 3 | 2026-08-06 | 0/8 | **superseded** | re-landed on feature/ask-okam as a8836b18a |
| `lane/ask-mcp-boundary` | 7e17d9f7b4 | 14 | 2026-08-07 | 0/8 | **superseded** | ancestor of feature/ask-okam |
| `lane/ask-menuprice` | 682aa9fc1f | 27 | 2026-08-07 | 0/8 | **superseded** | alias tip of feature/ask-okam (682aa9fc1) |
| `lane/ask-p0-integration` | a8836b18a6 | 9 | 2026-08-07 | 0/8 | **superseded** | ancestor of feature/ask-okam |
| `lane/ask-pii` | 3afcc5c575 | 3 | 2026-08-06 | 0/8 | **superseded** | re-landed on feature/ask-okam as a8836b18a |
| `lane/ask-provider` | 388bd22217 | 14 | 2026-08-07 | 0/8 | **superseded** | ancestor of feature/ask-okam |
| `lane/ask-reaper` | 8060ea2202 | 17 | 2026-08-07 | 0/8 | **superseded** | ancestor of feature/ask-okam |
| `lane/ask-registry` | 0ed6e41f42 | 2 | 2026-08-06 | 0/8 | **superseded** | ancestor of feature/ask-okam |
| `lane/ask-scope` | c95e3eabdb | 2 | 2026-08-06 | 0/8 | **superseded** | ancestor of feature/ask-okam |
| `lane/ask-spine` | ed57c49f94 | 8 | 2026-08-07 | 0/8 | **superseded** | ancestor of feature/ask-okam |
| `lane/authclean` | 909f95bcc3 | 1 | 2026-07-29 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/b1-training-w3` | e88af79642 | 380 | 2026-07-22 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/b2-wf-exchange` | e88af79642 | 380 | 2026-07-22 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/b3-wf-timesheets` | e88af79642 | 380 | 2026-07-22 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/census-derives-its-floor` | 7585fa3bb1 | 1 | 2026-08-06 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/census-floors-derived` | 75dcc2ff60 | 1 | 2026-08-03 | 0/8 | **superseded** | by lane/census-derives-its-floor (08-06) — same census-derives-its-coverage intent, newer take |
| `lane/compose-and-run-the-stack` | 38788369f4 | 14 | 2026-08-06 | 0/8 | **carries-unlanded-product-work** | the only tree with the SQL-tier run record (587/565/22 + baseline proof) and the stack-times-confirm-family composition; product residue = the Growth postmark/deadline content also on its own lanes |
| `lane/cors-credentialed-origin` | edbb7dead5 | 2 | 2026-08-04 | 0/8 | **superseded** | by lane/cors-followups — same prefcentre-credential commit rewritten on the trunk base plus the loopback fix |
| `lane/cors-followups` | 17c12c2068 | 2 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/7/4 ev:0/0/0) |
| `lane/cors-narrow-the-default-integration` | aa29464de6 | 1 | 2026-08-06 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/cors-narrow-the-default` | bed7cab34d | 2 | 2026-08-06 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/cost-rollup` | 3d2c087cb8 | 1 | 2026-07-29 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/credit-note-number` | 24c95aa943 | 1 | 2026-08-04 | 1/8 | **superseded** | by lane/pdf-creditnote-name — sole commit patch-equivalent (git cherry minus) |
| `lane/dated-test-output` | b10eb11cc0 | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/4/1 ev:0/2/0) |
| `lane/demo-workforce` | 7adee1172a | 3 | 2026-07-29 | 6/8 | **superseded** | by the landed five-journey demo (ec5ead1e5 lineage); needles 6/8 present at trunk |
| `lane/ef-index-shadow-sweep` | 08309e39b2 | 1 | 2026-08-03 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/0/3 ev:0/0/0) |
| `lane/empref-natid` | 27de8b211a | 1 | 2026-08-05 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/eod-credit-split` | f028c0a87b | 4 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/9/4 ev:0/0/0) |
| `lane/ev-accept-receipt` | 8ef3ce749f | 2 | 2026-08-01 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/10/6 ev:0/0/2) |
| `lane/ev-concurrency-stale-revision` | 93d2b4228f | 1 | 2026-08-06 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/0/1 ev:0/0/0) |
| `lane/ev-extdep-guards` | 0724753645 | 3 | 2026-08-01 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/16/3 ev:1/1/5) |
| `lane/ev-extdep` | 7e9c38bf33 | 2 | 2026-08-01 | 0/8 | **superseded** | by lane/ev-extdep-guards (ancestor of it) |
| `lane/ev-inquiry-gate` | 8ecb47dfa5 | 1 | 2026-08-01 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/9/2 ev:0/0/0) |
| `lane/ev-outbox-flake` | 59a1d6073c | 1 | 2026-08-04 | 0/8 | **superseded** | by landed 24cd4ead5 "Stop the guest-data pin failing on a token that happens to contain an amount" |
| `lane/ev-outbox-guid-substring` | 79f9dd7d48 | 1 | 2026-08-03 | 0/8 | **superseded** | by landed 24cd4ead5 — same flake, same file |
| `lane/ev-refund-fake-arg` | db9b39a12e | 1 | 2026-08-02 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/5/1 ev:0/0/0) |
| `lane/ev-seed-deposits` | caee6ae34d | 2 | 2026-08-03 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/3/0 ev:0/0/0) |
| `lane/ev-stale-cause` | e5de872d75 | 1 | 2026-08-01 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/ev-uri-relative` | 6a7bf75b61 | 1 | 2026-08-02 | 0/8 | **superseded** | by lane/guestlink-one-composer (08-06) — same EventsGuestLink helper, ruling-shaped redo; not patch-eq |
| `lane/ev-vipps-fallback-2` | fc09be1d4b | 1 | 2026-08-03 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/10/2 ev:0/0/0) |
| `lane/ev-vipps-fallback` | 9e3a607bb7 | 1 | 2026-08-01 | 0/8 | **superseded** | by lane/ev-vipps-fallback-2 — same fix re-authored on newer base |
| `lane/events-outbox` | 8db70ff932 | 1 | 2026-07-30 | 0/8 | **carries-unlanded-product-work** | 07-30 drain fix; 0/8 at trunk, no later equivalent found — re-verify against the current drain before landing |
| `lane/events-settlement-reads` | 717082b20f | 1 | 2026-07-29 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/events-w2-anchor` | d4ba0bdc4f | 266 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/events-w2-deposits` | 969cf6cbca | 268 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/events-w2-harness` | 583e971723 | 266 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/events-w2-proposals` | 652d64d476 | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/events-w3-anchor` | 7fb4e8b425 | 316 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/events-w3-consumer` | 6230daeb00 | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/events-w3-runsheets` | 3f83d5e49c | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/events-w3-settlement` | 7dc753a42e | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/finalize-index-or-a-reason` | 5e53de83a7 | 1 | 2026-08-05 | 6/8 | **carries-unlanded-product-work** | F-JOURNAL-FINALIZE-INDEX-DROPPED: index named only in the pending ledger at trunk; carries a MIGRATION — C2 re-author |
| `lane/flags-effective-resolvers` | e45ec4c12f | 1 | 2026-08-01 | 0/8 | **superseded** | by lane/flags-excuse-byflag (ancestor of it) |
| `lane/flags-excuse-byflag` | 6ae0b8db5e | 2 | 2026-08-02 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/3/7 ev:0/0/3) |
| `lane/flags-resolvers-cover-three` | 0f29a898e0 | 2 | 2026-08-06 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/4/7 ev:0/0/5) |
| `lane/fragile-needles` | f2517d5dc0 | 1 | 2026-08-04 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/gr-approval-state` | 3ea531f596 | 1 | 2026-08-01 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/7/2 ev:0/0/4) |
| `lane/gr-deadline-onwire` | 3b42da1d00 | 1 | 2026-08-02 | 0/0 | **superseded** | by lane/gr-deadline-statute (ancestor of it) |
| `lane/gr-deadline-statute` | f7abfd8e9b | 2 | 2026-08-02 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/gr-exit-wire-the-mail` | 54a8bb51bc | 2 | 2026-08-04 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/gr-newsletter-cross-land` | 2fc29f344b | 2 | 2026-08-05 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/0/1 ev:0/0/0) |
| `lane/gr-newsletter-cross-verify` | b521bdb52e | 2 | 2026-08-03 | 0/8 | **superseded** | duplicate of lane/gr-newsletter-cross-land (same single-commit content, older base) |
| `lane/gr-postmark-webhook` | 5b895dc4f4 | 1 | 2026-08-01 | 0/8 | **carries-unlanded-product-work** | GrowthPostmarkEventReader absent at trunk; also carried on lane/compose-and-run-the-stack and integration/confirm-family |
| `lane/gr-withdraw-origin` | e0c2b02fdf | 2 | 2026-08-03 | 1/8 | **superseded** | split: origin/CORS half in lane/cors-followups, cookie half re-ruled in lane/pref-cookie-half (08-06); not patch-eq |
| `lane/growth-effective-resolver` | 107ca70efe | 1 | 2026-08-06 | 0/8 | **superseded** | by lane/flags-resolvers-cover-three (ancestor of it) |
| `lane/growth-health-honest` | c11e78a6ae | 1 | 2026-08-01 | 1/8 | **superseded** | by lane/review-residuals-provider (ancestor of it) |
| `lane/growth-newsletter-wire` | 87600a1c61 | 1 | 2026-08-01 | 0/8 | **superseded** | duplicate of lane/gr-newsletter-cross-land (same single-commit content, older base) |
| `lane/growth-prefcentre` | 2a05280055 | 1 | 2026-08-03 | 0/8 | **superseded** | by lane/cors-followups — its sole commit is the shared prefcentre-credential change |
| `lane/growth-sql-catch-typed` | c7912d49fc | 1 | 2026-08-05 | 7/8 | **superseded** | by landed d74c2c87b + a29f9f576 (growth tells the operator what actually failed); needles 7/8 |
| `lane/growth-w2-anchor` | d1c6c8f10e | 266 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/growth-w2-endpoints` | b249225df2 | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/growth-w2-harness` | ab827095bb | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/growth-w2-provider` | 06b76e8c0f | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/growth-w3-anchor` | 6d99b485eb | 316 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/growth-w3-dispatch` | bab12bd895 | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/growth-w3-provider` | e5d29a3efe | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/growth-w3-security` | b08e06819e | 316 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/guestlink-one-composer` | f1900cff7e | 2 | 2026-08-06 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/2/3 ev:0/0/0) |
| `lane/hosted-service-floor` | 6dcc150302 | 2 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/0/1 ev:0/0/5) |
| `lane/isofix` | 1df46dcc92 | 1 | 2026-07-29 | 7/8 | **patch-carried** | needles 7/8 at trunk — 07-29 refusal-leak fixes carried by the later isolation sweeps |
| `lane/lanes-out-of-assembly` | 2c1eebafb3 | 1 | 2026-08-04 | 0/6 | **carries-unlanded-product-work** | needle probe 0/6: distinctive added lines absent from the trunk tree (probe prod:0/1/0 ev:0/0/1) |
| `lane/margin-d0` | 10098b8627 | 266 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-finalize-lag` | a6a1174b88 | 1 | 2026-07-31 | 8/8 | **patch-carried** | its migration re-authored on the chain as 20260801084923_Margin_PeriodStatementFinalizedImmutable (verified at trunk incl. THROW 50061) |
| `lane/margin-price-correction` | 6368427b49 | 2 | 2026-08-02 | 2/8 | **superseded** | by lane/mrg-price-correction-2 (ancestor of it) |
| `lane/margin-s0` | de47607f3e | 265 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-violation-anchor` | a2bfd11657 | 1 | 2026-08-04 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/margin-w2-harness` | 033e5a76b5 | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-w2-import` | bfcb0a275e | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-w2-prices` | e8452b3c5d | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-w2-recipes` | d867499fbc | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-w3-anchor` | a68c2a6f18 | 316 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-w3-journeys` | 605cf3b2f1 | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-w3-projector` | fae8a08bf7 | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-w3-statements` | ade1361b91 | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/margin-waste-500` | 1ed372bd58 | 2 | 2026-08-02 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/meals-agreement-create` | cf88973afa | 1 | 2026-07-29 | 8/8 | **patch-carried** | needles 8/8 — the 07-29 agreement route landed long ago |
| `lane/meals-agreement-pin-inverts` | 4bbf34a5e5 | 2 | 2026-08-04 | 0/8 | **superseded** | by lane/replay-pins-close (ancestor of it) |
| `lane/meals-degenerate-two` | 4fff635d0a | 1 | 2026-08-01 | 2/8 | **superseded** | its release-path pin commit is carried inside the fourway/quote-retry chain (same commit subject in family log) |
| `lane/meals-docsync` | f7b30b2d1f | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/5/0 ev:0/0/0) |
| `lane/meals-eighth-pin` | 9fe599c6c8 | 3 | 2026-08-02 | 0/8 | **superseded** | by lane/meals-eighth-read (ancestor of it) |
| `lane/meals-eighth-read` | 1995fb7fb3 | 5 | 2026-08-05 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/4/3 ev:0/0/9) |
| `lane/meals-floor-pins` | 5a254d72a8 | 1 | 2026-08-01 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/2/0 ev:1/1/5) |
| `lane/meals-fourway-tier` | 702d9481ea | 10 | 2026-08-02 | 0/8 | **superseded** | by lane/meals-quote-retry (ancestor via meals-supersede-sql) |
| `lane/meals-grace-pins` | 34c6c10317 | 1 | 2026-08-01 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/1/0 ev:0/0/5) |
| `lane/meals-idempotency-refusal` | 54714dd6e3 | 1 | 2026-08-04 | 0/8 | **superseded** | by lane/meals-agreement-pin-inverts (ancestor of it) |
| `lane/meals-lever-withhold` | 2d0eab5393 | 2 | 2026-08-05 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/2/0 ev:0/0/3) |
| `lane/meals-members-read` | 086ac34f46 | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/7/1 ev:0/0/3) |
| `lane/meals-quote-retry` | 92d45967c0 | 14 | 2026-08-02 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/7/10 ev:1/1/35) |
| `lane/meals-reachable-api` | 02f27b9512 | 2 | 2026-08-03 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/8/3 ev:0/0/0) |
| `lane/meals-reachable` | 1b03e8e248 | 1 | 2026-08-01 | 1/8 | **superseded** | by lane/meals-reachable-api — same determinism-header fix re-authored |
| `lane/meals-release-actor` | 249612ac77 | 2 | 2026-08-03 | 0/8 | **carries-unlanded-product-work** | MealsActorKind on the audit ledger (C4); NOT inside lane/supersede-release-attributed (cherry 2+) — reconcile with it at landing |
| `lane/meals-release-race` | f70a0254c3 | 1 | 2026-08-01 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/meals-requote-release` | d5483cb30b | 2 | 2026-08-01 | 0/8 | **superseded** | by lane/meals-eighth-pin (ancestor of it); also inside lane/supersede-release-attributed |
| `lane/meals-supersede-sql` | 7dafec47ef | 11 | 2026-08-02 | 0/8 | **superseded** | by lane/meals-quote-retry (ancestor of it) |
| `lane/meals-sweep-guard` | 4bddfc7de0 | 2 | 2026-08-02 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/meals-w1` | 5a0247b4a6 | 256 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/meals-w2-anchor` | 336e801c43 | 265 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/meals-w2-funding` | 374620f9dd | 266 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/meals-w2-programs` | 3105cab823 | 267 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/meals-w2-tender` | 8466a972d8 | 266 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/meals-w3-anchor` | d7e4363e71 | 316 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/meals-w3-fiscal` | edb2fcf680 | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | SILENT RE-ADD verified: tip carries a private IsCreditSale in SaftCashRegisterExportService.MasterData.cs while the merge-base holds none - a plain merge auto-adds it outside any conflict marker |
| `lane/meals-w3-projection` | f94b6a9511 | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/meals-w3-statements` | 98262aabaa | 317 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/meals-xz-credit` | 25586d86bb | 1 | 2026-08-01 | 2/8 | **superseded** | by lane/xz-printed-defects / lane/eod-credit-split — same kredittsalg-on-X/Z intent re-authored 08-04 on a newer base (not patch-eq) |
| `lane/menu-margin-read` | 0735c540d4 | 1 | 2026-07-29 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/mig-stack-record` | a613f026ed | 1 | 2026-08-05 | 0/8 | **superseded** | the trunk's own PENDING-MIGRATIONS-LEDGER moved past it at 93a52938e |
| `lane/mrg-price-correction-2` | 58a6351829 | 4 | 2026-08-03 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/mrg-starter-150` | 8eeacae1f9 | 3 | 2026-08-05 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/mrg-starter-150b` | 9a00da6e3c | 1 | 2026-08-03 | 1/8 | **superseded** | by lane/mrg-starter-150 — sole commit patch-equivalent (git cherry minus) |
| `lane/newsletter-dispatch-reports-its-cause` | 33a99ac479 | 1 | 2026-08-06 | 4/8 | **superseded** | mostly by landed d74c2c87b; residual absent-audit-ledger naming (needles 4/8) — re-check when Growth audit ledger work moves |
| `lane/order-created-utc` | 7a463e9b41 | 216 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/paymenttype-defined-tender` | bd77cd6b0b | 1 | 2026-08-05 | 5/8 | **carries-unlanded-product-work** | undefined-tender guard on the printed fiscal line; needles 5/8 — overlaps the landed tender-naming (bcc8bd179), residual guard+test absent |
| `lane/pdf-creditnote-name` | 015c07ca24 | 2 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/2/0 ev:0/0/0) |
| `lane/phone-in-path` | a60da359b0 | 2 | 2026-08-04 | 0/8 | **superseded** | by lane/route-guard-gaps (ancestor of it) |
| `lane/pinfix` | 03e603603d | 1 | 2026-07-29 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/planned-minutes-honour-lineage` | 589056dfb3 | 4 | 2026-08-06 | 1/8 | **patch-carried** | product fix landed as 726906fe5; DO NOT merge the branch — its rescue-chain ancestry drags world snapshots (census finding D, still true) |
| `lane/pref-cookie-half` | b5a3b1a6be | 1 | 2026-08-06 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/publish-outbox-shape` | 3bb9c039f8 | 1 | 2026-08-06 | 2/6 | **carries-unlanded-product-work** | needle probe 2/6: mostly absent from the trunk tree |
| `lane/push-token-in-path` | 363d3f7fa7 | 2 | 2026-08-04 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/replay-pins-close` | a6583a022f | 7 | 2026-08-04 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/review-residuals-provider` | bd765c7d86 | 3 | 2026-08-02 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/review-residuals-rezone` | 15a1d0b7c3 | 2 | 2026-08-02 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/0/1 ev:0/0/1) |
| `lane/rollback-tracked-sweep` | 118297520d | 1 | 2026-08-03 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/route-guard-gaps` | a5b9e28bab | 3 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/4/5 ev:0/1/6) |
| `lane/statute-honesty` | 485959ab8b | 1 | 2026-08-01 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/supersede-release-attributed` | 42d170c476 | 5 | 2026-08-06 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/7/4 ev:0/0/14) |
| `lane/telemetry-initializer-floor` | 78a59ed6cf | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/0/1 ev:0/0/4) |
| `lane/train-demo-seed-completes` | e824729831 | 5 | 2026-08-06 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:1/4/2 ev:0/0/7) |
| `lane/train-demo-seed-redo` | 2cc5487c3f | 4 | 2026-08-06 | 1/8 | **superseded** | by lane/train-demo-seed-completes (ancestor of it) |
| `lane/train-disclosure` | 06b8b582c1 | 1 | 2026-08-02 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/train-idempotency-refusal` | 01cd5eeeca | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/5/2 ev:0/0/0) |
| `lane/trb2` | ce400f72c3 | 2 | 2026-07-30 | 0/8 | **carries-unlanded-product-work** | Training worker self-service surface (TrainingMeController) — WIP, both commits marked unverified by their author |
| `lane/trn-evidence-names` | b560bc3ab5 | 2 | 2026-08-02 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/utlkvit-reprint-kind` | 88b7307f8d | 1 | 2026-08-03 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/vipps-redact-404` | cb18cab48f | 1 | 2026-08-03 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/1/1 ev:0/0/0) |
| `lane/w0-businessdate` | e7c8d31791 | 1 | 2026-07-29 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/w4s-attendance` | 472742285b | 260 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/w4s-clock` | d426340480 | 261 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/w4s-personalliste` | 7da7e3d0d5 | 260 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/w4s-pos` | 448f3adba1 | 260 | 2026-07-20 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/wf-adjust-address` | f3887f9a17 | 1 | 2026-08-03 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/5/1 ev:0/0/0) |
| `lane/wf-blind-bind-name` | 3b593fef95 | 1 | 2026-08-04 | 2/8 | **superseded** | by lane/wf-link-deadend (ancestor of it) |
| `lane/wf-bootstrap-one-engagement` | 6fa2cbc33f | 3 | 2026-08-03 | 7/8 | **carries-unlanded-product-work** | WorkforceBootstrap* absent at trunk (verified grep); carries a MIGRATION — C2: re-author onto the chain tip, single migration author |
| `lane/wf-bootstrap` | 9d1719dfd5 | 1 | 2026-08-03 | 0/8 | **superseded** | by lane/wf-bootstrap-one-engagement (ancestor of it) |
| `lane/wf-clock-wire` | f14c91ec18 | 1 | 2026-08-03 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/12/3 ev:0/0/0) |
| `lane/wf-contact-imported` | 0b28f60146 | 2 | 2026-08-04 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/wf-correction-path` | 182fa43efc | 2 | 2026-08-04 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/wf-demo-presence` | 8a9080c85b | 1 | 2026-08-01 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/2/0 ev:0/0/0) |
| `lane/wf-digest-tautology` | 4b911917b9 | 1 | 2026-08-04 | 2/4 | **carries-unlanded-product-work** | needle probe 2/4: mostly absent from the trunk tree |
| `lane/wf-exchange-award-ungated` | 2661b752e4 | 1 | 2026-08-04 | 3/8 | **carries-unlanded-product-work** | needle probe 3/8: mostly absent from the trunk tree |
| `lane/wf-exchange-move` | a5ff40f287 | 1 | 2026-08-01 | 3/8 | **carries-unlanded-product-work** | needle probe 3/8: mostly absent from the trunk tree |
| `lane/wf-idempotency-refusal-rest` | 02684ecc15 | 2 | 2026-08-04 | 6/8 | **carries-unlanded-product-work** | family head (refusal stops poisoning its key, all backstops); 6/8 needles are shared service lines - the three-backstop delta and its tests are absent |
| `lane/wf-idempotency-refusal` | a1d572088f | 1 | 2026-08-04 | 3/8 | **superseded** | by lane/wf-idempotency-refusal-rest (ancestor of it) |
| `lane/wf-invite-list-revoke` | 68f2472c90 | 1 | 2026-08-04 | - | **patch-carried** | git cherry: every unique commit patch-equivalent on the trunk |
| `lane/wf-lever-title` | 7404b69695 | 1 | 2026-08-05 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/wf-link-deadend` | a3a526ae98 | 2 | 2026-08-04 | 2/8 | **carries-unlanded-product-work** | needle probe 2/8: mostly absent from the trunk tree |
| `lane/wf-onboard-claim` | de0811f633 | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/1/0 ev:0/0/0) |
| `lane/wf-onboard-demo-run` | de0811f633 | 1 | 2026-08-04 | 0/8 | **superseded** | duplicate ref: same tip de0811f63 as lane/wf-onboard-claim |
| `lane/wf-operator-unique` | c67d092382 | 1 | 2026-08-06 | 7/8 | **carries-unlanded-product-work** | OperatorLinkUniqueness absent at trunk (verified grep); carries a MIGRATION — C2 re-author |
| `lane/wf-personalliste-write` | 1c021dac3a | 316 | 2026-07-21 | - | **pre-fork-must-not-land** | based at 2431883dae; plain merge = 313-420-file conflict storm |
| `lane/wf-push-still-lies` | 100ae00011 | 1 | 2026-08-04 | 1/8 | **carries-unlanded-product-work** | needle probe 1/8: mostly absent from the trunk tree |
| `lane/wf-timeoff-decide-gate` | 1ee483c06f | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/5/0 ev:0/0/0) |
| `lane/wf-timesheet-race` | bc9c7e9699 | 2 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/5/2 ev:0/0/3) |
| `lane/wf-timesheet-wire` | da452fe248 | 2 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/0/1 ev:0/0/1) |
| `lane/wf-withheld-bound` | 74405b34d0 | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/4/1 ev:0/0/0) |
| `lane/wire-containment-fix` | 6d2a526f51 | 3 | 2026-07-29 | 8/8 | **patch-carried** | needles 8/8 — carried via L-WF-PUSH-LAND (569887a51) |
| `lane/wolt-sync-unregistered` | 3c7b28ee03 | 1 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/2/1 ev:0/0/6) |
| `lane/xz-credit-fields` | 9bdfc26739 | 1 | 2026-08-04 | 0/8 | **superseded** | ancestor of both live heads lane/xz-printed-defects and lane/eod-credit-split |
| `lane/xz-printed-defects` | 6c394057ef | 4 | 2026-08-04 | 0/8 | **carries-unlanded-product-work** | needle probe 0/8: distinctive added lines absent from the trunk tree (probe prod:0/6/4 ev:0/0/0) |
