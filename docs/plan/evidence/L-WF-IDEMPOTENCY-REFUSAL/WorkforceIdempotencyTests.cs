using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WebApi.Entities.Workforce;
using WebApi.Enums.Workforce;
using WebApi.Helpers.Workforce;
using WebApi.Services.Workforce;
using Xunit;

namespace WebApi.Tests.Workforce;

/// <summary>
/// The idempotency domain model on the SQLite fast suite (spec §3.6): replay of a stored outcome, the
/// payload-mismatch conflict, the in-flight duplicate disposition, and — the binding schema
/// consequence — the TWO-ROW shape: a reservation INSERT plus a completion INSERT, never an UPDATE
/// (proven here by the EF append-only guard rejecting a reservation-row update). The two-connection
/// same-key RACE is proven separately on SQL Server (SQLite is never accepted as concurrency evidence).
/// </summary>
public sealed class WorkforceIdempotencyTests
{
    private const string Scope = "wf.staff.create";
    private const string Actor = "staff-manager-001";

    private static WorkforceIdempotency Service(WorkforceHarness harness) =>
        new WorkforceIdempotency(harness.NewContext(), harness.Clock);

    [Fact]
    public async Task First_reservation_proceeds_then_a_same_payload_retry_replays_the_stored_outcome()
    {
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-1";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        var first = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        Assert.Equal(WorkforceIdempotencyDisposition.Proceed, first.Disposition);
        await Service(harness).CompleteAsync(first, "{\"staffMemberId\":\"abc\"}");

        // A retry with the SAME canonical payload does not re-execute — it replays the stored outcome.
        var retry = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        Assert.Equal(WorkforceIdempotencyDisposition.Replay, retry.Disposition);
        Assert.Equal("{\"staffMemberId\":\"abc\"}", retry.ReplayedOutcomePayload);
    }

    [Fact]
    public async Task Same_key_with_a_different_payload_is_a_409_mismatch_not_a_replay()
    {
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-2";
        var hashA = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");
        var hashB = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Ola\"}");

