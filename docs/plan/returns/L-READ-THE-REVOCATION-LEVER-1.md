RETURN: L-READ-THE-REVOCATION-LEVER
brief: 6683a83d
verdict: built
evidence: docs/plan/reviews/L-READ-THE-REVOCATION-LEVER.md
log: APPROVE lane/mail-revocation-lever 69e6ca8af; one wording overclaim named (review section 7), no code change required.
Unset binds true through the real path: Configure<AppSettings> (Program.cs:52) and Get<AppSettings>() (Program.cs:46) both measured via a temp probe inside the lane's test project, 10/10 passed.
Absent key binds null; empty string binds null (binder returns null for empty on Nullable<T>); "False"/"FALSE" bind false as the operator asked; a typo throws at bind time, never silently false.
Whole-backend grep at 69e6ca8af: no ServerCertificateValidationCallback or any other TLS-relaxing surface anywhere; the only hit is the comment naming its absence (Helpers/AppSettings.cs:55).
Only SMTP socket in the product is Services/MailKitSmtpTransport.cs; moved bodies verbatim vs trunk; using retained (EmailService.cs:155); timeout, auth order, Connect overload unchanged.
appsettings.json diff adds exactly one line (:27, literal true), no secret; the Warning line is a constant template with no host or credential; C7 clean.
Revoked provider cert with key set: handshake completes, AUTH proceeds; mailbox credential and all outgoing mail exposed to an on-path key holder; borne by mailbox owner and recipients, not operator.
Ruled acceptable for development hosts only; the production posture is a Sven-level decision (coordinator recorded D-REVOCATION-POSTURE-IN-PRODUCTION from review section 3).
Both flags narrowed honestly, neither clearable by this branch alone: key plus restart per host (IOptions binds once); Logging:LogLevel:WebApi=Warning at appsettings.json:201, Development leaves it.
Overclaim: EmailService.cs:197 logs the exception type name only (SensitiveDataRedactor.cs:27); SslHandshakeException + "after 0 sent" pins the stage, not the cause; read with outbox Sent rows.
Canonical tier from WebApi.Tests/ with Database!=SqlServer: 4943/0/10, exit 0, no abort line; measured against the lane's own base 81d06c10a (trunk moved to 057c390ad; rebase is merge-author work).
Mutations with cp+touch: delete the ctor assignment gave 1 failed/5 passed; ??true to ??false gave 2 failed/4 passed; restored gave 6/6 — matching the lane's table exactly.
Worktree /Users/svendaneel/okam/OkamAPI-lrtrl-review (detached) created and removed via rm -rf + git worktree prune; suite-dirtied run-sheet.json reverted; no commit, push, container or port touched.
END RETURN
