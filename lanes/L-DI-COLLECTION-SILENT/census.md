# L-DI-COLLECTION-SILENT - census of IEnumerable-shaped injection points

brief 28c3b781 - backend `feature/restaurant-modules` - 2026-08-04 - read-only, nothing edited,
no container started, no suite run, no ref moved.

> **CORRECTED 2026-08-04 by `L-CENSUS-CORRECTIONS`.** A Fable reviewer verified this census
> independently and **every load-bearing finding held** - the nine sites, their empty-case behaviour
> and the money-path exposure at S5/S6 all stand. What did not: **S9's summary row said "Guarded
> today: NO" while the guard substantially exists** (`Modules/ModuleFeatureFlagContractTests.cs:302`
> reds when a family stops being concatenated). The prose in S9 hedged; the table did not - and **the
> table is what dispatches lanes.** S9 is now `harden`, not `build`, with its five residual gaps
> named. Also corrected here: two further `Main` registrations outside the reflectable seam (sec. 2),
> three unstated limits of the instrument itself (sec. 2, items 9-11), and two summary sentences that
> claimed no guard exists where this census's own body names one (sec. 6, sec. 7).

## 0. Tip state, measured

The brief said backend integration was `8e2b57de`. That is what I found, and nothing more recent:

    OkamAPI $ git log --oneline -1 feature/restaurant-modules
    8e2b57de L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing

`feature/restaurant-modules` is checked out in NO worktree (`git worktree list`), so I made my own,
`git worktree add --detach /Users/svendaneel/okam/wt-dicollect 8e2b57de`, and read only there.
`git status --porcelain` in it stayed empty for the whole lane except `obj/` and `bin/` build output.

Note for the plan hub: L-COMPROOT-FAMILY-LAND's receipt says the branch is at `35696d6b`. It has
moved on since; `35696d6b` is an ancestor of `8e2b57de`. The brief is right, that receipt is stale.

## 1. Method - I asked the composition root, not the source text

Two questions, two mechanisms, both container-free and host-free:

**(a) "Where is a collection injected?"** - reflection over the compiled `WebApi.dll`, not a grep.
Every one of the 7,500 types the assembly declares **that loaded** (limit 9 - the tool cannot report
how many did not), every constructor (public and non-public), every
parameter whose type is `T[]`, `IEnumerable<T>`, `IReadOnlyList<T>`, `IReadOnlyCollection<T>`,
`IList<T>`, `ICollection<T>` or `List<T>` for a non-primitive `T`. A grep for `IEnumerable<I` would
have missed `TripletexAdminController`'s fully-qualified spellings and every `IReadOnlyList<>` site;
reflection cannot miss any of them, because it reads the metadata the container itself reads.

**(b) "What is registered behind it?"** - `Program.AddServices` and `Program.AddBuilders` invoked BY
REFLECTION on a fresh `ServiceCollection`, and the resulting `ServiceDescriptor`s read directly. Same
for the four extension methods `Main` calls itself (`AddCustomAuthorization`,
`AddIdentityConfiguration`, `AddControllersWithSerializerSettings`, `AddJWTAuthentication`). No
`WebApplicationBuilder`, no `Build()`, no host, no `TestServer`, no container - the two methods
between them produce 289 descriptors and never touch a socket or a database.

Tool: `<scratchpad>/dicensus/` (a console project referencing `WebApi.csproj`; raw output in
`census-raw.txt`). It writes nothing into the backend tree.

## 2. Reach - what this sweep could NOT see

Stated plainly, because a census that hides its edges is the shape this estate keeps removing.

1. **Registrations made inside `Program.Main` itself** are outside (b). The collection-shaped one is
   `Program.cs:164` `AddSingleton<ITelemetryInitializer, CapabilityRouteTelemetryInitializer>()` (F2).
   I found it by reading `Main` line by line, not by descriptor. Running `Main` would have built a
   host, which the brief forbids. **A composition-root floor must not have this gap** - it needs a
   seam that exposes the whole registration phase without `Build()`.

   **CORRECTED (2026-08-04):** this item said `Main` "registers directly **before** it calls
   `AddServices`", which understates both the position and the extent. Re-read at `8e2b57de`, `Main`
   holds **two further application-service registrations outside the reflectable seam**, and neither
   is before `AddServices`:
   - `Program.cs:193` `AddScoped<ICartRepository, CartRepository>()` - **between** the
     `AddServices(builder.Services)` call at `:192` and `AddBuilders(builder.Services)` at `:194`;
   - `Program.cs:197` `AddSingleton<IRedisService, RedisService>()` - **after** both, alongside
     `AddHttpContextAccessor()` at `:196`.

   Both are single (non-collection) registrations, so neither changes a verdict in section 4 - but
   they mean **the 289 descriptors this census dumps are not the whole composition root even for
   plain services**, and a floor built on the dump alone would silently exempt them. (`Main` also
   holds `AddSingleton(mcpStartupState)` at `:158`, an instance registration of a local built at
   `:140`, which no reflectable seam can produce at all.)
