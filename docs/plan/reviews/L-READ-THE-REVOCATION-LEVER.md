# Review — the revocation lever, read by a second reader

Lane under review: `lane/mail-revocation-lever` @ `69e6ca8af`, off backend trunk `81d06c10a`.
Reviewer: agent:L-READ-THE-REVOCATION-LEVER · 2026-08-07 · read-only; one detached worktree
(`/Users/svendaneel/okam/OkamAPI-lrtrl-review`), created and removed for this review.

## Verdict

**APPROVE.** The lever is what it claims: unset binds to `true` through the real configuration path
(proven empirically below, all three demanded cases), nothing but revocation was relaxed anywhere in
the backend, the refactor moved no behaviour, the appsettings edit adds no secret, and both flag
narrowings are honest. One overclaim to correct in words, not code: the proposed App Insights read
identifies *a failed TLS handshake*, not *this defect* — §7.

## 1. Unset really binds to true, through the real path

The real path, verified in code: `Program.cs:46` binds `GetSection("AppSettings").Get<AppSettings>()`
into `StaticAppSettings` at boot, and `Program.cs:52` registers `Configure<AppSettings>(section)`;
`EmailService` reads `IOptions<AppSettings>.Value` once in its constructor (`EmailService.cs:23-28`).
The property is `bool?` (`Helpers/AppSettings.cs:56`); the coalesce is `?? true` at
`EmailService.cs:228`; the transport receives the resolved bool in its constructor
(`Services/MailKitSmtpTransport.cs:17-19`).

Proven by a temporary probe test file driving **both** real binding shapes
(`services.Configure<AppSettings>(section)` → `IOptions<AppSettings>.Value`, and
`section.Get<AppSettings>()`) against in-memory, JSON-stream and environment-variable providers,
run inside the lane's own test project and removed afterwards:

| case | binds to (measured) | send posture |
|---|---|---|
| key absent | `null` | checked (`?? true`) |
| key = `""` (empty string) | `null` (binder returns null for empty on `Nullable<T>`) | checked |
| key = `"false"` / `"False"` / `"FALSE"` | `false` | relaxed — what the operator asked for |
| key = `"true"` / `"TRUE"` | `true` | checked |
| JSON literal `true` (what appsettings.json:27 now ships) | `true` | checked |
| env var `AppSettings__SmtpCheckCertificateRevocation=false` | `false` | relaxed — the operator lever works |
| env var set to `""` | `null` (.NET deletes an env var set to empty → degenerates to absent) | checked |
| key = `"flase"` (typo) | throws `InvalidOperationException` at bind | loud, at boot (`Program.cs:46` throws), never silently false |

No case lands on `false` where the author expects `true`. The failure directions are all safe:
absent, empty and inexpressible all coalesce to checked; garbage fails the boot loudly. Note the
lane also spelled the key as JSON `true` in `appsettings.json:27`, so in every shipped configuration
the key is *present and true*; the `bool?` default is defence-in-depth for configurations that
strip the file — and it holds.

## 2. Nothing besides revocation was relaxed — the scope claim survives the whole-backend grep

Grepped the entire backend at `69e6ca8af` (product and tests) for every TLS-relaxation surface:
`ServerCertificateValidationCallback`, `RemoteCertificateValidationCallback`,
`ServerCertificateCustomValidationCallback`, `DangerousAcceptAnyServerCertificateValidator`,
`ServicePointManager`, `CertificateRevocationCheckMode`, `SslPolicyErrors`, `SslProtocols`,
`TrustAll`, `AllowInvalidCertificates`, `ValidateCertificate`. **The only hit is the comment at
`Helpers/AppSettings.cs:55` naming the callback's absence.** `CheckCertificateRevocation` appears
only on the mail transport. The reporting callback in the lane's probe (arm 3a) lives in
`docs/plan/lanes/.../probe/Program.cs` in the frontend repo — documentation, not product code, and
it returns .NET's own verdict rather than bypassing it.

Corroborating the "one seam" premise: the only SMTP socket in the product is
`Services/MailKitSmtpTransport.cs` (`new SmtpClient()` appears nowhere else;
`AdminKraviaInvoicesController.cs` uses `System.Net.Mail` only for `MailAddress` parsing). Thirteen
service/controller files plus the DI registration consume `IEmailService` — the lane's "fourteen
callers" is the right shape and the right consequence: the lever governs every mail the product sends.

## 3. What a revoked provider certificate would now do — in plain words

On a host where the key is set to `false`: chain trust, validity dates and hostname verification
still hold (that is what "no callback" preserves). What is given up is the one question revocation
answers — *has this otherwise-valid certificate been withdrawn*.

