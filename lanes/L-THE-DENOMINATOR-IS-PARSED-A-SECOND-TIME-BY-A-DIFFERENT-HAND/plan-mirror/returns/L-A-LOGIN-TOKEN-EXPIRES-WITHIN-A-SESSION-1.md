```
RETURN: L-A-LOGIN-TOKEN-EXPIRES-WITHIN-A-SESSION
brief: 52d0da2f
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-A-LOGIN-TOKEN-EXPIRES-WITHIN-A-SESSION/evidence.md
log:
Branched lane/a-login-token-expires from feature/restaurant-modules a14084874 (read fresh); committed b17e0dd62 in /Users/svendaneel/okam/OkamAPI-logintok. Not pushed.
Lifetime: AddDays(36500) -> DateTime.UtcNow.Add(TokenLifetime), default 720h = 30 days, clamped to a 90-day ceiling, lever AppSettings:TokenLifetimeHours in appsettings.json.
The number is read, not chosen. One minter (UserController.cs:186), no refresh route on this API, so expiry IS the re-auth interval and re-auth is an SMS.
Admin web has no interceptor and no token-aware guard: userIsLoggedIn is !!currentUser.id (store/index.js:25), non-200 becomes undefined (request-service.ts:87-103), so expiry renders empty pages.
Re-login is SMS-only (LoginModal.vue:180-222): no PIN, no biometric, no cooldown. Consumer app opens in visits days apart. A working-shift number buys a broken screen plus an SMS.
30 days is the estate's own ratified answer: OkamAPI-rebrand appsettings.json:137-138 RefreshTokenLifetimeDays=30. UtcNow per CLAUDE.md's JWT exception to the Oslo convention.
SMS door: UserController.SendVerificationToken now consumes IOAuthSmsRateLimiter.TryConsumeSend before GetOrCreateAsync (which writes a user row, then pays an SMS), 429 + Retry-After.
Reused OAuthLoginController's limiter rather than a second budget, so a caller refused at one door cannot walk to the other; 5/phone and 12/IP per 15 min, unchanged.
REGRESSION I CAUSED AND CLOSED: that constructor dependency was registered inside AddMcpAuthentication, inside Program.Main's MCP try/catch -> every /user/* route 500s when MCP config fails.
CompositionRootLimiterWireTests caught it. Registration moved to Program.cs beside IReservationRateLimiter; two pins using the limiter as their canary re-pointed at IClientIdMetadataDocumentService.
New Wire/LoginTokenAndSmsDoorWireTests.cs, 5 real-pipeline tests: exp within ceiling; exp-iat equals the lifetime; login still yields a usable bearer; 429 at the 6th ask; refusal names nothing.
Red proof one half at a time: century-token mutation reds 3 (SMS arms green); unbounded-SMS mutation reds 2 (lifetime arms green). red-mutation-1/-2 and green-restored in the lane dir.
Fast tier Database!=SqlServer: 4757 passed / 0 failed / 10 skipped, delta +5 on the 4752/0/10 baseline, exactly the five new tests. No SQL container, no migration, C1-C7 clean.
Left open, each wanting an item: /User/login is unmetered so the OTP is brute-forceable (TryConsumeVerify exists, unused); Web-modules never calls its own logoutIfTokenExpired/TokenIsValid.
F-JWT-SIGNING-KEY-COMMITTED read and untouched per brief - the key still forges PowerUser with no login, and a shorter lifetime does nothing about forgery. Revocation is still only a waiting period.
END RETURN
```
