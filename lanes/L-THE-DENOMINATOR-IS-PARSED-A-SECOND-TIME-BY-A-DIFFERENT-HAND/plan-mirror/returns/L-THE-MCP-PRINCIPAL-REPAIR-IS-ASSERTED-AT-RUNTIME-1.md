RETURN: L-THE-MCP-PRINCIPAL-REPAIR-IS-ASSERTED-AT-RUNTIME
brief: c3d15b4d
verdict: aborted
reason: A faithful OpenIddict-shaped principal cannot be produced in this tier without building a full authorization-code+PKCE+dynamic-registration+demo-login+consent wire flow that has no precedent in the suite; a hand-built principal would assert my assumption, not measure OpenIddict, so I shipped no test rather than one that passes for the wrong reason.
evidence: lanes/L-THE-MCP-PRINCIPAL-REPAIR-IS-ASSERTED-AT-RUNTIME/evidence.md
log: The finding reduces to ONE runtime bit: does OpenIddict validation expose the token's name as short "name" or long ClaimTypes.Name. The repair fires iff no long-URI Name claim is present.
Issuer side settled by read: OAuthAuthorizationController.cs:158 sets short Claims.Name = user.DisplayName (the census's non-unique, non-stable value, confirmed) and Claims.Subject = user.Id.
GetUserId returns the stable id (McpAuthorization.cs:75-77: NameIdentifier ?? sub ?? Name = user.Id). Validation is bare UseLocalServer/UseAspNetCore, no NameClaimType/MapInboundClaims — neither.
Static expectation, NOT a measurement, and I refuse to settle it by asserting it: if validation keeps short "name", the branch is true, the repair FIRES and Name becomes the stable sub — safe.
Why unconstructable: Mcp.Clients is [] so the seeder registers no client (dynamic registration required); only authorization-code+refresh with PKCE — no client_credentials, no non-interactive mint.
Login is SMS-OTP; a demo bypass exists (+4799999999/123123, committed) so that ONE step is drivable, but it is one of six (register, login+verify, authorize, consent POST, token, then the MCP call).
Zero tests in the whole suite mint or validate an OpenIddict token; the apparent grep hits are Destinations/SetClaim in payment code. The branch has no faithful coverage anywhere.
Executed anchor: dotnet test filter Mcp from WebApi.Tests, trx-counted 79 passed / 0 / 0 — the suite is green and BLIND to this branch.
The one test reaching RequirePrincipal (Triage_mcpshopping) hand-builds a principal carrying long ClaimTypes.Name, so the fire branch is never executed — green agreeing with a chosen shape.
Named the settling test in the evidence: a WireHost OAuth flow that captures the validated principal and mutates the branch to red it — a harness-sized build owed its own lane, not this one.
Not aborted for lack of effort but for lack of a faithful construction: the honest "here is where it stops" the brief values over a hand-built principal that agrees with a guess.
Site NOT repaired. Worktree OkamAPI-mcpprobe (existing tests only, no source mutated) removed and pruned; trunk untouched at ada218783; load gated at 12.56; nothing pushed.
END RETURN
