RETURN: L-MODAL-SCROLLLOCK
brief: 7e1ec682
verdict: built
evidence: lane/modal-scrolllock @ 178c895 · artifacts/journeys/modal-scroll-lock.playwright.json (8/8 steps, 3 PNGs) · test/modal-scroll-lock.test.js
log:
Diagnosis confirmed causally in a browser first: login modal open on the real redirect flow, body `class=""` / `overflow: visible`; adding `noscroll` by hand gave `hidden`, and one `$meta().refresh()` with the modal still open took it straight back off. Worse than briefed — on a 4662px admin page, ONE `$router.replace` with a modal open let the page behind wheel 1200 -> 3691.
MECHANISM (the second trap): `head()` on the component with `bodyAttrs.class` as an ARRAY, and layouts/default.vue changed string -> array, which is the actual fix. vue-meta concatenates array attributes (`_arrayMerge`) and REPLACES string ones, so a string would have stripped `okam-ch` off the Swiss site for as long as any modal was open; as arrays, layout + page + component each contribute. It also needs no reference count: vue-meta re-derives the attribute from the live component tree, so the count IS the tree. Two open modals measure `class="okam-ch noscroll noscroll"` — pinned in a test; duplicates are legal and do not grow.
Judged and rejected: `body.style.overflow` (survives vue-meta, but seven other modals already do it and not one ref-counts) and `overscroll-behavior` alone (leaves the scrollbar and keyboard live).
MEASURED WITH A WHEEL, not scrollTo — `overflow: hidden` blocks gestures but NOT `window.scrollTo`, which cost me one false positive. No modal: 1200 -> 1800. Modal open: `noscroll` / `hidden`, wheel 600 then 3000 leaves it at 1200, and survives a navigation. Two modals, close one: still locked. Close the last: released, and the reader resumes at 1200 instead of being teleported to the top.
Tests assert the declaration AND the DOM — with the real vue-meta installed under Nuxt's own options, so the DOM assertion is honest rather than the old lie. All five behavioural assertions verified RED against the imperative form. Two source guards: no `document.body.classList` mutation, no string-valued `bodyAttrs.class`.
Suites: Jest 93/93 (2160), browser journeys 4/4, run twice. Not run: SQL tier. Not pushed. No translations touched.
FLAG (merge): lane/print-host declares `bodyAttrs.class` as a STRING on the personalliste and will clobber `noscroll` there — my array guard fails on merge and names the file; fix is `.join(' ')` -> array. Its `document.body.classList` line is exempted by name in KNOWN_UNFIXED, compared for EQUALITY so the exemption goes red rather than stale when that lane lands.
DEFECT (pre-existing, unfixed): EditLangRowModal binds no `@close`, so Escape does nothing on it.
NOTE: fixture gained `GET /culture` + 60 synthetic keys, because `/admin/lang` is the only fixture-reachable page both taller than the viewport and opening a real `atoms/Modal` — the login screen has nothing behind it to scroll at any viewport size.
END RETURN
