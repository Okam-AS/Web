# L-GR-EXIT-WIRE-THE-MAIL — the working exit is now linked from the mail that carries it

verdict: **built**.

Exit criterion, restated so it can be checked rather than believed: *a dispatched message's footer carries a
link to the session-free unsubscribe page, and a browser opening it completes a withdrawal.* Both halves are
walked below — the footer link is read out of the body a real dispatch handed the provider, and the browser
opens **that** link.

## What was NOT done

No container started. No container touched. No migration. No shared branch written. Nothing pushed. No
`appsettings.json` mail setting altered — `Growth:MailProvider` and `Growth:Enabled` are untouched, so nothing
here can put real mail on the wire. No file reverted, stashed or cleaned that this lane did not create.

## 1. Where the work lives

| repo | worktree | branch | base |
| --- | --- | --- | --- |
| backend `OkamAPI-modules` | `/Users/svendaneel/okam/wt-gr-exitmail` | `lane/gr-exit-wire-the-mail` | `8e2b57de` |
| frontend `Web-modules` | `/Users/svendaneel/okam/wt-fe-exitmail` | `lane/fe-gr-exit-wire-the-mail` | `e34977ac` |

The backend checkout at `/Users/svendaneel/okam/OkamAPI-modules` was on `lane/meals-grace-pins` as the brief
warned; nothing was read from it and nothing was written to it.

## 2. The five named changes

1. `Models/AppSettings/GrowthSettings.cs` — `UnsubscribePageBaseUrl`, default
   `https://okam.no/preferences/unsubscribe`.
2. `Services/Growth/GrowthUnsubscribePageLink.cs` (new) — fail-closed builder, mirroring
   `GrowthPreferenceCentreLink`. Returns `{base}#token=<unsubscribe token>`. **Fragment, never query.**
3. `Services/Growth/GrowthMarketingFooter.cs` — both `AppendHtml` and `AppendPlainText` take
   `unsubscribePageUri` and render **two** links. The preference-centre line is kept unchanged. The
   `TestSendNotice` stand-in behaviour is kept for both, as two separate notices — one notice would read as
   one link and hide exactly the omission this lane closed.
4. `Services/Growth/GrowthDispatchService.cs` — the page URI is built beside the preference-centre URI from
   the `unsubscribeToken` already minted, inside the same pre-`Submitting` fail-closed window, and passed
   through both `Append*` calls.
5. `Controllers/GrowthPreferenceController.cs` — `[HttpGet("unsubscribe")]` beside the POST. No state change;
   302 to the page link, token moved query → fragment; empty token → the bare page.

Also updated because they said something that stopped being true:
`Services/Growth/GrowthNewsletterService.cs` (test-send call site), the `GrowthMarketingFooter` class comment
that argued *why* there was only one link, and `pages/preferences/unsubscribe.vue`'s two false sentences —
the "⚠ NOTHING LINKS HERE YET" block **and** the claim at `:98` that a browser long-press "gets a 405".

## 3. The footer, as the provider received it

Captured by `GrowthUnsubscribeExitReachabilityTests` from `GrowthFakeMailProvider`'s recording of what
`GrowthDispatchService` actually submitted — `capture/captured-plaintext-body.txt`, verbatim:

```
Hei fra virksomheten.

--
Du får denne e-posten fordi du har meldt deg på nyhetsbrevet vårt.
Administrer eller stopp e-postene her: https://web.growth.test/preferences/communications#token=vPz89w_…
Meld deg av nyhetsbrevet: https://web.growth.test/preferences/unsubscribe#token=u1.Gb4JY8c6f…
```

Two links, two different credentials. The exit carries the `u1.` unsubscribe-capability token; the preference
centre carries the stronger session token. Asserted, not eyeballed:
`The_exit_link_carries_the_unsubscribe_token_and_never_the_stronger_preference_token`.

## 4. The withdrawal is EFFECTIVE, not merely acknowledged

`A_recipient_who_spends_the_footer_exit_is_suppressed_on_the_next_campaign` — dispatch campaign one, read the
link **out of the body**, resolve which recipient owns that token without spending it, spend it, advance the
clock past `GrowthConsentProjection.FrequencyCapWindow` (7 days), dispatch campaign two:

| recipient | campaign two | why it matters |
| --- | --- | --- |
| the leaver | `Suppressed` | the withdrawal took effect |
| the other recipient | `ProviderAccepted` | **the control** — without it, the 7-day frequency cap produces `Suppressed` too and the suite would pass against a withdrawal that did nothing |

