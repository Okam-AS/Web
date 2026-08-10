# L-SECRETS-READ-FROM-CONFIG — evidence

Backend work only. Values are named nowhere in this file (C7); keys are.

## Where the work is, and why it is not in the shared checkout

`git -C`, `cd <shared>` + git, and `git worktree add` are all refused from this Web-isolated worktree —
the harness rejects any git operation that leaves it. The brief anticipated this. So the backend was
taken as a **source copy**: `git clone --local` of `/Users/svendaneel/okam/OkamAPI` into
`<worktree>/.lane/be`, checked out at `feature/restaurant-modules` tip **8e2b57de**, with the push
remote disabled (`git remote set-url --push origin DISABLED-no-push`). Nothing was pushed and no
shared branch was written.

- Base: `feature/restaurant-modules` @ `8e2b57de8442a389a9b5f8025312c9750614c85e`
- Local commit: `14e8665520a2916881fb7795f3858ba262bf0307` on local branch `lane/secrets-read-from-config`
- Portable patch: `lanes/L-SECRETS-READ-FROM-CONFIG/secrets-read-from-config.patch` (`git am` it)
- `../OkamAPI-modules` was **not** used: it is stale (branch `lane/meals-grace-pins`, Aug 2, and it does
  not even contain `Services/OkamFunctionsDocumentRenderer.cs`). Cross-checked instead against the tip:
  the four credential sites are byte-identical between the clone and the shared checkout for the two
  files that exist in both.

## What changed

`Helpers/RequiredCredentials.cs` (new) declares the four keys once and holds `IsUnset` +
`RequireConfigured`. `Program.Main` calls it immediately after the fiscal-journal Key Vault guard
(the shape the brief pointed at), before `AddJWTAuthentication` reads the signing key eagerly.

| credential | key | committed where now | direction |
| --- | --- | --- | --- |
| JWT signing key | `AppSettings:Secret` | `appsettings.Development.json` only | inbound |
| power-user code | `AppSettings:PowerUserVerificationCode` | `appsettings.Development.json` only | inbound |
| Edda.AI order key | `ExternalApi:EddaOrdersApiKey` | nowhere | outbound |
| Functions host key | `DocumentRenderer:FunctionKey` | nowhere | outbound |

`appsettings.json` — the file every environment loads — now carries only the repository's own
`"Set in Azure…"` placeholder for all four, and `IsUnset` rejects that spelling as well as absence, so
an operator who copies the placeholder into an app setting does not satisfy the guard.

The split is deliberate. The two INBOUND values authenticate callers **into** this API and are what a
local sign-in, `Scripts/demo/demo-up.sh` and the wire tier all mint, verify and type; they stay
committed, scoped to a file no deployed environment loads. The two OUTBOUND ones authenticate this API
to somebody else and are committed nowhere.

`StoresController.GetOrdersForDate` reads `ExternalApi:EddaOrdersApiKey` and denies everyone when it is
unset (the old `!=` against a literal would, against null, have read an absent header as a match).
`OkamFunctionsDocumentRenderer` reads `DocumentRenderer:FunctionKey` and refuses to render when unset,
naming the key and never the value.

Test-side changes forced by the renderer's constructor and by the deleted `const`:
`WireTestDoubles.RecordingDocumentRenderer` takes `IConfiguration`; `PdfRendererOutageWireTests` and
`DocumentRendererFailureTests` stop reflecting the key off the production type — the first reads the
live host's configured value, the second supplies its own. `WireHost.ConfigurationOverrides` gains
`Set` entries for both outbound keys, with the reason: without the Edda one the anonymous route denies
every caller and a working comparison is indistinguishable from a deleted one, and without the renderer
one `WireContainmentTests` would prove its containment claim by the wrong refusal (the renderer's own
configuration check instead of the outbound block). The `InboundOnlyCredentials` note for
`AppSettings:Secret` is corrected: its old text said a committed signing key "can only be dealt with by
rotating it out of appsettings.json", which this change does.

## Suite evidence — non-SQL tier only, no container started, stopped or entered

Filter `--filter "Database!=SqlServer"`, both runs in the same clone on the same base.

