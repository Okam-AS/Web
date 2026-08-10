# L-CONFIRM-POSTMERGE-PIN — the two mutation runs, written down

Reason shape hit: **(1) the run happened and nobody wrote it down**, with a **(5)** edge — a two-part exit
whose diffable half (the doc block) was in the commit and whose falsifiability half was prose only.
`instrumentless-exits.md` Batch 4: *"Mutation A … and Mutation B were run and written nowhere: no
`mutations.txt`, no lane directory."* **This file is those two runs, re-performed and recorded.**

## The evidence line as it stood before `plan verify` overwrote it

```
evidence: /Users/svendaneel/okam/wt-postmergepin @ 02c077cb on lane/confirm-postmerge-pin off d9189fbd (1 file, pathspec commit, unpushed)
```

## Where it was run, and why not on the branch

Backend trunk `6d5328004b831b3ec99424b73c4d05e1d6077dc8`, detached worktree of
`/Users/svendaneel/okam/OkamAPI-modules`. `02c077cb` **is an ancestor of the trunk**
(`git merge-base --is-ancestor` → 0), so the pin shipped; measuring at the trunk measures the estate rather
than a branch. `lane/confirm-postmerge-pin` still resolves at
`02c077cba65d6dd678e2de746fd55bf805e833f4` — the correction Batch 4 filed against
`twenty-three-branches.md` holds.

**The trunk has moved past the branch in this same file** and the record must say so: at the trunk
`IOAuthSmsRateLimiter` has itself left `AddMcpAuthentication` (`UserController` consumes it), so the
second witness in `An_empty_mcp_section_outside_development_throws_before_any_limiter_is_registered` is
now `IClientIdMetadataDocumentService`, and `A_successful_mcp_registration_registers_no_reservation_limiter`
carries **two** `DoesNotContain` lines rather than one. Mutation B's blast radius differs from the
branch's because of that, and the difference is measured below rather than smoothed over.

Runner every row: `dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter
"FullyQualifiedName~CompositionRoot" --logger trx`, preceded by
`dotnet build WebApi.Tests/WebApi.Tests.csproj`, with `WebApi.dll`'s mtime asserted moved each time.

## The four runs

| # | state | `WebApi.dll` mtime | result |
|---|---|---|---|
| 0 | trunk, unmutated | `2026-08-09T17:39:53` | **Passed — Failed: 0, Passed: 10, Skipped: 0, Total: 10** |
| 1 | **Mutation A** | `2026-08-09T17:41:07` | **Failed — Failed: 2, Passed: 8, Total: 10** |
| 2 | **Mutation B** (A restored) | `2026-08-09T17:42:17` | **Failed — Failed: 9, Passed: 1, Total: 10** |
| 3 | both restored | `2026-08-09T17:42:51` | **Passed — Failed: 0, Passed: 10, Skipped: 0, Total: 10** |

Ten tests executed in all four runs. The ten by name, from run 0's trx:
`CompositionRootLimiterWireTests.{The_mcp_surface_is_dark_and_answers_so,
The_reservation_limiter_still_resolves_after_the_failure,
An_ordinary_route_still_refuses_past_its_cap_and_serves_a_fresh_key,
An_ordinary_non_mcp_route_answers_non_500(route:"/health"),
An_ordinary_non_mcp_route_answers_non_500(route:"/"),
Every_reachable_limiter_still_resolves_after_the_failure,
The_broken_configuration_really_failed_before_the_registrations,
The_globally_registered_filter_is_constructible_after_the_failure}` and
`CompositionRootRegistrationOrderTests.{An_empty_mcp_section_outside_development_throws_before_any_limiter_is_registered,
A_successful_mcp_registration_registers_no_reservation_limiter}`.

## Mutation A — the registration moved back inside `AddMcpAuthentication`

This is the exit's "realistic reordering mutation". `Program.cs:1066` line removed, the same registration
added inside `Helpers/ServiceCollectionExtensions.cs::AddMcpAuthentication`, below the certificate
validation that can throw:

```diff
 // Program.cs (AddServices)
-            services.AddSingleton<WebApi.Services.IReservationRateLimiter, WebApi.Services.ReservationRateLimiter>();
+            // MUTATION A: the registration is moved back inside AddMcpAuthentication.

 // Helpers/ServiceCollectionExtensions.cs (AddMcpAuthentication)
             services.AddScoped<IClientIdMetadataDocumentService, ClientIdMetadataDocumentService>();
+            services.AddSingleton<WebApi.Services.IReservationRateLimiter, WebApi.Services.ReservationRateLimiter>();
```