## 5. The long-press leg

`GET /v1/growth/unsubscribe?token=…` answered **405** before this lane — a visibly broken opt-out on the one
address a person is most likely to try by hand. Now 302, with the token moved out of the query and into the
fragment. Four wire tests: the redirect and the carrier change; that it writes **no** suppression and does
**not** spend the token (so a mail scanner fetching every URI changes nothing); a token-less GET landing on
the bare page rather than a 400; and the C7 log assertion below.

## 6. A defect this lane introduced and then fixed

The C7 wire test failed the first time it ran, on my own change. MVC's `RedirectResultExecutor` logs

```
Executing RedirectResult, redirecting to https://okam.no/preferences/unsubscribe#token=u1.nrwphHjgv…
```

at **Information**. Returning `Redirect(target)` therefore wrote the fragment — and so the unsubscribe token —
straight into a sink Application Insights retains. The fragment is chosen *precisely because* it never reaches
a server, so that log line defeated the entire mechanism.

Fixed by setting the `Location` header directly and returning `StatusCode(302)`, which skips the result
executor. Mutation-checked both ways:

| arm | action body | `The_GET_landing_never_writes_the_token_to_a_log_sink` |
| --- | --- | --- |
| mutant | `return Redirect(target);` | **FAIL** |
| restored | `Response.Headers["Location"] = target; return StatusCode(302);` | PASS (19/19 suite) |

Restored with `cp` and `touch`, and the rebuild was confirmed to have actually compiled before the `--no-build`
run — the stale-binary trap in `CLAUDE.md` is exactly what would have made this proof worthless.

**Pre-existing residual, pinned rather than hidden.** The token still appears in
`Microsoft.AspNetCore.Hosting.Diagnostics`' request-url log at Information, because RFC 8058 §3.1 forces it
into the query for the machine path. That is true of every one-click POST today and is unchanged by this lane.
The test now asserts the narrower, actionable property: **no `WebApi.*` category logs the token**, so if our own
code ever starts to, it reds.

## 7. The browser leg — journey `growth-guest-unsubscribe` (J-EXIT-UNSUB)

`test/e2e/journeys/growth-guest-unsubscribe.spec.js`, run headless in Chromium. Artifact:
`journey/growth-guest-unsubscribe.playwright.json` (`"status": "passed"`), screenshots in `journey/screenshots/`.

**The link is copied, never constructed.** The spec reads `capture/captured-exit-link.txt` — the real
dispatched body — and transports the path and fragment verbatim. Only the ORIGIN is dropped, because
`https://web.growth.test` is the backend harness's configured deployment value and is not a host this world can
serve. That is named in the spec header, not hidden.

Steps, with their recorded details:

```
read the exit link out of the dispatched message body
  :: captured link path /preferences/unsubscribe, fragment carries a 46-character u1. capability token
open it in a browser, exactly as the recipient would
  :: the done card rendered without any confirmation step
the credential the browser spent is the one the dispatcher composed
  :: the backend recorded exactly 1 withdrawal, and it was for the captured token
the token is gone from the address bar
  :: address bar reads /preferences/unsubscribe with no token
a second click on the same link is still a done card, never a failure
  :: replayed once more; still one recorded withdrawal, still the done card
an expired or already-spent link says so instead of claiming success
  :: the token-dead card rendered, and no withdrawal was claimed
arriving with no token at all is a stated state, not a blank page
  :: the no-token card rendered
```

Screenshot `01-the-withdrawal-confirmed.png` shows the done card: **"Du er meldt av"**.

### A vacuity the first green run was hiding

The refusal and replay legs passed **without opening anything**. This page reads its token in `mounted()` and
then strips it from the address bar, so after one visit the URL is a bare `/preferences/unsubscribe` — and a
later `page.goto()` differing only in the FRAGMENT is a *same-document* navigation. The component never
remounts and the assertions sat looking at the card the previous arrival had left. Fixed with an `arriveAt`
helper that goes through `about:blank` first; the token-dead leg then failed honestly and had to be made to
pass for real. Recorded because a spec that green-lights itself is worse than one that is missing.

## 8. What this evidence cannot see

