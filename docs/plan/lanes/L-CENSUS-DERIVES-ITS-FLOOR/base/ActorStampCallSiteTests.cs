using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using WebApi.Controllers;
using WebApi.Services.Platform.FeatureFlags;
using WebApi.Entities.Platform;
using WebApi.Models.Platform;
using WebApi.Services.Interfaces;
using WebApi.Services.Platform.FeatureFlags;
using Xunit;

namespace WebApi.Tests.Auth;

/// <summary>
/// <see cref="StoreFeatureFlagsController"/> stamps the operator who flipped a flag. It used to resolve that
/// operator with a chain of its own — <c>NameIdentifier → Identity.Name → unique_name</c> — which is
/// <see cref="WebApi.Helpers.ActorClaims"/>'s order with <c>nameid</c> DELETED from it.
///
/// <para><b>Why deduping it was safe here and is not safe everywhere.</b> The stamp lands in
/// <c>StoreFeatureFlag.UpdatedByReference</c>, a column that is written, read back for display, and nothing
/// else: no comparison, no <c>Where</c>, no branch, no idempotency key, no concurrency token (the entity's
/// only unique index is <c>(StoreId, FlagKey)</c>). Authorization is decided one line earlier and
/// independently by <see cref="IStoreAdminAccess"/>. So resolving MORE principal shapes here changes who is
/// recorded, never who is admitted — the distinction <c>ActorClaims</c>' own summary warns is the trap.</para>
///
/// <para>These probes drive the REAL action rather than the private helper, so what is asserted is the value
/// that actually reaches the store.</para>
/// </summary>
public class ActorStampCallSiteTests
{
    private const string UserId = "stamp-call-site-user";
    private const string FlagKey = "Test.Flag";

    /// <summary>
    /// The gap the dedupe closes. <c>nameid</c> is the pre-mapping wire name for the subject claim; it is
    /// what a principal carries the moment anyone sets <c>MapInboundClaims = false</c>, and the old chain
    /// skipped straight past it to "unknown".
    /// </summary>
    [Fact]
    public async Task A_nameid_only_principal_is_stamped_as_the_user_id()
    {
        Assert.Equal(UserId, await StampedBy(Principal(new Claim("nameid", UserId))));
    }

    /// <summary>
    /// The ordering guard, and the reason a Name-first resolver would have been a data-corruption bug rather
    /// than a style choice: the OAuth login principal (<c>OAuthLoginController.cs:128-129</c>) puts the user
    /// id in <see cref="ClaimTypes.NameIdentifier"/> and the user's PHONE NUMBER in
    /// <see cref="ClaimTypes.Name"/>. Stamping that principal must record the id, never the phone number.
    /// </summary>
    [Fact]
    public async Task The_oauth_login_principal_shape_stamps_the_user_id_not_the_phone_number()
    {
        const string phoneNumber = "+4790000000";

        var stamped = await StampedBy(Principal(
            new Claim(ClaimTypes.NameIdentifier, UserId),
            new Claim(ClaimTypes.Name, phoneNumber)));

        Assert.Equal(UserId, stamped);
        Assert.NotEqual(phoneNumber, stamped);
    }

    /// <summary>
    /// The shape the fleet actually carries, minted and validated through the production code path rather
    /// than hand-built: <c>unique_name</c> mapped inbound to <see cref="ClaimTypes.Name"/>.
    /// </summary>
    [Fact]
    public async Task A_real_application_token_principal_stamps_the_user_id()
    {
        Assert.Equal(UserId, await StampedBy(await RealTokenPrincipal.ForAsync(UserId)));
    }

    /// <summary>
    /// The sentinel is preserved. The old chain ended in <c>?? "unknown"</c>; a naive swap to
    /// <c>ActorClaims</c> alone would have written NULL and left the row unattributed instead.
    /// </summary>
    [Fact]
    public async Task A_principal_carrying_no_identity_at_all_still_stamps_unknown()
    {
        Assert.Equal("unknown", await StampedBy(new ClaimsPrincipal(new ClaimsIdentity())));
    }

