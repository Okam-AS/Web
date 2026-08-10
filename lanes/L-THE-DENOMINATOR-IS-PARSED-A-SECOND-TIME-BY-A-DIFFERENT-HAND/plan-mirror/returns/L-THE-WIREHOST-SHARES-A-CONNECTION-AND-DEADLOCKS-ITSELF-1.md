RETURN: L-THE-WIREHOST-SHARES-A-CONNECTION-AND-DEADLOCKS-ITSELF
brief: 0833e179
verdict: aborted
reason: I applied the named shared-cache connection fix and it did NOT unblock the flow; two independent measurements then disproved the connection as the cause and localised the real block to a deadlocked async continuation in the OpenIddict SignInResult path under TestServer — not the database. Per the brief's permission, I stopped and named the next step (host on real Kestrel, not TestServer) rather than guess.
evidence: lanes/L-THE-WIREHOST-SHARES-A-CONNECTION-AND-DEADLOCKS-ITSELF/evidence.md
log: Applied the predecessor's named fix: fixture-scoped shared-cache in-memory SQLite + keepalive, DbContext overridden in the fixture's own ConfigureTestServices, WireHost untouched.
Measurement 1 (executed, trx-named): a boot-only diagnostic asserts the host resolves cache=shared — Passed 1/1. The override took effect; the host uses pooled connections, not the single one.
Measurement 2: the real flow blocks at the IDENTICAL point — 1 code INSERT, 0 /oauth/token, worker idle ~1.3 CPU with frozen CPU-time. The connection change made no observable difference.
Measurement 3 (native sample of the blocked worker): main thread in a managed Monitor.Wait, every pool thread idle in WaitOne, and ZERO threads executing SQLite, EF, OpenIddict, or a cert op.
Conclusion the measurements force: the single-connection theory is DISPROVEN. A DB lock would show a thread inside SQLite; none is. Everything is parked — a lost async continuation, not a connection.
The block: OpenIddict's SignInResult response continuation under TestHost never resumes; the login LocalRedirect did not deadlock, only the OpenIddict SignInResult path does.
Named next step, not applied: host the flow on a real Kestrel loopback server instead of TestServer, so OpenIddict's continuations run on the real thread pool; the login-consent-code flow is reusable.
Cheaper corroboration, unavailable here: dotnet-stack/dotnet-dump are not installed, so I used a native macOS sample; a managed stack would name the exact awaiting frame.
The shared-cache change is kept in the harness as correct infra hygiene for the Kestrel flow (concurrent requests should not share one connection), though it is not this block's cause.
The one bit stays unmeasured a third time: the flow never reaches the probe; the assertion and its self-proof mutation remain written-but-unexecuted and no claim is made.
Third honest stop on this question, and the most diagnostic: it disproves a hypothesis two lanes carried and hands the next attempt a hosting change, not another guess.
Hygiene: detached worktree OkamAPI-wireconn removed and pruned; one untracked test file only, no production or tracked source touched, WireHost not edited, run-sheet untouched.
My own hung PIDs (flow tree 21735 + testhost/vstest children) stopped by targeted kill by PID, never pkill; McpShoppingService not repaired; trunk untouched at 6d5328004; nothing pushed.
END RETURN
