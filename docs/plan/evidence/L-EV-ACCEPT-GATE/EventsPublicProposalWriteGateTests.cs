using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WebApi.Enums.Events;
using WebApi.Helpers;
using WebApi.Helpers.Events;
using WebApi.Services.Events;
using Xunit;

namespace WebApi.Tests.Events;

/// <summary>
/// The store-scoped <c>Events.Core</c> refinement on the two public proposal WRITES
/// (<c>POST /events/proposals/{token}/accept</c> and <c>.../decline</c>, Events spec §5, §9).
/// <para>
/// The controller's <c>IActionFilter</c> enforces only the OUTER <c>Events:Enabled</c> switch, which is
/// module-wide. Both write routes are <c>[AllowAnonymous]</c> and storeless — addressed by an unguessable
/// token alone — so until the token resolves the store there is nothing to refine, and the service is the
/// only place the store-scoped check can happen. Without it a venue that never opted in (or one that turned
/// the module off) could still have its proposals accepted from the outside, and a proposal acceptance is
/// the head of a money path: it is what makes a deposit collectable.
/// </para>
/// <para>
/// <b>Every refusal here is paired with a success on the SAME token, in the SAME world, through the SAME
/// call</b> — the two calls differ in exactly one variable, the flag the gate reads. An absence assertion in
/// a world that cannot produce presence proves nothing, and neither does one whose subject was unacceptable
/// for some unrelated reason: the refusal is therefore pinned to the exact
/// <c>EVENTS_PROPOSAL_NOT_FOUND</c> code, so a proposal that was merely expired, superseded or in the wrong
/// state would fail this suite rather than satisfy it.
/// </para>
/// <para>
/// The refusal reuses the uniform not-found rather than <c>EVENTS_DISABLED</c>, matching
/// <c>EventsDepositService.GetPublicPageAsync</c>: telling an anonymous caller "disabled" would confirm the
/// token maps to a real proposal at a real store that simply has not opted in.
/// </para>
/// </summary>
public sealed class EventsPublicProposalWriteGateTests
{
    // A flag store with an explicit per-store answer — the single variable between the paired calls.
    private sealed class FakeFlagStore : IEventsFeatureFlagStore
    {
        private readonly bool _answer;
        public FakeFlagStore(bool answer) => _answer = answer;
        public Task<bool> IsEnabledAsync(int storeId, string flag, CancellationToken ct = default) => Task.FromResult(_answer);
    }

    // The module is DEPLOYED in both worlds (outer switch on). Only the store's Events.Core row differs, so
    // nothing here can be satisfied by the coarse module-wide switch the controller filter already enforces.
    private static EventsModuleGate Gate(bool storeFlagOn)
        => new EventsModuleGate(enabled: true, flagStore: new FakeFlagStore(storeFlagOn));

    // A proposal service over its own context with the given gate. The seeding above runs ungated through
    // the kit, so the subject is built by the real state machine and carries a real content hash.
    private static EventsProposalService ProposalService(EventsHarness harness, ApplicationDbContext ctx, bool storeFlagOn)
        => new EventsProposalService(
            ctx, harness.Clock, new EventsAmendmentService(ctx, harness.Clock), gate: Gate(storeFlagOn));

    [Fact]
    public async Task Accept_refuses_for_a_store_without_events_core_then_succeeds_for_the_same_token_with_it_on()
    {
        await using var harness = await EventsHarness.CreateSqliteAsync();
        var kit = EventsProposalTestKit.For(harness);
        var (eventId, _, token) = await kit.SeedSentProposalAsync(depositRequiredMinor: 250_00);

        // ---- the refusal: the venue never opted in --------------------------------------------------
        await using (var dark = harness.NewContext())
        {
            var ex = await Assert.ThrowsAsync<EventsProblemException>(
                () => ProposalService(harness, dark, storeFlagOn: false)
                    .AcceptAsync(token, kit.AcceptRequest(), "203.0.113.9", "xunit"));

            // Pinned to the uniform not-found. Had the subject been expired/superseded/mis-stated, the code
            // would be EVENTS_PROPOSAL_EXPIRED / _SUPERSEDED / _STATE and this equality would fail — which is
            // what stops the refusal being credited to the wrong cause.
            Assert.Equal(EventsErrorCodes.ProposalNotFound, ex.Code);
        }

        // The write did not happen: the version is untouched and no acceptance was recorded.
        await using (var read = harness.NewContext())
        {
            var untouched = await read.EventsProposalVersions.AsNoTracking().SingleAsync(v => v.PublicToken == token);
            Assert.Equal(EventsProposalVersionStatus.Sent, untouched.Status);

            var ev = await read.EventsEvents.AsNoTracking().SingleAsync(e => e.Id == eventId);
            Assert.Equal(EventStatus.ProposalSent, ev.Status);
            Assert.Null(ev.AcceptedProposalVersionNo);

            Assert.Empty(await read.EventsAcceptanceReceipts.AsNoTracking().Where(r => r.EventId == eventId).ToListAsync());
        }

        // ---- the paired success: the SAME token, once the venue has opted in -------------------------
        // This is what makes the refusal above load-bearing. The proposal was acceptable all along, so the
        // only thing that refused it was the flag.
        await using (var live = harness.NewContext())
        {
            var result = await ProposalService(harness, live, storeFlagOn: true)
                .AcceptAsync(token, kit.AcceptRequest(), "203.0.113.9", "xunit");

            Assert.Equal(EventStatus.Accepted.ToString(), result.EventStatus);
            Assert.False(result.WasAmendment);
        }

        await using (var read = harness.NewContext())
        {
            var accepted = await read.EventsProposalVersions.AsNoTracking().SingleAsync(v => v.PublicToken == token);
            Assert.Equal(EventsProposalVersionStatus.Accepted, accepted.Status);

            // The money path's actor: a public accept is authored by the Guest, never by an admin (C4).
            var receipt = await read.EventsAcceptanceReceipts.AsNoTracking().SingleAsync(r => r.EventId == eventId);
            Assert.Equal("203.0.113.9", receipt.AcceptorIp);

            var t5 = await read.EventsStateTransitions.AsNoTracking()
                .SingleAsync(t => t.EventId == eventId && t.Action == "T5");
            Assert.Equal(EventsActorKind.Guest, t5.ActorKind);
            Assert.Null(t5.ActorUserId);
        }
    }

