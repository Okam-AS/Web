# L-CORS-CREDENTIALED-ORIGIN -- evidence

Lane: L-CORS-CREDENTIALED-ORIGIN (backend). Brief dac0ada5.
Objective: the credentialed preference centre is served by a policy that exists.

## 1. The measurement, and the tip it was taken at

The brief warned the integration tip is moving (a273e013 -> 9888178f -> 35696d6b as three
merge lanes land in parallel) and told me to measure at the tip I actually see and name it.

    tip observed at lane start : 35696d6b  "Merge the composition-root family into feature/restaurant-modules"
    tip re-checked at lane end : 35696d6b  (unchanged; no concurrent landing during this lane)
    repo                       : OkamAPI, branch feature/restaurant-modules (NOT moved by this lane)

The policy had NOT landed. Verified three independent ways at 35696d6b:

    git merge-base --is-ancestor 2a052800 feature/restaurant-modules   ->  NO
    git grep -c GrowthGuestCorsPolicy feature/restaurant-modules       ->  (no matches)
    git show 35696d6b:Program.cs                                       ->  line 100 policy.AllowAnyOrigin()
                                                                           line 284 app.UseCors()   (default policy)

So the credentialed four (spec section 5 endpoints 3/4/5/7) were served by the application-wide
DEFAULT policy answering `Access-Control-Allow-Origin: *`. This is `built`, not `fail-spec`:
the defect the brief describes was real and still open at the tip I measured.

The estate had been carrying this as a "did the named CORS policy land TWICE?" hazard. It is the
inverse: it landed zero times. `2a052800` sits on three unmerged lane branches:
`lane/gr-withdraw-origin`, `lane/growth-prefcentre`, `lane/meals-reachable-api` -- and on none of
them had the merge reached the integration branch.

## 2. Why the wildcard is the defect, not a cosmetic one

The Growth preference centre is the estate's ONE credentialed browser caller. Confirmed on the
frontend, not assumed:

    Web-modules/utils/growth/growth-guest-client.js:108,116,135,165   credentials: 'include'
    Web-modules/utils/growth/growth-guest-client.js:52                CSRF_HEADER = 'X-Growth-Csrf'
    Web-modules/pages/preferences/communications.vue:316-322          the page already documents this exact
                                                                      failure as an open backend defect

A browser refuses `Access-Control-Allow-Origin: *` outright once the request's credentials mode is
`include`. The refusal lands at the PREFLIGHT of endpoint 3 -- the call that OPENS the session -- so
there is no status code and no server log line. It fails in the browser of a person trying to change
their own consent, and it reads as an outage rather than as a misconfiguration.

Events is genuinely unaffected: its guest client sends no credentials. That is exactly why
`L-EV-FAMILY-LAND` could clear its own hazard check honestly and still leave this open.

**Same SITE is not same ORIGIN.** Serving the API at `api.okam.no` beside `okam.no` is what lets the
`SameSite=Strict` session cookie attach; it does NOT remove this policy, because a different host is
still a different origin and CORS still applies. The named policy is required under EITHER reading of
the host ruling. The withdrawn "or" is not reintroduced here.

## 3. What landed

Branch `lane/cors-credentialed-origin`, worktree `/Users/svendaneel/okam/OkamAPI-corscred`,
based on `35696d6b`.

    edbb7dea  Merge the credentialed CORS policy (2a052800): the preference centre is served by a policy that exists
    2a052800  The preference centre is allowed to carry the credential it was built around   (original sha, now an ancestor)

MERGED, not cherry-picked, and that choice is load-bearing. `2a052800`'s parent `3579bbbc` is
already an ancestor of `35696d6b`, so the merge brings exactly one commit AND makes the original
sha an ancestor. A cherry-pick (I built one first: `805e876b`, identical tree `f92bd673`) would have
left the three lane branches above still carrying an unmerged `2a052800` -- which is precisely how the
imagined double-landing hazard would have become a real one. `git merge-base --is-ancestor 2a052800 HEAD`
now answers YES, so any later merge of those branches is a no-op for this content.

One conflict, in `appsettings.Development.json`: the tip had gained an `Events.PublicBaseUrl` block
from the ev-guest-origin landing at the same position as the incoming `Growth.GuestOrigins` block.
Resolved by keeping BOTH; verified by parsing the result rather than by eyeballing the hunk.

The change itself (10 files):

  - `Helpers/PolicyNames.cs`               -- `GrowthGuestCorsPolicy`, and `GrowthCsrfHeader` promoted out of the
                                             controller so the policy allows the SAME header name the guard reads.
  - `Helpers/GrowthGuestCorsOrigins.cs`    -- the allowlist DERIVED from `PreferenceCentreBaseUrl` /
                                             `ConfirmBaseUrl`, i.e. from the guest links Growth itself mints, so it
                                             cannot drift from the pages we send guests to. Deny-closed on empty;
                                             never widened to a wildcard.
  - `Helpers/ServiceCollectionExtensions.cs` -- `AddOkamCors`: default (wildcard, no credentials) + MCP + the new
                                             `GrowthGuestBrowser` policy naming origins and granting credentials.
  - `Controllers/GrowthPreferenceController.cs` -- `[EnableCors(GrowthGuestCorsPolicy)]` on endpoints 3/4/5/7 ONLY.
  - `Program.cs`                           -- composition root calls `AddOkamCors`.
  - `Models/AppSettings/GrowthSettings.cs`, `appsettings.json`, `appsettings.Development.json` -- `GuestOrigins`.
  - two test files (section 4).

Endpoint 6 (`/v1/growth/unsubscribe`) deliberately stays on the permissive default: it is the
RFC 8058 one-click target, POSTed by mail clients that send no `Origin` at all. That decision is
pinned by a test, so moving `[EnableCors]` up to the controller reds instead of silently narrowing
a deliberately public endpoint.

