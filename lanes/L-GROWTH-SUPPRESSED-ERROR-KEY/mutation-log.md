# L-GROWTH-SUPPRESSED-ERROR-KEY — mutation log

brief `02f45475` — frontend `Web-modules` — 2026-08-05.
Worktree `/Users/svendaneel/okam/web-suppkey`, branch `lane/fe-growth-suppressed-key`, created
`git worktree add -b lane/fe-growth-suppressed-key /Users/svendaneel/okam/web-suppkey 3d20451` — i.e.
the baseline carries `lane/fixture-suppressed-refusal` in full, as the brief required. The fixture was
not touched. No container started, no ref pushed, no shared branch written, no migration authored.
`core` initialised with `git -c protocol.file.allow=always submodule update --init core` before any run
(`1bcab0b6…`, `heads/lane/core-ore-label`); all 112 suites load.

## 0. The premise, verified with a positive control before a line was written

Every absence below was measured with a key **known to be present** in the same file and by the same
command, so that a broken grep could not manufacture the finding.

    $ grep -c growth_error_test_address_required translations/{no,en,de}.ts   # positive control
    no.ts:1   en.ts:1   de.ts:1
    $ grep -c growth_error_test_address_suppressed translations/{no,en,de}.ts # the subject
    no.ts:0   en.ts:0   de.ts:0

    $ grep -rn test_address_suppressed --include='*.vue' --include='*.js' --include='*.ts' .
    test/e2e/fixture/growth-newsletter.js:456          <- the fixture lane, refusing
    test/fixture-refusal-divergence.test.js:100        <- the fixture lane, pinning the refusal
    (no hit under pages/, components/, utils/ or translations/)

So: **no `ERROR_KEYS` entry, no translation key, in any of the three locales.** `messageFor` falls to
`growth_error_generic` for any unmapped code, which in nb-NO is *«Noe gikk galt. Ingenting ble sendt.»*
Paths were quoted throughout (`"${VAR}"`), never bare, per the zsh history-modifier warning.

The thrower is real and live, not speculative — `GrowthNewsletterService.RequireAddressNotSuppressedAsync`
throws `GrowthApiException.Conflict("growth.test_address_suppressed", …)` at `Services/Growth/GrowthNewsletterService.cs:649`,
reached unconditionally from the test-send path at `:278`, immediately after `RequireOwnAccountAddressAsync`
returns at `:272`. Four backend tests assert the code (`WebApi.Tests/Growth/GrowthTestSendReachabilityTests.cs:79,119,151,203`).

## 1. What the refusal actually means — which decided the sentence

Two facts from the backend changed the copy from the obvious one.

**(a) The suppressed address is the operator's OWN account address.** `:278` passes the *return value* of
`RequireOwnAccountAddressAsync` — the account's confirmed address — not the string the operator typed.
By the time this refuses, the address is provably theirs. So *"use a different address"* is not
actionable as written: a test-send can only ever reach the account's confirmed address. The way out is
to **confirm a different address on the account**, at `/admin/account-email`. The copy names that screen
by the exact string `nav_account_email` carries, and the test pins the two together so a renamed page
cannot leave the sentence pointing at a title that no longer exists.

**(b) There is no unsuppress.** Only reasons `GrowthSuppressionLiftPolicy` classes as never-liftable
refuse — `HardBounce`, `InvalidAddress`, `Complaint`, `Erasure`, `AdminBlock` — the ledger is
append-only, and a grep over the backend `Controllers/` and `Services/` finds no delete/lift/unsuppress
route. Every retry therefore refuses identically, forever. The sentence says so in as many words
(*«det hjelper ikke å prøve igjen — hvert nye forsøk blir avvist på samme måte»*), because that is
precisely the inference the generic message got wrong.

**What the sentence deliberately does NOT say.** It names the class of block without asserting which
reason caused it — the envelope does not say. Two suppression situations answer **200** and never reach
this code: a store-scoped `AdminBlock` belonging to a *neighbour* venue (scoped out by
`GrowthConsentProjection.SuppressionCoversTarget`), and a GB4-liftable `Unsubscribe`/`Objection` on the
operator's own address. A sentence that read "this address is suppressed" off every suppression row
would be wrong about both, so nothing in the copy claims more than the 409 does.

**C7.** No interpolation slot anywhere in the copy (`expect(copy).not.toContain('{')` per locale), and
the mounted test asserts the *rendered* sentence does not contain the address that was in play —
against a positive control that it really was in play (`callsTo('TestSend')[0][3]`). A suppressed
mailbox is a real person's contact detail and a refusal is exactly where one ends up in a screenshot.

**Adjacent, named and left (per brief).** `CONSENT_SUMMARY` in `test/growth-newsletter-page.test.js`
reports suppression reasons against a vocabulary that is not the backend's. Untouched here; it has its
own flag. No enum member name was introduced by this lane in either direction.

## 2. The change

