using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WebApi.Entities.Workforce;
using WebApi.Enums.Workforce;
using WebApi.Helpers.Workforce;
using WebApi.Services.Workforce;
using Xunit;

namespace WebApi.Tests.Wire;

/// <summary>
/// What the register is TOLD, driven over HTTP through the real pipeline.
///
/// <para>Every punch outcome answers 200, because raw truth is never rejected (§3.4) — so the wire body is
/// the only place a refusal can be told apart from an accepted punch, and until this suite it could not be.
/// A clock-out that closed nothing and a cross-employer punch both reported <c>sessionState: "Open"</c>: the
/// state was computed from whether SOME timestamp was present, and an attendance exception carries the
/// timestamp of a session that is not this engagement's. A screen reading that congratulated a worker at the
/// moment their day stopped being recordable.</para>
///
/// <para><b>Each assertion here is a CONTRAST inside one world.</b> The refusal is always posted through the
/// same route, on the same register, in the same test as a punch that genuinely worked — an assertion in a
/// world that cannot produce the other outcome proves nothing about the difference between them.</para>
///
/// <para><b>Why the wire and not the service tier.</b> Three of the four facts are decisions the DTO mapping
/// makes about a domain result (<c>PosClockEventResponse.From</c>) and one is an endpoint that must exist,
/// route, authenticate off the operator session, pass the module gate and serialize — none of which a direct
/// service call exercises. The store is device-authoritative here: there is no route storeId at all, so the
/// operator session seam is load-bearing for every request below.</para>
/// </summary>
[Collection(WireCollection.Name)]
public class WorkforcePosClockWireTests
{
    private readonly WireHostFixture _wire;

    public WorkforcePosClockWireTests(WireHostFixture wire) => _wire = wire;

    /// <summary>
    /// A punch date no other suite in this collection asserts about. The wire world is shared and its tests
    /// run in no defined order, so the sessions this suite opens must not land on the business day
    /// <c>WorkforceWireTests</c> proves the labour band is unanswerable for (2026-07-07).
    /// </summary>
    private static DateTime PunchAt(int hour, int minute = 0) => new(2026, 6, 15, hour, minute, 0, DateTimeKind.Unspecified);

    // ---- 1. A clock-out that closed nothing --------------------------------------------------------------

    [Fact]
    public async Task A_clock_out_that_closed_nothing_does_not_answer_what_a_real_clock_out_answers()
    {
        var client = Register();

        await WithClockWriteEnabled(async () =>
        {
            await EnsureClockedOutAsync(client);

            var opened = await Punch(client, WorkforceClockEventType.ClockIn, "wire-clock-miss-in", PunchAt(9));
            var closed = await Punch(client, WorkforceClockEventType.ClockOut, "wire-clock-miss-out", PunchAt(17));
            var closedNothing = await Punch(client, WorkforceClockEventType.ClockOut, "wire-clock-miss-orphan", PunchAt(18));

            // The three are all 200 — that is the point. The status cannot separate them.
            Assert.Equal(HttpStatusCode.OK, opened.Status);
            Assert.Equal(HttpStatusCode.OK, closed.Status);
            Assert.Equal(HttpStatusCode.OK, closedNothing.Status);

            Assert.Equal("SessionClosed", closed.String("outcome"));
            Assert.Equal("Closed", closed.String("sessionState"));
            Assert.NotNull(closed.Time("closedUtc"));

            // The punch that closed nothing: it must not report the state of the punch that did, nor the
            // state of the clock-in before it.
            Assert.Equal("MissingPunchException", closedNothing.String("outcome"));
            Assert.Equal("None", closedNothing.String("sessionState"));
            Assert.Null(closedNothing.Time("closedUtc"));
            Assert.Equal(JsonValueKind.Null, closedNothing.Kind("clockSessionId"));

            Assert.NotEqual(opened.String("sessionState"), closedNothing.String("sessionState"));
            Assert.NotEqual(closed.String("sessionState"), closedNothing.String("sessionState"));

            // The raw punch was still stored: the register is told nothing was closed, not that nothing
            // happened, and the attendance read is where the missing clock-in surfaces (§3.4).
            using var context = _wire.NewDbContext();
            Assert.Single(context.WorkforceClockEvents.Where(e => e.ClientEventId == "wire-clock-miss-orphan"));
        });
    }

    // ---- 2. A cross-employer refusal ---------------------------------------------------------------------

