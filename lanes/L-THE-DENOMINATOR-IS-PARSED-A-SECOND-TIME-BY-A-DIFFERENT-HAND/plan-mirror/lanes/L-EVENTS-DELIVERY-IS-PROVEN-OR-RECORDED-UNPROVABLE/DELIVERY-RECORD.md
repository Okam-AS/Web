# Events delivery — recorded locally unprovable, and the recorded cause was wrong

**Verdict: the last step cannot be proven on this machine, and it is not the missing password that
stops it.** The blocker is one line of transport defaults, measured five ways below.

| | |
|---|---|
| API | `http://127.0.0.1:5971` — `wt-lwtwo-api@81d06c10a8b7e6b9861a871dad0db1806d5109c9`, clean tree, pid 11713 |
| API stdout | `<session-scratchpad>/api-5971.log` (fd 1 and 2 of pid 11713) |
| Web | `http://127.0.0.1:3971` — `web-livewalk@6b98839`, pid 14269 |
| Database | `OkamLiveTwoHumans` on `okam-lwtwo-sql` (:15436), store 1 = Two Humans Kafé |
| Measured at | 2026-08-07, 18:00–18:06 local |
| Transport under test | MailKit 4.16.0 — the exact version `WebApi.csproj` pins |

Neither server was restarted. No container was started, stopped or exec'd into. No worktree was
created, so none was removed. **No authenticated call was made to the API at all**, and therefore no
row, flag or store was written.

---

## What the live world actually recorded

Its own log, not the walk's summary of it:

```
grep -c "Events notification delivery failed"                 -> 14
grep -o "failure type [A-Za-z]*" | sort | uniq -c             -> 14 failure type SslHandshakeException
grep -o "Failed to send emails via SMTP ... sent: ..."        -> 14 × "send.one.com:465 after 0 sent: SslHandshakeException none"
grep -c "Events notification dead-lettered"                   -> 0
```

`after 0 sent` and `SmtpStatus none` are the tell: the session died in `ConnectAsync`, before
`AuthenticateAsync` was ever reached. **A password that is never offered cannot be the reason a
handshake failed.** `EmailService.cs:160` connects, `:163` authenticates; the exception type recorded
is thrown by the first of those.

## The reason, measured

`Services/EmailService.cs:266` constructs `new SmtpClient()` and sets nothing on it. MailKit's
`CheckCertificateRevocation` therefore keeps its default, which is **true**, and on this host the
online revocation check cannot complete. Same host, same port, same `SecureSocketOptions`, same
MailKit version, one property changed:

| # | endpoint | `CheckCertificateRevocation` | `ServerCertificateValidationCallback` | outcome |
|---|---|---|---|---|
| A1 | `send.one.com:465` | **true** (product default) | none (product) | `SslHandshakeException` — *"An incomplete certificate revocation check occurred."* |
| A2 | `send.one.com:465` | false | none | **CONNECT ok**, TLS up, server advertises `Authentication` |
| B1 | loopback capture sink | **true** (product default) | none (product) | `SslHandshakeException` — *"The certificate was not trusted."* |
| B2 | loopback capture sink | false | none | `SslHandshakeException` — *"The certificate was not trusted."* |
| B3 | loopback capture sink | false | accept-any | **CONNECT ok · AUTH ok · SEND ok**, message captured |

Raw output: `probe-results.txt`. Probe source: `probe/Program.cs`, `probe/SmtpProbe.csproj`. The sink:
`capture_smtp.py`.

A2 is the finding. **The transport reaches the real provider on this machine the moment the revocation
check is off**, so the 14 failures the walk attributed to `AppSettings:SmtpFromPassword` have a
different cause, and supplying that password would not have changed one of them. The password is the
*next* blocker, not the current one.

This is not an Events fact. `IEmailService` is the single mail seam for 14 callers — user confirmation
codes, invoices, order and POS receipts, payouts, offers, Workforce notifications, Growth newsletters
and transactional mail, the end-of-day mail and the SAF-T export. On any host where .NET cannot
complete a revocation check, **none of them can open an SMTP session.** Whether the production host
can complete one is not something this lane measured, and it should not be assumed either way.

## A second instrument that reads zero in both states

The walk offered *"29 passes, 0 SMTP connections"* as evidence the queue was genuinely held. That
number cannot distinguish the two states: `Logging:LogLevel:WebApi` is `Warning` in `appsettings.json`
and `appsettings.Development.json` does not override that key, so every `Information` line in
`EmailService` is suppressed. Counted over the very window that contains the 14 real attempts:

```
grep -c "Connecting to SMTP server"  -> 0
grep -c "Sending single email"       -> 0
grep -c "sent successfully"          -> 0
```

