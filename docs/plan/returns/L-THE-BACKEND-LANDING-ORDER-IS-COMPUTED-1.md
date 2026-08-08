RETURN: L-THE-BACKEND-LANDING-ORDER-IS-COMPUTED
brief: 9755cbf8
verdict: built
evidence: docs/plan/artifacts/backend-landing-order.md
log:
Re-measured rather than quoted: 376 lane branches, 217 unlanded at 057c390ad, agreeing across per-branch merge-base --is-ancestor and git branch --no-merged.
THE FINDING: lane/pos-coverage-opened CANNOT LAND ALONE. It is failing-test-first — it adds three test files, two red against the trunk on purpose, documenting the money defects its siblings fix.
Measured at every step, never predicted: trunk 4949/0/11, +pos 4967/2 FAILED, +giftcard 4971/1 FAILED, +invoice 4974/0, +mail 4980/0. Merge exit 0, no abort line, dll mtime moved each time.
The two reds are named: giftcard money COPIED not moved (expected 0, actual 50000) and an order listed twice on a year-spanning invoice (expected 4, actual 8). Each goes green as its own lane lands.
So the recommendation is a TRANCHE, not a sequence: pos, giftcard, invoice land together, because steps 1 and 2 are red by design and landing singly leaves the trunk red for two commits.
mail-revocation-lever is independent and may land before, after or inside it. The reverse inner order pos-invoice-giftcard was not measured and is not claimed.
The predicted file collision does not exist. Giftcard and invoice contributions are disjoint — one touches GiftcardBalanceTests, the other InvoiceDocumentTests.
What couples them is that both fork from b368d930e and carry pos-coverage's whole commit as an unlanded tail: the stacked-chain shape, not a conflict. Shown by blob identity, not by an empty diff.
RE-MEASURED, NOT INHERITED. The sibling tree at 8731755e6 read 4962/0/10; my comparable step 3 reads 4974/0/11. I did not chase the 13-test gap and claim only what this lane ran.
THE GATE IS ALREADY HALF-HONOURED, which is why naming the pair mattered. plan.md:19968 says do not land either half of a-module-off-names-the-module.
The frontend half 2ce83f6 is an ancestor of the frontend trunk, landed by bb22728; the backend half 8357c8a33 is still held. The contested exit is live on one side and absent on the other.
The other 212 by git cherry patch identity: 7 superseded, 143 carrying an un-upstreamed change, 62 unmeasurable across the trunk rebuild rather than assigned a class I did not measure.
A discarded instrument is recorded so nobody rebuilds it: blob equality against the trunk put all 217 branches in one bucket, which measures nothing. git cherry is the tool for supersession.
Artifact and tier logs force-added past BOTH ignore rules, each confirmed first with git check-ignore: artifacts/ at .gitignore:119 and *.log at :5. Verified with git ls-files --error-unmatch.
Branch lane/backend-landing-order at 392a2fd off frontend 3807e90. Backend trunk still 057c390ad, frontend still 3807e90, composition on a detached HEAD. Nothing merged, nothing pushed.
END RETURN
