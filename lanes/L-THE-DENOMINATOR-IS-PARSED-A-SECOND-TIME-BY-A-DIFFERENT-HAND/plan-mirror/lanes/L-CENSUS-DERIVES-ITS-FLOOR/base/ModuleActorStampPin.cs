using System;
using System.Linq;
using WebApi.Entities.Meals;
using WebApi.Enums.Events;
using WebApi.Enums.Growth;

namespace WebApi.Tests.Modules;

/// <summary>One stamped type and the property on it that records who acted.</summary>
/// <param name="TypeName">
/// Also the module's DERIVED SCOPE: a file is in scope because it mentions this type, which no site can
/// avoid, so a stamp in a brand-new file is covered by virtue of what it constructs.
/// </param>
internal sealed record ActorStamp(string TypeName, string ActorProperty);

/// <summary>
/// A module whose ledger records a non-user actor in a companion DISCRIMINATOR column rather than by leaving
/// the actor blank. Events is the case: <c>EventsStateTransition.ActorKind</c> says Admin / Guest / System,
/// and a Guest or System row carries a null actor BY DESIGN — an anonymous guest accepting a proposal over a
/// public token, or a sweep, is genuinely not a store user.
///
/// <para>So the blank rule is wrong here and the COHERENCE rule is right: the two columns must agree, or the
/// row lies in one of two directions. This is the shape the Meals precedent asks for — a non-user actor is
/// NAMED here rather than the rule being widened until every blank passes.</para>
/// </summary>
/// <param name="NonHumanKinds">
/// Kinds for which the actor must be EXACTLY null. Not merely blank: an empty string is the worst reading of
/// all, because the row says "no human" via the kind while a reader testing <c>ActorUserId != null</c> counts
/// it as naming one.
/// </param>
internal sealed record ActorCoherence(
    string DiscriminatorProperty,
    string HumanKind,
    string[] NonHumanKinds,
    string Why);

/// <summary>
/// The choke point that makes a module's actor rule enforceable in one place: if a row can be materialized
/// anywhere else it carries whatever actor the author remembered.
/// </summary>
/// <param name="MaterializedType">The persisted entity, which may differ from the stamped input type.</param>
/// <param name="OnlyFile">Repo-relative path of the single file allowed to construct it.</param>
/// <param name="AlsoForbidSetAdd">
/// Whether adding the entity straight to its <c>DbSet</c> outside that file is forbidden too. False for
/// Events: its state machine deliberately AUTHORS the row and RETURNS it for the calling feature service to
/// add, so the caller commits it in the same transaction as the domain change.
/// </param>
internal sealed record ActorWriter(string MaterializedType, string OnlyFile, bool AlsoForbidSetAdd);

/// <summary>
/// What one module declares about its actor stamps. Everything hand-maintained about the convention lives
/// here; the analysis is <see cref="ActorStampSource"/> and the judgement is <see cref="ActorStampRule"/>,
/// shared by all five modules.
/// </summary>
internal sealed record ModuleActorStampPin(
    string Module,
    ActorStamp[] Stamps,
    ActorProvenance[] Provenances,
    string[] Guards,
    string[] Resolvers,
    ActorWriter? Writer,
    ActorCoherence? Coherence,
    string[] KnownFiles,
    int KnownSiteFloor,
    int KnownResolverFloor,
    int KnownGuardFloor)
{
    public override string ToString() => Module;
}

/// <summary>
/// The module declarations — six, because Growth's audit ledger is judged under a coherence contract its
/// three current-state author columns are not (see <see cref="ModuleActorStamps.GrowthAudit"/>). This file is
/// the only hand-maintained part of the convention, so it is the
/// part that rots — <c>ModuleAuditActorCallSiteTests</c>'s census assertions are what keep it from rotting
/// silently, by failing when a declared file or a site floor stops being reached.
/// </summary>
internal static class ModuleActorStamps
{
    /// <summary>
    /// The convention every module surface resolves its caller through: a file-local
    /// <c>CurrentUserId(...)</c> that refuses rather than defaulting.
    ///
    /// <para>Named per module rather than pinned estate-wide ON PURPOSE.
    /// <c>Controllers/WorkforceControllerBase</c> and <c>Controllers/Meals/MealsControllerBase</c> declare a
    /// member of the SAME NAME that deliberately returns null, because there the actor is the authorization
    /// SUBJECT fed to <c>RequireCapabilityAsync</c>/<c>RequireCompanyAdminAsync</c>, which refuse it
    /// themselves — not an audit stamp. <c>Helpers/ActorClaims</c>' own summary warns that conflating those
    /// two roles is the trap, so this pin is scoped to each module's derived audit scope and never sweeps
    /// every declaration of the name.</para>
    /// </summary>
    private const string ResolverConvention = "CurrentUserId";

