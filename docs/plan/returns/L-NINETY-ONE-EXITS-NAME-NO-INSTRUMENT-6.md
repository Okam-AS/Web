```
RETURN: L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT
brief: d11b467a
verdict: built
evidence: docs/plan/artifacts/instrumentless-exits.md
log:
Batch 5, eleven lanes, read one at a time as exit + RETURN + the evidence that RETURN names.
5 AMENDED, 6 DECLINED. Only exit: lines inside ## Lanes touched; no body, state:, evidence: line,
decision or flag. Trunk 6d5328004 unmoved. No build, no tier, no jest, no push, neither demo API touched.
AMENDED, all five verified by the tool, verbatim "<LANE> built-unverified -> verified", exit 0:
  L-DOWNLOAD-PDF-WIRE -> ../OkamAPI-modules/WebApi.Tests/Wire/PdfDownloadWireTests.cs
  L-UTLKVIT-SALE-ROW -> ../OkamAPI-modules/WebApi.Tests/Kassa/CreditSaleDocumentRoutingTests.cs
  L-WF-EXPORT-DUPLICATE -> ../OkamAPI-modules/lanes/L-WF-EXPORT-DUPLICATE/evidence.md
  L-TRAIN-READONLY-VISIBLE -> lanes/L-TRAIN-READONLY-VISIBLE/shots/after-setup-row.png
  L-MEALS-POS-TENDER-WIRE -> ../OkamAPI-modules/WebApi.Tests/Meals/MealsPosCreditTenderReachabilityTests.cs
DECLINED, six, six different reasons:
  L-GR-TESTSEND-GUARD - exit demands a WIRE test; evidence is a controller-invocation test
    ((ObjectResult)await owner.TestSend(...)), and the RETURN itself says a wire pin was judged
    undriveable and none was written. Softening "a wire test" to "a test" is the forbidden edit.
  L-EV-GUEST-ORIGIN - two-part exit, one half. RETURN's first line: "WHICH HALF I KEPT ... the
    CONFIGURATION only." The file holds 2 config tests; the refusal half is lane/ev-vipps-fallback-2's.
  L-WF-CLOCK-WIRE - f14c91ec is not an ancestor of the trunk, the test file is absent from 6d5328004,
    and `git grep clock-state -- Controllers/*.cs` at the trunk returns nothing, so the read the exit's
    fourth clause names is not in the estate. The sessionState half landed separately as
    PosClockOutStateWireTests.cs via sibling L-CLOCKOUT-STATE-IS-NOT-OPEN.
  L-EV-OUTBOX-FLAKE - pin real at 59a1d607, not an ancestor. The trunk copy of the class the exit names
    carries a DIFFERENT weaker fix: link excised but token still random, bare DoesNotContain("250",
    beyondTheLink), no AliasingToken, no PinPublicTokenAsync. Exit false of the class it names.
  L-A-FAILED-REPORT-READ-REACHES-THE-OPERATOR - evidence names docs/plan/lanes/<ID>, which does not exist
    and is a directory. Real artifacts are lanes/<ID>/{mutate.py,mutation-receipt.json} + the spec, only on
    unmerged lane/a-failed-report-read-reaches-the-operator 6d43520, not in this working tree (b704d45e).
  L-THE-SIX-UNLANDED-BRANCHES-REACH-THE-TRUNK - landings check out (d30c1c4d4 is an ancestor), but the exit
    also demands the unlandable one RECORDED with its reason and the counts stated. lanes/L-SIXLAND/ is
    EMPTY and no artifact names wf-demo-presence; that record exists only as prose in the lane's own RETURN.
PATH RULE APPLIED AND STATED: six of the eleven RETURNs cite a wt-*/OkamAPI-* worktree. A citation was written
only where the artifact opens from the plan-repo working tree or the backend repo at trunk - repeating the
worktree citation is the 153 path-gone refusals already measured, so it became a decline reason, not a path.
END RETURN
```
