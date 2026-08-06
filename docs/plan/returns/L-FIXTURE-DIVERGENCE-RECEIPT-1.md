```
RETURN: L-FIXTURE-DIVERGENCE-RECEIPT
brief: 115d12da
verdict: built
evidence: /Users/svendaneel/okam/web-fixdiv/lanes/L-FIXTURE-DIVERGENCE-RECEIPT/receipt.md
spec_gap: brief says the check is in no gate and no receipt records a run — both are half-wrong: --prove is gated by test/fixture-refusal-divergence.test.js (8/8 green, though no CI runs any suite), and a five-run receipt exists but on no reachable ref; also --prove is SEVEN arms, not six
reason: -
log:
Ran at frontend e34977a in a private worktree; receipt committed 0dbec34 on lane/fixture-divergence-receipt.
The check reads SOURCE both sides — no server, no port bound. pid 73160 / port 4010 never contacted.
Backend side is a WORKING TREE, not a ref. OkamAPI-modules is DIVERGENT from the tip: 1 ahead, 63 behind.
Used a private `git clone --shared` detached at 8e2b57de; the shared backend checkout was never moved.
RESULT at tip 8e2b57de: RED, exit 1, 1 divergence across 12 anchored routes.
  fixture-behind — GrowthNewsletterService.cs:649 throws 409 growth.test_address_suppressed on test-sends;
  growth-newsletter.js answers no such refusal and declares no exemption. Verified by hand on both sides.
Three worlds, three answers: tip=1 (behind); 34c6c103=1 (AHEAD — the opposite verdict); 597192ef=22.
L-JOURNEY-MARGIN/NOTES.md:114's "22 divergences" reproduces EXACTLY — but only vs feature/swiss, which
  has 0 typed error families and no module controllers. At the tip the number is 1. (It also claims a
  default OKAM_API_REPO; there is none — the script dies exit 2 unset.)
CONTROL: blinding compare() to fixture-behind makes --prove RED on 'removed' while the live run goes
  falsely GREEN — so today's red is load-bearing. Also: closing it -> green; 409->422 -> status-mismatch.
Prior receipt (5 runs) survives only as untracked files + DANGLING commit 5197056 that no ref contains.
Scope: 12/642 backend routes, 5/102 controllers; 4 fixture files answer refusals with zero anchors.
END RETURN
```
