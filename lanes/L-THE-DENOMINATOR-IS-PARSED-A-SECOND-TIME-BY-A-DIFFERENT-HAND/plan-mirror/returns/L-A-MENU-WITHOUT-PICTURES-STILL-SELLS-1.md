```
RETURN: L-A-MENU-WITHOUT-PICTURES-STILL-SELLS
brief: 55e69fdd
verdict: blocked
evidence: /Users/svendaneel/okam/web-wt-menupics/lanes/L-A-MENU-WITHOUT-PICTURES-STILL-SELLS/matrix.log
needs: +D-CATEGORY-IMAGE-CLIENT-GATE
log:
Drove each page's OWN template with its repo's OWN @vue/compiler-sfc and @vue/server-renderer, fed a category taken verbatim from live :5971 where image is null.
BEFORE, both threw TypeError: Cannot read properties of null (reading 'imageUrl'). AFTER, both render, category name present, placeholder plate drawn.
Controls rule out a false positive: BEFORE with an image renders on both, so the harness reaches the tile and the throw is the missing image and nothing else.
Happy path intact: BEFORE-with against AFTER-with diffs to ZERO removed lines on both surfaces, and every added line is a comment node. No rendered element changed.
Harness refuses a run whose output lacks the category name. It caught one: the first attempt rendered 1770 chars of spinner and never reached the tile.
v-if="category" never guarded the image. categoriesGrid (CW:616, CA:803) pads odd rows with undefined; that slot was all it covered. Neither computed filters on image.
Every product image read in both repos was already guarded via hasImage. The two category reads were the only unguarded ones in either repo.
Patches NOT trusted on sight: re-read both targets, context matched verbatim, re-derived the edits. Cut their 8-line comment to 3, Vue renders it into the DOM per grid cell.
LANDED: ConsumerWeb lane/menu-without-pictures ee133e0, ConsumerApp lane/menu-without-pictures 6b9747a. Both unpushed, unmerged, no upstream configured.
NO AUTHORITY: ConsumerWeb and ConsumerApp are separate repos (Okam-AS/ConsumerWeb.git, Okam-AS/ConsumerApp.git), not directories of this one. I can neither merge nor push either.
BACKEND WITHHELD: CategoryModelBuilder.cs:49 untouched. Neither guard sits on a shipping branch, so landing it now reproduces the exact breakage the guards exist to prevent.
HARDER REASON: ConsumerApp is a store-distributed native app. Builds already on phones carry the unguarded read and no deploy reaches them. Merge ordering alone does not fix that.
PATH OUT: the API already reads ClientPlatform/ClientAppVersion (StoresController.cs:1435, OrderService.cs:1263). Gate the filter on client version; the threshold is a ruling, not code.
STILL OPEN: ExternalMenuService.cs:137-140 holds a second copy of the drop on the API-key partner feed with an extra ImageSource null test. Published contract, needs its own ruling.
NOT CLAIMED: nobody walked either surface, so C5 is unmet. No app started, no port bound, no container touched, nothing pushed; all four owner checkouts clean on their own branches.
END RETURN
```
