# L-A-PUBLISHED-CATEGORY-REACHES-THE-SHOP — a menu without pictures still sells

Everything below was measured in this lane. Nothing was started, killed or written on the owner's world:
his API on **:5971** was read over HTTP only (`GET`, and `POST …/consumer`, which is a query), his
containers `okam-lwtwo-sql` / `okam-lwtwo-redis` were never touched, and **no container was started by this
lane** — see *Container attribution* at the end.

---

## Where the work lives, and why it is not in the backend checkout

`git -C /Users/svendaneel/okam/OkamAPI` is refused by worktree isolation, as the brief anticipated. The
change was therefore made **in a source copy**, taken from `/Users/svendaneel/okam/wt-lwtwo-api`, which is
the checkout the owner's live API is actually running from (`lsof -p 47340` → cwd
`/Users/svendaneel/okam/wt-lwtwo-api`, binary `bin/Debug/net8.0/WebApi`) and which stands at
`8e2b57de8442a389a9b5f8025312c9750614c85e` — the tip of `feature/restaurant-modules`, this program's world
branch.

**Cross-check that the file is the same everywhere it exists.** `ModelBuilders/CategoryModelBuilder.cs` is
byte-identical (md5 `4583578d576cd92ea9a120044d6bc369`) in all four available checkouts:
`/Users/svendaneel/okam/OkamAPI` (on `feature/swiss`), `wt-lwtwo-api`, `OkamAPI-modules`, `OkamAPI-mig`.
`Services/CategoryService.cs` is **not** — `/Users/svendaneel/okam/OkamAPI` (feature/swiss) has an
eager-load in `GetAllAsync` that the world branch does not — so the patch here is cut against
`wt-lwtwo-api` and only against `wt-lwtwo-api`.

Working copy: `<scratchpad>/okamapi-src` (built and run there). Patches, the new test and the measurements
are in this directory.

---

## What was measured on the owner's world, before anything changed

Store 1, "Two Humans Kafé". Four categories, every one `"published": true`, every one `"image": null`.

| request | body | result |
|---|---|---|
| `POST /categories/store/1/consumer` | *(none)* | **200, four categories** — `live-5971-no-body.json` |
| `POST /categories/store/1/consumer` | `{"deliveryType":"SelfPickup"}` | **200, `[]`** — `live-5971-searchoptions-selfpickup.json` |
| `POST /categories/store/1/consumer` | `{}` | **200, `[]`** |
| `POST /categories/91fc79fb…/consumer` | `{"deliveryType":"SelfPickup"}` | **400 `{"message":"Category does not exist"}`** |
| `GET /categories/91fc79fb…` | — | **200**, "Varm drikke", published, **five products**, `image: null` — `live-5971-category-get-admin.json` |
| `POST /stores/1/consumer` | `{"deliveryType":"SelfPickup"}` | **200, `"categories": []`, `"products": []`** |

Two things that matter more than the emptiness itself:

- **`{}` is enough.** The gate was `searchOptions != null`, not anything inside it. An empty body — the
  weakest possible request — emptied the shop. Any test that omits the body proves nothing.
- **The single-category route did not say "no image". It said the category does not exist**, about a
  published category holding five products.

And the clients cannot avoid sending a body: `core/pinia/category.ts:20-25` is
`if (!currentStore.id || !searchOptions) return Promise.reject()`. There is no consumer read of the menu
that takes the admin path.

---

## The ruling: an image is not required to sell

The brief offered two honest endings. This lane took the first, and the reasons are evidence rather than
preference:

1. **It is a one-off, not a policy.** `grep -rn "Images?.Any() != true" --include="*.cs"` over the whole
   backend returns two hits: `CategoryModelBuilder.cs:49` and `ImageCarouselService.cs:89` (a carousel
   *item*, which is by definition an image). **Zero for products.** A product with no image is published,
   served, and drawn — `modul/apps/consumer-web/src/views/storefront/StorefrontView.tsx:75-87` states the
   intent in the file: *"the token plate is the honest fallback ONLY when a product genuinely has no
   image."* The category was the one catalog entity deleted from the guest's world for lacking a picture.
2. **Three shipped consumer surfaces already draw a category with no image at all**:
   `consumer-native-app/src/app/(tabs)/menu/index.tsx:119-166` (text-only chips),
   `modul/apps/consumer-web/.../storefrontModel.ts:41-47` (`CategoryVM` has **no image field**), and
   `Web-modules/pages/menu.vue:4-7` (a bare `<h2>`). "A tile cannot render without an image" is already
   falsified by the product's own code.
3. **The wire already permits the absence.** `Helpers/AutoMapperProfile.cs:179` maps "no `CategoryImages`"
   to `null`, and `CategoryModel.Image` is a nullable reference. Nothing had to change in the contract.
