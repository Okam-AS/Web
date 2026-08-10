```
RETURN: L-CORS-LAND-FOLLOWUPS
brief: 64584d55
verdict: built
evidence: lanes/L-CORS-LAND-FOLLOWUPS/evidence.md
log:
Verified 524289b9 against the brief first: every claim holds, nothing drifted — derivation from
PreferenceCentreBaseUrl/ConfirmBaseUrl + Growth:GuestOrigins, loopback-stripping outside Development,
[EnableCors] on endpoints 3/4/5/7, endpoint 6 deliberately excluded (RFC 8058, no Origin sent).
Rebased onto 8e2b57de -> 17c12c20; merge-base is now the tip exactly. Pre-rebase 524289b9 kept at
refs/backup/cors-followups-prerebase. Nothing pushed, tree clean, no container, host dotnet 8.0.110.
SHARPER THAN BRIEFED: Program.cs conflicted as predicted, but Helpers/ServiceCollectionExtensions.cs
AUTO-MERGED with no conflict, silently carrying the lane's hardcoded WithExposedHeaders("ETag") over
the tip's BrowserReadableHeaders.All — a reviewer inspecting only conflicts would never have seen it.
Ported to BrowserReadableHeaders.All (ServiceCollectionExtensions.cs:77) + doc para on why the set is
read from the constant, never spelled as a literal.
Wire proof over emitted Access-Control-Expose-Headers (not the registration): 42/42 green.
Mutation check re-applying the naive resolution: 13/42 RED — Expected ["Content-Disposition","ETag",
"X-Meals-C..."] / Actual ["ETag"], and "Not found: Content-Disposition" on SAF-T, invoices, receipts,
credit notes, workforce exports, Meals statement. Restore confirmed non-stale, re-green 2/2.
Wildcard NOT retired, no prod config, nuxt.config.js:45 untouched. Delta: lane also loopback-strips MCP.
END RETURN
```
