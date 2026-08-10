```
RETURN: L-THE-PRODUCT-LINK-ROUTE-SAYS-WHAT-IT-WANTS
brief: 756a5e4a
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-mrgifmatch/.lane/EVIDENCE.md
log:
Branched from feature/restaurant-modules 9fb057d00, tip read fresh and matching the brief; lane/product-link-route-says-what-it-wants @ 6e8fedfa8, unpushed.
The requirement stands untouched. What changed is the refusal: coded margin.revision-required / margin.revision-invalid instead of an untyped sentence.
It names the header in `header` and the recipe's CURRENT token in `revision`, repeated in the response ETag, so a caller can retry from the refusal alone.
GET product-links emits that token as an ETag as well as in the body: the refusal's own "GET the resource ... the ETag header" was false, Margin emitted none anywhere.
Exit shown at the route: a header-less PUT refused 400 carrying the revision, then that exact token resent gives 200 with the link active.
Negative control in the same test: a well-formed impostor token is 409 stale on the same row, so the accepted one is discrimination, not a surface that takes anything.
The revision is read on the refusal path only, via a narrow GetRecipeRevisionAsync that never throws; the enriched read would have turned this 400 into a 404 on a mistyped id.
Backend non-SQL 4887/0/10 against a 4880/0/10 baseline I measured myself at 9fb057d00 in this same worktree; delta +7 is exactly the new file.
All 7 added tests are in WebApi.Tests/Margin/MarginProductLinkPreconditionDiscoveryTests.cs: omitted refusal, retry-from-refusal, 3 undecodable arms, GET ETag, unknown recipe.
MarginRecipesControllerTests kept its count and gained the code/header asserts plus a split counter proving the WRITE is still never reached before the precondition.
Eight mutants applied then reverted, each red: NamingRevision neutered, header member dropped, both ETag emissions dropped, a stale token advertised, the coded refusal reverted.
Siblings surveyed, NOT changed: 5 master-data routes still refuse with untyped prose; statements and waste are coded but name no value; recipes' 3 other mutations are coded here, value still unnamed.
Those 3 want the version's revision rather than the recipe's, so each needs its own resolver; named rather than silently skipped.
DISCLOSURE: my first filtered run used FullyQualifiedName~WebApi.Tests.Margin and a Margin fixture started its own SQL container for 33s before disposing it. No lwtwo container touched, no port bound.
Every run after that used --filter "Database!=SqlServer" and started none. Route-level proof only; no browser, so acceptance is still a person's.
END RETURN
```
