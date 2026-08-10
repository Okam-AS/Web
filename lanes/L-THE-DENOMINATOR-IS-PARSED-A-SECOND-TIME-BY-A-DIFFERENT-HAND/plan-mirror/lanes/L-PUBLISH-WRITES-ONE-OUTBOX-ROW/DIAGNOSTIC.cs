using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Xunit.Abstractions;

namespace WebApi.Tests.Workforce;

/// <summary>
/// TEMPORARY LANE DIAGNOSTIC — not to be committed to a shared branch.
///
/// A byte-for-byte transliteration of the arrange half of
/// <c>SchedulePublishSqlServerTests.Publish_commits_publication_recipients_inbox_outbox_and_audit_atomically</c>
/// with <c>SeededSqlServerAsync</c> swapped for <c>SeededSqliteAsync</c>. Both harness factories seed the
/// SAME <see cref="WorkforceWorld"/>, so the only difference between this and the SQL-tier test is the
/// provider. It prints every outbox row the publish wrote, so the question "duplicate, or differently-shaped
/// sibling?" is answered off the rows rather than off the code.
/// </summary>
public sealed class LanePublishOutboxShapeDiagnostic
{
    private static readonly Guid Worker = WorkforceWorld.WorkerStaffMemberId;
    private static readonly Guid Waiter = WorkforceWorld.WaiterRoleId;
    private const string Scheduler = WorkforceStaffTestSeed.SchedulerUserId;
    private const string Manager = WorkforceStaffTestSeed.FullManagerUserId;

    private readonly ITestOutputHelper _out;

    public LanePublishOutboxShapeDiagnostic(ITestOutputHelper output) => _out = output;

    [Fact]
    public async Task Dump_every_outbox_row_one_publish_writes()
    {
        await using var harness = await WorkforceScheduleFixture.SeededSqliteAsync();

        var draft = await WorkforceScheduleFixture.CreateDraftAsync(harness, Scheduler, "draft-1");
        await WorkforceScheduleFixture.BatchAsync(harness, Scheduler, draft.ScheduleRevisionId, draft.ETag, "b1",
            WorkforceScheduleFixture.Shift(Worker, Waiter, 0, 8, 16, unpaidBreak: 30));
        await WorkforceScheduleFixture.ValidateAsync(harness, Scheduler, draft.ScheduleRevisionId, "v1");

        var publication = await WorkforceScheduleFixture.PublishAsync(harness, Manager, draft.ScheduleRevisionId, "p1");

        await using var read = harness.NewContext();

        var person = await read.WorkforcePersons.SingleAsync(p => p.WorkforcePersonId == WorkforceWorld.InvitedPersonId);
        _out.WriteLine("RECIPIENT PERSON  login=" + (person.ApplicationUserId ?? "<null>")
            + "  email=" + (person.ContactEmail ?? "<null>")
            + "  phone=" + (person.ContactPhone ?? "<null>")
            + "  state=" + person.State);

        _out.WriteLine("PUBLICATION       id=" + publication.SchedulePublicationId
            + "  publishedBy=" + publication.PublishedByActorReference
            + "  recipients=" + await read.WorkforceSchedulePublicationRecipients.CountAsync(r => r.SchedulePublicationId == publication.SchedulePublicationId)
            + "  inboxItems=" + await read.WorkforceInboxItems.CountAsync(i => i.SchedulePublicationId == publication.SchedulePublicationId));

        var rows = await read.WorkforceNotificationOutbox
            .Where(o => o.StoreId == WorkforceWorld.StoreId)
            .OrderBy(o => o.Channel)
            .ToListAsync();

        foreach (var r in rows)
        {
            _out.WriteLine("OUTBOX ROW        channel=" + r.Channel
                + "  target=" + r.TargetReference
                + "  dedupeKey=" + r.LogicalDedupeKey
                + "  status=" + r.Status
                + "  payloadLen=" + (r.PayloadJson == null ? 0 : r.PayloadJson.Length));
        }

        _out.WriteLine("PAYLOADS IDENTICAL ACROSS ROWS = "
            + (rows.Select(r => r.PayloadJson).Distinct().Count() == 1));
        _out.WriteLine("DEDUPE KEYS DISTINCT           = "
            + (rows.Select(r => r.LogicalDedupeKey).Distinct().Count() == rows.Count));
        _out.WriteLine("SAMPLE PAYLOAD                 = " + rows.Select(r => r.PayloadJson).FirstOrDefault());

        // ---- THE PROPOSED ASSERTION, verbatim as it would read in SchedulePublishSqlServerTests --------
        // ONE recipient and ONE inbox item, but ONE OUTBOX COMMAND PER CHANNEL that can reach that worker
        // (WorkforceNotificationChannelPlan, landed 2026-08-01 in f5305ced): the in-app inbox always, plus
        // their single external tier. The seeded worker is invited-not-claimed and has a contact e-mail, so
        // that tier is Email. Asserting the exact channel SET rather than a count is what makes this red
        // both when a channel is dropped and when one is added, and name which.
        var outbox = await read.WorkforceNotificationOutbox.Where(o => o.StoreId == WorkforceWorld.StoreId).ToListAsync();
        Assert.Equal(
            new[] { WebApi.Enums.Workforce.WorkforceNotificationChannel.InApp, WebApi.Enums.Workforce.WorkforceNotificationChannel.Email },
            outbox.Select(o => o.Channel).OrderBy(c => c).ToArray());
        Assert.Equal(
            (await read.WorkforcePersons.SingleAsync(p => p.WorkforcePersonId == WorkforceWorld.InvitedPersonId)).ContactEmail,
            outbox.Single(o => o.Channel == WebApi.Enums.Workforce.WorkforceNotificationChannel.Email).TargetReference);
        Assert.Equal(outbox.Count, outbox.Select(o => o.LogicalDedupeKey).Distinct().Count());
    }
}