    public static readonly ModuleActorStampPin Meals = new(
        Module: "Meals",
        Stamps: new[] { new ActorStamp("MealsAuditEntry", "ActorReference") },
        Provenances: new ActorProvenance[]
        {
            new RefusingResolverProvenance(ResolverConvention),

            // The membership RequireCompanyAdminAsync returns. Its id is a Guid, so ToString() cannot be
            // blank whatever any caller does — and the origin check is what keeps the stamp the CALLER's
            // membership rather than some row's.
            new TypedIdProvenance(
                expressionPattern: @"^(?<receiver>\w+)\.MembershipId\.ToString\(\)$",
                originPattern: @"\b(?:var|MealsMembership)\s+{receiver}\s*=\s*await\s+\w+\.RequireCompanyAdminAsync\s*\(",
                declaringType: typeof(MealsMembership),
                propertyName: nameof(MealsMembership.MembershipId),
                expectedType: typeof(Guid),
                originAdvice: "take the actor from the membership RequireCompanyAdminAsync returns"),
        },
        Guards: Array.Empty<string>(),
        Resolvers: new[] { ResolverConvention },
        Writer: new ActorWriter("MealsAuditEvent", "Services/Meals/MealsAuditWriter.cs", AlsoForbidSetAdd: true),
        Coherence: null,
        KnownFiles: new[]
        {
            "Services/Meals/MealsAgreementService.cs",
            "Services/Meals/MealsCompanyService.cs",
            "Services/Meals/MealsMembershipService.cs",
            "Services/Meals/MealsProgramService.cs",
            "Services/Meals/MealsReconciliationService.cs",
            "Services/Meals/MealsStatementService.cs",
        },
        KnownSiteFloor: 14,
        KnownResolverFloor: 4,
        KnownGuardFloor: 0);

    public static readonly ModuleActorStampPin Training = new(
        Module: "Training",
        Stamps: new[] { new ActorStamp("TrainingAuditEntry", "ActorReference") },
        Provenances: new ActorProvenance[] { new RefusingResolverProvenance(ResolverConvention) },
        Guards: Array.Empty<string>(),
        Resolvers: new[] { ResolverConvention },
        Writer: new ActorWriter("TrainingAuditEvent", "Services/Training/TrainingAuditWriter.cs", AlsoForbidSetAdd: true),
        Coherence: null,
        KnownFiles: new[]
        {
            "Services/Training/TrainingAssignmentService.cs",
            "Services/Training/TrainingCertificateService.cs",
            "Services/Training/TrainingCompletionService.cs",
            "Services/Training/TrainingCourseService.cs",
        },
        KnownSiteFloor: 10,
        KnownResolverFloor: 4,
        KnownGuardFloor: 0);

    /// <summary>
    /// Events stamps its append-only lifecycle ledger, and it is the one module whose actor is often
    /// legitimately not a user — see <see cref="ActorCoherence"/>.
    ///
    /// <para><b>What is deliberately NOT in scope, and why that is safe.</b> Four mutable Events rows also
    /// carry a <c>*ByUserId</c> provenance column — <c>EventsEvent.CreatedByUserId</c>,
    /// <c>EventsProposalVersion.CreatedByUserId</c>, <c>EventsRunSheet.IssuedByUserId</c>,
    /// <c>EventsSettlement.ClosedByUserId</c>. They are not the audit ledger: they are current-state fields
    /// on rows that mutate, not immutable evidence. Each is written from a parameter the four Events
    /// controllers fill with their own refusing <c>CurrentUserId()</c>, and <c>EventsNote.AuthorUserId</c> is
    /// only ever the anonymous guest's null. Bringing them in would need a guard in four more public service
    /// members and is a lane of its own; the ledger is where an unattributed row is immutable.</para>
    /// </summary>
    /// <remarks>
    /// <b>The deposit money path is the second stamp.</b> <c>EventsPaymentReceipt</c> joined this pin when it
    /// gained the actor pair, because a refund moves money while the EVENT's status does not — so no T1–T17
    /// edge fires, the state machine authors nothing, and the receipt trail was the only row written. The two
    /// ledgers therefore answer the same question and are judged by the same coherence contract; the pin
    /// carries a single <see cref="ActorWriter"/>, so the receipt's choke point (<c>EventsPaymentLedger</c>)
    /// is held by its own tests rather than by that member.
    ///
    /// <para><c>EventsSettlementLine.EnteredByUserId</c> is deliberately NOT a stamp here even though it is
    /// set in an initializer: <see cref="ActorCoherence"/> is declared per MODULE, so declaring a type that
    /// carries no <c>ActorKind</c> would be judged as a row that names no discriminator. A settlement line
    /// has no non-human case to discriminate — a generated line names nobody by construction — so it is
    /// pinned by <c>EventsSettlementLineActorTests</c> instead of by widening this rule.</para>
    /// </remarks>
    public static readonly ModuleActorStampPin Events = new(
        Module: "Events",
        Stamps: new[]
        {
            new ActorStamp("EventsStateTransition", "ActorUserId"),
            new ActorStamp("EventsPaymentReceipt", "ActorUserId"),
        },
        Provenances: Array.Empty<ActorProvenance>(),
        Guards: Array.Empty<string>(),
        Resolvers: Array.Empty<string>(),
        Writer: new ActorWriter(
            "EventsStateTransition", "Services/Events/EventsStateMachine.cs", AlsoForbidSetAdd: false),
        Coherence: new ActorCoherence(
            DiscriminatorProperty: "ActorKind",
            HumanKind: nameof(EventsActorKind.Admin),
            NonHumanKinds: new[] { nameof(EventsActorKind.Guest), nameof(EventsActorKind.System) },
            Why: "A Guest transition is an anonymous visitor acting over a public proposal token, and a "
                 + "System transition is an auto-promotion, an expiry sweep or a provider webhook — neither "
                 + "is a store user, and EventsActorKind is what records that, so the row is never "
                 + "unattributed even with a null actor."),
        KnownFiles: new[] { "Services/Events/EventsStateMachine.cs", "Services/Events/EventsPaymentLedger.cs" },
        KnownSiteFloor: 2,
        KnownResolverFloor: 0,
        KnownGuardFloor: 0);

