RETURN: L-THE-GIFT-CARD-HOLE-CLOSES-ON-THE-TRUNK
brief: b2552fdc
verdict: built
evidence: docs/plan/returns/L-THE-GIFT-CARD-HOLE-CLOSES-ON-THE-TRUNK-1.md
log:
feature/restaurant-modules 7d0450a4b -> 1c71ae951, a --no-ff merge of 8637cdd51 and nothing else. Not pushed. Worktree api-giftcard DETACHED in place; no worktree holds the branch.
COMPOSITION CONFIRMED, NOT ASSUMED, as its author asked: 71ac73af1 IS an ancestor of the trunk, 8637cdd51's parent IS 71ac73af1, and merge-base(branch, trunk) IS 71ac73af1. One commit to bring.
ZERO CONFLICTS, so no hunk-level resolution was needed and none was performed. git merge-file was not reached. The trunk moved by exactly 2 commits over 7 files, all from the branch.
DECISION CHECK, AND I MADE IT: the gift-card lane block carries NO needs: gate. The module-off lane does (D-SPEC-L-A-MODULE-OFF-NAMES-THE-MODULE, open), so 8357c8a33 was never touched.
THE INHERITED RED IS GONE, as predicted. Trunk baseline 4974 passed / 0 failed / 11 skipped / 4985. Composed 4980 / 0 / 11 / 4991. InvoiceDocumentTests passes at the composed tip.
EVERY TEST ACCOUNTED FOR: delta is exactly +6 passed, +6 total, skipped unchanged — the six named auth tests the branch adds to GiftcardBalanceTests, listed in the lane log.
ARITY SWEEP: 20 call sites of TransferGiftcard across controller, interface, service and tests; full dotnet build reports 0 Warning(s), 0 Error(s). The appended-not-inserted property holds.
Three properties verified in the merged code: ActorClaims.TryResolveUserId not Identity.Name; one shared GiftcardNotFound for all three refusals; ownership check ABOVE the status guard.
NOT A STALE BUILD: WebApi.dll at 11:47:30 postdates the merged sources and the merge commit, both 11:47:06. It did not move during dotnet test because the arity build had just made it.
Tier run from WebApi.Tests/ with --filter Database!=SqlServer, exit 0, full 31197-line log kept. No abort line, no MSB error, no CS error above the summary.
The two "Unhandled exception" lines are the wire host QUARANTINING a real payment rail (WireEgressBlockedException on Vipps and Stripe seams) — the harness behaving, and 0 tests failed.
TRAP CORRECTION: the tier rewrites run-sheet.MD as well as the .json the brief names. Both restored by path; git add -A was never run and the tracked tree is clean.
The two surviving mutations are a proven pair, left alone: the branch's own receipts show ordering and shared-message each surviving alone at 3/6 and 4/6, over a baseline of 11 then 13 executed tests.
Checked against my last three lanes: the runner this branch brings into the backend restores from a buffer with a finally/atexit hook, and names git checkout nowhere executable.
Load gated on uptime before each build and tier, held below 13 throughout. No push, no pkill, no containers, nothing beyond the merge touched.
END RETURN
