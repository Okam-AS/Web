# A run that aborted cannot be cited as a pass

Lane `L-ABORTED-TRX-CANNOT-BE-EVIDENCE` · brief `b6e5f7ee` · 2026-08-06 · read-only, no suite run, no
container touched. Population not re-derived: the 25 cited trx come from
`../L-TRX-CONTAINS-WHAT-IT-CLAIMS/lanes.json`.

## The check

`trx_self_consistent.py` asks one question of a trx, answered from the trx alone in one bounded read:
**does the run's own verdict agree with the run's own tally?**

```
<ResultSummary outcome="Failed">
  <Counters total="962" executed="960" passed="960" failed="0" error="0" aborted="0" … />
```

Nothing failed, yet the run says it failed. That is not a red run — it is a run that *stopped*, and 962 rows
out of a ~4,400-test tree then read like a deliberately scoped tier instead of a corpse.

Three verdicts, because two are not enough:

| verdict | meaning | exit |
|---|---|---|
| `PASS` | outcome green, no adverse counter set | 0 |
| `RED` | outcome not green **and the tally says why** — internally consistent, honestly red, **not refused** | 2 |
| `REFUSE` | the artifact contradicts itself, names its own abort, or cannot be read — inadmissible | 1 |

`RED` exists so the check can be non-green on both `Failed` artifacts — neither is a pass — while refusing
only the one that lies about why. **A check that refused both would punish the single lane that declared its
own failure, and would be ignored within a week.**

### The rule, in full

1. **Outcome vs tally, both directions.** `outcome ∈ {Completed, Passed}` must hold exactly when
   `failed + error + timeout + aborted + passedButRunAborted + notRunnable + disconnected == 0`. Either
   direction of disagreement is a refusal — a `Failed` over a clean tally *and* a `Completed` over a dirty one.
2. **The tally must add up to itself:** `executed == passed + failed + error + timeout + inconclusive`.
3. **The run's own admission:** a `RunInfo` whose outcome is `Error`/`Aborted` and whose text says *the active
   test run was aborted* / *test host process crashed* is a refusal **regardless of the counters** (see
   "Does RunInfo add anything", below).
4. **No `ResultSummary`, no `Counters`, or zero bytes** is a refusal, not a pass. A run killed before it wrote
   its summary is not evidence either.

`notExecuted` (skips) and `inconclusive` are deliberately **not** adverse: 23 of the 25 cited receipts have
`total > executed` and are clean. A rule keyed on `total == executed` would have failed all of them.

## The two artifacts in this estate

Both read `ResultSummary outcome="Failed"`. Only one contradicts itself.

**REFUSED — `L-TRAIN-DISCLOSURE`**
`/Users/svendaneel/okam/wt-traindisc/artifacts/tests/L-TRAIN-DISCLOSURE/after.trx`
`outcome="Failed"` · `total=962 executed=960 passed=960` · every adverse counter `0`.
Two independent clauses fire: the outcome has no cause in its own tally, and its `RunInfo outcome="Error"`
states *The active test run was aborted. Reason: Test host process crashed*. The citing evidence line
(`plan.md:1700`) names the artifact and no non-green fact about it.

**NOT REFUSED, reported RED — `L-COMPOSITION-ROOT-CHECK`**
`/Users/svendaneel/okam/wt-guestlink/artifacts/tests/lane-composition-root-fast-tier.trx`
`outcome="Failed"` · `total=4419 executed=4407 passed=4406 failed=1`. Verdict and tally agree; its
`RunInfo outcome="Error"` is the runner echoing its own `[FAIL]` line, not an abort. The citing evidence line
(`plan.md:5316`) carries the counts run `4419/4406/1/12`, so the failure is declared in the citation as well
as in the artifact.

## What the plan tool makes of the same two files

The built-in `trx` extractor (`plan`, `run_probe`, the `ext == "trx"` branch) reads `<Counters>` for
`passed`/`failed` **and never looks at `ResultSummary/@outcome`**. Evaluated with the tool's own code:

| artifact | `trx` extractor says | truth |
|---|---|---|
| `L-TRAIN-DISCLOSURE/after.trx` | `960 passed / 0 failed` | aborted after 962 of ~4,400 rows |
| `lane-composition-root-fast-tier.trx` | `4406 passed / 1 failed` | honestly red |

