RETURN: L-AN-ERROR-BODY-STOPS-HANDING-BACK-THE-CALLERS-TOKEN
brief: 687772c4
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-anerrbody/lanes/L-AN-ERROR-BODY-STOPS-HANDING-BACK-THE-CALLERS-TOKEN/finding.md
log:
Branched from feature/restaurant-modules a14084874 (read fresh); lane branch lane/an-error-body-no-token at 4fb9f1905. Committed, not pushed. No migration, no container.
Reproduced: POST /events/admin/4101/events/4393/deposits (Vipps) -> quarantined IVippsService -> the page body ended "Authorization: Bearer <token>", plus exception, message and full stack.
Nothing in this repo turns the page on: WebApplication adds UseDeveloperExceptionPage() itself when the env reads Development. The string appears nowhere on this branch, origin/master or origin/test.
Fix: Middleware/UnhandledExceptionProblemMiddleware.cs, registered FIRST in Program.cs, so it sits inside the framework page and the page is never handed an exception to render, in any environment.
Typed rather than hidden: 500 application/problem+json {type,title,status,detail,code:INTERNAL_ERROR,traceId}, the shape EventsProblemDetails emits. Domain refusals keep their own status and code.
Headers deliberately not cleared (Response.Clear() takes the CORS headers with it and leaves a browser an opaque error); no second log line, the handler inside already writes the exception.
Proof reads the raw BODY: every header name and value the request carried, taken off the request object rather than listed, searched in the whole response; plus the token absent from the log (C7).
Mutation check on a full rebuild: with the registration line commented out it reds with "Found: X-Okam-Wire-Header-Echo-Probe In value: WireEgressBlockedException...". Restored, both facts pass.
Fast tier 4754 passed / 0 failed / 10 skipped against the 4752/0/10 baseline. Delta +2, both mine: the header-echo fact, and its contrast that the gate's EVENTS_DISABLED keeps its own 404 and code.
ENVIRONMENTS, the half you asked me not to assume: NOT determinable from this repository. ASPNETCORE_ENVIRONMENT is set in no file on any branch; it is an Azure App Service setting. Owner: @sven.
Targets are okamapi (from master) and okamtest (from test). Absent variable = Production = page off = nuisance; "Development" = a live credential leak with a rotation. az command in environments.md.
Trap worth naming: the deploy job declares environment: name: 'Development' -- a GitHub deployment environment, unrelated to ASPNETCORE_ENVIRONMENT. Anyone reading the workflow will misread it.
A SECOND money route was answering the page: GET /Invoices/BulkCreateandSendInvoicesForPayouts, whose green test asserted the leaked "quarantined IStripeService" in the RESPONSE. Now read off the log.
Named, not widened: F-EVENTS-VIPPS-REFUSAL-IS-UNTYPED stays open (adapter :131-154 still raises no EVENTS_PAYMENT_PROVIDER). Swept 28 Request.Headers sites: no other app code echoes a header back.
Deploy-window consequence: on this branch Program.cs:75 refuses to start outside Development while KassaSettings.UseKeyVault is false, and README.md:130 records okamapi as having no KassaSettings.
END RETURN
