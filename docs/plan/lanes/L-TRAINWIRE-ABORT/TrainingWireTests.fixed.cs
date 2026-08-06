using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WebApi.Services.Training;
using WebApi.Tests.Training;
using Xunit;

namespace WebApi.Tests.Wire;

/// <summary>
/// Training over HTTP through the REAL pipeline — the sixth module, and the last one to reach this tier.
///
/// <para><b>Why it needed to.</b> Training already carries 115 service-tier facts — a tenant-isolation matrix,
/// an append-only guard, a version-immutability guard, a migration-lineage catalog — and until now not one at
/// this tier. Not one of the 115 can see the three ways working code stays unreachable while every test passes:
/// a service with no controller and no DI registration, a feature flag with no lever, and a seed with no
/// production caller. Four of the five other modules' journeys stopped at exactly one of those, and no backend
/// test saw any of them. So the questions this file exists to answer are not "does the logic work" — that is
/// settled elsewhere — but "can anyone outside the process reach it, and can an operator turn it on".</para>
///
/// <para><b>Training inverts the estate's gate ordering, and that is the fact most likely to be "fixed" into a
/// defect.</b> Margin, Meals and Growth resolve the module gate FIRST, so a dark store and a non-existent
/// store answer identically. Every Training service instead calls <c>RequireStoreAdminAsync</c> before
/// <c>EnsureVisibleAsync</c>/<c>EnsureWritableAsync</c>, so a store the caller does not administer — including
/// one that does not exist — is 403, while a store they DO administer whose module was never enabled is an
/// opaque 404. <c>ModuleGateOrderingTests</c> exempts the family from the estate-wide ordering rule on that
/// basis; this file is where the premise of that exemption is measured against real responses rather than
/// asserted in a comment beside it.</para>
///
/// <para>Every refusal below is paired with the same request answering somewhere in the same run, so nothing
/// here can pass by refusing everything. The tokens are the application's OWN
/// (<see cref="WireHostFixture.CreateClientAs"/>, <c>unique_name</c> and no <c>nameid</c>) because that is the
/// shape a real client carries and the shape that used to refuse every Workforce caller.</para>
/// </summary>
[Collection(WireCollection.Name)]
public class TrainingWireTests
{
    /// <summary>
    /// The person the journey assigns and records against, BY VALUE — Training holds no FK to one. Owned by
    /// the fixture because <c>TrainingPersonBinding.RequireKnownPersonAsync</c> makes the person row a
    /// precondition of the completion write, so it is part of the world rather than of this suite.
    /// </summary>
    private static readonly Guid JourneyPerson = WireHostFixture.TrainingJourneyPersonRef;

    private readonly WireHostFixture _wire;

    public TrainingWireTests(WireHostFixture wire) => _wire = wire;

    private static string Store(int storeId) => "/training/stores/" + storeId;

    // ---- 1. reachability: the surface exists and the composition root can build it --------------------

    /// <summary>
    /// The bare fact no service-tier suite can establish: the controller is routed, the composition root
    /// resolves all six Training services it depends on, and a GENUINE non-PowerUser store admin is admitted
    /// by the application's own token. If any one of the six registrations were missing, the host would fail
    /// to activate the controller and every route below would answer 500 instead.
    /// </summary>
    [Fact]
    public async Task A_genuine_store_admin_reaches_the_training_surface_with_the_applications_own_token()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var context = await client.GetAsync(Store(WireHostFixture.StoreA) + "/context");
        var courses = await client.GetAsync(Store(WireHostFixture.StoreA) + "/courses");
        var certificates = await client.GetAsync(Store(WireHostFixture.StoreA) + "/certificates");
        var assignments = await client.GetAsync(Store(WireHostFixture.StoreA) + "/assignments");
        var completions = await client.GetAsync(Store(WireHostFixture.StoreA) + "/completions");
        var expiring = await client.GetAsync(Store(WireHostFixture.StoreA) + "/certificates/expiring");
        var holdings = await client.GetAsync(
            Store(WireHostFixture.StoreA) + "/competency/holdings?person=" + WireHostFixture.TrainingPersonRef);

