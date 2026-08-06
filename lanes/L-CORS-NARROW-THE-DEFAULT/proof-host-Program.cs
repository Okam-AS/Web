// Proof host for L-CORS-NARROW-THE-DEFAULT. NOT part of the deliverable diff.
//
// The real Program.Main cannot boot on this machine: it seeds a power user against SQL Server before
// app.Run(), and this lane has no SQL slot. So this host boots the parts the proof is about and nothing
// else - and every part it boots is the REAL code from the worktree:
//
//   * WebApi.Helpers.ServiceCollectionExtensions.AddOkamCors  (the production registration)
//   * the worktree's own appsettings.json / appsettings.Development.json, loaded from the API's content
//     root, so the allowlist under test is the file in the diff and not a copy
//   * the same middleware ordering the API has: UseRouting -> UseCors -> authentication -> endpoints,
//     which is what puts the CORS headers on a 401 as well as on a 200
//
// The endpoints stand in for the three credential-bearing shapes the deployed API exposes. They are
// deliberately dumb: the point of the probe is which CORS headers come back, and CORS is stamped by the
// pipeline before any of them runs.

using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Options;
using WebApi.Helpers;

const string ApiContentRoot = "/Users/svendaneel/okam/OkamAPI-corsnarrow";

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = ApiContentRoot,
    EnvironmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"
});

builder.Services.AddOkamCors(builder.Configuration, builder.Environment);
builder.Services.AddRouting();

var app = builder.Build();

var corsOptions = app.Services.GetRequiredService<IOptions<CorsOptions>>().Value;
var defaultPolicy = corsOptions.GetPolicy(corsOptions.DefaultPolicyName);
Console.WriteLine($"[proof] environment      : {app.Environment.EnvironmentName}");
Console.WriteLine($"[proof] content root     : {app.Environment.ContentRootPath}");
Console.WriteLine($"[proof] AllowAnyOrigin   : {defaultPolicy!.AllowAnyOrigin}");
Console.WriteLine($"[proof] SupportsCreds    : {defaultPolicy.SupportsCredentials}");
Console.WriteLine($"[proof] resolved origins : {string.Join(", ", defaultPolicy.Origins)}");

app.UseRouting();
app.UseCors();

// Stands in for UseAuthentication/UseAuthorization: everything that needs a credential answers 401 when
// the credential is absent. It sits AFTER UseCors, exactly as in Program.cs, which is the ordering that
// makes the deployed API stamp access-control-allow-origin on a 401.
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? string.Empty;
    var needsBearer = path.StartsWith("/api/Store", StringComparison.OrdinalIgnoreCase)
                      || path.StartsWith("/User", StringComparison.OrdinalIgnoreCase);
    var needsOkamApiKey = path.Contains("/orders", StringComparison.OrdinalIgnoreCase);
    var needsExternalKey = path.StartsWith("/api/external/menu", StringComparison.OrdinalIgnoreCase);

    var unauthenticated =
        (needsBearer && !context.Request.Headers.ContainsKey("Authorization"))
        || (needsOkamApiKey && !context.Request.Headers.ContainsKey("X-Okam-ApiKey"))
        || (needsExternalKey && !context.Request.Headers.ContainsKey("X-API-Key"));

    if (unauthenticated)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        if (needsBearer)
        {
            context.Response.Headers.WWWAuthenticate = "Bearer";
        }
        return;
    }

    await next();
});

app.MapGet("/health", () => "Healthy");
app.MapGet("/Stores", () => Results.Json(new { stores = Array.Empty<string>() }));
app.MapGet("/Stores/{storeId:int}/orders", (int storeId) => Results.Json(new { storeId, orders = Array.Empty<string>() }));
app.MapGet("/api/external/menu/{storeId:int}", (int storeId) => Results.Json(new { storeId, menu = Array.Empty<string>() }));
app.MapMethods("/api/Store", new[] { "PUT" }, () => Results.Json(new { ok = true }));
app.MapGet("/User", () => Results.Json(new { user = "someone" }));

app.Run();
