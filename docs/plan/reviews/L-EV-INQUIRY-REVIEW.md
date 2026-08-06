# Fable review — L-EV-INQUIRY-GATE, read as a security surface (2026-08-02)

Read-only review of `lane/ev-inquiry-gate` @ `8ecb47df` and `lane/fe-ev-inquiry-gate` @ `f7695bc`. Nothing
edited, nothing run.

## 1. Verdict — sound-with-conditions

**The gate is real, correctly placed, correctly deny-closed, and the refusal is genuinely uniform at every
observable layer statically verifiable** — one throw site, one factory, one renderer, **identical query
count on both refused paths.** The frontend withdraw-versus-survive distinction is real and pinned in the
two directions that matter.

**And it removed a pre-existing oracle the lane did not claim credit for:** before this commit the
anonymous endpoint answered a **distinguishing** not-found for a nonexistent id.

Conditions: two commit-message claims are overstated, the mutation checks are process assertions with no
artifact — **re-derived by reading and both exact** — and **a cheaper authenticated enumeration channel
exists** that bounds what the uniform refusal can ever buy.

## 2. Can a venue still be distinguished from a non-venue?

**Not through this endpoint by any single anonymous request.**

**Status** — 404 both ways, from a single throw site. **Code and body** — identical by construction: same
factory, same renderer, same type URI, title, detail and code. **Headers** — no difference; the throttle
sits before the gate and hits all ids uniformly.

**Timing is the strong result.** The condition short-circuits, so **both refused classes execute exactly
one identical indexed lookup** and then throw; the existence query runs **only when the flag answers
true.** A declined venue and a nobody id differ only by index-seek hit versus miss. The flag cache is
per-call-scope, so there is **no cross-request cache signal**. One residual seam: a **dangling override
row** — flag on, store gone — does two queries before the same refusal, distinguishing only *a deleted
store that once had the flag on*, by timing alone, and a test pins that branch to the uniform code.

**The slug path changes what the uniformity is worth.** Store existence by numeric id is **already fully
public** on two anonymous routes. So the not-found half **protects an already-public fact.** The refusal is
**not moot** — it guarantees the Events surface adds no oracle of its own, and the property survives if the
stores surface ever tightens — but its honest value is narrower than *prevents walking the id space*. **The
secret that matters is protected only by the cost of a 200, exactly as the lane conceded.**

**The cheaper channel the lane did not discuss.** Any **authenticated** user — and signup is open — can
walk the admin route and read the module refusal against a plain forbidden, **silently distinguishing
opted-in stores, with no enquiry row created and no throttle.** Same fact a 200 marks, but free and
invisible to the venue. Pre-existing, untouched here, **and it is the actual residual enumeration
surface.**

## 3. Defects, most severe first

1. **Pre-existing blocker, confirmed unfixed and unworsened: the public accept and decline writes are
   ungated per store.** That service takes no gate at all; both operations are state-changing, anonymous,
   and reachable with only the outer switch on. This lane's diff touches neither file. **Its gate is the
   natural home for the fix** — require the collaborator the same way, with no defaulted-open parameter,
   and consult it after token resolution.
2. **Claim inaccuracy — "the admin path keeps its distinguishing refusal, on every admin route" is not
   true as written.** Through HTTP this controller's admin routes can **never** answer it: the guard
   refuses flag-off and nonexistent stores alike with the module code, and a dangling store yields
   forbidden. The service-level throw is **dead code on the HTTP path.** Four sibling controllers do return
   it, but only in the near-unreachable dangling state — **and note the asymmetry: one answers forbidden
   where its siblings answer not-found for the identical state.** All variants err toward uniformity, so
   this is a record defect, not an exposure.
3. **Claim inaccuracy — "every per-store case asserts the module switch is on first": only two of four
   do.** The other two are **safe by construction**, because the world factories hardcode it — **so the
   trap is avoided by the factory, not by the stated discipline.**
4. Minor, frontend: validation-refusal survival is **real but unpinned** — only throttle survival is
   tested; the rest rests on reading.
5. Note: the throttle mapping is **mocked out** in the page tests, so that test proves the page's handling
   of the shape, not the client's production mapping.

## 4. Assertions that could pass against broken code

- **The enumeration pin compares code, status and message but not the extensions.** A regression splitting
  the refusal into two throw sites with identical code, status and message but **different extensions**
  would pass the pin while being wire-distinguishable. Impossible in the current single-throw shape.
- **The no-residue test would keep passing for the wrong reason** if its world factory ever regressed —
  it lacks the switch assertion its siblings carry.
- The accepted-pair test proves the service honours a stub's true; that production actually serves the flag
  per store rests on a derived-set rule covered by a different suite.
- **Both mutation claims are process assertions with no artifact.** They were **re-derived statically and
  both are exact** — the named mutations red precisely the named tests and no others — **but nothing in the
  tree records a run, and the repo's own guidance documents how a stale-binary mutation check silently
  lies.** Treat them as re-derived, not as receipts.

## 5. What could not be determined

Runtime timing — indistinguishability is established from **query-shape identity, not measurement**; a
wire-level confirmation of equal latency distributions remains unproven. Whether the mutation checks were
actually executed against a fresh binary. Whether the global limiter meaningfully throttles the
authenticated enumeration channel — **the per-IP inquiry limiter demonstrably does not cover it.** And
suite-green status of either worktree.

**Every claim in the brief verified accurate**, including that the pre-lane code checked only existence and
answered a distinguishing refusal publicly, that the frontend comment pre-claimed the gate, that the
sibling's defaulted-open gate exists as described, and that **the single-constructor pin holds** — it reds
on any added public overload, and the container cannot select a non-public one.