2. **`AddMcpAuthentication` / `AddMcpAuthorization` / `AddMcpServer().WithToolsFromAssembly()`** were
   not invoked: the first throws without certificate configuration (that is exactly what
   `CompositionRootRegistrationOrderTests` pins) and the third reflects over the assembly for MCP
   tools. If an MCP tool takes a collection it is outside this census.
3. **Types outside the `WebApi` assembly.** Framework consumers of app-registered multi-registrations
   are real `IEnumerable<T>` injection points and I chased the important ones by hand (section 5),
   but I did not enumerate every framework constructor.
4. **`IServiceProvider.GetServices` called inside a method rather than injected** - reflection cannot
   see it. Checked by grep instead: **zero production call sites.** All four `GetServices<>` calls in
   the tree are in `WebApi.Tests` (`Wire/InvoicesAuthorizationWireTests.cs:61`,
   `Wire/WireContainmentTests.cs:93`, `Wire/EventsWireTests.cs:61`,
   `Margin/MarginFeatureFlagEffectiveTests.cs:113`).
5. **Method injection.** Swept by reflection too - `Invoke`/`InvokeAsync` taking an `HttpContext`, and
   every parameter carrying `[FromServices]`/`[FromKeyedServices]`. **Zero collection-shaped hits.**
6. **Decorators / `TryAddEnumerable` / open-generic registration.** `TryAddEnumerable` does not appear
   anywhere in the tree. No decorator library is referenced.
7. **Anything resolved by reflection or `dynamic`** at runtime, and `ActivatorUtilities`-built type
   filters - though (a) covers those too, because it sweeps every type regardless of how it is built.
8. This is a **static** census. Nothing here was proven by mutating a registration and watching a
   suite go red; the brief is read-only and I kept it. Every "would red" claim below is therefore an
   analysis of the guard's own code, and I say which guard and why.

**Three limits of the INSTRUMENT, added 2026-08-04 (`L-CENSUS-CORRECTIONS`) after the Fable review
read the tool rather than only its output.** Items 1-8 above bound what the census looked at; these
bound what the tool could report even where it did look. All three are in
`lanes/L-DI-COLLECTION-SILENT/dicensus-tool.cs.txt`, cited by its own line numbers.

9. **The type-load fallback cannot say how much it lost.** `:26-28` is
   `try { types = asm.GetTypes(); } catch (ReflectionTypeLoadException ex) { types = ex.Types.Where(t => t != null).ToArray(); }`,
   and `:28` then prints only `TYPES 7500`. It never prints `ex.LoaderExceptions.Length` nor how many
   entries were null, so **`TYPES 7500` cannot be told apart from "7,500 survived and N were dropped
   silently"** - the header of `composition-root-dump.txt` reads the same either way. The same shape
   repeats at `:36`, `:40`, `:64` and `:68`, where `catch { continue; }` skips a type's constructors
   or a method's parameters without a word. Nothing observed suggests a load failure occurred; the
   point is that the instrument is not built to say. **The inventory of 19 is therefore a floor, not
   a proven ceiling** - which is the same shape as S5's empty loop reporting success.
10. **The extension-method dump is keyword-filtered.** The four methods `Main` calls directly produce
    **211 descriptors** (`AddCustomAuthorization` +17, `AddIdentityConfiguration` +70,
    `AddControllersWithSerializerSettings` +116, `AddJWTAuthentication` +8, per the dump's own `EXT`
    lines). Only descriptors whose service-type name contains one of **eight** hard-coded substrings
    are printed (`:134-137`: `IAuthorizationHandler`, `ITelemetryInitializer`, `IStartupFilter`,
    `IClaimsTransformation`, `IHostedService`, `IModelBinderProvider`, `IPostConfigureOptions`,
    `IValidateOptions`) - **23 `EXTSEAM` rows of the 211**. The FULL descriptor dump at `:196-203`
    iterates `services` (AddServices + AddBuilders) only and never `extra`. **F3 was found because
    `IAuthorizationHandler` happened to be on that list**; a multi-registration seam whose interface
    is not on it would not have appeared anywhere in the output.
11. **Collections of primitive elements are excluded by construction.** `IsUninteresting`
    (`:222-229`) drops `string`, every primitive, `Guid`, `decimal`, `DateTime`, `DateTimeOffset` and
    every enum, so an `IEnumerable<string>`-shaped injection point - an allow-list of origins, of
    account numbers, of flag keys - **never enters the inventory of 19 at all**. The paired predicate
    `CollectionElement` (`:231-238`) also fixes what "collection-shaped" means: 1-D arrays plus
    exactly six open generic types, so `IAsyncEnumerable<T>`, `ISet<T>`/`HashSet<T>`,
    `ImmutableArray<T>` and `IDictionary<,>` parameters are invisible too. Both exclusions are
    defensible for this brief and neither is reported at run time.

