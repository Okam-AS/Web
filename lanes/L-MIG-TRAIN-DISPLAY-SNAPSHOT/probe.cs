using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using WebApi.Enums.Workforce;
using WebApi.Helpers.Training;
using WebApi.Models.Training;
using WebApi.Services.Training;
using Xunit;

namespace WebApi.Tests.Training;

/// <summary>
/// PROBE ONLY - not a shipped pin. Executes the L-MIG-TRAIN-DISPLAY-SNAPSHOT finding independently of the
/// prior lane's report: write a completion under one roster name, rename the roster, re-read the SAME
/// evidence pack, and diff the two documents field by field.
/// </summary>
public sealed class ZzProbeDisplaySnapshotTests
{
    private static readonly string[] Flags = { TrainingFeatureFlags.Setup, TrainingFeatureFlags.Assignments };

    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    [Fact]
    public async Task Probe_rename_the_roster_and_reprint_the_pack()
    {
        await using var harness = await TrainingHarness.CreateSqliteAsync();
        var kit = TrainingServiceKit.Create(harness, Flags);
        var person = Guid.Parse("d1500000-0000-0000-0000-000000000001");

        // 1. The person exists as "Kari Nordmann" and a completion is written under that name.
        await TrainingWorld.AddPersonAsync(kit.Context, kit.Clock, person,
            WorkforcePersonState.Claimed, "Kari Nordmann");

        await kit.Completions.RecordCompletionAsync(kit.Manager, TrainingWorld.StoreId,
            TrainingServiceKit.NewKey(),
            new RecordTrainingCompletionRequest
            {
                PersonRef = person,
                CourseVersionId = TrainingWorld.PublishedVersionId,
                ScorePercent = 90m,
            });

        await kit.Certificates.RegisterCertificateAsync(kit.Manager, TrainingWorld.StoreId,
            TrainingServiceKit.NewKey(),
            new RegisterTrainingCertificateRequest
            {
                PersonRef = person,
                Type = "food-hygiene",
                Issuer = "Mattilsynet",
                IssueDateUtc = new DateTime(2025, 1, 2, 0, 0, 0, DateTimeKind.Utc),
                ExpiryDateUtc = kit.Clock.UtcNowDateTime.AddYears(1),
            });

        var before = await kit.Evidence.GetEvidenceAsync(kit.Manager, TrainingWorld.StoreId, person);

        // 2. The roster is edited. Nothing in Training is touched.
        await TrainingWorld.AddPersonAsync(kit.Context, kit.Clock, person,
            WorkforcePersonState.Claimed, "Kari Hansen");

        // 3. The SAME pack is re-read.
        var after = await kit.Evidence.GetEvidenceAsync(kit.Manager, TrainingWorld.StoreId, person);

        var beforeJson = JsonSerializer.Serialize(before, Json);
        var afterJson = JsonSerializer.Serialize(after, Json);

        var report = new StringWriter();
        report.WriteLine("PROBE: L-MIG-TRAIN-DISPLAY-SNAPSHOT (independent re-execution)");
        report.WriteLine("base: lane/mig-train-display-snapshot @ 32c56fa4 (off lane/mig-company-receivable)");
        report.WriteLine("tier: SQLite, container-free");
        report.WriteLine();
        report.WriteLine("subject line BEFORE rename : " + before.DisplayName);
        report.WriteLine("subject line AFTER  rename : " + after.DisplayName);
        report.WriteLine("completions before/after   : " + before.Completions.Count + "/" + after.Completions.Count);
        report.WriteLine("certificates before/after  : " + before.Certificates.Count + "/" + after.Certificates.Count);
        report.WriteLine("audit rows before/after    : " + before.AuditChain.Count + "/" + after.AuditChain.Count);
        report.WriteLine();

        // Blank the subject line on both and compare the REST of the document.
        var beforeBlanked = beforeJson.Replace("Kari Nordmann", "<SUBJECT>", StringComparison.Ordinal);
        var afterBlanked = afterJson.Replace("Kari Hansen", "<SUBJECT>", StringComparison.Ordinal);

        report.WriteLine("documents identical apart from the subject line: "
            + string.Equals(beforeBlanked, afterBlanked, StringComparison.Ordinal));
        report.WriteLine("the string 'Kari Nordmann' survives anywhere in the reprint: "
            + afterJson.Contains("Kari Nordmann", StringComparison.Ordinal));
        report.WriteLine();
        report.WriteLine("---- reprinted pack AFTER the rename ----");
        report.WriteLine(afterJson);

        var path = Path.Combine(Path.GetTempPath(), "L-MIG-TRAIN-DISPLAY-SNAPSHOT-probe.txt");
        File.WriteAllText(path, report.ToString());

        // The claims, asserted.
        Assert.Equal("Kari Nordmann", before.DisplayName);
        Assert.Equal("Kari Hansen", after.DisplayName);          // the pack renamed itself
        Assert.Equal(beforeBlanked, afterBlanked);               // nothing else moved
        Assert.DoesNotContain("Kari Nordmann", afterJson, StringComparison.Ordinal); // the old name is GONE
    }
}
