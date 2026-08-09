RETURN: L-THE-WIREHOST-CAN-MINT-AN-OPENIDDICT-PRINCIPAL
brief: 5fc5cff1
verdict: aborted
reason: The harness drives the real OpenIddict flow through demo-login + consent to an ISSUED, encrypted authorization code (the hard half nothing in the suite had reached), then the consent response blocks silently on the WireHost's single shared :memory: SQLite connection before /oauth/token is ever reached; I stopped rather than fake the one bit, and named the exact step and its fix.
evidence: lanes/L-THE-WIREHOST-CAN-MINT-AN-OPENIDDICT-PRINCIPAL/evidence.md
log: Built a real wire flow, no hand-built principal: seed a public client via IOpenIddictApplicationManager, demo-code login (+4799999999/123123) to the real cookie, consent POST decision=accept.
Run log: Authorize returned SignInResult, OpenIddict created an ad hoc authorization for the seeded client, and INSERT INTO OpenIddictTokens persisted the encrypted authorization code.
The last flushed line is that code INSERT; /oauth/token is never reached (grep count 0). The consent POST never returns — a silent block, no exception, the worker idle with no CPU-time growth.
Cause by elimination: not the OAuth flow (login+consent+code all succeeded), not my logic, not the cert (the code was encrypted and persisted). What remains is the single shared connection.
WireHost holds one kept-open DataSource=:memory: connection for every request and store; OpenIddict issues a further DB op after the code insert and SQLite serialization blocks it silently.
Named fix, not applied: swap to a shared-cache in-memory SQLite plus a keepalive connection, overridden in the fixture's own ConfigureTestServices — no WireHost edit.
Demo bypass does NOT change the principal's shape: the token claims come from AddUserClaimsAsync reading the user + OpenIddict, not from the login method; a real login yields the same shape.
The measured bit stays unmeasured, honestly: the assertion and its self-proof mutation are written but never executed — no claim made, the void-run shape refused again.
Harness preserved at lanes/.../McpOpenIddictPrincipalWireTests.cs.harness with a test-only IStartupFilter probe reading the validated principal via AuthenticateAsync — reusable by the next attempt.
Hygiene: detached worktree OkamAPI-wiremint removed and pruned; one untracked test file only, no tracked source dirtied, run-sheet untouched; my own hung PIDs stopped by targeted kill, never pkill.
McpShoppingService not repaired; trunk untouched at 28e60e6b8 (moved from ada218783 mid-lane); nothing pushed. The expensive half is built; the remaining blocker is named tier infra, not the flow.
END RETURN