    /// <summary>
    /// A strict improvement the shared resolver brings for free: it rejects BLANK, not merely null. The old
    /// <c>??</c> chain would have stamped an empty string from a malformed principal and stopped looking.
    /// </summary>
    [Fact]
    public async Task A_blank_leading_claim_falls_through_to_the_next_source()
    {
        var stamped = await StampedBy(Principal(
            new Claim(ClaimTypes.NameIdentifier, "   "),
            new Claim("unique_name", UserId)));

        Assert.Equal(UserId, stamped);
    }

    // ---- the call site, driven for real -------------------------------------------------------------

    /// <summary>Runs the real PUT action and returns the reference that reached <see cref="IFeatureFlagStore"/>.</summary>
    private static async Task<string> StampedBy(ClaimsPrincipal principal)
    {
        var store = new CapturingStore();
        var controller = new StoreFeatureFlagsController(
            store,
            new SingleFlagCatalog(),
            new AlwaysAdmin(),
            // This test asserts WHICH actor reached the flag store, never what `effective` resolves to,
            // so no resolver is the truthful argument here rather than a stub that would imply one.
            Array.Empty<IStoreFeatureFlagEffectiveResolver>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal },
            },
        };

        var response = await controller.Set(
            storeId: 1,
            request: new SetStoreFeatureFlagRequest { FlagKey = FlagKey, Enabled = true },
            ct: CancellationToken.None);

        // The write must actually have happened, or "the reference was X" proves nothing.
        Assert.IsType<OkObjectResult>(response.Result);
        Assert.True(store.Wrote, "SetAsync was never reached, so no stamp was produced.");

        return store.UpdatedByReference;
    }

    private static ClaimsPrincipal Principal(params Claim[] claims)
        => new ClaimsPrincipal(new ClaimsIdentity(claims, "ActorStampCallSiteTests"));

    private sealed class CapturingStore : IFeatureFlagStore
    {
        public bool Wrote { get; private set; }
        public string UpdatedByReference { get; private set; }

        public Task<StoreFeatureFlag> SetAsync(int storeId, string flagKey, bool enabled, string updatedByReference, string note, CancellationToken ct = default)
        {
            Wrote = true;
            UpdatedByReference = updatedByReference;
            return Task.FromResult(new StoreFeatureFlag
            {
                StoreId = storeId,
                FlagKey = flagKey,
                Enabled = enabled,
                UpdatedByReference = updatedByReference,
                Note = note,
            });
        }

        public Task<bool?> GetOverrideAsync(int storeId, string flagKey, CancellationToken ct = default) => throw new NotSupportedException();
        public bool? GetOverride(int storeId, string flagKey) => throw new NotSupportedException();
        public Task<bool> ClearAsync(int storeId, string flagKey, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<IReadOnlyList<StoreFeatureFlag>> ListAsync(int storeId, CancellationToken ct = default) => throw new NotSupportedException();
    }

    private sealed class SingleFlagCatalog : IFeatureFlagCatalog
    {
        private static readonly FeatureFlagDescriptor Descriptor =
            new FeatureFlagDescriptor(FlagKey, "Test", "Test flag", defaultEnabled: false);

        public IReadOnlyList<FeatureFlagDescriptor> All => new[] { Descriptor };

        public bool TryGet(string flagKey, out FeatureFlagDescriptor descriptor)
        {
            descriptor = flagKey == FlagKey ? Descriptor : null;
            return descriptor != null;
        }
    }

    /// <summary>
    /// Admits everyone, deliberately: these probes are about what gets STAMPED. Whether the caller is
    /// admitted is <see cref="IStoreAdminAccess"/>'s question and is asked before the stamp is computed.
    /// </summary>
    private sealed class AlwaysAdmin : IStoreAdminAccess
    {
        public Task<bool> IsStoreAdminAsync(ClaimsPrincipal user, int storeId) => Task.FromResult(true);
    }
}
