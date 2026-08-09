using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WebApi.Entities.Growth;
using WebApi.Enums.Growth;
using WebApi.Services.Growth;
using Xunit;

namespace WebApi.Tests.Wire;

/// <summary>
/// What a REAL Postmark event does to a delivery, driven through the real route.
///
/// <para><b>Why this suite exists.</b> D-MAIL ruled Postmark, and Postmark's payloads share no field name
/// with the envelope this module was built against — a genuine delivery is
/// <c>{"RecordType":"Delivery","MessageID":…}</c>, not <c>{"type":"delivered","providerMessageId":…}</c>.
/// Every existing webhook pin sends the canonical envelope, so all of them would stay green with the ruled
/// provider unable to move a single delivery. The bodies below are Postmark's own documented payloads,
/// verbatim down to the fields this module never reads, with only the ids repointed at a seeded subject.</para>
///
/// <para><b>What these facts do NOT prove: authentication.</b> Postmark does not sign its webhooks at all,
/// and <c>D-GROWTH-EVENTS</c> owns what replaces the signature. Until it is ruled, the credential here is
/// today's timestamp-bound HMAC, applied at the single <see cref="AuthenticatedAs"/> seam — a stand-in, and
/// the one thing on this page that is not yet true of a live Postmark server. Read every 202 below as "this
/// payload, once authenticated, does X"; read nothing as "Postmark can authenticate". The two facts that
/// keep the two halves apart are <see cref="A_genuine_postmark_payload_without_a_credential_is_refused_and_writes_nothing"/>
/// — the mapping opened no unauthenticated door — and
/// <see cref="The_postmark_shape_is_read_only_for_a_postmark_account"/>, which pins that a
/// signature-verifying provider on the canonical envelope is exactly as strict as it was.</para>
/// </summary>
[Collection(WireCollection.Name)]
public class GrowthPostmarkWebhookWireTests
{
    /// <summary>The provider key that selects the Postmark reader — the value an operator provisions.</summary>
    private const string PostmarkProviderKey = "postmark";

    private const string PostmarkSecretRef = "wire-postmark";
    private const string PostmarkSecret = "wire-postmark-secret-do-not-ship";

    /// <summary>A second account, same store, whose provider is NOT Postmark — the scoping cross-check.</summary>
    private const string OtherProviderKey = "wire-postmark-other-provider";

    private const string OtherSecretRef = "wire-postmark-other";
    private const string OtherSecret = "wire-postmark-other-secret-do-not-ship";

    private const string SignatureHeader = "X-Growth-Signature";
    private const string TimestampHeader = "X-Growth-Timestamp";

    /// <summary>Unique per call, so no two events in this suite can dedupe against each other.</summary>
    private static long _nextPostmarkId = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000;

    private readonly WireHostFixture _wire;

    public GrowthPostmarkWebhookWireTests(WireHostFixture wire) => _wire = wire;

    // ---- delivery truth ------------------------------------------------------------------------------

    [Fact]
    public async Task A_genuine_postmark_delivery_payload_moves_the_delivery_to_delivered_and_counts_it_once()
    {
        await EnsurePostmarkAccountAsync();
        var target = await SeedDeliveryAsync();
        var body = PostmarkDelivery(target.ProviderMessageId);

        var first = await PostAsync(body, PostmarkSecret);
        Assert.Equal(HttpStatusCode.Accepted, first.StatusCode);

        await using (var db = _wire.NewDbContext())
        {
            var delivery = await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId);

            // The whole point of the lane: ProviderAccepted is what the dispatcher wrote, and only a provider
            // event can turn it into a delivery anybody may report as delivered (GRW-TRUTH-001).
            Assert.Equal(GrowthDeliveryStatus.Delivered, delivery.Status);

            var run = await db.GrowthDispatchRuns.AsNoTracking().SingleAsync(r => r.Id == target.DispatchRunId);
            Assert.Equal(1, run.DeliveredCount);

            var receipt = await db.GrowthProviderEventReceipts.AsNoTracking()
                .SingleAsync(r => r.ProviderEventId == "postmark:delivery:" + target.ProviderMessageId);
            Assert.Equal(GrowthProviderEventType.Delivered, receipt.EventType);
            Assert.True(receipt.SignatureVerified);

            // Postmark's delivery payload carries the recipient address in the clear. The receipt keeps a
            // hash of the bytes and nothing else (GRW-PII-001), so the address must not be findable in it.
            Assert.DoesNotContain(target.RawAddress, receipt.PayloadHash);
            Assert.DoesNotContain("john@example.com", receipt.PayloadHash);
        }

