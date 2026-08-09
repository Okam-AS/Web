# The MCP principal repair — could not be faithfully asserted at runtime; here is exactly where it stops

Lane: L-THE-MCP-PRINCIPAL-REPAIR-IS-ASSERTED-AT-RUNTIME. Backend trunk `ada218783`. Verdict:
**aborted** — a hand-built principal would settle nothing (it would assert my own claim-shape
assumption, the void-run shape in a new costume), and a *faithful* runtime principal requires
building an entire OAuth authorization-code + PKCE + dynamic-registration + demo-login + consent
wire flow that does not exist anywhere in the 5000-test suite. I did not ship a test that passes
for the wrong reason.

## The crux, located to a single runtime bit

The site is `Mcp/Services/McpShoppingService.cs`, `RequirePrincipal()` (the census's `1138-1156` in
the pre-split numbering; the repair block):

```csharp
var userId = GetUserId(user);                    // NameIdentifier(long) ?? "sub" ?? Identity.Name
if (user.Identity?.Name == userId) return user;  // early-out
var claims = user.Claims.ToList();
if (!claims.Any(x => x.Type == ClaimTypes.Name))  // <-- THE BRANCH
    claims.Add(new Claim(ClaimTypes.Name, userId));
return new ClaimsPrincipal(new ClaimsIdentity(claims, authType, ClaimTypes.Name, ClaimTypes.Role));
```

`ClaimTypes.Name` is the **long XML URI**. The repair fires iff the validated principal carries **no
long-URI Name claim**. Everything reduces to one runtime fact:

> Does OpenIddict *validation*, as configured here, expose the token's name claim as the short
> `"name"` or map it to the long `ClaimTypes.Name`?

Static reading cannot guarantee that — it is version- and configuration-dependent — which is exactly
why the census refused to settle it and this lane exists.

## What IS settled by direct read (issuer side + config), and why it is only context

- **The token carries short-form `Claims.Name` = `user.DisplayName`.**
  `Controllers/OAuthAuthorizationController.cs:158` — `identity.SetClaim(Claims.Subject, user.Id)
  .SetClaim(Claims.Name, user.DisplayName).SetClaim(Claims.PreferredUsername, user.PhoneNumber)`.
  The census's stake is confirmed: `Claims.Name` is `DisplayName`, **neither unique nor stable** — a
  collision risk, not merely a misattribution. `Claims.Subject` (`"sub"`) = `user.Id` is the stable id.
- **`GetUserId` returns the stable id** for such a token: `Services/Mcp/McpAuthorization.cs:75-77` =
  `NameIdentifier(long, absent) ?? "sub"(=user.Id) ?? Identity.Name`, so `userId` = `user.Id`.
- **Validation is unconfigured either way.** `Helpers/ServiceCollectionExtensions.cs:128-132` —
  `AddValidation(o => { o.UseLocalServer(); o.UseAspNetCore(); })`. No `NameClaimType`, no
  `MapInboundClaims`. "Directs it neither way," as the brief states.

If OpenIddict validation preserves the short `"name"` (its documented default is to leave OAuth/JWT
short names and NOT apply Microsoft's inbound-URI mapping), then `!claims.Any(ClaimTypes.Name)` is
**true**, the repair **fires**, and `Identity.Name` becomes the stable `user.Id` — the site is
**safe**. If instead something maps `"name"` → long `ClaimTypes.Name`, the repair does **not** fire
and `Identity.Name` stays `DisplayName` — the collision risk stands. **This paragraph is a static
expectation, explicitly NOT a runtime measurement.** Settling it by asserting it is the move the
brief forbids.

## Why a faithful runtime principal could not be produced within this lane

To obtain a principal built by *this app's* OpenIddict validation, a request must carry a real
access token that *this app's* OpenIddict server minted. Every step below was verified present in
the source but is unbuilt in the test tier:

1. **No client exists.** `appsettings.json` → `Mcp.Clients: []`, and `OpenIddictSeeder.SeedAsync`
   (`Program.cs:330`) seeds only from that list — zero applications. A client must first be created
   via **dynamic registration** (`/oauth/register`, `OAuthDynamicClientRegistrationController`).
2. **Only interactive grants.** `ServiceCollectionExtensions.cs:89-90` allows **authorization-code +
   refresh-token only**, with `RequireProofKeyForCodeExchange()` — **no `client_credentials`**, so
   there is no non-interactive mint. Refresh needs a prior code.
3. **Login is SMS-OTP.** `/oauth/authorize` forbids/redirects unless an `OAuthLoginCookieScheme`
   cookie is present (`OAuthAuthorizationController.cs:58-67`); the cookie comes only from
   `/oauth/login/verify`. A **demo bypass exists** (`+4799999999` / `123123`, committed) so this one
   step *is* drivable headlessly — but it is only step three of six.
4. **Consent is an HTML POST.** `/oauth/authorize` renders a consent page
   (`OAuthAuthorizationController.cs:89`) that must be parsed and POSTed to obtain the code, then
   exchanged at `/oauth/token` with the PKCE `code_verifier`.
5. **Then** an MCP tool endpoint call with the bearer, and a seam to observe the principal
   `RequirePrincipal` built.

**No test in the entire suite mints or validates an OpenIddict access token** (grep across
`WebApi.Tests`: zero faithful hits; the apparent matches are `Destinations`/`SetClaim` in payment
code). The existing MCP coverage does not touch this branch:

## Executed anchor — the suite is green and blind to this branch

`dotnet test --filter "FullyQualifiedName~Mcp&Database!=SqlServer"` at `ada218783`, from
`WebApi.Tests/`, `--logger trx`: **79 passed / 0 failed / 0 skipped** (trx-counted). The one test
that reaches `RequirePrincipal` — `Triage_mcpshopping_McpCheckoutTests` — **hand-builds** its
principal with *both* `ClaimTypes.NameIdentifier` and long-URI `ClaimTypes.Name`
(`CreateHttpContext`, its lines 234-239). With a long `ClaimTypes.Name` present, the branch
`!claims.Any(ClaimTypes.Name)` is **false**: the repair's fire path is never executed, and the
OpenIddict-shaped short-`"name"` case is never observed. The green suite agrees with a chosen claim
shape — precisely the shape this lane was asked not to reproduce.

## The exact change that WOULD settle it (named, not shipped)

A wire test under the `WireHost` collection that: (a) POSTs `/oauth/register` for a public client
with a loopback redirect and `okam:mcp.read`; (b) drives `/oauth/login` + `/oauth/login/verify` with
the demo pair to get the cookie; (c) GETs `/oauth/authorize` (PKCE S256, `resource=
https://api.okam.no/mcp`) and POSTs the consent form for the code; (d) exchanges at `/oauth/token`;
(e) calls an MCP tool with the bearer; (f) asserts, from a captured principal, whether a long-URI
`ClaimTypes.Name` claim is present — i.e. whether the repair fires — then mutates the branch
condition (`!claims.Any(x => x.Type == ClaimTypes.Name)` → `true`) and confirms the arm reds,
named from a trx with the executed count. That is a harness-sized build with no precedent in the
suite; it belongs to a dedicated lane, not smuggled in behind a hand-built principal.

## Hygiene

One detached worktree `OkamAPI-mcpprobe` at `ada218783`, used only to run the existing MCP tests
(no source mutated), removed with `rm -rf` + `git worktree prune`. Trunk untouched at `ada218783`.
The site was **not repaired**. No commit to any trunk, no branch move, nothing pushed. Load gated
separately before the run (12.56).
