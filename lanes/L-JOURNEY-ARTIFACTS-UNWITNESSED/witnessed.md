# L-JOURNEY-ARTIFACTS-UNWITNESSED — which captures were taken while the guard was dead

**Worktree** `/Users/svendaneel/okam/web-unwitnessed`, detached at `e34977a`, `core/` at `1bcab0b`.
Nothing pushed, nothing committed to any branch, no container started, no fixed port bound.
**Port 4010 was never bound and pid 73160 was never signalled.** Private ports 3861/4861 with a
free-port precheck; `CI=1` throughout so no surviving fixture from another lane could be reused.

The census covers **41 committed journey receipts** (`*.playwright.json`) across **all 115 refs**, plus
the 63 committed screenshots that ride with them (42 under `artifacts/journeys/`). `docs/plan/walks/`
holds no tracked file, so nothing there is in scope for *committed*.

---

## 0. The two clocks, named

Two orderings were computed and **they disagree**, so both are reported rather than one:

| ordering | how | what it is good for |
|---|---|---|
| **committer time** | `git log --format='%cI'` — ISO-8601 **with an explicit `+02:00` offset**, never a bare local string | reading the day back |
| **ancestry** | `git merge-base --is-ancestor` — no clock at all | deciding what a tree contained |

File times are rendered `stat -f '%Sm' -t '%Y-%m-%dT%H:%M:%S%z'` → also `+0200` (CEST, Europe/Oslo).
Every timestamp in this file carries its offset, so no UTC-against-local comparison is possible.

**The disagreement is real and it matters.** `997936a` has a committer time of `2026-08-04T23:31:34+02:00`,
*later* than the tip `e34977a` at `2026-08-04T15:55:15+02:00` — yet it is **not** an ancestor of the tip.
Ten receipts sit on that side of the split. Sorting the census by clock alone would have put five artifacts
"after" a tip that has never contained them. **Every classification below is made on ancestry; the clock is
printed beside it and never used to decide.**

---

## 1. The repair anchor — and a correction to the flag

`F-JOURNEY-GUARD-WAS-DEAD` says the repair is *"on a lane branch, not on any tip."*
**Measured: it is on no branch at all.**

```
harness-copy.js          on 0 of 115 refs   (refs/heads + refs/remotes)
serving-fixture-proof.js on 0 of 115 refs
guard-proof.js           on 56 of 115 refs   <- positive control, same loop, same quoting
```

