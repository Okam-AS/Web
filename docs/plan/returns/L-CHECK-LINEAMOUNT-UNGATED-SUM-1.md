```
RETURN: L-CHECK-LINEAMOUNT-UNGATED-SUM
brief: f845f9c0
verdict: built
evidence: lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM/mutation-log.md
spec_gap: none
reason: exit met — both sums on statedSum, and the refund proved to differ between the absent and zero worlds
log:
commit c32cda3, refs/lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM, off baseline 7a72c02; 8c6e91fa never read.
THE FALSIFICATION HOLDS, AND IT IS THE MONEY. Under the old sums the ABSENT world and the ZERO world handed back the SAME kr 0,00 — `0 + null` is `0` — one because nothing was ever charged, the other on a bill the till took 50,00 for, and nothing told them apart. Judged against the server's own finalAmount (LineAmount − DiscountAmount), never against the panel. One silent member instead of two gives the plausible shape: kr 20,00 refunded on the same 50,00 bill.
Both sums now statedSum, and a row whose total nobody stated is REFUSED rather than settled. Carrying the null on makes ReturnBuilder settle `null * quantity` as a silent kr 0,00; falling back to unitAmount*quantity refunds the LISTED price — the defect the sibling removed from the other branch of the same `if`. DayFlow:114 mounts ReturnBuilder un-prefilled, so the § 5-3-7 return stays reachable by hand.
THE DEPOSIT TAG COULD NOT STAY BEHIND. Safe on `> 0` only because `|| 0` guaranteed a number; gating the sum makes it null, `null > 0` is false, and the tag vanishes from a row that genuinely has pant — the sum's defect moved one screen down. isDeductionInPlay now DELEGATES to a general isAmountInPlay (pant is an addition, not a deduction), so the rule is still written once and there is no fourth answer.
Probe part 1 re-ran as the control: 9 shapes move, every one unstated, no stated shape moves — the rename moved nothing.
MUTATIONS 9/9 RED, including M3, the one the brief names: both sums gated with the refusal deleted, which a sum-only test accepts. The new test is RED on the unported baseline at 16 failed.
M6 WAS GREEN ON THE FIRST RUN. Every world had ONE row, so a refusal written `groups.slice(0,1).filter(...)` was indistinguishable from one inspecting all of them — found by mutation, not by argument. Closed with a two-row bill whose SECOND row is the silent one, asserting the message names Bolle and not Kaffe.
PREMISE RE-VERIFIED RATHER THAN INHERITED. Both fields are written in exactly one place (the reducer). Readers outside it: CheckLine:16 (safe — global-mixin:165 gates priceLabel), SellScreen:580 (the money), CheckLine:24 and :147 (the tag). The check-vs-receipt correction checked before repeating either claim: these sums feed a CHECK, whose rows render netLineAmount, so "a total disagreeing with its own lines" is NOT reachable here and is not claimed.
Suite 2804 passed / 2 failed / 2806, 118 suites, vs untouched baseline 2775 / 2 / 2777, 117 — exactly +29 tests and +1 suite, no regression. Same two journey-artifact-store worktree-basename reds; baseline run on a clean tree twice, before and after the outage, to an identical result.
THE FIRST BASELINE ATTEMPT EXITED 0 ON A ts-jest VALIDATION ERROR — the worktree had no node_modules. Symlinked to the shared one as the siblings do; a run judged by exit code alone would have recorded that as a pass.
MERGE HAZARD: utils/price.js and translations/{no,en,de}.ts were ALREADY DIRTY in the shared checkout before I started. price.js's +118 uncommitted lines are an EARLIER revision of the X/Z lineage already committed on my baseline (the short negatedAmountLabel doc) — same content by another route, not a rival change, but it is where isAmountInPlay lands. The translations carry ~380 uncommitted lines of another lane's work; my change is one key per file.
Nothing I touched was dirty in my own tree (fresh worktree off the ref). PosShell.vue, PosTopBar.vue, XReportView.vue and an untracked ClockScreen.vue are dirty under components/admin/pos/; none of them mine.
END RETURN
```
