# The tier at the composed tip — run, not quoted

The exit's landing arm reads *"landed **with the tier green at the composed tip**"*, and the prior pass
declined partly because that half *"rests on bare counts with no run artifact, which C5 refuses as a reason
a capability is finished."* This is the run.

**It was needed because no receipt existed.** `git ls-tree -r 6d5328004 -- artifacts/tests/` finds **no
receipt keyed to `7bf97557`, `a776d5d2`, `0b2d1729`, `d375f547` or `d30c1c4d`** — none of the four landings
or the base left one behind, so the number in the evidence line had nothing under it.

## The run

| | |
|---|---|
| commit | **`d30c1c4d4e89cb4167e8a9ec6d5e1af44fd51221`** — the composed tip, `git worktree add --detach` |
| invoked from | `WebApi.Tests/` (not the repo root, which exits 0 having run **zero** tests) |
| filter | `--filter "Database!=SqlServer"` |
| logger | `--logger trx` → `composed-tip-fast-tier.trx` (7.4 MB, beside this file) |
| started / ended | `2026-08-09T15:53:37Z` → `2026-08-09T16:01:38Z` |
| duration | **7 m 33 s** · process **exit 0** |
| `WebApi.dll` | built at `2026-08-09T17:53:51` local — this run compiled the tip, it did not reuse a binary |
| containers | **none started** — the filter excludes the SQL tier |

**Result, from the trx's own `<Counters>`:**

```
total="5048" executed="5037" passed="5037" failed="0" error="0" timeout="0"
aborted="0" inconclusive="0" notRunnable="0" notExecuted="0"
```

Console line: `Passed! - Failed: 0, Passed: 5037, Skipped: 11, Total: 5048`.

**This reproduces the RETURN's bare pair exactly.** The evidence line claimed *"tier 5037/5048 green at the
tip"*; an independent run at that commit today returns 5037 of 5048 with zero failures. The counts were
right; what was missing was the artifact, and it is now committed here rather than asserted.

## Asserted by name, not by the green line

A dotnet console log names only failed and skipped tests, so a vanished suite and a passing one print the
same green line. Two of the four landed backend lanes' own suites are identifiable in the trx by name, and
**their counts match the RETURN's per-lane deltas exactly**:

| landed lane | suite in the trx | tests | outcomes |
|---|---|---:|---|
| `L-VIPPS-REDACT-404` (*"the route redactor stops failing open on unbound routes"*) | `CapabilityRouteTelemetryTests` | **15** | all `Passed` — incl. `A_value_no_rule_removed_costs_the_url_rather_than_being_published` and the percent-encoded arms |
| `L-WF-WITHHELD-BOUND` | `WorkforceNotificationBacklogBoundTests` | **2** | both `Passed` — `Superseding_cancels_the_week_it_replaced_and_a_withheld_week_that_has_ended_expires` and `A_withheld_command_whose_week_is_still_ahead_is_kept_and_still_re_polled` |

The RETURN recorded *"vipps-redact-404 **+15**"* and *"wf-withheld-bound **+2**"*. Those are the same two
numbers, arrived at from the trx rather than from the RETURN.

The trx holds **5048 distinct test names**, so the executed count is not concealing a collapsed suite.

## What this does not establish

- **The 11 skipped are not itemised here**, and no claim is made about them.
- **The SQL tier was not run.** It is excluded by the filter, holds the `Database=SqlServer` traits, and — as
  every receipt in this estate still records — has no run against any SHA.
- **The frontend half is NOT re-measured.** `L-STATUTE-EVIDENCE-WORLD`'s *184 suites / 4484 green* at
  `de5e68c` remains the RETURN's number with **no artifact behind it**; `git ls-tree -r de5e68c` finds no
  test output committed at that commit either. Four of the five landings are backed by this run; the fifth
  is not, and a reader should not read one green tier as covering both repositories.
- **C5 stands.** A green tier at a composed tip is evidence that a tree builds and behaves. It is not
  evidence that anybody can reach any of these capabilities, and nobody has walked them.
