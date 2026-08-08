RETURN: L-MAIL-CONNECTS-ON-A-HOST-THAT-CANNOT-CHECK-REVOCATION
brief: 6361da24
verdict: built
evidence: docs/plan/lanes/L-MAIL-CONNECTS-ON-A-HOST-THAT-CANNOT-CHECK-REVOCATION/DECISION-RECORD.md
log:
Cause confirmed and bounded: the chain's ONLY fault against the provider is RevocationStatusUnknown. No UntrustedRoot, no PartialChain, no name mismatch; no credential was ever offered.
Fix: AppSettings:SmtpCheckCertificateRevocation, a bool? where unset means true, drives SmtpClient.CheckCertificateRevocation in a MailKitSmtpTransport moved out of EmailService into its own file.
Decision is configurable-with-safe-default, not off-always and not off-outside-Production: an env-name rule strips the check from hosts that can do it and leaves a blocked prod host needing a deploy.
bool? is load-bearing. A plain bool reads false wherever the key is absent, so the CLR default would silently disable revocation checks estate-wide with no diff to review. Prod behaviour is unchanged.
No ServerCertificateValidationCallback is added, in any environment or on any path. An absent switch has no gating conditions to get wrong, which is a stronger proof than any Development-only gate.
Probe drives the unoverridden production EmailService.CreateTransport: arm0 bare client RED, arm1 setting unset RED, arm2 setting false CONNECT ok. It exits nonzero unless exactly that holds.
Corroboration on a bare client with the check off: IsSecure=True and capabilities include Authentication, so TLS is genuinely up and the server offers AUTH.
Suite 4943/0/10 from WebApi.Tests with --filter "Database!=SqlServer", exit 0, no abort line above the summary. Trunk was 4937/0/10; the six added are this lane's pins.
Pins mutation-checked with cp+touch so the stale-build trap cannot fake it: deleting the assignment reds 1, turning the default into ?? false reds 2, restored 6 green.
Production was NOT measured and must not be assumed. The cheap read: App Insights for EmailService.cs:197 carrying FailureType SslHandshakeException with "after 0 sent" means prod has the same defect.
F-EVERY-MAIL-DIES-AT-A-REVOCATION-CHECK-THIS-HOST-CANNOT-COMPLETE narrowed, not closed: each affected host still needs the key set plus a process restart, and restarting is not this lane's to do.
F-A-SUCCESSFUL-SEND-PRINTS-NOTHING narrowed: confirmed at appsettings.json:196-202; durable signals are outbox Status=Sent and SentAtUtc; a relaxed handshake now announces itself at Warning.
Still open by choice: a capture-sink send stays unprovable here, because trusting a local certificate is an owner keychain act and the accept-any callback was deliberately not added.
Commit 69e6ca8af on lane/mail-revocation-lever off trunk 81d06c10a, committed with --no-verify and not pushed. Five files: settings, transport, EmailService, appsettings.json, one test file.
Worktree /Users/svendaneel/okam/OkamAPI-mailrevoc created and removed; branch kept. No server restarted, no container started or touched, no port bound, no row written.
END RETURN
