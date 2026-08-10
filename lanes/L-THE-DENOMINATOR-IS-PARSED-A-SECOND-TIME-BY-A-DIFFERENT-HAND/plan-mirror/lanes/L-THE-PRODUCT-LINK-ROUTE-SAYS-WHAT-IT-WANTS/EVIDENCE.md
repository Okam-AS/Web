# L-THE-PRODUCT-LINK-ROUTE-SAYS-WHAT-IT-WANTS

worktree: /Users/svendaneel/okam/OkamAPI-mrgifmatch
branch:   lane/product-link-route-says-what-it-wants @ 6e8fedfa8 (NOT pushed)
branched from: feature/restaurant-modules @ 9fb057d00 (read fresh; tip matched the brief)

## Tier (dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer")
baseline 9fb057d00, measured in THIS worktree: Passed 4880 / Failed 0 / Skipped 10 / Total 4890
mine     6e8fedfa8:                            Passed 4887 / Failed 0 / Skipped 10 / Total 4897
delta +7 = exactly the new file. No SQL container (the filter excludes them).

## Added tests -- WebApi.Tests/Margin/MarginProductLinkPreconditionDiscoveryTests.cs (7)
1 An_omitted_precondition_is_refused_with_the_header_and_the_revision_it_wanted
2 A_caller_retries_from_the_refusal_alone_and_that_write_lands
3 An_undecodable_precondition_is_refused_with_the_revision_too("!!! not base64 !!!")
4 An_undecodable_precondition_is_refused_with_the_revision_too("v0")
5 An_undecodable_precondition_is_refused_with_the_revision_too("*")
6 The_link_read_hands_the_revision_out_in_the_body_and_the_ETag
7 An_unknown_recipe_keeps_the_400_and_names_no_revision
Modified (count unchanged): MarginRecipesControllerTests.Aggregate_mutations_without_if_match_are_400_and_never_call_the_service
 -- now also asserts code=margin.revision-required, header=If-Match, and that the WRITE is still never reached
    (links.Calls 0) while the refusal's revision read is counted apart (links.RevisionReads 1).

## Mutants applied and reverted (43-test lane suite; baseline 43/0)
M1 NamingRevision always returns `this`                     -> 5 failed (1,2,3,4,5)
M2 drop ["header"]="If-Match" from Precondition             -> 6 failed (1,3,4,5,7 + controller test)
M3 drop SetETag(current) on the refusal path                -> 4 failed (1,3,4,5)
M4 drop SetETag(links.Revision) in GetProductLinks          -> 1 failed (6)
M5 GetRecipeRevisionAsync goes through ReadRecipeAsync (404)-> 1 failed (7)
M6a GetRecipeRevisionAsync advertises a stale token         -> 6 failed (1,2,3,4,5,7)
M6b GuardIfMatch stops comparing                            -> 1 failed (existing convergence 409 pin)
M6b+M6c also disarm ApplyConcurrencyToken                   -> 5 failed incl. test 2's impostor control
M7 drop SetETag on the PUT success                          -> 1 failed (2)
M8 revert RunWithIfMatch to TryReadIfMatch/ModuleProblem    -> 7 failed (1,2,3,4,5,7 + controller test)

## Sibling Margin routes carrying the same silence (surveyed, not changed)
untyped prose refusal, no code, no value -- MarginContractSupport.TryReadIfMatch:
  PUT margin/ingredients/{id}                       Controllers/MarginIngredientsController.cs:101
  POST margin/ingredients/{id}/archive              Controllers/MarginIngredientsController.cs:120
  PUT margin/suppliers/{id}                         Controllers/MarginSuppliersController.cs:89
  POST margin/suppliers/{id}/archive                Controllers/MarginSuppliersController.cs:106
  PUT margin/suppliers/{id}/items/{itemId}          Controllers/MarginSuppliersController.cs:159
coded but naming no value -- TryReadCodedIfMatch, no NamingRevision:
  PUT margin/statements/{id}/inputs                 Controllers/MarginStatementsController.cs:106
  POST margin/statements/{id}/recalculate           (same block)
  POST margin/statements/{id}/finalize              (same block)
  PUT margin/waste/{id}                             Controllers/MarginWasteController.cs:90
  DELETE margin/waste/{id}                          (same block)
  PUT margin/recipes/{id}/versions/{versionId}      coded by THIS commit, value still unnamed
  POST margin/recipes/{id}/versions/{versionId}/activate            "
  POST margin/recipes/{id}/retire                                   "
The last three want the VERSION's / active version's revision, not the recipe's, so each needs its own
resolver -- not a one-line extension of this lane.
No Margin read except GET product-links emits an ETag, so the shared margin.revision-required detail's
"the ETag header" clause is still false for the other resources.