    [Fact]
    public async Task Decline_refuses_for_a_store_without_events_core_then_succeeds_for_the_same_token_with_it_on()
    {
        await using var harness = await EventsHarness.CreateSqliteAsync();
        var kit = EventsProposalTestKit.For(harness);
        var (eventId, _, token) = await kit.SeedSentProposalAsync(depositRequiredMinor: 250_00);

        await using (var dark = harness.NewContext())
        {
            var ex = await Assert.ThrowsAsync<EventsProblemException>(
                () => ProposalService(harness, dark, storeFlagOn: false)
                    .DeclineAsync(token, new WebApi.Models.Events.EventsProposalDeclineRequest { Note = "No thanks." }));

            Assert.Equal(EventsErrorCodes.ProposalNotFound, ex.Code);
        }

        await using (var read = harness.NewContext())
        {
            var untouched = await read.EventsProposalVersions.AsNoTracking().SingleAsync(v => v.PublicToken == token);
            Assert.Equal(EventsProposalVersionStatus.Sent, untouched.Status);

            var ev = await read.EventsEvents.AsNoTracking().SingleAsync(e => e.Id == eventId);
            Assert.Equal(EventStatus.ProposalSent, ev.Status);
        }

        await using (var live = harness.NewContext())
        {
            var result = await ProposalService(harness, live, storeFlagOn: true)
                .DeclineAsync(token, new WebApi.Models.Events.EventsProposalDeclineRequest { Note = "No thanks." });

            Assert.Equal(EventsProposalVersionStatus.Declined.ToString(), result.VersionStatus);
        }

        await using (var read = harness.NewContext())
        {
            var declined = await read.EventsProposalVersions.AsNoTracking().SingleAsync(v => v.PublicToken == token);
            Assert.Equal(EventsProposalVersionStatus.Declined, declined.Status);

            var t6 = await read.EventsStateTransitions.AsNoTracking()
                .SingleAsync(t => t.EventId == eventId && t.Action == "T6");
            Assert.Equal(EventsActorKind.Guest, t6.ActorKind);
        }
    }

    /// <summary>
    /// The gate must also cover the branch that answers an ALREADY-accepted token, which sits before the
    /// state machine: replaying a recorded acceptance back to an anonymous caller for a store that never
    /// opted in leaks the same thing the refusal exists to withhold. Paired with the flag-on replay, so this
    /// cannot be satisfied by a branch that simply never runs.
    /// </summary>
    [Fact]
    public async Task The_idempotent_replay_of_an_accepted_token_is_gated_too()
    {
        await using var harness = await EventsHarness.CreateSqliteAsync();
        var kit = EventsProposalTestKit.For(harness);
        var (_, _, token) = await kit.SeedSentProposalAsync(depositRequiredMinor: 250_00);
        await kit.Proposal.AcceptAsync(token, kit.AcceptRequest(), "203.0.113.9", "xunit");

        await using (var dark = harness.NewContext())
        {
            var ex = await Assert.ThrowsAsync<EventsProblemException>(
                () => ProposalService(harness, dark, storeFlagOn: false)
                    .AcceptAsync(token, kit.AcceptRequest(), "203.0.113.9", "xunit"));
            Assert.Equal(EventsErrorCodes.ProposalNotFound, ex.Code);
        }

        await using (var live = harness.NewContext())
        {
            var replay = await ProposalService(harness, live, storeFlagOn: true)
                .AcceptAsync(token, kit.AcceptRequest(), "203.0.113.9", "xunit");
            Assert.Equal(EventStatus.Accepted.ToString(), replay.EventStatus);
        }
    }
}
