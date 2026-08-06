# L-EV-GUESTLINK-ONE-COMPOSER — the sweep for `F-EV-GUESTLINK-FORK`

Baseline: worktree `/Users/svendaneel/okam/wt-guestlink-composer` detached at **`8e2b57de`**
(the integration tip). The shared checkout `/Users/svendaneel/okam/OkamAPI-modules` was on
`lane/meals-grace-pins` (`34c6c103`), **not** the integration branch — checked before anything was
believed from that working tree.

---

## 1. Headline: the fork is real, but it is not the fork the brief describes

The brief's premise is **stale in the "neither" direction for the artefact, and true in substance for
the hazard.**

- There is **no `EventsGuestLinks.cs`** — plural — anywhere. Not on any local or remote ref, not in any
  worktree on disk, not in either stash, not in any dangling commit. It was never committed.
- `Helpers/Events/EventsGuestLink.cs` — **singular** — exists on exactly **three** unmerged lane
  branches, and on all three it is the **byte-identical blob `087f675d`**.
- The two-answer condition the fork flag was raised about **does exist, in one branch, committed** —
  but as **helper-versus-inline inside a single tree**, not as two files.

The "one throws, the other returns a fault enum" detail is **accurate**. It just does not describe two
helper files; it describes the helper against the mail path's private `ComposeLink`.

---

## 2. The sweep

### 2.1 Every ref carrying a guest-link-named file

Scanned with `git ls-tree -r` over every ref under `refs/heads` and `refs/remotes`:

| ref | short | `Helpers/Events/EventsGuestLink.cs` blob |
|---|---|---|
| `lane/ev-uri-relative` | `6a7bf75b` | `087f675d` (+ `WebApi.Tests/Events/EventsGuestLinkOriginTests.cs`) |
| `lane/ev-vipps-fallback` | `9e3a607b` | `087f675d` |
| `lane/ev-vipps-fallback-2` | `fc09be1d` | `087f675d` |
| **`8e2b57de` (integration tip)** | — | **absent** |

No other ref in the repository contains a path matching `guestlink`, case-insensitive.

### 2.2 Worktrees on disk, including untracked files

`find` across the working tree of every path in `git worktree list` (33 worktrees). Guest-link files
exist in exactly three, each matching its branch, each `md5 = 0c99801f53c3b2ddf19c7834975df9c0`:

- `/Users/svendaneel/okam/wt-evuri` — `lane/ev-uri-relative`
- `/Users/svendaneel/okam/wt-evvippsfb` — `lane/ev-vipps-fallback`
- `/Users/svendaneel/okam/wt-evvippsfb2` — `lane/ev-vipps-fallback-2`

**No uncommitted plural file survives.** The window the flag was raised in has closed; whatever was
about to be committed as `EventsGuestLinks.cs` is not on disk and not in the object store.

### 2.3 Content sweep — a second composer under any other filename

A filename sweep cannot see a composer that is inline or differently named, so the same question was
asked of the **content**, across every ref:

```sh
for ref in $(git for-each-ref --format='%(refname:short)' refs/heads); do
  git grep -lE '"/events/(deposit|proposal)?' "$ref" -- '*.cs'
done | sed 's/^[^:]*://' | sort -u
```

Thirteen files match. **Eleven are tests** (wire tests asserting routes, outbox tests, the telemetry and
credential sweeps). **Exactly two are production code:**

- `Helpers/Events/EventsGuestLink.cs`
- `Services/Events/EventsEmailNotificationDelivery.cs`

There is **no third composer, under any filename, on any branch.** The two answers named in §4 are the
only two that exist.

Two adjacent composers exist in other domains and are **out of scope** — different tokens, different
pages: `Services/ReservationService.cs:189,209` (reservation cancel token) and
`Services/Growth/GrowthConfirmationMailer.cs` (double-opt-in, token in the URL **fragment**, which is
the stronger posture the Events docstring flags as an open decision).

