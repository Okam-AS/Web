# Why verification is refused — all 469 measured

Every `built-unverified` lane had `plan verify <ID> --evidence <its own recorded evidence>` run against
it. Nothing was predicted from a path; the tool is the instrument. No `--override`, no `plan accept`.

Measured 2026-08-08 by `agent:L-WHY-FOUR-HUNDRED-AND-SIXTY-NINE-LANES-CANNOT-VERIFY`. Raw per-lane
verdicts: `lanes/L-WHY-469/verdicts.json`, `refused.json`, `gone.json`.

## The headline: 88 were verifiable all along

| | |
|---|---|
| built-unverified lanes at the start | **469** |
| **verified by running the tool** | **88** |
| refused | **381** |

The 88 are a genuine state change, not a reclassification: lane `verified` went **57 → 145** and
`built-unverified` **469 → 381** in `plan.md`. Their evidence was admissible the whole time and nobody
had run the verb. That is 19% of the backlog discharged by measurement alone.

## The second headline: the browser is not the bottleneck

**357 of the 381 refusals have an exit criterion that needs no browser. Only 24 do.**

`D-RESTART-THE-WALK-WORLD-API` blocks **6%** of what remains. It is not what is holding the other 94%,
and unblocking it would not move them.

## Refusal classes, disjoint, as the tool stated them

| class | count | what the tool said |
|---|---:|---|
| **exit-not-met** | **221** | the exit criterion does not name the evidence |
| **path-gone** | **153** | `evidence path does not exist: …` |
| undeclared-fact | 3 | `no probe declares fact:<k>` |
| suite-kind | 1 | a green test suite does not exit built-unverified |
| unconfirmed-fact | 1 | the fact is `unconf`, not `ok` |
| no-evidence-recorded | 1 | the lane carries no `evidence:` line at all |
| other | 1 | one malformed evidence string |

### exit-not-met (221) is mostly a wording defect, not missing proof

| sub-shape | count | artifact on disk? |
|---|---:|---|
| `exit: "…" does not name <path>` | **206** | **206 of 206 — all present** |
| `names the directory X, not an artifact` | 15 | directory present; no single entry named |

**The proof exists for every one of the 206.** The lane's exit criterion simply never mentions the file
that discharges it. Nothing has to be built, re-run, or opened in a browser.

### path-gone (153) is two different problems, and the brief was right to ask

| | count | what it costs |
|---|---:|---|
| **named artifact is on disk right now** | **60** | re-record the `evidence:` field |
| recoverable from a git ref | 7 | a checkout or re-commit |
| genuinely destroyed | 83 + 2 absolute + 1 no-path = **86** | redo the work |

The 60 are the surprise. `plan verify` reports *"evidence path does not exist: OkamAPI worktree
/Users/svendaneel/okam/wt-utlkvit, branch lane/meals-utlkvit @ 1a03bc6c (local, not pushed) · SQL TIER
…"* — because **the `evidence:` field holds a prose sentence and the tool takes the whole string as a
path**. The worktree or file named *inside* that sentence is present. "The proof evaporated while the
code stayed" is true for 86 lanes, not 153; for 60 the proof is there and the field describing it is
not a path.

## Cheapest first

1. **Make the exit criterion name its artifact — 206 lanes.** Every artifact is already on disk. One
   line per lane, no new work, no browser, no decision. Half the remaining backlog.
2. **Re-record the 60 prose `evidence:` fields as bare paths.** The file is there; the field is a
   sentence. Same shape of edit as (1) and probably the same pass.
3. **Name one entry instead of a directory — 15 lanes.** The tool's objection is precise: any of the
   directory's 50 entries would satisfy it equally, so it demonstrates nothing.
4. **Recover 7 from refs**, a checkout or re-commit.
5. **Fix 6 one-offs** — 3 undeclared facts, 1 `unconf`, 1 suite-kind, 1 lane with no evidence line.
6. **86 genuinely destroyed** — this is redoing the work, and the only class that costs what the
   backlog appears to cost.
7. **24 browser-bound** — the only ones `D-RESTART-THE-WALK-WORLD-API` actually gates.

Steps 1–5 are **288 lanes**, none needing a browser, a decision, or a suite run. Added to the 88 already
verified, **376 of the 469 are reachable without redoing any work and without the walk world.**

## What this measurement does not claim

It does not claim the 288 *should* verify — only that the tool's stated objection to each is a recording
defect rather than absent proof, and that the artifact it would name is present. Whether each artifact
actually demonstrates its capability is the reader's judgement, and `plan verify` will still refuse any
that does not once the exit criterion names it. Nothing here was overridden and no evidence was produced.
