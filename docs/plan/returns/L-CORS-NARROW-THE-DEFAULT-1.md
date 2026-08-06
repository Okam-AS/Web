```
RETURN: L-CORS-NARROW-THE-DEFAULT
brief: 3ba03888
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-CORS-NARROW-THE-DEFAULT/evidence.md
log:
Two diffs, not one: master 6c0b3a19 -> lane/cors-narrow-the-default bed7cab3, integration 8e2b57de -> lane/...-integration aa29464d. Nothing pushed, no shared ref moved, no container touched.
Correction holds: integration has the SAME wildcard inline at Program.cs:96-103, UseCors :284 vs UseAuthentication :305. Merge-base 30dc54ae, master +1, integration +507, so master alone reverts.
lane/cors-followups also leaves the default wildcard at ServiceCollectionExtensions.cs:73-78: it added a named credentialed policy and narrows the default by nothing.
Live proof runs the real AddOkamCors over the worktree's own appsettings.json in the API's pipeline order. Deployed sends allow-origin:* to evil.example on preflights, 401s and 200s; mine sends none.
It returns allow-origin: https://okam.no for a named origin, and http://localhost:3000 only under Development, so refusal and grant are both measured. Five shop hosts were measured calling okamapi.
www.okam-swiss.ch is a Nuxt build OF THIS REPO, API_BASE_URL left at default, live /admin - the caller the correction flagged. Its landing page calls no API, so a shallow check misses it.
Excluded shop.lora-as.no: no NS record, no NOR-ID whois, no CT issuance ever. That registration is gone, so allowlisting it would grant CORS to whoever registers the domain next.
No entity on either branch has a store domain column, so the enumeration is closed, not sampled. ClientConfigurationService.Domains already gates the Dintero return path on the Origin header.
First integration run: 14 red, all mine. 13 were cross-origin download-header wire tests sending Origin https://admin.okam.no, now enumerated on its own evidence, not to make tests pass.
The 14th was UnboundOptionsTypeTests catching my IOptions<CorsOptions>. Reading the policy via ICorsPolicyProvider, the abstraction CorsMiddleware uses, fixes it and leaves that lane's test alone.
WireContractPinsTests pinned "any other origin" via the invented https://admin.example.test, a premise this change falsifies. Repointed to a permitted origin, plus a new refusal-direction test.
Suites: master 168/0, baseline 160 plus 8 new. Integration container-free tier 4647 passed, 0 failed, 12 skipped, 6m33s. No container started or touched, no --no-build anywhere.
Mutations both ways: AllowAnyOrigin -> 6 red on master, 7 on integration incl. the new refusal test; AllowCredentials on the default -> 1 red; loopback strip deleted -> 1 red; restored -> green.
Neither diff contains the trap: SetIsOriginAllowed(_=>true).AllowCredentials() does not throw where AllowAnyOrigin+AllowCredentials does. The prohibition sits in the AddOkamCors doc comment.
Owner-only: okamtest inherits this appsettings via branch test and its origins went unmeasured; the two API keys need rotation, which no CORS change delivers. Values withheld under C7.
END RETURN
```
