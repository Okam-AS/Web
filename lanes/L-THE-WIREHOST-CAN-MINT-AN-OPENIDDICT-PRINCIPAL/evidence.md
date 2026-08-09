# The WireHost OpenIddict harness — driven to a real authorization code, blocked one step short by the tier's shared connection

Lane: L-THE-WIREHOST-CAN-MINT-AN-OPENIDDICT-PRINCIPAL. Backend base `ada218783` (trunk since moved
to `28e60e6b8`). Verdict: **aborted at the last step, with the expensive part built and preserved.**

## What was built and proven to run

A dedicated wire fixture + test (`McpOpenIddictPrincipalWireTests.cs.harness` beside this file)
drives the **real** OpenIddict flow through the `WireHost` — no hand-built principal anywhere:

1. **Seeds a public client** via `IOpenIddictApplicationManager.CreateAsync(McpOpenIddictDescriptors
   .CreatePublicClient(...))` — faithful, exactly as `OpenIddictSeeder` does, sidestepping the empty
   `Mcp.Clients`.
2. **Demo-code login** — `POST /oauth/login/verify` with `+4799999999` / `123123` → the real
   `OAuthLoginCookieScheme` cookie. No SMS.
3. **Consent** — `POST /oauth/authorize` with the OAuth params + `decision=accept` + the cookie.

Measured from the run log (`mcp-run2.log`), all of this executed against the genuine pipeline:

```
OAuthAuthorizationController.Authorize ... returned result SignInResult
Executing SignInResult with authentication scheme (OpenIddict.Server.AspNetCore) ...
OpenIddict.Server.OpenIddictServerDispatcher: An ad hoc authorization was automatically created
  and associated with the 'wiretest-mcp-client' application: 5e488e8a-...
INSERT INTO "OpenIddictTokens" (... "Payload" ...)          <-- the authorization CODE, encrypted, persisted
```

**The hard half — which nothing in the ~5100-test suite had ever done — works: the app minted a
real, encrypted OpenIddict authorization code for a seeded client via the demo-login + consent
flow.** That the encrypted `Payload` is already in the INSERT proves the dev signing/encryption
certificate loaded and encrypted successfully (so the macOS keychain / dev-cert path is **not** the
blocker).

## The exact step that refuses

`INSERT INTO "OpenIddictTokens"` (line 1078) is the **last** flushed log line. `/oauth/token` is
**never reached** (`grep -c "Exchange (WebApi)|oauth/token|access_token"` = 0). The consent `POST`
never returns: OpenIddict's authorization-response completion — the work immediately after
persisting the code — **blocks silently** (no exception, no `database is locked` message). The
test-host worker sat at ~1% CPU with no CPU-time growth: a block, not slow computation.

**Cause, evidenced by elimination:** it is not the OAuth flow (login + consent + code issuance all
succeeded), not my harness logic (it reached code issuance faithfully), and not the certificate
(the code was encrypted and persisted before the hang). What remains is the `WireHost`'s **single,
kept-open `:memory:` SQLite connection** (`WireHost.cs:113-114`, `DataSource=:memory:`, one
connection shared by every request and every store). OpenIddict's response pipeline issues a further
DB operation after the code INSERT; a single SQLite connection serializes, and an overlapping
command blocks on SQLite's busy handler — which retries silently rather than throwing. Every
existing wire test avoids this because none drives OpenIddict's multi-step token machinery; the JWT
wire tokens use the app's symmetric key and touch no OpenIddict store.

## The concrete fix the next attempt needs (not applied here)

Replace the single `:memory:` connection with a **shared-cache** in-memory SQLite database
(`DataSource=file:<guid>?mode=memory&cache=shared`) plus one keepalive connection held for the
fixture's lifetime, so EF/OpenIddict can open multiple concurrent connections to the same in-memory
data. This is the standard remedy for concurrent EF access to in-memory SQLite. It belongs in the
DbContext registration, which my fixture can override in its own `ConfigureTestServices` (added
after `WireHost`'s) without editing `WireHost` — remove the `DbContextOptions`, re-add with the
shared-cache connection, and let `Program.Main`'s boot create the schema on it. With the connection
serialization removed, the flow should complete `/oauth/token`, and the harness's probe
(`/wiretest/mcp-principal`, a test-only `IStartupFilter` that calls
`AuthenticateAsync(ClaimConstants.McpAuthenticationScheme)` and serialises the validated principal's
claim types) then reads the one measured bit.

## The demo-code bypass does not change the principal's shape

The demo bypass affects only how the login cookie is obtained (a static code vs an SMS round-trip).
The access token's claims come from `OAuthAuthorizationController.AddUserClaimsAsync` reading the
`ApplicationUser` (`SetClaim(Claims.Subject, user.Id)`, `SetClaim(Claims.Name, user.DisplayName)`)
and from OpenIddict's validation — not from the login method. So a real login would produce the same
principal shape; the measurement, once unblocked, is a general answer, not an artefact of the bypass.
(The seeded demo user carries `FirstName="Demo"`, `LastName="Display"` so `DisplayName` is a
non-empty, non-phone value — the census's non-unique, non-stable field, made observable.)

## The one bit remains unmeasured — honestly

The assertion (`DoesNotContain(ClaimTypes.Name)` / `Contains(Claims.Name)`) and its self-proof
mutation (issuer `SetClaim(Claims.Name, …)` → `SetClaim(ClaimTypes.Name, …)`) are written in the
harness but **did not execute to a result**, because the flow blocks before the probe. No claim is
made about which name-claim shape validation produces — that is exactly the void-run shape the
predecessor lane refused, and it is refused again here. The next attempt applies the connection fix,
runs, reads the shape, and mutates.

## Hygiene

Detached worktree `OkamAPI-wiremint` at `ada218783`; only one new untracked file added
(`WebApi.Tests/Wire/McpOpenIddictPrincipalWireTests.cs`), no tracked source dirtied, run-sheet
artifacts untouched (a filtered test, not the full tier). My own hung test PIDs (45211/45266/45267,
which I launched) were stopped with a targeted `kill` by PID — never `pkill`. `McpShoppingService`
was not repaired. Trunk untouched. Nothing pushed.
