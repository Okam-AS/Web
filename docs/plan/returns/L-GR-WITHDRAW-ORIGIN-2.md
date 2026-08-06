```
RETURN: L-GR-WITHDRAW-ORIGIN
brief: 85dffea5
verdict: built
evidence: lanes/L-GR-WITHDRAW-ORIGIN/RUNS-2.md; OkamAPI lane/gr-withdraw-origin @ e0c2b02f (base lane/growth-prefcentre 2a052800, worktree ~/okam/OkamAPI-grwithdraw); Web-modules lane/fe-gr-withdraw-origin @ 8049332 (base lane/fe-growth-prefcentre 7a8b0d3, worktree ~/okam/web-grwithdraw); neither pushed
log:
BOTH HALVES ALREADY EXISTED SOMEWHERE and I read across worktrees before writing: CORS policy at 2a052800, Events origin at b0b501a5, API_BASE_URL -> api.okam.no at Web 7a8b0d3. I extended, I did not fork.
WHAT WAS MISSING EVERYWHERE: the session COOKIE at any tier, and any test relating the committed API origin to the pages. 7a8b0d3 moved the origin as a BARE LITERAL with no test - the same shape as the defect it fixes, whose wrong value also cost nobody a failing test.
Backend e0c2b02f: 4 wire tests, container-free, a real link token spent over HTTP. The real Set-Cookie is read off the response: httponly, secure, samesite=strict, path=/v1/growth.
NON-VACUITY: two reads built by ONE factory from one session - same route, same Origin, same CSRF header - differing in exactly one header. With the cookie 200, without it 401 growth.session_invalid. Both carry the CORS grant, which is why the refusal is READABLE by the page instead of discarded by the browser.
The withdrawal itself: the refused PUT leaves the consent state UNCHANGED (asserted on state, not only on status); the same PUT with the cookie answers 200 consented=false suppressed=true and carries no address.
MUTATIONS, all restored: M1 Mcp:PublicBaseUrl -> azurewebsites reds the relationship (Expected azurewebsites.net / Actual okam.no); M2 Strict -> Lax reds the cookie; M3 cookie renamed reds 3 of 4; M4 [EnableCors] off endpoint 3 reds with the PRODUCTION symptom (Expected https://okam.no / Actual *).
C7 CAUGHT IN MY OWN WORK: M2 first failed printing the whole Set-Cookie, i.e. a working session credential into whatever log collects a red CI run. Value and attributes are now split and never recombined for an assertion.
Backend 4394/0/12 of 4406 vs base 4390/0/12 of 4402 measured in the same worktree. Delta +4, one-for-one with my tests, no regressions.
Frontend 8049332: the committed API origin is pinned to the MARKET hostname (config/edition.js), not to a second copy of the string. Reverting the base reds with Expected okam.no / Received azurewebsites.net.
THE CH GAP IS NOW MEASURABLE rather than a note in a return: okam-swiss.ch is a different registrable domain from the one committed API origin, so that build's preference centre is still cross-site and its cookie still withheld. NOT fixed - api.okam-swiss.ch does not resolve, and committing it would break every Swiss call instead of only this one.
Frontend 2432/2433 vs base 2427/2428 in the same worktree, delta +5. The 4 red suites are environmental: 3 need the core/ submodule that is empty in every lane worktree, and journey-artifact-store hardcodes the checkout DIRECTORY NAME. Flagged, not chased.
THE CORRECTION IS HONOURED AND PINNED IN CODE in both repos, one line below the same-site claim: same site is NOT same origin, so the named policy is required UNDER the ruling and never instead of it.
Two file headers stated the defect as live and unfixable; both now say which fix closed which half, that neither substitutes for the other, and that neither side is DEPLOYED. No rendered copy changed, no translation file touched.
THE BRIEF FILE'S EXIT IS STILL UNREACHABLE, re-measured read-only: okam.no/preferences/communications answers 404 and the live preflight still answers access-control-allow-origin: * with no allow-credentials. D-PREFCENTRE-DEPLOY gates it and F-PROD-CORS-WILDCARD is still live in production.
MERGE: 2a052800 then e0c2b02f; b0b501a5 is independent. RegistrableDomain is EXTRACTED here and b0b501a5 holds an identical PRIVATE copy - collapse them or the estate carries two answers to "are these the same site". No push, no migration, no container, nothing but loopback; ev-dietary artifacts restored.
END RETURN
```
