# L-EV-GUEST-ORIGIN — half of a two-part exit, and this is the half that is missing

**Not closed. This is a finding, not a failure.** Reason-shape hit: **(5) only one half of a two-part exit is
shown.** The brief's remedy for that shape is *produce the missing half, or name exactly which clause is
unshown*. The missing half is named here, precisely enough that an owner can rule on it without re-deriving
anything, and it is **not** produced, because producing it means new wire-host infrastructure on a branch
that would be unlanded again — and because rewriting the exit to fit the evidence it received proves nothing.

## The evidence line as the original agent wrote it

Preserved here because `plan verify` overwrites the `evidence:` line with the single path it is given:

```
evidence: OkamAPI lane/ev-guest-origin @ b0b501a5, NOT pushed, based on feature/restaurant-modules @ 3579bbbc - worktree ~/okam/OkamAPI-ev-guestorigin - container-free tier 4371/0/12 vs baseline 4369/0/12 measured in the same worktree at 3579bbbc, delta +2 = the 2 new tests, 0 regressions - WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs
```

Measured today and worth carrying: **`b0b501a5` IS an ancestor of the backend trunk `6d5328004`.** The
configuration half landed. The line's "NOT pushed" is stale.

## The exit, split

> a committed configuration sets the Events guest origin under the ruled domain, **and** an initiate with no
> origin configured refuses instead of stranding the guest, **both shown at the wire tier**

### Clause 1 — shown, at the wire tier, on the trunk

`WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs` at `6d5328004`,
`[Collection(WireCollection.Name)]`, exactly two tests:

- `The_committed_configuration_names_a_guest_origin_under_the_ruled_domain` — asserts the committed origin is
  absolute https and shares a **registrable domain** with the committed `Mcp:PublicBaseUrl`, then asserts the
  two authorities are **not** equal so nobody reads same-site as same-origin.
- `The_running_host_binds_that_key_onto_the_property_the_module_reads` — resolves
  `IOptions<EventsSettings>` out of the real composition root, which is the half a file assertion cannot
  make.

The ruling it is held to is `D-SPEC-L-GR-WITHDRAW-ORIGIN = api-subdomain` (2026-08-03), and it is pinned as a
*relationship* rather than a literal, so it reopens exactly where the ruling's `reopen_when` says.

### Clause 2 — the behaviour exists on the trunk, but NOT at the wire tier

The lane's own RETURN says which half it kept, in its first line:

> **WHICH HALF I KEPT, for merge order: the CONFIGURATION only.**

The refusal is nonetheless **in the estate at the trunk** — this is the part the earlier census
(`instrumentless-exits.md`, Batch 7) left open by attributing it to `lane/ev-vipps-fallback-2 @ fc09be1d`.
Measured today: `fc09be1d` is **not** an ancestor of `6d5328004`, yet
`WebApi.Tests/Events/EventsDepositVippsFallbackTests.cs` **is** at `6d5328004`, so that work reached the
trunk by another path. What it holds:

| where | what it establishes |
| --- | --- |
| `Services/Events/EventsDepositPaymentPortAdapter.cs:463-471` | an unconfigured or unusable `Events:PublicBaseUrl` throws rather than composing a page — *"an unconfigured platform REFUSES here"* |
| `EventsDepositVippsFallbackTests.Initiate_refuses_before_calling_vipps_when_there_is_no_origin_to_return_the_guest_to` (a `[Theory]`) | the refusal happens **before** the provider call: `Assert.Equal(0, vipps.InitiateCallCount)` — which is exactly "refuses instead of stranding the guest" |
| `EventsDepositVippsFallbackTests.The_refusal_names_the_setting_and_never_the_deposit_token` | `Assert.Contains("Events:PublicBaseUrl", ex.Message)` and the deposit's `PublicToken` appears in neither `D` nor `N` form |
| `Services/Events/EventsEmailNotificationDelivery.cs:74-96` + `EventsOutboxDeliveryTests` | the mail path fails the row with `PublicBaseUrlNotConfigured` instead of mailing a dead link |

**`EventsDepositVippsFallbackTests` carries no `[Collection(WireCollection.Name)]`.** It constructs the
adapter directly — `NewAdapter(new FakeVipps(), publicBaseUrl: null)` over
`Options.Create(new EventsSettings { … })`. That is a service-tier pin, and it is a good one. It is not the
tier the exit asks for.

## Exactly which clause is unshown

**"an initiate with no origin configured refuses … *shown at the wire tier*".** Not the refusal — the
**tier**. And the reason is structural, not an oversight: the wire host binds `Events:PublicBaseUrl` from the
committed configuration, and clause 1 exists precisely to guarantee that binding. A wire arm for the
unconfigured case therefore needs a **second host composition with the key removed**, which no fixture in
this repository provides today. That is why the two halves of this exit cannot be satisfied by one host, and
it is the thing an owner is actually being asked to rule on.

## What an owner is being asked

One of:

1. **Build the missing half** — a second wire host with `Events:PublicBaseUrl` unset, driving an initiate
   through the composition root and asserting the refusal there. Real work, on a branch, in a repository
   whose trunk this lane may not move.
2. **Rule that the service-tier pin plus the wire-tier binding pin together satisfy the intent**, and record
   *that ruling* — not an edit to the exit's words. This program has already learned that an exit rewritten
   to fit its evidence proves nothing; a ruling that the tier requirement was over-specified is a different
   act, and it belongs to a person.

## Two open items the lane recorded that this finding should not bury

- **The guest's return leg is unproven end to end.** Nothing in this lane or the fallback lane reaches Vipps,
  and the production origin serves `pages/events/deposit/_token.vue` only on `feature/restaurant-modules` —
  the configuration is now right and **the page it names is still not deployed**. The lane itself asked for a
  flag on this.
- **`appsettings.Development.json` points at `http://localhost:3000`, and Vipps rejects a localhost
  fallback** (vippsas/vipps-ecom-api#159). A developer can open that link; a real Vipps initiate may not
  return to it. Recorded in the setting's doc comment rather than left to be rediscovered.
- The lane corrected its own brief: *"Vipps REQUIRES the fallback"* is **unconfirmed** — what is confirmed is
  that Vipps validates the field (`merchantInfo.fallBack.invalid`) and that it is the post-payment redirect
  target. Report it as *"the guest has no way back"*, never as *"the provider refuses"*.
