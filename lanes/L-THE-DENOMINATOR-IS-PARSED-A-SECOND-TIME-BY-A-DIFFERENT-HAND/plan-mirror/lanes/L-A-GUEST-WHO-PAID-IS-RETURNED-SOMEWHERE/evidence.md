# L-A-GUEST-WHO-PAID-IS-RETURNED-SOMEWHERE — evidence

**LANDED.** Backend trunk `1c71ae951` → **`976489141`** (merge of `lane/ev-vipps-fallback` @
`9e3a607bb`), clean, no conflicts. Non-SQL tier **4992 / 0 failed / 11 skipped**, mutation **KILLED**.
Nothing pushed.

## The defect is LIVE at the trunk — and its mechanism is not what the brief says

The brief describes *"the `fallBack` address and the emailed link are composed separately and drift."*
**Measured at `1c71ae951`, they do not drift, because only one of them is composed at all.**

`EventsDepositPaymentPortAdapter.Initiate` builds the Vipps order with exactly five properties:

```
StoreId, Amount, OrderId, TransactionText = "Event deposit", OnBehalfOfMsn = null
```

**`FallBack` is not among them, so it is `null`.** And `VippsService.Initiate:109` does
`FallBack = model.FallBack` — it copies straight through. So the Events deposit rail sends Vipps
`merchantInfo.fallBack = null`.

The Events deposit adapter was **the only Vipps caller on the platform that supplied no return
address**, verified by sweeping every assignment repo-wide:

| caller | what it sends |
|---|---|
| `Controllers/VippsController.cs:407` | `GetFallbackUrl(model.IsApp, vippsOrderId)` |
| `Mcp/Services/McpShoppingService.cs:442` | `GetVippsFallbackWebPath(vippsOrderId)` → `/vipps?vippsOrderId=` |
| `Services/VippsService.cs:109` | copies `model.FallBack` through to `merchantInfo.fallBack` |
| **`Services/Events/EventsDepositPaymentPortAdapter.cs`** | **nothing — null** |

So the live defect is **worse** than drift, not milder: a guest who completes an Events deposit is
returned nowhere at all, not to a stale-but-real address. The mail path *does* compose an address
(`EventsEmailNotificationDelivery.cs:142`, `_settings.PublicBaseUrl.TrimEnd('/')`), so there was exactly
one composed address and none on the payment side.

**This is why the brief's own warning was worth obeying.** The ranking lane read the branch from its
diff against its merge-base, which establishes what the branch *changes* — the branch does introduce
both compositions from one source, so from the diff it looks like a de-duplication. It is in fact the
addition of a return address that never existed on this rail.

## Is the branch still the right fix? Yes, and it is not stale

`9e3a607bb`'s base `de1e5c5e9` is **182 commits** behind the trunk — but **neither file it changes has
been touched in any of them**:

```
Services/Events/EventsDepositPaymentPortAdapter.cs   0 commits since de1e5c5e9
Services/Events/EventsEmailNotificationDelivery.cs   0 commits since de1e5c5e9
```

So the patch applies to exactly the code it was written against, and the merge was clean. Rebuilding
the fix would have produced the same thing with less review behind it.

## The single source

**`Helpers/Events/EventsGuestLink.cs`** — new, and the only place the guest-facing page shape and its
origin validation live. Both callers now compose from it:

```
Services/Events/EventsDepositPaymentPortAdapter.cs:463
    EventsGuestLink.DepositPagePrefix(_settings.PublicBaseUrl) + deposit.PublicToken.ToString("D")
Services/Events/EventsEmailNotificationDelivery.cs:144
    EventsGuestLink.PagePrefix(_settings.PublicBaseUrl, … DepositSegment : ProposalSegment)
```

It returns a **prefix** and lets each caller append the token, which reads worse than taking the token
— and the file explains why: `CredentialCompositionSweepTests` finds a credential composition by
spotting a member read of a credential-named property in the same statement that builds the string.
Taking the token as a parameter would move the concatenation away from any member read, so that
security sweep would see nothing to hold and its declared exemption would have to be deleted as stale
— retiring a real check while every suite stayed green. The shape and the origin validation live in one
place; the final append stays visible to the sweep.