    [Fact]
    public async Task A_cross_employer_refusal_is_not_a_clean_clock_in_wearing_another_employers_timestamp()
    {
        var client = Register();
        var blocking = await OpenASessionUnderAnotherEmployerAsync();

        try
        {
            await WithClockWriteEnabled(async () =>
            {
                await EnsureClockedOutAsync(client);

                // The blocking session is only made visible to the fold for the refused punch; the clean
                // punch beside it is taken with the same body shape on the same register.
                await CloseAsync(blocking.SessionId);
                var accepted = await Punch(client, WorkforceClockEventType.ClockIn, "wire-clock-xeng-clean", PunchAt(8));
                await Punch(client, WorkforceClockEventType.ClockOut, "wire-clock-xeng-clean-out", PunchAt(8, 30));

                await ReopenAsync(blocking.SessionId);
                var refused = await Punch(client, WorkforceClockEventType.ClockIn, "wire-clock-xeng", PunchAt(9));

                Assert.Equal(HttpStatusCode.OK, accepted.Status);
                Assert.Equal("SessionOpened", accepted.String("outcome"));
                Assert.Equal("Open", accepted.String("sessionState"));
                Assert.NotEqual(JsonValueKind.Null, accepted.Kind("clockSessionId"));

                // The refusal is also a 200 and also names a session — the OTHER legal employer's. Before
                // this lane it arrived as sessionState Open with that session's openedUtc in the field a
                // clean clock-in uses, which is indistinguishable from having been clocked in.
                Assert.Equal(HttpStatusCode.OK, refused.Status);
                Assert.Equal("CrossEngagementException", refused.String("outcome"));
                Assert.Equal("None", refused.String("sessionState"));
                Assert.Equal(JsonValueKind.Null, refused.Kind("clockSessionId"));
                Assert.Null(refused.Time("openedUtc"));

                // The blocking instant is still told, under a name that says whose it is.
                Assert.Equal(blocking.OpenedUtc, refused.Time("blockingSessionOpenedUtc"));
                Assert.Null(accepted.Time("blockingSessionOpenedUtc"));

                Assert.NotEqual(accepted.String("sessionState"), refused.String("sessionState"));

                // No second canonical session was opened for the person (§3.7) — the refusal is real.
                using var context = _wire.NewDbContext();
                Assert.Equal(1, await context.WorkforceClockSessions
                    .CountAsync(s => s.WorkforcePersonId == blocking.PersonId && s.ClosedUtc == null));
            });
        }
        finally
        {
            await CloseAsync(blocking.SessionId);
        }
    }

    // ---- 3. An already-open session ----------------------------------------------------------------------

    [Fact]
    public async Task The_already_open_refusal_names_the_instant_the_accepted_punch_reported()
    {
        var client = Register();

        await WithClockWriteEnabled(async () =>
        {
            try
            {
                await EnsureClockedOutAsync(client);

                var accepted = await Punch(client, WorkforceClockEventType.ClockIn, "wire-clock-open-1", PunchAt(9));
                var refused = await Punch(client, WorkforceClockEventType.ClockIn, "wire-clock-open-2", PunchAt(11));

                Assert.Equal(HttpStatusCode.OK, accepted.Status);
                Assert.Equal("Open", accepted.String("sessionState"));

                Assert.Equal(HttpStatusCode.Conflict, refused.Status);
                Assert.Equal("application/problem+json", refused.ContentType);
                Assert.Equal(WorkforceErrorCodes.OpenSessionExists, refused.String("code"));

                // The whole point of the field: the worker who forgot to clock out is told WHEN, and the
                // instant is the same one the punch that opened the session answered with. A refusal that
                // named some other time would be worse than none.
                Assert.Equal(accepted.Time("openedUtc"), refused.Time("openedUtc"));
                Assert.NotNull(refused.Time("openedUtc"));

                // …and it says it is UTC. The accepted punch's instant is folded in memory and the refusal's
                // is read back out of the database, where both providers hand back an Unspecified kind — so
                // this pair used to serialize the SAME instant as "…07:00:00Z" and "…07:00:00", and a client
                // reading the second as local time is two hours out in Oslo summer, on a payroll instant.
                Assert.EndsWith("Z", accepted.String("openedUtc"), StringComparison.Ordinal);
                Assert.EndsWith("Z", refused.String("openedUtc"), StringComparison.Ordinal);

                // The second punch is retained as raw truth even though the fold refused it.
                using var context = _wire.NewDbContext();
                Assert.Single(context.WorkforceClockEvents.Where(e => e.ClientEventId == "wire-clock-open-2"));
            }
            finally
            {
                await EnsureClockedOutAsync(client);
            }
        });
    }

    // ---- 4. The clock-state read -------------------------------------------------------------------------

