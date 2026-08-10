# L-EV-VIPPS-FALLBACK — the exit asks for a live run and a guest on a page; neither happened

Reason-shape hit: **(3)/(4) combined — the evidence proves something adjacent, and its own RETURN says the
exit's subject did not occur.** **This lane is NOT verified by this pass**, and no artifact was manufactured
toward it, because the exit is a C5 walk plus an external-provider round trip and neither can be closed by a
file. What this pass adds is three measurements the prior decline did not have.

## The `evidence:` line, preserved verbatim

    lane/ev-vipps-fallback-2 @ fc09be1d off feature/restaurant-modules 3579bbbc, worktree ../wt-evvippsfb2, local, unpushed - container-free tier (Database!=SqlServer) 4380 passed / 0 failed / 12 skipped, zero containers started - WebApi.Tests/Events/EventsDepositVippsFallbackTests.cs 11/11

## The exit, and the RETURN's own answer to it

Exit: *a **live** test-MSN initiate for a deposit returns a redirect and, **after approval in Vipps**, the
guest lands back on the deposit page reading paid.*

Its RETURN: *"NOT PROVEN, as the ruling accepts: nothing here reaches Vipps, and `Events:PublicBaseUrl` is
unset in every committed configuration on this branch, so the guest's approve-and-return leg is unverified."*
The lane body agrees: *"Only a live harness run decides this one."*

## Three things measured here, one of which is new

**1. The branch resolves and the suite is where it says it is.** `lane/ev-vipps-fallback-2` =
`fc09be1d4ba778201972a04f7e45bad9371936d1`, carrying `WebApi.Tests/Events/EventsDepositVippsFallbackTests.cs`.

**2. `Events:PublicBaseUrl` really is unset — checked rather than believed, and it is a near-miss.**
A plain `grep PublicBaseUrl` over the branch's committed configuration returns **two hits**, which looks like
the RETURN was wrong:

    appsettings.json:111              "PublicBaseUrl": "https://api.okam.no",
    appsettings.Development.json:3    "PublicBaseUrl": "http://localhost:5080",

**Both are under `"Mcp"`, not `"Events"`.** Parsed as JSON, the branch's entire `Events` section is:

```json
{ "DispatchEnabled": false }
```

So the RETURN's claim holds exactly as written, and the grep that appears to refute it is a section-blind
one. Recorded because the next reader will run the same grep.

**3. New: the lane's suite has since landed.** `WebApi.Tests/Events/EventsDepositVippsFallbackTests.cs` **is
present at the backend trunk `6d5328004`.** The serialization proof the lane produced — that
`merchantInfo.fallBack` survives the hop, measured by nulling the assignment and watching exactly one test of
4392 red — is therefore on the trunk and reachable by any reader. **That is a landing fact, not a
verification fact**, and it does not move the exit one inch: the field being on the wire is not a guest being
on a page.

## What the exit needs, and why no file can supply it

Three things, none of which is a test:

1. A **live test-MSN** initiate — the RETURN states plainly that nothing in this lane reaches Vipps.
2. `Events:PublicBaseUrl` **configured**, or the guest has no address to be returned to. The value is absent
   from every committed configuration on the branch; setting it is an owner act.
3. A **person approving in Vipps and reading the deposit page**. `C5.violated_when` names this exactly: an
   item may not be moved to verified whose only named evidence is a `.trx`, a suite count or a test name —
   and the only file-shaped token in this lane's evidence line is a test source.

**Recommended ruling: leave the exit alone.** It is a correct description of an unfinished thing. Softening
it to what the suite proves would convert a real C5 gap into a green line, which is the failure this program
exists to prevent. The lane should be blocked on the live harness and the `Events:PublicBaseUrl` decision,
with the landed suite noted as partial progress.
