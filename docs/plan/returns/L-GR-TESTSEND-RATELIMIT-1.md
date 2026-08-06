```
RETURN: L-GR-TESTSEND-RATELIMIT
brief: 752d7b6a
verdict: built
evidence: /Users/svendaneel/okam/wt-gr-ratelimit @ c96cd21e (lane/gr-testsend-ratelimit, off 801d36a3, local, unpushed) · artifacts/tests/lane-fast-tier.trx 4403/4391/0/12 · artifacts/tests/base-801d36a3.trx 4376/4364/0/12, measured myself from a clean checkout of the base
log:
WORKDIR: the brief's ../OkamAPI-modules is another lane's live worktree (lane/meals-grace-pins) — left untouched; I made my own off the sibling tip 801d36a3.
All citations VERIFIED, with two brief corrections. confirm-email is NOT on the sign-up path: sign-in requires a confirmed PHONE, and its only UI
callers are ConsumerApp SettingsPage + RewardMembershipModal. Identity Lockout IS configured (10/15min), but NOTHING anywhere calls
AccessFailedAsync — so the review's conclusion held while its reason did not.
NO PRODUCT RULING NEEDED, and that is a judgement rather than an evasion: the estate had already ruled every number. OAuthSms/Reservation cap a
code to a contact point at 5/recipient/15min; OperatorPinService caps guessing a short numeric secret at 10 failures then 15min. I applied those
to the same acts on the e-mail channel instead of inventing thresholds.
Guesses get a SEPARATE key space from sends — a throttled user can still fetch the new code the refusal tells them to request, so the throttle never takes away its own remedy.
WORST CASE, real user: a 6th send to one address inside 15min, or an 11th mistyped code, gets 429 + Retry-After and the outstanding code retired.
Nobody loses account access — e-mail confirmation sits on no login path.
FOLDED IN: new Random() and a bound that never issued 999999 -> crypto RNG over the full range; a spent budget now RETIRES the code. Existing
columns only — no migration, no schema, no address or IP in any log. 6/6 mutations red (filter branch, send, confirm, retirement, RNG, DI).
FOUND, not my subject and the most valuable thing here: AddMemoryCache() lived ONLY inside Program's MCP try/catch after two calls that can throw,
so an unrelated MCP failure silently deletes EVERY in-memory limiter estate-wide while the API stays up; now unconditional.
Lesser: SendEmailConfirmationCodeAsync ignores UpdateAsync's result; both 429s fall to admin-web generic copy (frontend). C5 unmet — no UI walk.
END RETURN
```