So if `send.one.com`'s certificate were genuinely revoked (key compromise) and an attacker holding
the stolen key sat on this host's path, the handshake would complete and the product would proceed
to AUTH. Concretely disclosed: **the `noreply@okam.no` mailbox credential** (`SmtpFromPassword`,
sent as AUTH over the attacker's TLS session), and **every outgoing message** — invoices, receipts,
confirmation codes, payout notices, end-of-day mail, the SAF-T export attachment — readable,
alterable, droppable. The party bearing that exposure is *not* the operator who set the key: it is
the mailbox owner (a rotation) and the mail recipients (personal and financial data).

**Ruling: acceptable as what it is — a per-host, operator-set, Warning-announced opt-out — for
development hosts. Not acceptable as a production posture without an owner decision.** A host that
cannot ask and a certificate that has been withdrawn are indistinguishable once the check is off;
anyone setting this in production is accepting that indistinguishability on behalf of third
parties, which makes it a Sven-level call, not an operator convenience. The first-best production
fix is restoring OCSP/CRL egress; the key is the fallback. Two mitigations are real: the default
stays checked everywhere the key is not deliberately set, and the relaxed posture announces itself
at Warning on every send loop (`EmailService.cs:162-163`) — the one level this estate's logging
actually emits. One structural note, correctly navigated by the lane: MailKit offers no middle
"check, and fail only on definitive revocation" posture without a custom validation callback, and a
callback would put server *identity* back in play — declining it is the only configuration-proof
form of that guarantee.

## 4. The refactor moved no behaviour

Compared trunk's nested private `MailKitSmtpTransport` (inside `EmailService.cs`) against the new
`Services/MailKitSmtpTransport.cs` line by line: the four method bodies — `ConnectAsync` (same
overload: `string, int, SecureSocketOptions`), `AuthenticateAsync`, `SendAsync`, `DisconnectAsync` —
and `Dispose` are **verbatim identical**. Added: the constructor assignment and a read-through
property (deliberately reading the client, not a stored copy, so a pin cannot pass while the client
keeps its default). No timeout was set before and none is set now (MailKit's default stands).
`EmailService.Send` still wraps the transport in `using (var client = CreateTransport())`
(`EmailService.cs:155`) — no dropped `using`. Connect→Authenticate→per-message-Send→Disconnect
order lives in `Send` and is untouched. `SecureSocketOptions.SslOnConnect` for port 465 unchanged.
`ISmtpTransport` unchanged. Visibility went private-nested → `internal` top-level;
`InternalsVisibleTo("WebApi.Tests")` pre-exists (`Properties/AssemblyInfo.cs:3`) and WebApi is an
application, not a library, so nothing new is exposed.

## 5. C7 and the appsettings edit — clean

The diff touches `appsettings.json` with exactly one added line: `appsettings.json:27`
`"SmtpCheckCertificateRevocation": true`. **No secret is added.** The known open finding (JWT
signing key at line 12) is untouched by this lane — still open, still not this lane's.
The new Warning line is a **constant message template with no arguments**:
`"SMTP certificate revocation checking is disabled by AppSettings:SmtpCheckCertificateRevocation"`
— no host, no credential, no connection string (`EmailService.cs:163`). The announcement and the
socket posture are fed by the same private property (`EmailService.cs:223,228`), so they cannot
disagree. C7 holds.

## 6. Both flag narrowings are honest — neither is clearable by this branch alone, and I agree

**`F-EVERY-MAIL-DIES-AT-A-REVOCATION-CHECK-THIS-HOST-CANNOT-COMPLETE` — narrowed, not closed.**
`EmailService` captures `IOptions<AppSettings>.Value` in its constructor and `IOptions<T>` is
computed once per process, so the running API on `:5971` cannot pick the key up without a restart.
The branch supplies the lever; the operator act (set key, restart, per affected host) and the
unmeasured production question remain outside it. Correctly recorded.

**`F-A-SUCCESSFUL-SEND-PRINTS-NOTHING` — narrowed, not closed.** Confirmed:
`Logging:LogLevel:WebApi = "Warning"` at `appsettings.json:201` and the App Insights block says the
same at `:193`; `appsettings.Development.json` overrides `Default/System/Microsoft` but **not**
`WebApi`, so every `EmailService` Information line is suppressed in every configuration. The
durable success signals the lane cites are real: `EventsNotificationDrainService.cs:192-194` writes
`Status = Sent` + `SentAtUtc`, `WorkforceNotificationDispatcher.cs:214` writes `Status = Sent`.
Raising the namespace to Information is an estate telemetry/retention decision with an owner.
Correctly recorded.

## 7. The App Insights read is a screen, not a diagnosis — the one overclaim

`EmailService.cs:197` logs `SensitiveDataRedactor.ExceptionLabel(ex)`, which is **the exception's
type name and nothing else** (`Helpers/SensitiveDataRedactor.cs:27`); the exception object is never
attached to the log call, so MailKit's revocation-naming message ("An incomplete certificate
revocation check occurred") **exists nowhere in telemetry**. Therefore:

- `FailureType = SslHandshakeException` **and** `after 0 sent` does isolate the failure to the TLS
  handshake at connect (auth failures label `AuthenticationException`, network failures
  `SocketException`/`IOException`, per-message refusals carry `SentCount` ≥ 0 with a different line).
- It does **not** isolate the cause to revocation. An expired provider certificate, an untrusted
  root on the production image, a name mismatch or a middlebox produces the identical row.

So the DECISION-RECORD's sentence "production has this defect too" is overstated. The honest
protocol for tomorrow: **line absent** while outbox rows show `Status = Sent` (absence alone proves
nothing — success prints nothing in this estate) → production completes the handshake, key stays
unset. **Line present** → production fails the TLS handshake *for some reason*; revocation is one
candidate; the follow-up is an OCSP/CRL egress check from the production network, not setting the
key on the strength of this row alone. The outbox rows' `LastError` carries the same type-name
label — a second no-deploy read, in the database.

## 8. Suite, binding probe and mutations — measured

**Base used.** The trunk moved during this review: `feature/restaurant-modules` is now `057c390ad`
(tip reads 4949 / 0 / 11 after the guest-exit landing). The lane commit `69e6ca8af` predates that
move — its parent is `81d06c10a` — so everything below is measured against the lane commit itself,
checked out detached, i.e. against the `81d06c10a` base it was actually built on. The 4937→4943
arithmetic (+6 = this lane's six pins) is the arithmetic of that base, not of the new tip; the
branch will need the routine rebase onto `057c390ad` before merge, which is the merge author's
task, not re-measured here.

**Canonical tier** (from `WebApi.Tests/`, `--filter "Database!=SqlServer"`, host idle, single
suite): **4943 / 0 / 10**, Total 4953, Duration 6 m 20 s, exit 0. The lines above the summary were
inspected: no abort line, only normal request logs (the grep hits for "abort"/"error" in the log
body are a Z-report column name and deliberate negative-path `DbUpdateException` tests). Exactly
reproduces the lane's claim.

**Binding probe**: a temporary `ReviewBindingProbeTests.cs` (10 test cases) placed inside the
lane's own `WebApi.Tests`, driving both real binding shapes with the real `AppSettings` type —
**10 / 10 passed**, populating the §1 table. In particular: absent → `null`, empty string → `null`
on both the `Configure<>`/`IOptions` path and the `Get<AppSettings>()` path, via in-memory, JSON
and environment-variable providers alike; `"False"`/`"FALSE"` → `false`; the typo case throws
`InvalidOperationException` on both paths. The file was removed after the run.

**Mutations**, each applied and restored with `cp` + `touch` so a stale build cannot fake the
result:

| mutation | expected (lane's table) | measured |
|---|---|---|
| delete `_client.CheckCertificateRevocation = …` (trunk's bare client) | 1 failed / 5 passed | **1 failed / 5 passed** |
| `?? true` → `?? false` (the silent-weakening default) | 2 failed / 4 passed | **2 failed / 4 passed** |
| both restored | 6 passed | **6 / 6 passed** |

The pins are not vacuous: each guarded behaviour reds when its lever is cut, and the read-through
property (§4) is why a mutation cannot hide behind a stored copy.

**One estate quirk, not this lane's defect**: the canonical tier rewrites
`artifacts/journeys/ev-dietary/run-sheet.json` (a wire test recaptures it with fresh timestamps),
dirtying the worktree. Reverted with `git checkout --` before teardown; `git status` clean.

## 9. Constraints

C1/C2/C4/C6: no migrations, no SQL, no append-only or money-path writes, no statutory claim — not
in play. C3: the lever is reachable in the same diff — bound through the existing
`Configure<AppSettings>` (`Program.cs:52`), spelled in `appsettings.json:27`, settable per host as
an environment variable, and announced when active; no orphan flag. C5: nothing here is moved to
accepted on suite evidence; this is a code review verdict, not an acceptance. C7: §5.

## Worktrees and hygiene

Created `/Users/svendaneel/okam/OkamAPI-lrtrl-review` (detached at `69e6ca8af`); removed after the
run with `rm -rf` + `git worktree prune`. Temporary binding-probe test file added inside it and
removed before teardown; mutations restored with `cp` + `touch` and re-verified green. No commit,
push, rebase or branch move. No container touched, no port bound, nothing killed.
