# L-LIVE-WALK-MARGIN — Margin is the module where the lever works, and the walk still did not run

**Read-only lane. No container started, no process started, NO PORT BOUND (4010/4971/4973 never
touched — all three held by foreign node fixtures for the whole session), nothing committed, no ref
moved, no file written outside this directory and my RETURN.** No journey was run, live or fixture,
so this lane claims no run and offers no artifact as evidence of one.

Frontend read at `/Users/svendaneel/okam/Web-modules` HEAD **`8ac6f63`**.
Backend read at `/Users/svendaneel/okam/OkamAPI-grdelrec` = **`8e2b57de`** = `feature/restaurant-modules`
tip, `git status --porcelain` = 0 paths — so every line citation below is that commit's content. This
is the same pair both sibling lanes read, so the three returns are comparable line for line.

---

## 0. The resource, stated first so it is not mistaken for the reason

`docs/plan/plan.md` sizes all six `L-LIVE-WALK-*` lanes `class: node`; `caps in force: sql=2`; the two
`state: running` `class: sql` lanes are `L-WF-OPERATOR-UNIQUE` and `L-MIG-STACK-MERGE`. **The SQL cap
is full and I am not one of the holders**, and my brief grants no slot.

`test/e2e/scripts/live-world.sh:237-241` refuses to proceed unless a SQL container is **already
running**:

```
docker ps --format '{{.Names}}' | grep -qx "$SQL_CONTAINER" \
    || die "SQL container '$SQL_CONTAINER' is not running.
```

**Measured, not inferred:** `docker ps` returns **zero running containers**. Three mssql containers
exist — `okam-lws-sql`, `okam-lws-staff-sql`, `zen_pasteur` — and all three are **`Exited (0) 41 hours
ago`**. None of them is mine; starting one is starting a container. So there is no world to borrow and
no world I may create.

**What I did NOT measure, and therefore do not claim.** `F-SQL-HEADROOM` was raised on a measurement
taken *inside* the Docker VM (1114 MB of 7837 available, swap 1018 of 1024 consumed) against **five
standing worlds**. Those five are gone: `docker ps` is empty and `docker info` reports MemTotal
**8217473024 B (7.65 GiB)**. I could not re-measure available memory or swap inside the VM, because
reading them means running a container. **So the flag's premise no longer holds — but the block here
is the slot grant, not memory, and I am not offering memory as the reason.**

---

## 1. THE HEADLINE: Margin has NEITHER sibling defect, and one open flag says otherwise

The brief sent me to check three things. All three come back clean, and the third **corrects a
sentence in an open blocker flag**.

### 1a. The effective resolver IS registered — the flag text says it is not

`F-GROWTH-MODULE-LEVER-CANNOT-TURN-ON` (plan.md:25006) states:

> implementations exist for **Workforce and Margin only**, and just one is registered in the
> composition root.

