# L-THE-GIFT-CARD-REFUSAL-IS-PROVEN-OVER-HTTP — evidence

Backend trunk `668590cbe` → **`5c46187f3`**. Tier **5002 / 0 / 11**, exit 0, no abort line, `WebApi.dll`
mtime asserted to move. Landed with the atomic guard: the trunk was re-read **in the same command** as
the move and would have refused had it differed from the merge base. Nothing pushed.

## The harness CAN construct a principal — but the OAuth shape does not occur here

The brief said to read the harness first and return `blocked` if it cannot build the OAuth shape. It
can build principals two ways (`CreateClientAs` = the application's real JWT; `CreateClientAsModuleCaller`
= a hand-minted token with `unique_name` **and** `nameid` set to the same user id). Neither is the OAuth
shape, and a test could mint one — but it would be testing a shape that never reaches this controller:

| principal | `Name` | `NameIdentifier` | reaches `GiftcardController`? |
|---|---|---|---|
| app JWT (`GenerateJwtTokenAsync`) | user id (via `unique_name`) | absent | **yes** — bare `[Authorize]` → `JwtBearerDefaults` |
| OAuth login cookie (`OAuthLoginController:128`) | **phone number** | user id | no — scheme `OkamOAuthLogin`, read only by `OAuthAuthorizationController` |
| OpenIddict access token | `DisplayName` (phone is in `preferred_username`) | `sub` = user id | no — separate validation scheme, MCP surface |

**So the recorded justification for `ActorClaims` over `User.Identity.Name` — "for the OAuth principal
that value is a phone number" — does not apply at this endpoint.** It is true of the login cookie, an
internal step of the authorization-server handshake. The resolver is still correct and still the right
call; the reason given for it is what is wrong. That is why the wire test drives the principal that
occurs rather than the one described.

## The five arms (named from a `--logger trx`, not from a green summary)

```
Passed  The_holder_gets_past_the_ownership_gate_that_refuses_a_stranger
Passed  A_caller_who_does_not_hold_the_card_is_refused
Passed  An_id_that_belongs_to_no_card_is_refused
Passed  A_stranger_and_an_unknown_id_are_refused_with_the_same_bytes
Passed  A_stranger_cannot_learn_a_card_is_real_from_its_status
```

The byte-equal arm is the security property: both refusing is not the guarantee — a prober learns
nothing only if the two refusals are the *same* refusal. The status arm extends it to a card that
exists but is in a refusing state, which is what makes the ownership check's position above the status
guard a property of the HTTP surface rather than a comment.

**The holder arm asserts a difference, not a `200`.** A transfer has preconditions past ownership that
this file deliberately does not stand up, so asserting `200` would assert a fixture. It asserts the
holder's body is **not** the stranger's — the discrimination the caller resolution exists to produce.
Without it, a guard that refuses everyone passes every other arm.

## Mutation — killed on the exit criterion's own mutation

Restore in a `finally` **and** an `atexit` hook, bytes compared afterwards.

```
BASELINE                 total=5 failed=0
M1 caller not resolved   total=5 failed=1     (TransferGiftcard(..., null))
restored byte-for-byte: True
```

The count held at 5 in both runs, so neither is an `INVALID-RUN`. **It reds under the caller-resolution
mutation specifically — not only under a combined one**, which is a stronger result than the brief
anticipated, and it is the holder arm that reds.

## Decision check

Made before merging, via each open decision's `blocks:` field. None names this lane or the gift-card
surface.

## Teardown

One worktree, `git worktree add --detach`, removed with `rm -rf` plus `git worktree prune`. Both
tier-rewritten artifacts restored; `TestResults/` removed; only the new test file was staged. No
worktree holds the trunk.
