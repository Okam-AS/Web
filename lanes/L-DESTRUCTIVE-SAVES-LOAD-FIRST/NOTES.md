# L-DESTRUCTIVE-SAVES-LOAD-FIRST — full detail

Baseline measured against: **Web-modules `8ac6f636` on `lane/focustrap-teardown`** (not the shipped
tip; the checkout carries ~398 uncommitted paths belonging to other lanes) and the **`core`
submodule at `1bcab0b6` on `lane/core-ore-label`**.

`core/` IS A GIT SUBMODULE (`github.com/Okam-AS/Core.git`). The guard lands in that repository, not
in Web-modules. Only these two admin pages call the two gated methods — an estate-wide grep for
`UpdateDinteroConfig|UpdateSurfboardConfig` outside Web-modules worktrees found no other consumer —
so the blast radius of a fail-closed guard on them is these two pages.

## What was found

Both endpoints REPLACE the record whole. OkamAPI `8e2b57de`, `Services/StoreService.cs:1266` and
`:1390`, assign every field of the write model unconditionally, so a key the client omits is bound
to the C# default (`false` / `null` / `0`) and written over the stored value.

| page | defect | effect of one Save |
|---|---|---|
| `pages/admin/dintero.vue` | never read the record on arrival — the `selectedStore` watcher was not `immediate` and the sidebar already carried the id, so nothing changed and nothing fired | **14 of 17 stored fields blanked**, including the Dintero account id, client id, **client secret**, split seller, commission and all three Wolt fee fields |
| `pages/admin/surfboard.vue` | `tipsEnabled` omitted from the save payload | tipping switched off on every save, silently |
| `pages/admin/dintero.vue` | **`kraviaMessage` omitted from the save payload** — found by writing the write model down, not reported in the brief | the stored Kravia invoice message set to `null` on every save |

Three more facts fell out of the same reading:

- `GetSurfboardConfig` was wrapped in `.catch(() => ({}))`, so a **failed read** produced blank
  defaults that were displayed as the store's configuration and then saved over it.
- The TypeScript signatures were a third, disagreeing copy of the field list: `UpdateDinteroConfig`
  omitted five fields the page did send; `UpdateSurfboardConfig` named `tipsEnabled` (which the page
  did not send) and omitted `partialPaymentsEnabled` (which it did). `typeCheck: false` in
  `nuxt.config.js` meant none of it was ever checked.
- `dintero.vue` did `console.log(config)` on the GET response — the **client secret** printed to the
  devtools of whatever machine the admin panel was open on. Removed (C7).

## The durable answer, and why

**A load-before-edit guard at the service seam**, `core/services/full-replace-guard.ts`, enforced
inside `StoreService` — the one door both pages must pass through.

Rejected: a **PATCH-shaped request** and a **server-side partial-update contract**. Both require
changing OkamAPI, a different repository this lane can neither land nor verify, and until the day
both shipped the client would still be free to send blanks. The server-side option is worse than
that: making "absent" mean "keep" silently redefines what every existing caller's omission means,
including callers written while the old meaning held.

The guard refuses a full replacement unless all of:

1. the endpoint has a registered contract naming every field it overwrites (an unregistered kind is
   refused, so the guard cannot be bypassed by adding a new endpoint or renaming an old one);
2. the record for THIS resource id was read successfully first (the dintero defect);
3. the payload carries every writable field with a **defined** value (the surfboard and
   `kraviaMessage` defects);
4. the payload carries nothing outside the contract (a misspelling reds twice, not zero times).

Rule 3 tests for `undefined` rather than key presence because `JSON.stringify` **drops** an
undefined value — `{ tipsEnabled: undefined }` reaches the server byte-identically to omitting it.
That is not hypothetical: `surfboard.vue`'s `emptyConfig()` had no `tipsEnabled` at all, so reading
it off the form object yielded exactly that shape.

A third settings page gets this by construction: it cannot write until its author declares the
write model, and the declaration is checked against the TypeScript signature and against the page's
own payload literal.

### Known limit, stated rather than hidden

The read ledger is module-level, because `StoreService` is constructed fresh on every access
(`core/pinia/services.ts` and `plugins/global-mixin.js` both return `new StoreService(...)`), so
instance state could never connect a read to the write that follows. Under SSR that ledger is
shared across requests in one node process. That is a false NEGATIVE only (a write allowed that
should have been refused), never a false positive, and it does not arise on these two pages: both
refuse to act until `mounted()` has checked `userIsLoggedIn` and the PowerUser claim, so every read
and write is issued client-side after login.

## Evidence

| file | what it is |
|---|---|
| `receipts/live-record-before-after.md` | **the money receipt** — a stored record on a local HTTP server, captured before and after a Save, showing 14 of 17 fields destroyed by the pre-fix page and 0 by the fixed one |
| `receipts/red-before-green.md` | **the red receipt** — every assertion in the pin, run against the pre-fix sources, failing |
| `live-record.probe.js` | produces the first; drives the pre-fix pages over real TCP into a server that copies the backend's write semantics field for field |
| `red-before-green.probe.js` | produces the second; imports the SAME extractor the pin uses, so it shows THIS pin redding rather than some other one |
| `prefix/` | the baseline sources, from `git show`, with the SHAs they came from |
| `/Users/svendaneel/okam/Web-modules/test/store-config-full-replace.test.js` | the pins, 26 tests, in the repo suite |

Neither probe runs in the repo suite: `jest.config.js` on this branch already ignores
`<rootDir>/lanes/` (contrary to the brief's hazard note — a sibling lane has since fixed it), and
`*.probe.js` matches no `testMatch` pattern either. Run them with:

```
npx jest --rootDir . --testPathIgnorePatterns=/node_modules/ \
  --testMatch '**/L-DESTRUCTIVE-SAVES-LOAD-FIRST/*.probe.js' --coverage=false
```

Port used: **4893** (loopback only, started and stopped by the probe). No container was started.

## Production safety

`nuxt.config.js:45` still defaults `API_BASE_URL` to the production API — untouched by this lane and
a blocker in its own right (`F-DEV-BUILD-POINTS-AT-PRODUCTION`). Nothing here ran against it: the
probe sets the base URL to `http://127.0.0.1:4893` before any import that reads it, and **asserts**
the resolved value is loopback and does not name `azurewebsites` / `okam.no` / `okamapi` before it
touches anything. The repo suite never leaves the process at all.

## Still open

- **`kraviaMessage` has no operator lever.** It is now loaded and posted back unchanged, so a Save
  can no longer destroy it, but nobody can edit it from this page. `tipsEnabled` had the same
  problem and got a toggle, because it is the field this lane exists for; `kraviaMessage` did not,
  because adding an input for it is a feature rather than a repair. Worth a flag.
- **Acceptance is Sven walking it** (C5). To do that safely the dev server must be started with
  `API_BASE_URL` pointed at a local backend; both pages are PowerUser-gated.
- `test/kitchen-and-board-resume-after-login.test.js` fails in the repo suite. It is **untracked**,
  belongs to another lane working on `pages/admin/ongoing.vue`, references nothing this lane
  touched, fails standalone, and its failure count moved between two runs (6, then 3) while these
  files sat still. Not this lane's.
