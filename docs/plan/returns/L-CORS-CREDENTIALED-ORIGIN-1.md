```
RETURN: L-CORS-CREDENTIALED-ORIGIN
brief: dac0ada5
verdict: built
evidence: lanes/L-CORS-CREDENTIALED-ORIGIN/evidence.md
log: Measured at tip 35696d6b, unchanged at lane end. Policy had NOT landed: 2a052800 not an ancestor,
no GrowthGuestCorsPolicy in the tree, Program.cs:100 still AllowAnyOrigin under a bare app.UseCors().
So built, not fail-spec. Credentialed-ness confirmed client-side, not assumed: growth-guest-client.js
sends credentials:'include' on all four calls and communications.vue already documents this defect.
Landed on lane/cors-credentialed-origin @ edbb7dea, worktree OkamAPI-corscred, base 35696d6b.
MERGED 2a052800 by its original sha instead of cherry-picking: its parent is already an ancestor, so
this brings one commit and makes 2a052800 an ancestor, killing the duplicate-landing hazard for
lane/gr-withdraw-origin, lane/growth-prefcentre, lane/meals-reachable-api. One conflict resolved:
appsettings.Development.json Events.PublicBaseUrl vs Growth.GuestOrigins, kept both, JSON re-parsed.
Non-vacuity: wire tier boots the real Program, CorsService logs execution, every request carries an
Origin, assertions are on response headers for preflight AND actual plus the refusal direction.
Mutation A (drop the four [EnableCors]) and B (named policy to AllowAnyOrigin) each red 9 tests in
both directions; restore returns green; full rebuild each time, no --no-build anywhere.
Container-free only, no container touched: Database!=SqlServer 4487/0/12skip at edbb7dea after
rm -rf bin obj. Checkout clean, ev-dietary run-sheets restored not committed, shared ref not moved.
END RETURN
```
