```
RETURN: L-CONFIRM-POSTMERGE-PIN
brief: 9625ef10
verdict: built
evidence: /Users/svendaneel/okam/wt-postmergepin @ 02c077cb on lane/confirm-postmerge-pin off d9189fbd (1 file, pathspec commit, unpushed)
log: Base verified: the file exists only on lane/composition-root-check (bfe57c3c) and its child
  lane/reservation-limiter-move (d9189fbd). BRIEF CORRECTION: lane/confirm-conat-retire (6771ba9a)
  is a SIBLING off 8704ff63 that does not contain the file at all. Worked off d9189fbd.
  Finding held: AddMcpAuthentication registers IReservationRateLimiter at no line (it sits in
  Program.AddServices:1029), so the DoesNotContain could not fail. The neighbours do bite -
  AddMemoryCache and AddSingleton<IOAuthSmsRateLimiter> are still in that method, below the validation.
  REPLACED, not deleted: the brief allowed deletion, a stronger assertion existed. The new test pins
  PLACEMENT - AddMcpAuthentication with an empty Mcp section and a Development env SUCCEEDS, two
  Contains lines prove it ran past its registrations, then DoesNotContain(IReservationRateLimiter).
  Mutation A (registration moved back inside AddMcpAuthentication): 2 red of 10 - the new test AND
  the wire test The_reservation_limiter_still_resolves_after_the_failure, which the old line could
  not see. Mutation B (validation moved below the registrations): the neighbours' test reds on
  DoesNotContain, so neither was weakened. Rebuilt each cycle, WebApi.dll mtime moved 16:59:10 ->
  17:00:17 -> 17:00:58 -> 17:01:40 -> 17:02:09, green restored after both.
  Fast tier 4420/4408/0/12 vs base 4419/4407/0/12; doc block 128-136 rewritten; no container started.
END RETURN
```
