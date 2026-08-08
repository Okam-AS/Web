RETURN: L-A-GUEST-WHO-PAID-IS-RETURNED-SOMEWHERE
brief: 4b7e0bd6
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-A-GUEST-WHO-PAID-IS-RETURNED-SOMEWHERE/evidence.md
log:
LANDED. Backend trunk 1c71ae951 -> 976489141, non-SQL tier 4992 / 0 failed / 11 skipped, exit 0, no abort line above the summary. Nothing pushed.
THE DEFECT WAS LIVE AND ITS MECHANISM IS NOT DRIFT. The adapter built the Vipps order with five properties and FallBack was not among them, so merchantInfo.fallBack went out NULL; VippsService.cs:109 copies it straight through.
Swept every FallBack assignment repo-wide: VippsController.cs:407 and McpShoppingService.cs:442 both send one. The Events deposit adapter was the ONLY Vipps caller on the platform sending none.
THE ARMS ACTUALLY RAN, which the aggregate cannot show: a dotnet log names only failed and skipped tests, so twelve absent arms and twelve passing arms give the same green summary. By name: Passed 12, Total 12.
TIER MEASURED AT BOTH ENDS rather than carried over: trunk 1c71ae951 = 4980/0/11, tip = 4992/0/11. Delta +12, which is exactly the new suite's 12 cases, so every test is accounted for.
MUTATION KILLED, and it is not synthetic: deleting FallBack = fallBack reproduces trunk 1c71ae951 BYTE FOR BYTE, so the red proves the arms catch the live defect rather than a contrived variant.
Baseline total=12 failed=0; M1 total=12 failed=5. The count held at 12 across both runs, so neither is an INVALID-RUN, and the file restored byte-for-byte via a finally AND an atexit hook.
ONE CORRECTION TO MY OWN RUNNER: it fired STALE-BUILD on the unmutated baseline -- the guard misfiring, since MSBuild correctly skips a project whose sources predate its output. Fixed by touching the source before every build.
A TRUNK MOVED UNDER ME AT THE END, and I am reporting rather than forcing. My first end-state read returned 2e9592376 with my fix absent; three settled reads now return 976489141 with it present, so that read was a transient.
THE SINGLE SOURCE IS Helpers/Events/EventsGuestLink.cs, used by the adapter at :463 and the mail path at :144. It validates the SCHEME, not just absoluteness -- on Unix new Uri("/events/deposit/", UriKind.Absolute) succeeds as file:///, so a relative PublicBaseUrl silently yields a file:// link, while Windows throws and hides the defect on a dev machine.
THE TEST MEETS THE BAR: it takes the fallback from the ADAPTER and the link from the REAL mail path, not a second call to the composer; a companion arm captures the serialized body, covering the hop that would let a fix land on a field Vipps never sees.
DECISION CHECK MADE BEFORE MERGING via each open decision's blocks: field. Sixteen open; none names this lane or the Events deposit rail.
FIRST LANDING TO USE THE --detach FIX I NAMED after moving the trunk by accident earlier in this lane. Worktrees detached, trunk moved with branch -f ONLY after the tier came back green.
The reflog shows another actor reset the trunk to 2e9592376 and back. COLLATERAL, NOT MINE TO FIX: that reset dropped lane/credit-note-number's landing (24c95aa94); its branch is intact but it is no longer on the trunk.
Both worktrees torn down; both run-sheet artifacts restored and never staged; no worktree holds the trunk. Trunk verified stable at 976489141 across three consecutive reads.
END RETURN
