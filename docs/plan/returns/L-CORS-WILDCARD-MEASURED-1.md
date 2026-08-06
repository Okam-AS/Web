```
RETURN: L-CORS-WILDCARD-MEASURED
brief: 5e969d67
verdict: built
evidence: lanes/L-CORS-WILDCARD-MEASURED/finding.md
log: Production = origin/master 6c0b3a19 (workflow master->okamapi), NOT integration 8e2b57de nor lane/cors-followups 17c12c20. AllowAnyOrigin is Program.cs:71-77 on master and on no other branch.
Re-measured 2026-08-06T11:48Z: allow-origin:* everywhere, allow-credentials absent everywhere. F-PROD-CORS-WILDCARD stays open, clears_when measured false. 8 credential rows enumerated on master.
PREMISE HALF FALSE (plan.md:10232 "nothing rides on ambient credentials"): true for cookies, the only one being __Host-OkamOAuthLogin at SameSite=Lax on navigation-only routes; false for header ones.
AllowAnyHeader ECHOES instead of emitting *, defeating the Fetch carve-out that would have blocked Authorization. Three header credentials are script-readable from ANY origin TODAY, not on deploy day.
Named: Authorization Bearer on every [Authorize] route; X-Okam-ApiKey StoresController.cs:1199; X-API-Key ExternalMenuController.cs:34. Preflight granted by name AND the actual 401 carries ACAO:*.
That 401 proved it with no credential (UseCors :210 precedes UseAuthentication :222). Their 200 bodies I could NOT measure, needing a key or a write. Sec 9 names that plus 4 further gaps, not guesses.
NEW, in no docs/plan file: StoresController.cs:1208 hardcodes a GUID key guarding [AllowAnonymous] completed-order reads for stores 52/53/54/57. Value withheld per C7; rotation is owner work.
Also new: /User/login returns a ~100-year JWT (UserService.cs:547 AddDays(36500)) in a body that ACAO:* makes readable, and its SMS companion at :161 has no rate limiter at all.
Prefcentre NOT deployed (/v1/growth/* 404) = the first ambient credential. Hazard: SetIsOriginAllowed(_=>true).AllowCredentials() does NOT throw where AllowAnyOrigin+AllowCredentials does.
okam.no bundles call okamapi.azurewebsites.net (4 measured), a public suffix so cross-SITE: api-subdomain needs an API_BASE_URL build change, not just DNS. Read-only lane, nothing written or pushed.
END RETURN
```
