```
RETURN: L-GROWTH-MAIL
brief: e72c6248
verdict: built
evidence: artifacts/journeys/growth-doi-postmark-sandbox.json
log:
lane/growth-mail-postmark @ af6ec9dc off 349d8806, worktree /Users/svendaneel/okam/wt-growthmail, committed not pushed.
Verified the brief: IGrowthMailProvider was hard-bound to GrowthFakeMailProvider (Program.cs:910), which does no I/O.
Binding is now Growth:MailProvider (Fake|Smtp|Postmark), resolved by GrowthMailProviderSelection - one testable function, no lambda, no fallback.
Default stays Fake; a selected-but-unconfigured provider FAILS CLOSED at the send call and never degrades to the fake; boot logs the bound transport and whether its config is complete, never a credential.
GrowthPostmarkMailProvider does submit + lookup + suppression export for real: the client key rides Postmark metadata, so a lost submit response RECONCILES instead of parking in AmbiguousReview - the cost smtp-promote carried.
LIVE PROOF: one double-opt-in confirmation through GrowthProviderTransactionalMailSender -> GrowthConfirmationMailer -> GrowthPostmarkMailProvider -> POST api.postmarkapp.com/email, accepted, MessageID 045a2406-2c91-44eb-93b6-00cc2f6ff5f3.
Run against POSTMARK_API_TEST (Postmark's documented public sandbox token, supplied via env). NO token committed; Growth:PostmarkServerToken is declared in no appsettings, same posture as Growth:RootSecret.
Suite: 4110 passed / 0 failed / 9 skipped at ffb29e4e, clean detached worktree, receipt at ../OkamAPI-modules artifacts/tests/ffb29e4e-fast-tier.trx + RUN.md. SQL tier (519) unmeasured; this lane touches no entity, query or migration.
The smoke test is reported SKIPPED, never passed, without credentials - a green suite can never read as "mail left the process".
FINDING (blocker for Growth delivery truth): Postmark does not sign webhooks (documented). GrowthWebhookIngestionService requires a signature + timestamp header, so with Postmark bound NO delivery/bounce/complaint event can be ingested - no Delivered state, no provider-driven suppression. Needs a ruling: Basic-auth webhook URL + IP allowlist, or a different provider for the bulk stream.
FINDING: Postmark has no submit-time idempotency key, so SubmitAsync never returns Duplicate; at-most-once now depends on callers not blind-retrying. Documented on the class and pinned by tests.
fact:growth.mail.provider will NOT flip until this branch merges: the probe reads ../OkamAPI-modules/Models/AppSettings/GrowthSettings.cs, which is a different worktree. Merge is the orchestrator's; the shared checkout held 14 uncommitted sibling-lane files (Events dietary + its migration) throughout, so nothing was done there.
Removed two now-stale ModuleReachabilitySweep parks (type:GrowthSmtpMailProvider, type:GrowthMailEnvelope) - both were dead only while the fake was hard-bound; added GrowthPostmarkMailProvider to the GRW-PII-001 logger allow-list with a no-leak proof (no address, no token, and never Postmark's 422 text, which embeds the mailbox it refused).
Merge-reconciliation points for the orchestrator: Program.cs Growth DI block + AddHttpClient block, ModuleReachabilitySweepTests.Parked, GrowthFixtureMatrixTests allow-list, appsettings.json Growth section.
END RETURN
```