**The aborted run renders as a clean green fact.** That is the blind spot this lane closes, and it is six
lines from being closed inside the tool: in the `trx` branch, read
`<ResultSummary\b[^>]*outcome="([^"]*)"` alongside the counters and return `(False, "")` — unconfirmed, which
`plan refresh` already surfaces and exits 4 on — whenever the outcome contradicts the counters. I have not
edited the tool: it is outside this lane's territory and shared by every lane in the program.

## Does `RunInfo` add anything the outcome/counters comparison does not?

Measured over the 25 cited receipts, three readings of `RunInfo`, only one of which is worth having:

- **Presence — worthless.** 20 of the 25 carry `RunInfo` elements, 18 of them green runs with nothing but
  `Warning` entries. A presence test would flag 20 of 25 and identify nothing.
- **`RunInfo/@outcome == "Error"` — redundant.** It occurs in exactly 2 of 25 — precisely the two whose
  `ResultSummary` already reads `Failed`, including the honest one. It restates the outcome and does not
  separate the abort from the red.
- **The abort *text* inside an `Error`/`Aborted` `RunInfo` — worth reading, for one specific reason.** It
  occurs in exactly 1 of 25 (the refused one), so on today's population it only agrees with clause 1. Its
  value is a case clause 1 **structurally cannot see**: an abort that lands *after* at least one recorded
  failure leaves `outcome="Failed"` and `failed>=1` in perfect agreement, and only the text says the run
  never finished. No such artifact exists among the 25 today — this is a latent gap, not a live one — so
  fixture `abort-after-a-failure.trx` exists to prove the clause fires on it.

The text match is scoped to `RunInfo` elements, never to suite stdout; fixture
`abort-phrase-in-stdout-only.trx` is a green run in which a test prints the abort phrase, and it passes.

**Signals tested and rejected**, recorded so nobody re-proposes them:

- `total != executed` — true of 23 of the 25 *clean* receipts (skips). Useless.
- `total - executed` size — 962/960 (aborted) and 4419/4407 (honest red) are indistinguishable by this.
- low absolute row count — 962 is small for this tree, but `commit-events-sqlserver.trx` (25 rows) and
  `export-duplicate-race.trx` (3 rows) are legitimate scoped tiers. A floor would fire on them and not on a
  4,000-row abort.

## How it was tested

**14 synthetic fixtures, 14/14 agreeing with the expected verdict** (`--selftest`, fixtures written to
`fixtures/`, nothing copied out of a real artifact — C7). The suite exists to prove the discrimination is a
property of the rule rather than of these two files:

| fixture | expected | what it guards |
|---|---|---|
| `abort-signature.trx` | REFUSE | mirror of the real abort |
| `abort-signature-no-runinfo.trx` | REFUSE | the counters clause alone must still refuse — no dependence on crash text |
| `honest-red.trx` | **RED** | mirror of the disclosed red: `failed=1` + a `RunInfo Error` `[FAIL]` echo. **Must not be refused.** |
| `clean-pass.trx` | PASS | the ordinary green receipt |
| `clean-pass-with-skips.trx` | PASS | `total > executed` is not a defect |
| `green-over-failures.trx` | REFUSE | the mirror contradiction, the other direction |
| `abort-after-a-failure.trx` | REFUSE | the case the counters comparison cannot see |
| `passed-but-run-aborted.trx` | REFUSE | the runner's admission inside the counters |
| `abort-phrase-in-stdout-only.trx` | PASS | a test printing the abort phrase must not trip clause 3 |
| `runinfo-warning-only.trx` | PASS | `RunInfo` presence is not the signal |
| `counters-dont-add-up.trx` | REFUSE | the tally contradicts itself before the outcome is consulted |
| `long-stdout.trx` | REFUSE | 220 KB of run-level stdout forces the tail window past 64 KB |
| `truncated.trx` | REFUSE | no `ResultSummary` |
| `empty.trx` | REFUSE | zero bytes |

**The 25 cited receipts** (`--cited`): **23 PASS · 1 RED · 1 REFUSE**, exit 1. Pointed at each artifact alone:
the refused one exits **1**, the honest red exits **2**, a green sibling exits **0** — non-green on both,
refusing one.

