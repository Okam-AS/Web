RETURN: L-THE-OFFER-PAGE-STOPS-TELLING-A-GUEST-SOMETHING-UNTRUE
brief: bbcd20ba
verdict: built
evidence: docs/plan/lanes/L-THE-OFFER-PAGE-STOPS-TELLING-A-GUEST-SOMETHING-UNTRUE/FINDING.md
log:
Premise re-measured at the tip first. Both blockers were real and unfixed: the error branch printed the expiry copy for every failure, and acceptOffer assigned the response with no guard.
One brief claim is refuted: there are no five THE DEFECT tests. The page has NO test file at the tip and the tier's coverage table reads pages/offer 0/0/0/0. Zero converted, fourteen written.
Recorded rather than returned fail-spec, because the two defects were real and the exit criterion was reachable. Nothing was turned green by editing a test.
The backend changed the design. An anonymous guest gets 404 for expired OR withdrawn OR registered OR accepted-over-an-hour-ago OR unknown (OfferProposalService.cs:104-123).
Core's TryParseResponse then collapses 404, 500 and never-reached-the-server into one untyped Error with no status. Six causes, one signal, so the page cannot know why a load failed.
So it stops guessing: a failure says it could not load, names the connection and an invalid link as possibilities without asserting either, and offers a retry — this guest's only recovery.
Expiry is claimed in the one place it is provable: an offer that LOADED whose expiration has passed. Reachable via a KAM session, which is served the proposal rather than a 404.
A banner, not a replacement: gating the document behind isExpired would swap the page out from under a guest mid-way through typing her SMS code. Telling her is right, locking her out is a new harm.
acceptOffer reaching the assignment means a 200, which IS the acceptance. An unusable body now marks the loaded proposal accepted instead of replacing it, so blanking is structurally impossible.
Mutations, 5 applied and 5 red: expiry copy back reds 2, unguarded assign reds 6, retry removed reds 1, isExpired false reds 1, detail line removed reds 1. Every restore verified by SHA.
Mutation 1 caught a weak test of MY OWN and it was strengthened rather than kept: the 404 case asserted only the data-test marker, which survives the expiry copy returning inside that element.
Near-miss worth passing on: two tests first passed for the wrong reason. _offerProposalService is a computed on the global mixin; mocks cannot override one, so the REAL service ran.
Tier 169 suites / 4021 / 0, exit 0, zero FAIL lines; trunk was 168/4007/0. Lint 0 errors on both files, and the new test file is 0 problems.
Touched of the three not-mine: only the dead error copy, which fell out free and is now rendered with a test. Untouched: the raw English SMS exception, and the TypeError on a missing phone number.
That TypeError sits inside acceptOffer before my guard and still tells her the CODE was wrong. Branch lane/offer-page-stops-telling-untruths @ 52a93c5, not pushed; worktree removed.
END RETURN
