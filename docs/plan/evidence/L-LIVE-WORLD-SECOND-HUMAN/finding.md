# L-LIVE-WORLD-SECOND-HUMAN — the boundary, re-measured at the trunk, and the owner act it ends at

**Exit:** *`live-world.sh` provisions two distinct signed-in identities without sending an SMS, shown by a
capture in which one identity publishes and the other acknowledges in the same run.*

**Reason shape hit: (4) — the exit cannot be closed by a file, and the estate is missing a precondition
only an owner can supply.** Batch 2 declined it on two grounds and both hold: the lane's own RETURN says
*"NO CAPTURE: this lane has no SQL slot, so no live world was stood up"*, and the second clause is a person
completing a journey, which **C5** says a file never closes. **Nothing was built toward it.** What follows
is the boundary re-measured — at trunk `6d5328004`, not at the `8e2b57de` the evidence line cites — so
`F-LIVE-WORLD-ONE-HUMAN` can read it without re-deriving it.

**The `evidence:` line, preserved:**
`OkamAPI-modules feature/restaurant-modules 8e2b57de -- Controllers/UserController.cs:178-180 +
Helpers/ServiceCollectionExtensions.cs:182 + Services/UserService.cs:540,551,565`

## Door by door, at `6d5328004`

`Controllers/UserController.cs` `Login` is where a no-SMS sign-in either happens or does not, and it holds
**two independent configured pairs**, either of which yields a signed-in identity with no SMS:

```
var verifiedDemoUser  = _userService.IsDemoPhoneNumber(user.PhoneNumber)   && _userService.IsDemoVerificationCode(model.Token);
var verifiedPowerUser = _userService.IsPowerUserPhoneNumber(user.PhoneNumber) && _userService.IsPowerUserVerificationCode(model.Token);
var verified = verifiedDemoUser || verifiedPowerUser || await _userService.VerifyTokenAsync(user, model.Token);
```

| door | keys it reads (`UserService.cs:687-691`) | state |
|---|---|---|
| the demo pair | `AppSettings:DemoPhoneNumber` + `AppSettings:DemoVerificationCode` | **configured and working** — this is the one credential the manager spends today |
| the power-user pair | `AppSettings:AdminUserPhoneNumber` + `AppSettings:PowerUserVerificationCode` | **the phone ships as a placeholder sentence, not a number** |
| `IsNoSmsPhoneNumber` (`UserService.cs:707`) | two hard-coded numbers, no config | **a lock-out, not a bypass** — the prior lane read it correctly |

**Why the third is a lock-out and not a shortcut, stated so nobody tries it again.**
`SendVerificationTokenAsync` generates the token and then `if (IsNoSmsPhoneNumber(user.PhoneNumber)) return true;` — it returns success **without sending**. `Login` still calls `VerifyTokenAsync`, which is
`_userManager.VerifyChangePhoneNumberTokenAsync` (`UserService.cs:575`). So the code exists, is never
delivered, and is never bypassed: that identity can never complete a sign-in. It is also two personal
numbers in a source comment, which is a separate matter from this lane.

**Why the second door needs an owner and not a patch.** `Helpers/ServiceCollectionExtensions.cs:181` (the
evidence line's `:182`, one line adrift at the trunk) sets
`config.User.AllowedUserNameCharacters = "+0123456789"`, and the account's user name **is** the phone
number. A placeholder sentence therefore cannot become an account: Identity rejects the characters. The
owner act is exact and is the whole remaining boundary — **set `AppSettings__AdminUserPhoneNumber` to a
digit phone number** (and have `AppSettings__PowerUserVerificationCode` set), after which
`live-world.sh` has **two** distinct no-SMS identities and the exit's first clause becomes reachable.

*No credential value appears in this file, deliberately: C7, and the estate's 2026-07-30 lesson that
redacting a message without rotating the credential fixes nothing.*

## The third wall, which the first clause does not mention and the second cannot survive

Even with two identities, *"the other acknowledges"* does not run. Endpoint 44 is
`POST /workforce/me/publications/{publicationId}/acknowledgements` on `WorkforceMeController`, and its
service path calls `EnsureStageWriteEnabledAsync(engagement.StoreId, WorkforceFeatureFlags.SelfService, ct)`
(`Services/Workforce/WorkforceSelfService.cs:259` and `:326`). The descriptor is

```
new FeatureFlagDescriptor(SelfService, "Workforce", "Self-service", false)   // WorkforceFeatureFlags.cs:91
```

— **default `false`**. So the acknowledge leg needs `workforce.selfservice` enabled **for the store the
engagement belongs to**, per store, before a second human can do the only thing the exit asks of them.

And the roster half the lane body already recorded still holds: the live world's people are Astrid Vik,
Ingrid Moen and Jonas Lie, with **no claimed engagement** — a second sign-in with no engagement resolves
to no staff membership, and every `/workforce/me` path resolves the caller through the person's engagement.

## What is owed, in order

1. **owner:** `AppSettings__AdminUserPhoneNumber` set to a digit phone (+ `PowerUserVerificationCode`);
2. **a lane with a SQL slot:** stand the live world up, enable `workforce.selfservice` for the seeded
   store, and give the second identity a claimed engagement;
3. **then, and only then, a person walks it** — publish on one identity, acknowledge on the other — which
   is C5 acceptance and is not a file.

**Verdict: not closable, and not closable by this program at all until step 1 happens.** The lane's real
output is the boundary above; it is now somewhere `F-LIVE-WORLD-ONE-HUMAN` can read it.
