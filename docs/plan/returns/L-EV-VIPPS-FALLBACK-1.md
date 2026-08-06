```
RETURN: L-EV-VIPPS-FALLBACK
brief: 2ac682ac
verdict: built
evidence: lane/ev-vipps-fallback-2 @ fc09be1d off feature/restaurant-modules 3579bbbc, worktree ../wt-evvippsfb2, local, unpushed - container-free tier (Database!=SqlServer) 4380 passed / 0 failed / 12 skipped, zero containers started - WebApi.Tests/Events/EventsDepositVippsFallbackTests.cs 11/11
log:
BRIEF VERIFIED at 3579bbbc: the adapter sent no FallBack, and VippsService.cs:109 copies model.FallBack onto merchantInfo.fallBack. CORRECTION: three production call sites reach that method, and TWO set a fallback (VippsController.cs:407, McpShoppingService.cs:442), both composing the checkout path. "The only caller that sets one is checkout" is right about the destination but names one call site where there are two.
NON-VACUITY, the decisive measurement: mutate VippsService's FallBack assignment to null and exactly ONE test out of 4392 reds on the whole container-free tier, and it is mine. Every fake-based test stays green. Stronger than the brief claimed: checkout's own fallback has never been covered at that serialization hop either.
M1 adapter FallBack removed = 5 red. M3 refusal degraded to string.Empty = 6 red including all five origin cases. M4 sweep exemption deleted = the sweep fires naming EventsDepositPaymentPortAdapter.cs:462, so the exemption is load-bearing, not decorative.
Mutation hygiene per CLAUDE.md: never --no-build, restored with cp+touch, md5 confirms VippsService is byte-identical to base and is NOT in the commit, and no source file is newer than the built assembly.
REFUSAL non-vacuity: the theory drives a CONFIGURED initiate to InitiateCallCount==1 first, on the same adapter, same fake and same call, then asserts 0 after the unset one. The absence is measured against demonstrated presence, not against a counter that can never rise.
DOUBLE-LAND: FOUND, AND IT IS A FORK, NOT A DUPLICATE. L-EV-GUEST-ORIGIN has committed nothing (branch still at 3579bbbc), but its worktree holds uncommitted work that writes the SAME private GuestReturnUrlOf into the SAME method of the SAME file.
That half will conflict in git, so it gets caught. The dangerous half will NOT: it adds Helpers/Events/EventsGuestLinks.cs (PLURAL) beside the EventsGuestLink.cs (SINGULAR) that L-EV-URI-RELATIVE already committed at 6a7bf75b. Different filenames means no git conflict, so both land and both compile.
Two composers for one guest address is exactly the silent drift the sibling's own docstring says it exists to prevent, and the two designs are incompatible: mine and 6a7bf75b's THROW UriFormatException, its returns a fault enum.
RESOLUTION I RECOMMEND BUT DID NOT TAKE: one composer survives, and EventsGuestLink.cs (singular) is the one already committed on 6a7bf75b and carried byte-identical here, so L-EV-GUEST-ORIGIN should drop EventsGuestLinks.cs and its adapter refusal and keep its distinct half, the appsettings origin. I did not touch its worktree.
TRIMMED to the ruling to avoid a SECOND double land: EventsEmailNotificationDelivery and its credential-sweep re-key are L-EV-URI-RELATIVE's deliverable and are left at base here. The cross-lane agreement test therefore asserts across two INDEPENDENT compositions, which is the stronger claim.
RUNS: 4380/0/12 at fc09be1d against a 4369/0/12 baseline at 3579bbbc. Delta +11 = exactly the new class (6 Fact plus 1 Theory x 5 InlineData), and the diff adds or removes no test attribute in any other file.
C3 FLAG: on this branch alone EventsGuestLink.ProposalPagePrefix has no production caller; it gains one when L-EV-URI-RELATIVE lands. Byte-identity was chosen over trimming so the add/add merges clean. That lane raised the same flag in mirror image.
C7: no log or telemetry call added anywhere in Services/ or Helpers/. The refusal names the SETTING only, asserted to contain neither the token's D nor its N form. appsettings untouched, no real credential in the diff, nothing printed.
C4 no money-path write added (the refusal prevents one). C6 no statutory naming. No migration authored. Zero containers started, the five foreign ones left alone. Nothing pushed. artifacts/journeys/ev-dietary restored and not committed.
NOT PROVEN, as the ruling accepts: nothing here reaches Vipps, and Events:PublicBaseUrl is unset in every committed configuration on this branch, so the guest's approve-and-return leg is unverified.
END RETURN
```
