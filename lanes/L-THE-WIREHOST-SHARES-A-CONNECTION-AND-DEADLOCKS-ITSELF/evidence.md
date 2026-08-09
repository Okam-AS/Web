# The connection was not the cause — disproven by two measurements, and the real block is named

Lane: L-THE-WIREHOST-SHARES-A-CONNECTION-AND-DEADLOCKS-ITSELF. Backend base `28e60e6b8` (trunk since
`6d5328004`). Verdict: **aborted — the named connection fix did not unblock it, and I proved why,
then localised the true cause.** The brief's own permission: "if the connection change does not
unblock it, abort and name the next step."

## What I applied (the predecessor's named fix)

A fixture-scoped **shared-cache in-memory SQLite** (`DataSource=file:mcpwire-<guid>?mode=memory&
cache=shared`) with a kept-open keepalive connection, registered by overriding the DbContext in the
fixture's **own** `ConfigureTestServices` — so EF opens a fresh pooled connection per operation
instead of serialising on `WireHost`'s single kept-open `:memory:` connection. **`WireHost` is not
edited**; the ~5100 tests on the shared host are untouched.

## Measurement 1 — the override took effect (executed, trx-named)

`Diag_the_running_host_resolves_the_fixture_shared_cache_connection_not_the_wirehost_single_connection`
boots the host (no OAuth flow, so it cannot block) and asserts the request-scoped
`ApplicationDbContext.Database.GetConnectionString()` contains `cache=shared`. **Passed 1/1**
(`diag.trx`, executed count 1). The running host genuinely uses the pooled shared-cache connection,
not `WireHost`'s single connection.

## Measurement 2 — the flow blocks at the identical point anyway

Re-running the real flow (`A_validated_OpenIddict_principal_...`), the log reaches exactly the same
depth as the predecessor and stops:

```
OAuthAuthorizationController.Authorize ... returned result SignInResult
Executing SignInResult with authentication scheme (OpenIddict.Server.AspNetCore) ...
An ad hoc authorization was automatically created ... 'wiretest-mcp-client'
INSERT INTO "OpenIddictTokens" (...)      <-- 1 occurrence; the encrypted authorization code
```

`/oauth/token` is never reached (`Exchange (WebApi)` count 0). Worker 21765 idle at ~1.3% CPU with
frozen CPU-time — a block, not slow work, by the same CPU-growth test used before.

## Measurement 3 — the thread sample: nothing is touching the database

`sample` on the blocked worker (`blocked-main-thread-sample.txt` beside this file):

- The **main thread** (the xUnit runner) is parked in a managed **`Monitor.Wait`**
  (`ObjectNative::WaitTimeout` → `SyncBlock::Wait` → `_pthread_cond_wait`) — waiting for the async
  test task to complete.
- **Every thread-pool thread is idle** in `WaitHandleNative::CorWaitOneNative` /
  `WaitHandle_CorWaitOnePrioritizedNative` — parked, waiting for work.
- **Zero threads** are executing SQLite, EF Core, OpenIddict, a `SaveChanges`, a certificate, or any
  work: a grep for `sqlite3_step|Execute*Reader|OpenIddict...HandleAsync` active frames returns 0.

## The conclusion the measurements force

**The connection was not the cause.** The single-shared-connection serialisation hypothesis — held
by the predecessor and by me at the start of this lane — is **disproven**: the override demonstrably
took effect (measurement 1), and the flow blocks identically (measurement 2) with **no thread
executing any database operation** (measurement 3). A DB lock would show a thread inside SQLite;
none is. Everything is parked.

What remains is a **deadlocked / lost async continuation in the OpenIddict authorization-response
(`SignInResult`) path under `Microsoft.AspNetCore.TestHost` (TestServer)**. The consent `POST`
enters OpenIddict's server pipeline, the code is created and persisted, and then the continuation
that would write the 302 and return the response never resumes — the request thread's work is
neither running nor scheduled. The login step returned a plain `LocalRedirect` and did not deadlock;
only the OpenIddict `SignInResult` path does, which is what points at the TestServer × OpenIddict
in-process continuation interaction rather than the app's DB or logic.

## The named next step (not applied here)

Host the OAuth flow against a **real Kestrel loopback server** instead of TestServer — e.g. boot the
app with `WebApplication`/`UseKestrel` on `http://127.0.0.1:0` and drive it with a real `HttpClient`
over the socket, so OpenIddict's async response continuations run on the real thread pool without
TestServer's in-process request handling. The harness's flow (client seed → demo login → consent →
issued code) is proven and reusable verbatim; only the **hosting layer** changes from TestServer to
Kestrel. A cheaper corroboration first, if a tool install is permitted: `dotnet-stack report` on the
blocked worker to name the exact awaiting managed frame (unavailable in this environment — neither
`dotnet-stack` nor `dotnet-dump` is installed, which is why a native `sample` was used).

The shared-cache connection change is kept in the preserved harness: it is correct infra hygiene for
the eventual Kestrel-hosted flow (that flow WILL run concurrent requests and should not share one
connection), even though it is not this block's cause.

## The one bit stays unmeasured — refused a third time

Short `"name"` vs long-URI `ClaimTypes.Name` is still not measured, because the flow never reaches
the probe. The assertion and its self-proof mutation remain written-but-unexecuted; no claim is made.

## Hygiene

Detached worktree `OkamAPI-wireconn` at `28e60e6b8`, removed with `rm -rf` + `git worktree prune`.
Only one untracked test file added; **no production or tracked source touched, `WireHost` not
edited**, run-sheet artifacts untouched (filtered tests, not the full tier). My own hung PIDs
(the flow tree 21735 and its testhost/vstest children) were stopped with targeted `kill` by PID —
never `pkill`, never a PID I did not start. `McpShoppingService` not repaired. Trunk untouched.
Nothing pushed.
