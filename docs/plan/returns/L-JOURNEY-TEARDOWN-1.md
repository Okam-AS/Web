```
RETURN: L-JOURNEY-TEARDOWN
brief: 6020b321
verdict: built
evidence: lanes/L-JOURNEY-TEARDOWN/mutation-log.md at lane/journey-teardown b3e60a0 (baseline read at feature/restaurant-modules 5ad0ca0; branch NOT moved)
log:
KILLED ONE FOR REAL -- SIGKILL to the process group mid-walk, real browser:
  ARM A as shipped       42|Events.Core LOWERED, seed intact
  ARM B lease suppressed 42|Events.Core STILL UP  <- the defect, reproduced
Teardown isolated: ARM C nothing left up; ARM D left Events.Core AND Events.Settlement up ON A
WALK THAT PASSED -- a green run leaking two levers. FIXED AT THE WIRE, not the helper: two
journeys move levers without calling flags.js at all, so a helper-keyed ledger would miss
exactly those. All 14 covered, 14 files untouched. The restore is the fixture TEARDOWN,
unconditional, in a finally; a kill is covered by a fixture-held lease socket the OS closes. MY
OWN PROOF CAUGHT A BUG I SHIPPED: lease() was a POST with no end(), and api-server awaits
readBody before routing -- it HUNG EVERY JOURNEY at line 1 until the 120s timeout, invisible to
all 25 static tests. Trusting the green suite would have broken the whole e2e tree. PIN 29
tests; 15 mutations ALL red BY NAME, suites restored green. Two more self-inflicted bugs and
all detail: lanes/L-JOURNEY-TEARDOWN/mutation-log.md. PROXY NOT LIVE, no container. NOT CLOSED:
a SIGKILLed LIVE run leaves levers up -- no lease on a SQL row, and the ledger carries no
credential by design (C7).
END RETURN
```

## Detail

### Where the work is

| what | where |
| --- | --- |
| the commit | `lane/journey-teardown` `b3e60a021d641ff43c4b6310165ea7d9403de778` |
| worktree | `/Users/svendaneel/okam/wt-jteardown` |
| evidence, committed | `lanes/L-JOURNEY-TEARDOWN/` (mutation-log.md, kill-proof.txt, teardown-proof.txt, mutation-proof.txt + the three scripts) |
| mirrored, uncommitted | `/Users/svendaneel/okam/Web-modules/lanes/L-JOURNEY-TEARDOWN/` |

`feature/restaurant-modules` was **not** moved and nothing was pushed. All evidence is
**inside the clone** under `lanes/` and is committed — nothing this lane relies on lives in
`artifacts/` or a `*.log`.

The two brief corrections this lane found — the ref no longer being a fast-forward ahead of
the tip, the step to convert not existing at the baseline, and the leak being 14 journeys
rather than 10 — are the coordinator's to record and are dropped from the log accordingly.
They are set out in full in §5 of `lanes/L-JOURNEY-TEARDOWN/mutation-log.md`.

### What was actually changed

- **`test/e2e/support/levers.js`** (new) — the ledger. Fed from the recorder's existing
  `page.on('response')` listener, so a journey cannot opt out of being covered: it cannot
  write an override without making the request. Clears newest-first (clearing `Events.Core`
  first takes the pipeline's reads to 404, so a Settlement clear after it writes against a
  module the venue no longer has). Bearer held in memory only.
- **`test/e2e/support/journey.js`** — lease opened before the walk; release in a `finally`
  after the walk, positioned *after* the wrong-world guard reads `stats.served` so the
  cleanup's own requests cannot inflate a count that guard depends on.
- **`test/e2e/fixture/api-server.js`** — the lease. Outside `state`, cleared on reset, fed
  by both the write and the clear, released on socket `close`.
- **`test/e2e/scripts/global-teardown.js`** — names what was left up.
- **two specs** — the cleanup-only steps deleted, headers corrected so no prose still
  describes the old behaviour. `workforce-flag-lever` keeps its clear: there it is the
  journey's *subject*, and it is the ledgered exception with that reason.
- **`test/journey-rerunnability.test.js`** — its three lever rules required a *spec* to
  clear its own levers, which this change makes false. Retired and replaced by two tests
  that red if the new home disappears, so the subject cannot fall between the two files.

### Suite state

2616/2618 across 113 suites. The 2 reds are pre-existing and provably not this lane's:
`journey-artifact-store.test.js` asserts `/^Web-modules@/` and receives `wt-jteardown@…`, so
it is coupled to the checkout **directory name** and fails in every lane worktree in this
estate. Confirmed here by stashing this lane's changes and re-running; the coordinator
reports a sibling hit the same thing an hour ago, so it is now confirmed twice.

### Why the browser proof was not a formality

The lane's own mechanism deadlocked every journey in the tree — `lease()` sent POST with a
dangling `write()` and no `end()`, and `api-server.js` awaits `readBody(req)` for every POST
*before* it dispatches a route. Nothing static could see it. It surfaced only because arm A
of the kill proof reported "the run ended before it raised anything" twice while arm B —
one commented-out line different — walked the whole way.

Had this shipped on its green static suite, every `npm run test:e2e` in the repo would have
hung at its first line for 120 s. That is the case for the brief's instruction, stated as a
fact about this lane rather than as agreement with it.

### Processes left running (mine, safe to stop)

`:4973` fixture and `:3973` dev server, both started by this lane out of
`/Users/svendaneel/okam/wt-jteardown`, left up so the two proofs can be re-run without a
cold Nuxt compile. They are processes, not containers. `wt-evtb`, `:4971` and `:3971` belong
to the predecessor and were not touched.

One environment note for whoever re-runs: this worktree was given a **real** `core/` (copied
from the primary checkout) rather than a borrowed one. Playwright's `globalTeardown` calls
`releaseBorrowedCore()`, which removed the borrowed `core/` out from under an
externally-started dev server and left it compiling against an empty directory — the first
proof attempt failed at step 1 for that reason and not for any product reason.
