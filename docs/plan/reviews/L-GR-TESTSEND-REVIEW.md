# Fable review — L-GR-TESTSEND-GUARD (2026-08-02)

Read-only review of `lane/gr-testsend-guard` @ `5719fc96`. No file edited, no suite run.

## 1. Verdict — NOT SOUND

**The lane's headline claim — that a test-send reaches the signed-in administrator's own account address and
nowhere else — is false as shipped.** The binding resolves the profile email **without requiring it to be
confirmed**, and that column is a **self-asserted field any authenticated user can set to any address in one
request** — the send-confirmation-code route persists the new address *before* any code is entered, with no
uniqueness constraint and no rate limit.

So the markedsføringsloven § 15 route is **not closed**. It is narrowed from *one request to any address* to
**two requests to any address, one at a time.**

The rest of the lane is correct and well-reasoned: the ordering is right, composition-from-the-account is
right, the refusal to add a consented-contact rule is right — **for one more reason than it gave** — the four
submitters are real, and it wrote no substituted-gate wire test. But the one control this lane exists to add
does not hold, and **the estate has the exact precedent one file over**, where a membership service requires
the confirmation flag with the comment *"A profile email a user can set to anything proves nothing."*

The fix is one clause. **The claim as written must not be carried into any compliance narrative until it
lands.**

## 2. Every path to an address — four submitters, no fifth

| Path | Consent-gated? | Actor-bound? | Verdict |
|---|---|---|---|
| **Test-send** | No — deliberately, and correctly | **Nominally yes, defeated** — the actor is required and is the subject of the check, but the address it resolves to is unverified | **Broken.** Reaches any mailbox in two requests |
| **Bulk dispatch** | **Yes** — final per-recipient re-check, frequency cap, suppression, shred check; mints the unsubscribe pair before submitting | **No** — the dispatch call takes no user id and the controller passes none | Sound on consent. **Attribution gap:** the person who pressed dispatch is never named — only the approver, who can be a different person |
| **Double-opt-in confirmation** | N/A — it *is* the consent-acquisition step; the body carries no marketing content | No — anonymous by design | Sound. Controlled by the module flag, a per-address and per-IP limiter, and single-pending supersede. **This is the estate's other arbitrary-address mail path**; the lane's claim survives only because it says *marketing content* |
| **Privacy notice** | No — correctly; an article 15/17 obligation, not marketing | **Yes** — required at the controller and again at the service | **Sound, and it is the pattern test-send should copy:** the address is composed from the contact point's own encrypted record, never from the request, and a contact point only becomes sendable by surviving double-opt-in |

## 3. Defects, most severe first

**D1 — the § 15 hole is open.** Two requests as the signed-in store admin: set the profile email to the
victim's address (persisted unconfirmed, no uniqueness, no rate limit), then test-send to it. The guard
matches and marketing content goes to the victim. **Store-admin membership keys on the user id, not the
email, so nothing is lost by the swap; it is reversible; and the test-send route has no rate limit.**
*Side note, out of lane:* the first step also makes the core product an unrate-limited emailer of six-digit
codes to arbitrary addresses.
**Named fix:** require the confirmation flag alongside the email, matching the existing precedent. Then the
test support must seed it — **every positive control reds until it does** — plus one new pin: an admin whose
profile email is set but unconfirmed cannot test-send to it. **Without that pin the fix has no evidence.**

**D2 — the deny-closed judgement fails, in the direction the lane did not consider.** Deny-closed is
defensible only if the denial is real. As shipped, a phone-only admin **lifts their own denial to any address
in one request** — so the route reads as deny-closed and is not, which is worse than either a clean deny or a
confirmed-address rule. With D1 fixed the answer becomes genuinely defensible: confirming an email is a live
product path, so it is a real onboarding step rather than a dead end.

**D3 — dispatch, the path that mails the whole audience, is not actor-bound either.** Out of scope, but it
**undercuts the lane's own framing**: test-send was called the only newsletter write whose controller passed
no user id, and that is not true. Dispatch is approval-gated, so a name exists — but it is the approver's,
not the sender's. With no Growth audit ledger, a mass send has no attributable trigger.

**D4 — an overstatement in the commit message**, worth correcting before it is inherited: the two halves of
the guard are **not symmetric.** With the service-side requirement removed the lookup still denies a blank
actor.

## 4. Assertions that could pass against broken code

**A1, the important one: all four new tests, plus both amended pre-existing ones, pass with D1 fully open** —
because the shared test support seeds the email **without the confirmation flag**. The suite therefore
encodes *"an unconfirmed profile address is an acceptable test-send target"* as the expected behaviour.
**This is the exact shape the estate has been hunting:** the pin measures *the address equals the profile
field*, not *the address is provably the admin's*, and the two differ by one attacker-controlled write.

**A2.** The unattributed-actor test is non-vacuous but proves **the error shape, not the safety property** —
delete the service guard and the route still refuses and still mails nothing, with a different code.
Defence in depth, correctly placed; not a second lock on the hole.

**A3.** A test says *with the module genuinely live* while using an all-on fake rather than the store-backed
flags. The substitution is permissive so it cannot manufacture a false refusal — but *genuinely* is
inaccurate.

**A4** (pre-existing). The test principal carries **both** name claims; real fleet tokens carry only one. The
wire pins therefore exercise a limb production does not use.

## Claims checked and found accurate

Four submitters and no fifth, by exhaustive sweep. **No substituted-gate wire test crept in** — the only one
in the new file is a direct service call, and the cited precedent exists and says what the lane says it says.
**The provider assertions are the right shape** — never-called plus a composed recipient, never *a mail was
sent*. The ordering does achieve concealment: cross-tenant and absent are byte-identical, and the amended
isolation pin was a correct repair rather than a weakening.

**Judgement call 1 is right for a reason the lane did not give:** a consented-contact test-send would ship
**with no unsubscribe header pair**, because the test-send submission sets no headers where dispatch does.
Marketing mail to a consented contact with no working opt-out is independently unlawful.

**The mutation record is two independent controls plus one shape pin — but the three counts are not
comparable.** Two reds come through different routes and only one reaches the controller, so the
tenant-isolation claim is real. The third reds **one method's three parameter rows** and changes no wire
behaviour. Presenting all three as "reds 3" flattens a real asymmetry.

## 5. What could not be determined

Build and suite status — read rather than run; the mutation red-counts are corroborated by reading only, not
reproduced. **Live exposure today:** the mail provider defaults to a fake and no deployed configuration
binding the real provider was found here, so **D1 is a go-live blocker rather than confirmed live exposure**
— but both gates are intended to open. And whether the exploit has ever been executed is **unanswerable**:
Growth has no audit ledger, and the email column is overwritten in place with no history.
