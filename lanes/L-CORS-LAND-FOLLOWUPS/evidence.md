# L-CORS-LAND-FOLLOWUPS — evidence

Remedy for `F-PROD-CORS-WILDCARD`. `lane/cors-followups` rebased onto the integration tip with
`BrowserReadableHeaders.All` preserved, proven by a wire assertion over emitted headers.

## Refs

| | |
|---|---|
| repo | `/Users/svendaneel/okam/OkamAPI-corscred` (worktree of `lane/cors-followups`) |
| integration tip | `8e2b57de` |
| lane tip BEFORE rebase | `524289b9` (forked at `35696d6b`) |
| lane tip AFTER rebase | `17c12c20` |
| `git merge-base lane/cors-followups 8e2b57de` | `8e2b57de` — i.e. the lane now sits directly on the tip |
| pre-rebase safety ref | `refs/backup/cors-followups-prerebase` → `524289b9` |

Two commits replayed (the intermediate merge `edbb7dea` flattened as expected):
`3c71b323` "The preference centre is allowed to carry the credential it was built around",
`17c12c20` "Keep the loopback origins out of every environment that is not Development".

Nothing pushed. Working tree clean. No container used. Host `dotnet 8.0.110` (per `global.json`).

## The hazard, and why it was worse than the brief predicted

The brief expected a `Program.cs` conflict whose naive resolution re-breaks download filenames.
The conflict did occur — but **`Helpers/ServiceCollectionExtensions.cs` auto-merged with NO conflict**,
silently carrying the lane's hardcoded `WithExposedHeaders("ETag")` on top of a tip that exposes
`BrowserReadableHeaders.All`.

That is the sharper finding: **a reviewer who inspected only the conflicts would never have seen the
regression.** The `Program.cs` conflict is a decoy — the damage lands in the file that merged cleanly.

Ported fix (`Helpers/ServiceCollectionExtensions.cs:77`):

```csharp
policy.AllowAnyOrigin()
      .AllowAnyMethod()
      .AllowAnyHeader().WithExposedHeaders(BrowserReadableHeaders.All);
```

A doc `<para>` was added at the same site recording why the set is READ from the constant and never
spelled as a literal. The only `"ETag"` string left in the file is inside that comment.

## Wire proof — emitted headers, not code that mentions them

Tier: `dotnet test --filter "Database!=SqlServer&(FullyQualifiedName~DownloadHeaderWire|FullyQualifiedName~PdfDownloadWire|FullyQualifiedName~Cors)"`
covering `DownloadHeaderWireTests`, `MealsDownloadHeaderWireTests`, `PdfDownloadWireTests`,
`GrowthPreferenceCentreCorsWireTests`, `GrowthGuestCorsOriginsTests`, `OkamCorsLoopbackOriginTests`.

**After rebase: 42 passed / 0 failed** (`run-green.txt`).

The assertions are over a real response's `Access-Control-Expose-Headers`, not over the registration:

- `MealsDownloadHeaderWireTests.A_cross_origin_browser_can_read_both_the_name_and_the_content_hash_of_a_statement_export`
  — a 200 from `/v1/meals/statements/{id}/export` carrying
  `Content-Disposition: meals-statement-2026-06-….csv` and `X-Meals-Content-Hash`, with **both names read
  out of `Access-Control-Expose-Headers` on that same response**.
- `DownloadHeaderWireTests.A_cross_origin_browser_can_read_the_name_of_every_download` — same two-halves
  check across every file-serving endpoint (SAF-T, margin statement/template, workforce kodeoversikt and
  hours export, …), plus `PdfDownloadWireTests` for receipts/invoices/credit notes.
- `DownloadHeaderWireTests.The_default_cors_policy_exposes_exactly_the_declared_browser_readable_headers`
  — set-equality against the live `ICorsPolicyProvider`.

### Mutation check — the proof is non-vacuous