The scan was **first run with `"$b:path"` and returned a false zero for every file**, because zsh reads
`$b:t` as the *tail* modifier and silently ate the `:t`, leaving `refs/heads/foo` + `est/e2e/...`. Re-run as
`"${b}:path"` with the guard-proof control proving the loop can find something, the zero for the repair
files stands. (Twelfth trap on the orchestrator's list, thirteenth instance.)

**The repair exists only as uncommitted working-tree state in `/Users/svendaneel/okam/web-whoanswered`**
(detached at the same `e34977a`), so there is **no commit to date any capture against**. The anchor used
here is therefore the file clock, stated explicitly:

```
2026-08-05T02:49:35+0200  test/e2e/support/journey.js         (guard side)
2026-08-05T04:29:55+0200  test/e2e/scripts/harness-copy.js    <- THE REPAIR INSTANT for guard-proof.js
2026-08-05T04:31:13+0200  test/e2e/scripts/serving-fixture-proof.js
2026-08-05T04:33:01+0200  test/e2e/scripts/guard-proof.js
2026-08-05T04:36:17+0200  test/e2e/support/fixture-provenance.js   (repair set complete)
```

**Consequence, stated plainly: every one of the 41 committed receipts predates the repair.** Not one was
captured under a guard that had been proven to run. The interesting question is therefore not *which side of
the repair* but *which side of the death*, and that is what the census answers.

---

## 2. The death interval, derived from the require graph

`guard-proof.js` builds a throwaway checkout and copies **a hand-written list** of support files into it.
Whether it lives or dies is decidable statically: does the list cover the transitive `require('./…')`
closure of what it copies?

| commit | committer time | `journey.js` requires | `artifact-store.js` requires | copy list covers it? |
|---|---|---|---|---|
| `31fc45d` | 2026-08-03T14:19:12+02:00 | `artifact-store` | — | **yes** — guard-proof born, 7 arms (`1,2,3,4,5,M1,M2`) |
| `22f2108` | 2026-08-04T00:33:09+02:00 | `artifact-store`, `journey-assertions` | — | **yes** — widened to 10 arms (`+S1,S2,M3`) |
| `94fa256` | 2026-08-04T02:54:30+02:00 | `artifact-store`, `journey-assertions` | **`world-stamp`** | **NO — DEATH** |
| `e34977a` | 2026-08-04T15:55:15+02:00 | same | `world-stamp` | no — still dead at the tip |

`94fa256` created `test/e2e/support/world-stamp.js` and added `require('./world-stamp')` at
`artifact-store.js:138` in the same commit. The copy list at `guard-proof.js:216-217` copies exactly
`artifact-store.js` and `journey-assertions.js`. `world-stamp.js` is never copied, so the copied
`artifact-store.js` cannot load, so every arm dies before a test runs.

**Measured, not inferred, on both sides:**

- dead: `lanes/L-JOURNEY-RECEIPT-RECORDS-WHAT-ANSWERED/runs/guard-proof-BASELINE-e34977a.txt`
  → `9 of 10 arms did not do what they must`, arm 3 the lone "ok" on `exit 1 / artifact NONE`, which is
  precisely a module-load death's signature.
- repaired: `runs/guard-proof-in-lane-worktree.txt` — re-measured **in this lane's own worktree**, not
  taken on the sibling's word → **all 10 arms held, EXIT=0**.

So the guard proof **worked for 12 h 35 min**, from `2026-08-03T14:19:12+02:00` to `2026-08-04T02:54:30+02:00`.

---

## 3. Census — 41 committed receipts

`band` is decided by `git merge-base --is-ancestor 94fa256 <adding commit>`.
`tip` is `git merge-base --is-ancestor <adding commit> e34977a`.

| # | added | committer time (+02:00) | band | tip | receipt |
|---|---|---|---|---|---|
| 1 | `6e6acd0` | 2026-08-01T15:13:47 | PRE-PROOF | off | `artifacts/journeys/admin-print-host.playwright.json` |
| 2 | `178c895` | 2026-08-01T15:45:24 | PRE-PROOF | at | `artifacts/journeys/modal-scroll-lock.playwright.json` |
| 3 | `f01886a` | 2026-08-01T16:09:33 | PRE-PROOF | off | `artifacts/journeys/statute-honesty.playwright.json` |
| 4 | `818c48a` | 2026-08-01T16:55:20 | PRE-PROOF | off | `artifacts/journeys/events-stale-cause.playwright.json` |
| 5 | `839d377` | 2026-08-01T18:16:37 | PRE-PROOF | at | `artifacts/journeys/modal-estate-scroll-lock.playwright.json` |
| 6 | `839d377` | 2026-08-01T18:16:37 | PRE-PROOF | at | `lanes/L-MODAL-SEVEN/red-probe-before-fix.playwright.json` |
| 7 | `1b32466` | 2026-08-02T11:23:00 | PRE-PROOF | off | `lanes/L-LIVE-WORLD-SEED/events-deposit-precondition.live.playwright.json` |
| 8 | `538abe6` | 2026-08-02T11:50:30 | PRE-PROOF | at | `lanes/L-LIVE-WORLD-STAFF/guard-proof-events-deposit-precondition.failed.playwright.json` |
| 9 | `538abe6` | 2026-08-02T11:50:30 | PRE-PROOF | at | `lanes/L-LIVE-WORLD-STAFF/mutant-schedule-publish-flip-inverted.failed.playwright.json` |
| 10 | `538abe6` | 2026-08-02T11:50:30 | PRE-PROOF | at | `lanes/L-LIVE-WORLD-STAFF/workforce-flag-lever.live.playwright.json` |
| 11 | `538abe6` | 2026-08-02T11:50:30 | PRE-PROOF | at | `lanes/L-LIVE-WORLD-STAFF/workforce-schedule-publish.live.playwright.json` |
| 12 | `fadc84a` | 2026-08-02T13:46:56 | PRE-PROOF | at | `lanes/L-LIVE-SEED-VIA-PRODUCT/events-deposit-precondition.live.playwright.json` |
| 13 | `fadc84a` | 2026-08-02T13:46:56 | PRE-PROOF | at | `lanes/L-LIVE-SEED-VIA-PRODUCT/workforce-flag-lever.live.playwright.json` |
| 14 | `fadc84a` | 2026-08-02T13:46:56 | PRE-PROOF | at | `lanes/L-LIVE-SEED-VIA-PRODUCT/workforce-schedule-publish.live.playwright.json` |
| 15 | `35440cf` | 2026-08-03T10:41:33 | PRE-PROOF | at | `artifacts/journeys/workforce-invitation-onboarding.playwright.json` |
| 16 | `94fa256` | 2026-08-04T02:54:30 | **DEAD** | at | `lanes/L-LIVE-BUILD-EXPORT/journey-artifacts/arm-1.provenance-probe.playwright.json` |
| 17 | `94fa256` | 2026-08-04T02:54:30 | **DEAD** | at | `…/arm-2.provenance-probe.playwright.json` |
| 18 | `94fa256` | 2026-08-04T02:54:30 | **DEAD** | at | `…/arm-3.provenance-probe.playwright.json` |
| 19 | `94fa256` | 2026-08-04T02:54:30 | **DEAD** | at | `…/arm-4.provenance-probe.playwright.json` |
| 20 | `94fa256` | 2026-08-04T02:54:30 | **DEAD** | at | `…/arm-5.provenance-probe.playwright.json` |
| 21 | `5a08fc7` | 2026-08-04T03:21:24 | **DEAD** | at | `lanes/L-LIVE-WORLD-DISCOVER/green-fixture.playwright.json` |
| 22 | `9215d38` | 2026-08-04T13:57:42 | **DEAD** | off | `lanes/L-MEALS-STATEMENT-SURFACE/armA-green.playwright.json` |
| 23 | `8a77326` | 2026-08-04T16:01:51 | **DEAD** | off | `lanes/L-JOURNEY-MEALS/capture-meals-admin-setup.playwright.json` |
| 24 | `8a77326` | 2026-08-04T16:01:51 | **DEAD** | off | `lanes/L-JOURNEY-MEALS/capture-meals-guest-claim.playwright.json` |
| 25 | `1890c9a` | 2026-08-04T16:06:30 | **DEAD** | off | `artifacts/journeys/growth-guest-lifecycle.playwright.json` |
| 26 | `1890c9a` | 2026-08-04T16:06:30 | **DEAD** | off | `artifacts/journeys/growth-testsend-refusal.playwright.json` |
| 27 | `4772c13` | 2026-08-04T16:21:35 | **DEAD** | off | `lanes/L-JOURNEY-PORT-HARDCODED/artifact-backup/meals-statement-month.playwright.json` |
| 28 | `4772c13` | 2026-08-04T16:21:35 | **DEAD** | off | `…/artifact-backup/runs/meals-statement-month.fixture.playwright.json` |
| 29 | `4772c13` | 2026-08-04T16:21:35 | **DEAD** | off | `…/artifact-backup/runs/meals-statement-month.fixture.superseded.playwright.json` |
| 30 | `69003ed` | 2026-08-04T16:30:43 | **DEAD** | off | `lanes/L-JOURNEY-WORKFORCE/week-run-without-port.playwright.json` |
| 31 | `eb8f412` | 2026-08-04T16:32:07 | **DEAD** | off | `artifacts/journeys/workforce-punch-correction.playwright.json` |
| 32 | `eb8f412` | 2026-08-04T16:32:07 | **DEAD** | off | `artifacts/journeys/workforce-week-run.playwright.json` |
| 33 | `8928765` | 2026-08-04T21:14:21 | **DEAD** | off | `lanes/L-GR-EXIT-WIRE-THE-MAIL/journey/growth-guest-unsubscribe.playwright.json` |
| 34 | `e8d69fc` | 2026-08-04T22:21:52 | **DEAD** | off | `lanes/L-FE-WF-INVITE-LIST-REVOKE/journey-artifacts/workforce-invitation-list-revoke.playwright.json` |
| 35 | `e8d69fc` | 2026-08-04T22:21:52 | **DEAD** | off | `…/workforce-invitation-revoke-claimed.playwright.json` |
| 36 | `618efc8` | 2026-08-04T23:12:57 | **DEAD** | off | `artifacts/journeys/workforce-timesheet-export.playwright.json` |
| 37 | `997936a` | 2026-08-04T23:31:34 | **DEAD** | off | `lanes/L-WORLD-STAMP-WINDOWS/provenance-arms/arm-1.provenance-probe.playwright.json` |
| 38 | `997936a` | 2026-08-04T23:31:34 | **DEAD** | off | `…/arm-2.provenance-probe.playwright.json` |
| 39 | `997936a` | 2026-08-04T23:31:34 | **DEAD** | off | `…/arm-3.provenance-probe.playwright.json` |
| 40 | `997936a` | 2026-08-04T23:31:34 | **DEAD** | off | `…/arm-4.provenance-probe.playwright.json` |
| 41 | `997936a` | 2026-08-04T23:31:34 | **DEAD** | off | `…/arm-5.provenance-probe.playwright.json` |

```
15  PRE-PROOF   captured before guard-proof.js existed at all
26  DEAD        captured from a tree in which guard-proof.js could not load
 0  WITNESSED   captured in the 12h35m window in which guard-proof.js worked
```

### The headline

**Not one committed journey receipt was captured while the guard proof was capable of running.**
The 12 h 35 min window between `31fc45d` and `94fa256` contains **zero** artifact-adding commits. The
plan does not merely hold captures that are *weaker* than recorded — it holds **no capture at all** that
the guard ever witnessed.

### The sharpest instance

`L-JOURNEY-MEALS` was unfrozen on the argument that *"the guard is built and proven by seven arms
including two that reproduce the historical defect on demand — so a capture from here carries weight an
exit code alone never did."* Those seven arms are `1,2,3,4,5,M1,M2` at `31fc45d`; the two mutants are
`M1`/`M2`. **The two captures that argument authorised (`8a77326`, rows 23-24) were taken
2026-08-04T16:01:51+02:00 — 13 h 07 min after the guard died at 02:54:30.** The argument was true when it
was written and false when it was used.

Both are now re-run green under the repaired guard (§4). **That is the one thing this lane could actually
give back**, and it is given back for the two artifacts where the claim was loudest.

---

## 4. Re-run under the repaired guard — 5 receipts, witnessed now

The repair was overlaid into this worktree by copying the eight dirty files out of `web-whoanswered`
(read-only there; nothing in that worktree was written). The overlaid set is byte-identical to it.

`runs/rerun-batch-1.txt` — one Playwright invocation, `--workers=1` (the config serialises journeys
anyway), `CI=1`, `E2E_WEB_PORT=3861 E2E_FIXTURE_PORT=4861`, `.nuxt` rebuilt from empty:

```
5 passed (57.9s)   EXIT=0
```

**The specs are the same specs.** Each was compared blob-to-blob between its capture commit and `e34977a`:

```
modal-scroll-lock                 178c895 d584bf9cb917 == tip  SAME
modal-estate-scroll-lock          839d377 0e9ccdc1c70a == tip  SAME
workforce-invitation-onboarding   35440cf 0dead96584d3 == tip  SAME
meals-admin-setup                 8a77326 240787602ca9 == tip  SAME
meals-guest-claim                 8a77326 b7233df0c513 == tip  SAME
```

**Every re-run records who answered.** All five receipts (`runs/rerun-*.playwright.json`) carry:

```
"servingFixture": { "askedPort": 4861, "reportedPort": 4861, "reportedPid": 29977,
                    "reportedCwd": "/Users/svendaneel/okam/web-unwitnessed",
                    "holderPid": 29977, "holderCwd": "/Users/svendaneel/okam/web-unwitnessed",
                    "holderCommand": "node test/e2e/fixture/api-server.js",
                    "identitySource": "health+lsof", "unresolved": null }
"nodeCalls": []
```

Both oracles agreed (`health+lsof`), one pid, this worktree's own cwd — **no foreign fixture**, which is
the thing that produced five phantom failures and one phantom statutory gap elsewhere in this plan.
`nodeCalls: []` because none of these five reaches the API from Node; the browser half is counted by
`backendServed` (8 / 11 / 74 / 37 / 11).

| receipt | now |
|---|---|
| row 2 `artifacts/journeys/modal-scroll-lock` | **witnessed** — re-run green |
| row 5 `artifacts/journeys/modal-estate-scroll-lock` | **witnessed** — re-run green |
| row 15 `artifacts/journeys/workforce-invitation-onboarding` | **witnessed** — re-run green |
| row 23 `lanes/L-JOURNEY-MEALS/capture-meals-admin-setup` | **witnessed** — re-run green |
| row 24 `lanes/L-JOURNEY-MEALS/capture-meals-guest-claim` | **witnessed** — re-run green |

---

## 5. A finding this lane did not go looking for: the repair kills the *other* prover

`test/e2e/scripts/build-provenance-proof.js` is the second harness-copying prover in this tree, and it is
the one that produced ten of the 41 receipts (rows 16-20 and 37-41, the `arm-N.provenance-probe` family).
Its copy list is also hand-written (`build-provenance-proof.js:185`):

```js
const copied = ['journey.js', 'artifact-store.js', 'journey-assertions.js', 'world-stamp.js'];
```

At `e34977a` that list is complete **by coincidence of today's require graph**. The repair adds
`require('./fixture-provenance')` to `journey.js:150`, and `fixture-provenance.js` is not on the list.

**Measured on both sides, positive control first:**

| run | journey.js | result | evidence |
|---|---|---|---|
| control | committed (`e34977a`) | **5 of 5 arms ok, EXIT=0** | `runs/build-provenance-proof-control-e34977a.txt` |
| under repair | repaired overlay | **5 of 5 arms FAIL, EXIT=1**, `Cannot find module './fixture-provenance'` | `runs/build-provenance-proof-under-repair.txt` |

So the exact bug the repair fixes in `guard-proof.js` is **re-created by that same repair in
`build-provenance-proof.js`** — a landing blocker for the repair, and one line of work: point
`build-provenance-proof.js` at `harness-copy.js` instead of its own list.

**It fails loudly, which is the one mercy here** — `5 of 5 arms did not do what they must`, exit 1, the
module-load error printed. Unlike `guard-proof.js` arm 3, no arm of it reports success on a death
signature. But the class is now confirmed twice, and **any third harness-copying script inherits it.**

**What this does to rows 16-20 and 37-41.** They are re-runnable and their prover re-runs green
(control above regenerated exactly that arm shape). They are **not** re-establishable *under the repaired
guard* until the line above is fixed, so they are recorded here as **unwitnessed, re-runnable, blocked on
one line** — not as unverifiable.

---

## 6. Unwitnessed and not re-run — with the reason, one per row

**Nothing below was walked, and nothing below is claimed to be wrong.** These are captures nobody was
watching, listed so the gap is a number rather than an impression.

| rows | count | why not re-run |
|---|---|---|
| 7, 10-14 (`*.live.playwright.json`) | 6 | Needs a live backend: a SQL container, the migration chain and a real WebApi (`test/e2e/scripts/live-world.sh`). **This brief grants no container slot**, and the estate record has Docker Desktop down. **Unverifiable here** — not unverifiable in principle. |
| 8, 9 (`*.failed.playwright.json`) | 2 | Deliberate **red** captures from the live world — a guard proof and an inverted mutant. Same live-world blocker, and re-running them green would destroy what they record. |
| 6 (`red-probe-before-fix`) | 1 | A deliberate red taken **before** the modal fix landed. The code no longer has that state, so a re-run cannot reproduce it. **Unverifiable by construction** — it is a historical negative, and re-running it would be walking it. |
| 27-29 (`meals-statement-month` ×3) | 3 | **Declined, and the decline is the finding.** Its first API call is a mutating `POST …/statements/drafts` followed by an irreversible `/finalize`. A sibling lane declined it for exactly this reason and was right; this lane declines it again rather than reversing that call. Also still hardcodes 4010 at `e34977a` — the foreign fixture this brief forbids touching. **Left unverifiable.** |
| 1, 3, 4, 25, 26, 33, 34, 35, 36 | 9 | Spec is **not at the tip** — it lives only on `lane/ev-stale-cause`, `lane/L-JOURNEY-GROWTH`, `lane/fe-gr-exit-wire-the-mail`, `lane/fe-wf-invite-list-revoke`, `lane/wf-timesheet-ui`. See the note below on why the repair cannot simply be carried there. |
| 31, 32, 30 | 3 | Specs exist on `candidate/fe-compose-2026-08-05` only. Same note. |
| 21, 22 | 2 | `green-fixture`, `armA-green` are lane-labelled captures whose producing spec is not named after them; identifying the producer is a separate act from re-running it, and it was not done. |
| 16-20, 37-41 | 10 | §5 — blocked on one line in `build-provenance-proof.js`. |

**Why the repair was not carried onto the lane branches.** The repair is an **uncommitted overlay based on
`e34977a`**. `candidate/fe-compose-2026-08-05` has `e34977a` as an ancestor but its `test/e2e/support/`
has moved a long way since — `journey.js +74`, `world-stamp.js +369`, `api-server.js +646`. Copying the
overlay's `journey.js` on top would **silently revert 74 lines of another lane's harness work** and produce
a green run against a harness nobody wrote. Merging it properly is a build act, not this analysis lane's,
so **12 re-runs were left not reached rather than done wrongly**. Naming them is the honest half.

---

## 7. Two things this census does not cover

- **Untracked artifacts.** The scope is *committed*. `/Users/svendaneel/okam/Web-modules/artifacts/` is
  gitignored (`.gitignore:98`), and ~40 journey directories sit there untracked. They are outside this
  census and outside the exit criteria, and **they are the majority of the captures on this machine.**
- **`docs/plan/walks/`** holds narrative walk records, none of them tracked (`git ls-files` → 0), so no
  claim is made about them either way.

---

## 8. How to reproduce every number here

```
git -C /Users/svendaneel/okam/Web-modules worktree add --detach /tmp/wt e34977a
cd /tmp/wt && ln -s /Users/svendaneel/okam/Web-modules/node_modules node_modules
git -c protocol.file.allow=always submodule update --init core

# the census (ancestry, not clock) — note ${b} braces, zsh eats $b:t
for r in $(git for-each-ref --format='%(refname)' refs/heads); do
  git ls-tree -r --name-only "$r" | grep '\.playwright\.json$'; done | sort -u |
while IFS= read -r p; do
  c=$(git log --all --diff-filter=A --format='%h' -- "$p" | tail -1)
  git merge-base --is-ancestor 94fa256 "$c" && echo "DEAD $c $p" || echo "PRE  $c $p"
done

# overlay the repair, then:
CI=1 npm run test:e2e:guard-proof                       # 10/10, exit 0
CI=1 E2E_WEB_PORT=3861 E2E_FIXTURE_PORT=4861 npx playwright test \
  test/e2e/journeys/{modal-scroll-lock,modal-estate-scroll-lock,\
workforce-invitation-onboarding,meals-admin-setup,meals-guest-claim}.spec.js
CI=1 node test/e2e/scripts/build-provenance-proof.js    # 5/5 FAIL under the repair; 5/5 ok without it
```

The brace expansion above is inside the `}` on purpose — the seventh trap on the orchestrator's list.
