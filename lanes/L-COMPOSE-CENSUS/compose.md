# Composition census — what is on the branches, and the order to bring it together

**Lane:** L-COMPOSE-CENSUS · **Date:** 2026-08-04 · **Merges performed: none. Pushes: none. Checkouts: none.**

Frontend tip `e34977ac` (`feature/restaurant-modules`, `/Users/svendaneel/okam/Web-modules`).
Backend tip `8e2b57de` (`feature/restaurant-modules`, `/Users/svendaneel/okam/OkamAPI-modules`) — read from
`refs/heads/feature/restaurant-modules`, **not** from that checkout's working tree, which has
`lane/meals-grace-pins` out and 4 dirty files.

Every number below is produced by a script in `data/`. Nothing is hand-counted. The regeneration
command is in Appendix A. Where a figure in my brief disagreed with the measurement, the measurement
is recorded and the brief's figure is named as wrong — that was the instruction and it was the right one,
because **five of the brief's factual claims did not survive contact with the refs.**

---

## 1. The headline

| | frontend | backend |
|---|---:|---:|
| refs total | 95 | 315 |
| contained (ancestor of tip — merging is a no-op) | 22 | 128 |
| outstanding, live | 73 | 111 |
| outstanding, stale epoch (not live work) | 0 | 76 |
| superseded by another live branch | 12 | 30 |
| excluded by ruling (cannot be merged as-is) | 0 | 2 |
| **mergeable heads — the real composition surface** | **61** | **78** |

**139 heads, not 260.** The raw "ahead of tip" figure overstates the work by 46% because it counts
branches that another branch already contains, refs that are aliases of one commit, and an entire
superseded epoch.

---

## 2. Corrections to the brief

The brief asked to be treated as claims to test. Seven were, and five failed.

**2.1 — "74 frontend branches ahead." It is 73.** `data/branches.sh`. Backend's 187 is correct.

**2.2 — "249 plan lanes are built-unverified or verified." It is 250 lanes** (256 if every entity kind
is counted, not just Lanes). `data/extract_lanes.py`.

**2.3 — "~117 distinct branch strings, some false positives from evidence prose." The correction runs
the opposite way from what the brief assumed.** The naive extraction — every backtick token containing
`/` inside a qualifying block — yields **189** tokens, of which 108 are extension-less (that is where
~117 came from). But only **39** carry a branch-like prefix. So the plan's prose does not *over*-name
branches needing pruning; it **under-names them by a factor of six**: 39 strings named against 260 refs
actually ahead of the tips. **The plan prose cannot be used as the population.** Everything here is
derived from refs instead. This matters beyond bookkeeping: any composition driven off the plan's
narrative would have silently omitted ~85% of the live branches.

**2.4 — "nine `a1`–`b3` lanes at 380 ahead each." There are eight, and they are one commit.**
`lane/a1-store-country`, `a2-growth-flake`, `a3-tx-gate`, `a5-events-w4`, `a6-meals-minors`,
`b1-training-w3`, `b2-wf-exchange`, `b3-wf-timesheets` — there is no `a4` — and **all eight refs point at
the identical commit `e88af796`.** They are one unit of content under eight names, not nine units.

**2.5 — feature/POS: the conclusion is right, the evidence cited for it is wrong.** POS is 0 ahead in
both repos and the backend merge-base *is* the POS tip, so it is a strict ancestor and merging it is a
no-op — the brief's conclusion holds and nothing needs to come across. But the brief's stated proof,
"**0 files differing**", is false: **1636 files differ** between the backend tip and the POS tip, and
**516** in the frontend. That is expected — we are 411 and 105 commits ahead — but it means the figure
was never the evidence. The evidence is `ahead=0`. A future reader checking "0 files differing" would
find 1636 and conclude, wrongly, that containment had broken.

**2.6 — `lane/wf-w5-timesheet` + `lane/wf-digest-tautology` is not a pair. It is containment.**
`wf-w5-timesheet` is a **strict ancestor** of `wf-digest-tautology` (`git merge-base --is-ancestor`
returns true; 0 commits unique to w5, 1 unique to digest). They touch the same 116 files, 115 of them
byte-identical. **Merging `wf-digest-tautology` alone lands both** — that is the correct action. The
brief's stated failure mode ("merging either half alone") does not exist here; the actual risk is the
opposite, that someone merges `wf-w5-timesheet` believing it is a required half and lands a strict
subset. The measurement generalises: **11 branches contain `wf-w5-timesheet`.**

**2.7 — `lane/pdf-creditnote-name` does not supersede `lane/credit-note-number`.** Neither is a subset of
the other. Both change exactly two files. `Controllers/InvoicesController.cs` is **byte-identical on both**
(blob `5f4e262c`) — the production fix is literally the same change. Only
`WebApi.Tests/Wire/PdfDownloadWireTests.cs` differs. This is **production-identical / test-divergent**,
not supersession, and it is a textbook instance of the hazard in §4: a file-name collision matrix scores
`InvoicesController.cs` as a collision when the two branches agree on it exactly, and the only real
decision is which test assertions to keep.

The one pair the brief named that **is** a genuine pair is the cross-repo one:
`lane/wf-invite-list-revoke` (backend) with `lane/fe-wf-invite-list-revoke` (frontend). They share no
files — they are in different repositories — so the coupling is **contract, not content**, and it is a C3
obligation: landing the frontend alone ships a control that calls an endpoint that does not exist;
landing the backend alone ships an endpoint no surface reaches.