It also validates the **scheme**, not merely absoluteness, because on Unix
`new Uri("/events/deposit/", UriKind.Absolute)` succeeds as `file:///events/deposit/` — a relative
`Events:PublicBaseUrl` would silently produce a `file://` link that no mail client opens and Vipps
rejects, and on Windows the same value throws, so the defect is invisible on a developer machine.

## The test meets the bar the brief set

The brief required a test that reds when the two are **composed separately**, not one asserting they
are equal today. `The_fallback_is_the_same_address_the_outbox_mails_the_guest` does exactly that: it
takes the fallback from the **adapter's** `Initiate` and the link from the **real mail delivery path**
(`EmailDelivery(mail).DeliverAsync(row)`), then asserts byte equality. Its own docstring states the
distinction — it asserts *"against the address the mail path actually composes rather than against a
second call to the shared composer — which would only prove the composer is deterministic."*

`The_serialized_vipps_body_carries_the_fallback_as_merchantInfo_fallBack` covers the hop that would
otherwise let a "fix" land on a field that never reaches Vipps: adapter → `VippsCommonModel` →
the JSON `VippsService` posts, with the HTTP edge captured and no request leaving the process.

Eight arms in total, including two refusal arms — `Initiate` refuses **before calling Vipps** when
there is no origin to return the guest to, and the refusal names the setting and **never the deposit
token**.

## The decision check, made before merging

Using each open decision's `blocks:` field in `plan.md`. **Sixteen decisions are open; none names this
lane or the Events deposit rail**, so the branch was free to land on that axis.

(Noted in passing: `D-IS-A-SCRIPT-IN-AN-EVIDENCE-DIRECTORY-A-RECORD-OR-A-DRIVER` is now open, blocking
`F-THE-RUNNER-GUARD-SWEEPS-EVERY-DIRECTORY-EXCEPT-THE-ONE-RUNNERS-LIVE-IN` — that is the census hold
from the previous lane, now a decision rather than an open question.)

## Tier — measured at both ends, so the delta is accounted rather than assumed

Run from `WebApi.Tests/` with `--filter "Database!=SqlServer"`, each preceded by a build whose
`WebApi.dll` mtime was asserted to move, each log grepped **above** the summary for an abort line.
Neither had one.

| | tier |
|---|---|
| trunk `1c71ae951` (measured, not carried over) | **4980 / 0 / 11** |
| composed tip `976489141` | **4992 / 0 / 11** |
| delta | **+12 passed, +12 total, +0 skipped** |

**Every test accounted for.** Running the new suite by name executes exactly twelve —
`FullyQualifiedName~EventsDepositVippsFallbackTests` → `Passed: 12, Total: 12` — so the +12 is that
suite and nothing else moved. The other files the branch touches are two-line signature updates that
add no arms.

That by-name run also answers a question the aggregate cannot: **the new arms actually executed.** A
`dotnet test` log names failed and skipped tests only, so twelve silently-absent arms and twelve
passing arms produce the same green summary.

## Mutation — killed, and the mutation is not synthetic

`mutation-proof.py`, output in `mutation-proof.txt`.

**M1 deletes `FallBack = fallBack,` from the adapter, which reproduces trunk `1c71ae951` byte for
byte** — at that trunk the initializer sets five properties and `FallBack` is not among them. So this
is not a contrived variant: a red proves the new arms catch the *live* defect.

```
BASELINE (unmutated)   total=12 failed=0 rc=0
M1                     total=12 failed=5 rc=1     restored byte-for-byte: True
KILLED: 5 of 12 arms red under the trunk's own behaviour, and the file is back.
```

Three assertions carried by the runner rather than assumed:

- **The build ran.** `--no-build` measures the last assembly built, so writing a mutant and running
  `--no-build` measures the binary *without* it and every mutation reads green. `WebApi.dll`'s mtime
  must move.
- **The tests ran.** A filter matching nothing exits 0 having run nothing, which reads as *survived*.
  The count must be non-zero **and equal to the baseline** — 12 in both runs here, so neither is an
  `INVALID-RUN`.
- **The file came back.** Restore is in a `finally` **and** an `atexit` hook, and the bytes are
  compared to the buffer afterwards. Verified on disk after the run: one occurrence of the anchor, and
  `git diff` on the adapter is empty.