    /// <summary>
    /// Margin's whole human-attribution surface is one column: who uploaded the price-import batch that
    /// rewrote a store's cost prices.
    ///
    /// <para><b>Named non-user provenance.</b> <c>MarginSupplierItemPrice</c> records
    /// <c>Source = Manual|Import</c> and an optional <c>ImportBatchId</c> — which MECHANISM produced a price,
    /// never which human — and <c>MarginSalesFact</c> excludes operator identity by design (spec §13 GDPR).
    /// Those are data provenance, not actors, so they are outside this rule rather than exceptions to it.</para>
    /// </summary>
    public static readonly ModuleActorStampPin Margin = new(
        Module: "Margin",
        Stamps: new[] { new ActorStamp("MarginPriceImportBatch", "UploadedByReference") },
        Provenances: Array.Empty<ActorProvenance>(),
        Guards: Array.Empty<string>(),
        Resolvers: Array.Empty<string>(),
        Writer: null,
        Coherence: null,
        KnownFiles: new[] { "Services/Margin/MarginPriceImportService.cs" },
        KnownSiteFloor: 1,
        KnownResolverFloor: 0,
        KnownGuardFloor: 0);

    /// <summary>
    /// Growth's human actors are the newsletter author and the approver — the approval being what green-lights
    /// mail to an entire audience.
    ///
    /// <para><b>Named non-user actors.</b> Growth's append-only consent ledger records no user at all, on
    /// purpose: <c>GrowthConsentReceipt.CaptureSource</c>, <c>GrowthSuppression.Source</c> and
    /// <c>GrowthConsentCheckReceipt.CallerModule</c> name a SURFACE or a calling module
    /// (<c>"preference-centre"</c>, <c>"one-click"</c>, <c>"erasure-intake"</c>, <c>"double-opt-in"</c>,
    /// <c>"provider-webhook"</c>, <c>"Events"</c>), each a hard-coded literal at its call site, because the
    /// acting party is a data subject or a provider rather than a store user;
    /// <c>GrowthProviderEventReceipt</c> identifies its actor by verified <c>ProviderAccountId</c>, a
    /// non-blank FK. Those are outside this rule, not exceptions to it — the rule would refuse a hard-coded
    /// literal actor, and it is right to.</para>
    ///
    /// <para><b>Why the VERSION is stamped and not only the envelope.</b> An edit appends a new immutable
    /// version and returns the envelope to Draft, but <c>GrowthNewsletter.CreatedByUserId</c> keeps naming
    /// whoever created the newsletter however many times somebody else rewrites it — so the second author of
    /// a newsletter was nowhere in the database. <c>GrowthNewsletterApproval.InvalidatedByUserId</c> records
    /// the matching revocation and is deliberately NOT a stamp here: invalidation mutates an existing
    /// approval row, which <c>No_actor_is_assigned_onto_an_already_constructed_row</c> forbids for a declared
    /// stamp and which no initializer can express. It is pinned by <c>GrowthNewsletterAuthorTests</c>.</para>
    /// </summary>
    public static readonly ModuleActorStampPin Growth = new(
        Module: "Growth",
        Stamps: new[]
        {
            new ActorStamp("GrowthNewsletter", "CreatedByUserId"),
            new ActorStamp("GrowthNewsletterVersion", "CreatedByUserId"),
            new ActorStamp("GrowthNewsletterApproval", "ApproverUserId"),
        },
        Provenances: Array.Empty<ActorProvenance>(),
        Guards: new[] { "RequireAttributed" },
        Resolvers: Array.Empty<string>(),
        Writer: null,
        Coherence: null,
        KnownFiles: new[] { "Services/Growth/GrowthNewsletterService.cs" },
        KnownSiteFloor: 4,
        KnownResolverFloor: 0,
        KnownGuardFloor: 1);