| file | what |
|---|---|
| `pages/admin/growth-newsletter.vue` | `'growth.test_address_suppressed': 'growth_error_test_address_suppressed'` in `ERROR_KEYS`, placed with the other test-send guard, plus the reasoning above as comment |
| `translations/no.ts` | the nb-NO sentence (480 chars) — the primary locale, written first |
| `translations/en.ts`, `translations/de.ts` | the other two, following nb-NO |
| `test/growth-newsletter-page.test.js` | `mountPage(RENDERED_NB)`; two mounted arms; one per-locale copy test; one key added to the render-list pin |

Reachability (C3) is closed inside the one change: the entry, the copy in every locale the page can
resolve, and the mounted proof that the toast renders it all land together. Nothing else was added —
no service, no route, no flag.

## 3. The proof is the rendered sentence, and it was falsified twice

`mountPage()`'s `$i` returns the raw key by design, which is why *every* existing assertion on this page
reads a key. An assertion in that environment passes for a map entry pointing at a key **no locale
carries**. So a second mode was added: `mountPage(RENDERED_NB)` swaps in the shipped resolver
(`~/utils/i18n` `translate`) against `no`, and the assertions read `wrapper.find('.growth-page__toast').text()`.

    ✓ a test-send refused because the address is suppressed says SO, on screen and in Norwegian
    ✓ the generic sentence still reaches the screen for a refusal this surface cannot name
    ✓ the suppression refusal names the block and the way out, in every locale

    Test Suites: 1 passed          Tests: 38 passed, 38 total   (test/growth-newsletter-page.test.js)

**The control arm is not decoration.** Narrowing the generic message to one more refusal must not have
*replaced* it: the second test drives `growth.a_code_no_client_knows`, reads the toast off the same
mounted surface, and requires it to be exactly `translations.no.growth_error_generic` and **not** to
contain «sperret». One wrong answer must not become a narrower wrong answer that claims a block nobody
recorded.

**Falsification A — remove the `ERROR_KEYS` entry, keep the copy.** The mounted test goes red with the
defect verbatim:

    ✕ a test-send refused because the address is suppressed says SO, on screen and in Norwegian
      Expected: StringContaining "sperret"
      Received: "Noe gikk galt. Ingenting ble sendt."
      Tests: 1 failed, 37 passed

**Falsification B — keep the entry, remove only the nb-NO string.** This is the case a key-level
assertion cannot see, and it is *worse* than a raw key: `translate`'s fallback order is `no → en → de`,
so a Norwegian operator is shown the **English** sentence.

    ✕ a test-send refused … in Norwegian
      Received: "The email address on your account is blocked on the email channel, …"
    ✕ the suppression refusal names the block and the way out, in every locale       (Received: undefined)
    ✕ no growth_error_* sentence exists in one locale and not another                (Received: "undefined")
    ✕ every key this page and its components render exists in all three locales      (Received: "undefined")
      Tests: 4 failed, 34 passed

Both files were restored from copies taken before each arm and re-verified by grep afterwards.

## 4. Estate run

    $ npx jest --coverage=false
    Test Suites: 1 failed, 111 passed, 112 total
    Tests:       2 failed, 2584 passed, 2586 total

The two failures are `test/journey-artifact-store.test.js` — *"asks whoever is holding the port what
directory they are running from"* and *"names the checkout the world script recorded…"*, both asserting
`/^Web-modules@/` against `web-suppkey@3d20451…+dirty`. **Pre-existing and environmental**, proven by
reverting all five changed files to the baseline and re-running that suite alone:

    Tests: 2 failed, 36 passed, 38 total     (identical, with none of this lane's changes present)

The patch was taken to `/tmp/suppkey-work.patch` first and re-applied; `git status --short` afterwards
lists exactly the five intended files. They are the subject of `lane/worktree-basename-pin`, not of this
lane. `npx eslint` over the five changed files: **0 errors** (3 pre-existing indent *warnings* at
`translations/*.ts:698/715`, ~3,300 lines above any edit here).

## 5. What this does not cover

- **C5 — acceptance is Sven's, not this suite's.** The mounted test proves the sentence reaches a
  rendered toast in nb-NO. It is not the person completing the journey. Nothing here is `verified`.
- **The wording itself is a judgement call**, not a measurement. The two clauses it must carry (the
  block; the remedy, named as the nav entry) are pinned per locale; the phrasing around them is not.
- **The 200-answering cases are asserted only in the fixture**, which this lane did not touch. Nothing
  on the frontend proves a neighbour-store `AdminBlock` or a liftable `Unsubscribe` still succeeds —
  it is the fixture's pin (`lane/fixture-suppressed-refusal`, `3d20451`) and remains so.
- **The estate total is 2,586**, not the 2,729 the dispatch note quoted, with `core` initialised and
  all 112 suites loading cleanly (no `Cannot find module`). Not investigated here; the count in the
  note may belong to a different baseline than `3d20451`.