    [Fact]
    public async Task The_register_can_ask_whether_this_operator_is_clocked_in_and_the_answer_moves()
    {
        var client = Register();

        await WithClockWriteEnabled(async () =>
        {
            try
            {
                await EnsureClockedOutAsync(client);

                var before = await ClockState(client);
                var punch = await Punch(client, WorkforceClockEventType.ClockIn, "wire-clock-state-in", PunchAt(9));
                var during = await ClockState(client);
                await Punch(client, WorkforceClockEventType.ClockOut, "wire-clock-state-out", PunchAt(17));
                var after = await ClockState(client);

                Assert.Equal(HttpStatusCode.OK, before.Status);
                Assert.False(before.Bool("clockedIn"));
                Assert.Equal(JsonValueKind.Null, before.Kind("openedUtc"));

                Assert.True(during.Bool("clockedIn"));
                Assert.Equal(punch.Time("openedUtc"), during.Time("openedUtc"));
                Assert.Equal(punch.String("clockSessionId"), during.String("clockSessionId"));

                // Not a constant: the same read answers differently either side of the punch.
                Assert.False(after.Bool("clockedIn"));

                // C4: the engagement is resolved from the operator link, never from a name. The personalliste
                // beside this read carries names and no staff id at all, so matching by name was the only
                // other way to answer — and it is a guess about whose pay the next punch lands on.
                Assert.Equal(WireHostFixture.AdminAStaffMemberId.ToString(), during.String("staffMemberId"));
            }
            finally
            {
                await EnsureClockedOutAsync(client);
            }
        });
    }

    [Fact]
    public async Task The_clock_state_read_survives_the_kill_switch_that_stops_the_punch_beside_it()
    {
        // The wire world's workforce.clock is DEFAULT-OFF and no override is written here, so this is the
        // read-only mode a store is actually in when clocking is paused — the moment a worker most needs to
        // be told what state the server believes they are in.
        var client = Register();

        var write = await Punch(client, WorkforceClockEventType.ClockIn, "wire-clock-state-dark", PunchAt(9));
        var read = await ClockState(client);

        Assert.Equal(HttpStatusCode.Conflict, write.Status);
        Assert.Equal(WorkforceErrorCodes.FlagDisabledReadOnly, write.String("code"));

        Assert.Equal(HttpStatusCode.OK, read.Status);
        Assert.Equal("application/json", read.ContentType);
    }

    /// <summary>
    /// Contrast on one route: the same GET with the header the surface identifies the register by, without
    /// it, and with no bearer at all. An open read here would disclose one worker's attendance to any device
    /// bearer, and a read that answered the same to all three would identify nobody.
    ///
    /// <para><b>The middle answer is 401, and that is a measured fact, not the documented one.</b>
    /// <c>WorkforcePosController</c> declares that a missing/invalid operator session becomes the typed 403
    /// <c>workforce.pos-operator-session-invalid</c>, and it catches <c>AppException</c> to do it — but the
    /// platform's real <c>OperatorSessionResolver</c> throws <c>OperatorSessionException</c>, which is
    /// deliberately NOT an <c>AppException</c> and is mapped to 401 by
    /// <c>OperatorSessionExceptionMiddleware</c> before any workforce code runs. So that 403 code is
    /// unreachable on this surface, on BOTH its endpoints. The service-tier suite does not see it because
    /// <c>FakeOperatorSessionResolver</c> throws the exception type the controller catches rather than the
    /// one the platform throws. Pinned as it behaves; whether the surface should own that refusal is a
    /// contract decision, recorded in the lane return rather than taken here.</para>
    /// </summary>
    [Fact]
    public async Task The_clock_state_read_answers_only_an_operator_session_it_can_resolve()
    {
        var identified = await ClockState(Register());
        var noOperatorSession = await ClockState(_wire.CreateClientAs(WireHostFixture.AdminA));
        var noBearer = await ClockState(_wire.CreateClient());

        Assert.Equal(HttpStatusCode.OK, identified.Status);

        Assert.Equal(HttpStatusCode.Unauthorized, noOperatorSession.Status);
        Assert.Equal(HttpStatusCode.Unauthorized, noBearer.Status);

        // The two 401s are not the same answer: the operator-session one carries the middleware's message so
        // a register can tell "PIN in again" from "this device's token is dead", which is the whole reason
        // that middleware exists. Neither carries the workforce problem shape.
        Assert.NotNull(noOperatorSession.String("message"));
        Assert.Null(noOperatorSession.String("code"));
        Assert.Null(noBearer.String("message"));
    }

