# L-LIVE-WALK-GROWTH — why the Growth walk cannot be made live, named wire by wire

Read-only lane. **No container started, no process started, no port bound, no file outside this
directory written, no ref moved, nothing committed.** No journey was run, live or fixture, so this
lane claims no run and offers no artifact as evidence of one.

Frontend read at `/Users/svendaneel/okam/Web-modules` HEAD `8ac6f63`.
Backend read at `/Users/svendaneel/okam/OkamAPI-grdelrec` = `8e2b57de` = `feature/restaurant-modules`
tip, `git status --porcelain` = 0 paths, so every line/file citation below is that commit's content.

---

## 0. The resource, stated first so it is not mistaken for the reason

`docs/plan/plan.md` sizes all six `L-LIVE-WALK-*` lanes `class: node`. The two `state: running`
`class: sql` lanes are `L-WF-OPERATOR-UNIQUE` and `L-MIG-STACK-MERGE`; `caps in force: sql=2`. The
SQL cap is therefore **full and I am not one of the holders**, and my brief grants no slot —
"Never start a container unless your brief grants the slot". `docker ps` is empty and no API is
listening (only foreign node on 4010/4971/4973), so there is no standing world to borrow either.

**This is not the blocker.** A SQL slot would not have produced the exit. The wires below would have
stopped the walk on a perfectly healthy world, and that is what this lane is returning.

---

## 1. THE CONFIRM LINK EXISTS ONLY INSIDE A SENT MESSAGE — there is no live read path

`Services/Growth/GrowthSubscriptionService.cs:89-92`

```
var opaque = _tokens.IssueLinkToken().RawToken;
var rawConfirmToken = VersionPrefix + command.ConsentTextVersionId.ToString(CultureInfo.InvariantCulture)
    + VersionSeparator + opaque;
var confirmTokenHash = _tokens.HashLinkToken(rawConfirmToken);
```

