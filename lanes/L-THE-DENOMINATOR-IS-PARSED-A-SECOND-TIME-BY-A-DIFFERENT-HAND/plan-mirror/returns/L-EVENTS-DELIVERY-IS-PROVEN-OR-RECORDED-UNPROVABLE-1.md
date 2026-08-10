RETURN: L-EVENTS-DELIVERY-IS-PROVEN-OR-RECORDED-UNPROVABLE
brief: 52d6ee59
verdict: built
evidence: docs/plan/lanes/L-EVENTS-DELIVERY-IS-PROVEN-OR-RECORDED-UNPROVABLE/DELIVERY-RECORD.md
log:
Delivery is recorded locally unprovable, and the recorded cause of the 14 failures is refuted: it is not the missing password.
The live log says "send.one.com:465 after 0 sent: SslHandshakeException none" 14 times -- the session died in ConnectAsync, before AuthenticateAsync at EmailService.cs:163 was reached.
A password that is never offered cannot fail a handshake. SmtpFromPassword is the NEXT blocker, not this one.
Cause measured: MailKitSmtpTransport (EmailService.cs:266) does `new SmtpClient()` and sets nothing, so CheckCertificateRevocation keeps MailKit's default true, which this host cannot complete.
A1 send.one.com:465, product settings -> SslHandshakeException "An incomplete certificate revocation check occurred."
A2 same host, same port, same options, revocation off -> CONNECT ok, TLS up, server advertises AUTH. One property is the whole difference.
B1/B2 loopback capture sink, revocation on then off, no cert callback -> refused both times, "The certificate was not trusted."
B3 sink, revocation off plus accept-any-cert callback -> CONNECT ok, AUTH ok, SEND ok, message captured. Raw runs in probe-results.txt.
Blast radius: IEmailService is the one mail seam for 14 callers (confirmation codes, invoices, POS receipts, payouts, Workforce, Growth, EOD, SAF-T). The production host was not measured.
Instrument correction: Logging:LogLevel:WebApi=Warning suppresses every EmailService Information line, so the walk's "0 SMTP connections" reads 0 across the 14 real attempts too.
Consequence: a successful send prints nothing in this world. A future proof must read the outbox row (Status=Sent, SentAtUtc) or the sink, never the API log.
The live API cannot be re-pointed: Program.cs:52 with EmailService.cs:23-28 bind IOptions<AppSettings> once, so a restart is required, and this lane may not restart it.
A proof needs four things, detailed in the record: revocation off (product change, unavoidable), a trusted cert or a dev-only callback, SmtpHost/Port plus a restart, and a sink advertising AUTH.
Cost to the attempt budget: 0 of 5 per row. Failures still 14, dead-lettered still 0, flag still off; one unauthenticated GET answered 401 and no token was ever held.
No worktree created so none removed; capture sink stopped from its own recorded pid 45478; scratch deleted; both servers and the okam-lwtwo-* containers untouched.
END RETURN
