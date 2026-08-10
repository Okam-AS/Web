# L-PREF-COOKIE-HALF — the cookie the ruling chose is the cookie the code sets

Brief `56a83f44`. Worktree `/Users/svendaneel/okam/OkamAPI-prefcookie`, branch `lane/pref-cookie-half`,
base `8e2b57de` (OkamAPI `feature/restaurant-modules` tip), landed at **`b5a3b1a6`**. Nothing pushed, nothing
committed to a shared branch, no migration, no container started or stopped, no `npm`, no `git stash`, no
`git add -A` (each of the eight paths staged by name; the `artifacts/journeys/ev-dietary/run-sheet.*` files a
suite run rewrites were restored and deliberately left uncommitted, as prior lanes on this base did).

## 1. The brief's measurement, re-checked rather than inherited

| Claim | Re-measured | Result |
| --- | --- | --- |
| `2a052800` carries the CORS half | `git show 2a052800` | Holds — `AllowCredentials` ×2 in `Helpers/ServiceCollectionExtensions.cs`, `[EnableCors]` on three actions, `WebApi.Tests/Wire/GrowthPreferenceCentreCorsWireTests.cs` |
| `2a052800` is not an ancestor of the probed tree | `git merge-base --is-ancestor` against `../OkamAPI-modules` HEAD | Holds |
| `SameSite = SameSiteMode.Strict` at the tip | `git show 8e2b57de:Controllers/GrowthPreferenceController.cs` | Holds, line 62 |
| The comment describes Strict as the design | `Controllers/GrowthPreferenceController.cs:24` | Holds |
| The probe encodes the ruled option | `plan.md:25960` — `regex:SameSite = SameSiteMode\.(None)` | Holds; the fact is correct and the option was unexecuted |

`../OkamAPI-modules` is checked out on `lane/meals-grace-pins` (`34c6c103`), a foreign lane's branch which is
**not** a descendant of `8e2b57de`. It was read only; no branch there was changed. All work is in this lane's
own worktree.

## 2. What changed

| File | Change |
| --- | --- |
| `Controllers/GrowthPreferenceController.cs:75` | `SameSite = SameSiteMode.Strict` → `SameSiteMode.None`. `HttpOnly`, `Secure`, `Path = /v1/growth` and `Expires` untouched. |
| `Controllers/GrowthPreferenceController.cs:24-37` | The comment now records why `None` is a ruled trade, what the double-submit still carries, and that `Secure` became mandatory rather than advisable. |
| `Models/Growth/GrowthPreferenceModels.cs:16` | doc string `SameSite=Strict` → `None` |
| `Services/Growth/IGrowthPreferenceTokenService.cs:15,63` | doc strings `SameSite=Strict` → `None` |
| `WebApi.Tests/Growth/GrowthEndpointContractTests.cs:128` | assertion `samesite=strict` → `samesite=none` |
| `WebApi.Tests/Growth/GrowthFixtureMatrixTests.cs:343,369` | comment + assertion, same |
| `WebApi.Tests/Growth/GrowthLiveJourneyTests.cs:144` | comment, same |
| `docs/plans/modules/30-growth-spec.md:157` | the `PrefSession` auth capability now names `SameSite=None` and the reason, so the binding spec does not assert a posture the code no longer sets |
| `WebApi.Tests/Wire/GrowthPreferenceSessionCookieWireTests.cs` | **new**, 3 facts |

Nothing in `Program.cs` or `Helpers/ServiceCollectionExtensions.cs` was touched: the default CORS policy and
the named guest policy are `L-CORS-NARROW-THE-DEFAULT`'s and `lane/cors-followups`' ground, and
`SetIsOriginAllowed(_ => true).AllowCredentials()` is precisely the widening this lane was told to stay away
from. This diff adds no credential grant anywhere.

The frontend needs no change: `Web-modules/utils/growth/growth-guest-client.js:118` already sends
`credentials: 'include'` on the four session calls, pinned by `test/growth-guest-client.test.js:106`.

## 3. The new wire test, and why it is at that tier

`WebApi.Tests/Wire/GrowthPreferenceSessionCookieWireTests.cs` — three facts against the real composition
root, over a real HTTP request, with the link token minted through the host's own `IGrowthPreferenceService`:

1. `The_session_cookie_a_guest_receives_can_be_sent_from_another_site` — parses the emitted `Set-Cookie` with
   `SetCookieHeaderValue.Parse` (the way a user agent parses it) and asserts `SameSite == None`, plus the raw
   `samesite=none` on the wire.
2. `The_cross_site_cookie_keeps_every_other_protection_the_strict_one_had` — `HttpOnly`, `Secure`,
   `Path == /v1/growth`, and a CSRF token issued in the body. This is the "what still holds" claim the
   ruling's `con` line invites, asserted rather than written in prose.
3. `The_signed_double_submit_token_is_what_authorizes_a_session_call_now_that_the_browser_does_not` — cookie
   with no CSRF header → 401; cookie with a guessed token → 401; cookie with the issued token → 200. Both
   directions in one test, so neither an endpoint that refuses everything nor one that accepts everything
   satisfies it.

Two deliberate choices:

- **The cookie is replayed through an explicitly-set `Cookie` header, never through a cookie jar.**
  `CookieContainer` applies its own same-site rules and would happily send a `Strict` cookie back to the same
  test host — a jar-driven proof would pass against the very defect this pins.
- **The `X-Growth-Csrf` header is a literal in the test**, because the production one is a private const on
  the controller. `ClaimConstants.GrowthCsrfHeader` exists only on `lane/cors-followups`; introducing a
  competing constant here would collide with that lane at the merge. A rename desynchronises the two spellings
  but cannot go vacuous in the dangerous direction — the authorized 200 reds first.

