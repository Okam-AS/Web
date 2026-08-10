# L-COMPOSITION-ROOT-CHECK — the decline stands against its trx, and the estate has moved underneath it

Reason-shape hit: **(4) the evidence proves the opposite of the exit** — confirmed. But this pass found a
second thing the prior read could not have known, and it changes what the lane needs: **the fix and the pin
are both on the backend trunk today**, so the exit is now plausibly satisfiable by one run that nobody has
made. **This lane is NOT verified by this pass**, and it is not verified because a measurement is missing,
not because the work is.

## The `evidence:` line, preserved verbatim

    /Users/svendaneel/okam/wt-comproot @ bfe57c3c (lane/composition-root-check, off 8704ff63, local, unpushed) - WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs - artifacts/tests/lane-composition-root-fast-tier.trx 4419/4406/1/12 - artifacts/tests/base-8704ff63-fast-tier.trx 4410/4398/0/12 measured myself from this clean worktree - lanes/L-COMPOSITION-ROOT-CHECK/{evidence.md,mutations.txt}

## Part 1 — the contradiction is real, re-measured

The exit demands the failure leave **every** limiter resolving. Counters read out of the cited trx here, not
taken on report:

| trx | total | executed | passed | **failed** |
|---|---|---|---|---|
| `base-8704ff63-fast-tier.trx` | 4410 | 4398 | 4398 | 0 |
| `lane-composition-root-fast-tier.trx` | 4419 | 4407 | 4406 | **1** |

and the one failure is, by name:

    WebApi.Tests.Wire.CompositionRootLimiterWireTests.The_reservation_limiter_still_resolves_after_the_failure
    Assert.NotNull() Failure

**One limiter did not resolve.** The lane declared the red on purpose and handed the one-line fix to
`L-RESERVATION-LIMITER-MOVE`, which is honest and is exactly why the exit was unmet at that commit. Nothing
here softens that.

## Part 2 — what changed, and it is not small

`L-RESERVATION-LIMITER-MOVE` is `state: verified` in this plan. **Its fix, and this lane's pin, are both at
the backend trunk `6d5328004`**, verified by reading the trunk blobs:

- `WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs` **is at the trunk**, carrying all the arms —
  `The_broken_configuration_really_failed_before_the_registrations`,
  `Every_reachable_limiter_still_resolves_after_the_failure`,
  **`The_reservation_limiter_still_resolves_after_the_failure`** (the one that was red),
  `The_globally_registered_filter_is_constructible_after_the_failure`,
  `An_ordinary_route_still_refuses_past_its_cap_and_serves_a_fresh_key`,
  `An_empty_mcp_section_outside_development_throws_before_any_limiter_is_registered`, and
  **`A_successful_mcp_registration_registers_no_reservation_limiter`** — the arm that pins the move itself.
- **`Helpers/ServiceCollectionExtensions.cs` at the trunk registers no limiter at all.** `grep -E
  'RateLimiter|Limiter'` over that blob returns nothing. `AddMcpAuthentication` now contains
  `ValidateOpenIddictCertificates` … `AddMemoryCache()` … `AddScoped<IClientIdMetadataDocumentService,…>` and
  no limiter registration.
- All three moved to `Program.cs`, outside the MCP `try`, with the reason written beside each —
  `IGrowthPublicRateLimiter` at :1054, the global `MvcOptions` filter at :1055,
  **`IReservationRateLimiter` at :1066** under the comment *"Registered here rather than in
  AddMcpAuthentication, which Program runs inside the MCP try/catch after a certificate validation that can
  throw. ReservationController is not an MCP surface and is not on UseMcpDisabledResponse's path list…"* —
  and `AddMemoryCache()` re-registered beside the limiter that needs it, *"Registering it beside the limiter
  that needs it makes the dependency unconditional."*

So the exit's sentence — *a configuration failure before the registrations leaves every limiter resolving and
enforcing, and the global filter constructible* — describes the trunk as it stands. **What does not exist is
a run that says so.**

## Why this pass did not produce that run — and it is a resource fact, not a judgement

The measurement wanted is one scoped tier at `6d5328004`:

    dotnet test WebApi.Tests/WebApi.Tests.csproj \
      --filter "Database!=SqlServer&FullyQualifiedName~CompositionRootLimiterWireTests" --logger trx

It was **not run**, for two reasons observed at the time:

1. **`/Users/svendaneel/okam/OkamAPI-modules` is not at the trunk state.** `git status --short` shows five
   modified files (`Program.cs`, `Services/Workforce/WorkforceScheduleValidationService.cs`, three test
   hosts) and a whole other lane's untracked tree (`lanes/L-THE-COMPETENCY-SEAM-FIRES-WARN-ONLY/`,
   `Services/Training/…`). A run there measures that lane's work, not the trunk.
2. **A sibling agent's suite was live in that checkout** — pid 1926,
   `dotnet test --filter Database!=SqlServer&FullyQualifiedName~WorkforceBootstrapWireTests … --results-directory
   …/L-WF-BOOTSTRAP/runs`. Building over a running sibling's build is how a green becomes meaningless.
   The brief's rule is to return on a busy resource rather than spin on it, and nothing was killed.

Load at the time was `17.11` (gate is 30), so this was contention, not saturation.

## The ruling this asks for

**Do not amend this exit.** It was right when written and it is right now; it was simply measured at a commit
where it did not yet hold. What it needs is a lane with a clean checkout of `6d5328004` — a fresh worktree,
or `OkamAPI-modules` once the competency lane commits or stashes — to run `CompositionRootLimiterWireTests`
and commit the trx. The exit's *"proven by a build that would previously have failed"* clause already has its
red on disk: `lane-composition-root-fast-tier.trx`, `Failed: 1`, named above. **Only the after-half is
missing, and it is one run.**