- **The browser leg's backend is the fixture, not the API.** The link, the token, the page and the request are
  real; the endpoint answering is `test/e2e/fixture/growth.js`. So the browser did not drive a *real*
  suppression. That half is proved against real code in §4 instead. The fixture models the contract it stands
  in for — the `u1.` capability boundary, one opaque `growth.token_invalid` 410 for unknown/expired/spent/
  wrong-kind, and idempotent replay — rather than answering 200 to anything.
- **No SQL tier ran.** No container was available or permitted.
- The GET landing was not walked in a browser; it is proved at the wire tier (§5).

## 9. Suites

| suite | result |
| --- | --- |
| backend `GrowthUnsubscribeExitReachabilityTests` (new) | 5 passed |
| backend `GrowthOneClickUnsubscribeWireTests` | 19 passed (4 new) |
| backend `FullyQualifiedName~Growth` | **589 passed, 8 failed, 3 skipped** |
| frontend `growth-guest-pages` + `journey-rerunnability` | 60 passed, 2 suites |
| frontend journey `growth-guest-unsubscribe` | 1 passed |

**The 8 backend failures are pre-existing and are not this lane's.** Verified rather than assumed: a pristine
worktree was cut at `8e2b57de`, built, and the same filter run — the *same 8 test names* fail there
(`Failed: 8, Passed: 27`). They are the SQL-Server and migration-lineage tiers, which need a database this lane
has no slot for. The baseline worktree was removed afterwards.

## 10. Constraints

- **C1** — no `UPDATE`/`DELETE` against an append-only table; no append-only entity mutated. The lane writes no
  SQL at all.
- **C2** — no migration added. `UnsubscribePageBaseUrl` is configuration, not a column.
- **C3** — the capability is reachable, and the reachability is walked. Service, settings, controller route and
  the **navigation entry** all land here; for this guest surface the mail *is* the navigation entry, which is
  precisely what was missing. The token-less arrival is asserted so the claim is tested, not stated.
- **C4** — no money-path write is touched.
- **C5** — **not claimed.** Nothing here is marked verified or accepted. The journey artifact and the
  screenshots exist so a person can walk it; Sven's acceptance is the gate, not this file.
- **C6** — GDPR art. 7(3) and RFC 8058 are named in code comments beside the mechanism that satisfies them
  (the working exit, the no-confirmation completion, the non-redirected POST). No UI string added or changed
  names a statute. Two now-false statements were deleted in the same change that falsified them.
- **C7** — one violation found *in this lane's own diff* and fixed before landing (§6). No log or telemetry call
  was added anywhere. The journey asks the fixture a yes/no question rather than having the token echoed back,
  and the artifact was grepped for the token afterwards: **no match** in `artifacts/`.

## 11. Hazards observed and not touched

- `Web-modules` carries **189 modified files** from other lanes; `OkamAPI-modules` is on another lane's branch.
  Both were left exactly as found. Every commit below is by explicit pathspec — never `git add -A`.
- **`reuseExistingServer` silently borrowed two foreign e2e fixtures.** The first journey run reused a fixture
  on port 4010 from another lane, and a later one reused port 4021 belonging to a run in
  `/Users/svendaneel/okam/web-kodeui`. Both served *old* code, and the symptom was an HTTP 401 that looked
  exactly like a missing route. Neither process was killed. The passing run used `CI=1` (which disables
  `reuseExistingServer`) on ports 3137/4137, verified free first. **Anyone running journeys on this machine
  while other lanes are live should do the same, or they will silently measure someone else's tree.**
- Two SQL containers (`okam-lvsp-sql`, `okam-lwr-sql`) belong to other lanes and were not touched.
- `node_modules` was symlinked into the frontend worktree from the shared checkout rather than installed.

## 12. Residuals

1. **The committed capture files carry a token — RULED ON, and the ruling came with two conditions, both now
   met.** The coordinator ruled on 2026-08-04 that the capture stays: the journey must open the link the
   dispatcher *composed*, and regenerating it would prove a constructed link instead. The token is dead by
   construction — in-memory SQLite destroyed at test exit, fictional host `web.growth.test`.

   - **Condition 1, the file must say what it is.** `capture/captured-exit-link.txt` now opens with a `#`
     annotation line stating exactly that, and `capture/README.md` explains all three files and leads with
     *"this is not a live credential and there is nothing to rotate"* for whoever a scanner sends here. The
     annotation is emitted by `WriteEvidence`, so a regeneration reproduces it rather than silently dropping
     it. The two message bodies deliberately carry no annotation: they are evidence of what the provider
     received, and a body with a line we added is no longer that.
   - **Condition 2, nothing may regenerate it against a real backend.** This needed a real change, because the
     `@fixture`/`grepInvert` arrangement does **not** cover it — see §14.
