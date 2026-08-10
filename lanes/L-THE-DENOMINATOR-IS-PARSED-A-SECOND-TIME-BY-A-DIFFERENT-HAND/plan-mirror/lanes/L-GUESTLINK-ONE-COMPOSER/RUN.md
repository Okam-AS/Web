# L-GUESTLINK-ONE-COMPOSER — run record

Repo: **`OkamAPI`** (`~/okam/OkamAPI`). Base `feature/restaurant-modules` tip **`8e2b57de`**.
Branch: **`lane/guestlink-one-composer`**, worktree `~/okam/wt-guestlink`. **Not pushed. No shared branch
touched. No migration. No container started, stopped or entered** — a foreign `mssql` container was running
throughout and was left alone; every run used `--filter Database!=SqlServer`.

    c22243f7  Carry the one guest-link composer onto the module baseline
    f1900cff  Pin the guest address to one composer at the source, not at the behaviour

    Helpers/Events/EventsGuestLink.cs                          |  83 +   (carried, byte-identical)
    Services/Events/EventsEmailNotificationDelivery.cs         |  19 +-  (carried, byte-identical)
    WebApi.Tests/Events/EventsGuestLinkOriginTests.cs          | 172 +   (carried, byte-identical)
    WebApi.Tests/Observability/CredentialCompositionSweepTests |   7 +-  (carried, byte-identical)
    WebApi.Tests/Events/EventsGuestLinkSoleComposerTests.cs    | 415 +   (authored here)

## Suite evidence

Baseline **measured by this lane** on a clean checkout of the same base, before any edit — not quoted from
another lane's run.

| run | filter | result |
| --- | --- | --- |
| baseline, clean `8e2b57de` | `Database!=SqlServer` | **4638 passed / 0 failed / 12 skipped** (4650), 6 m 51 s |
| after, `f1900cff` | `Database!=SqlServer` | **4675 passed / 0 failed / 12 skipped** (4687), 7 m 15 s |

**Delta accounted test by test: +37 passed, +37 total, 0 failed, skipped unchanged.**

| source | facts | theories | cases | total |
| --- | --- | --- | --- | --- |
| `EventsGuestLinkOriginTests` (carried from `lane/ev-uri-relative`) | 3 | 3 | 19 | **22** |
| `EventsGuestLinkSoleComposerTests` (authored here) | 4 | 1 | 11 | **15** |
| | | | | **37** |

Nothing else moved: no test was renamed, retargeted, skipped or deleted, and the 12 skips are the same 12.
The `CredentialCompositionSweepTests` edit re-keys one exemption string and adds no case.

## The red, proven before the green

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter \
      'Database!=SqlServer&(FullyQualifiedName~EventsGuestLinkSoleComposerTests|FullyQualifiedName~EventsGuestLinkOriginTests|FullyQualifiedName~EventsOutboxDeliveryTests|FullyQualifiedName~CredentialCompositionSweepTests)'

| run | mutation | result |
| --- | --- | --- |
| green | none | 80 / 0 |
| **M1** | the mail path composes inline again — the shipped shape, i.e. **stops reading the helper** | **6 failed / 74 passed** |
| **M2** | the mail path composes inline again but **correctly** — same validation, same address | **3 failed / 77 passed** |

M1 reds all three structural rules **and** three behavioural cases (`/events`, `/`, `file://`), which come
back `Delivered == true` — the guest is mailed a `file://` link.

M2 is the one that matters for the exit. **Every** assertion in `EventsGuestLinkOriginTests` stays green;
only the three source rules red. A behavioural pin alone would have let the fork re-form.

Both mutants were applied to the working tree and restored; the restore was verified against `HEAD` with an
empty `git diff` before the tier run. Per-run summaries and the two failure messages are in `receipts/`.

## Merge hazard found, resolution already exists in the tree

`git merge-tree lane/guestlink-one-composer lane/ev-vipps-fallback-2` **conflicts** in
`WebApi.Tests/Observability/CredentialCompositionSweepTests.cs`. Both lanes edit the same region of
`CompositionAllowed`: this branch re-keys the mail path's exemption from fragment `"/events/"` to
`"row.PublicToken"` (the `/events/` literal has moved into the helper), while `ev-vipps-fallback-2` **adds** a
new entry for `EventsDepositPaymentPortAdapter`.

**The resolution is the union, and taking either side wholesale is wrong:**

- take *theirs* → the mail path exemption reverts to the fragment `"/events/"`, which no longer exists in
  that file, and `Every_exemption_still_matches_real_code` reds;
- take *ours* → the Vipps adapter's composition is unexempted and the composition rule reds.

Both mistakes fail loudly rather than silently, which is the sweep working. The correct union already exists
byte-identical on `lane/ev-vipps-fallback` (v1) and can be lifted rather than re-derived — the same lesson as
the composer itself.

Merging with `lane/ev-uri-relative` is **clean** (`merge-tree` exit 0), as intended by the byte-identical
carry. The only difference between v1's and `ev-uri-relative`'s mail path is a three-line comment; the code
is identical, and the superset (`ev-uri-relative`) is what was carried.

## Constraints

- **C1** append-only — no UPDATE/DELETE, no migration, no entity mutation. Not engaged.
- **C2** one migration author — **no migration in this diff**; nothing added to `OnModelCreating`.
- **C3** reachability — no new service, handler, page or flag; the composer is reached by an existing
  production caller, and the roster test is what makes a *future* caller a declared one.
- **C4** money-path actor — no money-path write. The Vipps initiate that this composer feeds is another
  lane's commit and is not on this branch.
- **C5** acceptance is a person — this lane claims **no acceptance**. Its evidence is a suite and mutation
  receipts, which is evidence that code behaves, never that a capability exists. `Events:PublicBaseUrl` is
  unset in every committed configuration, so the guest link cannot be walked in a UI until an origin is
  chosen — that decision is open and is Sven's, not this lane's.
- **C6** statutory claims — none printed or changed.
- **C7** secrets to a log sink — the carried tests pin exactly this: the refusal label must not quote the
  composed address, which carries the guest's `PublicToken`. No log or telemetry call was added here.