### 2.3b How far each answer has spread

Classifying every one of the 315 local branch refs by which composer it carries:

| state | refs |
|---|---|
| **converged** — helper only, no inline composer | **2** (`ev-uri-relative`, `ev-vipps-fallback`) |
| **inline only** — the unconverged status quo | **199** |
| **FORKED — both composers in one tree** | **1** (`ev-vipps-fallback-2`) |
| predates the mail path entirely | 113 |

The inline composer is the estate-wide default; **only two refs have ever converged**, and both are
unmerged. This is why the ruling below matters more than the (nonexistent) deletion.

An independent second sweep, run in parallel and blind to this one, reproduced every finding above. It
**under-counted in exactly one place**: it reported "only one blob for this path exists in the entire
object database", having scanned reachable refs only. The variant `82888a1c` in dangling commit
`b0e1d64a` (§2.4) is real — `git cat-file -p` shows a different signature — and is reachable only via
`fsck`. Recorded because it is the one place a reachable-refs sweep is blind.

### 2.4 Stashes and unreachable objects

Both stashes (`lane/wf-violation-exact` wip, `rebrand` PARKED-ESCALATION) carry no guest-link path.

`git fsck --no-reflogs --lost-found` found **two dangling commits** carrying the file:

| dangling commit | blob | meaning |
|---|---|---|
| `bae52c7b` | `087f675d` | superseded rebuild, same content as the three branches |
| `b0e1d64a` | **`82888a1c`** | **an earlier API generation of the same file** |

`b0e1d64a` is authored `agent:L-EV-VIPPS-FALLBACK`, message *"A guest who pays a deposit in Vipps has
nowhere to be returned to"* — the same subject as `9e3a607b`. It is the first cut of that lane's work,
replaced before it landed.

**This is the closest thing to a second design that exists, and it is unreachable.** It is not a rival
file; it is the same path with a different signature:

- `b0e1d64a` (`82888a1c`): `Deposit(string publicBaseUrl, Guid publicToken)` → **returns the whole URL**
- all three branches (`087f675d`): `DepositPagePrefix(string publicBaseUrl)` → **returns a prefix**, the
  caller appends the token

**Both throw `UriFormatException`. Neither returns a fault enum.** The superseding refactor is
documented in the surviving docstring and is deliberate — see §3.

---

## 3. The surviving helper's docstring, quoted

The brief asked for this, and it is the strongest argument for the file that survives. From
`Helpers/Events/EventsGuestLink.cs` (blob `087f675d`):

> The single composer for the tokenised guest-facing page URLs (Events spec §5) […]
>
> It exists because two independent callers must produce the BYTE-IDENTICAL address: the outbox mails
> the guest a deposit link, and the Vipps deposit order carries the same address as its
> `merchantInfo.fallBack` so the guest is returned to the page they paid from. **Composed separately
> those two drift silently — a guest returned to a different origin, or to a path the frontend does not
> route, reads "not paid" for a deposit they just paid, and nothing in either code path looks wrong.**

The guard was written, and the drift happened beside it rather than through it — exactly as the brief
predicted. `lane/ev-vipps-fallback-2` carries this docstring **and** an inline composer that ignores it.

The docstring also explains why the prefix shape beat the whole-URL shape (i.e. why `b0e1d64a` was
superseded), and it is a security reason, not a taste one:

> `CredentialCompositionSweepTests` finds a credential composition by spotting a MEMBER read of a
> credential-named property in the same statement that builds the string. Taking the token as a `Guid`
> parameter here would move the concatenation away from any member read, so the sweep would see nothing
> to hold and its declared exemption would have to be deleted as stale — **a refactor that silently
> retires a security check while every suite stays green.**

That is the reason the dangling `82888a1c` generation must not be revived even though it reads better.

---

## 4. Where the two answers actually are

### 4.1 Answer A — the helper (throws)

`Helpers/Events/EventsGuestLink.cs::PagePrefix`, on the three lane branches:

