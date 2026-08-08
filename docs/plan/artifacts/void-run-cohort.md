# The void-run cohort, re-measured (2026-08-09)

Lane: L-A-VOID-RUN-COHORT-IS-RE-MEASURED. Question: which recorded findings rest on a mutation run
nobody proved executed? Method: every return and lane body swept for `reds nothing`, `no arm reds`,
`survives`, `unfalsified`, `not pinned`; each hit sorted by **whether its recorded evidence carries
an executed-test count** — that sort, not the re-runs, is this artifact's spine. Trunks at
measurement: backend `ada218783`, frontend `de5e68c`. Nothing fixed, nothing moved, nothing pushed.

## The cohort: exactly one member

| finding | recorded where | count at recording? | re-run at current trunk | verdict |
|---|---|---|---|---|
| "wf-withheld-bound's second `Withheld` site, the expiry sweep, reds NOTHING under mutation" | `L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK-1.md:14`; flag `F-THE-EXPIRY-SWEEP-WITHHELD-SITE-IS-UNFALSIFIED`; propagated uncounted by `L-READ-WHAT-REACHED-BOTH-TRUNKS-TODAY-1.md` | **NO** — no executed-test number anywhere in the chain | at `ada218783` (dispatcher and test file blob-identical to `74405b34`): age-out condition made never-true → **2 tests executed, 1 FAILED** — `Superseding_cancels_the_week_it_replaced_and_a_withheld_week_that_has_ended_expires` reds, the control arm passes, trx-named, restored byte-equal | **FALSE** |

The mutation, in words: the age-out condition (notice parsed, `RangeEndUtc` present,
`RangeEndUtc <= now`) can never be true, so a withheld row whose week has ended is re-withheld
forever instead of dead-lettering. That is the canonical falsification of the site, and the
existing first arm kills it. The finding was false at birth (both files unchanged since
`74405b34`), and its citation chain ran two readers deep with zero independent executions until
`L-THE-EXPIRY-SWEEP-GETS-AN-ARM-THAT-CAN-FAIL` measured it. **Owner action: retire the flag against
this measurement.**

## Swept and excluded — each carries an executed-test count

| claim | where | the count that excludes it |
|---|---|---|
| "dropping GuardIfMatch's compare alone reds NOTHING; ApplyConcurrencyToken still answers the 409" | `L-READ-THE-DAYS-BUILDS-REDO-1.md:12` | impostor arm reproduced **7/7 green** in the same record |
| "deleting the RETREC guard (`KassaCreditSale.cs:28`) reds NOTHING **across 1209 tests**" | `L-POS-TENDER-WIRE-REBASE-1.md:19`; re-scoped by the plan's `respec-deadguard` | **1209** executed, in the claim itself |
| "No arm reds everything: 12/9/13/11 step-scoped tests stay green per arm" | `L-MRG-RECIPE-REVISE-UI-1.md:16` | per-arm counts in the claim |
| the tenancy predicate and detail-watcher "red nothing" findings | Fable review recorded at `plan.md:7005-7020` (`L-WF-CONTACT-PINS`, state verified) | closed with counted counterfactuals: predicate deleted → **4376/4376 green** measured, then the new wire arm reds; watcher deleted → **1 red in 2495**; value pin **8/8**; `L-WF-CONTACT-PINS-1.md` |
| the meals/events survivor ("member column falls back…", STILL-GREEN) | `mut-lines.results.json` — void-SHAPED at recording (`reddened: 0` on every row, no baseline) | independently re-derived with baselines and per-run totals by `L-READ-WHETHER-THE-NEW-TESTS-CAN-ACTUALLY-FAIL` — **70/71 RED reproduced, the survivor reproduced and proven equivalent** (baselines 29/49/37) |
| growth's `??`→`\|\|` equivalent mutant and my two devised survivors | growth mutation receipt + `L-READ-WHETHER-…` review | full 41-arm runs recorded for every survival (`total=41 newlyRed=0`) |
| workforce M01/P17/D06/D10/D16 survivors | ten spec files + my re-derivation | 95 entries re-run with per-run totals, zero short runs; P17/D06 further separated by executable probes |

## The `not pinned` pattern, swept and ruled out as a genus

Every hit (`L-RECEIPT-JOURNEY-AT-DE`, `L-GR-APPROVAL-STATE`, `L-GROWTH-NEWSLETTER-WIRE`,
`L-ALIASING-NEEDLE-SWEEP`) is a deliberate *reported-not-pinned* scope statement — a behaviour
observed and left unasserted, with **no mutation run alleged**. A claim that never says a run
happened cannot rest on a void one; they are coverage debts, not cohort members. (The needle-sweep
return even states its own limit plainly: "nothing was executed, so every rate is arithmetic".)

## What this cohort says about the method

One uncounted finding existed in the whole record, and it was false. Everything else that alleges a
survived or empty mutation either carried its executed count at birth or has since been re-derived
under an instrument that refuses void runs. The two instruments that could still mint uncounted
claims are gone: the canonical runner reports `INVALID-RUN` for zero-test runs in both exit
directions, and the guard sweep now walks all 53 scripts. The remaining discipline is human — the
lesson of the one member is that **a confirmation that did not itself execute tests is a citation,
not a confirmation**, and it should be written as one.
