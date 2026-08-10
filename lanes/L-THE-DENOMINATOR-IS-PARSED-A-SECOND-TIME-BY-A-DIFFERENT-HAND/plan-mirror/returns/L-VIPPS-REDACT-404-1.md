```
RETURN: L-VIPPS-REDACT-404
brief: a95a2c69
verdict: built
evidence: OkamAPI worktree /Users/svendaneel/okam/wt-vippsredact, branch lane/vipps-redact-404, commit cb18cab4, base feature/restaurant-modules 3579bbbc
log:
Base 3579bbbc, own worktree wt-vippsredact; shared OkamAPI-modules checkout untouched. Fast tier
4384/0/12 vs 4369/0/12 recorded at base = +15, exactly the cases added. No SQL tier, no container.
H1 CONFIRMED live. Measured through real routing: /events/deposits/<guid>. and <guid>%5D bind no
endpoint, RouteValues empty, whole token published. 405 is the same hole and was NOT in the brief:
the shim IS an endpoint with zero route values, and both phone-number routes are write verbs. The
trigger is now "routing bound no values"; RedactUnrouted derives guid runs and masks a segment
following a sensitive-named one.
H2 OVERSTATED. The server percent-decodes into HttpRequest.Path before routing, AI 2.22 builds the
URL from Path.Value, Uri.OriginalString does not re-escape: %2B4791234567 arrives as +4791234567 on
both sides and the existing Replace already matched it. Escaped forms matched anyway. The real half
IS fixed: the unchanged-URL check was fail-open and now verifies output against what it removed.
H3 UNDERSTATED, not latent. Real composition root: 61 anonymous-by-omission endpoints beside 61
[AllowAnonymous], 5 on InvoicesController (confirms F-INVOICE-ROUTES-ANONYMOUS), 9 on
WoltOrderController {orderId}. The 612 authorized endpoints keep their guids.
Non-vacuity: 4 mutations, each red then restored, assembly mtime moved every time. Synthetic values only.
END RETURN
```