The naive resolution was re-applied (`BrowserReadableHeaders.All` → `"ETag"`), rebuilt, re-run
(`run-mutant.txt`): **13 failed / 42**, across all three download suites.

```
The_default_cors_policy_exposes_exactly_the_declared_browser_readable_headers
  Assert.Equal() Failure
  Expected: ["Content-Disposition", "ETag", "X-Meals-C···
  Actual:   ["ETag"]

A_cross_origin_browser_can_read_the_name_of_every_download(what: "saf-t cash register export", …)
  Assert.Contains() Failure
  Not found: Content-Disposition
```

…and the same for margin price-import template, margin statement export, workforce kodeoversikt,
workforce hours export, giftcard receipt, invoice, order receipt, wolt drive invoice report, credit note,
and the Meals statement export. This is exactly the "filename silently becomes `download`" regression.

Restore was done with `git checkout HEAD --` + `touch`, and the rebuild was confirmed to have actually
recompiled (`WebApi.dll` mtime moved) before trusting the green — the stale-`--no-build` trap in
`CLAUDE.md` is precisely what this red/green procedure would otherwise have walked into.
Re-run of the two decisive tests by name after restore: **2 passed / 0 failed**.

## Lane claims verified against `524289b9` (all hold, none drifted)

- Named credentialed policy `GrowthGuestBrowser`: `WithOrigins(derived)` + `AllowCredentials()`,
  methods `GET, POST, PUT`, headers `Content-Type, X-Growth-Csrf`. ✅
- Origins DERIVED in `Helpers/GrowthGuestCorsOrigins.cs` from `GrowthSettings.PreferenceCentreBaseUrl`
  and `ConfirmBaseUrl`, plus explicit `Growth:GuestOrigins`; normalised via `GetLeftPart(Authority)`;
  unparseable/relative/non-http(s) entries skipped rather than thrown; empty result is deny-closed. ✅
- Loopback stripped outside Development by `WithoutLoopbackOutsideDevelopment`. ✅
- `[EnableCors(ClaimConstants.GrowthGuestCorsPolicy)]` on exactly endpoints 3/4/5/7 of
  `Controllers/GrowthPreferenceController.cs`. Endpoint 6 is deliberately left on the permissive default —
  it is the RFC 8058 one-click target, POSTed by mail clients that send no `Origin`. ✅
- The CSRF header name is a single constant (`ClaimConstants.GrowthCsrfHeader`) read by both the policy
  and the controller guard, so the two cannot drift. ✅

## Scope held

The wildcard default is **retired in this lane: no.** It stays, still without credentials
(`AllowAnyOrigin` + `AllowCredentials` is refused by browsers and rejected by ASP.NET Core anyway).
No production configuration touched, `nuxt.config.js:45` untouched, no `api.okam.no` cutover.

## Behavioural delta a reviewer should know about

The lane routes the **MCP** allowlist through `WithoutLoopbackOutsideDevelopment` too, which the tip did
not do. Outside Development an operator-configured `localhost` MCP inspector origin is now dropped. This
is the lane's stated intent and is documented on the method; flagging it because it is a change to a
policy other than the one this lane is named for.

## Carry-forward facts for the later tightening lane

1. **`okam-swiss.ch` is built from the *frontend* repo as a CH edition**, and `nuxt.config.js:45` points
   **both** editions at the same API unless `API_BASE_URL` is overridden at build time. It is the browser
   caller most easily forgotten and would be the first casualty of a tightened default.
2. **Wolt, Vipps, Dintero, Stripe, Surfboard and Postmark webhooks send no `Origin`** and are not
   CORS-bound; the native consumer app uses native HTTP. **None of them justifies a wildcard.** Exactly one
   credentialed browser family exists in the estate — the Growth preference centre.

## Files

- `run-green.txt` — 42/42 after rebase
- `run-mutant.txt` — 13/42 with the naive resolution re-applied
