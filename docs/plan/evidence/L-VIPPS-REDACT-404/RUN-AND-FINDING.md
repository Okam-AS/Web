# RUN AND FINDING — both clauses measured, and the H2 retraction recorded rather than buried

Produced by `agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION` (batch 2), 2026-08-09.
Reason-shapes hit: **no artifact existed** (four mutations were run and only ever spoken) **and the lane's
own RETURN retracts the premise of the exit's second clause** — so the finding is written down here instead
of the exit being quietly re-worded.

**The evidence line as the original agent recorded it, preserved because `plan verify` overwrites it:**

    OkamAPI worktree /Users/svendaneel/okam/wt-vippsredact, branch lane/vipps-redact-404,
    commit cb18cab4, base feature/restaurant-modules 3579bbbc

`cb18cab48` is an **ancestor of backend trunk `6d5328004`** (`git merge-base --is-ancestor` → yes), so the
code measured below is on the trunk, not only in a worktree.

## The instrument

`WebApi.Tests/Observability/CapabilityRouteTelemetryTests.cs`, 15 fast-tier facts, run from `WebApi.Tests/`
in `/Users/svendaneel/okam/wt-vippsredact` (clean before and after):

    dotnet test --filter "Database!=SqlServer&FullyQualifiedName~CapabilityRouteTelemetryTests" \
                --logger "trx;LogFileName=<name>.trx" --results-directory <this directory>/runs

Both of the exit's clauses are theory cases, and the trailing-dot deposit link the exit names by hand is
`[InlineData(".")]`:

- clause 1 — `A_deposit_link_an_email_client_mangled_reaches_telemetry_without_its_token(glued)` over
  `"."`, `"]"`, `">"`, `","`, `"%5D"`;
- clause 2 — `A_percent_encoded_route_value_reaches_telemetry_redacted(asWritten)` over `"+4791234500"`,
  `"%2B4791234500"`, `"%2b4791234500"`.

## The runs

| arm | mutation | total | **executed** | passed | failed | trx |
|---|---|---|---|---|---|---|
| baseline | none | 15 | **15** | 15 | 0 | `runs/baseline.trx` |
| **M1** | the unrouted branch removed — `Rewrite` drives entirely off bound route values again (the pre-fix shape) | 15 | **15** | 9 | **6** | `runs/mut-unrouted-branch.trx` |
| **M2** | M1 **plus** the fail-closed output check `Survives(...)` disabled — both safeguards off | 15 | **15** | 8 | **7** | `runs/mut-both-safeguards-off.trx` |
| **M3** | the routed replacement disabled (`UrlForms` loop fed an empty set) | 15 | **15** | 10 | **5** | `runs/mut-routed-replacement-off.trx` |
| restored | none | 15 | **15** | 15 | 0 | `runs/restored-green.trx` |

`WebApi.dll` mtime moved on every arm — 17:53:40 → 17:54:43 → 17:55:21 → 17:56:02 → 17:56:22 — and no arm
used `--no-build`. Executed count is 15 throughout, so every red is a kill rather than a void run. No
container started.

### M1 — clause 1 is pinned, and it shows the two fixes are layered

All five mangled-deposit-link cases red, plus the 405 method-mismatch fact, all with

    Assert.NotNull() Failure

**Read this carefully, because it is not the leak.** With the unrouted branch gone the redactor produces
nothing — and the *second* safeguard, the fail-closed output check, then **drops the URL** rather than
publish it. The operator loses the URL; the guest's token is still not published. M1 therefore proves the
unrouted redaction is load-bearing for **keeping** the URL, not that its absence leaks.

### M2 — the leak itself, reproduced

Turning off the fail-closed check as well publishes the credential, and the failure text is the defect
verbatim:

    A_deposit_link_an_email_client_mangled_reaches_telemetry_without_its_token(glued: ".")
    Assert.DoesNotContain() Failure
    Found:    6f1b0c9e-1d24-4f0a-9b77-2a5c8d3e41ff
    In value: https://api.okam.no/events/deposits/6f1b0c9e-1d24-4f0a-9b77-2a5c8d3e41ff.

— the guest's own deposit link, with one character glued on by an email client, whole token in the URL
Application Insights collects. The `"]"`, `">"`, `","` and `"%5D"` cases fail identically, the 405 case
publishes `+4791234500`, and `A_value_no_rule_removed_costs_the_url_rather_than_being_published` fails
`Assert.Null()` — i.e. under M2 the safeguard becomes the safeguard-shaped no-op its docstring warns about.

### M3 — clause 2's theory cases are falsifiable, not decorative

All three `A_percent_encoded_route_value_reaches_telemetry_redacted` cases red (`Assert.NotNull() Failure`),
along with the correlation fact and the anonymous-by-omission fact. So the percent-encoded arm is a real
pin: break the routed replacement and it fails.

## THE FINDING, for an owner rather than for a rewrite

**The exit's second clause describes behaviour that was never broken.** The lane's own RETURN says so —
`H2 OVERSTATED` — and the mechanism is checkable: the server percent-decodes into `HttpRequest.Path`
before routing, App Insights builds the URL from `Path.Value`, and `Uri.OriginalString` does not re-escape,
so `%2B4791234567` arrives as `+4791234567` on both sides and the pre-existing `Replace` already matched it.
The escaped forms matched anyway.

What was actually repaired on that half is a **different hole**: the *unchanged-URL check was fail-open* —
it asked whether the string had changed rather than whether the credential was gone, which is exactly what
a missed credential looks like. That is now `Survives(...)`, and M2 above is its falsifiability proof.

**Two readings of the exit, and this artifact does not pretend they are one.**

1. Read as an **observable about the estate** — *both a request that binds no endpoint and a percent-encoded
   route value reach telemetry with the credential replaced, shown by fast-tier theory cases including a
   trailing-dot deposit link* — the sentence is **true and now measured**, with a falsifiability proof for
   each half (M1/M2 for the first, M3 for the second).
2. Read as a **claim that both were holes this lane closed**, the second half is **false**, and no evidence
   could make it true. `instrumentless-exits.md` took this reading and declined on it.

This file closes reading 1 and **leaves reading 2 open for the owner**. Nothing here rewrites the exit to
fit its evidence; the retraction is recorded in full so a reader reaches it before the verification.

## A blocker this bears on, not cleared here

`plan.md` carries a blocker with `cleared_by: L-VIPPS-REDACT-404` and
`clears_when: an unmatched request and an encoded route value both redact, pinned by tests that fail when
either path is reopened`, with a note that **step two was owed**: "prove the green is real rather than
vacuous, the way the callback lane did by mutating its suite both ways". M1/M2/M3 above are that step —
both paths reopened, both red, restored green. **This lane may not clear a flag**, so it is named here for
whoever can.

## What this does not claim

- No rotation question is answered. The RETURN's position stands: the branch has never been deployed, so
  nothing is owed today, and this must close before it is.
- H3 (anonymous-by-omission endpoints — 61 beside 61 explicit `[AllowAnonymous]`, 5 on `InvoicesController`,
  9 on `WoltOrderController {orderId}`) is a separate exposure recorded by the lane and untouched here.
- Not C5: telemetry redaction has no operator journey to walk.
