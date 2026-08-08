# Census — `Identity.Name` versus the user id

Read-only census of `OkamAPI-modules` at `feature/restaurant-modules` @ `ada218783`. **Nothing was edited.**
No tier was run. The brief names the trunk as `bcfe0d893`; it is `ada218783`, moved by the credential lane
that landed before this one.

## The headline correction

**The two are interchangeable in production today, and that is *why* no test can see a swap — not a
fixture defect.** The application's own JWT emits `unique_name` = `user.Id`
(`Services/UserService.cs:609`), the JWT bearer handler applies the default inbound claim map with no
`MapInboundClaims = false` and no `NameClaimType` override (`Helpers/ServiceCollectionExtensions.cs:194-216`),
so `Identity.Name` **is** the user id on every JWT-authenticated request. `WireHostFixture` reaches that
state by calling the real `IUserService.GenerateJwtTokenAsync` (`WebApi.Tests/Wire/WireHostFixture.cs:993`),
so it is *faithful to production*, not a shortcut.

So this is **a latent estate-wide coupling, not a live exploit**. The sites below are correct today and
break the day any principal whose `Name` is not the id reaches them. One spot is genuinely uncertain and is
marked as such.

### The three principal shapes

| # | Issued at | `Identity.Name` is | Equal to the id? |
|---|---|---|---|
| 1 | `Services/UserService.cs:609` — the app's JWT | `user.Id` via `unique_name` | **yes** |
| 2 | `Controllers/OAuthLoginController.cs:129` — OAuth login cookie | `user.PhoneNumber` | **no** |
| 3 | `Controllers/OAuthAuthorizationController.cs:159` — OpenIddict MCP token | `user.DisplayName` | **no** |

Shape 3 was not named in the brief. It is worse than a phone number: a display name is not unique and not
stable, so a swap there is not merely wrong for one user, it can *collide* two.

**Reachability of the divergent shapes, traced rather than assumed:**

- Shape 2 is a cookie (`Helpers/PolicyNames.cs:5`, registered `ServiceCollectionExtensions.cs:62`) read in
  exactly **one** place — `Controllers/OAuthAuthorizationController.cs:58` — which resolves the user from
  `ClaimTypes.NameIdentifier` / `Claims.Subject` (`:135-136`), never from `Name`. **No live defect.**
- Shape 3 is scoped to the MCP resource (`identity.SetResources`, `:150`) under its own scheme
  (`PolicyNames.cs:6`), so it does not reach the controllers in the table below.

## Column 1 — production sites where the two are NOT interchangeable

Only sites where a swap changes behaviour. Reads that render a display string are excluded; so are the
~135 raw occurrences that merely pass the value to something that treats it as an id *and* is unreachable
by shapes 2 and 3.

### C4 money-path first — a value both attributed and authorized by `Name`

