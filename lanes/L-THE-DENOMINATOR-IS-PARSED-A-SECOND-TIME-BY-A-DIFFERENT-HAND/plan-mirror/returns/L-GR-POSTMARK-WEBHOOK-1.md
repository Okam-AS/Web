```
RETURN: L-GR-POSTMARK-WEBHOOK
brief: 64cab33c
verdict: built
evidence: lane/gr-postmark-webhook 5b895dc4 (worktree ../wt-gr-postmark) — Wire/GrowthPostmarkWebhookWireTests 8/8, Growth/GrowthPostmarkEventReaderTests 38/38, Growth non-SQL 544/0, Wire+Modules 377/0
log:
Brief verified and it understated the gap: auth is one of TWO blockers. The parser read only {providerEventId,type,providerMessageId} — no field Postmark sends — so a genuine Postmark delivery was Malformed even if it authenticated. That half is now built.
GrowthProviderEventReader picks the body shape from the VERIFIED account's provider key, never the route segment; GrowthPostmarkEventReader maps Delivery/Bounce/SpamComplaint/Open/SubscriptionChange. Postmark stamps an event id on only 2 of 5, so the dedupe key is derived and documented. New Ignored outcome → 202 with no receipt (a 4xx makes Postmark redeliver forever). Receipt, transition and suppression already worked behind it.
Two mappings are decisions, not translations: only 4 bounce classes defer and 2 suppress — the other 16 (auto-responder, address change, DMARC) move nothing, because a channel-global suppression silences a real person on every store. And SubscriptionChange acts only on Origin=Recipient + ManualSuppression: a hard bounce arrives as BOTH a Bounce and a SubscriptionChange, and acting on both writes two suppression rows a later lift must find all of.
NOT DECIDED — D-GROWTH-EVENTS (already open in plan.md, @sven), no default shipped. basic-auth-url: pro, keeps the ruled provider and needs no second vendor; con, the credential rides in a request URI, which the outbound-deny URI echo and the test-printed host key would publish (C7), plus an allowlist somebody maintains. split-provider: pro, events stay HMAC-verified, which is what this path assumes; con, two vendors and two DPAs for Norwegian guest data. no-events: pro, nothing to build; con, a hard bounce never suppresses and the dead address is mailed forever.
Signature path untouched and pinned to still refuse: a genuine Postmark payload with no credential is 401 with nothing written, and a Postmark body is refused for a non-Postmark account (both directions).
LIMIT: the wire tests credential the genuine payloads with today's HMAC through the one AuthenticatedAs seam. Payload genuine, credential a stand-in — stated on the suite, not buried.
Mutation-checked: soft→hard bounce reds 1 test, delivery→opened reds 1, broad SubscriptionChange reds 1, disabling reader selection reds all 8.
HAZARD for other lanes: `--filter "FullyQualifiedName!~SqlServer"` still starts SQL Testcontainers — WebApi.Tests/Margin/MarginModuleScaffoldTests.cs uses them without "SqlServer" in the name. I hit it, killed my own run immediately (never touched a foreign container) and ryuk reaped mine. That filter is not a container-free filter.
END RETURN
```