    /// <summary>
    /// The Growth AUDIT LEDGER, declared separately from <see cref="Growth"/> and not folded into it.
    ///
    /// <para><b>Why a sixth declaration rather than a sixth stamp on the fifth.</b> An
    /// <see cref="ActorCoherence"/> is declared per MODULE and judged against every stamp the module lists.
    /// The three stamps on <see cref="Growth"/> are current-state author columns on mutable rows
    /// (<c>GrowthNewsletter.CreatedByUserId</c> and its two siblings) and carry no <c>ActorKind</c> — folding
    /// the ledger in would judge each of them as a row naming no discriminator, which is the exact reason
    /// <c>EventsSettlementLine</c> is kept out of the Events pin. The two populations answer different
    /// questions and are held to different rules; splitting them says so instead of widening one until both
    /// pass.</para>
    ///
    /// <para><b>Why the coherence contract is the right rule here.</b> Growth's privileged writes are not all
    /// made by a store user. The GB4 suppression lift is caused by the data subject clicking a
    /// mailbox-control confirm link, and the sweeps and the provider webhook act with no human at all — so a
    /// blank actor is the honest answer and <c>GrowthAuditActorKind</c> is what records it, exactly as
    /// D-MEALS-AUDIT-ACTOR-KIND ruled and as Events already does.</para>
    ///
    /// <para>The guard is <c>GrowthActorGuard.RequireAttributed</c>, called ahead of the stamp in each Admin
    /// site. It is declared in <c>Services/Growth/GrowthActorGuard.cs</c>, which mentions no stamped type and
    /// is therefore outside every derived scope — so the declaration pin below cannot reach it and
    /// <c>ModuleActorGuardBehaviourTests</c> drives it at runtime instead. The guard floor here counts the
    /// file-local <c>RequireAttributed</c> in <c>GrowthNewsletterService</c>, which the pin CAN read.</para>
    /// </summary>
    public static readonly ModuleActorStampPin GrowthAudit = new(
        Module: "GrowthAudit",
        Stamps: new[] { new ActorStamp("GrowthAuditEntry", "ActorReference") },
        Provenances: Array.Empty<ActorProvenance>(),
        Guards: new[] { "RequireAttributed" },
        Resolvers: Array.Empty<string>(),
        Writer: new ActorWriter(
            "GrowthAuditEvent", "Services/Growth/GrowthAuditWriter.cs", AlsoForbidSetAdd: true),
        Coherence: new ActorCoherence(
            DiscriminatorProperty: "ActorKind",
            HumanKind: nameof(GrowthAuditActorKind.Admin),
            NonHumanKinds: new[] { nameof(GrowthAuditActorKind.Guest), nameof(GrowthAuditActorKind.System) },
            Why: "A Guest event is the data subject acting over a single-use link token — the double opt-in "
                 + "confirm that lifts a suppression — and a System event is a sweep, a dispatch drain or an "
                 + "authenticated provider webhook. Neither is a store user, GrowthAuditActorKind is what "
                 + "records that, and naming the guest further would put a marketing identity into a ledger "
                 + "erasure cannot reach."),
        KnownFiles: new[]
        {
            "Services/Growth/GrowthNewsletterService.cs",
            "Services/Growth/GrowthConsentTextService.cs",
            "Services/Growth/GrowthProviderAccountService.cs",
            "Services/Growth/GrowthSubscriptionService.cs",
            "Services/Growth/GrowthDispatchService.cs",
        },
        KnownSiteFloor: 6,
        KnownResolverFloor: 0,
        KnownGuardFloor: 1);

    public static readonly ModuleActorStampPin[] All = { Meals, Training, Events, Margin, Growth, GrowthAudit };

    public static ModuleActorStampPin ByName(string module) =>
        All.Single(m => string.Equals(m.Module, module, StringComparison.Ordinal));
}
