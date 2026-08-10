```
RETURN: L-RESERVATION-LIMITER-MOVE
brief: 3c8286f5
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-reslimiter/lanes/L-RESERVATION-LIMITER-MOVE/evidence.md (commit d9189fbd, branch lane/reservation-limiter-move, local)
log:
One line moved: IReservationRateLimiter AddSingleton out of AddMcpAuthentication (ServiceCollectionExtensions.cs:60) into Program.AddServices, beside AddMemoryCache and the three limiters already unconditional.
Checked sufficiency before building. IsMcpDisabledPath covers /mcp, /oauth, /authorize, /token and four /.well-known/* prefixes, and nothing else.
The two registrations left in that try are reached only from OAuthLogin/OAuthAuthorization/OAuthDynamicClientRegistration, every one of which declares absolute routes under ~/oauth/*, ~/authorize, ~/token. The OAuth cookie scheme has the same two consumers.
Stronger than "the surface is disabled": UseMcpDisabledResponse is installed before MapControllers, so those routes answer 503 without MVC constructing the controller at all. No second registration and no ordering matters - one line IS sufficient, as briefed.
Pin closed. I did not touch the test file: CompositionRootLimiterWireTests.cs is byte-identical to bfe57c3c, git status lists only Program.cs and ServiceCollectionExtensions.cs, and WebApi.Tests.dll kept its 16:02:56 build stamp across all three builds while WebApi.dll changed.
Mutated the other way as instructed: putting the line back inside AddMcpAuthentication reds that one test alone, by the same assertion. Red-green-red, each run against a binary recompiled from the source it measures (mtime-checked against the CLAUDE.md --no-build trap).
Base measured, not inherited: bfe57c3c fast tier, run in my own worktree before editing, 4419 total / 4406 passed / 1 failed / 12 skipped - the briefed value reproduced exactly, and the sole failure named in the trx is the pin.
Lane: 4419 / 4407 / 0 failed / 12 skipped. No test added or removed, the same twelve skipped name for name (diffed between the trx files), one failure converted to a pass.
Both trx committed at d9189fbd, plus lane evidence and mutation log; artifacts/tests/README.md given rows for the pair. Secret-scanned: every hit in either trx is a test name, no values.
No SQL slot taken, no container started, stopped or touched; the five that were up were left alone and still are. The SQL tier remains unrun at this or any SHA. Runs serialised, one test process at a time.
Side effect flagged and deliberately left alone: CompositionRootRegistrationOrderTests' DoesNotContain(IReservationRateLimiter) is now true for a second reason and can no longer fail. Removing it would mean editing the pin's own file in the commit that closes it. Reviewer's call.
C3 satisfied by an existing wire made unconditional, not a new one. C7 clean - nothing added logs anything. MIGRATION: none authored.
C5: this is not acceptance. Nobody has walked a reservation journey in a UI at this SHA, and the outage this closes is a deployment-time failure no suite can prove absent from production.
END RETURN
```
