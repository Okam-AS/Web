# L-CORS-FOLLOWUPS — evidence

Two follow-ups from the Fable review of `L-CORS-CREDENTIALED-ORIGIN`.

## Where the work is

**Backend** — built in the worktree `/Users/svendaneel/okam/OkamAPI-corscred`, NOT on the integration
branch. `AddOkamCors` lives only on the unmerged lane branch.

- branch `lane/cors-followups`, commit `524289b9`, parented on `lane/cors-credentialed-origin @ edbb7dea`
- `lane/cors-credentialed-origin` was NOT moved: it still points at `edbb7dea`. `L-SECURITY-LAND` owns
  landing it, and advancing a branch another lane has already reviewed is the merge hazard this estate
  has paid for before. `lane/cors-followups` is a descendant of `edbb7dea`, so landing it instead of
  `lane/cors-credentialed-origin` subsumes that merge; landing `edbb7dea` alone silently drops this
  filter.

Files:
- `Helpers/ServiceCollectionExtensions.cs` — `AddOkamCors(services, configuration, environment)` plus
  the private `WithoutLoopbackOutsideDevelopment` filter.
- `Program.cs:96` — passes `builder.Environment`.
- `WebApi.Tests/OkamCorsLoopbackOriginTests.cs` — new, 4 tests.

**Frontend** — `/Users/svendaneel/okam/Web-modules`, working tree, UNCOMMITTED by design: the checkout
is on `feature/restaurant-modules`, a shared ref this lane may not move, and it already carries another
lane's uncommitted edit to `test/e2e/journeys/admin-refusal-worker.spec.js`. The diff is preserved as
`frontend-comments.diff` beside this file.

- `utils/growth/growth-guest-client.js` (header block)
- `pages/preferences/communications.vue` (script header block)

## Item 1 — production must not inherit a loopback origin

`appsettings.Development.json` ships in the publish output (the csproj excludes nothing), so the only
gate is `ASPNETCORE_ENVIRONMENT` not reading `Development`, and `GrowthGuestCorsOrigins.Resolve` is
environment-blind — it accepts `http://` and loopback everywhere.

Not new in DEGREE (the same mis-set variable already degrades OpenIddict to development certificates
and drops the `__Host-` cookie prefix) but new in KIND, because neither of those hands out ambient
credentials. `AllowCredentials` on `http://localhost:3000` is trust in anything on an operator's
machine.

The filter skips quietly rather than throwing, matching `GrowthGuestCorsOrigins`, which also skips.
The two fail-fast `throw new InvalidOperationException` guards in the same file were read first: they
guard MCP certificates, where booting without a signing key would mean issuing unverifiable tokens.
An absent CORS origin closes a surface instead of opening one, so the same posture is not warranted.

Applied to BOTH named policies, not only the credentialed one, so a future credentialed policy
inherits it rather than having to remember. Named consequence: the MCP inspector cannot be driven at a
non-Development host from `localhost` even if an operator names that origin. No non-Development
settings file names one today (`Mcp:AllowedOrigins` is `[]` in the base file).

An unparseable entry is deliberately left in place: it is not provably loopback and matches no `Origin`
header a browser can send.

## Non-vacuity — mutation, both directions

Two cases, ONE variable: both worlds feed the identical in-memory configuration
(`Growth:GuestOrigins` = localhost:3000 + 127.0.0.1:3000, `Mcp:AllowedOrigins` = localhost:6274 +
a remote inspector origin) and differ only in the environment name. Assertions are on the resolved
`CorsPolicy.Origins` read back from the built `CorsOptions` — never on a settings file, which is the
mistake `F-CORS-ORIGINS-BY-INDEX` records, since .NET overrides arrays by index and the base entry is
shadowed rather than extended. Each assertion pins the WHOLE list, so "does not contain localhost" is
not satisfiable by a policy that allows nothing at all.

Command (container-free tier only, no container started):

    dotnet test WebApi.Tests/WebApi.Tests.csproj \
      --filter "Database!=SqlServer&FullyQualifiedName~OkamCorsLoopbackOriginTests"

| state | result |
| --- | --- |
| as written | Passed 4, Failed 0 |
| MUTATION 1 — filter deleted (`return origins;`) | **Failed 2**, Passed 2 |
| MUTATION 2 — `IsDevelopment` check deleted, filter unconditional | **Failed 1**, Passed 3 |
| restored | Passed 4, Failed 0 |

Mutation 1 reds exactly the two `Outside_development_*` cases. Mutation 2 reds exactly
`Development_keeps_the_loopback_origins_the_local_web_app_is_served_from` — the guard that a filter
without the environment check would break every developer's local preference centre.

Restores were done with editor writes, not `mv`, and the source mtime was confirmed NEWER than
`bin/Debug/net8.0/WebApi.dll` before the restored run, so no run measured a stale assembly. `--no-build`
was never used.

Full container-free tier after the restore: **Passed 4491, Failed 0, Skipped 12, Total 4503** (5 m 5 s).
No failure that did not reproduce; nothing to name.

## Why a unit test and not the wire tier

`WebApi.Tests/Wire/WireHost.cs:134` does `builder.UseEnvironment(Environments.Development)`, so the
wire host can never exercise this filter — the exact "harness precondition means the filtered path
never runs" shape. `GrowthPreferenceCentreCorsWireTests` therefore stays green for a reason unrelated
to this change, and the unit tier is the only proof. Recorded so nobody later reads the green wire
suite as coverage of the production branch.

## Item 2 — the false "or"

Both frontend comments said the surface starts working when the API is served same-site **or** the
policy names the web origin. For the credentialed endpoints that "or" is false: the named policy fixes
CORS, but a `SameSite=Strict` cookie still never rides a cross-site request. Both comments now state
that BOTH are required and that neither substitutes for the other — the wording the backend's own
comment in `AddOkamCors` already carries, rather than new wording.

The same false "or" was withdrawn once before from the opposite direction (the same SITE is not the
same ORIGIN), which is why it is in the copy now instead of only in a comment on the server.

Both comments' stale premise — that the code builds CORS with `AllowAnyOrigin` — is gone. They now
describe the dedicated policy and its derived allowlist, so they do not go wrong the moment
`L-SECURITY-LAND` lands.

Lint after the edits (both files, project eslintrc): clean, no output.

## Residue, not fixed here

`test/e2e/journeys/growth-privacy-queue.spec.js:283-294` carries the SAME stale premise in a
`journey.finding('note', ...)` string: "the API answers Access-Control-Allow-Origin: * (Program.cs
AllowAnyOrigin)". Its conclusion (the guest half is not browser-drivable) stays true on the cookie half
alone, but its stated reason goes wrong at the merge. Left alone deliberately: it is outside this
lane's exit criteria, it is another surface's evidence narrative, and it is a `note` rather than an
assertion so it changes no result.
