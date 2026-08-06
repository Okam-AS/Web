using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using WebApi.Services.Platform.FeatureFlags;
using WebApi.Services.Training;
using WebApi.Services.Workforce;
using Xunit;

namespace WebApi.Tests.Wire;

/// <summary>
/// Which catalog flags the REAL composition root gives an effective-value resolver, and which it leaves on
/// the toggle API's own <c>override ?? advertised default</c> arithmetic.
///
/// <para><b>Why this needs the real container.</b> <see cref="IStoreFeatureFlagEffectiveResolver"/> is
/// consumed as an <c>IEnumerable</c>, so a missing registration is SILENT: the endpoint simply falls back to
/// its own arithmetic and answers a plausible value. Nothing throws, nothing 500s, and a correct resolver
/// class with no <c>AddScoped</c> line reports nothing at all. Four of five module journeys stopping at a
/// missing wire while the suite stayed green is the estate's most repeated defect, and this is that defect's
/// exact shape.</para>
///
/// <para><b>The rule is derived, and that is the point.</b> Each earlier fix came with a guard naming its own
/// module, so the module nobody had looked at yet was the one with no guard — which is how the second and
/// third instances shipped after the first was understood. Here the scope is every key in the catalog the
/// host composed, so a seventh module is covered the day its <c>Describe()</c> is concatenated: each of its
/// flags either gets a resolver or gets its own entry in <see cref="FlagsWhoseGateDoesNotDiverge"/> saying
/// why it needs none. Nothing below names a module.</para>
///
/// <para><b>What this does NOT prove.</b> That a resolver reports the RIGHT value. It cannot: the wire host
/// deliberately deploys <c>Events:Enabled</c> and <c>Growth:Enabled</c> and ships <c>Features:Meals</c>
/// false, and under exactly those settings all three gates agree with <c>override ?? default</c> for every
/// input. The divergence each resolver exists for is proved at the service tier, where the deployment switch
/// is a variable — <c>EventsFeatureFlagEffectiveTests</c>, <c>GrowthFeatureFlagEffectiveTests</c>,
/// <c>MealsFeatureFlagEffectiveTests</c>, <c>MarginFeatureFlagEffectiveTests</c> — and behaviourally over
/// HTTP for the one module whose gate diverges on this host
/// (<c>WorkforceWireTests.The_toggle_api_reports_the_gates_answer_for_a_grandfathered_store_not_the_advertised_default</c>).
/// Both halves are needed and neither substitutes for the other.</para>
/// </summary>
[Collection(WireCollection.Name)]
public class FlagEffectiveResolverWireTests
{
    /// <summary>
    /// The catalog flags that need no resolver, because the gate that enforces THAT key genuinely resolves
    /// <c>override row ?? advertised default</c> for it — a resolver there would restate the endpoint's own
    /// arithmetic and add a second place for it to drift.
    ///
    /// <para><b>Keyed by flag, never by module.</b> A module-keyed list excuses every unclaimed flag of a
    /// listed module, which is not what any reason here claims: excusing "Workforce" would also excuse
    /// <c>workforce.module</c>, the one key in that family whose gate DOES diverge, so deleting
    /// <see cref="WorkforceModuleFlagEffectiveResolver"/>'s registration would leave this file green and the
    /// endpoint quietly answering the advertised default for a grandfathered store. It would equally absorb
    /// the next diverging flag added to a listed module, which arrives with no guard at all. An entry keyed
    /// by flag can only ever excuse the one key it names.</para>
    ///
    /// <para>The reason states why that key's gate is <c>override ?? default</c>, because a gate that needs no
    /// seam is a claim about that module's code and an entry with no reason is indistinguishable from a
    /// registration somebody forgot. Each is a statement to re-check whenever its gate changes: giving one of
    /// these a config fallback, an outer deployment switch or a probe that changes its VALUE makes its line
    /// false, and <see cref="Every_excused_flag_is_a_catalog_flag_that_no_resolver_claims"/> keeps an entry
    /// from outliving either the flag it names or the absence it asserts.</para>
    /// </summary>
    private static readonly IReadOnlyDictionary<string, string> FlagsWhoseGateDoesNotDiverge =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [TrainingFeatureFlags.Setup] =
                "StoreBackedTrainingFeatureFlags answers `override row ?? TrainingFeatureFlags.DefaultFor` "
                + "with no config layer and no outer switch, and DefaultFor reads a Defaults dictionary "
                + "PROJECTED from the same Declared list this descriptor comes from, so the two defaults "
                + "cannot disagree. TrainingModuleGate consumes that one answer: EnsureWritableAsync returns "
                + "when it is true and refuses when it is false, and the Training* row probes beside it "
                + "choose 404-vs-409 rather than changing the value. Effective off here means WRITES are "
                + "refused, not that the module is dark — IsVisibleAsync keeps a store that already has "
                + "Training rows read-visible with this flag off — but the value reported is the value the "
                + "gate reads.",
            [TrainingFeatureFlags.Assignments] =
                "The same seam and the same projected defaults as training.setup, enforced by "
                + "EnsureWritableAsync(store, training.assignments) in TrainingAssignmentService and "
                + "TrainingCompletionService. The gate does not AND it under training.setup: with this flag "
                + "on the write is admitted whatever setup says, and with it off the row probes choose which "
                + "refusal the caller gets — the route's composition, not this flag's value.",
            [WorkforceFeatureFlags.Setup] =
                "StoreBackedWorkforceFeatureFlags is `override row ?? WorkforceFeatureFlags.DefaultFor` over "
                + "defaults projected from the same Declared list the descriptors come from, and "
                + "WorkforceAuthorizationService.RequireWriteCapabilityAsync hands this key to "
                + "EnsureStageWriteEnabledAsync, which reads the stage flag ALONE. It is the one advertised "
                + "flag that ships ON (WorkforceFeatureFlags.DefaultOn), which is the case a second copy of "
                + "the arithmetic would get wrong first: descriptor default and DefaultFor are one "
                + "projection, so the true reported for a store with no row is the true the gate resolves.",
            [WorkforceFeatureFlags.Publication] =
                "Same seam, reached through RequireWriteCapabilityAsync at the schedule writes "
                + "(WorkforceScheduleService, WorkforceSchedulePublishService, "
                + "WorkforceScheduleValidationService) and read alone by EnsureStageWriteEnabledAsync. A "
                + "module-off store is refused earlier by EnsureEnabledAsync with a different code, which is "
                + "a fact about the route's composition and not about this flag's value.",
            [WorkforceFeatureFlags.SelfService] =
                "Same seam, read directly by EnsureStageWriteEnabledAsync in WorkforceSelfService, "
                + "WorkforceTimeOffService and WorkforceAvailabilityService. No config fallback and no outer "
                + "switch stands over it; the module gate above it is a separate refusal.",
            [WorkforceFeatureFlags.Exchange] =
                "Same seam, read directly by EnsureStageWriteEnabledAsync at the three "
                + "WorkforceShiftExchangeService writes (offer, claim, decide). No config fallback and no "
                + "outer switch stands over it.",
            [WorkforceFeatureFlags.Clock] =
                "Same seam on both of its enforcement points: WorkforcePosController resolves it through "
                + "IWorkforceFeatureFlags.IsEnabledAsync for the §9.2 kill-switch, and "
                + "WorkforceAttendanceService through RequireWriteCapabilityAsync. The module gate the "
                + "controller runs first is a separate refusal and does not enter this flag's value, and no "
                + "POS deployment switch stands over it.",
            [WorkforceFeatureFlags.Dispatch] =
                "Same seam, resolved PER STORE in WorkforceNotificationDispatcher against the store each "
                + "outbox row belongs to. WorkforceNotificationDispatchHostedService polls unconditionally "
                + "and carries no configuration switch of its own, so this flag is the whole gate and there "
                + "is no outer switch that could make the reported value untrue.",
        };

    private readonly WireHostFixture _wire;

    public FlagEffectiveResolverWireTests(WireHostFixture wire) => _wire = wire;

    private IReadOnlyList<FeatureFlagDescriptor> Catalog()
    {
        using var scope = _wire.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<IFeatureFlagCatalog>().All;
    }

    private List<IStoreFeatureFlagEffectiveResolver> Resolvers(IServiceScope scope)
        => scope.ServiceProvider.GetServices<IStoreFeatureFlagEffectiveResolver>().ToList();

    [Fact]
    public void Every_catalog_flag_is_either_claimed_by_a_registered_resolver_or_excused_by_name()
    {
        using var scope = _wire.Services.CreateScope();
        var resolvers = Resolvers(scope);

        var unclaimed = Catalog()
            .Where(d => !resolvers.Any(r => r.Handles(d.Key)))
            .Where(d => !FlagsWhoseGateDoesNotDiverge.ContainsKey(d.Key))
            .Select(d => d.Key + " (" + d.Module + ")")
            .ToList();

        Assert.True(
            unclaimed.Count == 0,
            "These catalog flags reach GET /stores/{id}/feature-flags with no effective-value resolver "
            + "registered, so the endpoint answers `override ?? advertised default` for them: "
            + string.Join(", ", unclaimed)
            + ". If the gate that enforces one of them resolves exactly that expression, add THAT FLAG to "
            + "FlagsWhoseGateDoesNotDiverge with the reason — its module being excused for other flags is "
            + "not a reason and no longer counts as one. If the gate resolves anything else — a config "
            + "fallback, an outer deployment switch, a data probe, an AND under a master — the endpoint is "
            + "reporting a value the runtime does not agree with, and the flag owes a resolver registered in "
            + "the composition root.");
    }

    [Fact]
    public void No_two_registered_resolvers_claim_the_same_flag()
    {
        // The interface's stated contract, and the reason it matters here: StoreFeatureFlagsController takes
        // the FIRST resolver that claims a key, so a second claimant is dead code whose behaviour depends on
        // registration order — which nothing in Program.cs guarantees.
        using var scope = _wire.Services.CreateScope();
        var resolvers = Resolvers(scope);

        var contested = Catalog()
            .Select(d => new { d.Key, Count = resolvers.Count(r => r.Handles(d.Key)) })
            .Where(x => x.Count > 1)
            .Select(x => x.Key + " (claimed " + x.Count + " times)")
            .ToList();

        Assert.True(contested.Count == 0, "Contested flag keys: " + string.Join(", ", contested));
    }

    [Fact]
    public void Every_excused_flag_is_a_catalog_flag_that_no_resolver_claims()
    {
        // The list self-corrects, and this is also what makes a deleted registration visible: an excused key
        // is one no resolver claims, so no resolver's claimed key is ever excused, so dropping any resolver's
        // AddScoped line leaves its keys both unclaimed and unexcused and reds the test above. Without it a
        // module-shaped excuse could quietly cover the very key a deleted registration stopped answering for.
        using var scope = _wire.Services.CreateScope();
        var resolvers = Resolvers(scope);
        var catalog = Catalog();

        foreach (var excuse in FlagsWhoseGateDoesNotDiverge)
        {
            Assert.True(
                catalog.Any(d => string.Equals(d.Key, excuse.Key, StringComparison.Ordinal)),
                excuse.Key + " is excused from an effective-value resolver but is not in the catalog. "
                + "Delete the entry.");

            Assert.False(
                resolvers.Any(r => r.Handles(excuse.Key)),
                excuse.Key + " is excused from an effective-value resolver AND claimed by a registered one, "
                + "so its excuse asserts the opposite of the composition root. Delete whichever is wrong.");

            Assert.False(
                string.IsNullOrWhiteSpace(excuse.Value),
                excuse.Key + " is excused with no reason, which is indistinguishable from a registration "
                + "somebody forgot. State why that flag's gate resolves `override ?? default`.");
        }
    }

    [Fact]
    public void Every_registered_resolver_is_asked_before_the_row_for_at_least_one_real_catalog_key()
    {
        // A resolver claiming only keys the catalog does not carry is never consulted, because the endpoint
        // iterates the CATALOG and asks resolvers about those keys alone. That is a registration that looks
        // present in the container and is inert at the endpoint — the same failure this file exists for, one
        // level in.
        using var scope = _wire.Services.CreateScope();
        var catalog = Catalog();

        var inert = Resolvers(scope)
            .Where(r => !catalog.Any(d => r.Handles(d.Key)))
            .Select(r => r.GetType().Name)
            .ToList();

        Assert.True(
            inert.Count == 0,
            "Registered but never consulted, because no catalog flag matches Handles(): "
            + string.Join(", ", inert));
    }
}