| Site | What the value becomes | Why a swap changes behaviour |
|---|---|---|
| `Services/CartService.cs:1025` | `cart.UserId = user.Identity.Name` | **Persists attribution.** A phone number or display name is written into `Cart.UserId`, and every later `UserId ==` lookup for that cart misses, orphaning it from its owner. |
| `Services/OrderService.cs:683` | `UserId = user.Identity?.Name` | **Persists attribution on an order.** The row that money is later reconciled against names a string that is not a user id; C4's audit trail then names nobody resolvable. |
| `Controllers/DinteroController.cs:66` | `UserId = User.Identity.Name` | Same, on the payment-provider path — the order created for a Dintero session carries the wrong owner. |
| `Controllers/VippsController.cs:427` | `UserId = User.Identity.Name` | Same, on the Vipps path. |
| `Services/OkamPayoutService.cs:108,140,162` | `store.StoreAdmins.Any(x => x.ApplicationUserId == user.Identity.Name)` | **Authorization on payouts.** Three separate gates. A non-id `Name` matches no admin row, so the genuine store admin is refused — and the failure is a silent denial, not an error. |
| `Services/OrderService.cs:777,781` | `order.UserId == user.Identity.Name` | **Authorization to cancel or complete an order.** The genuine customer is refused. |
| `Services/OrderService.cs:788` | `!string.Equals(user.Identity.Name, order.UserId, …)` | **Inverted**: this decides "requested by store". A swap makes the customer's own request read as the store's, which is the dangerous direction — it grants rather than denies. |
| `Controllers/PaymentController.cs:32,67,82,98,114` | passed as the user key to Stripe payment-method reads and intent creation | A non-id key returns another user's payment methods or none; `:32` creates a payment intent under the wrong user. |
| `Controllers/BankAccountController.cs:28,58,73,88` | Stripe Connect account create / login-link / get / delete | **Connect account lifecycle keyed by `Name`.** `:58` mints a login link and `:88` deletes an account. |
| `Controllers/GiftcardController.cs:54,70,85,100,169,184` | the holder key for validate, purchases, get, transactions, initiate-purchase | Gift cards are bearer value. A swap either exposes another holder's cards or hides the genuine holder's. |
| `Services/DinteroService.cs:192,198` | cart load key, then `u.Id == user.Identity.Name` | Loads the cart to be paid for. A miss silently pays for an empty or foreign cart. |

### Authorization and lookup outside the money path

| Site | Why a swap changes behaviour |
|---|---|
| `Services/OrderService.cs:128` | `sa.ApplicationUserId == user.Identity.Name` — store-admin gate. |
| `Services/OrderService.cs:1256` | `u.Id == user.Identity.Name` — resolves the acting user; a miss yields `null` and the caller proceeds unattributed. |
| `Services/CartService.cs:940,946,958,1118` | cart ownership lookups keyed by `Name`. |
| `Controllers/DinteroController.cs:498,499` | `isAdmin` decision, then user load. |
| `Controllers/AccountingController.cs:77,79,102,104` | guards on blank, then passes `Name` as the admin identity to read and **update** accounting configuration. |
| `Controllers/VippsController.cs:391` | `_userService.GetByIdAsync(User.Identity.Name)` — an id-typed lookup. |

### Already documented in the tree as a related hazard

`Services/Meals/MealsStatementService.cs:827-828`, `MealsCompanyService.cs:480-482`,
`MealsAgreementService.cs:263-265`, `MealsReconciliationService.cs:359-361` carry comments recording that
`StoreAdminPolicy`'s PowerUser branch admits a principal whose `Identity.Name` is **blank** rather than
absent, and that `ActorClaims` rejects blank. Those four are not swap hazards but they are the same
conflation seen from the other side, and they are already handled by a throw.

### The one uncertain site — flagged, not asserted

`Mcp/Services/McpShoppingService.cs:1138-1156` (`RequirePrincipal`). It normalises the MCP principal:
returns early if `user.Identity?.Name == userId`, otherwise appends `ClaimTypes.Name = userId` **only when
no `ClaimTypes.Name` claim already exists**, then rebuilds the identity with `ClaimTypes.Name` as its name
type. Shape 3 carries `Claims.Name` (the short form `"name"`) = `DisplayName`.

Whether the repair fires therefore depends on whether OpenIddict validation leaves the claim as `"name"` or
maps it to the `ClaimTypes.Name` URI. **If it leaves it short, the guard adds the id and the principal is
correct.** If it maps it, the guard sees a `Name` claim, skips the repair, and `Identity.Name` is the
display name for the whole MCP shopping path — carts and orders.

`AddValidation` sets only `UseLocalServer()` and `UseAspNetCore()`
(`Helpers/ServiceCollectionExtensions.cs:128-132`), with no mapping directive either way. **I did not
execute this**, and static reading cannot settle it. It wants one runtime assertion.

## Column 2 — fixtures and helpers that mint them equal