**C7:** the session cookie value and the CSRF token are live credentials. They are held in memory, asserted on
structurally, and written into no assertion message, no log and no file. Nothing in this document or in any
log under this directory carries either value.

## 4. Red before green — proved, not asserted

Every run below is a full `dotnet build` (no `--no-build` anywhere). Assembly mtime was checked across the
mutation to confirm a real recompile, per the `--no-build`/mtime trap in `CLAUDE.md`.

| Run | Command filter | Result | Log |
| --- | --- | --- | --- |
| Green, new suite alone | `~GrowthPreferenceSessionCookieWireTests` | 3/3 passed | `green-wire-only.log` |
| Green, all three cookie suites | the three suites, `Database!=SqlServer` | 29/29 passed | `green-cookie-suites.log` |
| **Mutation A — revert the cookie to `SameSiteMode.Strict`** | same three suites | **3 failed / 26 passed** | `red-mutation-strict.log` |
| Restore | same three suites | 29/29 passed, `WebApi.dll` mtime moved 14:36:19 → 14:38:12 → 14:39:21 | `restore-green.log` |
| **Mutation B — `Secure = false`** | new suite alone | **1 failed / 2 passed** | `red-mutation-secure.log` |

Mutation A reds exactly three facts, and the wire one reds on the fact itself:

```
Failed WebApi.Tests.Wire.GrowthPreferenceSessionCookieWireTests.The_session_cookie_a_guest_receives_can_be_sent_from_another_site
  Assert.Equal() Failure
  Expected: None
  Actual:   Strict
```

alongside `GrowthEndpointContractTests.Open_session_sets_a_hardened_cookie_and_the_session_round_trips_to_get_preferences`
and `GrowthFixtureMatrixTests.GRW_TOKEN_001_session_token_is_leak_free_single_use_scoped_and_expires` — the two
assertions that previously pinned `samesite=strict` and were moved to the ruled posture rather than deleted.

Mutation B reds with the message the comment claims:

```
Failed ...The_cross_site_cookie_keeps_every_other_protection_the_strict_one_had
  SameSite=None is discarded by a browser unless the cookie is Secure
  Expected: True
  Actual:   False
```

Mutation B matters because it is the one change that looks harmless: with `SameSite=None` the browser drops
the cookie entirely, and the symptom is identical to the failure this lane closed.

## 5. Suite evidence

Baseline **measured by this lane**, on a clean checkout of `8e2b57de` in a fresh worktree (no `bin`/`obj`),
before any edit:

```
Passed!  - Failed: 0, Passed: 4638, Skipped: 12, Total: 4650  (6 m 45 s)   baseline.log
```

That matches the figure the brief quotes for `feature/restaurant-modules` tip `8e2b57de`. Note the **repo** —
that SHA resolves to no object in `Web-modules`, where the plan hub lives; it is an OkamAPI SHA.

After, same filter (`Database!=SqlServer`, no SQL slot used, no container touched):

```
Passed!  - Failed: 0, Passed: 4641, Skipped: 12, Total: 4653  (7 m)      after.log
```

Delta accounted test by test: **+3**, all three the new wire facts named in §3. No test was deleted, skipped or
renamed. The three assertions that changed value (`samesite=strict` → `samesite=none` in two suites, plus the
new wire one) are the same three that Mutation A reds.

## 6. The reopen note

The ruling's `reopen_when` reads: *"the API moves to the same registrable domain, at which point the named
policy and the cross-site cookie are both unnecessary."*

Half of that is right and half repeats a false equivalence this plan already corrected once (`plan.md`,
correction of 2026-08-03, about the brief's false "or"):

- **The cookie half becomes unnecessary.** `SameSite` is a *site* rule, so `api.okam.no` beside `okam.no`
  shares the registrable domain and a `Strict` cookie attaches again.
- **The named CORS policy does not.** CORS is *origin*-scoped; a different host is still a different origin,
  so the wildcard is still refused against a credentialed fetch. Only a true same-**origin** serving (same
  scheme, host and port, e.g. a reverse proxy) removes both.

If the API moves to the same registrable domain, what this lane built that would need removing is exactly:

- one line — `SameSite = SameSiteMode.None` back to `Strict`;
- the comment paragraph at `GrowthPreferenceController.cs:28-37`, the four doc strings, and the spec sentence;
- one of the three new wire facts — `The_session_cookie_a_guest_receives_can_be_sent_from_another_site` inverts
  to assert `Strict`;
- the two existing `samesite=none` assertions revert.

What would **not** need removing: facts 2 and 3 of the new wire suite. `HttpOnly`, `Secure`, the `Path` scope
and the double-submit are true under either posture and are worth keeping under both. One nuance: under
`Strict`, `Secure` returns to being advisable rather than mandatory — the assertion stays true, its *reason*
changes.

## 7. Left for whoever lands this

`fact:growth.cookie.crosssite` reads `../OkamAPI-modules/Controllers/GrowthPreferenceController.cs`, which is
the **shared checkout**, currently on `lane/meals-grace-pins`. The fact flips the moment
`lane/pref-cookie-half` is in the tree that path resolves to; it cannot flip from inside this lane's worktree,
and checking out a different branch in a foreign lane's checkout is forbidden by the brief. The landing is the
orchestrator's step, exactly as it was for `L-CORS-CREDENTIALED-ORIGIN`.

Merge-order note: this branch and `lane/cors-followups` (`17c12c20`) both descend from `8e2b57de` and both
touch `GrowthPreferenceController.cs` — that lane adds `[EnableCors]` attributes on the actions, this one
changes one line inside `OpenSession` and rewrites the comment block above the constants. They are different
hunks and should merge without conflict, but the two together are the whole of
`named-cors-policy-plus-samesite-none`; landing either alone leaves the ruling half-built again.
