# Fable review — L-GR-CONFIRMED-EMAIL (2026-08-02)

Read-only review of `lane/gr-confirmed-email` @ `801d36a3`, built on the unmerged guard lane. No file
edited, no suite run.

## 1. Verdict — sound with conditions

**The clause is the right fix, correctly written, and the lane's account is accurate in every claim
checkable against the code.** The confirmation flag is required alongside the address equality, the account
row is loaded once and four refusal reasons collapse into **one static, address-free 403**, the
null-address branch is ordered so it cannot dereference, and the recipient is still composed from the
account rather than the request. **The seed moved with the clause rather than being relaxed**, and the
receipt is unusually honest — it names the SQL tier as never run, the mutations as outside the green
number, and the address-swap path as read-but-not-driven.

**The conditions, in order of weight.** The proof the clause depends on is **brute-forceable**. The new
seed parameter has **no caller**, and its doc asserts one that does not exist. A pre-existing pin is now
**over-determined**, so a clause could be deleted with nothing going red. And the *one error code* rationale
is **false as stated**.

None of this makes the lane worse than what it replaces. But **it is the difference between "§ 15 is
closed" and "§ 15 now costs an attacker an afternoon" — and the commit message claims the former.**

## 2. Is § 15 closed?

**Not absolutely. Narrowed from two requests to any address, to roughly 450,000 requests to any address.**

**Test-send** — the guard is sound. **Its premise is not.** Confirming an email compares a plaintext
six-digit code with **no attempt counter, no lockout, no rate limit**, the code is not invalidated on a
wrong guess, and a fresh one can be minted forever. Even odds at around 450,000 attempts — **about seventy
minutes at a hundred requests a second.** An admin can still put marketing content in a stranger's mailbox;
it now costs a script.

**Dispatch** — consent-proven, and still **actor-unbound**: a mass send names the approver, not the sender.
Separate blocker.

**Double-opt-in confirmation** — reaches any typed mailbox **by design**, because that *is* the mechanism
that proves an address. Fixed template, no caller-controlled text, throttled per-address and per-IP. Not a
marketing route; a bounded subscribe-bombing surface.

**Privacy notice** — no. The address is decrypted from an existing contact point, and requests can only be
filed through a token minted inside dispatch. **There is no admin capture endpoint**, so an admin cannot
originate one to an address of their choosing.

**A fifth? None** — exactly four submission sites exist, and a seam scan **walks method IL** to prove no
type outside the module's namespace touches the provider at all. **That scan does not constrain a fifth
appearing inside the namespace.**

**Two more paths worth naming.** The confirmation-code route itself lets any authenticated user, unrate-
limited, make the platform mail a code to any address repeatedly — fixed content, so not a § 15 route, but
**a mail cannon, and now the load-bearing dependency of the Growth guard.** And **nothing ever expires or
re-checks the confirmation**: a confirmation made against a since-recycled mailbox still authorises a
test-send today.

## 3. Defects, most severe first

1. **The confirmation gate is brute-forceable.** No attempt counter, no lockout on that path, no rate
   limit, and the code is generated from a non-cryptographic source. **Condition on merge: the running
   rate-limit lane must cover the *guess* entry point, not only the address write.** If it covers only the
   send route, **this lane's central claim does not hold.**
2. **The new seed parameter has zero callers, and its doc names one that does not exist.** All sixteen call
   sites take the default; the pin it claims to serve mutates the entity directly instead. **The commit
   message repeats the same false claim.**
3. **The deny-closed pin is now over-determined.** Its subject is seeded with no address *and* an unset
   flag, so the flag check short-circuits first — **delete the null-address clause and the whole fast tier
   stays green.** That is a new instance of exactly the shape this lane was fixing, introduced by the same
   change. One line fixes it: make the seeded user confirmed, so the test measures its own subject.
4. **The stated reason for the shared error code is unfounded.** The guard queries only the caller's own
   row and never touches another, and the caller can already read both fields about themselves. **The
   decision is still right** — minimal disclosure, and the refusal is genuinely indistinguishable — **but
   the recorded rationale is wrong**, and a future reader may preserve the merge believing it prevents a
   cross-account oracle.
5. **Deny-closed reachability is thinner than ruled.** The confirm path is genuinely live end to end — but
   **the only UI call site in the whole estate is the consumer app.** Neither admin surface calls it. So a
   phone-signup admin must confirm through the consumer app on the same account or hit the API directly.
   Not a dead end; **"a live product path" for an admin overstates it.**
6. No audit trail for the act — confirmed, and separate.
7. Test-send consults no suppression list, so a hard-bounced or erasure-suppressed own address still
   receives a submission. Their own address, so § 15 is untouched; the exposure is deliverability.

## 4. Assertions that could pass against broken code

- The over-determined pin above — **the only assertion in the lane measuring a different clause than it
  claims.**
- A serialisation check that cannot fail for any mutation of the guard, since the message is a compile-time
  constant. A real guard against future interpolation; **not evidence about this change.**
- A pre-existing lifecycle assertion against the fake provider, which **accepts everything and has no
  failure mode** — it proves the service reached a fake, nothing more. Survives here only as a positive
  control.
- **The new pin itself is correctly shaped, and no broken guard could be constructed that it passes
  against**: refusal asserted, provider proven **never called** rather than merely not-accepted, composed
  recipient asserted, and a byte-identical served half **differing by one column** is what makes it
  non-vacuous.

## 5. What could not be determined

The two mutation runs — **no artifact records them, and the run note says so explicitly.** Both are
consistent with the code on independent reading, and the four expected reds were each named — **agreement
by reading, not verification.** The SQL tier, which has still never run against any commit in this chain.
**Whether the concurrent rate-limit lane covers the guess entry point — the condition the merge should turn
on.** Real-world brute-force feasibility against the deployed host, since the application layer imposes no
limit and what sits in front of it is not visible from the repository.

**None of this is live exposure today** — the module is dark by default and the provider defaults to a
fake. **It is a go-live gate.**