        foreach (var response in new[] { context, courses, certificates, assignments, completions, expiring, holdings })
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // The success path negotiates plain JSON; only the wire sees which formatter was selected.
            Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        }

        // The reads are answering about the seeded world rather than returning an empty envelope for any store.
        using var courseList = JsonDocument.Parse(await courses.Content.ReadAsStringAsync());
        Assert.Equal(WireHostFixture.StoreA, courseList.RootElement.GetProperty("storeId").GetInt32());
        Assert.Contains(
            courseList.RootElement.GetProperty("courses").EnumerateArray(),
            c => c.GetProperty("courseId").GetGuid() == WireHostFixture.TrainingCourseInStoreA);
    }

    /// <summary>
    /// The context read is the client's window onto the rollout, and the ONE Training route that must stay
    /// honest about a flag rather than hide behind it. Read over the wire it also confirms the fixture's flag
    /// row is the one the LIVE gate resolved, so every "dark" assertion below is about the real resolution
    /// path and not about a store the host never saw.
    /// </summary>
    [Fact]
    public async Task The_context_read_reports_every_training_flag_it_actually_resolved()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var response = await client.GetAsync(Store(WireHostFixture.StoreA) + "/context");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var flags = document.RootElement.GetProperty("featureFlags");

        // The whole family is reported, so a client never has to INFER a stage it cannot see. Derived from the
        // module's own registry rather than a copied list, so a new flag cannot be added without appearing here.
        foreach (var flag in TrainingFeatureFlags.All)
        {
            Assert.True(flags.TryGetProperty(flag, out _), "GET /context does not report " + flag);
        }

        Assert.True(flags.GetProperty(TrainingFeatureFlags.Setup).GetBoolean());
        Assert.False(flags.GetProperty(TrainingFeatureFlags.Assignments).GetBoolean());
    }

    // ---- 2. the lever: a flag an operator can find, flip, and see take effect -------------------------

    /// <summary>
    /// Mechanism two, first half: the flags are DISCOVERABLE. A gate whose key is absent from the shared
    /// catalog cannot be switched on at all — <c>StoreFeatureFlagsController</c> writes deny-closed and
    /// answers 400 "Unknown feature flag" for anything it does not advertise, which is exactly the state
    /// <c>meals.module</c> was found in.
    ///
    /// <para><b>This pin used to read "every declared <c>training.*</c> flag is advertised", and its scope was
    /// drawn before anyone had measured which of them gate anything.</b> Five of the seven change the outcome
    /// of no request (<see cref="TrainingFlagCensus"/>), so the old rule REQUIRED five levers that lie: an
    /// operator could flip <c>training.onboarding</c>, watch <c>GET /context</c> report the stage live, and
    /// get no behaviour change. Advertising a flag is a promise that flipping it does something, and the
    /// honest rule is two-sided.</para>
    ///
    /// <para>So the claim is now: every flag that GATES something is advertised (the original defence,
    /// unweakened — this is the half that would catch the <c>Events.Settlement</c> shape, a flag enforced
    /// with no lever anywhere); every flag WITHHELD from the catalog carries the recorded reason it cannot
    /// yet be a lever; and nothing is advertised while gating nothing — the clause that would have caught the
    /// five, and the one no test in the estate had.</para>
    ///
    /// <para>Both sides are DERIVED. "Advertised" is read off the live catalog over HTTP, "gates something"
    /// is measured by driving the module's mutation surface with one flag off at a time, and the withheld set
    /// is the difference between them — so a flag someone ADDS is covered without anyone remembering to list
    /// it. The one thing that is not derived is the census's probe SURFACE: a probe needs arguments and an
    /// ordering reflection cannot invent, so <c>TrainingFlagCensus.Mutations</c> is written by hand and held
    /// to the controller's non-GET actions by <c>TrainingFlagCensusCoverageTests</c>, which reddens when a
    /// mutation gains a route but no probe. Without that pin a flag enforced on a NEW route would measure as
    /// gating nothing, and this rule would keep it withheld while it genuinely refused requests.</para>
    /// </summary>
    [Fact]
    public async Task The_catalog_advertises_exactly_the_training_flags_that_gate_something_and_withholds_the_rest_with_a_reason()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var response = await client.GetAsync("/feature-flags/catalog");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var advertised = document.RootElement.EnumerateArray()
            .Where(e => e.GetProperty("module").ToString() == "Training")
            .ToList();
        var advertisedKeys = advertised
            .Select(e => e.GetProperty("flagKey").ToString())
            .OrderBy(f => f, StringComparer.Ordinal)
            .ToList();

        var gating = await TrainingFlagCensus.GatingFlagsAsync();

        // 1. A flag that refuses a request is one an operator must be able to find and flip.
        foreach (var flag in gating)
        {
            Assert.True(
                advertisedKeys.Contains(flag),
                "'" + flag + "' refuses requests but the shared catalog does not offer it, so "
                    + "PUT /stores/{id}/feature-flags answers 400 'Unknown feature flag' and no operator can "
                    + "switch it on. Add it to TrainingFeatureFlags.Describe().");
        }

        // 2. …and the converse, which is what the old rule got wrong: an advertised flag is a PROMISE.
        foreach (var flag in advertisedKeys)
        {
            Assert.True(
                gating.Contains(flag),
                "'" + flag + "' is advertised in the shared operator catalog, so a store admin can flip it "
                    + "and GET /context will report the stage as live — and it changes the outcome of NO "
                    + "request. Either give it an enforcement point, or withhold it from "
                    + "TrainingFeatureFlags.Describe() with the reason it cannot yet gate anything, as "
                    + "Events.Deposits is withheld.");
        }

        // 3. A withheld flag is a deliberate omission with a stated reason, not a disappearance.
        foreach (var flag in TrainingFeatureFlags.All.Where(f => !advertisedKeys.Contains(f)))
        {
            string reason;
            Assert.True(
                TrainingFeatureFlags.Withheld.TryGetValue(flag, out reason) && !string.IsNullOrWhiteSpace(reason),
                "'" + flag + "' is declared but not advertised, and TrainingFeatureFlags.Withheld records no "
                    + "reason for it. A reader cannot tell a considered withholding from a dropped line.");
        }

        // …and the reasons may not outlive what they explain: a wave that lands takes its row with it.
        Assert.Empty(TrainingFeatureFlags.Withheld.Keys.Where(k => !TrainingFeatureFlags.All.Contains(k)));
        Assert.Empty(TrainingFeatureFlags.Withheld.Keys.Where(advertisedKeys.Contains));

        // Advertised deny-closed: the catalog's own default must be off for every key, or a store gets the
        // module the moment the code ships rather than when an operator decides.
        Assert.DoesNotContain(true, advertised.Select(e => e.GetProperty("defaultEnabled").GetBoolean()));
    }

    /// <summary>
    /// THE headline, and mechanism two end to end: a store with no flag row and no Training data at all goes
    /// from an opaque 404 to a walked internkontroll journey, driven entirely over HTTP by a genuine
    /// non-PowerUser store admin. Nothing is seeded for
    /// <see cref="WireHostFixture.TrainingJourneyStore"/> — the lever is the only thing that can light it, so
    /// a pass here cannot be a world the fixture handed the test.
    ///
    /// <para>It also proves the two stages are INDEPENDENT levers rather than one switch wearing two names:
    /// with <c>training.setup</c> on and <c>training.assignments</c> still off, authoring works and assigning
    /// is refused 409 — on the same store, in the same run, for the same caller.</para>
    ///
    /// <para>The nine calls are one test on purpose. Each step's precondition is the previous step's output (a
    /// course id, then a version number, then a published version id), and split across facts that would mean
    /// either sharing mutable state between tests whose order is undefined, or seeding the very rows the
    /// journey is supposed to prove can be created.</para>
    /// </summary>
    [Fact]
    public async Task The_flag_lever_takes_a_never_enabled_store_from_an_opaque_404_to_a_walked_journey()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);
        var store = WireHostFixture.TrainingJourneyStore;

        // Before the lever: the caller administers this store and the module is still invisible.
        var before = await client.GetAsync(Store(store) + "/courses");
        Assert.Equal(HttpStatusCode.NotFound, before.StatusCode);
        Assert.Equal("training.not-found", await CodeOf(before));

        // The lever itself, over the operator API a human would use.
        var lit = await SetFlag(client, store, TrainingFeatureFlags.Setup, enabled: true);
        Assert.Equal(HttpStatusCode.OK, lit.StatusCode);
        using (var flagState = JsonDocument.Parse(await lit.Content.ReadAsStringAsync()))
        {
            Assert.True(flagState.RootElement.GetProperty("effective").GetBoolean());
            Assert.True(flagState.RootElement.GetProperty("isOverridden").GetBoolean());
        }

        // …and the module gate reads the row that lever wrote.
        var after = await client.GetAsync(Store(store) + "/courses");
        Assert.Equal(HttpStatusCode.OK, after.StatusCode);

        // Author a course, draft a version, publish it.
        var courseId = await IdOf(
            await Post(client, Store(store) + "/courses", "{\"title\":\"Internkontroll\",\"competencyKey\":\"haccp\"}", "wire-tr-journey-course"),
            "courseId");

        var versionResponse = await Post(
            client,
            Store(store) + "/courses/" + courseId + "/versions",
            "{\"contentPagesJson\":\"[]\",\"quizJson\":\"[]\",\"passThresholdPercent\":80}",
            "wire-tr-journey-version");
        Assert.Equal(HttpStatusCode.OK, versionResponse.StatusCode);
        int versionNo;
        using (var version = JsonDocument.Parse(await versionResponse.Content.ReadAsStringAsync()))
        {
            versionNo = version.RootElement.GetProperty("versionNo").GetInt32();
            Assert.Equal("Draft", version.RootElement.GetProperty("state").GetString());
        }

        var publishResponse = await Post(
            client,
            Store(store) + "/courses/" + courseId + "/versions/" + versionNo + "/publish",
            "{}",
            "wire-tr-journey-publish");
        Assert.Equal(HttpStatusCode.OK, publishResponse.StatusCode);
        Guid courseVersionId;
        using (var published = JsonDocument.Parse(await publishResponse.Content.ReadAsStringAsync()))
        {
            Assert.Equal("Published", published.RootElement.GetProperty("state").GetString());
            courseVersionId = published.RootElement.GetProperty("courseVersionId").GetGuid();
        }

        var assignmentBody = "{\"courseVersionId\":\"" + courseVersionId
            + "\",\"scope\":\"Person\",\"personRef\":\"" + JourneyPerson + "\"}";

        // The SECOND stage is still dark, so the identical body that succeeds below is refused now. This is
        // the arm that proves the two flags are separate levers rather than one.
        var beforeSecondStage = await Post(
            client, Store(store) + "/assignments", assignmentBody, "wire-tr-journey-assign-dark");
        Assert.Equal(HttpStatusCode.Conflict, beforeSecondStage.StatusCode);
        Assert.Equal("training.flag-disabled-read-only", await CodeOf(beforeSecondStage));

        Assert.Equal(
            HttpStatusCode.OK,
            (await SetFlag(client, store, TrainingFeatureFlags.Assignments, enabled: true)).StatusCode);

        var assigned = await Post(
            client, Store(store) + "/assignments", assignmentBody, "wire-tr-journey-assign");
        Assert.Equal(HttpStatusCode.OK, assigned.StatusCode);

        var recorded = await Post(
            client,
            Store(store) + "/completions",
            "{\"personRef\":\"" + JourneyPerson + "\",\"courseVersionId\":\"" + courseVersionId
                + "\",\"scorePercent\":90,\"passed\":true}",
            "wire-tr-journey-complete");
        Assert.Equal(HttpStatusCode.OK, recorded.StatusCode);

        // The inspector's question, answered over HTTP: who holds this competency, and on what evidence.
        var holdings = await client.GetAsync(
            Store(store) + "/competency/holdings?person=" + JourneyPerson);
        Assert.Equal(HttpStatusCode.OK, holdings.StatusCode);
        using (var held = JsonDocument.Parse(await holdings.Content.ReadAsStringAsync()))
        {
            Assert.Contains(
                held.RootElement.GetProperty("heldCompetencyKeys").EnumerateArray(),
                k => k.GetString() == "haccp");
        }

        // The completion really landed, append-only, attributed to the caller the bearer handler resolved.
        using var db = _wire.NewDbContext();
        var completion = db.TrainingCompletions.AsNoTracking()
            .Single(c => c.StoreId == store && c.PersonRef == JourneyPerson);
        Assert.Equal(courseVersionId, completion.CourseVersionId);

        Assert.Contains(
            db.TrainingAuditEvents.AsNoTracking().Where(e => e.StoreId == store).ToList(),
            e => e.EventType == "completion.record" && e.ActorReference == WireHostFixture.AdminA);
    }

    // ---- 3. who is admitted, and who is not ----------------------------------------------------------

    [Fact]
    public async Task An_admin_of_another_venue_is_refused_while_that_venues_own_admin_is_admitted()
    {
        // Both principals are genuine, non-PowerUser store admins, so the pair isolates the store scope as the
        // only variable: the same route, the same store, two callers, two answers.
        var foreign = _wire.CreateClientAs(WireHostFixture.AdminA);
        var own = _wire.CreateClientAs(WireHostFixture.AdminB);

        var refused = await foreign.GetAsync(Store(WireHostFixture.StoreB) + "/courses");
        var admitted = await own.GetAsync(Store(WireHostFixture.StoreB) + "/courses");

        Assert.Equal(HttpStatusCode.Forbidden, refused.StatusCode);
        Assert.Equal("application/problem+json", refused.Content.Headers.ContentType?.MediaType);
        Assert.Equal("training.forbidden", await CodeOf(refused));

        Assert.Equal(HttpStatusCode.OK, admitted.StatusCode);
    }

    [Fact]
    public async Task A_power_user_reaches_every_stores_training_which_is_why_it_cannot_be_the_proof()
    {
        // Pinned deliberately rather than discovered later: an operator role that can read every employer's
        // internkontroll evidence is a decision. It is also why every other test here drives a real venue
        // admin — a PowerUser-only suite would have stayed green through the Events authorization outage.
        var client = _wire.CreateClientAs(WireHostFixture.PowerUser);

        var own = await client.GetAsync(Store(WireHostFixture.StoreA) + "/courses");
        var foreign = await client.GetAsync(Store(WireHostFixture.StoreB) + "/courses");

        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Equal(HttpStatusCode.OK, foreign.StatusCode);
    }

    [Fact]
    public async Task An_authenticated_caller_who_administers_nothing_is_refused()
    {
        var client = _wire.CreateClientAs(WireHostFixture.Outsider);

        var response = await client.GetAsync(Store(WireHostFixture.StoreA) + "/courses");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("training.forbidden", await CodeOf(response));
    }

    [Fact]
    public async Task An_anonymous_caller_is_401_and_never_reaches_the_module_at_all()
    {
        // Worth pinning because a module's posture is often described as "everything is a 404", and that is
        // not true of an unauthenticated request — [Authorize] answers above the controller.
        var response = await _wire.CreateClient().GetAsync(Store(WireHostFixture.StoreA) + "/courses");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_forged_token_is_refused_by_the_real_bearer_handler()
    {
        var client = _wire.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", _wire.TokenFor(WireHostFixture.AdminA) + "x");

        var response = await client.GetAsync(Store(WireHostFixture.StoreA) + "/courses");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ---- 4. the inverted ordering, measured --------------------------------------------------------

    /// <summary>
    /// The property that makes Training different from Margin and Meals, and the one a reader carrying their
    /// habits over from those modules would "fix" into a defect: the TENANT check answers first, so a
    /// never-enabled store (404) and a store that does not exist (403) deliberately differ.
    ///
    /// <para>Both answers are attributable to exactly one cause. <see cref="WireHostFixture.DarkStore"/> EXISTS
    /// and this caller genuinely administers it, so its 404 can only be the absent flag — and the same route
    /// answers 200 for <see cref="WireHostFixture.StoreA"/> in this same run. The absent store's 403 is
    /// byte-identical to a store the caller merely does not administer, so the refusal discloses no store
    /// existence either. What is deliberately NOT hidden is a store's own module state from its own admin,
    /// which they may lawfully know.</para>
    /// </summary>
    [Fact]
    public async Task The_tenant_check_answers_before_the_module_gate_so_dark_and_absent_differ_on_purpose()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var lit = await client.GetAsync(Store(WireHostFixture.StoreA) + "/courses");
        var dark = await client.GetAsync(Store(WireHostFixture.DarkStore) + "/courses");
        var absent = await client.GetAsync(Store(WireHostFixture.NonExistentStore) + "/courses");
        var notAdministered = await client.GetAsync(Store(WireHostFixture.StoreB) + "/courses");

        Assert.Equal(HttpStatusCode.OK, lit.StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, dark.StatusCode);
        Assert.Equal("training.not-found", await CodeOf(dark));

        // The absent store is refused as an authorization failure, and identically to one that merely is not
        // this caller's — so nothing about which store ids exist is readable from the pair. Both statuses are
        // asserted here rather than leaning on another fact for the second one, so the comparison cannot be
        // satisfied by two matching documents at two different statuses.
        Assert.Equal(HttpStatusCode.Forbidden, absent.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, notAdministered.StatusCode);
        Assert.Equal(await WithoutTraceId(absent), await WithoutTraceId(notAdministered));
    }

    [Fact]
    public async Task A_never_enabled_store_is_dark_for_a_fully_bound_write_exactly_as_for_a_read()
    {
        // Darkness has to survive a real body through the input formatter and model binding, carry the same
        // document, and leave nothing behind — not merely answer a parameterless read.
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var read = await client.GetAsync(Store(WireHostFixture.DarkStore) + "/courses");
        var write = await Post(
            client, Store(WireHostFixture.DarkStore) + "/courses", "{\"title\":\"Smuglet\"}", "wire-tr-dark-write");

        Assert.Equal(HttpStatusCode.NotFound, write.StatusCode);
        Assert.Equal(await WithoutTraceId(read), await WithoutTraceId(write));

        using var db = _wire.NewDbContext();
        Assert.Empty(db.TrainingCourses.AsNoTracking().Where(c => c.StoreId == WireHostFixture.DarkStore));
    }

    // ---- 5. the read-only arm a flag flip cannot take back -----------------------------------------

    /// <summary>
    /// The gate's other arm, and the reason <see cref="WireHostFixture.StoreB"/> carries a course row and no
    /// flag: once real data exists a store stays visible for READS whatever happens to the flag (spec §9.1,
    /// "data outlives a flag flip"), and a write is refused with a VISIBLE 409 rather than an opaque 404. A
    /// venue that pauses the module must never lose the evidence an inspector can ask for.
    ///
    /// <para>The caller is that store's own admin, so the 409 is the flag alone — and the same write succeeds
    /// against <see cref="WireHostFixture.StoreA"/>, whose <c>training.setup</c> row IS present, which is what
    /// makes it the flag rather than a blanket refusal of all writes.</para>
    /// </summary>
    [Fact]
    public async Task A_store_whose_data_outlived_its_flag_still_reads_but_refuses_to_write()
    {
        var own = _wire.CreateClientAs(WireHostFixture.AdminB);
        var lit = _wire.CreateClientAs(WireHostFixture.AdminA);

        var read = await own.GetAsync(Store(WireHostFixture.StoreB) + "/courses");
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);

        var write = await Post(
            own, Store(WireHostFixture.StoreB) + "/courses", "{\"title\":\"Etter pause\"}", "wire-tr-readonly");

        Assert.Equal(HttpStatusCode.Conflict, write.StatusCode);
        Assert.Equal("application/problem+json", write.Content.Headers.ContentType?.MediaType);

        using (var document = JsonDocument.Parse(await write.Content.ReadAsStringAsync()))
        {
            Assert.Equal("training.flag-disabled-read-only", document.RootElement.GetProperty("code").GetString());

            // The typed conflict members the client keys its retry behaviour on (spec §5.3).
            Assert.Equal("flag-disabled-read-only", document.RootElement.GetProperty("conflictKind").GetString());
            Assert.False(document.RootElement.GetProperty("retryable").GetBoolean());
        }

        // The positive control: the identical mutation on a store whose setup flag IS on.
        var allowed = await Post(
            lit, Store(WireHostFixture.StoreA) + "/courses", "{\"title\":\"Etter pause\"}", "wire-tr-readonly-ok");
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);

        using var db = _wire.NewDbContext();
        Assert.Empty(db.TrainingCourses.AsNoTracking()
            .Where(c => c.StoreId == WireHostFixture.StoreB && c.Title == "Etter pause"));
    }

    // ---- 6. resource opacity --------------------------------------------------------------------------

    [Fact]
    public async Task A_course_of_another_store_answers_exactly_as_a_course_that_never_existed()
    {
        // The caller genuinely administers the route store, so the tenant check passes and the answer is the
        // resource lookup's alone. If these two ever diverged, a course id would become an existence oracle
        // for every OTHER venue's training catalogue.
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var foreignResource = await client.GetAsync(
            Store(WireHostFixture.StoreA) + "/courses/" + WireHostFixture.TrainingCourseInStoreB);
        var neverExisted = await client.GetAsync(
            Store(WireHostFixture.StoreA) + "/courses/" + WireHostFixture.TrainingUnknownCourse);
        var own = await client.GetAsync(
            Store(WireHostFixture.StoreA) + "/courses/" + WireHostFixture.TrainingCourseInStoreA);

        Assert.Equal(HttpStatusCode.NotFound, foreignResource.StatusCode);
        Assert.Equal(await WithoutTraceId(neverExisted), await WithoutTraceId(foreignResource));

        // …and the route is genuinely live for a course that IS this store's, so the pair above is opacity
        // rather than a read that answers 404 for everything.
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
    }

    // ---- 7. preconditions, and what only the pipeline decides -------------------------------------

    /// <summary>
    /// <c>TrainingControllerBase.TryGetIdempotencyKey</c> refuses a keyless mutation in the CONTROLLER, which
    /// is above both gates — so this 400 reaches the wire before the tenant check and before the module gate.
    /// That is the ordering <c>ModuleGateOrderingTests</c> exempts the Training family from enforcing, and
    /// this is the measurement the exemption rests on: the refusal is STORE-INDEPENDENT.
    ///
    /// <para>All four postures — lit, foreign, never-enabled, non-existent — return the identical document, so
    /// a prober learns that <c>/training</c> is deployed (already readable from routing) and nothing whatever
    /// about a store. If someone later makes the message, status or shape vary by store, this goes red and the
    /// exemption has to be re-earned rather than silently becoming an oracle.</para>
    /// </summary>
    [Fact]
    public async Task The_keyless_mutation_refusal_precedes_both_gates_and_carries_no_store_information()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var answers = new List<string>();
        foreach (var store in new[]
                 {
                     WireHostFixture.StoreA, WireHostFixture.StoreB,
                     WireHostFixture.DarkStore, WireHostFixture.NonExistentStore,
                 })
        {
            var response = await Post(client, Store(store) + "/courses", "{\"title\":\"Uten nokkel\"}", key: null);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("Idempotency-Key", await response.Content.ReadAsStringAsync(), StringComparison.Ordinal);
            answers.Add(await WithoutTraceId(response));
        }

        Assert.Single(answers.Distinct(StringComparer.Ordinal));

        // Nothing was written anywhere, including the store whose flag is on and whose admin this is.
        using var db = _wire.NewDbContext();
        Assert.Empty(db.TrainingCourses.AsNoTracking().Where(c => c.Title == "Uten nokkel"));
    }

    /// <summary>
    /// Idempotency over HTTP rather than in the service: a replayed key returns the SAME aggregate and writes
    /// no second row, and the same key with a different payload is the typed 409 rather than a silent replay
    /// of something the caller did not send.
    /// </summary>
    [Fact]
    public async Task A_replayed_idempotency_key_returns_the_same_course_and_a_changed_payload_is_a_409()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);
        var route = Store(WireHostFixture.StoreA) + "/courses";
        const string key = "wire-tr-idem";

        var first = await Post(client, route, "{\"title\":\"Allergener\"}", key);
        var replay = await Post(client, route, "{\"title\":\"Allergener\"}", key);
        var changed = await Post(client, route, "{\"title\":\"Noe annet\"}", key);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, replay.StatusCode);
        Assert.Equal(await IdOf(first, "courseId"), await IdOf(replay, "courseId"));

        Assert.Equal(HttpStatusCode.Conflict, changed.StatusCode);
        Assert.Equal("training.idempotency-payload-mismatch", await CodeOf(changed));

        using var db = _wire.NewDbContext();
        Assert.Equal(1, db.TrainingCourses.AsNoTracking()
            .Count(c => c.StoreId == WireHostFixture.StoreA && c.Title == "Allergener"));
        Assert.Empty(db.TrainingCourses.AsNoTracking().Where(c => c.Title == "Noe annet"));
    }

    /// <summary>
    /// The certificate correction is the module's one <c>If-Match</c> route, and the header is a CONTROLLER
    /// precondition — read off <c>Request.Headers</c>, which does not exist below this tier.
    ///
    /// <para><b>Two different nulls, and only one of them is SQLite's.</b> An earlier version of this comment
    /// called the malformed-token behaviour "a property of the provider rather than of the contract". That was
    /// wrong, and it is the sentence that hid a live defect for a review round.
    /// <c>TrainingConcurrency.DecodeRevision</c> returns null for a blank token AND for a corrupted one, and
    /// the two are not the same claim: the null-LENIENCE of a missing server rowversion is genuinely
    /// SQLite-scoped, whereas mapping a garbled token to null is the CODEC's behaviour and is identical on
    /// every provider. Conflating them is what made an unconditional overwrite read as a provider quirk — see
    /// <see cref="A_malformed_if_match_revision_is_refused_instead_of_silently_overwriting"/>.</para>
    ///
    /// <para>What still cannot be asserted at this tier is the ENFORCING half: a real rowversion, a genuine
    /// stale detection, and the <c>ETag</c> this route emits (null revision here, so no header at all — only
    /// its CORS exposure is pinnable, in <c>WireContractPinsTests</c>). That gap is no longer open elsewhere,
    /// and this paragraph used to say it was: <c>TrainingCertificateRevisionCasSqlServerTests</c> now drives
    /// <c>UpdateCertificateAsync</c> on a migrated SQL Server catalog and settles all four claims, including the
    /// TOCTOU arm at the database pin. A comment asserting a gap that has been closed misleads in the same way
    /// as one claiming coverage that does not exist, so it is corrected rather than left standing.</para>
    /// </summary>
    [Fact]
    public async Task The_certificate_correction_refuses_a_missing_or_blank_if_match_revision()
    {
        // These two answers are UNCHANGED by the malformed-token guard below: an absent and a blank header
        // still take the "a revision is required" branch, with the same status, media type and message they
        // had before it existed. Only the non-blank-but-undecodable case moved.
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);
        var route = CorrectionRoute();

        var absent = await Patch(client, route, "wire-tr-ifmatch-absent", ifMatch: null);
        var blank = await Patch(client, route, "wire-tr-ifmatch-blank", ifMatch: string.Empty);

        foreach (var response in new[] { absent, blank })
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
            Assert.Contains(
                "An If-Match revision header is required for this correction.",
                await response.Content.ReadAsStringAsync(),
                StringComparison.Ordinal);
        }

        AssertCorrectionSubjectUntouched();
    }

    /// <summary>
    /// FIXED, and this pin records the fix. <c>DecodeRevision</c> maps ANY unparseable <c>If-Match</c> to null,
    /// and <c>UpdateCertificateAsync</c> arms its compare-and-swap only when the decoded revision is non-null —
    /// so a CORRUPTED token used to leave the UPDATE matching on the primary key alone and overwrite
    /// unconditionally, on every provider. The concurrency control inverted under corruption: submit a STALE
    /// token and you were correctly refused 409; submit a GARBLED one and you won.
    ///
    /// <para>It is not hypothetical. The scratch probe this lane deleted did exactly this — it sent
    /// <c>If-Match: not-base64!</c> and rewrote a seeded certificate's issuer to "Garbage" — and the symptom
    /// was misread as SQLite having no rowversion. <c>TrainingControllerBase.TryGetIfMatchRevision</c> now
    /// refuses it at the boundary, which is the only enforcement point that covers every provider.</para>
    ///
    /// <para>The 409 arm is asserted beside it so this cannot pass by refusing everything: a WELL-FORMED token
    /// is NOT turned away by the parser, so the two inputs demonstrably take different paths.</para>
    ///
    /// <para><b>What that 409 is, and is not, on this host.</b> It is the null-rowversion outcome, and the test
    /// now asserts that premise instead of leaving a reader to infer a stronger claim. SQLite generates no
    /// rowversion, so the stored <c>ConcurrencyVersion</c> is null and NO submitted token can ever equal it —
    /// every well-formed token is refused here, a current one exactly as loudly as a stale one. So this arm
    /// proves the token reached the concurrency machinery; it cannot prove the machinery DISCRIMINATES, and an
    /// earlier version of it asserted <c>training.stale-version</c> as though it did. The discrimination is
    /// proven where a server rowversion exists, in <c>TrainingCertificateRevisionCasSqlServerTests</c>, and
    /// provider-independently against a synthetic revision in the shape of
    /// <c>EventsSettlementRevisionGuardTests</c>. <c>RowversionAssertionProviderTests</c> is what keeps that
    /// distinction from being quietly re-erased.</para>
    /// </summary>
    [Fact]
    public async Task A_malformed_if_match_revision_is_refused_instead_of_silently_overwriting()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);
        var route = CorrectionRoute();

        var garbled = await Patch(client, route, "wire-tr-ifmatch-garbled", ifMatch: "not-base64!");

        Assert.Equal(HttpStatusCode.BadRequest, garbled.StatusCode);
        Assert.Equal("application/problem+json", garbled.Content.Headers.ContentType?.MediaType);
        Assert.Contains(
            "The If-Match header does not carry a valid resource revision.",
            await garbled.Content.ReadAsStringAsync(),
            StringComparison.Ordinal);

        // THE regression assertion: the correction did not land.
        AssertCorrectionSubjectUntouched();

        // The premise this host's answer rests on, asserted rather than assumed: the row carries no
        // server-generated revision, so nothing a caller submits can match it. If the wire host ever moves to a
        // provider that generates one, this goes red and the reasoning below has to be revisited rather than
        // silently inheriting a different meaning.
        Assert.Null(CorrectionSubjectRevision());

        // The positive control, and the parser is ALL it can settle: a well-formed base64 token is not turned
        // away by the parser guard, so it reaches the concurrency machinery instead of dying at the boundary.
        // Which answer the machinery then gives is provider-dependent — see the remarks — so this asserts only
        // that the refusal is no longer the parser's, and that the correction still did not land.
        var wellFormed = await Patch(client, route, "wire-tr-ifmatch-wellformed", ifMatch: "AAAAAAAAB9E=");
        Assert.NotEqual(HttpStatusCode.BadRequest, wellFormed.StatusCode);
        Assert.DoesNotContain(
            "The If-Match header does not carry a valid resource revision.",
            await wellFormed.Content.ReadAsStringAsync(),
            StringComparison.Ordinal);
        AssertCorrectionSubjectUntouched();
    }

    [Fact]
    public async Task Routing_answers_a_malformed_store_or_course_segment_before_any_training_code_runs()
    {
        // {storeId:int} and {courseId:guid} are ROUTING decisions: a non-matching segment matches no endpoint,
        // so the answer is a bare 404 carrying none of the module's vocabulary. Routing does not exist at the
        // service tier at all, and the contrast with the module's own 404 is the point — a bodiless routing
        // 404 and a problem+json module 404 are already distinguishable, which bounds what darkness can claim.
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var badStore = await client.GetAsync("/training/stores/not-an-int/courses");
        var badCourse = await client.GetAsync(Store(WireHostFixture.StoreA) + "/courses/not-a-guid");
        var unrouted = await client.GetAsync(Store(WireHostFixture.StoreA) + "/not-a-training-route");
        var moduleDark = await client.GetAsync(Store(WireHostFixture.DarkStore) + "/courses");

        foreach (var response in new[] { badStore, badCourse, unrouted })
        {
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Empty(await response.Content.ReadAsStringAsync());
        }

        Assert.Equal(HttpStatusCode.NotFound, moduleDark.StatusCode);
        Assert.Equal("application/problem+json", moduleDark.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task An_unsupported_method_on_a_real_training_route_is_refused_by_routing()
    {
        // 405 is produced by the routing/endpoint layer, above MVC. A service-tier test cannot produce it.
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var response = await client.SendAsync(new HttpRequestMessage(
            HttpMethod.Delete, Store(WireHostFixture.StoreA) + "/courses"));

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }

    /// <summary>
    /// The two refusals that reach the wire ahead of the tenant check, PINNED rather than fixed.
    ///
    /// <para><c>[ApiController]</c>'s model-state short-circuit is a filter, so an unbindable
    /// <c>courseVersionId</c> is answered 400 above the action — and the document names the module's own field
    /// and echoes nothing else. <c>TrainingAssignmentService.CreateAssignmentAsync</c> then runs
    /// <c>ValidateScope</c> BEFORE <c>RequireStoreAdminAsync</c>, so a well-formed body that breaks a business
    /// rule answers <c>training.validation</c> to a caller who administers nothing. Neither is reorderable
    /// inside the controller: the first is above MVC's action invocation entirely, and the second is a
    /// deliberate service-tier choice.</para>
    ///
    /// <para>What bounds both is asserted rather than argued: each refusal is IDENTICAL across all four store
    /// postures, so what leaks is the request SHAPE, never a store's existence or module state. A change that
    /// makes either vary by store turns this red, which is the whole point of pinning it.</para>
    /// </summary>
    [Fact]
    public async Task PINNED_model_binding_and_body_validation_both_answer_before_the_tenant_check()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);
        var stores = new[]
        {
            WireHostFixture.StoreA, WireHostFixture.StoreB,
            WireHostFixture.DarkStore, WireHostFixture.NonExistentStore,
        };

        var unbindable = new List<string>();
        var invalidScope = new List<string>();
        foreach (var store in stores)
        {
            var route = Store(store) + "/assignments";

            var badGuid = await Post(
                client, route, "{\"courseVersionId\":\"not-a-guid\"}", "wire-tr-bind-" + store);
            Assert.Equal(HttpStatusCode.BadRequest, badGuid.StatusCode);
            unbindable.Add(await badGuid.Content.ReadAsStringAsync());

            var emptyGuid = await Post(
                client, route, "{\"courseVersionId\":\"" + Guid.Empty + "\",\"scope\":\"Person\"}",
                "wire-tr-scope-" + store);
            Assert.Equal(HttpStatusCode.BadRequest, emptyGuid.StatusCode);
            Assert.Equal("training.validation", await CodeOf(emptyGuid));
            invalidScope.Add(await WithoutTraceId(emptyGuid));
        }

        // The disclosure, spelled out rather than implied: the field name of the module's own request model.
        Assert.All(unbindable, body => Assert.Contains("courseVersionId", body, StringComparison.Ordinal));

        // …and the bound on it: the same answer for a store that is lit, foreign, dark and absent alike.
        Assert.Single(unbindable.Distinct(StringComparer.Ordinal));
        Assert.Single(invalidScope.Distinct(StringComparer.Ordinal));

        // The positive control: with a well-formed body the tenant check IS reached, and it answers on the
        // store — so the uniformity above is validation running first, not the tenant check having gone silent.
        var wellFormed = "{\"courseVersionId\":\"" + Guid.NewGuid()
            + "\",\"scope\":\"Person\",\"personRef\":\"" + Guid.NewGuid() + "\"}";
        var foreignStore = await Post(
            client, Store(WireHostFixture.StoreB) + "/assignments", wellFormed, "wire-tr-scope-control");
        Assert.Equal(HttpStatusCode.Forbidden, foreignStore.StatusCode);
        Assert.Equal("training.forbidden", await CodeOf(foreignStore));
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private static async Task<HttpResponseMessage> Post(HttpClient client, string route, string json, string? key)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, route)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        if (key != null)
        {
            request.Headers.Add("Idempotency-Key", key);
        }

        return await client.SendAsync(request);
    }

    /// <summary>
    /// The one correction route, always aimed at the DEDICATED subject. Every test here expects its PATCH to be
    /// refused and then reads the row back to prove it, so aiming them at
    /// <see cref="WireHostFixture.TrainingCertificateInStoreA"/> — which the list and holdings reads assert on —
    /// would turn a single regression into a cascade blaming the wrong fact.
    /// </summary>
    private static string CorrectionRoute()
        => Store(WireHostFixture.StoreA) + "/certificates/" + WireHostFixture.TrainingCorrectionSubjectInStoreA;

    /// <summary>The refusal really refused: the correction subject still carries its seeded issuer.</summary>
    private void AssertCorrectionSubjectUntouched()
    {
        using var db = _wire.NewDbContext();
        var certificate = db.TrainingCertificates.AsNoTracking()
            .Single(c => c.CertificateId == WireHostFixture.TrainingCorrectionSubjectInStoreA);

        Assert.Equal("Correction Subject Issuer", certificate.Issuer);
    }

    /// <summary>
    /// The correction subject's server-generated revision, so a test can assert what this provider does and
    /// does not hand out rather than reasoning about it in a comment. Null on the wire host's in-memory SQLite;
    /// a real rowversion on SQL Server.
    /// </summary>
    private byte[] CorrectionSubjectRevision()
    {
        using var db = _wire.NewDbContext();
        return db.TrainingCertificates.AsNoTracking()
            .Single(c => c.CertificateId == WireHostFixture.TrainingCorrectionSubjectInStoreA)
            .ConcurrencyVersion;
    }

    private static async Task<HttpResponseMessage> Patch(
        HttpClient client, string route, string key, string? ifMatch)
    {
        var request = new HttpRequestMessage(HttpMethod.Patch, route)
        {
            Content = new StringContent("{\"issuer\":\"Rettet\"}", Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("Idempotency-Key", key);
        if (ifMatch != null)
        {
            request.Headers.TryAddWithoutValidation("If-Match", ifMatch);
        }

        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> SetFlag(
        HttpClient client, int storeId, string flagKey, bool enabled)
    {
        var body = JsonSerializer.Serialize(new
        {
            flagKey,
            enabled,
            note = "wire training journey",
        });

        return await client.PutAsync(
            "/stores/" + storeId + "/feature-flags",
            new StringContent(body, Encoding.UTF8, "application/json"));
    }

    // ---- The read the module is sold on ---------------------------------------------------------------

    /// <summary>The route an inspector is shown, over the real pipeline.</summary>
    private const string EvidenceRoute = "/training/stores/{storeId}/evidence?personRef={personRef}";

    /// <summary>
    /// <b>The property the module is sold on, asserted end to end.</b> Asked to prove a person was trained on
    /// a given content, the module produces one document carrying: the person, the course version, the frozen
    /// content behind its hash, the score against the threshold that was published, the date, and the
    /// certificate's derived validity — and that document is internally consistent, i.e. every derived field
    /// recomputes from the raw ones printed beside it.
    ///
    /// <para>This test was written SKIPPED, before the route existed, as one half of a handover: unskipped it
    /// failed on <c>Expected: OK / Actual: NotFound</c>, and the moment the read landed its sibling reverse
    /// pin (<c>TrainingInspectorEvidencePackTests</c>'s surface census) went red for the same reason, by
    /// design. Both halves are now taken — the golden there renders the response object this route
    /// serializes, and this is what proves a person can actually reach it.</para>
    ///
    /// <para>Every assertion RECOMPUTES rather than compares against a literal: the hash is re-derived with
    /// <c>TrainingContentHash</c> from the pages, quiz and threshold printed in the same object, and the
    /// certificate status is re-projected with <c>TrainingCertificateStatusProjection</c> from the expiry
    /// printed beside it. A document whose derived fields were copied from somewhere else would fail here
    /// even though every value in it looked plausible.</para>
    ///
    /// <para>Deliberately NOT asserted: what the document is called, its media type, or whether it renders a
    /// PDF. Those are the feature decision. What is asserted is only what an inspection needs in order to
    /// check the claim for itself.</para>
    /// </summary>
    [Fact]
    public async Task An_inspector_can_be_handed_one_internally_consistent_evidence_document()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        var response = await client.GetAsync(
            EvidenceRoute
                .Replace("{storeId}", WireHostFixture.StoreA.ToString())
                .Replace("{personRef}", WireHostFixture.TrainingJourneyPersonRef.ToString()));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;

        // 1. The person the document is about, named — not only as the platform Guid an inspector cannot read.
        Assert.Equal(WireHostFixture.TrainingJourneyPersonRef, root.GetProperty("personRef").GetGuid());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("displayName").GetString()),
            "the document must name the person; a PersonRef is not something an inspection can check against a payroll");

        var completion = root.GetProperty("completions").EnumerateArray().First();

        // 2. The exact version, and 3. the frozen content behind its hash — printed, so it can be re-hashed.
        Assert.NotEqual(Guid.Empty, completion.GetProperty("courseVersionId").GetGuid());
        var pages = completion.GetProperty("contentPagesJson").GetString();
        var quiz = completion.GetProperty("quizJson").GetString();
        var threshold = completion.GetProperty("passThresholdPercent").GetInt32();
        var contentHash = completion.GetProperty("contentHash").GetString();

        Assert.Equal(TrainingContentHash.Compute(pages, quiz, threshold), contentHash);

        // 4. The score against the threshold that was PUBLISHED, with the verdict re-derivable from both.
        var score = completion.GetProperty("scorePercent").GetDecimal();
        Assert.Equal(score >= threshold, completion.GetProperty("passed").GetBoolean());

        // 5. The date.
        Assert.True(completion.TryGetProperty("completedAtUtc", out var completedAt));
        Assert.NotEqual(default, completedAt.GetDateTime());

        // 6. The certificate's DERIVED validity, with the expiry it derives from printed next to it.
        var asOf = root.GetProperty("asOfUtc").GetDateTime();
        foreach (var certificate in root.GetProperty("certificates").EnumerateArray())
        {
            var expiry = certificate.GetProperty("expiryDateUtc");
            DateTime? expiryDate = expiry.ValueKind == JsonValueKind.Null ? null : expiry.GetDateTime();

            Assert.Equal(
                TrainingCertificateStatusProjection.Project(expiryDate, asOf).ToString(),
                certificate.GetProperty("status").GetString());
        }
    }

    /// <summary>
    /// The evidence read is the widest disclosure Training has — one request returns a named person's whole
    /// competence record — and the same person is on file at BOTH employers, because a <c>PersonRef</c> is a
    /// platform-wide value. Nothing filters these rows ambiently: no <c>Training*</c> entity carries a query
    /// filter, so what stands between store A's admin and store B's copy is the tenant gate and a literal
    /// store predicate. Both are exercised here over the real pipeline.
    ///
    /// <para>Three answers in one run, so each is attributable: the route ANSWERS for the store this caller
    /// administers, REFUSES for the one they do not, and the document it does return carries none of the
    /// other employer's rows. Store B's own admin reading the same person is the positive control — without
    /// it a route that answered nothing at all would pass.</para>
    /// </summary>
    [Fact]
    public async Task An_evidence_read_answers_for_the_venue_the_caller_administers_and_refuses_the_other()
    {
        var adminOfA = _wire.CreateClientAs(WireHostFixture.AdminA);
        var adminOfB = _wire.CreateClientAs(WireHostFixture.AdminB);

        var own = await adminOfA.GetAsync(Evidence(WireHostFixture.StoreA, JourneyPerson));
        var foreign = await adminOfA.GetAsync(Evidence(WireHostFixture.StoreB, JourneyPerson));
        var theirs = await adminOfB.GetAsync(Evidence(WireHostFixture.StoreB, JourneyPerson));

        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, foreign.StatusCode);
        Assert.Equal("training.forbidden", await CodeOf(foreign));
        Assert.Equal(HttpStatusCode.OK, theirs.StatusCode);

        // Store B's certificate for this person exists and is reachable — through store B, and only there.
        using var theirDocument = JsonDocument.Parse(await theirs.Content.ReadAsStringAsync());
        Assert.Contains(
            theirDocument.RootElement.GetProperty("certificates").EnumerateArray(),
            c => c.GetProperty("certificateId").GetGuid() == WireHostFixture.TrainingEvidenceCertificateInStoreB);

        using var ownDocument = JsonDocument.Parse(await own.Content.ReadAsStringAsync());
        Assert.DoesNotContain(
            ownDocument.RootElement.GetProperty("certificates").EnumerateArray(),
            c => c.GetProperty("certificateId").GetGuid() == WireHostFixture.TrainingEvidenceCertificateInStoreB);
        Assert.Contains(
            ownDocument.RootElement.GetProperty("certificates").EnumerateArray(),
            c => c.GetProperty("certificateId").GetGuid() == WireHostFixture.TrainingEvidenceCertificateInStoreA);
    }

    /// <summary>
    /// The disclosure the read records, read back over the wire's own database. The actor is whoever the
    /// REAL bearer handler resolved — not a hand-built principal — which is the half a service-tier test
    /// cannot establish, and the half that was wrong across this whole module until the actor-claims fix.
    /// </summary>
    [Fact]
    public async Task An_evidence_read_records_who_asked_attributed_to_the_token_the_bearer_handler_resolved()
    {
        var person = WireHostFixture.TrainingPersonRef;
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);

        // The rows this request adds are IDENTIFIED, not counted, because an all-rows claim is false here: the
        // collection shares one fixture, and the disclosure-log test below has AdminB read THIS person in
        // StoreB deliberately, so "every evidence.read for this person was AdminA in StoreA" holds only in the
        // orders where that test has not run yet. Taking the ids first keeps the claim about this request.
        List<Guid> before;
        using (var db = _wire.NewDbContext())
        {
            before = db.TrainingAuditEvents.AsNoTracking()
                .Where(e => e.EventType == "evidence.read" && e.AggregateId == person.ToString())
                .Select(e => e.Id)
                .ToList();
        }

        var response = await client.GetAsync(Evidence(WireHostFixture.StoreA, person));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var after = _wire.NewDbContext();
        var written = after.TrainingAuditEvents.AsNoTracking()
            .Where(e => e.EventType == "evidence.read" && e.AggregateId == person.ToString())
            .ToList()
            .Where(e => !before.Contains(e.Id))
            .ToList();

        var disclosure = Assert.Single(written);
        Assert.Equal(WireHostFixture.AdminA, disclosure.ActorReference);
        Assert.Equal(WireHostFixture.StoreA, disclosure.StoreId);
    }

    // ---- The disclosure log: who has looked at one person's record -----------------------------------

    /// <summary>
    /// <b>The half of "who has looked at my record" that no service-tier test can make: the person it is
    /// about reaches it with a real token and no admin rights anywhere.</b>
    ///
    /// <para><see cref="WireHostFixture.Outsider"/> administers no store — its refusal at every other
    /// Training route is pinned above — and the world links it to
    /// <see cref="WireHostFixture.TrainingPersonRef"/>. So a 200 here can only be the SUBJECT branch, and the
    /// answer is scoped by two predicates at once. Both wrong rows are written in this same test by REAL
    /// requests, so their absence is a filter and not an unwritten row:</para>
    /// <list type="bullet">
    ///   <item><description>the same person read in ANOTHER store, by another store's admin — excluded by
    ///   the store predicate;</description></item>
    ///   <item><description>ANOTHER person read in THIS store, by a third principal — excluded by the person
    ///   predicate.</description></item>
    /// </list>
    /// <para>Each is attributed to an actor the correct rows never carry, so dropping either predicate
    /// admits a name this assertion refuses.</para>
    /// </summary>
    [Fact]
    public async Task The_person_a_record_is_about_can_see_who_read_it_and_sees_no_other_stores_or_persons()
    {
        var subject = WireHostFixture.TrainingPersonRef;

        // The right row: this person's record, read in this store.
        Assert.Equal(HttpStatusCode.OK,
            (await _wire.CreateClientAs(WireHostFixture.AdminA)
                .GetAsync(Evidence(WireHostFixture.StoreA, subject))).StatusCode);

        // Wrong store: the same person, read by the admin of a store this subject's log is not about.
        Assert.Equal(HttpStatusCode.OK,
            (await _wire.CreateClientAs(WireHostFixture.AdminB)
                .GetAsync(Evidence(WireHostFixture.StoreB, subject))).StatusCode);

        // Wrong person: this store, a different person, a third principal.
        Assert.Equal(HttpStatusCode.OK,
            (await _wire.CreateClientAs(WireHostFixture.PowerUser)
                .GetAsync(Evidence(WireHostFixture.StoreA, WireHostFixture.TrainingJourneyPersonRef))).StatusCode);

        // No personRef: the subject never names themselves, the server resolves them from the token.
        var response = await _wire.CreateClientAs(WireHostFixture.Outsider)
            .GetAsync(Disclosures(WireHostFixture.StoreA, null));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        Assert.True(root.GetProperty("readAsSubject").GetBoolean());
        Assert.Equal(subject, root.GetProperty("personRef").GetGuid());
        Assert.Equal(WireHostFixture.StoreA, root.GetProperty("storeId").GetInt32());

        var actors = root.GetProperty("disclosures").EnumerateArray()
            .Select(d => d.GetProperty("actorReference").GetString())
            .ToList();

        Assert.Contains(WireHostFixture.AdminA, actors);
        Assert.DoesNotContain(WireHostFixture.AdminB, actors);
        Assert.DoesNotContain(WireHostFixture.PowerUser, actors);

        // The flag is read out as booleans BEFORE Assert.All sees them, and the claim is scoped to the rows
        // this test causes. Both halves are load-bearing.
        //
        // Scope: an all-rows claim here is not true of this world. The collection shares one WireHostFixture,
        // TrainingPersonRef is Claimed by Outsider, and two siblings below read this same log as that subject —
        // whose disclosure-log.read rows come back with actorIsSubject TRUE. So an all-rows claim passes or
        // fails on test order. AdminA is the reader this test wrote (above) and Assert.Contains just proved is
        // present, and is never the subject; Assert.NotEmpty is because Assert.All passes over nothing.
        //
        // Materialize: a JsonElement is a cursor into `document`, and AllException keeps the failing item to
        // format in get_Message — which xunit calls while unwinding, AFTER this method's `using` has disposed
        // the document. Handing elements to Assert.All turns any failure here into ObjectDisposedException
        // inside xunit's reporting path, i.e. a dead test host and an aborted run rather than a red test.
        var readByTheStoresAdmin = root.GetProperty("disclosures").EnumerateArray()
            .Where(d => d.GetProperty("actorReference").GetString() == WireHostFixture.AdminA)
            .Select(d => d.GetProperty("actorIsSubject").GetBoolean())
            .ToList();

        Assert.NotEmpty(readByTheStoresAdmin);
        Assert.All(readByTheStoresAdmin, actorIsSubject => Assert.False(actorIsSubject));
    }

    /// <summary>
    /// The authorization matrix on one URL, in one run. The subject is admitted; a genuine store admin of
    /// ANOTHER store is refused; the subject asking about somebody ELSE is refused and gets the module's
    /// generic 403 rather than a widened self-read; and an anonymous caller never reaches the module at all.
    ///
    /// <para>The refusals are paired with the same URL answering, so none of them can be passing because the
    /// route is missing — which is the failure mode a refusal-only matrix cannot see.</para>
    /// </summary>
    [Fact]
    public async Task The_disclosure_log_admits_the_subject_and_the_stores_admin_and_nobody_else()
    {
        var subject = WireHostFixture.TrainingPersonRef;
        var url = Disclosures(WireHostFixture.StoreA, subject);

        var asSubject = await _wire.CreateClientAs(WireHostFixture.Outsider).GetAsync(url);
        var asStoreAdmin = await _wire.CreateClientAs(WireHostFixture.AdminA).GetAsync(url);
        var asForeignAdmin = await _wire.CreateClientAs(WireHostFixture.AdminB).GetAsync(url);
        var asSubjectAboutSomeoneElse = await _wire.CreateClientAs(WireHostFixture.Outsider)
            .GetAsync(Disclosures(WireHostFixture.StoreA, WireHostFixture.TrainingJourneyPersonRef));
        var anonymous = await _wire.CreateClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.OK, asSubject.StatusCode);
        Assert.Equal(HttpStatusCode.OK, asStoreAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, asForeignAdmin.StatusCode);
        Assert.Equal("training.forbidden", await CodeOf(asForeignAdmin));
        Assert.Equal(HttpStatusCode.Forbidden, asSubjectAboutSomeoneElse.StatusCode);
        Assert.Equal("training.forbidden", await CodeOf(asSubjectAboutSomeoneElse));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        // The store admin is reading somebody else's log, and the response says so rather than leaving a
        // client to infer which surface it is rendering.
        using var adminDocument = JsonDocument.Parse(await asStoreAdmin.Content.ReadAsStringAsync());
        Assert.False(adminDocument.RootElement.GetProperty("readAsSubject").GetBoolean());

        // A store the caller administers whose module was never enabled is the opaque 404, not a 403 — the
        // ordering the whole Training family is exempted on, held on the newest route too.
        var dark = await _wire.CreateClientAs(WireHostFixture.AdminA)
            .GetAsync(Disclosures(WireHostFixture.DarkStore, subject));
        Assert.Equal(HttpStatusCode.NotFound, dark.StatusCode);
        Assert.Equal("training.not-found", await CodeOf(dark));
    }

    /// <summary>
    /// <b>Reading who looked is itself looking, and the ledger says so.</b> A manager reads the subject's
    /// disclosure log; the subject then reads their own and finds that read, attributed to that manager.
    /// Without this the log would answer "who has seen my record" with a hole exactly where a curious
    /// manager stands.
    ///
    /// <para>The subject's own read is recorded too, and comes back flagged as theirs — which is what makes
    /// <c>actorIsSubject</c> a derivation rather than a constant false.</para>
    /// </summary>
    [Fact]
    public async Task Reading_the_disclosure_log_is_itself_recorded_and_the_subject_sees_who_looked()
    {
        var subject = WireHostFixture.TrainingPersonRef;

        Assert.Equal(HttpStatusCode.OK,
            (await _wire.CreateClientAs(WireHostFixture.AdminA)
                .GetAsync(Disclosures(WireHostFixture.StoreA, subject))).StatusCode);

        // The subject's FIRST read is what records the subject as a reader; the second is what shows it.
        var subjectClient = _wire.CreateClientAs(WireHostFixture.Outsider);
        Assert.Equal(HttpStatusCode.OK,
            (await subjectClient.GetAsync(Disclosures(WireHostFixture.StoreA, null))).StatusCode);

        var response = await subjectClient.GetAsync(Disclosures(WireHostFixture.StoreA, null));
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        var logReads = document.RootElement.GetProperty("disclosures").EnumerateArray()
            .Where(d => d.GetProperty("eventType").GetString() == "disclosure-log.read")
            .ToList();

        Assert.Contains(logReads, d =>
            d.GetProperty("actorReference").GetString() == WireHostFixture.AdminA
            && !d.GetProperty("actorIsSubject").GetBoolean());
        Assert.Contains(logReads, d =>
            d.GetProperty("actorReference").GetString() == WireHostFixture.Outsider
            && d.GetProperty("actorIsSubject").GetBoolean());
    }

    private static string Evidence(int storeId, Guid personRef)
        => EvidenceRoute.Replace("{storeId}", storeId.ToString()).Replace("{personRef}", personRef.ToString());

    /// <summary>
    /// The disclosure-log URL. <c>personRef</c> is omitted entirely for a self-read — the subject branch
    /// resolves the person from the token, and passing their own id would prove nothing about that.
    /// </summary>
    private static string Disclosures(int storeId, Guid? personRef)
        => "/training/stores/" + storeId + "/evidence/disclosures"
           + (personRef.HasValue ? "?personRef=" + personRef.Value : string.Empty);

    private static async Task<Guid> IdOf(HttpResponseMessage response, string property)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty(property).GetGuid();
    }

    private static async Task<string?> CodeOf(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("code").GetString();
    }

    /// <summary>The problem document minus its per-request traceId, so two answers can be compared verbatim.</summary>
    private static async Task<string> WithoutTraceId(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var builder = new StringBuilder();
        foreach (var property in document.RootElement.EnumerateObject())
        {
            if (property.NameEquals("traceId"))
            {
                continue;
            }

            builder.Append(property.Name).Append('=').Append(property.Value.ToString()).Append(';');
        }

        return builder.ToString();
    }
}