| run | passed | failed | skipped | total |
| --- | --- | --- | --- | --- |
| BASE `8e2b57de`, clean checkout | 4638 | 0 | 12 | 4650 |
| AFTER `14e86655` | 4672 | 0 | 12 | 4684 |

Delta **+34 passed, +34 total, 0 failed, skipped unchanged** — accounted for test by test, all of them new:

- `Configuration/RequiredCredentialsTests` — **21**: registry shape (1); refuses when one credential is
  absent, one key at a time (4); refuses the committed placeholder, one key at a time (4); starts when
  all four are configured (1); Development starts with nothing configured, three spellings (3); every
  non-Development environment is guarded, incl. Staging/Test/empty (4); `appsettings.json` commits none
  of them (1); the development file supplies both inbound and neither outbound (1); no application
  source file re-spells a value the development file holds (1); no committed Bruno request file sends the Edda key as a literal (1).
- `Configuration/CredentialStartupGuardTests` — **2**: the real composition root refuses to start in
  Staging with all four unset; the same environment runs past this guard once they are supplied.
- `Configuration/DocumentRendererKeyIsConfigurationTests` — **6**: the posted URI carries the configured
  key, two different values (2); unset/blank/whitespace/placeholder refuse and name the key (4).
- `Wire/EddaOrdersApiKeyWireTests` — **5**: the configured key opens the route (403 from the allow-list,
  not 401 from the credential); a wrong key and an empty key are refused (2); no key at all is refused;
  the running host reads the key from configuration and no committed JSON file supplies one.

No pre-existing test changed its verdict. `WireContainmentTests`, `PdfRendererOutageWireTests` and
`DocumentRendererFailureTests` — the three suites this diff touches — were re-run together with the new
ones after every mutation was restored: **74 passed / 0 failed**.

## Red before green

The two test classes that could compile against unmodified production code were run first, with
`RequiredCredentials.cs` present but nothing wired: **5 failed / 17 passed** — the `appsettings.json`
pin, the development-file pin, the re-spell pin, and both boot tests.

## Reds when a literal is put back — one mutation at a time, each restored with `cp` + `touch`

