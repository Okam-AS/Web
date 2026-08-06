# L-GR-TESTSEND-ERRORCODE — built

The not-your-own-address refusal now renders its own sentence on `/admin/growth-newsletter`
instead of «Noe gikk galt. Ingenting ble sendt.», pinned by tests that red when the mapping,
the copy or the address-suppression is undone.

---

## 1. The code, read from the guard lane's source

`lane/gr-testsend-guard` @ `5719fc96` (OkamAPI, worktree `/Users/svendaneel/okam/wt-gr-testsend`,
local and **unmerged**). `Services/Growth/GrowthNewsletterService.cs`,
`RequireOwnAccountAddressAsync`:

```
throw GrowthApiException.Forbidden(
    "growth.test_address_not_own",
    "A test-send may only be addressed to the signed-in administrator's own account address.");
```

**403**, code `growth.test_address_not_own`. Read from the branch, not from the brief.

**One code, TWO situations** — this is the part a naive one-liner gets wrong. The guard refuses
both when the typed address differs from the account's, *and* when the account holds no address
at all (`string.IsNullOrWhiteSpace(accountAddress)`), i.e. an administrator who signed up by
phone. A sentence that only says "use your own address" sends that second operator hunting for a
typo that does not exist. Both clauses are in the copy, and asserted per locale.

## 2. What changed

| File | Change |
| --- | --- |
| `pages/admin/growth-newsletter.vue` | one `ERROR_KEYS` entry + why-comment; a note on the header comment that this is the one entry whose thrower is not yet on the deployed backend |
| `translations/no.ts` `en.ts` `de.ts` | new `growth_error_test_address_not_own`; corrected `growth_test_intro` (see §3). By hand, one key at a time, no regex. |
| `test/growth-newsletter-page.test.js` | 5 tests; `growth_error_test_address_not_own` + `growth_test_intro` added to the existing hand-maintained key list |

The shipped sentences, which is what an operator actually reads:

- **no** — «En testsending kan bare gå til e-postadressen på din egen konto. Har kontoen din ingen
  e-postadresse registrert, kan du ikke sende test i det hele tatt.»
- **en** — "A test send can only go to the email address on your own account. If your account has
  no email address on file, you cannot send a test at all."
- **de** — „Ein Testversand kann nur an die E-Mail-Adresse deines eigenen Kontos gehen. Ist bei
  deinem Konto keine E-Mail-Adresse hinterlegt, kannst du überhaupt keinen Test senden."

## 3. The screen was also making a promise the server now refuses

The brief noted the page's *comment* already assumed the operator's own address. Its **visible
copy did not**: `growth_test_intro` shipped as "Sends the current version to **one address you
name**" / «til **én adresse du oppgir**» / „an eine **von dir genannte** Adresse". That is now
false in all three locales, and it is the sentence directly above the input whose refusal this
lane is rendering. Corrected to name whose address it is, so the operator knows *before* pressing
rather than only after being refused. The three former strings are pinned by exact text so they
cannot return as a "shorter" rewrite — the idiom this file already uses for the dispatch toast.

Not done: prefilling the input with the operator's own address. `store/index.js` `currentUser`
carries `id`, `adminIn` and a **postal** `address`; no email field is established, and a
confidently-wrong prefill is worse than an empty box. Worth a follow-up once the account read is
known.

## 4. C7 — the refusal is about an email address

The backend deliberately kept its message static and address-free. The client must not undo that:
`messageFor` passes **no interpolation params**, and the shipped copy contains **no `{` slot at
all**, so there is nowhere an address could ever be rendered in. Both are asserted. No log or
telemetry call was added anywhere in this diff.

## 5. Mutations — every assertion I wrote, and what killed it

Applied to a byte-exact backup, restored with `cp`, checksum re-verified after each.