## 3. Inventory - 19 collection-shaped constructor parameters, 9 of them DI-resolved

Reflection found 19 **under the tool's own definition of "collection-shaped"** - which excludes
primitive, `string`, `Guid`, `decimal`, date and enum element types, and recognises only 1-D arrays
plus six open generic types (limit 11). Ten are value objects and DTOs the code `new`s itself; **none of their owning
types appears anywhere in the 289 descriptors**, so the container never constructs them and an empty
sequence there is a caller's argument, not a wiring fact. Excluded, named so the exclusion is
checkable:

    AppException.args                              WorkforceRateSegment.supplements
    WorkforceShiftCost.segments (private ctor)     WorkforceSupplementPolicy.windows (private ctor)
    GrowthDeferredShredSweepResult.Failed          MarginCsvParseResult.rows
    MarginRecipeCostCalculator+IngredientRate.conversions
    MealsJournalReceiptProjection.taxLines         WorkforceRateResolver+RateTimeline.engagement
    WorkforceRateResolver+RateTimeline.role

The remaining nine are the census. Eight are resolved from the container; the ninth
(`FeatureFlagCatalog`) is a composition-root local list wearing the same shape, and is the one a
source scan would classify wrong.

## 4. Per-site census

Verdict vocabulary: **REFUSE** = an empty sequence produces an observable refusal on the path that
uses it. **SILENT** = the call succeeds and the capability is simply absent. **Checked** = a test
that already exists reds when the registration is removed, and I name it.

---

### S1. `TerminalPaymentProviderResolver.providers` - REFUSE - checked-and-safe

`Services/Kassa/TerminalPaymentProviderResolver.cs:19` - `IEnumerable<ITerminalPaymentProvider>`,
2 registered (`Program.cs:579`, `Program.cs:586`, both forwarding factories to `DinteroTerminalService`
/ `SurfboardTerminalService`).

Empty -> `ForPaymentType` throws `AppException("No terminal payment provider is registered for
{paymentType}.")` at `:31`. This is the **strongest** shape on the list, and stronger than a count
floor: it refuses per PAYMENT TYPE, so losing ONE of the two still refuses for that acquirer instead
of silently routing to the other. A card cannot be taken through a provider that is not there.

