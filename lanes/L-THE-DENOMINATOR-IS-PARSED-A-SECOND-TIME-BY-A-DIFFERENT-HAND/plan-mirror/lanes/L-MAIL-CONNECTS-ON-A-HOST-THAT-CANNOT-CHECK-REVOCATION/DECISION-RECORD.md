# One property decides whether any mail leaves — what it now is, and what is still unmeasured

**The connect completes.** The product's own transport, built by the production `EmailService.CreateTransport()`,
brings TLS up against the configured provider on a host that cannot complete a certificate-revocation check.
The same probe, in the same process, reds against the bare client trunk builds.

| | |
|---|---|
| Backend | `lane/mail-revocation-lever` @ `69e6ca8af`, off trunk `81d06c10a` |
| Suite | non-SQL tier, from `WebApi.Tests/`, `--filter "Database!=SqlServer"` — **4943 / 0 / 10**, exit 0, no abort line (trunk 4937 / 0 / 10; the +6 are this lane's pins) |
| Probe | `probe/`, raw run in `probe-results.txt`, VERDICT PASS, exit 0 |
| Measured at | 2026-08-07 18:21–18:29 local, macOS (Darwin 25.5.0), MailKit 4.16.0 |

No server was restarted, no container was started or touched, no port was bound. No authenticated call was
made to the live API and no row was written. One worktree was created (`/Users/svendaneel/okam/OkamAPI-mailrevoc`)
and removed.

---

## What the probe establishes

Four arms, one endpoint, one process (`probe/Program.cs`; raw output in `probe-results.txt`). Arms 0–2 stop at
`ConnectAsync`/`DisconnectAsync` — **no credential is offered to the provider at any point**, because a
deliberate failed AUTH against a real mailbox is how an account gets locked, and the question is only whether
the handshake completes.

| # | client | `CheckCertificateRevocation` | outcome |
|---|---|---|---|
| 0 | `new SmtpClient()`, trunk's construction verbatim | true (MailKit default) | `SslHandshakeException` — *"An incomplete certificate revocation check occurred."* |
| 1 | **product** transport via `EmailService.CreateTransport()`, setting **unset** | true (resolved) | `SslHandshakeException`, same message — the default is intact |
| 2 | **product** transport via `EmailService.CreateTransport()`, setting **false** | false | **CONNECT ok**, `WebApi.Services.MailKitSmtpTransport`, DISCONNECT ok |
| 3a | bare client + a *reporting* callback that returns .NET's own verdict | true | `SslPolicyErrors = RemoteCertificateChainErrors`; chain status **`RevocationStatusUnknown`**, and nothing else |
| 3 | bare client, corroboration | false | CONNECT ok, `IsSecure = True`, caps include `Authentication` |

The probe exits non-zero unless arm0 fails, arm1 fails and arm2 connects, so *"reds against the bare client"*
is a checked property of the run and not a claim about it.

**Arm 3a is the load-bearing one.** The chain reports exactly one fault and it is the revocation status. There
is no `UntrustedRoot`, no `PartialChain`, no `RemoteCertificateNameMismatch`. The certificate is valid, the
issuer chain is trusted and the hostname matches — the only thing this host cannot do is ask whether an
otherwise-good certificate has been withdrawn. That is what bounds the size of the relaxation.

## The decision, and why it is not one of the other two

`AppSettings:SmtpCheckCertificateRevocation` is a `bool?`. **Unset means `true`.**

**Not off always.** Revocation checking is the only instrument that notices a stolen key after issuance. A
default of `false` would remove it from every deployment, including ones that can perform it, to fix a
constraint measured on one host.

**Not off outside Production.** This is the tempting one and it is wrong twice. It would decide a TLS posture
from a deployment label rather than from the property an operator measured — a `Development` host with working
OCSP loses the check for no reason, and a `Production` host without OCSP egress (an egress-restricted
container, an outbound proxy — the same failure mode, and *not measured here*) is left with **no lever short
of a code change and a deploy** while every invoice, receipt and payout mail is dead. It would also be the
posture that silently follows a misconfigured `ASPNETCORE_ENVIRONMENT`.

**Configurable, safe default.** The key is bound through the `Configure<AppSettings>` that already exists at
`Program.cs:52`, is spelled out in `appsettings.json` next to the other SMTP keys, and is settable per host as
`AppSettings__SmtpCheckCertificateRevocation=false` without touching a file. The `bool?` is what makes the
default provable: a plain `bool` would read `false` on every deployment that has never heard of the key and
would turn the check off everywhere it is not spelled out — a silent, estate-wide weakening with no diff.

**Because the default is unchanged, this commit cannot alter production behaviour.** Every deployment that
does not set the key builds the same client it built before.

## The certificate callback: not added, and that is the proof

The brief allows a dev-only `ServerCertificateValidationCallback` if it is impossible to reach in production,
and asks for that to be proven rather than asserted. **The strongest available proof is that no such callback
exists anywhere in the product.** `MailKitSmtpTransport` passes none, in any environment, on any path; there
is no configuration, environment name or flag that introduces one. A gate can be proven only against the
gating conditions somebody thought of; an absent switch has no conditions to get wrong.

The cost of that choice is real and is recorded below: it is why a full end-to-end send cannot be captured on
this machine.

Disabling revocation and bypassing validation are frequently spoken of as the same "relax TLS" knob. They are
not. Revocation asks *has this good certificate been withdrawn*; validation asks *is this the server at all*.
Only the first is what this host cannot answer, and only the first has a lever.

## What is established, and what is not

**Established here.** On this host the product transport's TLS connect completes with the lever set and fails
without it; the sole chain fault is `RevocationStatusUnknown`; the server advertises `AUTH` once the session is
up; the default is unchanged and pinned by tests that red when it is mutated.

**Not established here.** *Whether the production host completes a revocation check.* Nothing in this lane
measured it and nothing should assume it. The cheap way to find out without a deploy: the mail seam's own error
line — `EmailService.cs:197`, template `"Failed to send emails via SMTP {Host}:{Port} after {SentCount} sent:
{FailureType} {SmtpStatus}"` — is `LogError`, and `Logging:ApplicationInsights:LogLevel:WebApi` is `Warning`, so
it *does* reach App Insights. **If production carries that line with `FailureType = SslHandshakeException` and
`after 0 sent`, production has this defect too.** If it does not, production can complete the check and the key
should stay unset there.

Also not established: that any *message* is accepted end to end. Arms 0–2 stop at the handshake by design.

## What the fix does not close

**A capture-sink send is still unprovable on this machine.** The sibling lane measured that a loopback sink is
refused even with revocation off, because its certificate is not trusted (`probe-results.txt` B2 in
`../L-EVENTS-DELIVERY-IS-PROVEN-OR-RECORDED-UNPROVABLE/`), and the only remedies are an interactive machine-wide
keychain change (owner action) or the accept-any callback this change deliberately does not add. That is a
consequence of the decision above, not an oversight.

**The live world still cannot send.** `Program.cs:52` and `EmailService.cs:23-28` bind `IOptions<AppSettings>`
once, so the running API on `:5971` would need a restart with the key set — and restarting it is not this
lane's. The fourteen Events failures stay as they are.

## The two blockers

**`F-EVERY-MAIL-DIES-AT-A-REVOCATION-CHECK-THIS-HOST-CANNOT-COMPLETE` — narrowed, not closed.** The cause is
confirmed and named (`RevocationStatusUnknown`, not the missing `SmtpFromPassword`), and the code no longer
makes it unfixable. What remains is an operator act on each affected host — set
`AppSettings__SmtpCheckCertificateRevocation=false` and restart — plus the unmeasured production question
above. The password remains the *next* blocker for any real send, exactly as the sibling lane recorded.

**`F-A-SUCCESSFUL-SEND-PRINTS-NOTHING-IN-THIS-WORLD` — narrowed.** The claim is confirmed at
`appsettings.json:196-202` (`Logging:LogLevel:WebApi = "Warning"`), and `appsettings.Development.json:48-54`
does not override that key, so every `EmailService` `Information` line is suppressed in **every** deployed
configuration — production included. Two things now bound it:

- *The durable success signals exist and are not logs.* `EventsNotificationDrainService.cs:192-194` writes
  `Status = Sent` **and** `SentAtUtc` on the outbox row, and `WorkforceNotificationDispatcher.cs:214` writes
  `Status = Sent`. Events also exposes a read for it at `GET /events/admin/{storeId}/notifications/health`
  (`EventsNotificationsController.cs:82`). A send is observable; it is simply observable in the database and
  not in the log.
- *The one thing an operator must never miss now prints.* A relaxed handshake announces itself at **Warning**
  ("SMTP certificate revocation checking is disabled by AppSettings:SmtpCheckCertificateRevocation"), which is
  the level this world actually emits. Pinned in both directions: it appears when the lever is set and the send
  path is otherwise silent when it is not, so the announcement stays worth reading.

What is **not** closed: raising `Logging:LogLevel:WebApi` to `Information` would turn on every Information line
in the whole `WebApi` namespace, in App Insights, at retention cost — an estate-wide telemetry decision with an
owner, not a mail fix, and out of this lane's scope.

## Tests, and that they are not vacuous

`WebApi.Tests/Services/SmtpTransportRevocationTests.cs`, six pins, all driving the **unoverridden** production
`CreateTransport()`. `MailKitSmtpTransport.CheckCertificateRevocation` reads through to the MailKit client
rather than to a stored copy, so a pin cannot pass while the client keeps its default.

Mutation-checked, restoring with `cp` + `touch` so the CLAUDE.md stale-build trap cannot fake the result:

| mutation | result |
|---|---|
| delete `_client.CheckCertificateRevocation = ...` (i.e. trunk's bare client) | 1 failed / 5 passed |
| `?? true` → `?? false` (the silent-weakening default) | 2 failed / 4 passed |
| restored | 6 passed |

One pin asserts `new SmtpClient().CheckCertificateRevocation` is `true`. It exists so that if MailKit ever
ships a different default, "unset means true" stops describing the product in a file that says why it mattered.

## Reproduction

```sh
git -C <OkamAPI checkout> worktree add -b lane/mail-revocation-lever <dir> 69e6ca8af
cd probe && dotnet build -p:OkamApiProject=<dir>/WebApi.csproj
dotnet run --no-build -- send.one.com 465     # exits 0 only if arm0/arm1 red and arm2 connects
cd <dir>/WebApi.Tests && dotnet test --filter "Database!=SqlServer"
```

The probe's `bin/`, `obj/` and the worktree it referenced were removed after the run; the sources and the raw
output are what is kept.
