```
RETURN: L-PREF-COOKIE-HALF
brief: 56a83f44
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-PREF-COOKIE-HALF/evidence.md
log:
Brief re-measured not inherited: 2a052800 carries the CORS half and is NOT an ancestor of the probed tree; the tip is Strict; the probe regex encodes the ruled option. Neither fact is mis-probed.
Built on lane/pref-cookie-half @ b5a3b1a6, worktree OkamAPI-prefcookie, base 8e2b57de. One line: GrowthPreferenceController.cs:75 Strict -> None. HttpOnly, Secure, Path=/v1/growth, Expires untouched.
New WebApi.Tests/Wire/GrowthPreferenceSessionCookieWireTests.cs: 3 facts over the real pipeline, link token minted through the host's own service, Set-Cookie parsed the way a user agent parses it.
Cookie replayed through an explicit header, NEVER a cookie jar - CookieContainer sends a Strict cookie back to the same test host, so a jar-driven proof passes against the defect being pinned.
RED BEFORE GREEN. Mutation A (revert to Strict) reds 3: the wire fact with Expected None / Actual Strict, plus the two pre-existing samesite=strict assertions, MOVED to the ruled posture not deleted.
Mutation B (Secure=false) reds 1 - a browser discards a SameSite=None cookie without Secure, so Secure is now load-bearing. Restore re-greens; WebApi.dll mtime checked, no --no-build.
WHAT STILL HOLDS is asserted not described: HttpOnly, Secure, Path scope, and the double-submit is what authorizes - no CSRF header 401, guessed token 401, issued token 200, both ways in one test.
Default CORS policy untouched; Program.cs and ServiceCollectionExtensions.cs never opened, no credential grant added. Frontend needs nothing - growth-guest-client.js already sends credentials.
Suite, both ends measured by me: baseline 4638/0/12 on a clean 8e2b57de, after 4641/0/12. Delta +3 = the new wire facts. Nothing deleted or renamed. Database!=SqlServer only, no container.
Four doc strings and the 30-growth-spec.md PrefSession capability line moved with the code, so the tree stops asserting a cookie posture it no longer sets.
REOPEN NOTE IS HALF WRONG: same registrable DOMAIN retires the cookie (SameSite is a site rule) but NOT the named policy - CORS is origin-scoped and the wildcard is still refused.
Only a true same-ORIGIN serving retires both. That is the same false equivalence the plan already corrected on 2026-08-03.
Removable under that move: the one line, its comment, 4 doc strings, the spec sentence, 1 of the 3 new wire facts. Facts 2 and 3 hold under either posture; under Strict, Secure reverts to advisable.
FACT CANNOT FLIP FROM HERE: growth.cookie.crosssite reads ../OkamAPI-modules, on foreign branch lane/meals-grace-pins. Landing is the orchestrator's step, as for L-CORS-CREDENTIALED-ORIGIN.
lane/cors-followups @ 17c12c20 is the other half, same base, different hunks of the same controller. Landing either alone leaves named-cors-policy-plus-samesite-none half-built again.
END RETURN
```