| Helper | Line | Downstream |
|---|---|---|
| `WireHostFixture` (via the real `GenerateJwtTokenAsync`) | `WebApi.Tests/Wire/WireHostFixture.cs:993` | **42 files, 263 `[Fact]`/`[Theory]` declarations** |
| `WireHostFixture.ModuleCallerTokenFor` — hand-mints `unique_name` and `nameid` from one string | `WebApi.Tests/Wire/WireHostFixture.cs:402` | subset of the above |
| `WireBearerTokens.MintFor` | `WebApi.Tests/Wire/WireHostFixture.cs:982-993` | 8 files, 32 declarations |
| `AdminKraviaInvoicesControllerTests` — `NameIdentifier` and `Name` both `userId` | `:189` | 1 file |
| `MarginTenantIsolationSweepTests` — both `userId` | `:1185` | 1 file |
| `EventsStoreAdminAuthorizationPinTests` — equal-minting branch | `:539,544` | 1 file (also mints them apart, below) |
| `DinteroControllerTests` — `ClaimTypes.Name` = `userId`, no id claim | `:159` | 1 file |
| `GrowthTestSendRateLimitTests` — `ClaimTypes.Name` = `actorId` | `:214` | 1 file |
| Margin controller tests — `NameIdentifier` only, no `Name` | `MarginBTestHost.cs:80`, `MarginDraftEditRoundTripWireTests.cs:320`, `MarginJourneyE2ETests.cs:932`, `MarginModuleScaffoldTests.cs:204`, `MarginPriceImportsControllerTests.cs:156`, `MarginRecipesControllerTests.cs:170`, `MarginStatementsControllerTests.cs:185`, `MarginStatusHonestStateTests.cs:256` | 8 files — these mint *no* `Name`, so they cannot see a swap either |

## The blindness is not total — existing coverage that DOES distinguish

This is the part a raw grep would have missed, and it narrows the finding:

- `WebApi.Tests/Auth/ActorStampCallSiteTests.cs:61-62` — `NameIdentifier` = user id, `Name` = **phone
  number**. Deliberately divergent. `:96-97` also pins blank-`NameIdentifier` with `unique_name` set.
- `WebApi.Tests/Auth/ModuleAuthorizationSubjectTests.cs:56-58` — id, phone and `sub` all distinct; `:149`
  builds a `Name`-only principal under `"OAuthLoginCookie"`, i.e. shape 2 explicitly.
- `WebApi.Tests/Events/EventsStoreAdminAuthorizationPinTests.cs:305-306,363-364` — `OAuthUserId` against
  `OAuthPhoneNumber`, shape 2 again.

So `ActorClaims` itself is covered against the divergence. What is uncovered is the **call sites in Column
1**, which read `Identity.Name` directly and never go through `ActorClaims`.

## Coverage — what I read, and what I did not

**Read in full:** both token issuers (`UserService.cs:603-620`, `OAuthLoginController.cs:118-140`), the
OpenIddict issuing path (`OAuthAuthorizationController.cs:50-163`), the JWT and cookie registration
(`ServiceCollectionExtensions.cs:43-216`), `ActorClaims.cs`, `McpShoppingService.RequirePrincipal`, and
every Column 1 site listed above.

**Grepped but not read line by line:** the remaining ~135 `Identity.Name` occurrences across
`StoresController.cs` (30), `UserController.cs` (17), `OfferProposalsController.cs` (15),
`OffersController.cs` (8), `CartsController.cs` (5), `KamController.cs` (4), `StoreService.cs` (4) and
others. They follow the same shape — `Name` used as a user id — so they are **latent members of Column 1**
rather than exclusions. I did not list them individually because listing every occurrence is what the brief
warns makes a census worthless; they are named here as a bounded remainder, not as a clean bill.

**Not examined at all:** the frontend repo; SQL-tier and container-backed suites; whether any *other*
`AuthenticationScheme` is added at runtime by configuration rather than code. **Not executed:** the MCP
claim-mapping question above — the single fact that would move it from uncertain to settled.

**Method note:** counts here come from iterating files in Python, not a shell loop — a first attempt
word-split on newlines and reported `0` declarations across 42 files.