2. **Phase 1 only, and it needs no deployment change** — but going live does need `Growth:UnsubscribePageBaseUrl`
   pointed at the real consumer-web origin. The default is `https://okam.no/preferences/unsubscribe`.
3. **Accepted residual, carried forward from the assessment unchanged:** the footer link lands on a page that
   unsubscribes on arrival, so a mail scanner executing JavaScript could trigger it. One click means one click
   (RFC 8058 §1); the machine path stays the header POST. No change made.
4. The GET landing has no browser leg (§8).

## 13. Can anything regenerate the capture against a real backend?

Asked as two questions, because they have different answers and conflating them would have produced a
comfortable claim that was false.

**Spending the token against a live API — already forbidden structurally.**
`growth-guest-unsubscribe.spec.js` takes the default `@fixture` tag, and `playwright.config.js:142` sets
`grepInvert: LIVE_API ? /@fixture/ : undefined`. So the moment `E2E_API_BASE_URL` names a real backend, this
journey is skipped outright. Nothing was needed here.

**Regenerating the capture — NOT covered, and this is the change.** Regeneration does not happen in the journey
at all; it happens in the backend xUnit test, which Playwright's config has no reach over. Everything that made
the token inert — in-memory SQLite, the fake provider, a fictional origin — was merely *how the test happened
to be written*, and none of it was enforced. Repointing `GrowthDispatchTestSupport.UnsubscribePageBaseUrl` at a
real consumer-web host would have regenerated the file with a link naming a system that exists, and the commit
would have looked identical.

`WriteEvidence` now **refuses to write unless the captured link names `web.growth.test`**. The host literal is
duplicated inside the guard rather than read from the harness constant, because a guard expressed in terms of
the thing it guards cannot fail. Mutation-checked:

| arm | `GrowthDispatchTestSupport.UnsubscribePageBaseUrl` | result |
| --- | --- | --- |
| mutant | `https://okam.no/preferences/unsubscribe` | **FAIL**, and the evidence directory was **never created** |
| restored | `https://web.growth.test/preferences/unsubscribe` | PASS, 5/5, capture written with its annotation |

The write is opt-in on top of that, gated on `GROWTH_EXIT_EVIDENCE_DIR`, which has no default.

The journey was re-run against the annotated capture (`status: passed`, 7 steps) to prove the parser finds the
link past the `#` line, and the regenerated token was grepped for in `artifacts/`: **no match**.

## 14. Files

```
backend  /Users/svendaneel/okam/wt-gr-exitmail  (branch lane/gr-exit-wire-the-mail)
  Models/AppSettings/GrowthSettings.cs                                  modified
  Services/Growth/GrowthUnsubscribePageLink.cs                          new
  Services/Growth/GrowthMarketingFooter.cs                              modified
  Services/Growth/GrowthDispatchService.cs                              modified
  Services/Growth/GrowthNewsletterService.cs                            modified
  Controllers/GrowthPreferenceController.cs                             modified
  WebApi.Tests/Growth/GrowthUnsubscribeExitReachabilityTests.cs         new
  WebApi.Tests/Growth/GrowthDispatchTestSupport.cs                      modified
  WebApi.Tests/Growth/GrowthLane3TestSupport.cs                         modified
  WebApi.Tests/Growth/GrowthEndpointContractTests.cs                    modified
  WebApi.Tests/Wire/GrowthOneClickUnsubscribeWireTests.cs               modified

frontend /Users/svendaneel/okam/wt-fe-exitmail  (branch lane/fe-gr-exit-wire-the-mail)
  pages/preferences/unsubscribe.vue                                     modified
  test/e2e/fixture/growth.js                                            modified
  test/e2e/fixture/api-server.js                                        modified
  test/e2e/journeys/growth-guest-unsubscribe.spec.js                    new
  lanes/L-GR-EXIT-WIRE-THE-MAIL/evidence.md                             this file
  lanes/L-GR-EXIT-WIRE-THE-MAIL/capture/*                               new (see residual 1)
  lanes/L-GR-EXIT-WIRE-THE-MAIL/journey/*                               new
```