---

## 3. C2 — the migration set, and the one genuine fork

**15 live branches add a migration the tip does not have.** The brief anticipated a fork. The measurement
says something more useful.

**Fourteen of the fifteen carry strict prefixes of one shared 10-deep stack.** Sorted by depth: 4, 5, 5,
5, 6, 6, 7, 8, 9, 9, 9, 10. Every one of those sets is a prefix of the deepest. So they are **one chain
carried at twelve different depths, not fourteen competing chains** — which is the "migration stack whose
depth was wrong four times running" the plan already records, seen from above. There is no snapshot fork
among them, and no two of them claim the same slot with different content.

**The fifteenth is a real fork, and it is worse than a fork.** `lane/margin-finalize-lag` adds
`20260731203011_Margin_PeriodStatementFinalizedImmutable`. The stack's fourteen carry the same logical
migration as `20260801084923_Margin_PeriodStatementFinalizedImmutable`. Two ids, one change. And
`20260731203011` **sorts before the tip's current chain tip `20260731220005_Workforce_IdentityCodeRegisterIssues`**.

Merging it does two separate kinds of damage:
1. it inserts a migration **behind** the chain tip, so a replay from empty applies it in an order nobody
   tested and an already-migrated database has a history row ordering that no longer matches the chain; and
2. combined with any of the other fourteen it lands **the same table change twice** — the exact
   `SqlException 2705` shape already recorded in this estate's history for `Orders.TableId`.

**Ruling for the order: `lane/margin-finalize-lag` is not mergeable. Its non-migration content must be
rebuilt on top of the stack, and its migration dropped in favour of `20260801084923`.** This is a
rebuild, not a merge, and it needs the one migration author.

**The consequence that shapes the whole backend order:** because the fourteen are prefixes, **landing the
deepest head first dissolves the problem for the other six.** After `lane/wf-bootstrap-one-engagement`
(10 migrations) is in, every remaining migration-bearing head contributes **zero** new migration files,
and only its code delta remains. The serialised set is therefore one step, not seven.

---

## 4. The collision matrix, and why it is keyed on blobs

**A matrix keyed on "which files do both branches touch" reports agreement and collision as the same
thing.** Tonight's Events finding is the proof: `Helpers/Events/EventsGuestLink.cs` is carried by
`lane/ev-uri-relative`, `lane/ev-vipps-fallback` and `lane/ev-vipps-fallback-2` as the **byte-identical
blob `087f675d`**, and the tip does not have the file at all. Any two of those three merge **add/add,
clean, silently.** A name-keyed matrix would flag three collisions that do not exist, and would say
nothing about the divergence that does — which lives in a different file entirely.

So every shared path here is labelled from `git diff --raw` blob hashes:

- **concordant** — both branches produce the *same* blob. Merges clean. Contributes no decision.
- **colliding** — both branches produce *different* blobs. This is the real surface.

Measured over mergeable heads: **frontend 768 colliding pairs, backend 376.**

**The surface is dominated by a small number of hub files**, and this is the single most useful fact for
sequencing:

| frontend hub | heads touching |
|---|---:|
| `translations/de.ts` | 37 |
| `translations/en.ts` | 37 |
| `translations/no.ts` | 37 |
| `test/e2e/fixture/api-server.js` | 18 |
| `test/e2e/fixture/world.js` | 11 |
| `components/organisms/AdminPageHeader.vue` | 9 |
| `utils/workforce/roster-client.js` | 9 |

| backend hub | heads touching |
|---|---:|
| `Program.cs` | 17 |
| `artifacts/journeys/ev-dietary/run-sheet.json` | 12 |
| `artifacts/tests/README.md` | 10 |
| `docs/plans/PENDING-MIGRATIONS-LEDGER.md` | 9 |
| `WebApi.Tests/Wire/WireHostFixture.cs` | 9 |

Three translations files touched by 37 heads generate 37×36/2 = 666 of the frontend's pairs on their own.
**These are append-shaped conflicts** — each lane adds its own keys — so they resolve mechanically, and
that is exactly what makes them dangerous under `F-THE-CONFLICT-IS-A-DECOY`: a merge that resolves
`translations/*.ts` by concatenation looks like the whole event, while the damage lands in the `.vue`
file that auto-merged beside it.

---

## 5. Cannot be composed at all

