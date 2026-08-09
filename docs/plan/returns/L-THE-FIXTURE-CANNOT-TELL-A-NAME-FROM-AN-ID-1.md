```
RETURN: L-THE-FIXTURE-CANNOT-TELL-A-NAME-FROM-AN-ID
brief: bbe3ab89
verdict: built
evidence: docs/plan/artifacts/name-versus-id-census.md @ a597c38, force-added past .gitignore:111 and confirmed tracked with git ls-files --error-unmatch
log:
CENSUS COMMITTED. Nothing edited: backend 0 dirty, trunk still ada218783, no worktree created. The brief says the trunk is bcfe0d893; it moved when the credential lane landed.
HEADLINE CORRECTION: the two ARE interchangeable in production today, so this is a latent estate-wide coupling rather than a live exploit - and that is exactly why no test can see a swap.
The app's JWT emits unique_name = user.Id at UserService.cs:609, and the default inbound map makes that Identity.Name; there is no MapInboundClaims=false and no NameClaimType override.
So WireHostFixture is FAITHFUL rather than lazy - it mints through the real GenerateJwtTokenAsync at WireHostFixture.cs:993. The equality it reproduces is production's, not the fixture's.
A THIRD shape the brief did not name: the OpenIddict MCP token sets Claims.Name to user.DisplayName at OAuthAuthorizationController.cs:159 - not unique, not stable, so a swap can collide two users.
Reachability traced, not assumed: the cookie whose Name is the phone number is read in one place, OAuthAuthorizationController.cs:58, which resolves from NameIdentifier and Subject.
C4 ranked first. CartService.cs:1025 and OrderService.cs:683 PERSIST Identity.Name as UserId; DinteroController.cs:66 and VippsController.cs:427 do the same on the two provider paths.
OkamPayoutService.cs:108,140,162 authorize payouts by comparing Identity.Name against ApplicationUserId - three gates, and a swap refuses the genuine store admin silently rather than loudly.
OrderService.cs:788 is the dangerous direction: it decides "requested by store" by INEQUALITY, so a swap makes a customer's own request read as the store's, granting rather than denying.
Also BankAccountController.cs:28,58,73,88 across Connect account create, login-link and delete; PaymentController.cs:32,67,82,98,114; and six Giftcard holder-key reads.
ONE SITE I COULD NOT SETTLE, and did not assert: McpShoppingService.cs:1138-1156 repairs the principal only when no ClaimTypes.Name claim exists, while shape 3 carries the short form "name".
Whether that repair fires turns on OpenIddict claim mapping, which AddValidation directs neither way. Static reading cannot decide it, so it is flagged as wanting one runtime assertion.
THE BLINDNESS IS NOT TOTAL, which a raw grep misses: ActorStampCallSiteTests.cs:61-62, ModuleAuthorizationSubjectTests.cs:56-58 and EventsStoreAdminAuthorizationPinTests.cs:305-306 mint them apart.
So ActorClaims is already covered; what is uncovered is the call sites reading Identity.Name directly, which never pass through it. WireHostFixture reach: 42 files, 263 declarations.
Coverage stated honestly: ~135 further occurrences were grepped but not read line by line, named as a bounded remainder rather than a clean bill. Counts came from Python after a shell loop word-split.
END RETURN
```