4. **The second ending is not implementable honestly here.** `Category.IsPublished` is `[NotMapped]`
   (`Entities/Category/Category.cs:46-68`), computed from `Hide` / `StartPublish` / `StopPublish` /
   `PublishRules`. There is no publish transaction to refuse at — `CreateAsync` (`:291-339`) and
   `UpdateAsync` (`:363-427`) just set those fields, image optional and afterwards. A refusal would also
   have to be retroactive: every venue `bulk-import` ever onboarded is image-less by construction
   (`Services/ProductService.cs:304-316` builds `new Category { …, StartPublish = DateTime.Now }` and never
   touches `CategoryImages`), so "refuse to publish" would un-publish them rather than tell them anything.

---

## The change

### 1. `ModelBuilders/CategoryModelBuilder.cs` — the drop
`okamapi-CategoryModelBuilder.patch`. The image term is removed from the consumer filter; `IsPublished`
and a non-blank `Name` remain. Nothing else in the method changes — the delivery-type filter at `:57`, the
product filter, the discounts and the translations are untouched.

### 2. `Services/CategoryService.cs` — `HasAnyValid`, the operator's checklist
`okamapi-CategoryService.patch`. `GET /categories/store/{id}/hasanyvalid` is read by the AdminApp
onboarding checklist item *"Sett opp en kategori"*
(`AdminApp/app/views/pages/HomeContent.vue:501-513` — the only caller in the estate). It required a
`CategoryImage`, which matched the consumer filter **while that filter existed**. Left alone, it would have
told a venue its menu was not set up while guests were buying from it — the same silence, pointed the other
way. Only the image term is removed; the "has at least one product" requirement stays. The now-unused
`.Include(x => x.CategoryImages).ThenInclude(x => x.ImageSource)` goes with it, because an eager-load
nobody reads still reads as a requirement.

### 3. `pages/admin/categories.vue` — the badge that conflated two things (this worktree)
The legacy admin drew one badge from `!category.published || !category.image` and labelled it
`categories_unpublished` ("Ikke publisert" / "Not published"). It was the nearest the operator got to being
warned — and it was wrong in both directions: it called a *published* category unpublished, and it never
said the word "image". After the fix it would simply be false. It is now `!category.published`.

---

## The test: `ConsumerMenuWithoutCategoryImagesWireTests`

`WebApi.Tests/Wire/ConsumerMenuWithoutCategoryImagesWireTests.cs`, in the **wire tier** — the shared
`WireHost` boots the real composition root (`Program.Main`) over `TestServer` on **in-memory SQLite**, with
Redis replaced by `NoOpRedisService` and all egress blocked. **No container**, which is why this tier and
not a SQL fixture.

Every request carries a body. The venue is seeded exactly as `bulk-import` leaves one: categories published
by `StartPublish`, a product attached, no image anywhere.

| test | before | after |
|---|---|---|
| `A_published_category_with_no_image_is_in_the_consumer_menu` | FAIL (`[]`) | pass |
| `Opening_an_imageless_category_does_not_answer_that_it_does_not_exist` | FAIL (400) | pass |
| `An_empty_search_options_body_is_still_a_body_and_still_returns_the_menu` | FAIL (`[]`) | pass |
| `A_category_hidden_from_the_requested_delivery_type_is_still_absent` | FAIL (its positive half) | pass |
| `An_unpublished_category_is_still_absent_from_the_consumer_menu` | pass (vacuously — everything was absent) | pass |
| `A_published_category_with_an_image_is_still_in_the_consumer_menu` | pass | pass |

`Failed: 4, Passed: 2` before → `Failed: 0, Passed: 6, Skipped: 0` after.

The two negative tests are why the fix cannot be "delete the filter": an unpublished category and a
category hidden from the requested delivery type must still be absent, and the delivery-type test asserts
the *same* category is present under `TableDelivery`, so its absence under `SelfPickup` cannot be an
artefact of it being unreachable.

### The regression triple, measured both sides in this lane

`dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"`, host dotnet SDK 8.0.110.
The filter is the estate's fast tier and is what keeps this lane out of a SQL slot.

| tree | passed | failed | skipped | total |
|---|---|---|---|---|
| **baseline** — pristine `wt-lwtwo-api` copy at `8e2b57de` | 4638 | 0 | 12 | 4650 |
| **after** — same tree + this change + the six new tests | 4644 | 0 | 12 | 4656 |

The delta is **+6 passed, +6 total, and nothing else**: exactly the six tests this lane adds. No test
changed state, and the twelve skips are the same twelve.

---

## What happens to a venue that has been dark for a week

**Nothing is asked of them. No re-publish, no re-save, no image, no cache flush.**

The drop was computed per request in the model builder from the entity — it was never persisted, and no row
records it. `CategoryService.GetAllAsync` (the menu list, and the `categories` array inside
`POST /stores/{id}/consumer`) does not cache at all. `GetAsync` caches the **`Category` entity** for 15
minutes under `category:{id}:forStore:{bool}`, and that entity is exactly what the fix now renders instead
of dropping — same row, same empty `CategoryImages`, different answer. `StoreService` caches the store
*list* (`stores:all:client:{theme}`, 10 min), not categories.

