```
RETURN: L-COMPROOT-PIN-OVERDETERMINED
brief: 27c3ebe2
verdict: built
evidence: 02c077cb on lane/confirm-postmerge-pin (/Users/svendaneel/okam/wt-postmergepin), WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs
log: ALREADY LANDED BY THE SIBLING L-CONFIRM-POSTMERGE-PIN. No second fix written, no file
  edited on this lane, nothing committed. 02c077cb deleted the vacuous
  DoesNotContain(IReservationRateLimiter) from the throwing test and added a placement test,
  A_successful_mcp_registration_registers_no_reservation_limiter, fenced by two Contains lines
  so it cannot pass by early bail-out. The two neighbour assertions are unchanged.
  I did NOT take the commit message on trust. Re-ran both mutations myself in a throwaway
  detached worktree at 02c077cb that I created and removed, rebuilding every cycle.
  Baseline, filter "Database!=SqlServer&FullyQualifiedName~CompositionRoot": 10/10, dll 17:20:01.
  MUTATION B, the ORDERING break: ValidateOpenIddictCertificates moved below the registration
  block. dll 17:21:19. An_empty_mcp_section_outside_development_throws_before_any_limiter_is
  _registered REDS on Assert.DoesNotContain. That is the exit criterion met: an ordering break,
  not an absence, reds it. MUTATION A, placement: registration moved from Program.cs:1029 back
  beside AddMemoryCache. dll 17:22:12. Exactly 2 red, the new test plus the wire test
  The_reservation_limiter_still_resolves_after_the_failure. Restored, rebuilt 17:22:49, 10/10.
  I started no container; a foreign testcontainers SQL + ryuk appeared 17:21:58, left alone.
END RETURN
```
