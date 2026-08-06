```
RETURN: L-ABORTED-TRX-CANNOT-BE-EVIDENCE
brief: b6e5f7ee
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-ABORTED-TRX-CANNOT-BE-EVIDENCE/aborted-trx-cannot-be-evidence.md
log:
Check is trx_self_consistent.py: one bounded tail read per trx (ResultSummary sits within ~16KB of EOF here), comparing ResultSummary/@outcome against Counters in BOTH directions.
Three verdicts, not two. PASS green and clean; RED not-green with a tally that says why, reported and never refused; REFUSE self-contradiction, self-declared abort, or unreadable. Exit 0/2/1.
RED exists so the check is non-green on both Failed artifacts while refusing only the silent one. Refusing both would punish the one lane that declared its own failure, and would then be ignored.
The two: L-TRAIN-DISCLOSURE wt-traindisc/.../after.trx REFUSE (Failed, every adverse counter 0). L-COMPOSITION-ROOT-CHECK lane-composition-root-fast-tier.trx RED (Failed, failed=1) - not refused.
Pointed at each alone: the refused one exits 1, the honest red exits 2, a green sibling exits 0. Over the 25 cited trx: 23 PASS, 1 RED, 1 REFUSE. Population read from the sibling lane, not re-derived.
14 synthetic fixtures, 14/14 as expected: honest-red (must not refuse), green-over-failures (mirror contradiction), abort-phrase-in-stdout-only (no false positive), truncated, empty, 220KB stdout.
Estate sweep, 3112 trx in 22s: 2767 PASS, 339 RED, 6 REFUSE = 3 distinct artifacts. after.trx is byte-identical in 4 worktrees; the other two are L-TRAINWIRE-ABORT's own before-reproductions.
No other trx under ~/okam carries the contradiction. What the sibling lane bounded at one lane is bounded at one artifact, and refusing the two before-reproductions is right - they reproduce an abort.
RunInfo, answered: presence is useless (20 of 25 carry it, 18 of those green). RunInfo@outcome=Error is redundant, firing on both Failed artifacts. Only the abort TEXT earns a clause.
That clause adds exactly one case the outcome/counters comparison structurally cannot see: an abort landing after a recorded failure, where verdict and tally agree. Absent today; a fixture pins it.
Signals tested and rejected, so nobody re-proposes them: total!=executed (true of 23 clean receipts), the size of that gap, and any row-count floor (25-row and 3-row scoped tiers are honest).
Second finding: the plan tool's own `trx` extractor reads Counters only, rendering the aborted after.trx as "960 passed / 0 failed". Six-line fix named in the deliverable; tool unedited, it is shared.
Probe lines specified for the clerk, Probes block untouched: trx.cited.refused reads json:$.refuse from summary.json, 1 today and must reach 0. All three verified through the tool's own run_probe.
Read-only: no suite run, no container, no push, no SQL slot, no edit to plan.md or any lane but mine. C7: only the runner's abort sentence lifted out; no suite stdout, no token, in any file here.
END RETURN
```
