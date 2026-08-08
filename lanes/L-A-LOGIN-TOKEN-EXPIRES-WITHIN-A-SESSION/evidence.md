# L-A-LOGIN-TOKEN-EXPIRES-WITHIN-A-SESSION — evidence

brief 52d0da2f · backend worktree `/Users/svendaneel/okam/OkamAPI-logintok`
branch `lane/a-login-token-expires`, branched from `feature/restaurant-modules` = **`a14084874`**
(read fresh at dispatch; matches the clerk's recorded tip).

## What changed

| File | Change |
|---|---|
| `Services/UserService.cs` | `Expires = DateTime.Now.AddDays(36500)` → `DateTime.UtcNow.Add(TokenLifetime)`; adds `DefaultTokenLifetimeHours = 24*30`, `MaxTokenLifetimeHours = 24*90`, and the clamped `TokenLifetime` property |
| `Helpers/AppSettings.cs` | adds `int? TokenLifetimeHours` — the operator lever |
| `appsettings.json` | `AppSettings:TokenLifetimeHours: 720` — the lever, present and settable |
| `Controllers/UserController.cs` | `SendVerificationToken` consumes `IOAuthSmsRateLimiter.TryConsumeSend` before `GetOrCreateAsync`; 429 + `Retry-After` on refusal |
| `Program.cs` / `Helpers/ServiceCollectionExtensions.cs` | moves the `IOAuthSmsRateLimiter` registration OUT of `AddMcpAuthentication` into the unconditional composition — see "the regression this lane caused and closed" below |
| `WebApi.Tests/Wire/LoginTokenAndSmsDoorWireTests.cs` | new — 5 wire proofs |
| 5 other test/doc files | the century-token premise they asserted or narrated, restated |

## The number, and where it came from

`GenerateJwtTokenAsync` has **exactly one caller** (`Controllers/UserController.cs:186`) and this API has
**no refresh route** (`grep -rn "refreshtoken\|/refresh"` over `Controllers/ Services/ Helpers/` returns only
Wolt marketplace and OpenIddict's MCP grant). So **the expiry interval is the re-authentication interval**,
and re-authentication is an SMS one-time code. The clients were read before the number was picked:

- **`Web-modules` admin web has no response interceptor and no token-aware guard.** `platform/http-module.ts:5-11`
  is raw axios. `store/index.js:25` — `userIsLoggedIn` is `!!currentUser.id`, it never inspects the token.
  `core/services/request-service.ts:87-103` turns any non-200 into `undefined`. **An expired token therefore
  renders a signed-in shell full of empty pages — it does not prompt for a login.** Only
  `plugins/admin-core-services.js:39,46` (inside `AdminUserService.Reload()`/`.Get()`) converts a 401 into a
  logout, and its own header comment records that a catch-all logout was deliberately removed.
- **Re-login is SMS-only.** `components/molecules/LoginModal.vue:180-193` → `SendVerificationToken`, then
  `:195-222` → `Login`. No PIN, no biometric, no stored credential, no remember-me. The admin modal has no
  resend cooldown at all. The POS PIN pad is a second layer on top of a live admin JWT and cannot help:
  `components/admin/pos/PosShell.vue:846-849` says so in terms.
- **The consumer app is opened in visits days apart.** `ConsumerApp/src/app.ts:132-135,163-164` probes
  `TokenIsValid()` on launch and resume. A lifetime shorter than the gap between visits = an SMS per visit
  for every user.
- **Storage has no expiry of its own.** `plugins/global-mixin.js:67-71` writes the whole Vuex state to
  `localStorage['state']`; `store/index.js:82-97` rehydrates it. Today's admin session ends only when the
  operator clears browser storage.

**Chosen: 30 days (720 h), clamped to a 90-day ceiling.** Not invented — it is the interval the estate has
already ratified for this exact question: `OkamAPI-rebrand/appsettings.json:137-138` sets
`RefreshTokenLifetimeDays: 30`, i.e. thirty days is the longest a user stays signed in on the rebrand stack
before redoing SMS. With no refresh route here, the access token *is* the session, so 30 days makes the
re-authentication interval the same product decision on both backends with the one instrument this one has.

A working-shift number (the estate's own `OperatorSessionResolver.DefaultSessionMaxAgeHours = 16`) was
rejected: on these clients it buys a broken screen and an SMS, not a sign-out. **That trade is the owner's to
revisit and the lever is in `appsettings.json` for exactly that reason.**

`DateTime.UtcNow` rather than the repository's Europe/Oslo `DateTime.Now` convention — CLAUDE.md names
"JWT/OAuth/OpenIddict token lifetimes" as one of the explicit UTC exceptions. Invisible at a century, one to
two hours of the budget at this horizon.

## The SMS door

Reuses `IOAuthSmsRateLimiter` (12/IP, 5/phone, 15-minute window) rather than minting a second budget: both
doors send the same code to the same phone over the same paid rail, so two budgets would mean a caller
refused at one door walks to the other. The check runs **before** `GetOrCreateAsync`, which is where the cost
lands — that call writes an `ApplicationUser` row for an unproven number and then pays an SMS to it.

## Red proof (mutation, one half at a time)

`red-mutation-1-century-token.txt` — `Expires` restored to `DateTime.Now.AddDays(36500)`, everything else intact:

```
Failed  The_bearer_the_login_route_returns_expires_within_a_session
  POST /user/login returned a bearer valid until 2126-07-13T21:48:15.0000000Z — 36500 days, past the 90 day ceiling.
Failed  The_bearer_carries_the_configured_lifetime_and_not_merely_a_finite_one
  exp - iat is 36500.00:00:00, not the configured 30.00:00:00.
Failed  ActorClaimGroundTruthTests.The_application_token_outlives_a_single_visit_and_not_a_planning_horizon
Passed  The_sms_door_refuses_a_caller_that_asks_too_often          <- the other half stays green
Passed  The_sms_refusal_names_neither_the_number_nor_the_budget
Passed  The_login_route_still_completes_and_returns_a_usable_bearer
```

`red-mutation-2-unbounded-sms.txt` — the limiter guard removed, `Expires` intact:

```
Failed  The_sms_door_refuses_a_caller_that_asks_too_often            (Expected: TooManyRequests, Actual: OK)
Failed  The_sms_refusal_names_neither_the_number_nor_the_budget
Passed  The_bearer_the_login_route_returns_expires_within_a_session  <- the other half stays green
Passed  The_bearer_carries_the_configured_lifetime_and_not_merely_a_finite_one
```

Each mutation reds only its own half, so neither arm is riding on the other. `green-restored.txt` is the
same ten tests after both restorations: 10/10.

## The regression this lane caused and closed

Adding `IOAuthSmsRateLimiter` to `UserController`'s constructor **took the entire `/user/*` surface down with
any MCP configuration failure.** That limiter was registered inside `AddMcpAuthentication`
(`Helpers/ServiceCollectionExtensions.cs:59`), which `Program.Main` runs inside the MCP try/catch — the catch
that exists so MCP can fail without taking the API with it. `CompositionRootLimiterWireTests` caught it as a
500 on `/user/send-email-confirmation-code`. The registration moved to `Program.cs` beside
`IReservationRateLimiter`, which is there for exactly this reason. Two composition-root pins that used
`IOAuthSmsRateLimiter` as their *canary* for "did `AddMcpAuthentication` run past its registration block"
were re-pointed at `IClientIdMetadataDocumentService`, which is still registered on that line.

## Suite

Fast tier, `--filter "Database!=SqlServer"`, `fast-tier.txt`:

```
Passed! - Failed: 0, Passed: 4757, Skipped: 10, Total: 4767
```

Baseline at `a14084874` was 4752 / 0 / 10. **Delta +5, exactly the five new tests**, and no pre-existing test
changed verdict. No SQL container was started; the wire tier runs on in-memory SQLite.

## Named and not done

1. **`/User/login` itself is still unmetered.** `IOAuthSmsRateLimiter.TryConsumeVerify` exists and
   `OAuthLoginController:106` already uses it; the app login door does not, so the six-digit code is
   brute-forceable. Left out because the exit names the SMS *send* door and because the demo/power-user
   phone shares one bucket across a demo world — a 10-per-15-minutes cap on it would be felt in a demo.
   Small, and worth its own item.
2. **The admin web's expiry behaviour is now reachable and is wrong.** Thirty days from now, real operators
   will meet an expired token, and today that renders empty pages rather than a login prompt. The fix is one
   wire in `Web-modules`: `core/pinia/user.ts:185-192` `logoutIfTokenExpired()` and
   `core/services/user-service.ts:80-87` `TokenIsValid()` both exist and have **no caller** in that repo.
   Frontend lane, not this one.
3. **`F-JWT-SIGNING-KEY-COMMITTED` was read and not touched**, per the brief. `appsettings.json:12` still
   carries the live symmetric key, so a `PowerUserRole` token can be forged with no login. Note the
   interaction: `WireHost.InboundOnlyCredentials` records that a wire-host override of `AppSettings:Secret`
   desynchronises mint from validation (measured: 41 of 67 wire tests 401), so the rotation is a real
   deployment change and not a config edit. **Shortening the lifetime does nothing about forgery** — a forger
   mints a fresh token whenever they like.
4. **No revocation still.** `OnTokenValidated` (`Helpers/ServiceCollectionExtensions.cs:204-213`) fails only
   on a missing user row. Thirty days is a waiting period, not a kill switch. A security stamp checked there
   plus a refresh route is what would let this number drop to an hour.
