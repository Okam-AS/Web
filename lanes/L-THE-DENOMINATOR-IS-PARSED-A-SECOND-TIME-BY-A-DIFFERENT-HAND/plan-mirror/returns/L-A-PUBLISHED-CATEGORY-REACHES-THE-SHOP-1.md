```
RETURN: L-A-PUBLISHED-CATEGORY-REACHES-THE-SHOP
brief: 83c2fee6
verdict: built
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-ae17b03b712ecf944/lanes/L-A-PUBLISHED-CATEGORY-REACHES-THE-SHOP/applied.md
log:
RULING: an image is not required to sell. CategoryModelBuilder.cs:49 loses the image term; IsPublished and a non-blank Name remain.
No other catalog entity is dropped for a missing picture (2 such filters estate-wide, none for products); 3 shipped surfaces draw a category as text alone; AutoMapper:179 maps absence to null already.
Refuse-at-publish is not honestly implementable: Category.IsPublished is [NotMapped]/computed, so there is no publish transaction, and refusal would retro-unpublish every bulk-imported venue.
Live :5971 read-only BEFORE: no body gives 4 published categories; {"deliveryType":"SelfPickup"} gives []; {} also gives []; the single-category route answers 400 "Category does not exist".
NEW WebApi.Tests/Wire/ConsumerMenuWithoutCategoryImagesWireTests.cs, wire tier: real Program.Main over TestServer, in-memory SQLite, no container. Every request carries a searchOptions body.
RED 4 failed / 2 passed then GREEN 6/6 on the rebuilt binary. Pins hold: unpublished stays absent; delivery-type-hidden is absent under SelfPickup and PRESENT under TableDelivery.
Fast tier "Database!=SqlServer" measured both sides: baseline 4638 passed / 0 failed / 12 skipped of 4650, after 4644 / 0 / 12 of 4656. Delta is exactly the 6 new tests; nothing else moved.
ALSO CHANGED CategoryService.HasAnyValid: same image term gone, else the AdminApp checklist "Sett opp en kategori" (its only caller) calls a selling menu unset. Dead Include removed with it.
ALSO CHANGED in this worktree, pages/admin/categories.vue: the badge read !published || !image and said "Ikke publisert" - false in both directions; now !published.
DARK VENUE: no re-publish, no cache flush, no second step. The drop was computed per request, never persisted; GetAllAsync is uncached and GetAsync caches the entity the fix now renders.
BLOCKER, do not land the backend alone: ConsumerWeb/pages/categories.vue:302 and ConsumerApp/.../CategoriesPage.vue:405 read category.image.imageUrl unguarded. Guards patched here, UNBUILT.
ALSO FALSE AFTER THIS: modul/apps/admin-web/src/views/products/CategoryManager.tsx:484 chip "Hidden from guests. Add an image", rule declared at :13-18. Not patched, other repo.
NAMED AND NOT CHANGED: ExternalMenuService.cs:137-140 is a second, stricter copy of the same drop on the API-key-gated partner feed. That is a contract decision and needs its own ruling.
Backend edited in a source copy after git -C OkamAPI was refused. Base wt-lwtwo-api at 8e2b57de = feature/restaurant-modules tip = what :5971 runs; the builder is md5-identical in 4 checkouts.
CAVEATS: worktree base d7b5f3f is an ancestor of neither world branch, so take the patches not the branch; the .vue edit is unrun (no node_modules). No container started; tender_benz is pid 13965's.
END RETURN
```