**2 red of 10 — the same two the RETURN named:**

```
Failed WebApi.Tests.Wire.CompositionRootLimiterWireTests.The_reservation_limiter_still_resolves_after_the_failure [< 1 ms]
  Assert.NotNull() Failure
  at ...CompositionRootLimiterWireTests.cs:line 143

Failed WebApi.Tests.Wire.CompositionRootRegistrationOrderTests.A_successful_mcp_registration_registers_no_reservation_limiter [31 ms]
  Assert.DoesNotContain() Failure
  Found:    (filter expression)
  at ...CompositionRootLimiterWireTests.cs:line 293
```

Line 293 is the reservation-limiter absence assertion itself. **So the assertion the exit is about does
red on a realistic reordering mutation** — the first clause is met by measurement, not by argument. Its
sibling at line 143 reds for the operator-visible reason: under the MCP failure the reservation routes get
a constructor the container cannot satisfy.

## Mutation B — the validation moved below the registrations

`ValidateOpenIddictCertificates(mcpSettings, environment)` moved from above the block to below
`AddMemoryCache()` / `AddScoped<IClientIdMetadataDocumentService>()`. This is the control: it proves the
neighbouring `DoesNotContain` lines still bite, i.e. that nothing was weakened when the reservation line
was replaced.

**9 red of 10 at the trunk, not the 1 the branch measured, and the reason is the trunk's own change.**
The one that matters is the neighbours' test, red on exactly the assertion the control exists for:

```
Failed WebApi.Tests.Wire.CompositionRootRegistrationOrderTests.An_empty_mcp_section_outside_development_throws_before_any_limiter_is_registered [2 ms]
  Assert.DoesNotContain() Failure
  at ...CompositionRootLimiterWireTests.cs:line 260
```

The other seven are collateral and are named so a reader is not misled: with the validation moved below
`AddScoped<IClientIdMetadataDocumentService, ClientIdMetadataDocumentService>()`, the broken-configuration
wire fixture now half-registers that service and `ValidateOnBuild` refuses the whole host —

```
System.AggregateException : Some services are not able to be constructed (Error while validating the
service descriptor 'ServiceType: WebApi.Services.Mcp.IClientIdMetadataDocumentService …': Unable to
resolve service for type 'OpenIddict.Abstractions.IOpenIddictApplicationManager' …)
---- The following constructor parameters did not have matching fixture data: BrokenMcpConfigurationWireFixture wire
```

— so every test sharing `BrokenMcpConfigurationWireFixture` fails at fixture construction. On the branch
the second witness was `IOAuthSmsRateLimiter`, which has no such dependency, so the same mutation reddened
one test there and nine here. **Same conclusion, larger blast radius: the neighbours were not weakened.**

## Restore

Both files written back, not copied: `git status --porcelain` → 0 files, `git diff | wc -c` → **0 bytes**,
and run 3 is green on a rebuilt assembly whose mtime moved.

## The exit's second half, read at the trunk

The doc block above the reservation-limiter absence assertion
(`CompositionRootLimiterWireTests.cs`, above `A_successful_mcp_registration_registers_no_reservation_limiter`)
now reads *"the two `Contains` lines here prove the method ran past its registration block, which is what
makes the assertions below placement facts: moving either limiter back inside that method, at any line in
it, reds this."* Mutation A did exactly that and it did red. The block the lane was opened against — *the
limiter is still registered inside the MCP path* and *the test is red until the move lands* — is gone from
the file. **Second half holds.**

**One measured inaccuracy found next door, recorded rather than fixed** (this lane may not edit the
backend): the doc block above `The_reservation_limiter_still_resolves_after_the_failure` claims *"Putting
the registration back there reds this test **and no other in this file**."* Mutation A reds **two** tests
in this file — that one and `A_successful_mcp_registration_registers_no_reservation_limiter`, both classes
living in `CompositionRootLimiterWireTests.cs`. The sentence was true when only the wire test could see
the move; it is false of the tree today. It is not the doc block the exit names, so it does not block this
lane, but it is the same defect shape one file over and an owner should have it.
