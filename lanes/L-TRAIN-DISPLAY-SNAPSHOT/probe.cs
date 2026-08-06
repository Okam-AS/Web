// L-TRAIN-DISPLAY-SNAPSHOT probe. Drop into WebApi.Tests/Training/ and run
//   dotnet test WebApi.Tests/WebApi.Tests.csproj \
//     --filter "FullyQualifiedName~ZzDisplaySnapshotProbe&Database!=SqlServer" \
//     --logger "console;verbosity=detailed"
// It asserts nothing and is NOT committed to the suite: it exists to make the defect
// visible, and its committed successor must be the pin described in handover.md.
// Verified passing at OkamAPI-modules lane/train-disclosure 06b8b582.

using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WebApi.Enums.Workforce;
using WebApi.Models.Training;
using Xunit;
using Xunit.Abstractions;

namespace WebApi.Tests.Training;

public sealed class ZzDisplaySnapshotProbe
{
    private static readonly string[] Flags =
    {
        WebApi.Services.Training.TrainingFeatureFlags.Setup,
        WebApi.Services.Training.TrainingFeatureFlags.Assignments,
    };

    private readonly ITestOutputHelper _out;

    public ZzDisplaySnapshotProbe(ITestOutputHelper output) => _out = output;

    [Fact]
    public async Task The_pack_reprints_a_completion_under_whatever_name_the_roster_holds_today()
    {
        await using var harness = await TrainingHarness.CreateSqliteAsync();
        var kit = TrainingServiceKit.Create(harness, Flags);
        await TrainingWorld.AddPersonAsync(
            kit.Context, kit.Clock, TrainingWorld.WorkerPersonRef,
            WorkforcePersonState.Claimed, "Kari Nordmann", "app-user-worker");

        await kit.Completions.RecordCompletionAsync(kit.Manager, TrainingWorld.StoreId, TrainingServiceKit.NewKey(),
            new RecordTrainingCompletionRequest
            {
                PersonRef = TrainingWorld.WorkerPersonRef,
                CourseVersionId = TrainingWorld.PublishedVersionId,
                ScorePercent = 90m,
            });

        var before = await TrainingEvidencePackAssembler.BuildAsync(kit, TrainingWorld.StoreId, TrainingWorld.WorkerPersonRef);
        _out.WriteLine("--- AT WRITE TIME ---");
        _out.WriteLine(before.Render());

        // The roster moves underneath the record: a marriage, a legal name change, a corrected spelling.
        var person = await kit.Context.WorkforcePersons.SingleAsync(p => p.WorkforcePersonId == TrainingWorld.WorkerPersonRef);
        person.DisplayName = "Kari Hansen";
        await kit.Context.SaveChangesAsync();

        var after = await TrainingEvidencePackAssembler.BuildAsync(kit, TrainingWorld.StoreId, TrainingWorld.WorkerPersonRef);
        _out.WriteLine("--- AFTER THE ROSTER CHANGED ---");
        _out.WriteLine(after.Render());

        _out.WriteLine("completions unchanged: " + (before.Completions.Count == after.Completions.Count));
        _out.WriteLine("displayName before=" + before.DisplayName + " after=" + after.DisplayName);
    }

    [Fact]
    public async Task An_archived_person_still_resolves_so_leaving_does_not_break_the_name_today()
    {
        await using var harness = await TrainingHarness.CreateSqliteAsync();
        var kit = TrainingServiceKit.Create(harness, Flags);
        await TrainingWorld.AddPersonAsync(
            kit.Context, kit.Clock, TrainingWorld.WorkerPersonRef,
            WorkforcePersonState.Claimed, "Kari Nordmann", "app-user-worker");

        await kit.Completions.RecordCompletionAsync(kit.Manager, TrainingWorld.StoreId, TrainingServiceKit.NewKey(),
            new RecordTrainingCompletionRequest
            {
                PersonRef = TrainingWorld.WorkerPersonRef,
                CourseVersionId = TrainingWorld.PublishedVersionId,
                ScorePercent = 90m,
            });

        var person = await kit.Context.WorkforcePersons.SingleAsync(p => p.WorkforcePersonId == TrainingWorld.WorkerPersonRef);
        person.State = WorkforcePersonState.Archived;
        await kit.Context.SaveChangesAsync();

        var archived = await TrainingEvidencePackAssembler.BuildAsync(kit, TrainingWorld.StoreId, TrainingWorld.WorkerPersonRef);
        _out.WriteLine("archived displayName=" + (archived.DisplayName ?? "<null>") + " personOnFile=" + archived.PersonOnFile);

        // And if the row were ever removed (no production path does this today), what the pack says instead:
        kit.Context.WorkforcePersons.Remove(person);
        await kit.Context.SaveChangesAsync();
        var removed = await TrainingEvidencePackAssembler.BuildAsync(kit, TrainingWorld.StoreId, TrainingWorld.WorkerPersonRef);
        _out.WriteLine("removed displayName=" + (removed.DisplayName ?? "<null>") + " personOnFile=" + removed.PersonOnFile);
        _out.WriteLine("removed completions still present: " + removed.Completions.Count);
        _out.WriteLine(removed.Render());
    }
}