Constraints: no migration authored (C2 untouched), no append-only table read or written (C1), no
secret added to any log sink (C7), no money-path write (C4). C3 reachability is the point of the
lane -- the policy is registered in the composition root AND attached to the four actions AND its
origins come from settings that already exist; there is no unwired half.

## 4. The pin, and the proof it is not one of the 22+ non-failing shapes

`WebApi.Tests/Wire/GrowthPreferenceCentreCorsWireTests.cs` (11 tests) runs on the WIRE tier.
`WireHost` boots the REAL `WebApi.Program` composition root over `TestServer`, so `UseCors` sits
between `UseRouting` and the endpoints exactly as in production. The middleware is present and it
engages: the run log shows `Microsoft.AspNetCore.Cors.Infrastructure.CorsService[4] CORS policy
execution successful` on both the `OPTIONS` and the `GET`.

Every assertion is on RESPONSE HEADERS, and every request carries an `Origin`:

  - preflight `OPTIONS` + `Access-Control-Request-Method`, all four credentialed routes:
    `Access-Control-Allow-Origin` equals `https://okam.no` exactly (never `*`), and
    `Access-Control-Allow-Credentials` is `true`.
  - the REFUSAL direction, same host, same routes: `https://not-okam.example` gets NO
    `Access-Control-Allow-Origin` and NO `Access-Control-Allow-Credentials` header at all.
  - the ACTUAL response, not only the preflight: a real `GET` with an `Origin` returns 401
    (deny-closed on the session, correctly) AND still carries the echoed origin + credentials
    grant -- because a browser re-checks the actual response and discards it, cookie and all, if
    the origin is not echoed there too.
  - `X-Growth-Csrf` is listed in `Access-Control-Allow-Headers` -- a preflight that omits it fails
    identically to the wildcard failure.
  - endpoint 6 still answers `*` and NO credentials header.

The origin asserted (`https://okam.no`) is the DERIVED one, from `PreferenceCentreBaseUrl`, not a
configured extra -- so the pin is independent of which appsettings file the host layered.

### Red-green mutation, run twice, at the merge commit

Mutation A -- swap the policy back by removing the four `[EnableCors]` attributes, so the endpoints
fall back to the wildcard default (the exact pre-fix state):

    build: 0 Error(s)   ->   Failed: 9, Passed: 2, Total: 11
    restore + rebuild   ->   Failed: 0, Passed: 11

Mutation B -- swap the NAMED policy's body to `AllowAnyOrigin()` and drop `AllowCredentials()`:

    build: 0 Error(s)   ->   Failed: 9, Passed: 12, Total: 21   (with the unit tests in scope)
    restore + rebuild   ->   Failed: 0, Passed: 21

Both mutations red BOTH directions: the grant tests fail (no exact origin echoed) and the refusal
tests fail too (the stranger origin now gets a grant). A policy that allowed everything cannot
satisfy this suite. The two tests that survive mutation A are the endpoint-6 pin and the
`Allow-Headers` pin, which is correct -- neither is about the wildcard.

Stale-build trap avoided per CLAUDE.md: every mutate/restore was followed by an explicit `touch`
and a real `dotnet build` (`0 Error(s)` printed each time). No `--no-build` was used anywhere in
this lane, and mutation A was re-run against a from-scratch rebuild at the merge commit after
`bin/` and `obj/` were deleted.

`WebApi.Tests/Growth/GrowthGuestCorsOriginsTests.cs` (10 tests) covers the derivation itself:
normalisation, dedup, relative/unparseable/non-http values skipped rather than thrown, deny-closed
on empty.

## 5. Suite runs (container-free tier only -- no container was started or touched)

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"

    at the cherry-pick (tree f92bd673)  ->  Failed: 0, Passed: 4487, Skipped: 12, Total: 4499  (5m19s)
    at the merge commit edbb7dea        ->  Failed: 0, Passed: 4487, Skipped: 12, Total: 4499  (6m21s)
                                            after rm -rf bin obj and a full rebuild

    trx: lanes/L-CORS-CREDENTIALED-ORIGIN/cors-fast.trx
         lanes/L-CORS-CREDENTIALED-ORIGIN/cors-fast-merged.trx

The `Database!=SqlServer` trait filter was used, never `FullyQualifiedName!~SqlServer`.

Checkout asserted clean before the build and restored after: the wire tier dirties
`artifacts/journeys/ev-dietary/run-sheet.json` and `run-sheet.md` on every run; both were
`git checkout --` restored and NOT committed. `git status --short` is empty at hand-off.

## 6. Residue and what a reviewer should look at

1. **The lane branch is not merged.** `lane/cors-credentialed-origin` @ `edbb7dea` is ready; a merge
   lane lands it. `feature/restaurant-modules` was not moved by this lane, per the hard constraint.
2. **Array-index config merge.** `.NET` configuration overrides arrays by index, so in Development
   `Growth:GuestOrigins:0` is `http://localhost:3000` and the base value `https://www.okam.no` is
   shadowed. Harmless (dev does not serve www.okam.no, and production never layers the Development
   file) but it means "www is in appsettings.json" does not imply "www is allowed in dev".
   Production must never inherit the localhost origins -- the setting's own doc comment says so.
3. **`https://www.okam.no` is a hand-kept extra**, not derived, because no minted link carries it.
   That is the one place the drift this design closes can still occur.
4. **C5 still applies.** This is a suite result. It is evidence the headers are emitted; it is not
   evidence a person completed the journey. The preference centre page also needs the API served at
   an origin on this list before Sven can walk it. Acceptance is his, not the suite's.