**One correction to the runner, made mid-lane.** The first attempt fired `STALE-BUILD` on the
*baseline*, which was the guard misfiring rather than a real staleness: MSBuild legitimately skips a
project whose sources are older than its output, so an unmutated run correctly recompiles nothing. The
fix is to `touch` the source before every build, which obliges the compiler to run — after which a
mtime that fails to move is a genuine staleness. Recorded because the guard would otherwise read as
broken to the next person.

## I moved the trunk by accident, and put it back

**Correcting my own first draft of this file, which claimed the trunk was never moved.** It was.

The worktree was created with `git worktree add <path> feature/restaurant-modules`, so it held the
branch **checked out** — and the merge commit therefore landed *on* `feature/restaurant-modules`.
`git reflog feature/restaurant-modules@{0}` shows it as `commit (merge)`. This is the identical trap I
reported out of tranche five, where a rescue commit moved the trunk the same way; knowing about it was
not enough to avoid it, because `git worktree add <branch>` is the ordinary invocation and the
consequence is silent.

It was caught by the end-of-lane state check — printing the trunk SHA and the worktree's branch rather
than assuming — which is why that check is worth running even when nothing seems wrong.

**Put back, losing nothing:**

```
git branch lane/ev-vipps-fallback-landed 976489141   # preserve the merge
git -C <worktree> checkout --detach                  # free the ref
git branch -f feature/restaurant-modules 1c71ae951   # restore
```

The trunk stands at **`1c71ae951`**, untested work is off it, no worktree holds it, and the merge is
reachable at **`976489141`** on `lane/ev-vipps-fallback-landed`. The worktree is left in place,
detached, so the tier can run without recomposing.

**The generalisable fix**: a landing worktree should be created detached
(`git worktree add --detach <path> <ref>`) and the trunk moved with `git branch -f` only once the tier
is green. Every landing in this program that used `git worktree add <path> <branch>` was one commit
away from this.

**And this lane is the first landing to use it.** The resumed worktree was detached, the baseline
worktree was created with `--detach` explicitly, and the trunk was moved with `git branch -f` only
after the tier came back green — so composing and publishing were separate acts, and at no point could
an interrupted run leave untested work on a shared branch. It worked: the trunk sat at `1c71ae951`
through the whole tier and mutation pass and moved once, deliberately, at the end.

## Teardown

Both worktrees removed with `rm -rf` plus `git worktree prune`; the two tier-rewritten artifacts
(`run-sheet.json` **and** `run-sheet.md`) were restored before teardown and never staged. **No worktree
holds the trunk ref.** `lane/ev-vipps-fallback-landed` still points at `976489141` as a second handle
on the same commit. Nothing pushed, in either repository.

## A trunk moved under me at the end — reported, not forced

My first end-of-lane read returned `2e9592376` with `EventsGuestLink.cs` **absent**, which looked like
my landing had been dropped. It had not: three consecutive settled reads return **`976489141`** with
the file present and the `FallBack` assignment intact. The first read caught a transient window while
another actor was moving the ref.

`git reflog feature/restaurant-modules` shows the sequence:

```
@{0} 976489141   branch: Reset to 976489141      <- settled here, my landing
@{1} 2e9592376   branch: Reset to 2e9592376
@{2} 976489141   branch: Reset to 976489141      <- my branch -f
@{3} 1c71ae951   branch: Reset to 1c71ae951      <- my earlier correction
```

**Collateral that is not mine to repair, and must not be silently absorbed.** `2e9592376` was a merge
of **`24c95aa94`** — *"fix(invoices): a credit note downloads under its own number, not the one it
credits"* — and the reset back to `976489141` **dropped that landing**. Measured:
`merge-base --is-ancestor 24c95aa94 feature/restaurant-modules` is **false**, and `2e9592376` is
reachable from no ref at all, surviving only in the reflog.

**Nothing is lost**: the work is intact on `lane/credit-note-number`. But whoever landed it will
believe it is on the trunk when it is not. I did not re-land it — putting another lane's merge back
without its tier is exactly the error this program keeps paying for, and it is theirs to redo.

## Revert

```
git -C /Users/svendaneel/okam/OkamAPI-modules branch -f feature/restaurant-modules 1c71ae951
```