A stand-in literal was used rather than any real value, so this check is not a second place a credential
is committed. Every run was a full build (no `--no-build`, per the repo's stale-assembly warning).

| # | mutation | result |
| --- | --- | --- |
| M1 | a usable literal restored to `appsettings.json` `AppSettings:Secret` | `RequiredCredentialsTests.The_file_every_environment_loads_commits_none_of_these_credentials` **FAIL** (1/20) |
| M2 | `StoresController` compares against a literal again | `EddaOrdersApiKeyWireTests.The_configured_key_is_the_one_that_opens_the_route` **FAIL** (1/5) |
| M3 | renderer puts a literal in the URI again | `DocumentRendererKeyIsConfigurationTests.The_renderer_posts_the_key_configuration_gave_it` **FAIL** on both values (2/6) |
| M4 | `RequiredCredentials.RequireConfigured(...)` deleted from `Program.Main` | `CredentialStartupGuardTests.The_real_composition_root_refuses_to_start_in_a_deployed_environment_with_these_unset` **FAIL** (1/2) |
| M5 | the development file's power-user code blanked | `The_development_file_supplies_the_inbound_credentials_and_no_outbound_one` and `No_application_source_file_re_spells_...` **FAIL** (2/20) |
| M6 | a literal restored to the Bruno request file's `X-Okam-ApiKey` header | `No_committed_request_file_carries_the_key_the_anonymous_order_read_compares` **FAIL** (1/21) |

M4 is the one that matters most: it is the estate's unreachable-guard shape, and the test boots the real
entry point rather than calling the guard. Both boot tests satisfy the fiscal-journal Key Vault guard
explicitly, so what they observe is this guard's verdict and never that one's.

Run logs: `<worktree>/.lane/out/{baseline,after,red1,green1,green2,m1..m5}.txt`.

## What each caller needs

- **`Scripts/demo/demo-up.sh` and the six seeds — nothing.** They run `ASPNETCORE_ENVIRONMENT=Development`
  (`demo-up.sh:126`) and never set either AppSettings value, so `appsettings.Development.json` supplies
  them exactly as `appsettings.json` used to. Their `747475` defaults still match. Only the comments
  changed, to say the default tracks the DEVELOPMENT value and does not follow a deployed rotation.
- **The owner's live world (:5971 / `wt-lwtwo-api`) — nothing**, same reason. Not restarted, not touched.
- **The wire tier — nothing**, it runs Development.
- **CI (`.github/workflows/azure-webapps-dotnet-core.yml`) — nothing.** It builds, tests and publishes; it
  never runs the app, and the guard only bites at runtime.
- **A local `dotnet run` that renders a PDF or exercises the Edda route** now needs
  `DocumentRenderer:FunctionKey` / `ExternalApi:EddaOrdersApiKey` in user secrets. Neither is used by any
  script, seed or demo in this repository; PDF rendering is the only visible loss and it fails with a
  message naming the key.
- **The Azure App Service — four app settings, before this ships**: `AppSettings__Secret`,
  `AppSettings__PowerUserVerificationCode`, `ExternalApi__EddaOrdersApiKey`,
  `DocumentRenderer__FunctionKey`. Without them it will not start. That is the intended behaviour and the
  reason the guard exists, but it is a deploy-order dependency somebody has to know about, so it is also
  written into the repository's `CLAUDE.md`.

## Not done, and why

- **Nothing was rotated and no value was invented.** The signing key and the power-user code were MOVED,
  not changed, so every existing development token and demo login still works. The two values previously
  deployed are readable by anyone with the source; the guard cannot tell an operator who re-supplies one
  from any other value, and refusing a specific value would mean carrying it in production code. Naming
  that in the guard's message was the alternative chosen.
- **`F-AZURE-FUNCKEY` is not cleared.** Its `clears_when` is rotation plus "never in a committed file";
  this removes the key from every committed file at the tip and makes the rotation a configuration
  change, but the key remains in history and the rotation itself is the owner's act. Sven ruled on
  2026-08-04 that no lane should spend time on it — no time was spent on rotation, only on making it
  possible.
- **`ExternalApi:ApiKey`** (the OTHER external key, `ExternalMenuController`) is untouched: it is already
  read from configuration, and it is a different lane's committed value.
- Two live GUID credentials in `Controllers/WoltController.cs` and `Services/WoltAuthService.cs` are
  still source literals. They are outside this brief's four and belong to the Wolt secrets finding.

## A fifth committed copy, found late, and closed

`Bruno/Okam API/stores/stores-{storeId}-orders.bru` sent the Edda.AI key as a literal header value. It
survived the first sweep because a `*.cs` / `*.json` / `*.sh` extension filter walks straight past `.bru`,
and it would have left the credential in the repository and the rotation an edit to this repository
however clean the application code was. It now sends `{{edda_orders_api_key}}` from the caller's own
Bruno environment — Bruno passes an undefined variable through verbatim, so an unset one fails the
request closed — and a derived test (M6 above) reds if any committed `.bru` sends that header as a
literal again.

## Flag for the owner, NOT fixed here: two committed bearer tokens

`Bruno/Okam API/environments/OKAM - prod.bru` commits `prod_token_98865120`, a **`PowerUserRole` bearer
token for production**, and the localhost environment commits a second one. They are minted with
`AppSettings:Secret` — the same trust root this lane moved into configuration — so they are the worked
example of the forgery the brief describes rather than an independent credential. The production one
carries `exp` 1782155686, which passed on **2026-06-22**, so it is expired; the key that signed it has
NOT been rotated, so a fresh one can still be minted by anyone with the repository.

Not touched, deliberately: they are neither of the four this brief names, deleting them from the tip
does not remove them from history, and they are the owner's own tooling. Rotating `AppSettings:Secret`
invalidates both, which is one more reason the rotation is worth doing rather than a reason to defer it.

## Incidental finding

Running the fast tier modifies two TRACKED files: `artifacts/journeys/ev-dietary/run-sheet.json` and
`run-sheet.md`. Both baseline and after runs rewrote them. They were reverted here and are not in the
commit, but a test writing into the working tree will show up as spurious diff in any lane that runs
the suite.