| # | Mutation | Red |
| --- | --- | --- |
| 1 | drop the `ERROR_KEYS` entry | *…not the operator's own says so* (**only** — the C7 test stayed green, so the two are not redundant) |
| 2 | `messageFor` → `$i(key, { address: this.testAddress })` | *rendered without the address that caused it* (only) |
| 3 | append `({address})` to the **no** copy | *its own sentence, and names both ways* — the `not.stringContaining('{')` clause |
| 4 | **no** copy := the generic sentence | same test — the `din egen konto` clause |
| 5 | delete the **de** key | the derived cross-locale test, the copy test, and the hand-maintained key list — three |
| 6 | revert the **en** intro to "one address you name" | *intro no longer promises an address the operator names* (only) |
| 7 | drop the "no email address on file" clause from **en** | the copy test — the `NONE_ON_FILE` clause |
| 8 | `notifyError` → `notify` in `run_`'s catch | *…says so* (the `toast.type` assertion) + one pre-existing test |
| 9 | `TestSend(..., this.testAddress)` → `TestSend(..., '')` | *rendered without the address…* — the anti-vacuity control |

**Two assertions were deleted rather than kept**, because no honest mutation kills them:
`expect(toast.message).not.toBe('growth_error_generic')` sitting under a `toBe(<the specific
key>)`, and `expect(copy).not.toBe(<generic>)` / `not.toBe(<neighbouring refusal>)` sitting under
two positive content assertions that already dominate them. They read as thoroughness and are
decoration.

## 6. The derived-check question — cheap in one direction, not in the other

**Cheap, and shipped**: *no `growth_error_*` sentence exists in one locale and not another*.
Derived from the **union** of the three files' own key sets, so a key added to `no.ts` and
forgotten in `de.ts` reds with nobody maintaining a list — the list it replaces was the fifth
hand-maintained list in that file. Guarded against vacuity by `expect(union.size).toBeGreaterThan(10)`.
It is prefix-based and would work unchanged for `margin_error_*`.

It deliberately does **not** derive *which codes are mapped* from `ERROR_KEYS`: that expectation
shrinks in the same edit that drops an entry and proves nothing — the exact failure the standing
law names. The mapping stays pinned by literal code name.

**Not cheap**: a check that every code the backend can throw on a route this page calls is mapped.
The authority is C# in a **different repo** (`OkamAPI`) that this repo's jest cannot read, and for
this code it is on an **unmerged local branch**. The only real fix is a generated codes manifest
the backend publishes and both sides consume; short of that the explicit map is a deliberate
design, and its own comment says so. Recorded, not improvised.

## 7. State

- `feature/restaurant-modules`, one local commit. Nothing pushed.
- `test/e2e/fixture/world.js` **never modified** — absent from `git status` before and after,
  md5 `3aec7d2da10bedf583d9b8f606c44643` unchanged. No e2e run, no ports taken, no container.
- Full jest: **100 suites / 2321 tests, all green** (was 2316; +5).
- eslint clean on both changed source files. The `indent` warning on the three translation files
  is pre-existing — reproduced on `git show HEAD:translations/no.ts`, same line 715.
- **Transient trap worth knowing**: backing the test file up as `bak/*.test.js` inside the repo
  made jest discover it as a 101st suite and run every test twice. Renamed to `.test.js.baseline`;
  the backup dirs are deleted. Any lane backing a test file up inside the tree will hit this.

## 8. Acceptance is not claimed (C5)

Suite green is not the gate. The person-level walk needs the backend lane merged and running,
which is another repo and outside this lane's grants:

1. merge OkamAPI `lane/gr-testsend-guard` and run the backend;
2. open `/admin/growth-newsletter` for a store with `growth.module` on, select a draft;
3. type a **colleague's** address into the test-send box and press *Send test*;
4. it must read the sentence in §2, not «Noe gikk galt. Ingenting ble sendt.»;
5. and the address you typed must appear **nowhere** in the message.

Until that lane merges the code is never raised and the entry is dead — which is the safe
direction to be wrong in. The reverse order ships an operator a generic error for a refusal the
server had already explained precisely.