```csharp
if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)
    || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
{
    throw new UriFormatException("Events:PublicBaseUrl is not an absolute http(s) origin.");
}
```

**Contract: throws `UriFormatException`. Validates the SCHEME, not merely absoluteness.**

### 4.2 Answer B — the inline composer (fault enum), live on the integration tip

`Services/Events/EventsEmailNotificationDelivery.cs:142-145` at `8e2b57de`:

```csharp
var origin = _settings.PublicBaseUrl.TrimEnd('/');
// Rejects a relative or malformed origin here rather than mailing an unusable link.
var uri = new Uri(origin + "/events/" + segment + "/" + row.PublicToken.ToString("D"), UriKind.Absolute);
```

…caught at line 93 and translated to `EventsNotificationDeliveryResult.Fail("PublicBaseUrlMalformed")`.

**Contract: returns a fault enum. Does NOT validate the scheme.**

**That comment is false on the deployment platform.** On Unix, `new Uri("/events/deposit/x",
UriKind.Absolute)` does not throw — it succeeds as `file:///events/deposit/x`. So the
`PublicBaseUrlMalformed` branch is **unreachable for the single misconfiguration most likely to occur**,
and the guest is mailed an unopenable `file://` link. It throws on Windows, so no developer machine sees
it. This is live on the integration branch today, and it is the defect `lane/ev-uri-relative` exists to
close.

### 4.3 The branch where both answers coexist

`lane/ev-vipps-fallback-2` (`fc09be1d`) is the fork, committed:

- `Services/Events/EventsDepositPaymentPortAdapter.cs:463` → reads the helper (scheme-validated, throws)
- `Services/Events/EventsEmailNotificationDelivery.cs:142` → still inline (accepts `file://`, fault enum)

**Two answers to where a guest comes back to, in one tree, for the same deposit.** For a relative
`Events:PublicBaseUrl` the Vipps initiate is refused while the mail goes out with a `file://` link — the
two addresses do not merely drift, they disagree about whether the link exists.

**Mechanism, and it is the interesting part.** `fc09be1d` is `9e3a607b` **minus one file**:

```
9e3a607b  Services/Events/EventsEmailNotificationDelivery.cs | 16 +-     ← present
fc09be1d  (that file absent from the diffstat)                           ← dropped
```

Everything else is the same work on a newer base (`3579bbbc` vs `de1e5c5e`). A rebuild on a fresher
trunk **dropped exactly the half that made the estate have one answer**, and kept the half that adds the
second composer. Neither commit conflicts with the other; both compile.

### 4.4 On the forked branch the security sweep stays green while its own justification goes false

`WebApi.Tests/Observability/CredentialCompositionSweepTests.cs` carries a declared exemption for the
mail path. Its justification text, unchanged since before either lane, ends:

> "…Composing it here is the feature. The method's own summary records the open decision (path vs URL
> fragment) and **this is the single place that changes** if it is taken."

**`9e3a607b` rewrites that text** — because it is no longer true once the helper owns the path shape —
and also changes the matched `Fragment` from `"/events/"` to `"row.PublicToken"`, since the `/events/`
literal has moved into `EventsGuestLink`:

> "…The path shape and the origin validation live in EventsGuestLink, which records the open decision
> (path vs URL fragment) and is the single place that changes if it is taken; **the token is appended
> HERE so this sweep can still see the composition.**"

**`fc09be1d` leaves the original text untouched** and only appends the new adapter entry. So on
`lane/ev-vipps-fallback-2`:

- the exemption still matches on `"/events/"`, because the mail path still composes inline — **the sweep
  passes**;
- its stated justification, *"this is the single place that changes"*, is **false** — `EventsGuestLink`
  is a second place that changes;
- and the claim is load-bearing, because it is the reason a **credential-composition security check** is
  waived for that file.

This is the fork's most dangerous property: **the one test written to notice guest-token composition
drift stays green on the branch that has the drift, and the prose asserting single-sourcing survives as
the record that it was checked.** Nothing in the diff looks wrong.