No floor needed. The refusal is the floor. Note `WireHost.cs:525` already reasons about this seam
explicitly ("a multi-registration the resolver ENUMERATES, so collapsing it to one proxy would change
how the resolver behaves") - the containment list deliberately leaves it alone.

---

### S2. `EventsNotificationDrainService.deliveries` - REFUSE (deferred, in a DB column) - checked

`Services/Events/EventsNotificationDrainService.cs:65` - 1 registered (`Program.cs:1128`,
`EventsEmailNotificationDelivery`).

Ctor at `:71` throws `ArgumentNullException` on null - but **not** on empty; empty `.ToList()` is
legal. At drain time `:130` a row whose channel no adapter serves is failed with
`"NoAdapterForChannel:" + row.Channel`, burns its attempt budget and lands in `DeadLettered`, where
`IEventsNotificationHealthService` and the staff notification route read it.

**Checked:** `Wire/EventsWireTests.cs:61`,
`The_notification_outbox_the_composition_root_binds_persists_and_has_a_drain`, resolves
`GetServices<IEventsNotificationDelivery>()` from the REAL wire container and asserts
`Assert.Single(adapters)` plus `Assert.IsType<EventsEmailNotificationDelivery>` plus
`Assert.Equal(EventsNotificationChannel.Email, email.Channel)`. Removing the registration reds it on
`Assert.Single`. This is the model the other seven sites want.

Recorded caveat: the refusal is **deferred and asynchronous**. A test that enqueues and asserts a
2xx sees nothing. The floor that catches it is the container assertion above, not the route.

---

### S3. `WorkforceNotificationDispatcher.deliveries` - REFUSE (deferred, in a DB column) - NOT CHECKED

`Services/Workforce/WorkforceNotificationDispatcher.cs:80` - 4 registered (`Program.cs:829-832`:
InApp, Push, Sms, Email).

The ctor (`:88-101`) indexes adapters by channel and **throws** `InvalidOperationException` when two
claim the same channel - a genuine composition-root guard, but only against duplication, never against
absence. Empty is accepted silently. At dispatch, `:182` fails the row with
`"NoAdapterForChannel:" + row.Channel` and the comment states the intent exactly: "A channel with no
adapter is a WIRING gap, and the one thing it must never do is look like a delivery."

So the RUNTIME behaviour is right and honest. What is missing is the floor: every test that drives
this dispatcher supplies its own adapters -
`Workforce/WorkforceW3TestHost.cs:66` `Dispatcher(harness, flags, params IWorkforceNotificationDelivery[])`,
`Workforce/WorkforceNotificationTransportTests.cs:639`. **No test resolves
`IWorkforceNotificationDelivery` from a container.** Delete `Program.cs:831` (Sms) and every SMS
notification silently dead-letters; the outbox row records it, no suite reads it.

**Floor needed:** the composition root registers exactly one adapter per `WorkforceNotificationChannel`
value, asserted by resolving `IEnumerable<IWorkforceNotificationDelivery>` and comparing
`.Select(d => d.Channel)` against `Enum.GetValues<WorkforceNotificationChannel>()`. A count of 4 is
weaker and would pass with two InApp adapters and no Sms - except that the ctor already refuses that,
so channel-coverage is the exact complement of the guard that exists.

**Partially checked by a second mechanism:** all four implementations live in
`WebApi.Services.Workforce`, so `Modules/ModuleReachabilitySweepTests` (see section 6) would flag a
deleted registration as an unreachable module type. That is a real but indirect and namespace-scoped
backstop, and it does not fire if the registration survives in a form the source scan still sees.

---

### S4. `TripletexAdminController.exportProviders` - REFUSE - NOT CHECKED

`Controllers/TripletexAdminController.cs:35` - 2 registered (`Program.cs:594-595`).

`POST stores/{storeId}/export/online` at `:89` takes `FirstOrDefault(p => p.Target == Tripletex)` and
at `:92` throws `AppException("Tripletex-eksportprovider er ikke registrert.")` when it is absent.
Refuses correctly, and refuses per TARGET rather than on count - losing the eMonkey provider still
lets this route work, which is right.

Not checked: nothing resolves `IAccountingExportProvider` from a container.
`Tripletex/TripletexNightlyExportE2eTests.cs:94` builds `new IAccountingExportProvider[] { provider }`
by hand. The refusal is a real one, so this site is safe by construction on THIS route - but see S5,
which is the same two registrations consumed silently.

---

### S5. `AccountingExportOrchestrator.providers` - SILENT - NOT CHECKED - **money/bokforing path**

`Services/Tripletex/AccountingExportOrchestrator.cs:23` - the same 2 registrations as S4.

`RunDailyExportAsync` (`:51`) is `foreach (var provider in _providers)` -> `return results;` (`:91`).
**Empty means it returns an empty list and reports nothing wrong.** No log, no Discord alert (the
`AlertAsync` call at `:81` is inside the loop, so an empty loop never alerts), no exception.

It is worse than a quiet no-op, because the caller manufactures a success number from a different
source. `MaintenanceService.ExportAccountingAsync` (`:157`) does:

    var exportStoreIds = await _accountingExportOrchestrator.GetStoreIdsWithExportEnabledAsync();
    result.StoresExported = exportStoreIds.Count;                       // MaintenanceService.cs:160

`GetStoreIdsWithExportEnabledAsync` queries `AccountingConfigurations` and `TripletexConnections`
directly - it does not consult the providers at all. So the nightly job reports
`StoresExported = N` while producing **zero vouchers**, and `ConfigController.cs:85` hands that same
number back to an operator who asked it to run. A store's books go unexported and every surface says
the export ran.

**Floor needed:** the composition root registers one `IAccountingExportProvider` per
`AccountingExportTarget` the enum declares (`Emonkey`, `Tripletex`) - derived from the enum, not a
count, so a new target added without a provider fails on the day it is added. Second, and separately,
`StoresExported` should not be able to exceed the number of stores an export was actually attempted
for; that is a product fix, not a floor, and belongs to whoever owns the accounting job.

---

### S6. `MaintenanceService.captureSweepers` - SILENT - NOT CHECKED - **money path**

`Services/MaintenanceService.cs:30` - 3 registered (`Program.cs:611-613`: Dintero, Surfboard, Vipps).

`RunPaymentCapturesAsync` (`:44`) is `foreach (var sweeper in _captureSweepers)` filling
`result.Messages[sweeper.ProviderName]`. **Empty returns a `PaymentCaptureSweepResult` with no
messages and no failures - a clean result.** The whole point of this loop is that "an outage at one
must not leave another's reservations to expire uncaptured" (`:46`); with an empty sequence, ALL of
them expire uncaptured, and the sweep reports success.

`PaymentCaptureBackgroundService` (`Program.cs:615`) is the only production caller, and
`ConfigController.cs:84` the manual one. Every test builds the sweepers by hand -
`MaintenanceServiceTests.cs:330` `sweepers ?? Array.Empty<IUncapturedOrderSweeper>()`, i.e. the empty
case is the test DEFAULT.

**Floor needed:** the composition root registers a sweeper for every provider that can hold an
uncaptured reservation. There is no enum to derive that from, so the honest floor is a named set
(`Dintero`, `Surfboard`, `Vipps`) asserted through `IUncapturedOrderSweeper.ProviderName` on resolved
instances, with the reason written down - plus, ideally, `RunPaymentCapturesAsync` recording a
failure rather than a clean result when it has nothing to sweep with.

Not backstopped by the reachability sweep either: all three implementations live in
`WebApi.Services.Jobs`, which `ProductionCallGraph.ModuleOf` maps to `null` (platform), so
`ModuleReachabilitySweepTests` does not sweep them.

---

### S7. `StoreFeatureFlagsController.effectiveResolvers` - SILENT - **half checked** - worst shape

`Controllers/StoreFeatureFlagsController.cs:41` - 2 registered (`Program.cs:783` Workforce,
`Helpers/Margin/MarginModuleServiceCollectionExtensions.cs:35` Margin).

`EffectiveAsync` (`:55-66`): `foreach (var resolver in _effectiveResolvers)` ... then
`return overridden ? row.Enabled : descriptor.DefaultEnabled;` at `:65`. **An empty sequence does not
error - it returns the WRONG ANSWER.** For a grandfathered store whose module gate resolves true from
a probe rather than a row, the endpoint answers `effective:false`, and the admin client renders the
module from exactly that field. The module disappears from the operator's UI while every one of its
routes answers 200.

**Workforce half: CHECKED.** `Wire/WorkforceWireTests.cs:213`
`The_toggle_api_reports_the_gates_answer_for_a_grandfathered_store_not_the_advertised_default` drives
the real container over the real route and asserts `effective == true` for `StoreA` (grandfathered,
no override row) against `effective == false` for `DarkStore`. Removing `Program.cs:783` reds it.
The test's own comment names this lane's hazard verbatim: "consumed as an IEnumerable, so a missing
registration is silent". It also reads the answer out of the RESPONSE BODY, which is the only reason
it can see the mutation - the status code is 200 either way.

**Margin half: CHECKED, at the module seam rather than the composition root.**
`Margin/MarginFeatureFlagEffectiveTests.cs:102`
`AddMarginModule_registers_the_effective_value_resolver_the_toggle_api_consumes` builds a
`ServiceCollection`, calls `AddMarginModule()`, resolves `GetServices<IStoreFeatureFlagEffectiveResolver>()`
and asserts both `Assert.Contains(resolvers, r => r is MarginModuleFlagEffectiveResolver)` and that
each of the three Margin flag keys is `Handles`-claimed. Strong. Its one gap: it asserts what
`AddMarginModule` does, not that `AddServices` still calls `AddMarginModule`.

**Floor still needed:** every flag key in `IFeatureFlagCatalog.All` whose owning module declares a
resolver is claimed by exactly one resolver resolved from the WHOLE composition root - which closes
both the "module extension no longer called" gap and any future module that adds a resolver.

---

### S8. `MarginStatusController.contributors` - SILENT - NOT CHECKED

`Controllers/MarginStatusController.cs:37` - 3 registered
(`Helpers/Margin/MarginModuleServiceCollectionExtensions.cs:55`, `:64`, `:86`).

`GET margin/status` at `:72` is `foreach (var contributor in _contributors)` and returns `Ok(status)`
regardless. `MarginStatusResponse.LastImport`, `.ActiveRecipeCount` and `.Projection` are all
nullable and documented as "null until MG-W2-C / MG-W2-D / MG-W3-2 contributes it"
(`Models/Margin/MarginStatusResponse.cs:25,28,31`).

**This is a deliberately-optional site that has stopped being one.** At S0 the empty case was the
honest "W2-partial" state and the code says so. All three contributors now exist and are registered,
so today an empty - or short - sequence is a regression that presents as a status endpoint answering
200 with a null field. A projection watermark reading null is indistinguishable from a projector that
has never run.

Not checked at all. Every test injects its own array:
`Margin/MarginModuleScaffoldTests.cs:68,82,96,117` and `Margin/MarginStatusHonestStateTests.cs:196`
use `Array.Empty<IMarginStatusContributor>()`; `Margin/MarginJourneyE2ETests.cs:884` does too;
`Margin/MarginTenantIsolationSweepTests.cs:1029-1031` constructs all three by hand. **The suite proves
the empty case is honest and never proves the full case is wired.**

**Floor needed:** the composition root yields a contributor for each of the three status facts the
response declares - assert by resolving the collection and driving it against a store, then requiring
`LastImport`, `ActiveRecipeCount` and `Projection` all non-null. A count of 3 would pass with three
copies of the same contributor; the response shape is the real invariant.

---

### S9. `FeatureFlagCatalog.descriptors` - SILENT on read, REFUSE on write - NOT a DI collection - **GUARDED (corrected)**

`Services/Platform/FeatureFlags/FeatureFlagCatalog.cs:18` - `IEnumerable<FeatureFlagDescriptor>`.
**Zero descriptors of this type are registered in the container** (my descriptor dump: `count=0`), and
that is not a defect - `Program.cs:760-768` builds a `List<>` by hand from six module
`Describe()` calls and passes it to a `new FeatureFlagCatalog(...)` registered as a singleton
instance.

This is the cousin the brief warns about, inverted: it LOOKS like a DI collection to a source scan and
is not one. The hazard is identical. Drop a `featureFlagDescriptors.AddRange(...)` line and:

- `GET /feature-flags/catalog` (`:79`) silently omits that module's flags - the admin UI simply has
  no lever for them, which is the exact defect the controller's own summary says it was written to
  fix ("the lever the e2e pass found missing");
- `PUT /stores/{id}/feature-flags` (`:141-143`) **refuses** with `400 "Unknown feature flag: ..."`;
- the ctor throws on a DUPLICATE key (`:27`) and on nothing else - absence is free.

**CORRECTED (2026-08-04, `L-CENSUS-CORRECTIONS`). The floor this entry asked for substantially
EXISTS, and this census shipped a summary row saying it did not.** The original text read: "*Floor
needed: the catalog contains every key every `*FeatureFlags.Describe()` in the assembly declares,
derived by reflection over the `Describe()` methods rather than from the same list `Program.cs`
builds. `Modules/ModuleFlagCensus.cs` and `Modules/ModuleFeatureFlagContractTests.cs` already work in
this area and are the natural home; I did not read far enough into them to say whether they close it,
and I am not going to claim they do.*" The Fable review read them. They largely do.

**Checked:** `Modules/ModuleFeatureFlagContractTests.cs:302`,
`Every_discovered_family_is_concatenated_into_the_shared_catalog`. It derives the family set exactly
as this entry asked - `ModuleFlagCensus.DiscoverFamilies()` (`ModuleFlagCensus.cs:124-142`) reflects
over `typeof(FeatureFlagDescriptor).Assembly.GetTypes()` for a public static parameterless
`Describe()` whose return type is assignable to `IReadOnlyList<FeatureFlagDescriptor>`
(`CatalogContribution`, `:149-162`) - then requires each family to appear in the composition root
(`:304-307`, `composition.Contains(f.DeclaringType.Name + ".Describe()")`).

**It reds on exactly the mutation this entry names.** Each of the six families' `X.Describe()` text
occurs **once** in `Program.cs`, at its own `AddRange` line (`:761-766`, verified per occurrence:
`WorkforceFeatureFlags` 761, `EventsFeatureFlags` 762, `MarginFeatureFlags` 763,
`TrainingFeatureFlags` 764, `GrowthFeatureFlags` 765, `MealsFeatureFlags` 766, and nowhere else in the
file). Delete one `featureFlagDescriptors.AddRange(...)` line and its family's only occurrence goes
with it, so the assertion fails and names the module. `ModuleFlagCensus.cs:135` adds a
`families.Count >= 6` non-vacuity floor, so a renamed contract cannot empty the sweep out silently.

**Residual gaps - what to HARDEN, stated so each is checkable:**

1. **It matches source TEXT in `Program.cs`, never the catalog object.** It never resolves
   `IFeatureFlagCatalog` and asks for its keys. `featureFlagDescriptors.AddRange(WorkforceFeatureFlags.Describe().Where(d => d.Key != "workforce.dispatch"))`
   keeps the matched text and drops a key: green. So does concatenating into a list that is never
   passed to the constructor.
2. **The singleton registration itself is unguarded by this test.** `Program.cs:767-768`
   (`AddSingleton<IFeatureFlagCatalog>(new FeatureFlagCatalog(featureFlagDescriptors))`) can be
   deleted and this assertion stays green - the six `Describe()` calls are still spelled above it.
   Whether some other test reds on that deletion was not established here, and should not be assumed.
3. **Family granularity, not key granularity.** A `Describe()` that stops returning one of its own
   descriptors is invisible to this rule; rules 2 and 5 in the same file
   (`Every_declared_flag_is_advertised_or_withheld_with_a_reason` `:140`,
   `Every_declared_key_is_spelled_by_exactly_one_production_constant` `:268`) cover part of that
   ground, and none of the three resolves the registered catalog instance.
4. **The discovery predicate is narrow.** Only a **public static parameterless** `Describe()` with
   that exact return type counts as a family. A module contributing descriptors by an instance method,
   an `IEnumerable<FeatureFlagDescriptor>` return, or a const array is never discovered, so its
   absence from the catalog is undetectable; `Count >= 6` catches only a total collapse.
5. **The write path is unmeasured.** `PUT /stores/{id}/feature-flags` refusing `400 "Unknown feature
   flag"` for a dropped key is the loud half of this site and no test named here drives it.

So S9 is **harden**, not **build**, and the cheapest hardening is (1)+(2) together: resolve
`IFeatureFlagCatalog` from the composition root and compare its key set against the union of every
discovered family's `Describe()`. That closes the text-versus-object gap and the registration gap in
one assertion, and it is the shape `EventsWireTests.cs:61` already uses for S2.

---

## 5. The same hazard, one layer out: framework-consumed multi-registrations

Not constructor parameters in the `WebApi` assembly, so strictly outside the brief's wording - but
they are `IEnumerable<T>` injection points fed by this composition root, and two of them are more
dangerous than anything in section 4. Recorded so the next lane does not have to rediscover them.

### F1. `IHostedService` x10 - SILENT - **structurally invisible to the wire tier**

Consumed by `Microsoft.Extensions.Hosting.Internal.Host(IEnumerable<IHostedService>)`. Registered at
`Program.cs:615, 616, 839, 894, 895, 1057, 1067, 1102, 1132` and
`MarginModuleServiceCollectionExtensions.cs:87`. Deleting one `AddHostedService<T>()` line means that
loop never ticks. Nothing throws.

`Wire/WireContainmentTests.cs:82` `No_application_background_service_runs_behind_the_wire_tier`
asserts the **opposite** direction (that none are running), and its non-vacuity guard counts types
that IMPLEMENT `IHostedService` via `GetTypes()`, not registrations - so it stays green with every
single `AddHostedService` line deleted. The wire tier removes them all by design, so no wire test can
ever see this.

Partial backstop: `ProductionCallGraph.DiscoverRoots()` treats a type as a root only if an
`AddHostedService` registration NAMES it in source (`ProductionCallGraph.cs:477`), so an unregistered
hosted service loses its root status and everything it solely calls goes unreachable - which
`ModuleReachabilitySweepTests` reports. But `ModuleOf` is namespace-scoped, and **four of the ten are
platform-namespaced and therefore unswept**: `PaymentCaptureBackgroundService`,
`DailyMaintenanceBackgroundService`, `GrowthDeferredShredSweepBackgroundService` and
`GrowthDispatchBackgroundService`, all in `WebApi.Services.Jobs`. The two money-path loops in the
estate are precisely the two nothing covers.

**Floor needed:** the composition root registers a hosted service for every non-abstract
`IHostedService` the production assembly declares that is not on a written exemption list - derived
from the assembly, exemptions named with a reason, exactly the `Parked` discipline
`ModuleReachabilitySweepTests` already uses.

### F2. `ITelemetryInitializer` - SILENT - **C7 exposure**

`Program.cs:164` registers `CapabilityRouteTelemetryInitializer`, consumed by Application Insights as
an `IEnumerable`. Its job, per the comment at `Program.cs:161`, is that "a capability token that is a
route parameter reaches Application Insights with no log statement involved". Empty sequence: the
tokens are transmitted verbatim, to a sink whose history nobody can edit. That is C7, by an omission
rather than by a log line.

**NOT checked.** `Observability/PiiLogSweepTests.cs:293,339` calls
`CapabilityRouteTelemetryInitializer.Redact(...)` **statically**, and
`Wire/RequestBodyTelemetryPinTests.cs` constructs participants by reflection over the assembly
(`RequestParticipants()` at `:101`), not by resolving them. Both prove the redaction is correct.
Neither proves the redactor is installed.

**Floor needed:** resolve `IEnumerable<ITelemetryInitializer>` from the composition root and require
`CapabilityRouteTelemetryInitializer` to be among them. Cheap, and it closes a C7 hole.

### F3. `IAuthorizationHandler` - fail-CLOSED - safe

`Helpers/ServiceCollectionExtensions.cs:40` registers `StoreAdminAuthorizationHandler` alongside the
framework's `PassThroughAuthorizationHandler`; `DefaultAuthorizationHandlerProvider` takes the
`IEnumerable`. Empty means the `StoreAdminPolicy` requirement is never satisfied and every store
admin gets 403 - loud, fail-closed, and reddened by many existing wire tests. Recorded as safe; no
floor needed.

## 6. Standing guards, and precisely what each does and does not cover

- **`Wire/CompositionRootLimiterWireTests.cs` + `CompositionRootRegistrationOrderTests`** - the only
  existing **descriptor-level** composition-root check. It asserts `ServiceDescriptor`
  presence/absence on a `ServiceCollection` built by one extension method, and boots a wire host to
  prove ORDER. It knows nothing about collections. It is the right SHAPE for every floor named above.
  **CORRECTED (2026-08-04):** it is not "the only existing composition-root check" full stop - three
  others already assert composition-root facts by resolving or reading it
  (`Wire/EventsWireTests.cs:61` for S2, `Wire/WorkforceWireTests.cs:213` and
  `Margin/MarginFeatureFlagEffectiveTests.cs:102` for S7), and a fourth reads `Program.cs` itself
  (`Modules/ModuleFeatureFlagContractTests.cs:302` for S9). What is singular about this one is the
  MECHANISM - descriptors rather than behaviour - not the coverage.
- **`Modules/ModuleReachabilitySweepTests` + `ProductionCallGraph`** - the strongest existing backstop
  and the one most likely to be over-trusted here. Three limits that matter for this census:
  1. It reads **source text** (`ReadRegistrations` at `ProductionCallGraph.cs:320`), which is the form
     the brief warns can be routed around by a helper. It does handle the forwarding-lambda shape
     (`sp => sp.GetRequiredService<Foo>()`) and `new Foo(...)` inside a factory, which is better than
     most - S1's two registrations are visible to it.
  2. It is **namespace-scoped** to the six modules via `ModuleOf` (`:204`). Everything in
     `WebApi.Services.Jobs`, `WebApi.Services.Kassa`, `WebApi.Services` and `WebApi.Helpers` is
     platform and unswept - i.e. S4, S5, S6, F1's four money-path loops and F2 are all outside it.
  3. It answers "does a caller exist", never "is this still ONE of N". Removing one of three
     registrations while two remain is a count change, not a reachability change, unless the orphaned
     implementation is named nowhere else in production source.
- **`WireHost`** - boots the REAL `Program.Main` over SQLite with no container, and is where a
  cross-cutting floor is cheapest to enforce for anything that survives its containment. It removes
  every application `IHostedService`, so F1 cannot be enforced there.

## 7. The motivating example is not on this tip - stated so nobody looks for it

`ITimesheetExportProvider`, the interface `L-WF-TIMESHEET-WIRE` mutated, **does not exist in
production code at `8e2b57de`.** The only occurrences are test-side: a provisional seam in
`WebApi.Tests/Workforce/FailOnNPayrollFake.cs:49` and a skipped fact at
`WebApi.Tests/Workforce/WorkforceEndToEndJourneyTests.cs:703` whose skip reason says W5 is unbuilt.
That lane built on `lane/wf-w5-timesheet` and said so in its return. The finding travels anyway -
this census found eight production sites of the same shape at the tip, four of them silent, two of
those on the money path.

**CORRECTED (2026-08-04):** this sentence ended "*and none of the eight guarded by a composition-root
check today*", which contradicts this census's own section 4 - the same error of shape as the S9 row,
and in the same direction. **Two of the eight are guarded by a test that resolves from a container**,
each named in its own entry: **S2** by `Wire/EventsWireTests.cs:61`
(`GetServices<IEventsNotificationDelivery>()` from the real wire container, `Assert.Single`), and
**S7** by two tests, one per half - `Wire/WorkforceWireTests.cs:213`, which drives the real container
over the real route and reads the answer out of the response body, and
`Margin/MarginFeatureFlagEffectiveTests.cs:102`, at the module seam rather than at the root.

The accurate statement is: **six of the eight carry no composition-root check. Two of those six (S1,
S4) refuse by construction, so the refusal is their floor; four (S3, S5, S6, S8) have neither a check
nor a refusal - and both money-path sites, S5 and S6, are among those four.**

## 8. Summary

| # | Site | Registered | Empty does | Guarded today |
|---|------|-----------|-----------|---------------|
| S1 | `TerminalPaymentProviderResolver` | 2 | REFUSE per payment type | safe by construction |
| S2 | `EventsNotificationDrainService` | 1 | REFUSE -> dead-letter | YES - `EventsWireTests.cs:61` |
| S3 | `WorkforceNotificationDispatcher` | 4 | REFUSE -> dead-letter | no floor; module sweep backstop |
| S4 | `TripletexAdminController` | 2 | REFUSE per target | safe by construction |
| S5 | `AccountingExportOrchestrator` | 2 | **SILENT** - books unexported, reported exported | NO |
| S6 | `MaintenanceService` | 3 | **SILENT** - captures never run, reported clean | NO |
| S7 | `StoreFeatureFlagsController` | 2 | **SILENT** - wrong effective value | Workforce YES, Margin at module seam |
| S8 | `MarginStatusController` | 3 | **SILENT** - null status fields | NO |
| S9 | `FeatureFlagCatalog` | n/a (local list) | SILENT read / REFUSE write | **YES, mostly** - `ModuleFeatureFlagContractTests.cs:302` reds on a dropped `AddRange`; gaps in S9 |
| F1 | `IHostedService` x10 | 10 | **SILENT** - loop never ticks | 6 of 10 by module sweep; 4 money-path unswept |
| F2 | `ITelemetryInitializer` | 1 | **SILENT** - C7, tokens to App Insights | NO |
| F3 | `IAuthorizationHandler` | 1 | fail-closed 403 | safe |

**Seven floors to BUILD**, in the order I would build them: **F2** (C7, one line, cheapest), **S5**
and **S6** (money and books), **F1** (the four unswept loops), **S7** (complete the Margin half at the
composition root), **S8**, **S3**.

**One floor to HARDEN, not build: S9** - corrected 2026-08-04. A contract test already reds when a
family stops being concatenated; what is missing is that it asserts source text rather than the
resolved catalog, and never covers the singleton registration line. Full reasoning and the five
residual gaps are in S9. It is last in this order because a guard with a known seam beats a seam with
no guard, not because the seam is closed.

**The lesson this row cost, and the one to carry:** the prose in S9 hedged honestly ("I did not read
far enough ... I am not going to claim they do") and the table still printed **NO**. **The table is
what dispatches lanes** - nobody reads the hedge before filing the work. A cell that a paragraph
elsewhere qualifies is not qualified; where a verdict is uncertain the cell must say so in the cell.