        // Postmark redelivers when it does not see the acknowledgement. Byte-identical, freshly credentialed
        // — one event, applied once. A second DeliveredCount here would inflate every run's delivery rate.
        var redelivered = await PostAsync(body, PostmarkSecret);
        Assert.Equal(HttpStatusCode.Accepted, redelivered.StatusCode);

        await using (var db = _wire.NewDbContext())
        {
            Assert.Equal(1, await db.GrowthProviderEventReceipts
                .CountAsync(r => r.ProviderEventId == "postmark:delivery:" + target.ProviderMessageId));
            var run = await db.GrowthDispatchRuns.AsNoTracking().SingleAsync(r => r.Id == target.DispatchRunId);
            Assert.Equal(1, run.DeliveredCount);
        }
    }

    // ---- the address is dead --------------------------------------------------------------------------

    [Fact]
    public async Task A_genuine_postmark_hard_bounce_fails_the_delivery_and_suppresses_the_guest_channel_globally()
    {
        await EnsurePostmarkAccountAsync();
        var target = await SeedDeliveryAsync();
        var bounceId = NextId();

        var response = await PostAsync(
            PostmarkBounce(target.ProviderMessageId, bounceId, "HardBounce", 1, "Hard bounce", inactive: true),
            PostmarkSecret);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        await using var db = _wire.NewDbContext();

        var delivery = await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId);
        Assert.Equal(GrowthDeliveryStatus.Bounced, delivery.Status);

        var suppression = await db.GrowthSuppressions.AsNoTracking()
            .SingleAsync(s => s.ContactPointId == target.ContactPointId);
        Assert.Equal(GrowthSuppressionReason.HardBounce, suppression.Reason);

        // Channel-global, not store-scoped: a dead mailbox is dead for every store on the channel, and a
        // StoreId here would leave the same address mailed forever by every other venue.
        Assert.Equal(GrowthSuppressionScope.ChannelGlobal, suppression.Scope);
        Assert.Null(suppression.StoreId);

        var receipt = await db.GrowthProviderEventReceipts.AsNoTracking()
            .SingleAsync(r => r.ProviderEventId == "postmark:bounce:" + bounceId);
        Assert.Equal(GrowthProviderEventType.Bounced, receipt.EventType);
    }

    [Fact]
    public async Task A_genuine_postmark_spam_complaint_marks_the_delivery_complained_and_suppresses_channel_globally()
    {
        await EnsurePostmarkAccountAsync();
        var target = await SeedDeliveryAsync();
        var complaintId = NextId();

        var response = await PostAsync(PostmarkSpamComplaint(target.ProviderMessageId, complaintId), PostmarkSecret);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        await using var db = _wire.NewDbContext();

        Assert.Equal(GrowthDeliveryStatus.Complained,
            (await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId)).Status);

        var suppression = await db.GrowthSuppressions.AsNoTracking()
            .SingleAsync(s => s.ContactPointId == target.ContactPointId);
        Assert.Equal(GrowthSuppressionReason.Complaint, suppression.Reason);
        Assert.Equal(GrowthSuppressionScope.ChannelGlobal, suppression.Scope);

        Assert.Equal(GrowthProviderEventType.Complained,
            (await db.GrowthProviderEventReceipts.AsNoTracking()
                .SingleAsync(r => r.ProviderEventId == "postmark:complaint:" + complaintId)).EventType);
    }

    // ---- the address is not dead ----------------------------------------------------------------------

    [Fact]
    public async Task A_postmark_soft_bounce_defers_the_delivery_and_silences_nobody()
    {
        await EnsurePostmarkAccountAsync();
        var target = await SeedDeliveryAsync();

        // A full mailbox, a greylisting server, an ISP deferral. Postmark reports it as a "bounce" and it is
        // NOT a property of the address — treating it as one would stop a real person receiving mail they
        // asked for, from every store on the channel, because their inbox was full on a Tuesday.
        var deferred = await PostAsync(
            PostmarkBounce(target.ProviderMessageId, NextId(), "SoftBounce", 4096, "Soft bounce", inactive: false),
            PostmarkSecret);
        Assert.Equal(HttpStatusCode.Accepted, deferred.StatusCode);

        await using (var db = _wire.NewDbContext())
        {
            Assert.Equal(GrowthDeliveryStatus.Deferred,
                (await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId)).Status);
            Assert.Equal(0, await db.GrowthSuppressions.CountAsync(s => s.ContactPointId == target.ContactPointId));
        }

        // The positive control that makes the zero above a CLASSIFICATION rather than a suppression path
        // that never fires: same subject, same account, same credential, a hard bounce instead.
        var hard = await PostAsync(
            PostmarkBounce(target.ProviderMessageId, NextId(), "HardBounce", 1, "Hard bounce", inactive: true),
            PostmarkSecret);
        Assert.Equal(HttpStatusCode.Accepted, hard.StatusCode);

        await using (var db = _wire.NewDbContext())
        {
            Assert.Equal(1, await db.GrowthSuppressions.CountAsync(s => s.ContactPointId == target.ContactPointId));
        }
    }

    [Fact]
    public async Task An_auto_responder_bounce_is_acknowledged_and_moves_nothing()
    {
        await EnsurePostmarkAccountAsync();
        var target = await SeedDeliveryAsync();
        var bounceId = NextId();

        // Postmark files an out-of-office reply as a bounce of type AutoResponder — for a message that WAS
        // delivered. Deferring it would report a delivered mail as undelivered, so an unclassified bounce
        // moves nothing at all rather than guessing.
        var response = await PostAsync(
            PostmarkBounce(target.ProviderMessageId, bounceId, "AutoResponder", 64, "Auto responder", inactive: false),
            PostmarkSecret);

        // 202, not 400: Postmark redelivers a 4xx, and an event whose correct effect is none must not become
        // an indefinite retry loop against the inbox.
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        await using var db = _wire.NewDbContext();
        Assert.Equal(GrowthDeliveryStatus.ProviderAccepted,
            (await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId)).Status);
        Assert.Equal(0, await db.GrowthSuppressions.CountAsync(s => s.ContactPointId == target.ContactPointId));
        Assert.Equal(0, await db.GrowthProviderEventReceipts.CountAsync(r => r.ProviderEventId == "postmark:bounce:" + bounceId));
    }

    // ---- subscription changes -------------------------------------------------------------------------

    [Fact]
    public async Task Only_a_subscription_change_the_recipient_originated_suppresses_anyone()
    {
        await EnsurePostmarkAccountAsync();
        var target = await SeedDeliveryAsync();

        // A reactivation. Acting on it would suppress the guest who just came back.
        var reactivation = await PostAsync(
            PostmarkSubscriptionChange(target.ProviderMessageId, "2020-02-01T10:53:34.416071Z",
                origin: "Recipient", suppressSending: false, suppressionReason: null),
            PostmarkSecret);

        // The echo of a hard bounce. Postmark sends BOTH a Bounce webhook and this, for one event; acting on
        // both writes two suppression rows a later lift or erasure then has to find all of.
        var echo = await PostAsync(
            PostmarkSubscriptionChange(target.ProviderMessageId, "2020-02-01T11:53:34.416071Z",
                origin: "Recipient", suppressSending: true, suppressionReason: "HardBounce"),
            PostmarkSecret);

        Assert.Equal(HttpStatusCode.Accepted, reactivation.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, echo.StatusCode);

        await using (var db = _wire.NewDbContext())
        {
            Assert.Equal(0, await db.GrowthSuppressions.CountAsync(s => s.ContactPointId == target.ContactPointId));
            Assert.Equal(GrowthDeliveryStatus.ProviderAccepted,
                (await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId)).Status);
        }

        // The one change no other webhook reports: the recipient themselves asked to stop.
        const string changedAt = "2020-02-01T12:53:34.416071Z";
        var withdrawal = await PostAsync(
            PostmarkSubscriptionChange(target.ProviderMessageId, changedAt,
                origin: "Recipient", suppressSending: true, suppressionReason: "ManualSuppression"),
            PostmarkSecret);
        Assert.Equal(HttpStatusCode.Accepted, withdrawal.StatusCode);

        await using (var db = _wire.NewDbContext())
        {
            var suppression = await db.GrowthSuppressions.AsNoTracking()
                .SingleAsync(s => s.ContactPointId == target.ContactPointId);
            Assert.Equal(GrowthSuppressionReason.Unsubscribe, suppression.Reason);

            // An unsubscribe suppresses the address; the message itself WAS delivered, so the delivery row
            // is not a failure and must not be rewritten as one.
            Assert.Equal(GrowthDeliveryStatus.ProviderAccepted,
                (await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId)).Status);

            Assert.Equal(1, await db.GrowthProviderEventReceipts.CountAsync(
                r => r.ProviderEventId == "postmark:subscription:" + target.ProviderMessageId + ":" + changedAt));
        }

    }

    // ---- the credential is still the credential -------------------------------------------------------

    [Fact]
    public async Task A_genuine_postmark_payload_without_a_credential_is_refused_and_writes_nothing()
    {
        await EnsurePostmarkAccountAsync();
        var target = await SeedDeliveryAsync();
        var bounceId = NextId();
        var body = PostmarkBounce(target.ProviderMessageId, bounceId, "HardBounce", 1, "Hard bounce", inactive: true);

        // No credential at all — the shape a live Postmark server would actually send today, since Postmark
        // signs nothing. This 401 IS the frozen-at-zero state, and it stays until D-GROWTH-EVENTS is ruled.
        var uncredentialed = await _wire.CreateClient().PostAsync(Path(), new ByteArrayContent(body));

        // A guess at the credential.
        var guessed = await PostAsync(body, "a-guess-at-the-postmark-secret");

        Assert.Equal(HttpStatusCode.Unauthorized, uncredentialed.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, guessed.StatusCode);
        Assert.Equal("growth.webhook_unverified", await ErrorCodeAsync(uncredentialed));

        await using (var db = _wire.NewDbContext())
        {
            Assert.Equal(0, await db.GrowthProviderEventReceipts.CountAsync(r => r.ProviderEventId == "postmark:bounce:" + bounceId));
            Assert.Equal(0, await db.GrowthSuppressions.CountAsync(s => s.ContactPointId == target.ContactPointId));
            Assert.Equal(GrowthDeliveryStatus.ProviderAccepted,
                (await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId)).Status);
        }

        // The positive control: byte-for-byte the same payload with the account's real credential lands.
        // Without it the two refusals above are equally well explained by a payload nothing ever accepts.
        Assert.Equal(HttpStatusCode.Accepted, (await PostAsync(body, PostmarkSecret)).StatusCode);
        await using (var db = _wire.NewDbContext())
        {
            Assert.Equal(1, await db.GrowthProviderEventReceipts.CountAsync(r => r.ProviderEventId == "postmark:bounce:" + bounceId));
        }
    }

    [Fact]
    public async Task The_postmark_shape_is_read_only_for_a_postmark_account()
    {
        await EnsurePostmarkAccountAsync();
        await EnsureAccountAsync(OtherProviderKey, OtherSecretRef, OtherSecret);
        var target = await SeedDeliveryAsync();

        // A genuine Postmark delivery, impeccably credentialed — for an account whose provider is not
        // Postmark. It is refused as unparseable, because which parser runs is decided by the account the
        // credential resolved to and never by the bytes or the route segment.
        var wrongProvider = await _wire.CreateClient().SendAsync(AuthenticatedAs(
            "/v1/growth/providers/" + OtherProviderKey + "/events",
            PostmarkDelivery(target.ProviderMessageId),
            OtherSecret));

        Assert.Equal(HttpStatusCode.BadRequest, wrongProvider.StatusCode);
        Assert.Equal("growth.webhook_malformed", await ErrorCodeAsync(wrongProvider));

        // …and the converse: the module's canonical envelope, which every other webhook pin sends, is not
        // silently accepted by a Postmark account. Postmark does not send it, so anything that does is not
        // Postmark.
        var canonical = Encoding.UTF8.GetBytes(
            "{\"providerEventId\":\"wire-postmark-canonical-" + Guid.NewGuid().ToString("N")
            + "\",\"type\":\"delivered\",\"providerMessageId\":\"" + target.ProviderMessageId + "\"}");
        var canonicalResponse = await PostAsync(canonical, PostmarkSecret);

        Assert.Equal(HttpStatusCode.BadRequest, canonicalResponse.StatusCode);
        Assert.Equal("growth.webhook_malformed", await ErrorCodeAsync(canonicalResponse));

        await using var db = _wire.NewDbContext();
        Assert.Equal(GrowthDeliveryStatus.ProviderAccepted,
            (await db.GrowthDeliveries.AsNoTracking().SingleAsync(d => d.Id == target.DeliveryId)).Status);
    }

    // ---- Postmark's own payloads ----------------------------------------------------------------------
    //
    // Verbatim from Postmark's webhook documentation, including the fields this module never reads — the
    // recipient address, the subject and the content dump are present precisely because a mapper that
    // survives only a trimmed body proves nothing about the one a live server sends. Only the ids are
    // repointed at the seeded subject.

    private static byte[] PostmarkDelivery(string messageId) => Utf8($$"""
        {
            "MessageID": "{{messageId}}",
            "Recipient": "john@example.com",
            "DeliveredAt": "2019-11-05T16:33:54.9070259Z",
            "Details": "Test delivery webhook details",
            "Tag": "welcome-email",
            "ServerID": 23,
            "Metadata": { "a_key": "a_value", "b_key": "b_value" },
            "RecordType": "Delivery",
            "MessageStream": "outbound"
        }
        """);

    private static byte[] PostmarkBounce(string messageId, long id, string type, int typeCode, string name, bool inactive) => Utf8($$"""
        {
          "RecordType": "Bounce",
          "MessageStream": "outbound",
          "ID": {{id}},
          "Type": "{{type}}",
          "TypeCode": {{typeCode}},
          "Name": "{{name}}",
          "Tag": "Test",
          "MessageID": "{{messageId}}",
          "Metadata": { "a_key": "a_value", "b_key": "b_value" },
          "ServerID": 23,
          "Description": "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
          "Details": "Test bounce details",
          "Email": "john@example.com",
          "From": "sender@example.com",
          "BouncedAt": "2019-11-05T16:33:54.9070259Z",
          "DumpAvailable": true,
          "Inactive": {{(inactive ? "true" : "false")}},
          "CanActivate": true,
          "Subject": "Test subject",
          "Content": "<Full dump of bounce>"
        }
        """);

    private static byte[] PostmarkSpamComplaint(string messageId, long id) => Utf8($$"""
        {
          "RecordType": "SpamComplaint",
          "MessageStream": "outbound",
          "ID": {{id}},
          "Type": "SpamComplaint",
          "TypeCode": 512,
          "Name": "Spam complaint",
          "Tag": "Test",
          "MessageID": "{{messageId}}",
          "Metadata": { "a_key": "a_value", "b_key": "b_value" },
          "ServerID": 1234,
          "Description": "",
          "Details": "Test spam complaint details",
          "Email": "john@example.com",
          "From": "sender@example.com",
          "BouncedAt": "2019-11-05T16:33:54.9070259Z",
          "DumpAvailable": true,
          "Inactive": true,
          "CanActivate": false,
          "Subject": "Test subject",
          "Content": "<Abuse report dump>"
        }
        """);

    private static byte[] PostmarkSubscriptionChange(
        string messageId, string changedAt, string origin, bool suppressSending, string suppressionReason) => Utf8($$"""
        {
          "RecordType": "SubscriptionChange",
          "MessageID": "{{messageId}}",
          "ServerID": 123456,
          "MessageStream": "outbound",
          "ChangedAt": "{{changedAt}}",
          "Recipient": "bounced-address@wildbit.com",
          "Origin": "{{origin}}",
          "SuppressSending": {{(suppressSending ? "true" : "false")}},
          "SuppressionReason": {{(suppressionReason == null ? "null" : "\"" + suppressionReason + "\"")}},
          "Tag": "my-tag",
          "Metadata": { "example": "value", "example_2": "value" }
        }
        """);

    private static byte[] Utf8(string json) => Encoding.UTF8.GetBytes(json);

    // ---- the authentication seam ----------------------------------------------------------------------

    /// <summary>
    /// A request that authenticates as the account holding <paramref name="credential"/>.
    ///
    /// <para><b>This is the one place the MECHANISM lives</b> — the same seam
    /// <c>GrowthWebhookAuthWireTests</c> keeps, for the same reason. Today it is the timestamp-bound
    /// HMAC-SHA256 the endpoint requires, which a live Postmark server cannot produce; when
    /// <c>D-GROWTH-EVENTS</c> names what replaces it, this method changes and every fact above keeps meaning
    /// what it says, because none of them asserts anything about HMAC.</para>
    /// </summary>
    private HttpRequestMessage AuthenticatedAs(string path, byte[] body, string credential)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

        var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = new ByteArrayContent(body) };
        request.Headers.Add(SignatureHeader, GrowthWebhookSignature.Compute(timestamp, body, credential ?? string.Empty));
        request.Headers.Add(TimestampHeader, timestamp);
        return request;
    }

    // ---- world ----------------------------------------------------------------------------------------

    private static string Path() => "/v1/growth/providers/" + PostmarkProviderKey + "/events";

    private Task<HttpResponseMessage> PostAsync(byte[] body, string credential)
        => _wire.CreateClient().SendAsync(AuthenticatedAs(Path(), body, credential));

    private Task EnsurePostmarkAccountAsync() => EnsureAccountAsync(PostmarkProviderKey, PostmarkSecretRef, PostmarkSecret);

    private async Task EnsureAccountAsync(string providerKey, string secretRef, string secret)
    {
        _wire.ProvisionGrowthWebhookSecret(secretRef, secret);

        await using var db = _wire.NewDbContext();
        if (await db.GrowthProviderAccounts.AnyAsync(a => a.ProviderKey == providerKey && a.StoreId == WireHostFixture.StoreA))
        {
            return;
        }

        db.GrowthProviderAccounts.Add(new GrowthProviderAccount
        {
            ProviderKey = providerKey,
            StoreId = WireHostFixture.StoreA,
            SendingDomain = "mail.wire-postmark.invalid",
            WebhookSecretRef = secretRef,
            Paused = false,
            CreatedAt = new DateTimeOffset(2026, 7, 1, 0, 0, 0, TimeSpan.Zero),
        });
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// A live delivery whose provider message id is shaped the way Postmark's is — the GUID it returns from
    /// <c>POST /email</c> and quotes back in every webhook about that message.
    /// </summary>
    private Task<GrowthWireDelivery> SeedDeliveryAsync()
        => GrowthWireSeed.DeliveryAsync(
            _wire, WireHostFixture.StoreA, Guid.NewGuid().ToString("D"), provenance: "wire-postmark");

    private static long NextId() => Interlocked.Increment(ref _nextPostmarkId);

    private static async Task<string> ErrorCodeAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("error").GetProperty("code").GetString();
    }
}