---

## 5. Ruling: which contract survives, and what each caller must handle

**The helper survives, and it keeps `throw`.** Reasons, in order of weight:

1. **It is the only one that is correct.** The inline composer's absoluteness check does not reject a
   relative origin on the platform this API is deployed on. Keeping the fault-enum composer means
   keeping the `file://` defect.
2. **Throwing is required at the money edge.** The Vipps adapter must refuse *before* the provider call.
   A Vipps order is money held on the guest's card and cannot be un-made; a returned degraded value
   would have to be checked by a caller that currently has no reason to check it. A throw cannot be
   ignored by accident.
3. **`Events:PublicBaseUrl` has no default by design**, so there is no degraded value to return that is
   not itself a broken link.

**The fault enum is not lost — it is translated, at the one caller that needs it.** The mail path keeps
its existing outcome vocabulary by catching:

```csharp
catch (UriFormatException)
{
    return EventsNotificationDeliveryResult.Fail("PublicBaseUrlMalformed");
}
```

Both promises survive: the helper throws, the outbox still reports `PublicBaseUrlMalformed`. **No call
site's contract changes**, which is why this convergence is safe to land without touching the outbox
state machine.

### Every caller, checked against the survivor's failure mode

| caller | branch | reads helper? | handles a `throw`? |
|---|---|---|---|
| `EventsEmailNotificationDelivery.ComposeLink` | `ev-uri-relative` | yes, `PagePrefix` | **yes** — `catch (UriFormatException)` → `Fail("PublicBaseUrlMalformed")` |
| `EventsEmailNotificationDelivery.ComposeLink` | `ev-vipps-fallback` | yes, `PagePrefix` | **yes** — same catch |
| `EventsEmailNotificationDelivery.ComposeLink` | **`ev-vipps-fallback-2`** | **no — inline** | n/a — **this is the gap** |
| `EventsEmailNotificationDelivery.ComposeLink` | `8e2b57de` tip | **no — inline** | n/a — **this is the gap** |
| `EventsDepositPaymentPortAdapter.GuestReturnUrlOf:459-474` | `ev-vipps-fallback`, `-2` | yes, `DepositPagePrefix` | **yes** — catches and **converts** (see below) |
| `EventsGuestLinkOriginTests` | `ev-uri-relative` | yes | asserts `Assert.Throws<UriFormatException>` on both entry points |
| `CredentialCompositionSweepTests:136` | `ev-uri-relative` | declared exemption naming `EventsGuestLink` | — |

**No caller anywhere handles a returned fault value from the helper**, because no version of the helper
has ever returned one. Adopting `throw` as the survivor therefore changes **nothing** at any existing
call site. The migration cost is zero; the only work is converting the two inline sites.

**Neither caller lets the throw escape — each translates it into its own domain's vocabulary**, which is
what makes `throw` the right survivor rather than a contract imposed on everyone:

- the **outbox** catches → `EventsNotificationDeliveryResult.Fail("PublicBaseUrlMalformed")`, a
  retryable row outcome;
- the **Vipps adapter** catches → `EventsProblemException.PaymentProvider(...)`, refusing the initiate
  before the provider call.

So the "fault enum" promise the brief worried about losing is **not lost anywhere** — it is produced at
both call sites, from a single throwing source. A returning helper could not have served both, because
the two callers need *different* fault types.

**C7 note on both translations:** each names only the SETTING and never the composed value, and both say
so in a comment — the adapter's because "a provider-error message is surfaced to the caller and recorded
on the deposit's failure trail", the outbox's because the label "is persisted to
`EventsNotificationOutbox.LastError` and read by operators". The token reaches neither.

---

## 6. C7 — the guest link carries a token

Checked every log and telemetry call on both composers' files across all three lanes and the tip. **No
diff adds a token-bearing log.** The only logging call in the mail path records the exception *type*
only, via `SensitiveDataRedactor.ExceptionLabel(ex)`, and the surviving code comments the reason:

> The label names the SETTING and never the composed address: that address carries the row's
> PublicToken, which is the guest's whole credential for an anonymous page, and this label is persisted
> to `EventsNotificationOutbox.LastError` and read by operators.

The helper's own exception messages name only `Events:PublicBaseUrl` and never interpolate the
candidate URL — so even the throw path cannot carry the token into a log sink. **C7 holds on the
survivor.** Note this is a property of the *throwing* design: had the helper embedded the composed
candidate in its exception message, the fault-enum design would have been the safer one.

---

## 7. What this lane did NOT do, deliberately

**No file was deleted, and no composer was authored.**

- **Nothing to delete.** The plural file does not exist. The four unreachable helpers the estate deleted
  tonight went on a proven zero-call-site premise; here the premise is the opposite — the only file that
  exists has live callers on three branches, and all of them were read (§5).
- **Nothing authored, and this is the load-bearing judgement.** The convergence at `8e2b57de` is a clean
  16-line delta (`git diff 8e2b57de lane/ev-uri-relative -- Services/Events/EventsEmailNotificationDelivery.cs`),
  and I could have committed it. **Authoring it here would create a fourth independent copy of a file
  three branches already carry identically — which is the exact drift this lane exists to end.** Three
  lanes writing the same helper in parallel is how `F-EV-GUESTLINK-FORK` happened; a fourth, written by
  the lane sent to close it, would be the worst possible outcome.

The convergence is therefore delivered as a **landing ruling**, not a commit.

---

## 8. Actionable outcome

1. **Land `lane/ev-vipps-fallback` (`9e3a607b`), not `lane/ev-vipps-fallback-2` (`fc09be1d`).** They are
   the same work; `-2` is missing the 16 lines that stop the fork. If `-2` is preferred for its newer
   base, it **must** carry the `EventsEmailNotificationDelivery.cs` conversion before it lands.
2. **`lane/ev-uri-relative` (`6a7bf75b`) carries the only tests for the helper**
   (`EventsGuestLinkOriginTests`, incl. `Assert.Throws` on both entry points) and the
   `CredentialCompositionSweepTests` exemption text. Landing a helper without it leaves the survivor
   untested and the sweep exemption undeclared.
3. **All three branches add the identical blob `087f675d`,** so an add/add across any two of them
   auto-resolves. There is no merge conflict to resolve and therefore **no moment where a human is
   forced to notice the duplication** — which is precisely why this needed a sweep rather than a merge.
4. **Do not revive the dangling `82888a1c` generation.** It reads better and it silently retires a
   security check (§3).

---

## 9. Reproduction

```sh
cd /Users/svendaneel/okam/OkamAPI-modules
git rev-parse --abbrev-ref HEAD                      # lane/meals-grace-pins — NOT the integration branch

# every ref carrying the file
for ref in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes); do
  git ls-tree -r --name-only "$ref" | grep -i guestlink | sed "s|^|$ref: |"
done

# no plural file anywhere on disk, including untracked
git worktree list --porcelain | grep '^worktree ' | sed 's/^worktree //' \
  | while read wt; do find "$wt" -iname '*guestlink*' -not -path '*/.git/*'; done

# the unreachable second generation
git fsck --no-reflogs --lost-found | grep '^dangling commit' | awk '{print $3}' \
  | while read c; do git ls-tree -r --name-only "$c" | grep -qi guestlink && echo "$c"; done
git cat-file -p 82888a1c94700a29521dde937875aa7dd6f3f265   # Deposit(baseUrl, Guid) — superseded

# the fork, in one branch
git show --stat 9e3a607b | grep EmailNotification        # present
git show --stat fc09be1d | grep EmailNotification        # absent

# the convergence delta
git diff 8e2b57de lane/ev-uri-relative -- Services/Events/EventsEmailNotificationDelivery.cs
```