The sound half of the walk's evidence is the `Events notification delivery failed` warning, which went
0 → 14. The consequence for whoever attempts the proof: **a successful send would print nothing in
this world.** The success signal has to be the outbox row (`Status = Sent`, `SentAtUtc`) or the capture
sink's own record — never the API log.

## Why the running API cannot be re-pointed

`Program.cs:52` binds `AppSettings` with `Configure<AppSettings>`, and `EmailService.cs:23-28` takes
`IOptions<AppSettings>` and captures `.Value` in its constructor. `IOptions<T>` is a singleton whose
bound instance is created once and never re-read; editing `appsettings.json` under the running process
changes nothing. So re-pointing `SmtpHost`/`SmtpPort` at a sink needs a **process restart**, which this
lane is instructed not to perform on either server.

## The exact configuration a proof would require

A capture-sink proof (nothing leaves the machine, no real mailbox, no credential) needs all four:

1. **`MailKitSmtpTransport` must stop failing revocation** — `CheckCertificateRevocation = false` on
   the `SmtpClient` in `Services/EmailService.cs:266-284`, or a host that can complete the check.
   Without this, B1/B2 shows even a perfect local sink is refused. **This is a product code change and
   it is unavoidable: it blocks the real provider too (A1).**
2. **The sink's certificate must be trusted, or the transport must be able to skip that check.** The
   transport passes no `ServerCertificateValidationCallback`, so a locally-issued certificate is
   refused (B2). The only local candidate is the ASP.NET Core development certificate; it exists on
   this machine and `dotnet dev-certs https --check --trust` reports **"none of them is trusted"**.
   Trusting it is an interactive, machine-wide keychain change — an owner action, not an agent's. The
   alternative is a dev-only cert callback, which is a second product code change and weakens the path.
3. **`AppSettings:SmtpHost` / `SmtpPort` pointed at the sink, and the API process restarted** so the
   `IOptions` binding is rebuilt.
4. **The sink must advertise `AUTH` and accept any label**, because `EmailService.cs:163` calls
   `AuthenticateAsync` unconditionally. No credential is involved on either side; `capture_smtp.py`
   discards the label it is given. `SmtpFromPassword` may be left at its placeholder.

The real-provider alternative needs the owner's `send.one.com` password **and** item 1, and it would
put a real message in a real mailbox — so it cannot be used for a proof against a guest address at all.

## What this cost the queue: nothing

`dispatchEnabled` is still off and the ten rows are untouched. The evidence is the drain's own
warnings, which are the instrument that does work: the log still carries exactly **14** delivery
failures and **0** dead-letter lines, unchanged from the walk, and a drain pass that had selected a row
would have added to one of those counts. This lane made exactly one HTTP request to the API — an
unauthenticated `GET /events/admin/1/notifications/health`, answered `401` — and never held a token.

Attempt budget spent by this lane: **0 of 5 per row.** The walk's 1-on-six-rows / 2-on-four-rows stands.

## Reproduction

```sh
python3 capture_smtp.py 14650 &                       # loopback implicit-TLS sink, needs cert.pem/key.pem beside it
cd probe && dotnet build
dotnet run -- send.one.com 465 connect                                        # A1: fails, revocation
PROBE_NO_REVOCATION=1 dotnet run -- send.one.com 465 connect                   # A2: connects
dotnet run -- localhost 14650 send                                            # B1: fails, untrusted
PROBE_NO_REVOCATION=1 dotnet run -- localhost 14650 send                       # B2: fails, untrusted
PROBE_NO_REVOCATION=1 PROBE_ACCEPT_CERT=1 dotnet run -- localhost 14650 send   # B3: captured
```

The self-signed certificate and its key are deliberately **not** in this directory and were destroyed
with the scratch directory; regenerate with
`openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 2 -nodes -config san.cnf`
using a SAN of `DNS:localhost,IP:127.0.0.1` — a CN-only certificate fails on name matching instead and
hides the trust result. The sink was started by this lane on port 14650 and stopped by this lane from
its own recorded pid.

## What was deliberately not done

- **No second API process against the live database.** It would have re-run the Events drain, the
  Events expiry sweep and the Workforce notification dispatcher against a world a sibling lane is
  walking, and the Workforce outbox would have burned its own attempt budget on the same handshake.
- **No trust-store change.** Trusting a local certificate is machine-wide and interactive.
- **No product code change**, because both candidate changes (item 1 and item 2 above) are exactly the
  "green obtained by weakening the path" the brief rules out, and item 1 is a defect fix that deserves
  its own lane and its own review rather than being smuggled in as proof scaffolding.