The raw token is written to **one** place — the mail (`:136`, `new GrowthConfirmationMail(...,
rawConfirmToken, ...)`) — and to the database only as `ConfirmTokenHash` (`:105`, `:115`).
`Entities/Growth/GrowthSubscriptionInvite.cs:8-9` says it in its own words: *"Only the token HASH is
stored, never the token."* The entity carries `Id, ContactPointId, StoreId, ConfirmTokenHash,
ExpiresAt, ConfirmedAt` and no raw column.

Swept for any other exit: `grep -rn "rawConfirmToken|RawToken" Controllers Services Models` (minus
tests) returns only the mint site and `GrowthPreferenceService.cs:67`. `GrowthOpsController` exposes
one PowerUser action (`ops/address-rekey`). There is no `__fixture`-shaped control surface and no
`IsDevelopment()` branch anywhere in the Growth controllers.

**Consequence.** `test/e2e/journeys/growth-guest-lifecycle.spec.js`'s `mailbox()` helper
(`GET /__fixture/growth-links?address=`) has **no live analogue and cannot be given one by
discovery** — not from SQL, not from an admin route, not from the page. On a live backend the confirm
link is obtainable *only* by reading a delivered message. This is by design (single-use credential,
hash-at-rest) and it is correct design; it is also the wire that stops the walk.

## 2. …and the only transport that would deliver it is a production relay

`Program.cs:966-967` binds `IGrowthMailProvider` through `GrowthMailProviderSelection.Resolve`;
`appsettings.json:177` pins `"MailProvider": "Fake"`. The three options:

* **Fake** — `GrowthFakeMailProvider` is `AddScoped`, records into a private in-memory list, and
  surfaces it on no route. Out of process it is unreadable. This is today's default.
* **Postmark** — proven live once by `L-GROWTH-MAIL` against `POSTMARK_API_TEST`. The sandbox token
  *accepts* and **never delivers**, so the link is still unreadable. It is also the posture my brief
  names as the only thing keeping a 404 link out of a guest's inbox.
* **Smtp** — `GrowthSmtpMailProvider` sends through the app's existing `IEmailService`, i.e.
  `appsettings.json:22-25` `send.one.com:465` as `noreply@okam.no`. **That is okam's real production
  sending domain.** Selecting it on a live world means attempting real delivery to whatever address
  the walk types.

A local sink (`AppSettings__SmtpHost=127.0.0.1` + a lane-local SMTP listener) is the only shape that
delivers a readable message without real dispatch. It is constructible and it is **not** what this
lane was asked to build — it is a harness the live world does not have, and standing it up silently
would be the "second walk that will drift" the brief forbids.

## 3. THE WITHDRAWAL CANNOT BE REACHED AT ALL WITHOUT A REAL NEWSLETTER DISPATCH

`grep -rn "MintUnsubscribeTokenAsync"` (minus tests) has exactly **one** production caller:
`Services/Growth/GrowthDispatchService.cs:465`, inside the send loop.

So on a live backend there is no state in which a verified contact holds an exit credential and no
message has been sent. To reach `/preferences/unsubscribe?token=` live the walk must author, approve
and **dispatch** a newsletter — a marketing message, to the address it just captured.

`test/e2e/fixture/growth.js` already declares this as a known stand-in ("⚠ KNOWN DELTA — THE
UNSUBSCRIBE TOKEN'S PROVENANCE IS A STAND-IN"), and the spec files it as a `note`. Confirmed against
the product: the delta is real, and it is not a fixture convenience — it is the difference between a
walk that ends in a withdrawal and one that ends in a dispatch.

And the dispatch is exactly what must not happen: per `L-GROWTH-PREFCENTRE-1/2`,
`GrowthSettings.cs:53` defaults the preference-centre link to a URL that **404s in production** and
`GrowthDispatchService.cs:688` prints it in every send. That is the live statutory gap my brief told
me to name rather than route around. **Named. Not routed around.**

## 4. THE LEVER LIES ON A LIVE WORLD, AND ONLY ON A LIVE WORLD — a live-only defect

`Services/Growth/StoreBackedGrowthFeatureFlags.cs:48-52`: every `growth.*` flag is ANDed under the
module-wide `Growth:Enabled`; *"Dark ⇒ no store row can refine it on."* `appsettings.json:176` pins
`"Enabled": false`, and `test/e2e/scripts/live-world.sh` step 4 sets **no** module config masters
("No module config masters are set… a journey that needs a module's ROUTES to answer adds its switch
here and says why").

`Controllers/StoreFeatureFlagsController.cs:55-66` computes the board's `effective` as
`resolver ?? (overridden ? row.Enabled : descriptor.DefaultEnabled)`. Registered resolvers:
`WorkforceModuleFlagEffectiveResolver` (`Program.cs:783`) and `MarginModuleFlagEffectiveResolver`
(`MarginModuleServiceCollectionExtensions.cs:35`). **Growth registers none.**

`Services/Platform/FeatureFlags/IStoreFeatureFlagEffectiveResolver.cs:10-24` states the rule Growth
breaks, and names Margin as the precedent for precisely this shape: a resolver is required for *"a
gate that ANDs a flag under something else"*, and *"otherwise the lever silently stops working."*

**Therefore, on a live world with `Growth:Enabled=false`:** an operator opens `/admin/feature-flags`,
flips `growth.module`, the board reports it **on**, and `/subscribe/{store}` stays **dark** — the same
404 as a store that does not exist. Steps 2→3 of `growth-guest-consent` and step 1→2 of
`growth-guest-lifecycle` are exactly that sequence.

The fixture cannot see this: `test/e2e/fixture/growth.js` resolves `growth.module` out of the
per-store override table alone and models **no outer master at all**. This is the third instance of
the estate's own recorded pattern — "a fixture that modelled no feature gate and let three
store-addressed routes pass green" — and it is a *product* defect this time, not a fixture one.

## 5. THE FIXTURE PRINTS A CONSENT SENTENCE THE PRODUCT CANNOT PRODUCE

This is the one the brief predicted, and it lands on the single assertion on the surface that is
legal rather than cosmetic — `growth-guest-consent.spec.js:112-119`, *"the tick's label is the
server's sentence, character for character"*.

| | `test/e2e/fixture/world.js:669-675` | `Services/Growth/GrowthConsentTextSeed.cs:86-88` |
|---|---|---|
| id | `'cnst-v3-nb-no'` (string slug) | `long` (`GrowthConsentTextVersion.Id`; `Models/Growth/GrowthConsentTextModels.cs:18` `public long ConsentTextVersionId`) |
| version | `3` | `1` |
| text | `Ja, jeg vil ha nyhetsbrev på e-post fra denne **bedriften**. Jeg kan melde meg av når som helst, og avmeldingslenken ligger i hver e-post.` | `Ja, jeg vil motta nyhetsbrev med tilbud og nyheter på e-post fra denne **virksomheten**. Du kan melde deg av når som helst med lenken nederst i hver e-post.` |

Not one word in common past the first four. The version number differs. The id is a *string* where
the wire is a *long*.

The consent register is **not** a live-world gap — `Program.cs:387` calls
`GrowthConsentTextSeed.SeedAsync` on every boot, so a freshly migrated database has v1 for `nb-NO`
without a human. So a live run of this journey does not fail for want of data: it fails on
`expect(label).toBe(world.GROWTH_CONSENT.text)` and on `toContainText('versjon 3')`, against a server
that is serving the correct sentence at version 1.

The seed's own doc even warns a reviewer not to "fix" `denne virksomheten` — the fixture has already
made that edit, in the opposite direction, and nothing could catch it while nothing real answered.

**This is the finding the brief asked for.** The fixture-backed walk asserts a guest is shown, verbatim,
a consent sentence that the shipped product emits at no version, in no locale, on no deployment.

## 6. The rest of the delta, for whoever picks this up

* Both specs are tagged `@fixture` (`journey.js:832-836`, the default), so live mode selects zero of
  them. Re-tagging is the *last* step, not the first.
* `world.STORE_ID` (42) and `world.GROWTH_DARK_STORE_ID` (77) are literals. Live needs discovery for
  the first and a **second registered store** for the second; `live-world.sh` seeds exactly one.
  `growth-guest-lifecycle` needs only the first.
* No phantom route: all seven guest routes in `utils/growth/growth-guest-client.js:18-25` resolve to
  real actions on `GrowthSubscriptionsController` / `GrowthConsentTextsController` /
  `GrowthPreferenceController` at 8e2b57de. Checked because a sibling fixture had served one that no
  backend publishes.
* `Growth:RootSecret` is unset; under `ASPNETCORE_ENVIRONMENT=Development` (what `live-world.sh`
  sets) `GrowthAddressProtector` falls back to the JWT secret with a loud warning rather than failing
  fast, so turning `Growth:Enabled=true` on a *local* world is survivable. Outside Development it is
  a hard startup failure.

---

## What a follow-on lane actually needs

1. A **SQL slot** (`class: sql`), which none of the six `L-LIVE-WALK-*` lanes was given.
2. A **Growth switch in the live world's seed** — `Growth__Enabled=true` in `live-world.sh` step 4,
   which is `L-LIVE-SEED-VIA-PRODUCT`'s file, not this lane's.
3. A **readable mail sink** — the local-SMTP shape in §2, or a product-side control surface. Without
   one, §1 is absolute: subscribe→confirm cannot be walked live by anybody.
4. A **ruling on §3**: either the walk ends at the confirmation (and the exit sentence "a guest
   subscribes" is met, which is what `docs/plan/plan.md` actually says), or the withdrawal half waits
   on a real dispatch, which waits on the 404 preference link (`D-PREFCENTRE-DEPLOY`).
5. §4 and §5 are **repairs, not prerequisites** — but a live run made before them would red, and it
   would red for the right reasons.