**The whole estate** (`--sweep /Users/svendaneel/okam`): **3,112 trx in 22 s**, 2,767 PASS · 339 RED ·
**6 REFUSE**. Two sweeps ten minutes apart differed by one RED — another lane wrote a trx in between; the
estate is live and the PASS/RED split drifts. **`REFUSE` was 6 in both.** The six are **three distinct
artifacts**:

- `wt-traindisc/.../L-TRAIN-DISCLOSURE/after.trx` — the cited one, byte-identical in **four** worktrees
  (`wt-traindisc`, `wt-traindiscland-lane`, `wt-traindiscland-m`, `wt-trainwire-abort`).
- `docs/plan/lanes/L-TRAINWIRE-ABORT/artifacts/tier-before.trx` (`3155 passed / 0 failed`) and
  `trainwire-before.trx` (`15 passed / 0 failed`) — the *deliberate* before-reproductions captured by the fix
  lane. Refusing them is correct and is the point: they are aborts, cited as a reproduction of an abort and
  never as a pass. `L-TRAINWIRE-ABORT`'s exit asks for a trx "enumerating all 4650 tests"; this check is the
  gate for the *after* side, which must come back `PASS`, not merely come back with a count.

**No other trx in the estate carries the contradiction.** The rot the sibling lane bounded at one lane is
bounded at one artifact.

The 339 REDs (60 distinct contents) are internally consistent failing runs across the worktrees — none is
refused, and none carries an abort marker.

## The second stage: disclosure

`--disclosure` asks, of every cited trx that is not green, whether the evidence line citing it admits it.
This is **reported, never the reason for a refusal** — the trx-internal check separates abort from red, and
this separates silent from declared.

```
REFUSE  L-TRAIN-DISCLOSURE         UNDISCLOSED  citation names the artifact and no non-green fact about it
RED     L-COMPOSITION-ROOT-CHECK   DISCLOSED    citation carries the counts run 4419/4406/1/12 (failed=1)
```

One bug worth recording, because it is the exact shape this lane is about. The first version of `discloses()`
matched disclosure keywords as substrings and accepted `L-COMPOSITION-ROOT-CHECK` because *"measured myself
from this clean worktree"* contains `red`. Right answer, wrong reason. The counts-run test is checked first
now and keyword matching is word-bounded; five regression cases pin it.

## Probe lines for the clerk

The `## Probes` block is fenced and agents must not edit inside it. `--cited` writes scalar counts to
`summary.json` for exactly this purpose. All three lines were evaluated with the plan tool's own
`run_probe` and return `(True, '1')`, `(True, '1')` and `(True, '25')` today:

```
trx.cited.refused          suite  docs/plan/lanes/L-ABORTED-TRX-CANNOT-BE-EVIDENCE/summary.json  json:$.refuse
trx.cited.red.undisclosed  suite  docs/plan/lanes/L-ABORTED-TRX-CANNOT-BE-EVIDENCE/summary.json  json:$.red_undisclosed
trx.cited.checked          suite  docs/plan/lanes/L-ABORTED-TRX-CANNOT-BE-EVIDENCE/summary.json  json:$.cited
```

`trx.cited.refused` reads **1** today and must read **0**. It is a lagging fact — as fresh as the last
`--cited` run, the same property `fe.tests` has against `jest.json` — and `summary.json` carries its own
`generated` timestamp.

## Files

| file | what |
|---|---|
| `trx_self_consistent.py` | the check · `--selftest`, `--cited`, `--disclosure`, `--sweep DIR`, bare paths, `--json OUT` |
| `selftest.py` | the 14 fixtures and their expected verdicts; writes `fixtures/` |
| `fixtures/` | 14 synthetic trx, no real content |
| `cited.json` | per-artifact record for the 25 cited |
| `sweep.json` | per-artifact record for all 3,112 trx under `~/okam` |
| `summary.json` | scalar counts for the probe lines above |

Standard library only, no network, no suite execution, no container. One bounded tail read per file —
`ResultSummary` sits within ~16 KB of EOF in every trx measured here, and the window escalates to the whole
file if it is not there. **C7:** the only text lifted out of a real artifact is the runner's own abort
sentence, which carries no token or credential; no suite stdout was copied into any file in this directory.