**5.1 — `F-CORE-PIN-ON-NO-REMOTE` (blocker, Sven's).** Verified independently, not taken from the flag:
`feature/restaurant-modules` pins the `core` submodule at `1bcab0b6`; inside the submodule,
`git branch -r --contains 1bcab0b6` returns **nothing** and `git branch -a --contains` returns exactly one
ref, the **local, unpushed** `lane/core-ore-label`. **A fresh clone of either branch cannot check out its
dependency, cannot build and cannot test.** Every step below is therefore provable only in an existing
populated worktree until this is pushed. **Noted, not fixed — the remedy is a push and that is the owner's.**

It also silently changes what a green means: an unpopulated submodule hid 36 tests behind a healthy-looking
total, so **any receipt taken after a merge must state whether its submodule was populated**, or it cannot
be compared with any other receipt.

**5.2 — the 76 backend stale-epoch branches.** `feature/restaurant-control-stage0` (387 ahead, 2140-file
delta) and 75 others sit 300–521 commits behind the tip. The behind-distance histogram is cleanly bimodal —
**nothing at all between 150 and 300** — so the cut is not a judgement call. This is a superseded parallel
stack, not live lane work. They are classified and excluded, and none appears in the order.

**5.3 — `lane/margin-finalize-lag`.** §3. Rebuild, not merge.

**5.4 — `lane/ev-vipps-fallback-2`.** Ruled against by `L-EV-GUESTLINK-ONE-COMPOSER`, and the ruling
survives my check. It is `lane/ev-vipps-fallback` minus `Services/Events/EventsEmailNotificationDelivery.cs`,
plus two divergent files — one of which is `CredentialCompositionSweepTests.cs`, where the branch **rewrote
the allowlist's own justification**, replacing "the path shape and the origin validation live in
EventsGuestLink … the single place that changes" with "the method's own summary records the open decision …
this is the single place that changes". **The test that exists to notice a second composer was edited to
stop noticing.** Land `9e3a607b`; `lane/ev-uri-relative` carries the only tests
(`WebApi.Tests/Events/EventsGuestLinkOriginTests.cs` exists on no other branch).

---

## 6. The proposed order, and the re-run point after each step

The order is derived by `data/order.py`. The governing principle: **a branch's own green does not
transfer**, so each step names what must be re-run *after* it and why. Steps are per-repository; the
backend leads because the frontend's contract pairs depend on it.

### Backend

**B0 — before anything.** Rebuild `lane/margin-finalize-lag` onto the stack and drop its duplicate
migration (§3). This is the one migration author's work and it blocks nothing else; it is first only
because doing it later means doing it against a moved chain.
*Re-run after:* nothing yet — nothing has merged.

**B1 — `lane/wf-bootstrap-one-engagement` (10 migrations, the deepest stack).** One merge lands the whole
shared migration stack.
*Re-run after, and this is the load-bearing one:* **the full SQL tier against a database built by replaying
the chain from empty**, specifically `RestaurantModulesMigrationRoundTripTests`. **No branch's recorded
green covers this.** Every one of the fifteen adders measured its own green against a chain of a different
depth — that is what "the depth was wrong four times running" means — so the composed chain has been run by
nobody. This is also where `C2`'s "the chain is the truth, not the model" is actually tested: the snapshot
will agree with itself either way.

**B2 — the remaining six migration-bearing heads**, in the order `ef-index-shadow-sweep`,
`wf-timesheet-race`, `review-residuals-rezone`, `wf-digest-tautology`, `wf-timesheet-wire`,
`margin-waste-500`. After B1 each contributes **zero** new migration files, so these are ordinary code merges.
*Re-run after each:* that module's service-level suite only. **Do not re-run the replay** — the chain did not
change. Re-running it here is the failure mode that makes people trust a green that measured nothing.

**B3 — the Events composition pair: `lane/ev-vipps-fallback` (`9e3a607b`) then `lane/ev-uri-relative`.**
Exclude `-2`.
*Re-run after:* the Events suites **and a human reading the composer set**. `CredentialCompositionSweepTests`
**must not be the evidence here** — its allowlist is satisfied by both the helper form and the inline form,
so it stays green whether there is one composer or two. Count them by reading. This is the clearest case in
the whole census of a test whose green is not about the thing it is named for.

**B4 — the 34 hub-touching heads**, `Program.cs` first-degree descending.
*Re-run after each:* the composition-root / DI reachability tests (C3). A `Program.cs` merge that resolves
cleanly by accepting both registration blocks can still leave a service registered twice or a route
unreachable, and neither shows up as a conflict.

**B5 — the 25 remaining collision heads**, then **B6 — the 12 degree-0 heads, which can go in any order and
in parallel.**
*Re-run after B6:* one whole-assembly run, as the composition receipt.

### Frontend

**F1 — the 43 hub-touching heads, translations-first-degree descending.** There is no migration constraint
in this repo, so the hub files are the entire sequencing problem.
*Re-run after each:* the journey specs under `test/e2e/journeys/` **plus** `test/admin-nav-access.test.js`.
A `translations/*.ts` merge resolved by concatenation can drop or duplicate a key that a journey asserts on
screen, and the conflict will have been in the translations file while the damage shows in the page.

**F2 — the 8 remaining collision heads. F3 — the 10 degree-0 heads, parallel.**

**F4 — the cross-repo contract pair.** `lane/fe-wf-invite-list-revoke` lands **only after** backend
`lane/wf-invite-list-revoke`.
*Re-run after:* the invite journey against the **live backend**, not the Node fixture. The fixture answers
the contract by construction, so it cannot fail the way a missing endpoint fails — a fixture-backed green
here proves nothing about the pair.

### The re-run point that applies to every step

**After any merge, the receipt must state whether the `core` submodule was populated** (§5.1). Two receipts
at identical source differ by 36 tests depending on that, and a comparison across the boundary is
meaningless without it. Until `F-CORE-PIN-ON-NO-REMOTE` clears, no step below can be proven from a fresh
clone at all.

---

## 7. What this census does not establish

- **It does not prove any merge is clean.** Collision is computed from blob identity in each branch's own
  delta; whether git's three-way merge succeeds is a different question and was deliberately not asked,
  because a clean merge is not the same as a correct one — which is the entire content of
  `F-THE-CONFLICT-IS-A-DECOY`.
- **It does not judge whether a branch's work is good**, only where it sits and what it touches.
- **The live/stale cut at behind<150 is a measured gap, not a semantic judgement.** The histogram is empty
  between 150 and 300, so the cut is safe today; it would need re-deriving, not re-using, if branches move.
- **The 258 dirty files in the frontend checkout are not classified.** They are not on any ref. The brief
  cited 204→246 for that drift; it now reads **258**, which is consistent with the brief's warning that the
  shared checkout accumulates hunks no lane author wrote, and is a reason no step above should be executed
  in that checkout.

---
---

## 8. The fourth bucket — not-a-branch

The brief expected the extracted strings to need pruning for false positives from evidence prose
(`.md` and `.trx` paths). Measured: **of the 39 branch-shaped strings the plan's qualifying blocks name,
all 39 resolve to a real local ref — none is a false positive.** 1 exists in both repositories, 3 only in
the frontend, 35 only in the backend.

The false positives are real but they live entirely in the **150 tokens my filter had already excluded**
— `artifacts/tests/50b85657/RUN.md`, `test/e2e/fixture/api-server.js` and the like, which are file paths,
not refs. So the naive 189-token extraction is ~79% file paths and 21% branches, and the pruning problem
the brief described is solved by requiring a branch-shaped prefix, not by checking each string against git.

**The residual risk is the opposite one and it is not solved by pruning:** the plan names 39 branches while
260 refs sit ahead of the tips (§2.3). Nothing in the plan's prose would tell a reader that 221 branches
carrying live or superseded work exist. That is why the population for this census is `refs/heads`, and why
it should stay that way for any composition step that follows.

---

## Appendix A — full classification, every branch in both repositories

Generated by `data/classify.py` -> `data/analyze.py` -> `data/supersede.py` -> `data/order.py`.
Regenerate: `python3 data/classify.py && python3 data/analyze.py && python3 data/supersede.py && python3 data/migrations.py && python3 data/order.py && python3 data/render.py`


### Web-modules (frontend) — 95 refs

| bucket | n | proof |
|---|---:|---|
| contained (ancestor of tip; merge is a no-op) | 22 | `git rev-list --left-right --count TIP...B` -> ahead=0 |
| contained by content only (tree equal, ref ahead) | 0 | `git merge-tree --write-tree TIP B` == `TIP^{tree}` |
| outstanding, live | 73 | ahead>0, behind<150 |
| outstanding, stale epoch | 0 | ahead>0, behind>=300 |
| ...of live, superseded by another live branch | 12 | `git merge-base --is-ancestor B C` |
| ...of live, excluded by ruling | 0 | see Cannot-compose |
| **mergeable heads** | **61** | not superseded, alias-collapsed, not excluded |

**Contained (ancestor) — merge is a no-op, do not merge:**

`feature/POS`, `feature/restaurant-modules`, `lane/admin-nav-links`, `lane/events-margin-client`, `lane/fe-events-guest`, `lane/fe-growth-guest`, `lane/fe-growth-honesty`, `lane/fe-margin-statement`, `lane/fe-margin-supplier`, `lane/fe-meals-claim`, `lane/fe-meals-write`, `lane/fe-playwright`, `lane/fe-training-fixes`, `lane/fe-wf-inbox`, `lane/fe-wf-personnel`, `lane/fe-wf-supplement-basis`, `lane/modal-scrolllock`, `lane/modal-seven`, `lane/store-market-ui`, `lane/wf-invite-surface`, `main`, `swiss`


**Superseded — its content lands via the branch named; merging both lands it twice:**

| superseded branch | superseded by |
|---|---|
| `lane/ev-journey-timebomb` | `lane/journey-teardown` |
| `lane/fe-growth-prefcentre` | `lane/fe-gr-withdraw-origin` |
| `lane/fe-journeys` | `lane/fe-training-meals-surfaces` |
| `lane/fe-pos-clock` | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend`, `lane/fe-wf-oplink` |
| `lane/fe-wf-blind-bind-name` | `lane/fe-wf-link-deadend` |
| `lane/fe-wf-onboard` | `lane/fe-wf-self` |
| `lane/fe-wf-oplink` | `lane/fe-wf-blind-bind-name`, `lane/fe-wf-link-deadend` |
| `lane/meals-enrol-ui` | `lane/meals-enrol-pretick` |
| `lane/offer-partial-subtotal` | `lane/offers-page-hundredfold` |
| `lane/price-cleanup-two` | `lane/offer-partial-subtotal`, `lane/offers-page-hundredfold` |
| `lane/print-host` | `lane/ev-stale-cause`, `lane/statute-evidence-world`, `lane/statute-honesty` |
| `lane/statute-honesty` | `lane/ev-stale-cause`, `lane/statute-evidence-world` |

**Mergeable heads, in the proposed order:**


*T2 — touches a hub file (>=5 heads touch it)* (43):

- `lane/fe-training-meals-surfaces` — collides with 45 other head(s)
- `feature/swiss` — collides with 42 other head(s)
- `lane/ev-stale-cause` — collides with 42 other head(s)
- `lane/fe-events-margin-surfaces` — collides with 42 other head(s)
- `lane/statute-evidence-world` — collides with 42 other head(s)
- `lane/fe-wf-invite-list-revoke` — collides with 41 other head(s)
- `lane/fe-wf-link-deadend` — collides with 41 other head(s)
- `lane/fe-wf-self` — collides with 41 other head(s)
- `lane/journey-workforce` — collides with 41 other head(s)
- `lane/menu-allergen-matrix` — collides with 41 other head(s)
- `lane/train-evidence-pack-ui` — collides with 41 other head(s)
- `lane/wf-kodeoversikt-ui` — collides with 41 other head(s)
- `lane/wf-pubhist` — collides with 41 other head(s)
- `lane/wf-roles-ui` — collides with 41 other head(s)
- `lane/margin-menu-margin-ui` — collides with 38 other head(s)
- `lane/meals-admin` — collides with 38 other head(s)
- `lane/meals-enrol-pretick` — collides with 38 other head(s)
- `lane/events-admin` — collides with 37 other head(s)
- `lane/fe-meals-statement-surface` — collides with 37 other head(s)
- `lane/margin-recipes` — collides with 37 other head(s)
- `lane/training-admin` — collides with 37 other head(s)
- `lane/coercion-write-paths` — collides with 36 other head(s)
- `lane/fe-meals-claim-receipt` — collides with 36 other head(s)
- `lane/fe-meals-reconcile-ui` — collides with 36 other head(s)
- `lane/fe-wf-bootstrap` — collides with 36 other head(s)
- `lane/fe-wf-contact-imported` — collides with 36 other head(s)
- `lane/fe-wf-correction-path` — collides with 36 other head(s)
- `lane/growth-admin` — collides with 36 other head(s)
- `lane/meals-reachable-web` — collides with 36 other head(s)
- `lane/mrg-coverage-unknown` — collides with 36 other head(s)
- `lane/mrg-lag-visible` — collides with 36 other head(s)
- `lane/mrg-recipe-revise-ui` — collides with 36 other head(s)
- `lane/mrg-waste-frontend` — collides with 36 other head(s)
- `lane/train-readonly-visible` — collides with 36 other head(s)
- `lane/wf-adjust-address` — collides with 36 other head(s)
- `lane/wf-idreg` — collides with 36 other head(s)
- `lane/workforce-roster` — collides with 36 other head(s)
- `lane/L-JOURNEY-GROWTH` — collides with 19 other head(s)
- `lane/modal-broken-two` — collides with 19 other head(s)
- `lane/fe-gr-withdraw-origin` — collides with 18 other head(s)
- `lane/journey-teardown` — collides with 18 other head(s)
- `lane/fe-gr-exit-wire-the-mail` — collides with 17 other head(s)
- `lane/price-crosscurrency` — collides with 9 other head(s)

*T3 — other collisions* (8):

- `lane/fe-meals-docsync` — collides with 4 other head(s)
- `lane/L-JOURNEY-PROXY-BLINDSPOT` — collides with 2 other head(s)
- `lane/mrg-page-test-vacuous` — collides with 2 other head(s)
- `lane/offers-page-hundredfold` — collides with 2 other head(s)
- `lane/tier-artifacts` — collides with 2 other head(s)
- `lane/train-publish-unclickable` — collides with 2 other head(s)
- `lane/L-JOURNEY-PORT-HARDCODED` — collides with 1 other head(s)
- `lane/fe-admin-refusal-credential` — collides with 1 other head(s)

*T4 — independent, degree 0, parallelisable* (10):

- `lane/L-PRICE-SHADOW-GUARD` — collides with 0 other head(s)
- `lane/ev-guestlink-one-composer` — collides with 0 other head(s)
- `lane/exit-instrument-census` — collides with 0 other head(s)
- `lane/fe-ci` — collides with 0 other head(s)
- `lane/fe-ev-inquiry-gate` — collides with 0 other head(s)
- `lane/fe-journey-meals` — collides with 0 other head(s)
- `lane/mrg-revise-land` — collides with 0 other head(s)
- `lane/mrg-waste-receipts` — collides with 0 other head(s)
- `lane/wf-timesheet-ui` — collides with 0 other head(s)
- `lane/worktree-basename-pin` — collides with 0 other head(s)

**Hub files (the collision surface), by how many heads touch each:**

- `translations/de.ts` — 37 heads
- `translations/en.ts` — 37 heads
- `translations/no.ts` — 37 heads
- `test/e2e/fixture/api-server.js` — 18 heads
- `test/e2e/fixture/world.js` — 11 heads
- `components/organisms/AdminPageHeader.vue` — 9 heads
- `utils/workforce/roster-client.js` — 9 heads
- `test/admin-nav-access.test.js` — 7 heads
- `pages/admin/workforce-roster.vue` — 6 heads
- `components/admin/events/EventsJourney.vue` — 5 heads
- `pages/admin/workforce-personnel-list.vue` — 5 heads
- `components/admin/workforce/WorkforceEngagementPanel.vue` — 5 heads
- `test/workforce-roster-client.test.js` — 5 heads

### OkamAPI-modules (backend) — 315 refs

| bucket | n | proof |
|---|---:|---|
| contained (ancestor of tip; merge is a no-op) | 128 | `git rev-list --left-right --count TIP...B` -> ahead=0 |
| contained by content only (tree equal, ref ahead) | 0 | `git merge-tree --write-tree TIP B` == `TIP^{tree}` |
| outstanding, live | 111 | ahead>0, behind<150 |
| outstanding, stale epoch | 76 | ahead>0, behind>=300 |
| ...of live, superseded by another live branch | 30 | `git merge-base --is-ancestor B C` |
| ...of live, excluded by ruling | 2 | see Cannot-compose |
| **mergeable heads** | **78** | not superseded, alias-collapsed, not excluded |

**Contained (ancestor) — merge is a no-op, do not merge:**

`feature/restaurant-modules`, `land/meals-posrel`, `lane/adminaudit`, `lane/ai-middleware-delete`, `lane/attend-round`, `lane/attribution-migrations`, `lane/composition-root-check`, `lane/confirm-conat-retire`, `lane/confirm-postmerge-pin`, `lane/confirm-server-halves`, `lane/crypto-pin-byform`, `lane/d01-epoch-cutover`, `lane/d1-race-verify`, `lane/demo5`, `lane/download-headers`, `lane/download-pdf-wire`, `lane/email-pii-redaction`, `lane/epoch-margin`, `lane/epoch-meals`, `lane/epoch-training`, `lane/ev-accept-gate`, `lane/ev-capture`, `lane/ev-dietary`, `lane/ev-guest-origin`, `lane/ev-port-contract`, `lane/ev-rails`, `lane/ev-sweep`, `lane/ev-token`, `lane/ev-vat`, `lane/evb4fix`, `lane/events-admin-reads`, `lane/events-currency`, `lane/events-deadletter-surface`, `lane/events-deposit-order-of-writes`, `lane/events-lineage-census`, `lane/events-manual-actor`, `lane/events-next`, `lane/events-settlement-409`, `lane/fkmask`, `lane/flagguard`, `lane/gr-confirm-stale`, `lane/gr-confirmed-email`, `lane/gr-delivery-record`, `lane/gr-dispatch-actor`, `lane/gr-testsend-guard`, `lane/gr-testsend-ratelimit`, `lane/growth-audit-ledger`, `lane/growth-consent-text`, `lane/growth-mail-postmark`, `lane/growth-next`, `lane/growth-privacy`, `lane/growth-privacy-evidence`, `lane/growth-reach`, `lane/growth-seed-idempotent`, `lane/growth-shred-sweep`, `lane/growth-webhook-auth`, `lane/growth-wire`, `lane/invite-claim-refusal`, `lane/invoice-authorize`, `lane/invoice-retry-retirement`, `lane/kassa-journal-triggers`, `lane/live-world-seed`, `lane/margin-currency`, `lane/margin-next`, `lane/margin-product-link-guard`, `lane/margin-reachability`, `lane/margin-refusal-codes`, `lane/margin-revision-split`, `lane/margin-seed-collision`, `lane/margin-xcurrency`, `lane/meals-audit-choke`, `lane/meals-fiscal-scoping`, `lane/meals-gate`, `lane/meals-next`, `lane/meals-pos-tender-wire`, `lane/meals-race-tests`, `lane/meals-reach`, `lane/meals-release`, `lane/meals-reservation-wire`, `lane/meals-statement-immutable`, `lane/meals-utlkvit`, `lane/meals-violation-exact`, `lane/mealscfg`, `lane/mealsdrift`, `lane/module-audit-pins`, `lane/money-path-attribution`, `lane/pdf-nullderef`, `lane/pii-log-sweep`, `lane/piiallow`, `lane/pinfixes`, `lane/pinharden`, `lane/plan-doc-corrections`, `lane/poweruser-pin-realign`, `lane/poweruser-seed-honesty`, `lane/reachsweep`, `lane/reservation-limiter-move`, `lane/rule34`, `lane/rulepack-jurisdictions`, `lane/schedule-publication-immutable`, `lane/sqlserver-trait-hygiene`, `lane/store-market-columns`, `lane/swallow`, `lane/train-demo-seed`, `lane/train-evidence-endpoint`, `lane/train-evidence-pins`, `lane/trainflags`, `lane/training-cas-guard`, `lane/training-etag`, `lane/training-evidence-surface`, `lane/training-next`, `lane/trainrev`, `lane/trainwire`, `lane/unsub-oneclick`, `lane/utlkvit-replay-source`, `lane/utlkvit-sale-row`, `lane/verified-claims-audit`, `lane/w3-labour-band`, `lane/wf-cost-stability`, `lane/wf-gate`, `lane/wf-push-notify`, `lane/wf-push-silent`, `lane/wf-schedimm2`, `lane/wf-supplements`, `lane/wf-violation-exact`, `lane/wire-tier-rowversion`, `lane/workforce-audit-actor`, `lane/workforce-next`, `master`


**Superseded — its content lands via the branch named; merging both lands it twice:**

| superseded branch | superseded by |
|---|---|
| `integration/mig-stack-land` | `lane/ef-index-shadow-sweep`, `lane/wf-bootstrap-one-engagement`, `lane/wf-timesheet-race` |
| `lane/acct-uidx` | `integration/mig-stack-land`, `lane/ef-index-shadow-sweep`, `lane/wf-bootstrap-one-engagement`, `lane/wf-timesheet-race` |
| `lane/ev-extdep` | `lane/ev-extdep-guards` |
| `lane/flags-effective-resolvers` | `lane/flags-excuse-byflag` |
| `lane/gr-deadline-onwire` | `integration/confirm-family`, `lane/gr-deadline-statute` |
| `lane/gr-deadline-statute` | `integration/confirm-family` |
| `lane/gr-postmark-webhook` | `integration/confirm-family` |
| `lane/growth-health-honest` | `lane/review-residuals-provider` |
| `lane/growth-newsletter-wire` | `lane/gr-newsletter-cross-verify` |
| `lane/growth-prefcentre` | `lane/cors-credentialed-origin`, `lane/gr-withdraw-origin`, `lane/meals-reachable-api` |
| `lane/margin-price-correction` | `lane/mrg-price-correction-2` |
| `lane/margin-waste` | `integration/mig-stack-land`, `lane/acct-uidx`, `lane/ef-index-shadow-sweep`, `lane/margin-waste-500`, `lane/mig-company-receivable`, `lane/review-residuals-rezone`, `lane/wf-adjustment-ordinal`, `lane/wf-bootstrap-one-engagement`, `lane/wf-digest-tautology`, `lane/wf-export-duplicate`, `lane/wf-timesheet-race`, `lane/wf-timesheet-wire`, `lane/wf-w5-timesheet` |
| `lane/meals-agreement-pin-inverts` | `lane/replay-pins-close` |
| `lane/meals-degenerate-two` | `lane/meals-fourway-tier`, `lane/meals-quote-retry`, `lane/meals-supersede-sql` |
| `lane/meals-eighth-pin` | `lane/meals-eighth-read`, `lane/meals-quote-retry` |
| `lane/meals-floor-pins` | `lane/meals-fourway-tier`, `lane/meals-quote-retry`, `lane/meals-supersede-sql` |
| `lane/meals-fourway-tier` | `lane/meals-quote-retry`, `lane/meals-supersede-sql` |
| `lane/meals-grace-pins` | `lane/meals-fourway-tier`, `lane/meals-quote-retry`, `lane/meals-supersede-sql` |
| `lane/meals-idempotency-refusal` | `lane/meals-agreement-pin-inverts`, `lane/replay-pins-close` |
| `lane/meals-requote-release` | `lane/meals-eighth-pin`, `lane/meals-eighth-read`, `lane/meals-fourway-tier`, `lane/meals-quote-retry`, `lane/meals-supersede-sql` |
| `lane/meals-supersede-sql` | `lane/meals-quote-retry` |
| `lane/mig-company-receivable` | `integration/mig-stack-land`, `lane/acct-uidx`, `lane/ef-index-shadow-sweep`, `lane/wf-bootstrap-one-engagement`, `lane/wf-timesheet-race` |
| `lane/phone-in-path` | `lane/route-guard-gaps` |
| `lane/wf-adjustment-ordinal` | `integration/mig-stack-land`, `lane/acct-uidx`, `lane/ef-index-shadow-sweep`, `lane/mig-company-receivable`, `lane/wf-bootstrap-one-engagement`, `lane/wf-timesheet-race` |
| `lane/wf-blind-bind-name` | `lane/wf-link-deadend` |
| `lane/wf-bootstrap` | `lane/wf-bootstrap-one-engagement` |
| `lane/wf-export-duplicate` | `integration/mig-stack-land`, `lane/acct-uidx`, `lane/ef-index-shadow-sweep`, `lane/mig-company-receivable`, `lane/review-residuals-rezone`, `lane/wf-adjustment-ordinal`, `lane/wf-bootstrap-one-engagement`, `lane/wf-timesheet-race` |
| `lane/wf-idempotency-refusal` | `lane/replay-pins-close`, `lane/wf-idempotency-refusal-rest` |
| `lane/wf-w5-timesheet` | `integration/mig-stack-land`, `lane/acct-uidx`, `lane/ef-index-shadow-sweep`, `lane/mig-company-receivable`, `lane/review-residuals-rezone`, `lane/wf-adjustment-ordinal`, `lane/wf-bootstrap-one-engagement`, `lane/wf-digest-tautology`, `lane/wf-export-duplicate`, `lane/wf-timesheet-race`, `lane/wf-timesheet-wire` |
| `lane/xz-credit-fields` | `lane/eod-credit-split`, `lane/xz-printed-defects` |

**Alias groups — one commit under several refs (one unit of work, not several):**

- `de0811f63` = `lane/wf-onboard-claim`, `lane/wf-onboard-demo-run`

**Mergeable heads, in the proposed order:**


*T1 — migration-bearing (C2 serialised set, deepest first)* (7):

- `lane/wf-bootstrap-one-engagement` — collides with 38 other head(s) **+10 migrations**
- `lane/ef-index-shadow-sweep` — collides with 33 other head(s) **+9 migrations**
- `lane/wf-timesheet-race` — collides with 33 other head(s) **+9 migrations**
- `lane/review-residuals-rezone` — collides with 33 other head(s) **+6 migrations**
- `lane/wf-digest-tautology` — collides with 33 other head(s) **+5 migrations**
- `lane/wf-timesheet-wire` — collides with 33 other head(s) **+5 migrations**
- `lane/margin-waste-500` — collides with 19 other head(s) **+4 migrations**

*T2 — touches a hub file (>=5 heads touch it)* (34):

- `lane/trb2` — collides with 26 other head(s)
- `lane/train-disclosure` — collides with 23 other head(s)
- `lane/wf-push-still-lies` — collides with 20 other head(s)
- `lane/ev-accept-receipt` — collides with 18 other head(s)
- `lane/ev-extdep-guards` — collides with 18 other head(s)
- `lane/flags-excuse-byflag` — collides with 18 other head(s)
- `lane/review-residuals-provider` — collides with 18 other head(s)
- `lane/wf-correction-path` — collides with 18 other head(s)
- `land/meals-posrel-v1` — collides with 17 other head(s)
- `lane/cors-credentialed-origin` — collides with 17 other head(s)
- `lane/cors-followups` — collides with 17 other head(s)
- `lane/gr-withdraw-origin` — collides with 17 other head(s)
- `lane/meals-reachable` — collides with 17 other head(s)
- `lane/meals-reachable-api` — collides with 17 other head(s)
- `lane/wf-contact-imported` — collides with 17 other head(s)
- `lane/meals-quote-retry` — collides with 16 other head(s)
- `lane/meals-release-actor` — collides with 15 other head(s)
- `lane/meals-release-race` — collides with 13 other head(s)
- `integration/confirm-family` — collides with 12 other head(s)
- `lane/dated-test-output` — collides with 12 other head(s)
- `lane/replay-pins-close` — collides with 12 other head(s)
- `lane/ev-stale-cause` — collides with 11 other head(s)
- `lane/wf-exchange-award-ungated` — collides with 11 other head(s)
- `lane/wf-exchange-move` — collides with 11 other head(s)
- `lane/wf-timeoff-decide-gate` — collides with 11 other head(s)
- `lane/meals-sweep-guard` — collides with 10 other head(s)
- `lane/wf-adjust-address` — collides with 10 other head(s)
- `lane/mrg-price-correction-2` — collides with 9 other head(s)
- `lane/fragile-needles` — collides with 8 other head(s)
- `lane/trn-evidence-names` — collides with 8 other head(s)
- `lane/ev-refund-fake-arg` — collides with 7 other head(s)
- `lane/gr-exit-wire-the-mail` — collides with 6 other head(s)
- `lane/meals-members-read` — collides with 6 other head(s)
- `lane/meals-eighth-read` — collides with 5 other head(s)

*T3 — other collisions* (25):

- `lane/wf-idempotency-refusal-rest` — collides with 9 other head(s)
- `lane/wf-invite-list-revoke` — collides with 5 other head(s)
- `lane/wf-link-deadend` — collides with 5 other head(s)
- `lane/wf-demo-presence` — collides with 4 other head(s)
- `lane/gr-approval-state` — collides with 3 other head(s)
- `lane/wf-clock-wire` — collides with 3 other head(s)
- `lane/wf-withheld-bound` — collides with 3 other head(s)
- `lane/eod-credit-split` — collides with 2 other head(s)
- `lane/ev-seed-deposits` — collides with 2 other head(s)
- `lane/ev-uri-relative` — collides with 2 other head(s)
- `lane/ev-vipps-fallback` — collides with 2 other head(s)
- `lane/meals-docsync` — collides with 2 other head(s)
- `lane/meals-xz-credit` — collides with 2 other head(s)
- `lane/wf-onboard-claim` — collides with 2 other head(s)
- `lane/wolt-sync-unregistered` — collides with 2 other head(s)
- `lane/xz-printed-defects` — collides with 2 other head(s)
- `lane/census-floors-derived` — collides with 1 other head(s)
- `lane/credit-note-number` — collides with 1 other head(s)
- `lane/ev-inquiry-gate` — collides with 1 other head(s)
- `lane/ev-outbox-flake` — collides with 1 other head(s)
- `lane/ev-outbox-guid-substring` — collides with 1 other head(s)
- `lane/lanes-out-of-assembly` — collides with 1 other head(s)
- `lane/margin-violation-anchor` — collides with 1 other head(s)
- `lane/mrg-starter-150b` — collides with 1 other head(s)
- `lane/pdf-creditnote-name` — collides with 1 other head(s)

*T4 — independent, degree 0, parallelisable* (12):

- `lane/accounting-export-silent` — collides with 0 other head(s)
- `lane/gr-newsletter-cross-verify` — collides with 0 other head(s)
- `lane/hosted-service-floor` — collides with 0 other head(s)
- `lane/meals-lever-withhold` — collides with 0 other head(s)
- `lane/push-token-in-path` — collides with 0 other head(s)
- `lane/rollback-tracked-sweep` — collides with 0 other head(s)
- `lane/route-guard-gaps` — collides with 0 other head(s)
- `lane/statute-honesty` — collides with 0 other head(s)
- `lane/telemetry-initializer-floor` — collides with 0 other head(s)
- `lane/train-idempotency-refusal` — collides with 0 other head(s)
- `lane/utlkvit-reprint-kind` — collides with 0 other head(s)
- `lane/vipps-redact-404` — collides with 0 other head(s)

**Hub files (the collision surface), by how many heads touch each:**

- `Program.cs` — 17 heads
- `artifacts/journeys/ev-dietary/run-sheet.json` — 12 heads
- `artifacts/journeys/ev-dietary/run-sheet.md` — 12 heads
- `artifacts/tests/README.md` — 10 heads
- `docs/plans/PENDING-MIGRATIONS-LEDGER.md` — 9 heads
- `WebApi.Tests/Workforce/WorkforceFlagCensus.cs` — 9 heads
- `WebApi.Tests/Wire/WireHostFixture.cs` — 9 heads
- `.gitignore` — 8 heads
- `Helpers/ApplicationDbContext.cs` — 8 heads
- `Services/Workforce/WorkforceDbViolations.cs` — 8 heads
- `WebApi.Tests/Events/EventsSettlementLifecycleTests.cs` — 8 heads
- `WebApi.Tests/Margin/MarginTenantIsolationSweepTests.cs` — 8 heads
- `WebApi.Tests/Workforce/WorkforceEndToEndJourneyTests.cs` — 8 heads
- `Controllers/MarginWasteController.cs` — 7 heads