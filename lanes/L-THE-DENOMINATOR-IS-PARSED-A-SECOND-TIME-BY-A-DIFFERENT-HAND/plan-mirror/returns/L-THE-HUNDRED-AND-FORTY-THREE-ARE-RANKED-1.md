RETURN: L-THE-HUNDRED-AND-FORTY-THREE-ARE-RANKED
brief: a1971cde
verdict: built
evidence: docs/plan/artifacts/backend-un-upstreamed-ranked.md
log:
RE-DERIVED, NOT INHERITED. The brief named 7d0450a4b; the trunk had moved again to 1c71ae951, so git cherry was re-run there from scratch: 215 unlanded, 7 superseded, 145 live, 63 unmeasurable.
The live class is 145, not 143 — the money tranche landed some and new lanes added others. Every ranked row was re-checked at that tip, so none of them is a branch already superseded.
RANKING BY SIZE WAS TRIED AND DISCARDED: it put the thirteen largest ask-* branches on top, ranking the biggest feature rather than what a person meets. Size is not impact.
lane/ask-* is excluded as ONE UNLANDED FEATURE, 15 branches carrying 918 product files. Whether it ships is a programme decision, not a fix to rank beside a credit-note bug. Named, not dropped.
Shape of the 145 from diffs: 15 programme, 5 large, 43 small M/S/G-adjacent, 47 small otherwise, 29 test-only, 6 docs-only. SIX were opened and read, settled by the diff against its merge-base.
1. lane/ev-vipps-fallback 9e3a607bb — a guest who has ALREADY PAID a Vipps deposit is returned nowhere: the fallBack address and the emailed link were composed separately and drift.
2. lane/xz-printed-defects 6c394057e — an X/Z report claims the venue received money it only invoiced, counting company-account receivables inside Sum mottatt.
3. lane/credit-note-number 24c95aa94 — two bookkeeping documents share one number; the download name came from the route parameter, so it contradicted the number printed inside the PDF.
4. lane/paymenttype-defined-tender bd77cd6b0 — an out-of-range PaymentType reaches a printed fiscal line, because a C# enum is not validated on cast and the binder accepts any integer.
5. lane/ev-inquiry-gate 8ecb47dfa — a venue that never opted in takes public enquiries it can never open; the inquiry service had no module gate at all.
6. lane/meals-release-race f70a0254c — the loser of a release race gets a 500 and the wrong reason, because the unwind's exception propagated in place of the original.
37 CANDIDATES ARE RECORDED unreadable rather than ranked on their commit subjects, which is the evidence this program has been burned by three times. 102 more are classified by diff shape only.
Counts stated as their own classes: 6 ranked, 37 unreadable, 102 shape-only, 145 total. The shortlist is in the lane directory so the next reader starts there rather than at 215.
No landing order proposed, nothing landed, read-only on product code. Artifact force-added past artifacts/ at .gitignore:119 and verified with git ls-files --error-unmatch.
Branch lane/backend-un-upstreamed-ranked at 9002d49 off frontend 9d88101. Backend trunk untouched at 1c71ae951. Nothing merged, nothing pushed.
END RETURN