So the shop comes back on the **first request after the new build is deployed**. The operator does not have
to discover a second step, because there isn't one.

---

## Required companions — the fix is not safe to land alone

The two legacy consumer surfaces dereference `category.image.imageUrl` behind `v-if="category"` alone.
They never threw only because the backend guaranteed the image. Remove the guarantee without guarding them
and a silently-empty shop becomes a render failure.

- `ConsumerWeb/pages/categories.vue:300-311` — `:src="category.image.imageUrl"`.
  Patch: `companion-ConsumerWeb-categories.patch`.
- `ConsumerApp/src/components/pages/CategoriesPage.vue:403-409` — `:src="category.image.imageUrl"`.
  Patch: `companion-ConsumerApp-CategoriesPage.patch`.

Both patches guard the binding and draw a neutral plate of the same box in the `v-else`, so the name
overlay and the sold-out scrim keep the geometry they were written against (`#e9ecef`, the colour the
estate's own admin placeholder already uses). **Both are unverified**: those are separate repositories on
`feature/swiss` that this lane is isolated from, so neither was built or run. They are patches to review,
not landed work. **Order: guards first or together, backend second.**

One more, in a third repository:

- `modul/apps/admin-web/src/views/products/CategoryManager.tsx:484` shows
  `StatusChip status="attention" label="Hidden from guests. Add an image"` on every image-less row, with the
  rule stated at `:13-18`. After this change that chip is **false**. It should become a plain "Add an image"
  nudge or go. Not patched here.

---

## Named and deliberately not changed

- **`Services/ExternalMenuService.cs:137-140`** is a **second, stricter copy of the same drop** —
  `if (category.CategoryImages?.Any(ci => ci.ImageSource != null) != true) return false;` — on
  `GET /api/external/menu/{storeId}`, which is API-key gated and feeds a third party. Its sibling
  `IsProductVisible` has no image check, so the same asymmetry lives there too. Left alone on purpose: an
  aggregator's menu schema may genuinely require a category image, and that is a partner-contract decision,
  not a shop decision. **It should be ruled on separately.**
- **`Services/StoreService.cs:769-825`** back-fills a category image from the first product image, but only
  inside `PublishStoreAsync`, only for categories with zero images, and it swallows its own failures
  (`:819-822`). It does nothing for a category created after the store was published, or one whose products
  have no images either — which is the owner's world exactly. Left as is; with the filter gone it is no
  longer load-bearing.

---

## Two things a merger has to know before applying any of this

**1. This lane's worktree is not on the world's lineage.** `worktree-agent-ae17b03b712ecf944` is based on
`d7b5f3f`, which `git merge-base --is-ancestor` says is **not** an ancestor of `feature/restaurant-modules`
(the branch `world.config` declares, tip `e34977a`) and **not** an ancestor of
`wip/session-2026-08-06-all-work` (what `/Users/svendaneel/okam/Web-modules` is actually standing on). The
one tracked file this lane changed — `pages/admin/categories.vue` — is **byte-identical** on `d7b5f3f` and
on `feature/restaurant-modules`, so `web-admin-categories.patch` applies to either; but this branch cannot
be fast-forwarded onto the world and the change should be taken as the patch, not as the branch.

**2. The frontend change is unrun.** This worktree has no `node_modules` and `npm ci` / `npm install` are
forbidden repo-wide, so `jest` could not be invoked here. The change is one `v-if` condition and an HTML
comment in a Vue 2 template; it was not linted, built or rendered. Say so rather than counting it green.

## Where the RETURN is

`docs/plan/returns/` under `/Users/svendaneel/okam/Web-modules` is refused by worktree isolation
("Edit the worktree copy of this file instead of the shared-checkout path"), exactly as the brief warned it
might be. The RETURN block is therefore at
`lanes/L-A-PUBLISHED-CATEGORY-REACHES-THE-SHOP/L-A-PUBLISHED-CATEGORY-REACHES-THE-SHOP-1.md` in this
worktree, and is handed back as text as well. `plan return <that path>` will read it.

## What is still owed, and by whom

The suite is not the acceptance. Sven sees this only when the API on **:5971** is rebuilt from a checkout
carrying `okamapi-CategoryModelBuilder.patch` and the shop for store 1 is reloaded — at which point "Varm
drikke", "Kald drikke", "Bakst" and "Lunsj" and their fifteen products appear with no further action.
**This lane did not do that**: restarting his API is out of bounds here, and the guard patches for the two
legacy consumer surfaces are unbuilt, so the rebuild should carry them.

## Container attribution

`tender_benz` (a Testcontainers MSSQL, created 18:37:23) appeared thirteen seconds after this lane's test
run started, and it is **not this lane's**. It belongs to pid 13965, another agent running
`--testCaseFilter:Database=SqlServer --logger:trx;LogFileName=sql-after.trx` out of `<scratchpad>/api`
since 18:17:08. Every run here used `--filter "Database!=SqlServer"`, the filter
`SqlServerContainerTraitTests` exists to keep honest. No container was started, entered, stopped or killed
by this lane.