        var first = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hashA);
        Assert.Equal(WorkforceIdempotencyDisposition.Proceed, first.Disposition);

        var ex = await Assert.ThrowsAsync<WorkforceProblemException>(() =>
            Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hashB));
        Assert.Equal(WorkforceErrorCodes.IdempotencyPayloadMismatch, ex.Code);
        Assert.Equal(409, ex.StatusCode);
    }

    [Fact]
    public async Task A_reserved_but_not_completed_key_is_in_progress_on_a_same_payload_retry()
    {
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-3";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        var first = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        Assert.Equal(WorkforceIdempotencyDisposition.Proceed, first.Disposition);

        // No CompleteAsync yet: a concurrent same-payload retry sees the reservation but no outcome.
        var retry = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        Assert.Equal(WorkforceIdempotencyDisposition.InProgress, retry.Disposition);
        Assert.Null(retry.ReplayedOutcomePayload);
    }

    [Fact]
    public async Task Completion_is_a_second_insert_the_reservation_row_is_never_mutated()
    {
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-4";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        var reservation = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        await Service(harness).CompleteAsync(reservation, "OUTCOME");

        await using var read = harness.NewContext();
        var rows = await read.WorkforceIdempotencyRecords.AsNoTracking()
            .Where(r => r.Scope == Scope)
            .OrderBy(r => r.OutcomeState)
            .ToListAsync();

        // Exactly two physical rows: the reservation (client key) and the completion (derived key).
        Assert.Equal(2, rows.Count);
        var reservationRow = Assert.Single(rows, r => r.Key == key);
        var completionRow = Assert.Single(rows, r => r.Key == WorkforceIdempotency.CompletionKey(key));

        Assert.Equal("Reserved", reservationRow.OutcomeState);   // never updated to Completed
        Assert.Null(reservationRow.OutcomePayload);
        Assert.Equal("Completed", completionRow.OutcomeState);
        Assert.Equal("OUTCOME", completionRow.OutcomePayload);
        Assert.NotEqual(reservationRow.Id, completionRow.Id);
    }

    [Fact]
    public async Task The_reservation_row_is_append_only_an_update_is_rejected_at_the_ef_layer()
    {
        // This is WHY completion must be a second insert: the row cannot be mutated in place.
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-5";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");
        await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);

        await using var ctx = harness.NewContext();
        var row = await ctx.WorkforceIdempotencyRecords.SingleAsync(r => r.Scope == Scope && r.Key == key);
        row.OutcomeState = "Completed";

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => ctx.SaveChangesAsync());
        Assert.Contains("append-only", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task An_oversized_key_is_rejected_before_touching_the_store()
    {
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{}");
        var oversized = new string('k', 512);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            Service(harness).ReserveAsync(Scope, oversized, Actor, WorkforceWorld.StoreId, hash));
    }

    [Fact]
    public async Task A_key_containing_the_completion_delimiter_is_rejected()
    {
        // The completion-key convention relies on the client key being delimiter-free (U+001E).
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{}");
        var forged = "idem\u001Ekey"; // contains U+001E

        await Assert.ThrowsAsync<ArgumentException>(() =>
            Service(harness).ReserveAsync(Scope, forged, Actor, WorkforceWorld.StoreId, hash));
    }

    [Fact]
    public async Task Completing_the_same_reservation_twice_is_the_only_permitted_no_op()
    {
        // The permitted branch: the SECOND completion's unique violation is PROVABLY the completion row
        // itself, so it is an idempotent no-op — exactly one completion row remains.
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-6";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        var reservation = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        await Service(harness).CompleteAsync(reservation, "OUTCOME");
        await Service(harness).CompleteAsync(reservation, "OUTCOME"); // must NOT throw

        await using var read = harness.NewContext();
        Assert.Equal(1, await read.WorkforceIdempotencyRecords.AsNoTracking()
            .CountAsync(r => r.Key == WorkforceIdempotency.CompletionKey(key)));
    }

    [Fact]
    public async Task Complete_surfaces_a_domain_unique_violation_staged_in_the_same_transaction()
    {
        // F1: CompleteAsync's SaveChanges is W1-4's single commit for domain mutation + audit + completion.
        // A DOMAIN unique violation staged alongside the completion MUST surface — never be mistaken for a
        // duplicate completion — or the endpoint returns a false success while nothing persisted and the
        // reservation is stuck Reserved forever.
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-7";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        // A committed Proceed reservation.
        var reservation = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);

        // In ONE context: stage a genuine domain unique violation (a WorkforceStaffMember re-using the
        // seeded manager's (StoreId, StaffMemberId)) then complete — the completion is staged into the
        // same SaveChanges.
        await using var ctx = harness.NewContext();
        ctx.WorkforceStaffMembers.Add(new WorkforceStaffMember
        {
            StaffMemberId = WorkforceWorld.ManagerStaffMemberId, // duplicate PK + (StoreId, StaffMemberId) AK
            StoreId = WorkforceWorld.StoreId,
            WorkforcePersonId = WorkforceWorld.ClaimedPersonId,
            LegalEmployerId = WorkforceWorld.LegalEmployerId,
            EmployerEffectiveFromUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            CapabilityGrants = WorkforceCapability.None,
            ActiveFromUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            IsActive = true,
            CreatedAtUtc = harness.Clock.UtcNowDateTime,
        });

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            new WorkforceIdempotency(ctx, harness.Clock).CompleteAsync(reservation, "OUTCOME"));

        // The failure surfaced: nothing false-committed — reservation still Reserved, no completion row,
        // the duplicate staff did not persist.
        await using var read = harness.NewContext();
        var reservationRow = await read.WorkforceIdempotencyRecords.AsNoTracking()
            .SingleAsync(r => r.Scope == Scope && r.Key == key);
        Assert.Equal("Reserved", reservationRow.OutcomeState);
        Assert.False(await read.WorkforceIdempotencyRecords.AsNoTracking()
            .AnyAsync(r => r.Key == WorkforceIdempotency.CompletionKey(key)));
        Assert.Equal(1, await read.WorkforceStaffMembers.AsNoTracking()
            .CountAsync(s => s.StaffMemberId == WorkforceWorld.ManagerStaffMemberId));
    }

    // ---- The outcome-kind discriminator: a refusal is an outcome too ---------------------------------

    [Fact]
    public async Task A_refused_write_is_recorded_as_a_completion_and_a_same_key_retry_replays_the_refusal()
    {
        // The reservation commits in its own SaveChanges, AHEAD of the domain refusals — deliberately, so a
        // timeout after the commit replays the stored receipt instead of re-answering an opaque refusal.
        // The price of that order is this case: the write is refused with the row already committed.
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-refused-1";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        var reservation = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        Assert.Equal(WorkforceIdempotencyDisposition.Proceed, reservation.Disposition);

        await Service(harness).RefuseAsync(Scope, key, WorkforceStaffProblems.EngagementConflict("staff-holding-it"));

        var replay = await Assert.ThrowsAsync<WorkforceProblemException>(() =>
            Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash));

        // Read the ANSWER, not the status: the stable code and the 409's holder id, exactly as the first
        // caller was told — not workforce.idempotency-in-progress, which this key would answer forever.
        Assert.Equal(WorkforceStaffProblems.EngagementConflictCode, replay.Code);
        Assert.Equal("staff-holding-it", replay.Extensions["conflictingStaffMemberId"]);
        Assert.False((bool)replay.Extensions["retryable"]);
        Assert.Equal(409, replay.StatusCode);
    }

    [Fact]
    public async Task An_in_flight_duplicate_is_still_in_progress_and_only_the_recorded_refusal_moves_that_answer()
    {
        // The case the fix must NOT break. Between the reservation and any outcome, the write may still be
        // running: the retry has to be refused a fresh start, or the same write executes twice. So the ONE
        // variable that turns in-progress into a replayed refusal is the refusal being recorded.
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-refused-2";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);

        var inFlight = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        Assert.Equal(WorkforceIdempotencyDisposition.InProgress, inFlight.Disposition);

        await Service(harness).RefuseAsync(Scope, key, WorkforceProblemException.HiddenEngagementConflict());

        var afterRefusal = await Assert.ThrowsAsync<WorkforceProblemException>(() =>
            Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash));
        Assert.Equal(WorkforceErrorCodes.HiddenEngagementConflict, afterRefusal.Code);
    }

    [Fact]
    public async Task A_refusal_is_a_second_insert_carrying_the_refused_discriminator()
    {
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-refused-3";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        await Service(harness).RefuseAsync(Scope, key, WorkforceProblemException.NotFound());

        await using var read = harness.NewContext();
        var rows = await read.WorkforceIdempotencyRecords.AsNoTracking().Where(r => r.Scope == Scope).ToListAsync();

        Assert.Equal(2, rows.Count);
        var reservationRow = Assert.Single(rows, r => r.Key == key);
        var completionRow = Assert.Single(rows, r => r.Key == WorkforceIdempotency.CompletionKey(key));

        Assert.Equal("Reserved", reservationRow.OutcomeState); // append-only: never rewritten
        Assert.Equal("Refused", completionRow.OutcomeState);   // the discriminator, beside "Completed"
        Assert.Contains(WorkforceErrorCodes.NotFound, completionRow.OutcomePayload);
    }

    [Fact]
    public async Task Recording_a_refusal_never_commits_what_the_refused_write_had_already_staged()
    {
        // A refusal decided after a tracked entity was mutated is the estate's recurring shape: the
        // transaction rolls back and the in-memory graph does not. Here it would be worse than a stale
        // read — the refusal's OWN SaveChanges would commit the mutation the refusal rejected.
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-refused-4";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);

        await using var ctx = harness.NewContext();
        var staff = await ctx.WorkforceStaffMembers.SingleAsync(s => s.StaffMemberId == WorkforceWorld.ManagerStaffMemberId);
        staff.IsActive = false; // what the refused write had staged

        await new WorkforceIdempotency(ctx, harness.Clock)
            .RefuseAsync(Scope, key, WorkforceProblemException.HiddenEngagementConflict());

        await using var read = harness.NewContext();
        Assert.True((await read.WorkforceStaffMembers.AsNoTracking()
            .SingleAsync(s => s.StaffMemberId == WorkforceWorld.ManagerStaffMemberId)).IsActive);
        Assert.True(await read.WorkforceIdempotencyRecords.AsNoTracking()
            .AnyAsync(r => r.Key == WorkforceIdempotency.CompletionKey(key) && r.OutcomeState == "Refused"));
    }

    [Fact]
    public async Task A_recorded_success_is_not_overwritten_by_a_refusal_that_arrives_after_it()
    {
        // The completion row is exactly-once. Whichever outcome landed first is the answer this key has,
        // and a late refusal is a no-op rather than a rewrite of an append-only row.
        await using var harness = await WorkforceHarness.CreateSqliteAsync();
        const string key = "idem-key-refused-5";
        var hash = WorkforceIdempotency.ComputeCanonicalHash("{\"name\":\"Kari\"}");

        var reservation = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        await Service(harness).CompleteAsync(reservation, "OUTCOME");
        await Service(harness).RefuseAsync(Scope, key, WorkforceProblemException.HiddenEngagementConflict());

        var retry = await Service(harness).ReserveAsync(Scope, key, Actor, WorkforceWorld.StoreId, hash);
        Assert.Equal(WorkforceIdempotencyDisposition.Replay, retry.Disposition);
        Assert.Equal("OUTCOME", retry.ReplayedOutcomePayload);
    }

    [Fact]
    public async Task A_refusal_decided_in_front_of_the_reservation_records_nothing()
    {
        // Most refusals are replay-safe and run BEFORE reserving; those strand no key, so there is nothing
        // to record and a completion row for a key nobody holds would be a lie about a request that ran.
        await using var harness = await WorkforceHarness.CreateSqliteAsync();

        await Service(harness).RefuseAsync(Scope, "idem-key-never-reserved", WorkforceProblemException.NotFound());

        await using var read = harness.NewContext();
        Assert.Empty(await read.WorkforceIdempotencyRecords.AsNoTracking()
            .Where(r => r.Scope == Scope).ToListAsync());
    }
}