The second half is **true of `Program.cs` and false of the application.** `Program.cs:783` is indeed
the only `IStoreFeatureFlagEffectiveResolver` line in that file (Workforce's). Margin's is registered
one call away:

* `Program.cs:1160` — `services.AddMarginModule();`
* `Helpers/Margin/MarginModuleServiceCollectionExtensions.cs:35` —
  `services.AddScoped<...IStoreFeatureFlagEffectiveResolver, MarginModuleFlagEffectiveResolver>();`

The extension's own header says why it is not in `Program.cs`: *"the SINGLE dependency-injection seam
for the Margin module (plan §S0) … so the four parallel MG-W2 lanes append one line each to the fenced
region below instead of editing Program.cs"*. A grep of the composition root cannot see it. **Margin
is not in Growth's position; it is the working precedent the interface doc already names.**

### 1b. The master IS declared — as an allow-list, not a boolean

`appsettings.json:170-174`:

```json
"Margin": {
  "EnabledStoreIds": [],
  "PriceImport": false,
  "Statements": false
},
```

Declared, with its shipped value, and **shipped dark everywhere** (`MarginModuleSettings.cs`:
*"Absent/empty config = the module is dark everywhere (rollout stage S0)"*). There is no `Margin`
section in `appsettings.Development.json`, and none is needed. So Margin satisfies
`F-MODULE-MASTERS-ARE-UNDECLARED-AND-INVISIBLE`'s `clears_when` for its own master — it is neither
Events' absent key nor a boolean, but a **per-store allow-list**, a third shape that flag does not
currently describe.

### 1c. …and the override BEATS the master, which is the whole difference

`Services/Margin/MarginModuleGate.cs:33-43`:

```csharp
private bool Resolve(int storeId, string flagKey, bool configDefault)
{
    var over = _store != null ? _store.GetOverride(storeId, flagKey) : null;
    return over ?? configDefault;                       // :36
}
public bool IsModuleEnabled(int storeId)
{
    var enabled = _settings.CurrentValue.EnabledStoreIds;
    var configMaster = enabled != null && enabled.Contains(storeId);   // :42
    return Resolve(storeId, MarginFeatureFlags.Module, configMaster);  // :43
}
```

Compare `Services/Growth/StoreBackedGrowthFeatureFlags.cs:46-52`, which **ANDs** — *"Dark ⇒ no store
row can refine it on."* Margin **coalesces**. An operator flipping `Margin.Module` on
`/admin/feature-flags` writes a `StoreFeatureFlags` row, `GetOverride` returns `true`, and the master's
`false` is never consulted. **On a live world with the shipped empty allow-list, the lever really
turns the module on.**

### 1d. The board, the switch and the product agree, checked at all four joints

| joint | reads | citation |
|---|---|---|
| the switch | `PUT /stores/{id}/feature-flags` writes an override row; deny-closed to catalog keys, and all three `Margin.*` are in the catalog | `StoreFeatureFlagsController.cs:132`, `MarginFeatureFlags.cs:39-41`, composed at `Program.cs:763` |
| the board | asks the resolver FIRST, which asks the gate | `StoreFeatureFlagsController.cs:55-66`, `MarginModuleFlagEffectiveResolver.cs:35-48` |
| the routes | every `margin/*` action gates on the same gate; **the two stage surfaces gate on their stage flag, not just the master** | `MarginControllerBase.cs:54-64`; `MarginStatementsController.cs:122` (`IsStatementsEnabled`); `MarginPriceImportsController.cs:231` (`IsPriceImportEnabled`) |
| the page | reads `GET /margin/status`, which reports the gate — not the board | `pages/admin/margin-suppliers.vue:353-358`; `MarginStatusController.cs:62-64` |

**No divergence at any joint.** Margin is the counter-example both flags need, and its fixture is
faithful *for the flag family*: `test/e2e/fixture/margin.js:811,824,842` models
`moduleOn && flagEffective(stage)`, which is exactly the gate — and because Margin's real master is an
empty allow-list that the override beats, **the fixture's "no outer master" model is behaviourally
identical to the shipped product here**, by luck of shape rather than by design.

---

## 2. WHAT WOULD ACTUALLY STOP THE WALK, given a slot — the world, not the wire

`margin-supplier-to-plate` asserts a world `live-world.sh` does not build. This is the difference the
brief asked me to name, and it is **furniture, not plumbing**:

1. **Two suppliers must pre-exist.** Step 2: `await expect(suppliers).toHaveCount(2)` — `world.js:833`
   seeds `Bergen Storkjøkken AS` and `Nordane Kaffe`. Step 6 then creates a third and asserts
   `toHaveCount(3)`, so the constant is load-bearing twice. `live-world.sh` step 5 seeds a store, a
   manager and three Workforce tables, and **zero Margin rows**.
2. **A product `Vaffel med rømme` must exist, priced on two bases.** The walk links the recipe to it
   and asserts `kr 30,00` net Base and a Table row (`kr 35,50` contribution ⇒ `kr 40,00` net).
   `live-world.sh` seeds **no products and no goods groups**.
3. **Both specs are `@fixture`** (`support/journey.js:836` default), so live mode selects zero of them.
   Re-tagging is the last step, not the first.

None of these needs a product change — they need `live-world.sh`'s seed section extended, which its own
header prescribes (*"the next journey to go live extends the seed section below"*) and which
`L-LIVE-SEED-VIA-PRODUCT` owns, not this lane.

---

## 3. THE FIXTURE DIVERGENCE I CAN NAME WITHOUT RUNNING: the third price basis

The brief said to expect the fixture to have been lying. The one I can prove from the source is in the
menu-margin read, and it is a **row-count** divergence the walk has never seen.

`Services/Margin/MarginProductCatalogReadModel.cs:76-81` emits **all three bases for every product,
unconditionally** —

```csharp
private static readonly MarginMenuPriceBasis[] Bases =
{
    MarginMenuPriceBasis.Base,
    MarginMenuPriceBasis.Table,
    MarginMenuPriceBasis.Delivery,
};
...
Prices = Bases.Select(basis => PriceFor(p, basis)).ToList(),
```

— and `Services/Margin/MarginMenuMarginService.cs:123` emits one row per price
(`foreach (var price in product.Prices)`). The fixture emits only the bases its world declares:
`world.js:812-830` gives `Vaffel med rømme` **two** (`Base`, `Table`) and `Kaffe` **one**.

So a live run renders **three `[data-test="mm-row"]` per dish** where every capture in the estate has
shown two and one. `margin-supplier-to-plate` addresses its rows by `data-basis`, so `Base` and `Table`
still resolve — but its closing
`await expect(page.locator('[data-test="mm-withheld"]')).toHaveCount(0)` is **page-wide**, and a
`Delivery` row is a row this walk has never been shown. Whether it reds depends on
`Product.CatalogUnitLine(Delivery)`, which I did not execute and therefore do not predict.

Two smaller shape divergences, neither assertion-breaking because the walk selects by label:
`MarginMenuMarginRow.ProductId` is a **`Guid`** (`Models/Margin/MarginMenuMarginModels.cs:69`) against
the fixture's `'prod-vaffel'` slug; and the fixture says so itself — *"WHAT IT IS NOT: a model of the
backend. There is no sub-recipe explosion and no VAT engine — a product carries its net directly."*

**Checked and NOT a gap, because a sibling found one:** no margin journey calls a `__fixture` route
(unlike Growth's `mailbox()`), and `utils/margin/supplier-client.js` is route-for-route with
`MarginSuppliersController` — I diffed its nine documented routes against the controller's `[Http*]`
attributes and every one resolves. **No phantom route.** The freeze walk's quoted refusal is the
server's own: `MarginStatementProblems.cs:61` — *"This statement is finalized and immutable"*.

---

## 4. What a follow-on lane needs, in order

1. A **SQL slot** (`class: sql`) — none of the six `L-LIVE-WALK-*` lanes was given one, and this is now
   the third consecutive live-walk lane to return on it. Nothing else on this list is a product change.
2. **No Margin switch in `live-world.sh`.** Unlike Events and Growth, Margin needs none: the walk pulls
   its own lever through `/admin/feature-flags` and the gate honours it (§1c).
3. **Seed extension** — two suppliers, and one product with a Base and a Table price (§2).
4. **Re-tag** both margin specs off `@fixture`, last.
5. §3 is a **repair or a walk amendment**, not a prerequisite; a live run made before it would red, and
   it would red for the right reason.
