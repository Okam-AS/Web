# FINDING — the falsifiability half holds; "on every platform" is still unmeasured, and the exit overclaims

Produced by `agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION` (batch 2), 2026-08-09.
Reason-shape: **the evidence proves less than the exit claims.** This lane is **declined again**, with the
missing case measured as far as one host can measure it. The exit is not rewritten.

**The evidence line as the original agent recorded it, preserved because `plan verify` overwrites it:**

    lane/ev-uri-relative @ 6a7bf75b (wt-evuri) · artifacts/lanes/L-EV-URI-RELATIVE/RUN.md

**Rescued to durability.** `RUN.md`, `m1-mutant.trx`, `m2-mutant.trx` and `m2b-mutant.trx` are committed at
`6a7bf75b6` but were citable only through the worktree `/Users/svendaneel/okam/wt-evuri`. They are copied
into this directory. (`fast-tier-clean.trx` is 26k lines and is left at the commit.)

## What is shown — clause two, the falsifiability one

`m1-mutant.trx`, re-read here rather than taken on report: `executed="79" passed="70" failed="9"`.
The mutation is *the absolute-http check deleted from `EventsGuestLink.PagePrefix`, leaving literally the
shipped pre-fix code*, and the nine reds are by name

- `The_composer_refuses_every_origin_that_is_not_absolute_http` for `/`, `/events`, `file:///srv/guest-web`,
  `javascript:alert(1)` and `//guest.example.test` — the composer theory;
- `An_origin_that_is_not_an_absolute_http_origin_is_refused_and_nothing_is_mailed` for `/`, `/events`,
  `file:///srv/guest-web` and `//guest.example.test` — **the mail path, coming back `Delivered == true`**,
  i.e. the guest is actually sent the `file://` link.

That clause is met, and it is met on a run, not on a claim.

## What is NOT shown — clause one, "on every platform"

`RUN.md` states its own scope in its header: *"Host: darwin (Unix). That is the whole point — the defect is
platform-shaped and is invisible on Windows."* There is no Windows run anywhere, and **no test in the tree
pins platform-invariance**. The universal was argued from the shape of the fix (it checks scheme, not
absoluteness), which is an argument, not a measurement.

### The missing case, measured as far as this host allows

The refusal in `Helpers/Events/EventsGuestLink.cs` is a **disjunction of two arms**, and those two arms are
exactly the two ways a platform's `Uri` parser can classify a relative origin:

```csharp
if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)
    || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
{
    throw new UriFormatException("Events:PublicBaseUrl is not an absolute http(s) origin.");
}
```

A temporary probe was **applied, measured and removed** (the tree is clean; `git status --porcelain` empty)
that drives 14 origins through the real `EventsGuestLink.DepositPagePrefix` and records which arm each takes.
Full table in `platform-arms.txt` beside this file. Summary:

    host = Unix / Darwin 25.5.0
    arm A (TryCreate SUCCEEDED, scheme not http/https) : 7 inputs  — /events, /, //guest.example.test/events,
                                                         C:\wwwroot\guest, \\server\share, file:///srv/guest-web,
                                                         javascript:alert(1)      (all parse as scheme `file`,
                                                         except the last as `javascript`)
    arm B (TryCreate FAILED)                           : 5 inputs  — events, ./events, http://, ht!tp://x, http://[::1
    ACCEPTED                                           : 2 inputs  — https://guest.okam.no, http://guest.okam.no/

**Both arms are executed on this host**, so neither is dead code, and the two Windows-shaped inputs
(`C:\wwwroot\guest`, `\\server\share`) are refused here too. That is strictly more than the original run
showed.

### Why that still does not close "on every platform"

1. **It is still one host.** On Windows the *same* relative input (`/events`) is expected to take arm **B**
   rather than arm **A** — and no run on any Windows machine exists to say so. The probe shows both arms
   work here; it cannot show which arm Windows picks, and a defect that only appears when a specific arm is
   taken on a specific platform is precisely the class this lane was opened for.
2. **The probe is gone.** It was temporary by design — this lane may write artifacts, not commit tests to
   another lane's branch. So there is **no platform-invariance pin in the tree**, and nothing would red if
   the disjunction were later collapsed to a single arm.

## What would actually close it, named so the next lane does not have to re-derive it

- **Either** a committed test asserting that a relative origin is refused *whichever* arm fires — e.g. a
  theory over `{"/events", "events", "./events", "C:\\wwwroot", "\\\\server\\share"}` asserting
  `UriFormatException` regardless of `Uri.TryCreate`'s answer, so collapsing the disjunction reds it on
  every host that runs the suite;
- **or** a Windows CI run of `EventsGuestLinkOriginTests` with the trx committed;
- **or** an owner ruling that "on every platform" was never meant as a measurement and the exit should read
  what the estate can actually observe. **That is a ruling, not an edit this lane may make** — this program
  has already learned that an exit rewritten to fit its evidence proves nothing.

## Two flags the original RETURN raised that remain open

1. **Only one guest-link path exists on this branch.** `DepositPagePrefix` / `ProposalPagePrefix` have no
   production caller here until `lane/ev-vipps-fallback` lands, so "both paths compose byte-identically" is
   true of one path today.
2. A suite run rewrites the committed `artifacts/journeys/ev-dietary/run-sheet.*` with today's date, so no
   full run leaves a clean tree and real edits can hide in that churn.