    // ---- the register, and the two calls it makes --------------------------------------------------------

    private HttpClient Register()
    {
        var client = _wire.CreateClientAs(WireHostFixture.AdminA);
        client.DefaultRequestHeaders.Add(
            WireHostFixture.OperatorSessionHeader, WireHostFixture.PosOperatorSessionId.ToString());
        return client;
    }

    private static async Task<WireBody> Punch(
        HttpClient client, WorkforceClockEventType type, string clientEventId, DateTime localTime)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/workforce/pos/clock-events")
        {
            Content = new StringContent(
                "{\"eventType\":\"" + type + "\",\"clientEventId\":\"" + clientEventId
                + "\",\"localEventTime\":\"" + localTime.ToString("yyyy-MM-ddTHH:mm:ss")
                + "\",\"verification\":\"wire\"}",
                Encoding.UTF8,
                "application/json"),
        };
        request.Headers.Add("Idempotency-Key", clientEventId);

        return await WireBody.Of(await client.SendAsync(request));
    }

    private static async Task<WireBody> ClockState(HttpClient client)
        => await WireBody.Of(await client.GetAsync("/workforce/pos/clock-state"));

    /// <summary>
    /// Drives a clock-out so the register's engagement holds no open session, whatever an earlier test in
    /// this shared world left behind. A clock-out with nothing open is a missing-punch exception, which is a
    /// no-op for session state — so this reaches the same postcondition from either starting point.
    /// </summary>
    private static async Task EnsureClockedOutAsync(HttpClient client)
        => await Punch(client, WorkforceClockEventType.ClockOut, "wire-clock-reset-" + Guid.NewGuid(), PunchAt(23, 59));

    // ---- the workforce.clock lever, restored whatever happens --------------------------------------------

    private async Task WithClockWriteEnabled(Func<Task> body)
    {
        var operatorClient = _wire.CreateClientAs(WireHostFixture.AdminA);

        var written = await operatorClient.PutAsync(
            "/stores/" + WireHostFixture.StoreA + "/feature-flags",
            new StringContent(
                "{\"flagKey\":\"" + WorkforceFeatureFlags.Clock + "\",\"enabled\":true,\"note\":\"wire clock lane\"}",
                Encoding.UTF8,
                "application/json"));
        Assert.Equal(HttpStatusCode.OK, written.StatusCode);

        try
        {
            await body();
        }
        finally
        {
            // Back to the deny-closed default: another suite in this collection asserts the clock write is
            // dark, and a leaked override would make that assertion pass or fail on test order.
            var cleared = await operatorClient.DeleteAsync(
                "/stores/" + WireHostFixture.StoreA + "/feature-flags?flagKey=" + WorkforceFeatureFlags.Clock);
            Assert.Equal(HttpStatusCode.OK, cleared.StatusCode);
        }
    }

    // ---- the second legal employer the cross-engagement refusal needs ------------------------------------

    private sealed class BlockingSession
    {
        public Guid SessionId { get; set; }
        public Guid PersonId { get; set; }
        public DateTime OpenedUtc { get; set; }
    }

    /// <summary>
    /// A second engagement for the SAME person under a SECOND legal employer, with an open session on it.
    /// <para>
    /// It is seeded rather than punched in because the POS route resolves ONE engagement — the operator's
    /// link — and there is no API by which a register can clock a person in under an employer it is not
    /// signed in for. The seeded engagement therefore carries NO OperatorId: giving it one would make the
    /// resolver's answer depend on row order, and every assertion in this file about "the register's
    /// engagement" would stop being about a known engagement.
    /// </para>
    /// </summary>
    private async Task<BlockingSession> OpenASessionUnderAnotherEmployerAsync()
    {
        using var context = _wire.NewDbContext();

        var registerEngagement = await context.WorkforceStaffMembers.AsNoTracking()
            .SingleAsync(s => s.StaffMemberId == WireHostFixture.AdminAStaffMemberId);

        var employerId = Guid.Parse("7a11e000-0000-0000-0000-0000000000e2");
        var staffMemberId = Guid.Parse("7a11e000-0000-0000-0000-0000000000e3");
        var sessionId = Guid.Parse("7a11e000-0000-0000-0000-0000000000e4");
        var openedUtc = new DateTime(2026, 6, 15, 5, 0, 0, DateTimeKind.Utc);
        var now = DateTime.UtcNow;

        var existing = await context.WorkforceClockSessions.FirstOrDefaultAsync(s => s.ClockSessionId == sessionId);
        if (existing == null)
        {
            context.WorkforceLegalEmployers.Add(new WorkforceLegalEmployer
            {
                LegalEmployerId = employerId,
                OrganizationNumber = "998877665",
                Name = "Wire Second Employer AS",
                EffectiveFromUtc = now,
                CreatedAtUtc = now,
            });

            context.WorkforceStaffMembers.Add(new WorkforceStaffMember
            {
                StaffMemberId = staffMemberId,
                StoreId = WireHostFixture.StoreA,
                WorkforcePersonId = registerEngagement.WorkforcePersonId,
                LegalEmployerId = employerId,
                EmployerEffectiveFromUtc = now,
                EmploymentNumber = "WIRE-A2",
                CapabilityGrants = WorkforceCapability.WorkforceSelf,
                ActiveFromUtc = now,
                IsActive = true,
                CreatedAtUtc = now,
            });

            context.WorkforceClockSessions.Add(new WorkforceClockSession
            {
                ClockSessionId = sessionId,
                StoreId = WireHostFixture.StoreA,
                StaffMemberId = staffMemberId,
                WorkforcePersonId = registerEngagement.WorkforcePersonId,
                LegalEmployerId = employerId,
                OpenedUtc = openedUtc,
                ClosedUtc = null,
                OpenClockEventId = Guid.Parse("7a11e000-0000-0000-0000-0000000000e5"),
                CreatedAtUtc = now,
            });

            await context.SaveChangesAsync();
        }

        return new BlockingSession
        {
            SessionId = sessionId,
            PersonId = registerEngagement.WorkforcePersonId,
            OpenedUtc = openedUtc,
        };
    }

    /// <summary>
    /// Closes / reopens the seeded blocking session. The session projection is mutable by design (a
    /// clock-out closes it in place); the raw events and the attendance exception the refusal appended are
    /// never touched.
    /// </summary>
    private async Task CloseAsync(Guid sessionId) => await SetClosedAsync(sessionId, new DateTime(2026, 6, 15, 6, 0, 0, DateTimeKind.Utc));

    private async Task ReopenAsync(Guid sessionId) => await SetClosedAsync(sessionId, null);

    private async Task SetClosedAsync(Guid sessionId, DateTime? closedUtc)
    {
        using var context = _wire.NewDbContext();
        var session = await context.WorkforceClockSessions.SingleAsync(s => s.ClockSessionId == sessionId);
        session.ClosedUtc = closedUtc;
        await context.SaveChangesAsync();
    }

    // ---- reading a response without holding a disposed document -----------------------------------------

    /// <summary>
    /// A response's status, content type and parsed body. <see cref="JsonDocument"/> invalidates every
    /// element it owns on dispose, so the body is materialized into plain values here rather than handed out
    /// as elements (the same hazard <c>WorkforceWireTests.ModuleFlagStateAsync</c> clones around).
    /// </summary>
    private sealed class WireBody
    {
        private readonly Dictionary<string, JsonElement> _members = new(StringComparer.Ordinal);

        public HttpStatusCode Status { get; private set; }
        public string ContentType { get; private set; }

        public static async Task<WireBody> Of(HttpResponseMessage response)
        {
            var body = new WireBody
            {
                Status = response.StatusCode,
                ContentType = response.Content.Headers.ContentType?.MediaType,
            };

            var text = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrWhiteSpace(text))
            {
                using var document = JsonDocument.Parse(text);
                foreach (var member in document.RootElement.EnumerateObject())
                {
                    body._members[member.Name] = member.Value.Clone();
                }
            }

            return body;
        }

        public JsonValueKind Kind(string name)
            => _members.TryGetValue(name, out var value) ? value.ValueKind : JsonValueKind.Undefined;

        public string String(string name)
            => _members.TryGetValue(name, out var value) && value.ValueKind == JsonValueKind.String
                ? value.GetString()
                : null;

        public bool Bool(string name)
            => _members.TryGetValue(name, out var value) && value.ValueKind == JsonValueKind.True;

        /// <summary>
        /// A timestamp member as an instant. Compared as a <see cref="DateTime"/> rather than as text on
        /// purpose: a value the server folded in memory serializes with its UTC designator, and the same
        /// instant read back out of the database does not (both providers hand back
        /// <see cref="DateTimeKind.Unspecified"/>), so a string comparison would fail on a difference that
        /// is not about the instant. <see cref="DateTime"/> equality compares ticks and ignores kind.
        /// </summary>
        public DateTime? Time(string name)
            => _members.TryGetValue(name, out var value) && value.ValueKind == JsonValueKind.String
                ? value.GetDateTime()
                : (DateTime?)null;
    }
}
